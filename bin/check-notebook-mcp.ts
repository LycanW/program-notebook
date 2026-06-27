#!/usr/bin/env bun
import { writeSync } from "node:fs"
import { resolve } from "node:path"
import { buildNotebookReport, formatNotebookReport } from "../lib/program-notebook-lib"

function log(message: string) {
  console.error(`[program-notebook-mcp] ${message}`)
}

function send(message: unknown) {
  const json = JSON.stringify(message)
  const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`
  const data = header + json
  try {
    writeSync(1, Buffer.from(data, "utf8"))
    log(`sent: ${message}`)
  } catch (error) {
    log(`send failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function handleRequest(request: any) {
  const { id, method, params } = request
  log(`received request: ${method}`)

  if (method === "initialize") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "program-notebook", version: "0.1.0" },
      },
    })
    return
  }

  if (method === "ping") {
    send({ jsonrpc: "2.0", id, result: {} })
    return
  }

  if (method === "tools/list") {
    send({
      jsonrpc: "2.0",
      id,
      result: {
        tools: [
          {
            name: "check_notebook",
            description: "检查 docs/program-notebook.md 与 docs/architecture/*.md 的存在、索引完整性、关键章节、git-aware 陈旧风险和精确文档建议。",
            inputSchema: {
              type: "object",
              properties: {
                projectRoot: {
                  type: "string",
                  description: "项目根目录，默认为当前工作目录",
                },
              },
            },
          },
        ],
      },
    })
    return
  }

  if (method === "tools/call") {
    const args = params?.arguments || {}
    const projectRoot = resolve(args.projectRoot || process.cwd())
    log(`checking projectRoot: ${projectRoot}`)
    try {
      const report = buildNotebookReport(projectRoot, new Set())
      const output = formatNotebookReport(report, new Set())
      send({
        jsonrpc: "2.0",
        id,
        result: {
          content: [{ type: "text", text: output }],
        },
      })
    } catch (error) {
      log(`check failed: ${error instanceof Error ? error.message : String(error)}`)
      send({
        jsonrpc: "2.0",
        id,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : String(error),
        },
      })
    }
    return
  }

  send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } })
}

log("mcp server started")

let buffer = ""
let expectedLength: number | null = null

process.stdin.on("data", (chunk: Buffer) => {
  buffer += chunk.toString("utf8")
  log(`stdin chunk received, buffer length: ${buffer.length}`)

  while (true) {
    if (expectedLength === null) {
      const headerEnd = buffer.indexOf("\r\n\r\n")
      if (headerEnd === -1) return
      const header = buffer.slice(0, headerEnd)
      const match = header.match(/Content-Length:\s*(\d+)/i)
      if (!match) {
        log(`invalid header: ${header}`)
        return
      }
      expectedLength = parseInt(match[1], 10)
      buffer = buffer.slice(headerEnd + 4)
      log(`expecting body length: ${expectedLength}`)
    }

    if (Buffer.byteLength(buffer) < expectedLength) {
      log(`waiting for more data: ${Buffer.byteLength(buffer)}/${expectedLength}`)
      return
    }

    const json = buffer.slice(0, expectedLength)
    buffer = buffer.slice(expectedLength)
    expectedLength = null

    try {
      const request = JSON.parse(json)
      log(`parsed request: ${request.method}`)
      if (request.method === "initialized" || request.method === "notifications/initialized") {
        log("received initialized notification")
      } else {
        handleRequest(request)
      }
    } catch (error) {
      log(`parse error: ${error instanceof Error ? error.message : String(error)}`)
    }
  }
})

process.stdin.on("end", () => {
  log("stdin ended")
})

process.stdin.on("error", (error) => {
  log(`stdin error: ${error.message}`)
})

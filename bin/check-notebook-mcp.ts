#!/usr/bin/env bun
import { writeSync } from "node:fs"
import { resolve } from "node:path"
import { buildNotebookReport, formatNotebookReport } from "../lib/program-notebook-lib"

function log(message: string) {
  console.error(`[program-notebook-mcp] ${message}`)
}

let useRawJson = false

function send(message: unknown) {
  const json = JSON.stringify(message)
  try {
    if (useRawJson) {
      writeSync(1, Buffer.from(json + "\n", "utf8"))
    } else {
      const header = `Content-Length: ${Buffer.byteLength(json)}\r\n\r\n`
      writeSync(1, Buffer.from(header + json, "utf8"))
    }
    log(`sent: ${json.slice(0, 120)}`)
  } catch (error) {
    log(`send failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function handleRequest(request: any) {
  const { id, method, params } = request
  log(`received request: ${method}`)

  if (method === "initialize") {
    const clientVersion = params?.protocolVersion || "2024-11-05"
    log(`client protocol version: ${clientVersion}`)
    send({
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: clientVersion,
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

function findHeaderEnd(buf: string): { index: number; separatorLength: number } | undefined {
  for (const [sep, len] of [["\r\n\r\n", 4], ["\n\n", 2]] as const) {
    const idx = buf.indexOf(sep)
    if (idx !== -1) return { index: idx, separatorLength: len }
  }
  return undefined
}

function tryParseRawJson(buf: string): { request: any; rest: string } | undefined {
  // Some MCP clients send newline-delimited JSON without Content-Length.
  // Try to find a complete JSON object by scanning for closing brace balance.
  let depth = 0
  let inString = false
  let escape = false
  for (let i = 0; i < buf.length; i++) {
    const ch = buf[i]
    if (escape) {
      escape = false
      continue
    }
    if (ch === "\\") {
      escape = true
      continue
    }
    if (ch === '"') {
      inString = !inString
      continue
    }
    if (inString) continue
    if (ch === "{") depth++
    if (ch === "}") {
      depth--
      if (depth === 0) {
        const json = buf.slice(0, i + 1)
        try {
          return { request: JSON.parse(json), rest: buf.slice(i + 1).replace(/^\s+/, "") }
        } catch {
          return undefined
        }
      }
    }
  }
  return undefined
}

process.stdin.on("data", (chunk: Buffer) => {
  buffer += chunk.toString("utf8")
  log(`stdin chunk received, buffer length: ${buffer.length}, preview: ${JSON.stringify(buffer.slice(0, 120))}`)

  while (true) {
    if (expectedLength === null) {
      const header = findHeaderEnd(buffer)
      if (header) {
        const headerText = buffer.slice(0, header.index)
        const match = headerText.match(/Content-Length:\s*(\d+)/i)
        if (match) {
          expectedLength = parseInt(match[1], 10)
          buffer = buffer.slice(header.index + header.separatorLength)
          log(`expecting body length: ${expectedLength}`)
        } else {
          log(`invalid header: ${JSON.stringify(headerText)}`)
          return
        }
      } else {
        // Fallback: try newline-delimited JSON
        const raw = tryParseRawJson(buffer)
        if (!raw) return
        useRawJson = true
        buffer = raw.rest
        log(`parsed raw json request: ${raw.request.method}`)
        if (raw.request.method === "initialized" || raw.request.method === "notifications/initialized") {
          log("received initialized notification")
        } else {
          handleRequest(raw.request)
        }
        continue
      }
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

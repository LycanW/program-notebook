import { relative, resolve } from "node:path"
import { type Plugin, tool } from "@opencode-ai/plugin"
import {
  ARCHITECTURE_DIR,
  NOTEBOOK_PATH,
  buildNotebookReport,
  formatNotebookReport,
  gitStatusChangedFiles,
  shouldWatchPath,
} from "../../lib/program-notebook-lib"

const SKILL_DIR = new URL("../../skills", import.meta.url).pathname

function appendToFirstUserMessage(messages: any[], content: string) {
  const firstUser = messages.find((message) => message.info?.role === "user")
  if (!firstUser || !Array.isArray(firstUser.parts)) return false
  const alreadyInjected = firstUser.parts.some((part: any) => part?.type === "text" && String(part.text ?? "").includes("<program-notebook-status>"))
  if (alreadyInjected) return false
  const ref = firstUser.parts[0] ?? {}
  firstUser.parts.unshift({ ...ref, type: "text", text: content })
  return true
}

function pathsFromPatchText(patchText: string): string[] {
  return patchText
    .split("\n")
    .flatMap((line) => {
      const match = line.match(/^\*\*\* (?:Add|Update|Delete) File: (.+)$/)
      return match ? [match[1].trim()] : []
    })
}

function normalizeToolPath(projectRoot: string, rawPath: string): string | undefined {
  const rel = rawPath.startsWith(projectRoot) ? relative(projectRoot, rawPath) : rawPath
  if (!rel || rel.startsWith("..")) return undefined
  return rel.replaceAll("\\", "/")
}

export const ProgramNotebookPlugin: Plugin = async ({ directory, worktree }) => {
  const projectRoot = resolve(worktree || directory)
  const changedBySession = new Map<string, Set<string>>()
  const startupInjectedBySession = new Set<string>()
  const injectedChangeCountBySession = new Map<string, number>()

  function changedFilesFor(sessionID: string) {
    let files = changedBySession.get(sessionID)
    if (!files) {
      files = new Set<string>()
      changedBySession.set(sessionID, files)
    }
    return files
  }

  return {
    config: async (config) => {
      config.skills = config.skills || {}
      config.skills.paths = config.skills.paths || []
      if (!config.skills.paths.includes(SKILL_DIR)) config.skills.paths.push(SKILL_DIR)

      config.command = config.command || {}
      if (!config.command["check-notebook"]) {
        config.command["check-notebook"] = {
          template: "请调用 `check_notebook` 工具，读取其报告，并用中文给出简短结论：\n\n- Notebook 状态：存在 / 缺失 / 可能陈旧\n- Architecture docs 状态：是否存在，是否需要补充索引\n- 本会话或最近结构性改动涉及哪些文件\n- 应检查或更新哪些文档\n- 如果无需更新，请说明证据\n\n不要直接猜测文档状态；必须基于 `check_notebook` 工具输出回答。",
          description: "检查 program notebook 与架构专题文档是否需要同步",
          agent: "build",
        }
      }
    },

    event: async ({ event }) => {
      if (event.type === "session.deleted") {
        const sessionID = (event.properties as any)?.info?.id ?? (event.properties as any)?.sessionID
        if (typeof sessionID === "string") {
          changedBySession.delete(sessionID)
          startupInjectedBySession.delete(sessionID)
          injectedChangeCountBySession.delete(sessionID)
        }
      }
    },

    "tool.execute.after": async (input) => {
      const args = (input as any).args ?? {}
      const rawPaths = [args.filePath, args.path].filter((path): path is string => typeof path === "string")
      if (typeof args.patchText === "string") rawPaths.push(...pathsFromPatchText(args.patchText))
      if (input.tool === "bash") rawPaths.push(...gitStatusChangedFiles(projectRoot))

      const files = changedFilesFor(input.sessionID)
      for (const rawPath of rawPaths) {
        const rel = normalizeToolPath(projectRoot, rawPath)
        if (!rel) continue
        if (rel === NOTEBOOK_PATH || rel.startsWith(`${ARCHITECTURE_DIR}/`)) continue
        if (shouldWatchPath(rel)) files.add(rel)
      }
    },

    "experimental.chat.messages.transform": async (_input, output) => {
      if (!Array.isArray(output.messages)) return
      const firstUser = output.messages.find((message) => message.info?.role === "user")
      const sessionID = String(firstUser?.info?.sessionID ?? firstUser?.info?.sessionId ?? "default")
      const files = changedFilesFor(sessionID)
      const previousInjectedChangeCount = injectedChangeCountBySession.get(sessionID) ?? 0
      const shouldInject = !startupInjectedBySession.has(sessionID) || files.size > previousInjectedChangeCount
      if (!shouldInject) return

      const report = buildNotebookReport(projectRoot, files)
      if (appendToFirstUserMessage(output.messages, formatNotebookReport(report, files))) {
        startupInjectedBySession.add(sessionID)
        injectedChangeCountBySession.set(sessionID, files.size)
      }
    },

    tool: {
      check_notebook: tool({
        description: "检查 docs/program-notebook.md 与 docs/architecture/*.md 的存在、git-aware 陈旧风险、本会话结构性改动和精确文档建议。",
        args: {},
        async execute(_args, context) {
          const files = changedFilesFor(context.sessionID)
          return formatNotebookReport(buildNotebookReport(projectRoot, files), files)
        },
      }),
    },
  }
}

export default ProgramNotebookPlugin

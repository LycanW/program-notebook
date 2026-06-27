import { existsSync, readFileSync, readdirSync, statSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { join, relative } from "node:path"

export type NotebookReport = {
  projectRoot: string
  notebook: FileStatus
  architectureDocs: FileStatus[]
  newerWatchedFiles: string[]
  recentDocChanges: string[]
  recommendedDocs: Record<string, string[]>
  missingArchitectureReferences: string[]
  missingNotebookSections: string[]
  recommendations: string[]
}

export type FileStatus = {
  path: string
  exists: boolean
  mtimeMs?: number
  gitTimestamp?: number
}

export const NOTEBOOK_PATH = "docs/program-notebook.md"
export const ARCHITECTURE_DIR = "docs/architecture"

const WATCH_EXTENSIONS = new Set([".rs", ".ts", ".tsx", ".js", ".jsx", ".py", ".go", ".c", ".cc", ".cpp", ".h", ".hpp", ".toml", ".json", ".yaml", ".yml", ".proto", ".sh"])
const WATCH_NAMES = new Set(["Cargo.toml", "Cargo.lock", "build.rs", "package.json", "package-lock.json", "pnpm-lock.yaml", "bun.lock", "Makefile", "CMakeLists.txt", "Dockerfile", "AGENTS.md", "CLAUDE.md", "README.md", "HOW2USE.md"])

const REQUIRED_NOTEBOOK_SECTIONS = [
  { name: "文档分层或参考资料索引", patterns: [/文档分层/, /参考资料/, /参考文件/, /架构参考/] },
  { name: "数据流摘要", patterns: [/数据流/] },
  { name: "架构摘要", patterns: [/架构/, /结构图/, /结构摘要/] },
  { name: "程序运行流", patterns: [/程序运行流/, /运行流/, /启动流程/, /生命周期/] },
  { name: "配置加载链", patterns: [/配置加载/, /配置链/, /配置/] },
  { name: "模块摘要", patterns: [/模块摘要/, /逐模块/, /代码组织/, /模块职责/] },
  { name: "已知缺陷与限制", patterns: [/缺陷/, /限制/, /已知问题/, /TODO/, /NotImplemented/] },
]

function isIgnoredPath(path: string): boolean {
  return path.includes("node_modules/") || path.startsWith("node_modules/") || path.includes("target/") || path.startsWith("target/") || path.includes(".git/") || path.startsWith(".git/")
}

export function shouldWatchPath(path: string): boolean {
  if (!path || isIgnoredPath(path)) return false
  const name = path.split("/").pop() ?? path
  if (WATCH_NAMES.has(name)) return true
  if (path.startsWith(".github/workflows/")) return true
  if (path.startsWith("src/") || path.startsWith("tests/") || path.startsWith("config/") || path.startsWith("deploy/")) return true
  const dot = name.lastIndexOf(".")
  return dot >= 0 && WATCH_EXTENSIONS.has(name.slice(dot))
}

export function classifyChangedPath(path: string): string[] {
  const docs = new Set<string>([NOTEBOOK_PATH])
  if (path.startsWith("tests/") || path.startsWith(".github/workflows/")) {
    docs.add("docs/architecture/03-ci-pipeline.md")
    return Array.from(docs)
  }
  if (path.startsWith("src/")) {
    docs.add("docs/architecture/01-program-structure.md")
    if (/driver|drivers|protocol|can|imu|websocket|socket|runtime|executor|state|safety|fault/i.test(path)) docs.add("docs/architecture/02-data-flow.md")
    if (/style|lint|format|clippy/i.test(path)) docs.add("docs/architecture/04-code-style.md")
  }
  return Array.from(docs)
}

export function parseGitStatusPorcelain(output: string): string[] {
  return output
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .flatMap((line) => {
      const pathPart = line.slice(3).trim()
      if (!pathPart) return []
      const renameTarget = pathPart.includes(" -> ") ? pathPart.split(" -> ").at(-1) : pathPart
      return renameTarget ? [renameTarget] : []
    })
}

export function gitStatusChangedFiles(root: string): string[] {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
    return parseGitStatusPorcelain(output).filter(shouldWatchPath)
  } catch {
    return []
  }
}

export function missingNotebookSections(content: string | undefined): string[] {
  if (!content) return REQUIRED_NOTEBOOK_SECTIONS.map((section) => section.name)
  return REQUIRED_NOTEBOOK_SECTIONS.filter((section) => !section.patterns.some((pattern) => pattern.test(content))).map((section) => section.name)
}

function gitTimestamp(root: string, path: string): number | undefined {
  try {
    const output = execFileSync("git", ["log", "-1", "--format=%ct", "--", path], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()
    if (!output) return undefined
    return Number(output) * 1000
  } catch {
    return undefined
  }
}

function fileStatus(root: string, path: string): FileStatus {
  const fullPath = join(root, path)
  if (!existsSync(fullPath)) return { path, exists: false }
  return { path, exists: true, mtimeMs: statSync(fullPath).mtimeMs, gitTimestamp: gitTimestamp(root, path) }
}

function readText(root: string, path: string): string | undefined {
  try {
    return readFileSync(join(root, path), "utf8")
  } catch {
    return undefined
  }
}

function listMarkdownFiles(root: string, dir: string): FileStatus[] {
  const fullDir = join(root, dir)
  if (!existsSync(fullDir)) return []
  return readdirSync(fullDir).filter((name) => name.endsWith(".md")).sort().map((name) => fileStatus(root, join(dir, name)))
}

function walkFiles(root: string, dir: string, maxFiles = 300): string[] {
  const fullDir = join(root, dir)
  if (!existsSync(fullDir)) return []
  const results: string[] = []
  const stack = [fullDir]
  while (stack.length > 0 && results.length < maxFiles) {
    const current = stack.pop()
    if (!current) break
    for (const entry of readdirSync(current)) {
      const full = join(current, entry)
      const rel = relative(root, full)
      if (isIgnoredPath(rel)) continue
      const stat = statSync(full)
      if (stat.isDirectory()) stack.push(full)
      else results.push(rel)
    }
  }
  return results.sort()
}

function rootWatchedFiles(root: string): string[] {
  return Array.from(WATCH_NAMES).filter((path) => existsSync(join(root, path)))
}

function workflowFiles(root: string): string[] {
  return walkFiles(root, ".github/workflows", 100).filter(shouldWatchPath)
}

function timestamp(file: FileStatus): number | undefined {
  return file.gitTimestamp ?? file.mtimeMs
}

function latestTimestamp(files: FileStatus[]): number | undefined {
  const times = files.flatMap((file) => {
    const value = timestamp(file)
    return value === undefined ? [] : [value]
  })
  return times.length === 0 ? undefined : Math.max(...times)
}

export function buildNotebookReport(root: string, changedFiles: Set<string>): NotebookReport {
  const notebook = fileStatus(root, NOTEBOOK_PATH)
  const architectureDocs = listMarkdownFiles(root, ARCHITECTURE_DIR)
  const candidateFiles = [...rootWatchedFiles(root), ...workflowFiles(root), ...walkFiles(root, "src", 500), ...walkFiles(root, "tests", 500), ...walkFiles(root, "config", 200), ...walkFiles(root, "deploy", 200)].filter(shouldWatchPath)
  const sourceStatuses = Array.from(new Set(candidateFiles)).map((path) => fileStatus(root, path))
  const docStatuses = [notebook, ...architectureDocs]
  const newestDoc = latestTimestamp(docStatuses)
  const newerWatchedFiles = sourceStatuses.filter((file) => file.exists && newestDoc !== undefined && (timestamp(file) ?? 0) > newestDoc).map((file) => file.path).slice(0, 50)
  const recentDocChanges = docStatuses.filter((file) => file.exists).sort((a, b) => (timestamp(b) ?? 0) - (timestamp(a) ?? 0)).map((file) => file.path).slice(0, 10)
  const recommendedDocs: Record<string, string[]> = {}
  const notebookText = notebook.exists ? readText(root, NOTEBOOK_PATH) : undefined
  const missingSections = missingNotebookSections(notebookText)
  const missingArchitectureReferences = notebookText === undefined ? [] : architectureDocs.map((file) => file.path).filter((path) => !notebookText.includes(path))
  for (const path of Array.from(changedFiles).sort()) recommendedDocs[path] = classifyChangedPath(path)
  for (const path of newerWatchedFiles) recommendedDocs[path] = classifyChangedPath(path)

  const recommendations: string[] = []
  if (!notebook.exists) recommendations.push("未发现 docs/program-notebook.md；非极简项目应考虑创建中枢 notebook。")
  if (architectureDocs.length > 0 && notebook.exists) recommendations.push("已发现 docs/architecture/*.md；notebook 应索引并摘要这些专题文档。")
  if (missingArchitectureReferences.length > 0) recommendations.push("architecture docs 存在但 notebook 未完整索引；请在 docs/program-notebook.md 的参考资料索引中补充缺失路径。")
  if (notebook.exists && missingSections.length > 0) recommendations.push("docs/program-notebook.md 缺少关键章节；请按 program-notebook skill 的固定结构补齐。")
  if (architectureDocs.length === 0 && notebook.exists) recommendations.push("未发现 docs/architecture/*.md；如果结构图、数据流或测试覆盖过长，应拆分专题文档。")
  if (newerWatchedFiles.length > 0) recommendations.push("存在比 notebook/docs 更新的受关注文件；请检查推荐文档是否需要同步。")
  if (changedFiles.size > 0) recommendations.push(`本会话已改动 ${changedFiles.size} 个受关注文件；最终回复前请判断 notebook/docs 是否需要更新。`)

  return { projectRoot: root, notebook, architectureDocs, newerWatchedFiles, recentDocChanges, recommendedDocs, missingArchitectureReferences, missingNotebookSections: missingSections, recommendations }
}

export function formatNotebookReport(report: NotebookReport, changedFiles: Set<string>): string {
  const arch = report.architectureDocs.length === 0 ? "未发现" : report.architectureDocs.map((file) => `- ${file.path}`).join("\n")
  const newerFiles = report.newerWatchedFiles.length === 0 ? "未发现比文档更新的受关注文件" : report.newerWatchedFiles.map((path) => `- ${path}`).join("\n")
  const changed = changedFiles.size === 0 ? "本会话尚未记录受关注文件改动" : Array.from(changedFiles).sort().slice(0, 50).map((path) => `- ${path}`).join("\n")
  const recommended = Object.keys(report.recommendedDocs).length === 0 ? "暂无精确文档建议" : Object.entries(report.recommendedDocs).slice(0, 30).map(([path, docs]) => `- ${path} -> ${docs.join(", ")}`).join("\n")
  const missingArchitectureReferences = report.missingArchitectureReferences.length === 0 ? "未发现缺失的 architecture 索引" : report.missingArchitectureReferences.map((path) => `- ${path}`).join("\n")
  const missingSections = report.missingNotebookSections.length === 0 ? "未发现缺失关键章节" : report.missingNotebookSections.map((section) => `- ${section}`).join("\n")
  const recentDocs = report.recentDocChanges.length === 0 ? "未发现 notebook/docs 文档" : report.recentDocChanges.map((path) => `- ${path}`).join("\n")
  const recommendations = report.recommendations.length === 0 ? "暂无明显同步风险" : report.recommendations.map((item) => `- ${item}`).join("\n")
  return ["<program-notebook-status>", `项目根目录: ${report.projectRoot}`, `Notebook: ${report.notebook.exists ? report.notebook.path : "未发现 docs/program-notebook.md"}`, "Architecture docs:", arch, "比文档更新的受关注文件:", newerFiles, "本会话改动记录:", changed, "精确文档建议:", recommended, "Notebook 缺失的 architecture 索引:", missingArchitectureReferences, "Notebook 缺失的关键章节:", missingSections, "最近文档:", recentDocs, "建议:", recommendations, "如果后续进行跨模块或结构性改动，请加载 program-notebook skill，并在最终回复中报告 notebook/docs 状态。", "</program-notebook-status>"].join("\n")
}

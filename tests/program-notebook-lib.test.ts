import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  buildNotebookReport,
  classifyChangedPath,
  parseGitStatusPorcelain,
  shouldWatchPath,
} from "../lib/program-notebook-lib"

describe("program notebook path classification", () => {
  test("watches root-level project coordination files", () => {
    expect(shouldWatchPath("Cargo.toml")).toBe(true)
    expect(shouldWatchPath("build.rs")).toBe(true)
    expect(shouldWatchPath(".github/workflows/ci.yml")).toBe(true)
    expect(shouldWatchPath("README.md")).toBe(true)
  })

  test("does not watch generated or dependency paths", () => {
    expect(shouldWatchPath("target/debug/app")).toBe(false)
    expect(shouldWatchPath("node_modules/pkg/index.js")).toBe(false)
    expect(shouldWatchPath(".git/config")).toBe(false)
  })

  test("routes module changes to notebook and structure docs", () => {
    expect(classifyChangedPath("src/server.rs")).toEqual([
      "docs/program-notebook.md",
      "docs/architecture/01-program-structure.md",
    ])
  })

  test("routes driver and protocol changes to data-flow docs", () => {
    expect(classifyChangedPath("src/drivers/can_socketcan.rs")).toEqual([
      "docs/program-notebook.md",
      "docs/architecture/01-program-structure.md",
      "docs/architecture/02-data-flow.md",
    ])
    expect(classifyChangedPath("src/can_protocol.rs")).toContain("docs/architecture/02-data-flow.md")
  })

  test("routes tests and CI to CI pipeline docs", () => {
    expect(classifyChangedPath("tests/state_machine.rs")).toEqual([
      "docs/program-notebook.md",
      "docs/architecture/03-ci-pipeline.md",
    ])
    expect(classifyChangedPath(".github/workflows/test.yml")).toEqual([
      "docs/program-notebook.md",
      "docs/architecture/03-ci-pipeline.md",
    ])
  })

  test("routes config, deploy, and build changes to notebook", () => {
    expect(classifyChangedPath("config/device.json")).toEqual(["docs/program-notebook.md"])
    expect(classifyChangedPath("deploy/deploy.sh")).toEqual(["docs/program-notebook.md"])
    expect(classifyChangedPath("build.rs")).toEqual(["docs/program-notebook.md"])
  })

  test("parses git status porcelain changed paths", () => {
    const output = [
      " M src/server.rs",
      "A  tests/state_machine.rs",
      " D config/old.json",
      "R  src/old.rs -> src/new.rs",
      "?? .github/workflows/ci.yml",
    ].join("\n")

    expect(parseGitStatusPorcelain(output)).toEqual([
      "src/server.rs",
      "tests/state_machine.rs",
      "config/old.json",
      "src/new.rs",
      ".github/workflows/ci.yml",
    ])
  })

  test("reports architecture docs missing from notebook index", () => {
    const root = mkdtempSync(join(tmpdir(), "program-notebook-test-"))
    mkdirSync(join(root, "docs/architecture"), { recursive: true })
    writeFileSync(join(root, "docs/program-notebook.md"), "# Notebook\n\n没有架构链接。\n")
    writeFileSync(join(root, "docs/architecture/01-program-structure.md"), "# Structure\n")
    writeFileSync(join(root, "docs/architecture/02-data-flow.md"), "# Data Flow\n")

    const report = buildNotebookReport(root, new Set())

    expect(report.missingArchitectureReferences).toEqual([
      "docs/architecture/01-program-structure.md",
      "docs/architecture/02-data-flow.md",
    ])
    expect(report.recommendations).toContain("architecture docs 存在但 notebook 未完整索引；请在 docs/program-notebook.md 的参考资料索引中补充缺失路径。")
  })

  test("reports missing required notebook sections", () => {
    const root = mkdtempSync(join(tmpdir(), "program-notebook-test-"))
    mkdirSync(join(root, "docs"), { recursive: true })
    writeFileSync(join(root, "docs/program-notebook.md"), "# Notebook\n\n## 当前状态\n\n只有状态记录。\n")

    const report = buildNotebookReport(root, new Set())

    expect(report.missingNotebookSections).toEqual([
      "文档分层或参考资料索引",
      "数据流摘要",
      "架构摘要",
      "程序运行流",
      "配置加载链",
      "模块摘要",
      "已知缺陷与限制",
    ])
    expect(report.recommendations).toContain("docs/program-notebook.md 缺少关键章节；请按 program-notebook skill 的固定结构补齐。")
  })
})

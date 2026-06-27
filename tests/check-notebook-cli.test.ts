import { describe, expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

function runCli(cwd: string, args: string[] = []): { stdout: string; stderr: string; exitCode: number } {
  const proc = Bun.spawnSync(["bun", "run", "bin/check-notebook.ts", ...args], {
    cwd,
    stdout: "pipe",
    stderr: "pipe",
  })
  return {
    stdout: new TextDecoder().decode(proc.stdout),
    stderr: new TextDecoder().decode(proc.stderr),
    exitCode: proc.exitCode,
  }
}

describe("check-notebook cli", () => {
  test("reports missing notebook in empty project", () => {
    const root = mkdtempSync(join(tmpdir(), "program-notebook-cli-test-"))
    const result = runCli(process.cwd(), [root])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("未发现 docs/program-notebook.md")
  })

  test("reports no risk for complete notebook", () => {
    const root = mkdtempSync(join(tmpdir(), "program-notebook-cli-test-"))
    mkdirSync(join(root, "docs/architecture"), { recursive: true })
    writeFileSync(join(root, "docs/architecture/01-program-structure.md"), "# Structure\n")
    writeFileSync(join(root, "docs/architecture/02-data-flow.md"), "# Data Flow\n")
    writeFileSync(join(root, "docs/architecture/03-ci-pipeline.md"), "# CI\n")
    writeFileSync(join(root, "docs/architecture/04-code-style.md"), "# Code Style\n")
    writeFileSync(
      join(root, "docs/program-notebook.md"),
      "# Notebook\n\n## 文档分层\n\n- docs/architecture/01-program-structure.md\n- docs/architecture/02-data-flow.md\n- docs/architecture/03-ci-pipeline.md\n- docs/architecture/04-code-style.md\n\n## 参考资料索引\n\n- docs/architecture/01-program-structure.md\n- docs/architecture/02-data-flow.md\n- docs/architecture/03-ci-pipeline.md\n- docs/architecture/04-code-style.md\n\n## 数据流摘要\n\n## 架构摘要\n\n## 程序运行流\n\n## 配置加载链\n\n## 模块摘要\n\n## 已知缺陷与限制\n"
    )
    const result = runCli(process.cwd(), [root])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("暂无明显同步风险")
  })

  test("reports missing required sections", () => {
    const root = mkdtempSync(join(tmpdir(), "program-notebook-cli-test-"))
    mkdirSync(join(root, "docs"), { recursive: true })
    writeFileSync(
      join(root, "docs/program-notebook.md"),
      "# Notebook\n\n## 当前状态\n"
    )
    const result = runCli(process.cwd(), [root])

    expect(result.exitCode).toBe(0)
    expect(result.stdout).toContain("docs/program-notebook.md 缺少关键章节")
  })
})

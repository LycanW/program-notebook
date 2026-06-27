#!/usr/bin/env bun
import { resolve } from "node:path"
import { buildNotebookReport, formatNotebookReport } from "../lib/program-notebook-lib"

const projectRoot = resolve(process.argv[2] || process.cwd())

try {
  const report = buildNotebookReport(projectRoot, new Set())
  console.log(formatNotebookReport(report, new Set()))
} catch (error) {
  console.error("检查失败:", error instanceof Error ? error.message : String(error))
  process.exit(1)
}

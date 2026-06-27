---
description: 检查 program notebook 与架构专题文档是否需要同步
agent: build
---

请调用 `check_notebook` 工具，读取其报告，并用中文给出简短结论：

- Notebook 状态：存在 / 缺失 / 可能陈旧
- Architecture docs 状态：是否存在，是否需要补充索引
- 本会话或最近结构性改动涉及哪些文件
- 应检查或更新哪些文档
- 如果无需更新，请说明证据

不要直接猜测文档状态；必须基于 `check_notebook` 工具输出回答。

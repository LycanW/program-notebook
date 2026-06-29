# program-notebook

OpenCode 与 Kimi Code 的 Program Notebook 插件、skill 和命令包。

这个仓库把项目中枢文档约定固定下来：`docs/program-notebook.md` 是入口索引和状态摘要，`docs/architecture/*.md` 是结构、数据流、CI、代码风格等专题展开层。插件只做检查、提醒和工具暴露，不自动写文档。

## 让 Agent 安装

### OpenCode

把下面这段复制给你的 agent：

```text
Fetch and follow instructions from https://raw.githubusercontent.com/LycanW/program-notebook/refs/heads/main/.opencode/INSTALL.md
```

### Kimi Code

把下面这段复制给你的 agent：

```text
Fetch and follow instructions from https://raw.githubusercontent.com/LycanW/program-notebook/refs/heads/main/.kimi/INSTALL.md
```

## 包含内容

- `.opencode/plugins/program-notebook.ts`：OpenCode 插件入口。
- `.opencode/commands/check-notebook.md`：OpenCode `/check-notebook` 命令模板。
- `.opencode/INSTALL.md`：OpenCode 安装说明。
- `kimi.plugin.json`：Kimi Code plugin 清单。
- `.kimi/skills/program-notebook/SKILL.md`：Kimi Code skill。
- `.kimi/INSTALL.md`：Kimi Code 安装说明。
- `bin/check-notebook.ts`：命令行检查入口。
- `bin/check-notebook-mcp.ts`：Kimi Code MCP server 入口。
- `lib/program-notebook-lib.ts`：可测试的文档检查逻辑。
- `skills/program-notebook/SKILL.md`：OpenCode skill 正文。
- `tests/program-notebook-lib.test.ts`：核心库 Bun 测试。
- `tests/check-notebook-cli.test.ts`：CLI Bun 测试。

## 功能

- 自动注册本仓库的 `program-notebook` skill 路径。
- 在会话消息中注入 `<program-notebook-status>`，提示 notebook 和架构文档状态。
- 暴露 `check_notebook` 工具，检查固定文档路径、architecture 索引、关键章节、git-aware 陈旧风险和本会话结构性改动。
- 记录 `apply_patch`、文件编辑和 `bash` 后的受关注文件改动。
- 对改动路径给出精确文档建议。

## 固定文档结构

- `docs/program-notebook.md`：中枢索引、项目摘要、当前状态、关键决策、进度、风险、已知缺陷、参考资料入口。
- `docs/architecture/01-program-structure.md`：完整程序结构框图、模块职责、关键依赖。
- `docs/architecture/02-data-flow.md`：运行时数据流、硬件反馈、网络路径、状态传播。
- `docs/architecture/03-ci-pipeline.md`：测试覆盖、CI 验证链路、质量门。
- `docs/architecture/04-code-style.md`：代码风格、复杂模块、维护风险、重构建议。

## 安装

### OpenCode

在 `~/.config/opencode/opencode.jsonc` 或 `~/.config/opencode/opencode.json` 中加入 npm 包名：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["program-notebook"]
}
```

插件会在启动时自动安装，并注册 `/check-notebook` 命令和 `program-notebook` skill。

重启 OpenCode 生效。OpenCode 不会热重载配置、插件、skill 或命令。

### Kimi Code

1. 在 Kimi Code 中安装 plugin：

```text
/plugins install https://github.com/LycanW/program-notebook
```

2. 运行 `/reload` 或开启新会话，使 plugin 生效。

## 使用

### OpenCode

在 OpenCode 中可直接调用：

```text
/check-notebook
```

或者让 agent 调用工具：

```text
请调用 check_notebook，并基于报告判断 notebook/docs 是否需要更新。
```

### Kimi Code

在 Kimi Code 中让 agent 调用工具：

```text
请调用 check_notebook，并基于报告判断 notebook/docs 是否需要更新。
```

也可以指定项目根目录：

```text
请调用 check_notebook，projectRoot 为 /path/to/project，并基于报告判断 notebook/docs 是否需要更新。
```

当任务涉及陌生代码库、跨模块改动、源码/配置/构建/测试/架构/数据流结构性变化时，agent 应加载 `program-notebook` skill。

面向 agent 的自动部署、维护和发布步骤见 `AGENTS.md`。

## 开发验证

```bash
bun install
bun test
bun --print "await import('./.opencode/plugins/program-notebook.ts').then((m) => typeof m.default)"
```

预期结果：测试全通过，插件导入输出 `function`。

## 注意事项

- 不要把 `lib/program-notebook-lib.ts` 放进 `.opencode/plugins/` 或 `~/.config/opencode/plugins/`。
- OpenCode 会把 `plugins/*.ts` 的每个文件都当作插件入口自动加载。
- 只有 `.opencode/plugins/program-notebook.ts` 应作为插件入口。
- 插件报告是证据入口，不替代读取源码、配置、测试和文档。

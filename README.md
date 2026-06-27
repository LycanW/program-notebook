# opencode-program-notebook

OpenCode 的 Program Notebook 插件、skill 和命令包。

这个仓库把项目中枢文档约定固定下来：`docs/program-notebook.md` 是入口索引和状态摘要，`docs/architecture/*.md` 是结构、数据流、CI、代码风格等专题展开层。插件只做检查、提醒和工具暴露，不自动写文档。

## 包含内容

- `.opencode/plugins/program-notebook.ts`：OpenCode 插件入口。
- `lib/program-notebook-lib.ts`：可测试的文档检查逻辑。
- `skills/program-notebook/SKILL.md`：Program Notebook 工作纪律。
- `.opencode/commands/check-notebook.md`：`/check-notebook` 命令模板。
- `tests/program-notebook-lib.test.ts`：Bun 测试。

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

## 全局安装

克隆仓库到一个稳定位置：

```bash
git clone https://github.com/<owner>/opencode-program-notebook.git ~/.config/opencode-program-notebook
```

在 `~/.config/opencode/opencode.jsonc` 或 `~/.config/opencode/opencode.json` 中加入插件路径：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///home/YOUR_USER/.config/opencode-program-notebook/.opencode/plugins/program-notebook.ts"
  ]
}
```

安装命令文件：

```bash
mkdir -p ~/.config/opencode/commands
cp ~/.config/opencode-program-notebook/.opencode/commands/check-notebook.md ~/.config/opencode/commands/check-notebook.md
```

重启 OpenCode。OpenCode 不会热重载插件、skill 或命令。

## 项目级安装

把仓库作为项目内工具目录或子模块放到稳定路径，然后在项目 `.opencode/opencode.json` 中引用插件入口：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "./tools/opencode-program-notebook/.opencode/plugins/program-notebook.ts"
  ]
}
```

如果需要 `/check-notebook`，把命令文件复制到项目 `.opencode/commands/check-notebook.md`。

## 使用

在 OpenCode 中可直接调用：

```text
/check-notebook
```

或者让 agent 调用工具：

```text
请调用 check_notebook，并基于报告判断 notebook/docs 是否需要更新。
```

当任务涉及陌生代码库、跨模块改动、源码/配置/构建/测试/架构/数据流结构性变化时，agent 应加载 `program-notebook` skill。

## 给 Agents 的自动部署步骤

1. 克隆本仓库到稳定目录，例如 `~/.config/opencode-program-notebook`。
2. 在 OpenCode 配置的 `plugin` 数组中加入插件入口的绝对 `file://` URL。
3. 复制 `.opencode/commands/check-notebook.md` 到全局或项目命令目录。
4. 运行 `bun install` 和 `bun test` 验证仓库。
5. 运行插件导入检查：`bun --print "await import('./.opencode/plugins/program-notebook.ts').then((m) => typeof m.default)"`。
6. 提醒用户重启 OpenCode。

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

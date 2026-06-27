# Agent 指南

本仓库发布 OpenCode 的 `program-notebook` 插件、skill 和命令。内容主体使用中文。

## 工作原则

- 保持固定路径和固定格式，不做插件配置化。
- `docs/program-notebook.md` 是中枢文档。
- `docs/architecture/*.md` 是展开型专题文档。
- 插件只做检查、提醒和工具暴露，不自动写文档。
- 新增行为必须先写测试，再实现。
- 手动编辑文件时使用补丁方式，避免用脚本批量重写文件。

## 目录约定

- `.opencode/plugins/program-notebook.ts` 是唯一插件入口。
- `lib/program-notebook-lib.ts` 存放可测试逻辑。
- `skills/program-notebook/SKILL.md` 存放 skill 正文。
- `.opencode/commands/check-notebook.md` 存放 OpenCode 命令模板。
- `tests/program-notebook-lib.test.ts` 存放 Bun 测试。

## 重要禁止事项

- 不要把 `lib/program-notebook-lib.ts` 移入 `.opencode/plugins/`。
- 不要在 `.opencode/plugins/` 下放第二个 `.ts` 辅助库文件。
- 不要让插件自动修改用户项目文档。
- 不要在无法验证代码事实时补全文档内容。

## 验证命令

```bash
bun install
bun test
bun --print "await import('./.opencode/plugins/program-notebook.ts').then((m) => typeof m.default)"
```

测试应全部通过，插件导入应输出 `function`。

## 发布流程

1. 修改前确认当前文件布局。
2. 行为变更先更新或新增测试，并确认测试失败原因正确。
3. 实现最小变更。
4. 运行验证命令。
5. 检查 `git status`、`git diff` 和最近提交。
6. 只提交本次意图相关文件。

## 安装给用户时

1. 克隆仓库到稳定目录，例如 `~/.config/opencode-program-notebook`。
2. 在 OpenCode 配置 `plugin` 数组加入插件入口的绝对 `file://` URL。
3. 复制 `.opencode/commands/check-notebook.md` 到 `~/.config/opencode/commands/` 或项目 `.opencode/commands/`。
4. 运行验证命令。
5. 提醒用户重启 OpenCode，配置、插件、skill 和命令不会热重载。

## 全局自动部署步骤

1. 确认 `~/.config/opencode` 存在；不存在则创建。
2. 克隆或更新仓库：`https://github.com/LycanW/opencode-program-notebook.git`。
3. 推荐克隆路径：`~/.config/opencode-program-notebook`。
4. 在 `~/.config/opencode/opencode.jsonc` 或 `~/.config/opencode/opencode.json` 的 `plugin` 数组中加入绝对 `file://` URL，例如 `file:///home/USER/.config/opencode-program-notebook/.opencode/plugins/program-notebook.ts`。
5. 如果配置文件不存在，创建带 `$schema` 的最小配置。
6. 如果配置已有 `plugin` 数组，只追加插件路径，不覆盖用户已有插件。
7. 复制 `.opencode/commands/check-notebook.md` 到 `~/.config/opencode/commands/check-notebook.md`。
8. 在仓库目录运行 `bun install`。
9. 在仓库目录运行 `bun test`。
10. 在仓库目录运行 `bun --print "await import('./.opencode/plugins/program-notebook.ts').then((m) => typeof m.default)"`。
11. 验证输出后，提醒用户重启 OpenCode。

## 项目级自动部署步骤

1. 把仓库克隆到项目内稳定目录，例如 `tools/opencode-program-notebook`。
2. 在项目 `.opencode/opencode.json` 中加入相对插件路径，例如 `./tools/opencode-program-notebook/.opencode/plugins/program-notebook.ts`。
3. 如果项目需要 slash command，复制命令文件到 `.opencode/commands/check-notebook.md`。
4. 在克隆目录运行验证命令。
5. 提醒用户从项目目录重启 OpenCode。

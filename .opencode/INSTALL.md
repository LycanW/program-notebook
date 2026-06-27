# 安装 Program Notebook for OpenCode

你是用户的 agent。请在用户当前机器上安装或更新 `opencode-program-notebook`，并在完成后报告验证结果。

## 目标

- 安装仓库：`https://github.com/LycanW/opencode-program-notebook.git`
- 默认安装目录：`~/.config/opencode-program-notebook`
- 注册插件入口：`~/.config/opencode-program-notebook/.opencode/plugins/program-notebook.ts`
- 安装 slash command：`~/.config/opencode/commands/check-notebook.md`
- 安装后提醒用户重启 OpenCode

## 步骤

1. 确认 `~/.config/opencode` 存在；不存在则创建。
2. 如果 `~/.config/opencode-program-notebook/.git` 存在，进入该目录并拉取最新 `main`。
3. 如果目录不存在，克隆仓库到 `~/.config/opencode-program-notebook`。
4. 如果目录存在但不是 git 仓库，不要删除用户文件；停下来询问用户如何处理。
5. 读取 `~/.config/opencode/opencode.jsonc` 或 `~/.config/opencode/opencode.json`。
6. 如果两个文件都不存在，创建 `~/.config/opencode/opencode.jsonc`，内容至少包含 `$schema` 和 `plugin` 数组。
7. 在配置的 `plugin` 数组中追加绝对 `file://` URL：`file:///home/USER/.config/opencode-program-notebook/.opencode/plugins/program-notebook.ts`。
8. 不要覆盖用户已有配置、provider、agent、permission、mcp 或其他 plugin。
9. 如果已有相同插件路径，不要重复添加。
10. 复制 `.opencode/commands/check-notebook.md` 到 `~/.config/opencode/commands/check-notebook.md`。
11. 在仓库目录运行 `bun install`。
12. 在仓库目录运行 `bun test`。
13. 在仓库目录运行 `bun --print "await import('./.opencode/plugins/program-notebook.ts').then((m) => typeof m.default)"`。

## 配置示例

把 `USER` 替换成实际用户名或直接使用解析后的绝对路径：

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": [
    "file:///home/USER/.config/opencode-program-notebook/.opencode/plugins/program-notebook.ts"
  ]
}
```

## 完成报告

安装完成后，用中文报告：

- 仓库路径
- 修改过的 OpenCode 配置文件路径
- slash command 安装路径
- `bun test` 结果
- 插件导入检查结果
- 是否需要用户重启 OpenCode

OpenCode 不会热重载配置、插件、skill 或命令；安装或更新后必须重启。

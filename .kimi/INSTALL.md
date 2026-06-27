# 安装 Kimi Code 的 Program Notebook

你是用户的 agent。请在用户当前机器上安装或更新 `opencode-program-notebook`，使其能在 Kimi Code 中使用，并在完成后报告验证结果。

## 目标

- 安装仓库：`https://github.com/LycanW/opencode-program-notebook.git`
- 默认安装目录：`~/.config/opencode-program-notebook`
- 注册 Kimi Code plugin：通过 `/plugins install` 从本地路径安装
- 验证 CLI 可用：`bun run check-notebook`

## 约束

- 不要覆盖用户已有配置、skill、plugin 或其他代理指南。

## 步骤

1. 确认 `bun` 已安装；未安装时引导用户安装 `https://bun.sh`。
2. 确认 `~/.config/opencode-program-notebook/.git` 是否存在。
   - 如果存在，进入该目录并拉取最新 `main`。
   - 如果不存在，克隆仓库到 `~/.config/opencode-program-notebook`。
3. 如果目录存在但不是 git 仓库，不要删除用户文件；停下来询问用户如何处理。
4. 进入仓库目录运行 `bun install`。
5. 进入仓库目录运行 `bun test`。
6. 进入仓库目录运行 `bun run check-notebook`。
7. 在 Kimi Code 中安装 plugin：
   - 运行 `/plugins install file:///home/USER/.config/opencode-program-notebook`（把 `USER` 替换为实际用户名，或直接使用解析后的绝对路径）
8. 安装完成后运行 `/reload` 或开启新会话，使 plugin 生效。

## 失败处理

- 如果 `bun install` 失败，报告错误并停止。
- 如果 `bun test` 失败，报告哪些测试失败并停止。
- 如果 `/plugins install` 失败，报告错误；建议检查网络或 Kimi Code 版本。

## 完成报告

安装完成后，用中文报告：

- 仓库路径
- plugin 安装命令及结果
- `bun test` 结果
- `bun run check-notebook` 结果
- 是否需要用户运行 `/reload` 或开启新会话

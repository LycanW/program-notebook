# 安装 Program Notebook for OpenCode

你是用户的 agent。请在用户当前机器上安装或更新 `program-notebook`，并在完成后报告验证结果。

## 目标

- 包名：`program-notebook`（来自 npm）
- 注册插件：在 OpenCode 配置的 `plugin` 数组中追加 `"program-notebook"`
- 插件会自动注册 `/check-notebook` 命令和 `program-notebook` skill
- 安装后提醒用户重启 OpenCode

## 步骤

1. 确认 `~/.config/opencode` 存在；不存在则创建。
2. 读取 `~/.config/opencode/opencode.jsonc` 或 `~/.config/opencode/opencode.json`。
3. 如果两个文件都不存在，创建 `~/.config/opencode/opencode.jsonc`，内容至少包含 `$schema` 和 `plugin` 数组。
4. 在配置的 `plugin` 数组中追加 `"program-notebook"`。
5. 不要覆盖用户已有配置、provider、agent、permission、mcp 或其他 plugin。
6. 如果已有 `"program-notebook"`，不要重复添加。

## 配置示例

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugin": ["program-notebook"]
}
```

## 完成报告

安装完成后，用中文报告：

- 修改过的 OpenCode 配置文件路径
- 是否需要用户重启 OpenCode
- 插件和 `/check-notebook` 命令将在 OpenCode 下次启动时生效

OpenCode 不会热重载配置、插件、skill 或命令；安装或更新后必须重启。

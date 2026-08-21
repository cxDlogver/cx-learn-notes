# 常见问题与处理

## Missing command

- 原因：缺少子命令、domain 选错，或当前环境的 CLI / plugin 命令面与 skill 文档不一致。
- 处理：先看 `references/command-surface.md` 重新路由；如果 domain 已确定，不要只依赖 guide 里的命令清单，优先沿真实命令层级查 runtime help：

```bash
bytedcli <group> --help
bytedcli <group> <sub-domain> --help
bytedcli <group> <sub-domain> <resource> --help
```

- 补充：skill 文档用于场景路由和常用调用指引，不保证覆盖当前环境的完整命令树；实际可用命令以当前环境的 `bytedcli ... --help` 为准。若 runtime help 中也没有目标命令，再检查 CLI 版本或 plugin 安装 / 更新状态。

## Missing argument / CLI_ARGS_MISSING

- 原因：缺少必填位置参数或必填选项。
- 处理：对当前叶子命令执行 `--help`，不要猜参数名。
- 补充：JSON 模式下很多命令会在错误 payload 里带 help schema，可直接按 schema 修正。

## Not authenticated / AUTH_REQUIRED

- 原因：未登录、站点切错，或 token 过期。
- 处理：

```bash
bytedcli auth login
bytedcli --json auth status
```

- 补充：部分命令会自动按 `BYTEDCLI_USER_CLOUD_JWT -> AIME_USER_CLOUD_JWT` 或 `BYTEDCLI_USER_CODE_JWT -> AIME_USER_CODE_JWT` 回退；这些环境变量也不可用时再重新登录。

## 目标站点已切换但仍然 401

- 原因：认证隔离按 SSO 环境生效，尤其是 `i18n-tt` 与 ByteDance SSO 站点不共享登录态。
- 处理：为目标站点单独登录。例如：

```bash
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login
```

## JSON 输出不稳定

- 原因：把 `--json` 放在了 domain 或子命令后面。
- 处理：改成 `... --json <domain> <subcommand> ...`。

## 需要排查真实请求链路

- 优先加 `--http-debug`。
- 需要更细控制时，用 `--http-print <parts>` 或 `--http-trace-file <path>`。

## Feishu / Meego 这类二维码登录命令在非 TTY 场景失败

- 处理：关闭终端二维码，并生成图片二维码。

```bash
bytedcli feishu login --no-terminal-qr
bytedcli meego login --no-terminal-qr
bytedcli --json auth login --begin
bytedcli --json meego login --begin
```

## Meego 命令看起来缺字段，或不知道该传哪个 ID

- 处理：先尝试直接传 URL，不要手拆 `project_key`、`work_item_id`、`view_id`。

```bash
bytedcli meego workitem get --url <workitem-url>
bytedcli meego comment list --url <workitem-url>
bytedcli meego chart list --url <view-url>
```

## Meego `array<string>` 参数不好传

- 处理：这类原生参数除了 JSON，也支持单值、逗号分隔、竖线分隔。

```bash
bytedcli meego user search --user-keys demo-user
bytedcli meego user search --user-keys demo-user,other-user
bytedcli meego schedule list --user-keys demo-user|other-user
```

## 不确定该走哪个数据命令

- 直接查数据库或 BPM：`rds`
- 海外 DataQ RDS 查询：`dataq`
- Hive 资产、schema、lineage：`hive`
- Dorado 任务与 ad-hoc SQL：`dorado`
- BI dataset / dashboard / field：`aeolus`
- TQS SQL：`tqs`

## 网络或权限问题

- 先确认内网访问权限。
- 再确认站点和登录态。
- 需要代理时优先使用全局参数 `--socks5-proxy` 或 `--http-proxy`，不要手改命令实现。

## 不希望 bytedcli 自动升级或同步技能

- 单次命令关闭：`bytedcli --no-auto-upgrade <command> [options]`
- 当前 shell 长期关闭：`export BYTEDCLI_NO_AUTO_UPGRADE=1`

## 手动删除技能后又被恢复

- 原因：`self skill update` 和 auto-upgrade 依据 `~/.local/share/bytedcli/data/skill-lock.json` 记录判断已安装技能；只删除目录不会删除 lock 记录。
- 处理：用 CLI 删除技能，让目录和 lock 同步更新。

```bash
bytedcli self skill remove -g -s <skill-name>
bytedcli self skill remove --all -g
```

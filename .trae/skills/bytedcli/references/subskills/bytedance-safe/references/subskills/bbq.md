# Safe BBQ

BBQ（Horizon BBQ Open API）子域命令收纳在 `bytedance-safe` skill 内，命令路径以 `safe bbq` 开头。

## Commands

```bash
bytedcli safe bbq auth login --appid <appid> --secret <secret>
bytedcli safe bbq group get --group <group> [--with-topic]
bytedcli safe bbq topic get --group <group> --topic <topic>
bytedcli safe bbq quota get --group <group> --topic <topic>
bytedcli safe bbq lag get --group <group> --topic <topic>
bytedcli safe bbq tos get --group <group> --topic <topic> --mission-id <mission-id>
```

## Workflow

1. 先用 `safe bbq auth login` 把 `appid` 与 `secret` 换成 access token，bytedcli 会缓存到本地（不保存 secret）。缓存默认 24h，过期前 5 分钟会被判为失效，agent 串联多条命令时无需手动续期。
2. `group get` / `topic get` / `quota get` / `lag get` / `tos get` 都依赖该缓存 token，请求会自动带上 `token: <access-token>` header。
3. 推荐用 `--json` 让 agent / 脚本消费结果。
4. 文档、测试、示例中只使用 `sample-app-id` / `sample-secret` / `sample-group` 这类占位值，不要写真实凭据。

## Auth output

文本模式默认对 token 脱敏，并提示如何拿到原文：

```bash
bytedcli safe bbq auth login --appid sample-app-id --secret sample-secret
# Token: abcd…wxyz (saved)
# Use --reveal-token to print the full token, or --json to read .data.token.

bytedcli safe bbq auth login --appid sample-app-id --secret sample-secret --reveal-token
bytedcli --json safe bbq auth login --appid sample-app-id --secret sample-secret
```

JSON 形如：

```json
{
  "token": "sample-token",
  "expires_in": 7200,
  "expires_at": 1700007200000
}
```

`expires_in` 仅在上游响应包含时返回；`expires_at` 是本地缓存到期时间戳（毫秒）。

## Schema / queue queries

- `safe bbq group get --group <group> [--with-topic]`：`--with-topic` 是 boolean flag，传则带 `topic=true` 一起返回 topic 信息。
- `safe bbq topic get --group <group> --topic <topic>`：`--group` / `--topic` 映射到 schema 路径段。JSON 输出同时暴露原始 payload (`.data.result`) 和归一化的 `topic_config`（`topic_name` / `export_speed_num` / `virtual_topics_enabled` / `virtual_topics`）。
- `safe bbq quota get --group <group> --topic <topic>`：基于 topic 接口结果计算配额。
  - `export_speed_num > 0` 且 `virtual_topics_enabled = true`：`quota = export_speed_num * effective_topic_count`，其中 `effective_topic_count = virtual_topics.length + 1`（主 topic + 虚拟 topic）。
  - `export_speed_num > 0` 且 `virtual_topics_enabled = false`：`quota = export_speed_num`，`effective_topic_count = 1`。
  - `export_speed_num = 0`：再查 group schema，使用 `topic_export_speed_num` 作为 group quota，缺失时回退 `100`。
- `safe bbq lag get --group <group> --topic <topic>`：返回 exporter 路径上的 lag 信息，JSON 含归一化 `lag` 字段。
- `safe bbq tos get --group <group> --topic <topic> --mission-id <mission-id>`：`--mission-id` 写入 query `mission_id`。

如果缓存 token 已经失效，重新执行 `safe bbq auth login --appid ... --secret ...` 即可。

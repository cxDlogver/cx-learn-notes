---
name: bytedance-academy
description: "Operate Academy via bytedcli. Use this skill whenever the user mentions Academy, source_v2, raw feature set group, online/offline feature search, ad feature engineering, oceancloud.tiktok-row.net, Academy console URLs, or wants to turn Academy console searches into repeatable CLI / JSON workflows — even if they don't explicitly say 'Academy'. Prefer this skill instead of opening the web console whenever the task is to query Academy resources."
---

# bytedcli Academy

Academy 是字节广告特征开发与管理平台。本 skill 覆盖 3 条检索链路：

- `academy source search` — 搜 source_v2 数据源
- `academy raw-feature-set group search` — 搜离线 raw feature set group
- `academy feature search` — 搜在线 feature

写操作（create / update / delete）与详情接口当前不在覆盖范围。

## When to use

只要用户的意图是「在 Academy 里查 source / raw feature set group / feature 列表」，就优先走本 skill 而不是引导用户打开网页。典型触发词：

- Academy / source_v2 / raw feature set group / feature engineering
- 给出 `oceancloud.tiktok-row.net` 或类似 Academy 控制台 URL
- 控制台筛选条件需要复用、需要 JSON、需要给 agent / 脚本消费

## 调用方式

执行前缀与全局参数（`--site`、`--json`、HTTP debug 等）见 [`../../invocation.md`](../../invocation.md)。下面所有示例直接写 `bytedcli`，请按上面那份文档替换前缀。

需要鉴权时先登录目标 site：

```bash
bytedcli auth login                                  # cn / i18n-bd 共享 ByteDance SSO
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login      # i18n-tt / eu-ttp 走 TikTok SSO，需要单独登录
```

### `--site` 优先级（容易踩坑）

Academy 默认 host 是 TikTok ROW (`oceancloud.tiktok-row.net`)，因此**几乎所有用户场景都应该显式带 `--site i18n-tt`**。

- 取值优先级：CLI `--site` > 环境变量 `BYTEDCLI_CLOUD_SITE` > 全局默认（`cn`）。
- `--site` 是**全局参数**，必须放在 `academy` 前（与 `--json` / `--http-debug` 一致）；academy 子命令本身不再注册局部 `--site`。
- 用户给的是 `oceancloud.tiktok-row.net` 控制台地址时，必加 `--site i18n-tt`，否则会出现 401 / UserNotLogin。

```bash
# 推荐写法：所有全局参数放在 academy 前
bytedcli --site i18n-tt --json academy source search --source-name demo_source
```

## Quick start

```bash
# 1. 搜 source_v2（最小调用）
bytedcli --site i18n-tt academy source search --source-name demo_source

# 2. 搜离线 raw feature set group，按 owner 过滤
bytedcli --site i18n-tt academy raw-feature-set group search --keyword demo-group --owners demo-user

# 3. 搜在线 feature，需要正整数 id 过滤
bytedcli --site i18n-tt academy feature search --keyword demo_feature --ffe-graph-id 123

# 4. 需要给 agent / 脚本消费时，加全局 --json
bytedcli --json --site i18n-tt academy source search --source-name demo_source
```

## Commands

下面的参数表列出每个子命令**自身的 option**；全局参数（`--site` / `--json` / `--http-debug` / 重试与代理等）不在此处罗列，统一放在 `academy` 前，详见 [`../../invocation.md`](../../invocation.md)。

> 列表型参数（如 `--owners`、`--statuses`、`--update-frequencies`、`--versions`）按**单字符串**透传给 Academy 后端，不做客户端拆分；如果后端支持多值，按后端约定写（一般是逗号分隔，例如 `--owners alice,bob`）。

### academy source search

搜索 Academy `source_v2` 数据源。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `--base-url` | string (URL) | 否 | `https://oceancloud.tiktok-row.net`（或 env `ACADEMY_BASE_URL`） | 仅在默认 host 不可用时覆盖；只填站点根，例如 `https://example.academy.bytedance.net`，不要带 path |
| `--page` | int (≥1) | 否 | `1` | 页码 |
| `--page-size` | int (≥1) | 否 | `20` | 每页条数 |
| `--source-name` | string | 否 | - | 按 source 名称过滤 |
| `--owner` | string | 否 | - | 单个 owner |
| `--version` | string | 否 | - | 版本 |
| `--type` | string | 否 | - | source 类型 |
| `--datasource-type` | string | 否 | - | datasource 类型 |

### academy raw-feature-set group search

搜索 Academy 离线 raw feature set group。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `--base-url` | string (URL) | 否 | 同上 | |
| `--page` | int (≥1) | 否 | `1` | |
| `--page-size` | int (≥1) | 否 | `20` | |
| `--keyword` | string | 否 | - | 关键字模糊匹配 |
| `--owners` | string | 否 | - | 单字符串透传，按后端格式（一般逗号分隔） |
| `--statuses` | string | 否 | - | 同上 |
| `--update-frequencies` | string | 否 | - | 同上 |
| `--versions` | string | 否 | - | 同上 |
| `--type` | string | 否 | - | group 类型 |

### academy feature search

搜索 Academy 在线 feature。

| 参数 | 类型 | 必填 | 默认 | 说明 |
|------|------|------|------|------|
| `--base-url` | string (URL) | 否 | 同上 | |
| `--page` | int (≥1) | 否 | `1` | |
| `--page-size` | int (≥1) | 否 | `20` | |
| `--keyword` | string | 否 | - | |
| `--is-fountain-offline-research` | bool: 字面量 `true` \| `false` | 否 | - | **必须是字面量字符串**；`yes`/`1` 会被拒绝 |
| `--ffe-graph-id` | int (>0) | 否 | - | 必须是正整数 |

## JSON 输出 schema

`--json` 模式下，三条搜索命令的成功输出结构一致：

```jsonc
{
  "status": "success",
  "data": {
    "rows": [        // 每行字段随上游接口返回；常见列：name / owner / status / version / type
      { "name": "...", "owner": "...", "version": "...", "...": "..." }
    ],
    "total": 123,    // 命中总数
    "page": 1,       // 当前页码（= 入参 --page）
    "page_size": 20  // 每页条数（= 入参 --page-size）
  },
  "context": { "execution_time_ms": 100, "timestamp": "..." }
}
```

消费要点：

- `data.rows` 的字段并非固定 schema，由 Academy 后端决定；agent 解析前应判空、字段名按需 fallback（如 `name` ↔ `sourceName`、`owner` ↔ `owners`）。
- 行内字段**保留上游原始类型**：数字仍是 `number`、布尔仍是 `boolean`、嵌套对象/数组原样透传，不做客户端 stringify。例如 `data.rows[0].ffeGraphId === 123`（不是 `"123"`）。
- 翻页：判断 `data.page * data.page_size < data.total` 决定是否继续翻；下一页用 `--page`+1 重新调用同一命令。
- 失败时 `status` 为 `error`，`data` 为 `null`，错误消息在顶层 `error` 字段。

## Agent Guidance

### 优先直接走 CLI

只要用户的目标是查 source / raw feature set group / feature 列表，直接调用对应命令；不要先让用户打开网页再人工筛选，也不要让用户复制粘贴控制台筛选项。

### TikTok ROW 控制台默认带 `--site i18n-tt`

Academy 默认 host 就是 TikTok ROW，因此**没有特殊证据时一律加 `--site i18n-tt`**。当用户给的是其他站点（如 BOE 测试或自建 base-url），再相应调整。

### 需要机器可读输出

```bash
bytedcli --json --site i18n-tt academy ...
```

`--json` 是全局参数，必须放在 `academy` 前，写成 `academy ... --json` 不会生效。

### 参数取值踩坑

- `--is-fountain-offline-research` 只接受**字面量** `true` / `false`，传 `yes`、`1`、`True` 会被命令拒绝并提示 `Expected true or false.`。
- `--ffe-graph-id` 只接受**正整数**；传 `0` / 负数 / 浮点会被拒。
- 列表型参数客户端不做拆分，如果不确定后端是否支持多值，先单值调用一次确认。

## Common Errors

| 现象 | 触发条件 | 处理 |
|------|----------|------|
| `Expected true or false.` | `--is-fountain-offline-research` 传了非 `true/false` 字面量 | 改成 `--is-fountain-offline-research true`（或 `false`） |
| `Expected a positive integer.` | `--ffe-graph-id` 不是正整数 | 用正整数（如 `--ffe-graph-id 123`） |
| 401 / UserNotLogin / 缺少 Academy / Titan / SSO session | 目标 site 未登录或登错 site | `BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login` 后重试，并显式补 `--site i18n-tt` |
| 已能访问网页但 CLI 报未登录 | 站点隔离：Academy 走 TikTok SSO（i18n-tt / eu-ttp），与 cn / i18n-bd 隔离 | 同上，按目标 site 单独登录 |
| HTTP 4xx 但无认证错误 | `--base-url` 写成了控制台 URL 带 path / 末尾斜杠等 | 只填根 origin，例如 `https://oceancloud.tiktok-row.net` |
| 结果 `total > 0` 但 `rows` 为空 | 翻过头，`page * page_size > total` | 减小 `--page` 或检查筛选条件 |

完整 troubleshooting：[`../../troubleshooting.md`](../../troubleshooting.md)。

## References

- [`../../invocation.md`](../../invocation.md)：执行前缀、`--site` 站点表、JSON / HTTP debug 全局参数
- [`references/academy.md`](references/academy.md)：完整命令清单、参数语义、控制台对照
- [`../../troubleshooting.md`](../../troubleshooting.md)：通用错误处理

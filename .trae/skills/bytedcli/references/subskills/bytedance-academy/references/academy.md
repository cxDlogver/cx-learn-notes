# Academy

支撑文档：本文件给 SKILL.md 当详细参考，SKILL.md 已经覆盖最常用的调用方式与参数表，这里补充控制台对照、参数语义、翻页与示例细节。

## 平台定位

Academy 用于广告特征开发与管理。本 skill 覆盖 3 条检索能力：

- source_v2 数据源搜索（控制台 → Academy / Datasource）
- raw feature set group 搜索（控制台 → Academy / Feature Engineering / Offline）
- feature 搜索（控制台 → Academy / Feature Engineering / Online）

写操作和详情接口暂未接入。

## 命令清单

```bash
bytedcli academy source search ...
bytedcli academy raw-feature-set group search ...
bytedcli academy feature search ...
```

参数表见 [`SKILL.md`](../SKILL.md#commands)。本文件下面只补示例与控制台对照。

## 默认 host 与站点

- 默认 baseUrl：`https://oceancloud.tiktok-row.net`
- 也可用环境变量 `ACADEMY_BASE_URL` 覆盖；命令上 `--base-url` 优先级最高
- 因为默认 host 在 TikTok ROW，**几乎所有 Academy 调用都要带 `--site i18n-tt`**（或全局 `BYTEDCLI_CLOUD_SITE=i18n-tt`），否则 Titan / SSO 鉴权会落到默认站点导致 401

## source_v2 搜索

```bash
# 1) 按 source 名称 + owner 过滤
bytedcli --site i18n-tt academy source search \
  --source-name demo_source \
  --owner demo-user \
  --page 1 \
  --page-size 20

# 2) 按 datasource 类型 + 版本过滤，输出 JSON 给 agent
bytedcli --json --site i18n-tt academy source search \
  --datasource-type hive \
  --version v1 \
  --page 1 --page-size 50
```

控制台等价：进入 Academy `/academy/datasource/academy`，按 source 名称 / owner / version / type / datasource type 筛选并翻页。

## raw feature set group 搜索

```bash
# 1) keyword + owners 过滤
bytedcli --site i18n-tt academy raw-feature-set group search \
  --keyword demo-group \
  --owners demo-user \
  --page 1 \
  --page-size 20

# 2) 多 owner / 多 status 过滤（按后端约定的逗号分隔）
bytedcli --site i18n-tt academy raw-feature-set group search \
  --keyword demo \
  --owners alice,bob \
  --statuses active,deprecated
```

> `--owners` / `--statuses` / `--update-frequencies` / `--versions` 由 CLI 直接透传给后端，不做客户端拆分。如果不确定后端是否支持逗号分隔，先用单值跑一次确认。

控制台等价：进入 `/academy/feature-engineering/offline`，按 keyword / owners / statuses / update frequencies / versions / type 筛选并翻页。

## feature 搜索

```bash
# 1) keyword + 在线特征
bytedcli --site i18n-tt academy feature search \
  --keyword demo_feature \
  --page 1 \
  --page-size 20

# 2) 限定 fountain 离线研究 + 指定 ffe graph
bytedcli --site i18n-tt academy feature search \
  --keyword demo_feature \
  --is-fountain-offline-research true \
  --ffe-graph-id 123
```

参数取值约束：

- `--is-fountain-offline-research` 只接受字面量 `true` / `false`，否则 CLI 直接报 `Expected true or false.`
- `--ffe-graph-id` 必须是正整数，`0` / 负数 / 浮点会被拒

控制台等价：进入 `/academy/feature-engineering/online`，按 keyword / isFountainOfflineResearch / ffeGraphId 筛选。

## 翻页与 JSON 消费

`--json` 模式输出（成功）：

```jsonc
{
  "status": "success",
  "data": {
    "rows": [ /* 每行字段由后端决定，常见列：name/owner/status/version/type */ ],
    "total": 123,
    "page": 1,
    "page_size": 20
  }
}
```

翻页判断：`page * page_size < total` 时还有下一页，`--page` 自增重跑。

行字段不固定时的取值建议：

- name：`name` ↔ `sourceName` ↔ `featureName` ↔ `groupName`
- owner：`owner` ↔ `owners`
- status：`status` ↔ `statuses`
- updateFrequency：`updateFrequency` ↔ `updateFrequencies`
- datasourceType：`datasourceType` ↔ `dataSourceType`

## 使用建议

- 没特殊说明，先加 `--site i18n-tt`
- 给 agent / 脚本消费时，加全局 `--json`（必须放在 `academy` 前）
- 默认 host 不可用时再用 `--base-url`，且只填根 origin（不要带 path / 末尾斜杠）
- 当前首版以检索类命令为主，写操作和详情接口暂不覆盖；遇到需求先告知用户当前能力边界，再按需求扩 CLI

## 常见问题速查

完整版见 [`troubleshooting.md`](troubleshooting.md)，下面列三条 academy 高频项：

| 现象 | 处理 |
|------|------|
| 401 / UserNotLogin | `BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login` 后重试，命令上保留 `--site i18n-tt` |
| `Expected true or false.` | `--is-fountain-offline-research` 必须传 `true` / `false` 字面量 |
| `Expected a positive integer.` | `--ffe-graph-id` 必须是正整数 |

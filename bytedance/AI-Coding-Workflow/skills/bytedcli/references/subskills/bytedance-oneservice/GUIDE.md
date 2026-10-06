---
name: bytedance-oneservice
description: |
  Manage OneService resources via bytedcli: list/create/update/get/test APIs, manage API versions (create/update/copy/publish), grant PSM access, search/get/create logic tables. Use when user mentions OneService, OS.
---

# bytedcli OneService

> Detailed command parameters: `references/oneservice.md`
> Invocation guide: `../../invocation.md`
> Error code reference: `references/errors.md`
> API type rules (script/guide/origin/...): `references/api-types.md`
> Version semantics (is_published / draft / copy): `references/api-version-flow.md`

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- API 的列表 / 创建 / 更新 / 获取 / 测试 / 发布
- API 版本的列表 / 创建 / 更新 / 拷贝（4 步链）/ 发布
- API 服务 PSM 授权 / 已授权列表 / 创建 PSM 应用
- 项目的列表
- 文件夹的列表 / 创建（`api create` 可自动 ensure）
- 逻辑表搜索 / 详情

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

命令分 5 组：`oneservice project` / `oneservice folder` / `oneservice logic` / `oneservice api` / `oneservice auth`。

```bash
# project
bytedcli oneservice project list [--keyword <kw>]

# folder（项目内）
bytedcli oneservice folder list   --project-id <pid>
bytedcli oneservice folder create --project-id <pid> --name <folder>

# logic table（项目内）
bytedcli oneservice logic search --project-id <pid> --keyword dwd_user
bytedcli oneservice logic get    --logic-table-id <id>
bytedcli oneservice logic create --project-id <pid> --logic-table-name dwd_user \
  --type clickhouse --database demo_db --table dwd_user --cluster demo_cluster
bytedcli oneservice logic create --project-id <pid> --logic-table-name dwd_user_doris \
  --type doris --database demo_db --table dwd_user_doris --cluster demo_cluster \
  --namespace cn

# API CRUD
bytedcli oneservice api list   --project-id <pid> [--keyword <kw>]
bytedcli oneservice api get    --api-id <id> [--version <n>]
bytedcli oneservice api create --project-id <pid> --name "demo_query" --type script \
  --sql "SELECT user_id FROM dwd_user WHERE dt = #{dt}" --logic-table-name dwd_user
bytedcli oneservice api create --project-id <pid> --name "demo_optional" --type script \
  --sql "SELECT dt, value FROM t WHERE dt = #{dt} AND region IN #{regions}" \
  --param 'regions:string[]?' --return-field dt --return-field value
bytedcli oneservice api update --api-id <id> --name <name>           # 仅认 name/qps/cache-rate-limit/owner
bytedcli oneservice api test   --api-id <id> --request-data '{"dt":"2026-04-29"}' --dryrun

# API 版本生命周期
bytedcli oneservice api list-versions  --api-id <id>
bytedcli oneservice api create-version --api-id <id> --sql "..." [--allow-draft] [--param <name:type[?]>]
bytedcli oneservice api update-version --api-id <id> --version-id <vid> --sql "..." [--param <name:type[?]>]
bytedcli oneservice api copy-version   --api-id <id>                 # 4 步链：list→get→logic detail×N→create
bytedcli oneservice api publish        --api-id <id> --env ONLINE
bytedcli oneservice api unpublish      --api-id <id> --env BOE

# auth（PSM 授权）
bytedcli oneservice auth grant      --api-id <id> --psm my.service.psm
bytedcli oneservice auth list       --api-id <id>
bytedcli oneservice auth create-app --psm my.service.psm
```

## Command surface

| Group     | Verbs                                                                                                                     | 说明                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `project` | `list`                                                                                                                    | 列出当前用户有权限的项目                                                                          |
| `folder`  | `list`, `create`                                                                                                          | 项目内的文件夹管理                                                                                |
| `logic`   | `search`, `get`, `create`                                                                                                 | logic table 查找、详情和 ClickHouse / Doris 物理表绑定创建（API 系列命令用 `--logic-table-name` 传 name） |
| `api`     | `list`, `create`, `update`, `get`, `test`, `list-versions`, `create-version`, `update-version`, `copy-version`, `publish` | API CRUD + 版本生命周期（统一收敛到 `api` 这一组）                                                |
| `auth`    | `grant`, `list`, `create-app`                                                                                             | PSM 授权管理                                                                                      |

## Notes

- 全局 `--site` 仅支持：`cn`（默认）/ `i18n-tt`（SG cluster `dataleap-sg.tiktok-row.net`）/ `i18n-bd`（MYBD cluster `dataleap-mybd.byteintl.net`）；`boe` / `eu-ttp` / `us-ttp` 等其它站点**暂不支持**，会被显式拒绝并抛 `ONESERVICE_SITE_UNSUPPORTED`
- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json oneservice api list ...`）
- 遇到 `fetch failed` / 请求超时（常见于 SG/跨区链路偶发抖动）时，可用全局 `--http-timeout-ms <ms>` 临时加大单次请求超时（默认 20000），并配合 `--http-retry-count <n>` 增加重试次数。示例：`bytedcli --http-timeout-ms 60000 --site i18n-tt oneservice api test --api-id <id> --version <version>`
- `api create` 的 `--type` 必须用字面枚举 `script|guide|origin|workflow|http|httpscript`，旧的数字 `--query-type` 仅内部使用
- `api create` 支持 `--project-name` 代替 `--project-id`，内部走 `listProjects` 解析；找不到时抛 `ONESERVICE_PROJECT_NOT_FOUND`。同时 `--folder <name>` 会自动 ensure：先调 `listFolders`，缺失则 `createFolder`，再下发创建
- `api create --type script` 在 SQL 含 `#{name}` 占位符时会自动填充 `filter_fields`，默认 `type=string,isRequired=true`，并按 SELECT 列推断 `return_fields`；可用 `--param <name:type[?]>` 覆盖 SQL 参数类型和必填性，例如 `--param 'regions:string[]?'` / `--param 'budget_source_ids:int[]'`
- `filter_fields` 支持完整 schema 覆盖：`--filter-field-json` / `--filter-fields-file`；JSON object/array 中未知字段会原样透传。`return_fields` 后端只接受 string 数组，支持 `--return-field` 和 JSON string/array，不支持 return field object schema。默认 filter 字段必须匹配 SQL `#{name}`，只有 raw filter schema 可用 `--allow-extra-filter-fields` 显式放行非占位符字段
- `api test --json` 会保留原始 `result`，并额外输出固定结构的 `normalized_result`：`rendered_sql`、`dryrun_sql`、`fields`、`rows`、`data_count`、`time_cost`、`cluster_name`、`query_id`；缺失字段为 `null`，`rows` 内部的 `null` 会原样保留，便于排查“后端返回 0 / 无数据 / 查询没命中”
- `api create` / `api create-version` / `api update-version` 的 `--param` 只接受 SQL 中实际出现的 `#{name}`；raw filter schema 默认也必须匹配 SQL，占位符缺失、同名冲突、JSON 非法或字段 schema 非法会抛 `ONESERVICE_SQL_PARAM_OVERRIDE_INVALID`
- `--type origin` 不存 SQL，调用方在 `api test` 时通过 `--request-data '{"Sql":"SELECT ..."}'`（大写 S）传入；origin API 不支持 SQL field override flags
- `api update` 后端只认 4 个字段：`--name` / `--qps`（字符串）/ `--cache-rate-limit` / `--owner`，其它字段静默丢弃
- `api create-version` 是非幂等调用，收到含 `version_id` 的响应即视为成功，不要重试。handler 默认带草稿 guard，命中 `not_publish` 版本时抛 `ONESERVICE_API_VERSION_DRAFT_EXISTS`；用户明确确认后用 `--allow-draft` 跳过
- `api update-version` 必须同时传 `--version-id` 和 `--api-id`，handler 据此自动 `is_published` 自检；命中已发布版本抛 `ONESERVICE_API_VERSION_PUBLISHED`，恢复路径是用相同 flags 调 `api create-version`，**不要**先 `api unpublish` 下线再改
- `api copy-version` 是 4 步链编排（`list-versions → get → logic detail × N → create-version`），用户只需一条命令即可把已有版本完整克隆为新草稿
- `api create` 名称冲突（`ONESERVICE_API_NAME_CONFLICT` / 后端 1219）时停止重试，向用户索取新 `--name`，不要自动加后缀
- `auth grant` 成功时返回 `next_action.kind = VERIFY_AUTH_LIST`，agent 应紧接着调 `oneservice auth list --api-id <id>` 确认 PSM 落入授权列表
- `auth grant` 命中 `ONESERVICE_AUTH_PSM_NOT_REGISTERED`（后端 `code=-1` + `"no app found"`）时，PSM 在 OneService App 表里未注册。agent **必须先和用户确认**是否注册该 PSM，确认后按 `error.details.recoveryCommands` 串 `auth create-app --psm <psm>` + 重试 `auth grant`，**不要**静默自动注册
- `logic search` 命中多结果时返回 `next_action.kind = MULTIPLE_RESULTS_SELECT_ONE`，应将全部结果展示给用户由其选择，禁止自动选第一条
- `logic create` 支持 `--type clickhouse` 和 `--type doris`，把已有物理表绑定为 OneService 逻辑表；Doris 物理表必须额外传 `--namespace <dorisNamespace>`；当前 CN Doris namespace 使用 `cn`；`--project-id` / `--folder-id` 会按后端要求作为 numeric int64 发送
- 接 OneService 这类 int64 ID 时，CLI 内部仍应把用户输入按 string 保存到最后一跳；如果后端硬要求 JSON number，只能用原始 JSON 字符串拼接数字字面量，测试也要避免 `JSON.parse` 这些字段导致精度截断
- 本 CLI **不支持**创建 Guide 类型（需要 `filter_fields[]`）、Nuwa 类型（需要 `nuwa_config`）API 以及自定义 `cache_strategy`/`cache_ttl`；本期也**不支持** Nuwa 指标元数据浏览。这些场景请走 OneService IDE

## Error reference

| Code                                    | Trigger                                                                                                                                                                                 | Recovery                                                                                                                                                                |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ONESERVICE_AUTH_EXPIRED`               | Token expired                                                                                                                                                                           | `bytedcli auth login` for the active site                                                                                                                               |
| `ONESERVICE_API_NAME_CONFLICT`          | API name already exists                                                                                                                                                                 | Ask user for a new `--name`; no auto-retry                                                                                                                              |
| `ONESERVICE_API_VERSION_DRAFT_EXISTS`   | `create-version` while draft exists                                                                                                                                                     | `update-version` the existing draft, or pass `--allow-draft` after explicit user confirmation                                                                           |
| `ONESERVICE_API_VERSION_PUBLISHED`      | `update-version` on published version                                                                                                                                                   | Call `create-version` instead; do not publish-offline first                                                                                                             |
| `ONESERVICE_API_TEST_SQL_REQUIRED`      | `api test` on origin API without SQL                                                                                                                                                    | Pass `--request-data '{"Sql":"SELECT ..."}'`                                                                                                                            |
| `ONESERVICE_API_TEST_PARAMS_MISSING`    | `api test` missing required params (backend listed them in `missing_params`)                                                                                                            | Read `error.details.missingParams`, fill in `--request-data`, retry                                                                                                     |
| `ONESERVICE_API_BUILD_FAILED`           | `create-version` / `update-version` build/validation failure (logic table unresolved, invalid SQL, malformed filter_fields). Backend's real reason is in `error.message` / `error.hint` | Read `error.message` and `error.details.backendMessage`; for `logic table not found` run `oneservice logic search` to verify the table; for SQL issues fix in IDE first |
| `ONESERVICE_SQL_PARAM_OVERRIDE_INVALID` | SQL field override flags are invalid: malformed `--param`, invalid JSON/file schema, duplicate field names, or filter fields not present in SQL `#{name}` placeholders                  | Fix `--param` / filter schema / return schema inputs; use `--allow-extra-filter-fields` only for intentional raw filter fields that are not SQL placeholders            |
| `ONESERVICE_AUTH_PSM_NOT_REGISTERED`    | `auth grant` for a PSM not yet in OneService App table                                                                                                                                  | Confirm with user, then run `auth create-app --psm <psm>`, then retry `auth grant`                                                                                      |
| `ONESERVICE_PERMISSION_DENIED`          | No project_admin / query_develop permission                                                                                                                                             | Ask user to apply for the missing permission                                                                                                                            |

Full table: `references/errors.md`.

## References

- `references/oneservice.md` — full command parameters and request body fields
- `../../invocation.md` — bytedcli invocation patterns and global flags
- `references/api-types.md` — script / guide / origin / workflow / http / httpscript rules
- `references/api-version-flow.md` — version lifecycle, copy semantics, draft guard
- `references/errors.md` — full error code list with examples

# Lego 命令参考

> 本文档基于 bytedcli 当前 `lego` 命令实现，列出每个子命令的参数、行为与 JSON 字段，以及服务端枚举。
> 所有示例里的 `--site` 为全局参数（放在 `lego` 前），`--region` 为 `lego` 子选项（放在 `lego` 后、子命令前）。

## Site 与 Region

`--site` 选控制面 domain；`--region` 选该 site 下的 vregion，解析后作为 `x-bcgw-vregion` header 下发。

### 站点（`--site`）

| 规范 site  | webOrigin                            | 常见别名                                                          |
| ---------- | ------------------------------------ | ----------------------------------------------------------------- |
| `cn`       | `https://cloud.bytedance.net`        | `prod`、`online`                                                  |
| `boe`      | `https://cloud-boe.bytedance.net`    | —                                                                 |
| `i18n-bd`  | `https://cloud.byteintl.net`         | `i18n`                                                            |
| `i18n-tt`  | `https://cloud.tiktok-row.net`       | `i18ntt`、`row`、`tiktok-row`                                     |
| `us-ttp`   | `https://cloud.tiktok-us.net`        | `usttp`、`ttp-us`、`ttp-us-limited`、`us-ttp-bdee`、`us-ttp-usts` |
| `eu-ttp`   | `https://bc-iedt-gw.tiktok-eu.net`   | `euttp`、`ttp-eu`                                                 |

> `us-ttp-bdee` / `us-ttp-usts` 不是独立 site，只是 `us-ttp` 的别名。
> Lego 不支持 `boe-i18n`：全局 `--site boe-i18n` / `boei18n` 或 Lego `--region boe_i18n` 都会报 `LEGO_INPUT_ERROR`。

### Region（`--region`，CLI 输入 → 后端 header 值）

| site       | 是否必填 `--region` | CLI 输入值 → 后端值                                                                                                           |
| ---------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `cn`       | **必填**            | `online → online`，`sinf → sinf`                                                                                              |
| `boe`      | 可省略              | `boe → boe`                                                                                                                   |
| `i18n-bd`  | **必填**            | `us_compliance → USCompliance`，`non_tt_sg → Non-TT-SG`，`non_tt_us → Non-TT-US`，`sinf_i18n → sinfi18n`，`us_ttp3 → US-TTP3` |
| `i18n-tt`  | **必填**            | `sg → sg`，`us → us`，`my_compliance → MyCompliance`                                                                          |
| `us-ttp`   | 可省略              | `ttp_us_limited → ttp-us-limited`                                                                                             |
| `eu-ttp`   | 可省略              | `ttp_eu → ttp-eu`                                                                                                             |

- 多 region 的 site（`cn` / `i18n-bd` / `i18n-tt`）省略 `--region` 会报 `LEGO_INPUT_ERROR`，错误 `hint` 会列出该 site 的允许值。
- 非法 `--region` 同样报 `LEGO_INPUT_ERROR`。
- 运行时可 `bytedcli lego --help` 查看 Regions 段。

## 认证

Lego 复用 ByteCloud SSO/JWT。请求头会带 `x-jwt-token` 与 `x-bcgw-vregion`。

```bash
bytedcli auth login
```

- 认证失败抛 `LEGO_AUTH_REQUIRED`，`hint` 指引 `bytedcli auth login`。
- 站点认证隔离按 SSO 环境生效：`i18n-tt`、`eu-ttp`（TikTok SSO）需单独登录；`cn` / `i18n-bd`（ByteDance SSO）通常共享登录态。

> Lego 不支持自定义 base URL / web origin 覆盖；请求目标严格由内置站点表解析，不接受任何环境变量 Host 覆盖。

## 命令

### plugin get

查询插件详情。

```bash
bytedcli --site cn lego --region online plugin get --name demo_plugin
```

| 参数            | 必填 | 说明   |
| --------------- | ---- | ------ |
| `--name <name>` | 是   | 插件名 |

JSON：`data.plugin`，含 `plugin_name`、`scm_id`、`kind`、`is_adaptive`、`is_multi_ver`、`status`、`language`、`default_adaptive_run_mode`、`is_enable_category_pipeline`。

> `plugin version list` 不需要手动传 SCM id；service 层会用这里的 `scm_id` 自动作为请求参数。

### plugin register

注册新插件（写操作）。默认 dry-run 预览；确认后加 `--yes` 执行。

```bash
bytedcli --site cn lego --region online plugin register \
  --plugin-name demo_plugin --scm-path bytedance/demo/demo_plugin \
  --plugin-type mul_ver_native --owners alice --owners bob --parent-id 123 \
  --language go --is-adaptive
```

| 参数                                        | 必填 | 说明                                                                                                 |
| ------------------------------------------- | ---- | ---------------------------------------------------------------------------------------------------- |
| `--plugin-name <pluginName>`                | 是   | 插件名                                                                                               |
| `--scm-path <scmPath>`                      | 是   | SCM 仓库路径（非空、不含空格）                                                                       |
| `--plugin-type <ipc\|json\|mul_ver_native>` | 是   | `ipc`=IPCKind（IDL 模式）、`json`=JsonKind（JSON 模式）、`mul_ver_native`=MulVerNative（多版本插件） |
| `--owners <owner...>`                       | 是   | 插件 owner，可重复传入多个                                                                           |
| `--parent-id <parentId>`                    | 是   | 服务树父节点 id（psm tree）                                                                          |
| `--language <lang>`                         | 是   | `go \| java \| node \| python \| rust \| cpp`                                                        |
| `--category-list <category...>`             | 否   | 项目类目，可重复                                                                                     |
| `--is-adaptive`                             | 否   | 标记为自适应插件                                                                                     |
| `--default-adaptive-run-mode <ipc\|native>` | 否   | 默认自适应运行模式：`ipc`=IPC、`native`=Native                                                       |
| `-y, --yes`                                 | 否   | 执行 live 注册                                                                                       |

行为：未传 `--yes` 时默认 dry-run，只返回请求体不执行。JSON：默认 dry-run → `{ dry_run: true, request }`；`--yes` → `{ message }`。

### plugin compile

创建编译任务（写操作）。默认 dry-run 预览；确认后加 `--yes` 执行。

```bash
bytedcli --site cn lego --region online plugin compile \
  --plugin-name demo_plugin --version-type offline --branch master
```

| 参数                         | 必填   | 说明                                          |
| ---------------------------- | ------ | --------------------------------------------- |
| `--plugin-name <pluginName>` | 是     | 插件名                                        |
| `--version-type <type>`      | 是     | 版本类型：`offline \| online \| test`         |
| `--branch <branch>`          | 二选一 | Git 分支                                      |
| `--commit-hash <commitHash>` | 二选一 | Git commit hash（与 `--branch` 至少提供一个） |
| `--multi-arch`               | 否     | 开启多架构编译                                |
| `--ipc-only`                 | 否     | 开启 ipc_only                                 |
| `--user-env <json>`          | 否     | 编译时用到的环境变量（JSON 字符串 map）      |
| `-y, --yes`                  | 否     | 执行 live 编译                                |

`--user-env` 示例只写单行内联 JSON：

```bash
bytedcli --site cn lego --region online plugin compile \
  --plugin-name demo_plugin --version-type offline --branch master \
  --user-env '{"region":"sg","mode":"fast"}'
```

行为：未传 `--yes` 时默认 dry-run，只返回请求体不执行。JSON：默认 dry-run → `{ dry_run: true, request }`（含 `plugin`、`branch`、`commitHash`、`versionType`、`multiArch`、`ipcOnly`、`userEnv`）；`--yes` → `{ version }`。

编译是异步任务，用 `plugin compile-detail get` 轮询状态（见 ScmBuildStatus 终态）。

### plugin version list

列出编译版本。

```bash
bytedcli --site cn lego --region online plugin version list --plugin-name demo_plugin
```

| 参数                           | 必填 | 说明                                                 |
| ------------------------------ | ---- | ---------------------------------------------------- |
| `--plugin-name <pluginName>`   | 是   | 插件名                                               |
| `--page <page>`                | 否   | 页码，默认 `1`                                       |
| `--page-size <pageSize>`       | 否   | 每页条数，默认 `20`                                  |
| `--branch <branch>`            | 否   | 按分支过滤                                           |
| `--commit-hash <commitHash>`   | 否   | 按 commit 过滤                                       |
| `--version-key <versionKey>`   | 否   | 按版本关键词过滤                                     |
| `--operator <operator>`        | 否   | 按操作者过滤                                         |
| `--version-type <versionType>` | 否   | 按版本类型过滤                                       |

行为：service 层先用 `--plugin-name` 拉插件详情，既判断 multi-version / ipc-only 分支，也用详情里的 `scm_id` 作为请求参数，调用方无需也无法手动传入。JSON：`{ count, versions, kind, ipc_only, online_version, version_regions, page, page_size }`。普通插件与多版本插件走不同的后端 endpoint，但 CLI 参数一致。

### plugin compile-detail get

查询某个编译版本详情。

```bash
bytedcli --site cn lego --region online plugin compile-detail get --plugin-name demo_plugin --version 1.0.0.1
```

| 参数                         | 必填 | 说明       |
| ---------------------------- | ---- | ---------- |
| `--plugin-name <pluginName>` | 是   | 插件名     |
| `--version <version>`        | 是   | 编译版本号 |

JSON：`data.detail`，含 `status`、`status_arm`（字符串，见 ScmBuildStatus）、`branch_name`、`commit_hash`、`type`、`create_user`、`create_time` 等。

### plugin commit list

```bash
bytedcli --site cn lego --region online plugin commit list --plugin-name demo_plugin
```

| 参数                         | 必填 | 说明   |
| ---------------------------- | ---- | ------ |
| `--plugin-name <pluginName>` | 是   | 插件名 |

JSON：`{ items, count }`，每个 item 含 `hash`、`message`。

### plugin branch list

```bash
bytedcli --site cn lego --region online plugin branch list --plugin-name demo_plugin --keyword main
```

| 参数                         | 必填 | 说明           |
| ---------------------------- | ---- | -------------- |
| `--plugin-name <pluginName>` | 是   | 插件名         |
| `--keyword <keyword>`        | 是   | 分支关键词过滤 |

JSON：`{ items, count }`，`items` 为分支名字符串数组。

### pipeline list

列出插件的发布流水线。

```bash
bytedcli --site cn lego --region online pipeline list --plugin-name demo_plugin
```

| 参数                         | 必填 | 说明                                                                                                                                         |
| ---------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `--plugin-name <pluginName>` | 是   | 插件名                                                                                                                                       |
| `--is-used-publish`          | 否   | 仅显示用于发布的流水线                                                                                                                       |
| `--category-name <name>`     | 否   | 按类目名过滤，可重复                                                                                                                         |
| `--pipeline-kind <kind>`     | 否   | 按流水线类型过滤（语义值：`plugin_publish \| conf_publish \| adaptive_switch_init_phase \| adaptive_switch_runtime_phase`，见 PipelineKind） |

> 后端不支持分页，所有匹配的流水线一次性返回。

JSON：`{ items, total }`，每个 item 含 `id`、`name`、`category_name`、`region`、`pipeline_kind`。创单选 `pipeline_kind = 1`（PluginPublish 插件发布）的流水线。

### pipeline confirm

人工确认发布工单的当前步骤（写操作）。

```bash
bytedcli --site cn lego --region online pipeline confirm --order-id 12345
bytedcli --site cn lego --region online pipeline confirm --order-id 12345 --yes
```

| 参数                   | 必填 | 说明                                                              |
| ---------------------- | ---- | ----------------------------------------------------------------- |
| `--order-id <orderId>` | 是   | 工单 id                                                           |
| `-y, --yes`            | 否   | live confirm 必需；agent / 脚本 / 非 TTY 场景在检查工单状态后使用 |

行为：

1. 先读 `order get` 拿 `region` / `current_flow_index` / `current_step_index`（这三个缺失才会抛 `LEGO_ORDER_DETAIL_MISSING_FIELD`），再用 `pipeline step-info get` 取当前步骤作为 `confirm_target`。`plugin_name` / `pipeline_id` 只用于拼网页兜底地址，缺失时不会单独报字段缺失。
2. **不传 `--yes`** 时返回 dry-run 预览结果，包含 `dry_run: true`、`confirm_target`、`confirmed: false`，不会调用写接口；agent 必须用 `AskUserQuestion` 让用户确认 confirm target 再补 `--yes`，不能自动重试。
3. **传 `--yes`** 时调用后端 `manualConfirm`：成功 → `confirmed: true`；后端拒绝 → 命令失败并优先保留上游 `AppError` 的 `code` / `hint`，JSON error 会补 `details.error_message`；`details.web_url` 仅 best-effort，只有拿得到 `plugin_name` 时才会附带网页兜底地址。只有上游抛的不是 `AppError` 时，才兜底成 `LEGO_CONFIRM_ORDER_FAILED`。
4. 任意 site / region 都可走 CLI live confirm，不存在“仅 boe 泳道才允许”的限制。

JSON：dry-run / live 成功 → `{ dry_run, order_id, region, current_flow_index, current_step_index, confirm_target: { flow_index, step_index, step }, confirmed, web_url }`；其中成功返回里的 `web_url` 也是 best-effort，可能缺失。后端拒绝 live 写入时返回 JSON error：若上游是 `AppError`，则保留原始 `code` / `hint`（例如 `LEGO_ENVELOPE_ERROR`、`LEGO_AUTH_REQUIRED`）；若不是，才兜底为 `LEGO_CONFIRM_ORDER_FAILED`。`details.error_message` 为后端 / 上游错误信息，`details.web_url` 仅在能生成网页兜底地址时出现。

### pipeline step-info get

查询发布工单指定步骤详情。

```bash
bytedcli --site cn lego --region online pipeline step-info get --order-id 12345 --flow-index 0 --step-index 0
```

| 参数                       | 必填 | 说明      |
| -------------------------- | ---- | --------- |
| `--order-id <orderId>`     | 是   | 工单 id   |
| `--flow-index <flowIndex>` | 是   | flow 下标 |
| `--step-index <stepIndex>` | 是   | step 下标 |

JSON：`data.step`，含 `id`、`name`、`type`（见 StepType）、`task_status`、`check_task_status`（见 CheckTaskStatus）、`operator`、`assignees`、`create_time`、`process_end_time`、`process_second_duration` 等。

> 步骤详情命令在 `pipeline` 组下，不是 `order step-info get`（旧文档写错了）。

### order create

创建发布工单（写操作）。默认 dry-run 预览；确认后加 `--yes` 执行。

```bash
bytedcli --site cn lego --region online order create \
  --plugin-name demo_plugin --version 1.0.0.1 --scope-name 全量发布 --order-type hot_upgrade
```

| 参数                             | 必填 | 说明                                                                |
| -------------------------------- | ---- | ------------------------------------------------------------------- |
| `--plugin-name <pluginName>`     | 是   | 插件名                                                              |
| `--version <version>`            | 是   | 编译产物版本（**不是 `--commit-tag`**）                             |
| `--scope-name <scopeName>`       | 是   | 发布域名；`全量发布` 为全量发布内置值，或 `scope list` 返回的任意值 |
| `--order-type <orderType>`       | 是   | 工单类型，当前仅支持 `hot_upgrade`（OrderTypeHotUpgrade）           |
| `--pipeline-id <pipelineId>`     | 否   | 流水线 id；泳道发布可不传                                           |
| `--ready-sec <readySec>`         | 否   | ready 秒数                                                          |
| `--surge-percent <surgePercent>` | 否   | surge 百分比，整数 `1`-`100`（单位 `%`）                            |
| `--enable-go-version-cleanup`    | 否   | 开启 go version 清理                                                |
| `--cleanup-pipeline-id <id>`     | 否   | 清理流水线 id                                                       |
| `--publish-parameters <json>`    | 否   | 发布参数 JSON 对象（value 必须为字符串）                            |
| `-y, --yes`                      | 否   | 执行 live 创单                                                      |

`--publish-parameters` 示例只写单行内联 JSON：

```bash
bytedcli --site cn lego --region online order create \
  --plugin-name demo_plugin --version 1.0.0.1 --scope-name 全量发布 --order-type hot_upgrade \
  --publish-parameters '{"lane":"lane-a","branch":"main"}'
```

行为与 `--version` 语义：

- 未传 `--yes` 时默认 dry-run，只返回请求体不执行。
- service 层读 `plugin get`，按 `isMultiVer = (kind === 3 MulVerNative || is_adaptive === true)` 决定：多版本插件把 `--version` 作为 `commit_tag` 下发，普通插件作为 `version` 下发。调用方统一只传 `--version`。
- `--order-type` 传非 `hot_upgrade` 的值会在参数解析阶段被拒。

JSON：默认 dry-run → `{ dry_run: true, request }`（含 `pipelineId`、`pluginName`、`version`、`publishScopeName`、`orderType` 等）；`--yes` → `{ order_id, web_url? }`。

### order list

列出某插件的发布工单（PublishHistory）。

```bash
bytedcli --site cn lego --region online order list --plugin-name demo_plugin
```

| 参数                               | 必填 | 说明                                                                                                                                                                                         |
| ---------------------------------- | ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--plugin-name <pluginName>`       | 是   | 插件名                                                                                                                                                                                       |
| `--page <page>`                    | 否   | 页码，默认 `1`                                                                                                                                                                               |
| `--page-size <pageSize>`           | 否   | 每页条数，默认 `20`                                                                                                                                                                          |
| `--start <start>`                  | 否   | 起始日期，如 `2026-01-01`                                                                                                                                                                    |
| `--end <end>`                      | 否   | 结束日期，如 `2026-01-31`                                                                                                                                                                    |
| `--order-type <orderType>`         | 否   | 按单一工单类型过滤（语义值：`hot_upgrade \| conf_upgrade \| adaptive_switch_plugin_conf \| adaptive_switch_psm_conf`）                                                                       |
| `--target-version <targetVersion>` | 否   | 按目标版本（scm_version 或 commit_tag）过滤                                                                                                                                                  |
| `--create-user <createUser>`       | 否   | 按创建者过滤                                                                                                                                                                                 |
| `--order-id <orderId>`             | 否   | 按工单 id 过滤                                                                                                                                                                               |
| `--lane <lane>`                    | 否   | 按泳道过滤                                                                                                                                                                                   |
| `--publish-scope <publishScope>`   | 否   | 按发布域过滤                                                                                                                                                                                 |
| `--order-status-list <status>`     | 否   | 按工单状态列表过滤（语义值：`off \| finish \| online \| cancel \| ready \| wait \| building \| canceling \| suspend`，多次传入，如 `--order-status-list finish --order-status-list online`） |

JSON：`{ items, count, page, page_size }`。文本表格列：ID / Commit Tag / Status / Order Type / Region / Scope / Lane / Create Time。

### order get

查询发布工单详情。

```bash
bytedcli --site cn lego --region online order get --id 12345
```

| 参数             | 必填 | 说明    |
| ---------------- | ---- | ------- |
| `--id <orderId>` | 是   | 工单 id |

JSON：`data.order`，含 `id`、`plugin_name`、`pipeline_name`、`region`、`origin_version` / `origin_commit_tag`、`target_version` / `target_commit_tag`、`status`、`order_type`、`current_flow_index`、`current_step_index`、`flow_info`（含每个 flow 的 `type` 与 steps）。文本模式对 version 做 fallback：优先 `*_version`，为空再用 `*_commit_tag`。

### scope list

列出发布域。

```bash
bytedcli --site cn lego --region online scope list --plugin-name demo_plugin
```

| 参数                         | 必填 | 说明                |
| ---------------------------- | ---- | ------------------- |
| `--plugin-name <pluginName>` | 是   | 插件名              |
| `--page <page>`              | 否   | 页码，默认 `1`      |
| `--page-size <pageSize>`     | 否   | 每页条数，默认 `20` |
| `--scope-name <scopeName>`   | 否   | 按 scope 名过滤     |
| `--psm <psm>`                | 否   | 按 PSM 过滤         |

JSON：`{ items, count, offset, limit }`，每个 item 含 `scope_name`、`plugin_name`、`psm`、`region`。

> 分页契约说明：尽管命令对外暴露 `--page` / `--page-size`，`scope list --json` 为兼容既有自动化，仍只回显 `offset` / `limit`，不会额外返回 `page` / `page_size`。调用方如需页码语义，应以自身传入的请求参数为准。
>
> `全量发布` 是内置发布域，不出现在 `scope list` 接口返回或 JSON `items` 里，但可直接用于 `order create --scope-name 全量发布`。

## 枚举

> 这些枚举仅用于文本输出展示（原始值 + 标签）；`--json` 输出保留原始数值。

### PublishStatus（工单 / 发布状态 `status`）

CLI 过滤参数 `--order-status-list` 使用语义值，不直接接收后端数字编码。

| 值  | 含义                          | 是否终态                           |
| --- | ----------------------------- | ---------------------------------- |
| `0` | PublishOff 创建未发布         | 否                                 |
| `1` | PublishFinish 发布完成        | **是（最终完成）**                 |
| `2` | PublishOnline 灰度中          | 否                                 |
| `3` | PublishCancel 发布取消        | 是                                 |
| `4` | PublishReady 灰度完成准备上线 | **否（收尾中间态，别误判为完成）** |
| `5` | PublishWait 等待下一步        | 否                                 |
| `6` | PublishBuilding 准备灰度环境  | 否                                 |
| `7` | PublishCanceling 回滚中       | 否（流程已终止方向）               |
| `8` | PublishSuspend 暂停中         | 否                                 |

### StepType（步骤类型 `type`）

| 值  | 含义                                     |
| --- | ---------------------------------------- |
| `1` | Lane 泳道                                |
| `2` | Canary 小流量                            |
| `3` | SingleDC 单机房                          |
| `4` | Percentage 灰度百分比                    |
| `5` | **ManualConfirm 人工确认（需 confirm）** |
| `6` | PublishCheck 发布检测                    |
| `7` | Rebuild 重启节点                         |
| `8` | **Audit 审核节点（需人工）**             |

> 步骤 `type in {5, 8}` 时停止自动轮询，转人工。

### CheckTaskStatus（发布检测 `check_task_status`）

| 值   | 含义                             |
| ---- | -------------------------------- |
| `1`  | StartCheck 创建                  |
| `2`  | Checking 检测中                  |
| `3`  | CheckSuccess 检测成功            |
| `4`  | CheckFail 检测失败               |
| `5`  | CommitCheckFail 提交检测任务失败 |
| `6`  | SkipCheck 跳过检测               |
| `7`  | CheckWarning 检测告警            |
| `8`  | ConfirmWarning 告警已确认        |
| `9`  | ConfirmFailed 检测失败已确认     |
| `10` | CommitPending 等待提交           |

### TaskStatus（步骤任务 `task_status`）

| 值  | 含义               |
| --- | ------------------ |
| `0` | TaskRunning 进行中 |
| `1` | TaskPassed 已通过  |
| `2` | TaskFailed 已失败  |

### PipelineKind（流水线类型 `pipeline_kind`）

| 值  | 含义                                        |
| --- | ------------------------------------------- |
| `1` | PluginPublish 插件发布（创单选这个）        |
| `2` | ConfPublish 配置发布                        |
| `3` | AdaptiveSwitchInitPhase 自适应切换初始化    |
| `4` | AdaptiveSwitchRuntimePhase 自适应切换运行时 |

> `pipeline list --pipeline-kind` 取值 `plugin_publish` / `conf_publish` / `adaptive_switch_init_phase` / `adaptive_switch_runtime_phase` 分别对应 1/2/3/4。

### FlowType（flow 类型 `type`）

| 值  | 含义                 |
| --- | -------------------- |
| `1` | WhiteList 白名单PSM  |
| `2` | Level 服务等级       |
| `3` | All 全量发布         |
| `4` | BlackList 黑名单PSM  |
| `5` | Dimension 自定义维度 |

### PluginKind（插件类型 `kind`）

| 值  | 含义                    |
| --- | ----------------------- |
| `0` | NativeKind 原生模式     |
| `1` | IPCKind IDL接口模式     |
| `2` | JsonKind JSON模式       |
| `3` | MulVerNative 多版本插件 |

> `kind = 3` 或 `is_adaptive = true` 视为多版本插件（`order create` 的 `--version` 会按 `commit_tag` 下发）。
> `plugin register --plugin-type` 取值 `ipc` / `json` / `mul_ver_native` 分别对应 IPCKind / JsonKind / MulVerNative。

### OrderType（工单类型 `order_type`）

| 值  | 含义                                                        |
| --- | ----------------------------------------------------------- |
| `1` | OrderTypeHotUpgrade 热升级（`order create` 当前仅支持此值） |
| `2` | OrderTypeConfUpgrade 配置升级                               |
| `3` | OrderTypeAdaptiveSwitchPluginConfUpdate 自适应切换插件配置  |
| `4` | OrderTypeAdaptiveSwitchPSMConfUpdate 自适应切换PSM配置      |

> `order create --order-type` 当前仅支持 `hot_upgrade`；`order list --order-type` 取值 `hot_upgrade` / `conf_upgrade` / `adaptive_switch_plugin_conf` / `adaptive_switch_psm_conf` 分别对应 1/2/3/4。

### AdaptiveRunMode（自适应运行模式）

| 值  | 含义            |
| --- | --------------- |
| `1` | IPC IPC模式     |
| `2` | Native 原生模式 |

> `plugin register --default-adaptive-run-mode` 取值 `ipc` / `native` 分别对应 1/2。

### PluginStatus（插件 `status`）

| 值  | 含义                  |
| --- | --------------------- |
| `0` | StatusOff 未上线      |
| `1` | StatusOnline 上线中   |
| `2` | StatusCancel 上线取消 |
| `3` | StatusFinish 上线完成 |

### ScmBuildStatus（编译版本 `status` / `status_arm`，字符串）

| 值             | 含义                | 是否终态 |
| -------------- | ------------------- | -------- |
| `build_ok`     | 编译成功            | **是**   |
| `build_failed` | 编译失败            | **是**   |
| `prepare`      | 准备中              | 否       |
| `building`     | 编译中              | 否       |
| `queue`        | 排队中              | 否       |
| `not_build`    | 未编译              | 否       |
| `wait`         | 等待（lego 自有态） | 否       |

> 轮询 `plugin compile-detail get` 时，只有 `build_ok` / `build_failed` 是终态，其余继续等待。

## 错误码

| code                              | 触发场景                                                             | 处理                                   |
| --------------------------------- | -------------------------------------------------------------------- | -------------------------------------- |
| `LEGO_INPUT_ERROR`                | 多 region 站点缺 `--region` / 非法 `--region` 等                     | 按 `hint` 补正确参数                   |
| `LEGO_AUTH_REQUIRED`              | 获取 JWT / 鉴权失败                                                  | `bytedcli auth login`（注意目标 site） |
| `LEGO_ENVELOPE_ERROR`             | 后端业务报错                                                         | 检查参数与工单状态，按 `hint` 重查     |
| `LEGO_ORDER_DETAIL_MISSING_FIELD` | 工单详情缺关键字段                                                   | 按 `hint` 重新查询工单详情             |
| `LEGO_INTERNAL_ERROR`             | dry-run 请求体缺失等内部异常                                         | 重试；持续失败检查实现                 |

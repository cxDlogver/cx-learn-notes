# XPA commands 参数详表

> 写命令一律 **dry-run by default**(不带 `--yes` 即打印 `[dry-run] ...` 后退出 0),加 `--yes` 才真发。没有 `--dry-run` flag、没有交互式 y/N 确认;CI 与 TTY 行为一致。

## 全局 XPA 选项

> **位置(commander 限制)**: 这组 `--xpa-*` 挂在 xpa 父命令上,**只能写在 `bytedcli xpa <这里> <subcmd>` 之间**。写在 `bytedcli` 后 `xpa` 前 / 叶子命令后都会 `error: unknown option --xpa-env`。位置不便时用对应环境变量(每个 flag 都有等价的 `BYTEDCLI_XPA_*` 环境变量)。

| 选项                  | 说明                                                                                                                                                                                 |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--xpa-env <env>`     | XPA 业务环境：`boe`/`ppe`/`prod`（默认 `prod`）。同 `BYTEDCLI_XPA_ENV` 环境变量。**与 bytedcli 顶层 `--site` 互不影响**:`--site` 只切 ByteCloud SSO 区域,`--xpa-env` 才切 XPA 网关。 |
| `--xpa-tt-env <lane>` | 泳道 header `x-tt-env`，空 = 不带（基准环境）。同 `BYTEDCLI_XPA_TT_ENV`。                                                                                                            |

其他覆盖项（多数 hideHelp,通常走环境变量）：`--xpa-base-url` / `BYTEDCLI_XPA_BASE_URL`、`--xpa-path-prefix` / `BYTEDCLI_XPA_PATH_PREFIX`、`--xpa-use-ppe` / `BYTEDCLI_XPA_USE_PPE`、`--xpa-http-timeout-ms` / `BYTEDCLI_XPA_HTTP_TIMEOUT_MS`、`BYTEDCLI_XPA_CLIENT_TYPE`。

## auth

| 命令              | 说明                                                         |
| ----------------- | ------------------------------------------------------------ |
| `xpa auth login`  | 触发 ByteCloud JWT → exchange → 落盘；复用 bytedcli 登录态。 |
| `xpa auth status` | 显示本地凭据（脱敏），不发请求。                             |
| `xpa auth logout` | 清除本地 XPA 凭据。                                          |

## whoami / system

| 命令                 | 选项         | 说明                             |
| -------------------- | ------------ | -------------------------------- |
| `xpa whoami`         | `--no-roles` | 网关 `/users/me`，默认带 roles。 |
| `xpa system status`  | —            | 网关连通性 + env 路由自检。      |

## task（读）

> 分页统一 `--page`（1-based，默认 1）+ `--page-size`（默认 20）。`--status` 只接受语义值（如 `running` / `paused` / `completed` / `stopped` / `not_started`），不接受后端原始数字枚举。

| 命令                    | 必填   | 主要可选                                                                                                          |
| ----------------------- | ------ | ----------------------------------------------------------------------------------------------------------------- |
| `xpa task list`         | —      | `--status <semantic>`/`--task-id`/`--dataset-id`/`--all`/`--page`/`--page-size`                                   |
| `xpa task get`          | `--id` | `--brief`（省去明细字段）                                                                                         |
| `xpa task status`       | `--id` | —                                                                                                                 |
| `xpa task running`      | —      | 分页同 list                                                                                                       |
| `xpa task subtask list` | `--id` | `--status <semantic>`/`--sub-task-id`/`--serial-number`/`--fail-reason`/`--query`/`--page`/`--page-size`          |

## task（写，默认 dry-run；加 `--yes` 执行）

| 命令                                | 必填                                                         | 选项                                                                                                                                                                                                                                                  |
| ----------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xpa task create`                   | `--name`、`--workflow-id`、`--device-ids`、`--lark-file-url` | `--queue-ids`（lark URL 必须含 `/sheets/`；name 限 128 字符）                                                                                                                                                                                         |
| `xpa task start` / `pause` / `stop` | `--id`                                                       | —                                                                                                                                                                                                                                                     |
| `xpa task subtask stop`             | `--id`、`--sub-id`                                           | 子任务被置失败态，前置任务 + 子任务都 running，权限 owner / super-admin                                                                                                                                                                               |
| `xpa task device add`               | `--id`、`--device-ids`                                       | `--reason`                                                                                                                                                                                                                                            |
| `xpa task device remove`            | `--id`、`--device-ids`                                       | `--reason`                                                                                                                                                                                                                                            |
| `xpa task export-result`            | `--id`                                                       | `--all`、`--sub-ids`、`--status-list`、`--serial-number`、`--query`、`--execute-start-from`/`--execute-start-to`、`--execute-end-from`/`--execute-end-to`、`--collection-from`/`--collection-to`（**秒级时间戳**）、`--data-form-id`、`--fail-reason` |

## device

| 命令                | 选项                                           | 备注                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ------------------- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `xpa device list`   | `--type mobile\|pc`（默认 mobile）+ 多过滤维度 | 通用过滤：`--device-id`/`--device-name`/`--device-status <online\|offline>`/`--device-use-status <idle\|busy>`/`--connect-type <adb\|link>`/`--device-platform <private\|public\|cloud>`/`--serial-number`/`--bind-business-id`；mobile 专属：`--resolution`/`--brand`/`--device-cluster-id`/`--android-version`；pc 专属：`--os-type`/`--os-version`/`--available-memory-gb`/`--cpu-cores`/`--instance-ip`/`--mac-address` |
| `xpa device idle`   | 同 list                                        | 仅返回 idle 设备                                                                                                                                                                                                                                                                                                                                                                                                            |
| `xpa device get`    | `--type` + 定位符（恰好一个）                  | mobile: `--device-id`\|`--serial-number`；pc：再加 `--instance-name`\|`--instance-id`                                                                                                                                                                                                                                                                                                                                       |
| `xpa device tasks`  | 同 get                                         | 看占用设备的任务列表                                                                                                                                                                                                                                                                                                                                                                                                        |
| `xpa device unbind` | `--task`                                       | 写命令（dry-run / `--yes`），清空 task 的设备绑定                                                                                                                                                                                                                                                                                                                                                                           |
| `xpa device delete` | `--type`、`--device-id`                        | **破坏性、不可逆**；写命令                                                                                                                                                                                                                                                                                                                                                                                                  |

## dataset

| 命令                  | 必填     | 选项                                                                                                  |
| --------------------- | -------- | ----------------------------------------------------------------------------------------------------- |
| `xpa dataset reset`   | `--task` | 重置失败数据集记录（写命令；dry-run / `--yes`）                                                       |
| `xpa dataset rerun`   | `--task` | `--rerun-type failed_task\|any_final_state_task`（默认 `failed_task`，只接受语义值）、`--sub-ids`、`--device-ids` |

## 输入校验（命令层本地拦截）

- 所有 ID（task / sub-task / device / dataset / workflow）必须是**正整数**字符串；非正整数本地直接拒。
- `--device-ids` / `--sub-ids` / `--queue-ids` / `--status-list` 是逗号分隔的列表；命令层去重 + 正整数校验。
- 时间范围参数（`--execute-start-from/to` 等）正整数本地严校（拒 NaN/0/负数）。
- 设备定位符「恰好一个」：多传或全空命令层直接拒；mobile 传 instance\_\* 直接拒。
- task create 的 `--lark-file-url` 必须包含 `/sheets/`；`--name` 最多 128 字符。

## 退出码语义

- dry-run（写命令未带 `--yes`）：正常退出 0，仅打印将要执行的摘要。CI 与 TTY 行为一致(无交互式 y/N 确认,也不做 TTY 探测)。
- 后端业务失败（`AppError` code `XPA_API_ERROR`，含 logid）：退出非零；JSON 模式 logid 进 `context.logid`。

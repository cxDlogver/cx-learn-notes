---
name: bytedance-lego
description: "Operate Lego plugin compile & release via bytedcli. Use when tasks mention Lego, Lego plugin, plugin register/compile, compile version list, release pipeline/scope, release order create/list/get, release step-info, manual confirm, or Lego OpenAPI. Covers plugin register, compile and version lookup, pipeline/scope discovery, order creation and tracking, and pipeline confirm across region-aware sites."
---

# bytedcli Lego 插件编译与发布

通过 bytedcli `lego` 命令注册插件、创建编译任务、收集发布所需信息、创建发布工单并跟踪发布进度，必要时人工确认工单。

## 如何调用 bytedcli

先选择一种调用方式。下面所有示例默认直接写 `bytedcli`。

```bash
# 方式 1：直接用 npx 运行最新版
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]

# 方式 2：先全局安装，再直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

- 使用 `npx` 时，把后文示例里的 `bytedcli` 替换成 `NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest`
- 已全局安装时，直接按后文示例执行 `bytedcli ...`
- 通用调用方式（站点切换、JSON 输出、HTTP 调试等）见 [../../invocation.md](../../invocation.md)；常见错误处理见 [../../troubleshooting.md](../../troubleshooting.md)

Lego 是字节云上的插件发布平台。一个插件（plugin）按某次编译产物（version / commit_tag）走某条发布流水线（pipeline）、面向某个发布域（scope）创建发布工单（order，即 PublishHistory 实例），随后按 flow / step 逐步灰度，遇到人工确认 / 审核节点时再人工 confirm。

## When to use

- 注册新的 Lego 插件（`plugin register`）
- 查询插件详情（含 `scm_id`、`kind`、`is_adaptive`）、列出 Git 分支 / commit
- 创建插件编译任务（`plugin compile`），并查询某个版本的编译详情
- 收集发布所需信息：编译版本（`plugin version list`）、发布流水线（`pipeline list`）、发布域（`scope list`）
- 创建发布工单（`order create`）并跟踪当前 flow / step 进度
- 按插件名查询最近发布工单（`order list`）拿到最新 `order id`，查询工单与步骤详情
- 工单停在人工确认 / 审核节点时执行人工确认（`pipeline confirm`）

## Do not use

- 不要用于非 Lego 的发布 / 部署平台（如 TCE / Goofy）— 使用对应 domain skill
- 不要在未先运行默认 dry-run 预览的情况下直接对 `plugin register` / `plugin compile` / `order create` 传 `--yes`
- 不要把 `pipeline confirm` 当成幂等查询命令反复执行；它是 live 写操作

## Agent 交互协议（必读）

Lego 是写操作敏感的发布平台，agent 在以下两种场景下**必须**使用 `AskUserQuestion` 与用户交互，不能自行决定继续执行：

- **写操作前置确认**：执行 `plugin register` / `plugin compile` / `order create` / `pipeline confirm` 这四类写操作前，必须先运行默认 dry-run（`pipeline confirm` 直接读 `order get` + `pipeline step-info get` 拼出 confirm_target）把请求体 / 目标步骤打印给用户，再用 `AskUserQuestion` 让用户在「确认执行 `--yes`」/「取消」之间显式选择；用户未明确确认前不能补 `--yes` 实际下发。
- **参数不足或存在多候选**：用户给出的参数不足以唯一确定一次写操作时，必须先用查询命令列出候选，再用 `AskUserQuestion` 让用户选择，不能由 agent 自行替换或猜测。典型情况：
  - 只给了插件名，但有多条 `order list` 历史 → 列出最近若干条工单（带 `id` / `target_version` / `status` / `create_time`），用 `AskUserQuestion` 让用户选 `--order-id`
  - `--branch` / `--commit-hash` 没指定或在 `plugin branch list` / `plugin commit list` 里找不到精确匹配 → 列出候选，让用户选；使用 `plugin branch list` 前如果用户没有提供 branch key / 关键词，必须先用 `AskUserQuestion` 询问关键词，不能直接运行缺少 `--keyword` 的命令
  - `--version` 没指定或不在 `plugin version list` 里 → 列出已编译版本与状态，让用户选
  - `--scope-name` 没指定 → 列出 `scope list` 结果 + 内置 `全量发布`，让用户选
  - `--pipeline-id` 没指定且非泳道发布 → 列出 `pipeline list` 中 `pipeline_kind = 1` 的发布流水线，让用户选
  - `--site` / `--region` 没指定，又是多 region 站点 → 按 [references/lego.md](references/lego.md) 列出该 site 的允许值，让用户选

后端查不到该参数对应的资源时，明确告诉用户「不存在」并中断后续写操作，不能擅自换成相近名字、版本或 id。

## 前置条件

- 使用通用调用方式：[../../invocation.md](../../invocation.md)
- 先登录目标站点：`bytedcli auth login`（认证失败会抛 `LEGO_AUTH_REQUIRED`，提示重新登录）
- 查询类命令优先用**文本输出**；需要机器可读字段（如 `scm_id`、`order_id`、`current_flow_index`）时再补 `--json`（全局参数，放在 `lego` 之前）

> 执行前缀见 [../../invocation.md](../../invocation.md)；下面示例直接写 `bytedcli`。

## Site 与 Region（务必先理解）

Lego 命令是 region-aware 的，两个维度互相独立：

- `--site <site>`：bytedcli **全局**参数，选控制面 domain，必须放在 `lego` **之前**。规范值：`cn | boe | i18n-bd | i18n-tt | us-ttp | eu-ttp`（另有 `prod`/`online`→`cn`、`i18n`→`i18n-bd`、`row`→`i18n-tt` 等别名）。Lego 不支持 `boe-i18n`，传 `--site boe-i18n` / `boei18n` 或 `--region boe_i18n` 都会报 `LEGO_INPUT_ERROR`。
- `--region <region>`：`lego` 的子选项，选该 site 下的 vregion，解析后作为 `x-bcgw-vregion` header 下发；必须放在 `lego` 之后、具体子命令之前。

规则：

- **多 region 的 site 必须显式传 `--region`**，否则报 `LEGO_INPUT_ERROR` 并列出允许值。
  - `cn`：`online | sinf`
  - `i18n-bd`：`us_compliance | non_tt_sg | non_tt_us | sinf_i18n | us_ttp3`
  - `i18n-tt`：`sg | us | my_compliance`
- **单 region 的 site 可省略 `--region`**（会用唯一 region）：`boe`、`us-ttp`、`eu-ttp`。
- 站点 ↔ region 的完整映射、对应 webOrigin、CLI 输入值 → 后端 header 值的对照见 [references/lego.md](references/lego.md)。运行时也可 `bytedcli lego --help` 查看 Regions 段。

```bash
# 正确：--site 在 lego 前，--region 在 lego 后、子命令前
bytedcli --site cn lego --region online plugin get --name demo_plugin

# 单 region 站点可省略 --region
bytedcli --site boe lego plugin get --name demo_plugin

# 错误：--site 放到了子命令后（会报 unknown option）
bytedcli lego plugin get --name demo_plugin --site cn   # ✗
```

## Quick start

```bash
# 查询插件详情，拿 scm_id / kind / is_adaptive
bytedcli --site cn lego --region online plugin get --name demo_plugin

# 列出分支 / commit
bytedcli --site cn lego --region online plugin branch list --plugin-name demo_plugin --keyword main
bytedcli --site cn lego --region online plugin commit list --plugin-name demo_plugin

# 编译：必须带 --version-type，默认 dry-run 预览；确认后加 --yes 执行，然后查编译详情
bytedcli --site cn lego --region online plugin compile --plugin-name demo_plugin --version-type offline --branch master
bytedcli --site cn lego --region online plugin compile --plugin-name demo_plugin --version-type offline --branch master --user-env '{"region":"sg","mode":"fast"}'
bytedcli --site cn lego --region online plugin compile --plugin-name demo_plugin --version-type offline --branch master --yes
bytedcli --site cn lego --region online plugin compile-detail get --plugin-name demo_plugin --version 1.0.0.1

# 收集发布信息（version list 只需 --plugin-name，scm_id 由服务端依据插件详情自动解析）
bytedcli --site cn lego --region online plugin version list --plugin-name demo_plugin
bytedcli --site cn lego --region online pipeline list --plugin-name demo_plugin
bytedcli --site cn lego --region online scope list --plugin-name demo_plugin

# 发布：用编译产出的 --version（不是 --commit-tag），默认 dry-run 预览；确认后加 --yes
bytedcli --site cn lego --region online order create --plugin-name demo_plugin --version 1.0.0.1 --scope-name 全量发布 --order-type hot_upgrade
bytedcli --site cn lego --region online order create --plugin-name demo_plugin --version 1.0.0.1 --scope-name 全量发布 --order-type hot_upgrade --publish-parameters '{"lane":"lane-a","branch":"main"}'
bytedcli --site cn lego --region online order create --plugin-name demo_plugin --version 1.0.0.1 --scope-name 全量发布 --order-type hot_upgrade --yes

# 跟踪工单与步骤（step-info 在 pipeline 组下）
bytedcli --site cn lego --region online order list --plugin-name demo_plugin
bytedcli --site cn lego --region online order get --id 12345
bytedcli --site cn lego --region online pipeline step-info get --order-id 12345 --flow-index 0 --step-index 0

# 人工确认：先默认 dry-run 预览 confirm_target，确认后再加 --yes 执行
bytedcli --site cn lego --region online pipeline confirm --order-id 12345
bytedcli --site cn lego --region online pipeline confirm --order-id 12345 --yes
```

## 命令树

```text
bytedcli
`- lego  (--region <region>)
   |- plugin
   |  |- get                  (--name)
   |  |- register             (--plugin-name --scm-path --plugin-type --owners --parent-id --language ...)
   |  |- compile              (--plugin-name --version-type {offline|online|test} + branch|commit-hash)
   |  |- version list         (--plugin-name)
   |  |- compile-detail get   (--plugin-name --version)
   |  |- commit list          (--plugin-name)
   |  `- branch list          (--plugin-name --keyword)
   |- pipeline
   |  |- list                 (--plugin-name)
   |  |- confirm              (--order-id [--yes])
   |  `- step-info get        (--order-id --flow-index --step-index)
   |- order
   |  |- create               (--plugin-name --version --scope-name --order-type [--yes])
   |  |- list                 (--plugin-name)
   |  `- get                  (--id)
   `- scope
      `- list                 (--plugin-name)
```

> 人工确认是 `pipeline confirm`、步骤详情是 `pipeline step-info get`（都在 `pipeline` 组下）；`order` 组只有 `create / list / get`。

## 参数命名

插件名入参：`plugin get` 使用 `--name`（单资源查询，无需冗余前缀），其余子命令统一使用 `--plugin-name`：

- `plugin get` 使用 `--name`。
- `plugin register` / `plugin compile` / `plugin compile-detail get` / `plugin version list` / `plugin commit list` / `plugin branch list` / `pipeline list` / `scope list` / `order create` / `order list` 使用 `--plugin-name`。

各子命令的完整必填 / 可选参数、JSON 字段见 [references/lego.md](references/lego.md)。

## 编译发布最佳实践

端到端推荐顺序：（按需 `plugin register`）→ `plugin get` → `pipeline list` / `scope list` → `plugin compile` 默认预览 → `plugin compile --yes` → 轮询 `compile-detail get` → `order create` 默认预览 → `order create --yes` → 轮询 `order get` + `pipeline step-info get` →（按需）`pipeline confirm --yes`。

1. **先确定 site / region**：多 region 站点必须带 `--region`，否则命令直接报 `LEGO_INPUT_ERROR`。

2. **查询与收集**：先 `plugin get` 拿 `scm_id` / `kind` / `is_adaptive`；再用 `plugin version list`（只需 `--plugin-name`，`scm_id` 由服务端依据插件详情自动解析）、`pipeline list`（选 `pipeline_kind = 1` 的发布流水线）、`scope list` 收集发布信息。

3. **编译（写操作）**：`plugin compile` 必须带 `--version-type`（`offline | online | test`），并至少提供 `--branch` 或 `--commit-hash` 之一。默认 dry-run，只返回请求体不直接写；确认后再加 `--yes` 执行。编译是异步任务，创建成功后每 `10s` 轮询一次 `plugin compile-detail get`，直到 `status` / `status_arm` 进入终态（`build_ok` / `build_failed`）。`prepare` / `building` / `queue` / `not_build` / `wait` 都是非终态，继续轮询。

4. **创建发布工单（写操作）**：
   - `--version` 传编译产出的版本号（**不是** `--commit-tag`）。CLI / service 会根据插件类型自动决定下发 `version` 还是 `commit_tag`：普通插件用 `version`，多版本插件（`kind = 3 MulVerNative` 或 `is_adaptive = true`）用 `commit_tag`。调用方只管传 `--version`。
   - `--scope-name` 来自 `scope list`；`全量发布` 是内置 scope，不出现在 `scope list` 返回里，但可直接 `--scope-name 全量发布`。
   - `--order-type` 当前固定传 `hot_upgrade`（OrderTypeHotUpgrade），传其他值会被拒。
   - `--pipeline-id` 来自 `pipeline list`；泳道发布可不传。
   - 默认 dry-run 看请求体，确认后再加 `--yes` 创单。创单成功返回 `order_id` 和可继续在网页查看的 `web_url`。

5. **跟踪发布**：每 `10s` 轮询 `order get`，用返回的 `current_flow_index` / `current_step_index` 调 `pipeline step-info get` 看当前步骤。重点看工单 `status`、当前步骤 `type`、发布检测步骤的 `check_task_status`。
   - `status = 4`（`PublishReady`，灰度完成准备上线）是收尾中间态，**不是**最终完成；要继续轮询到 `status = 1`（`PublishFinish`）。
   - 步骤 `type in {5, 8}`（`ManualConfirm 人工确认` / `Audit 审核节点`）时停止自动轮询，转人工推进。
   - 工单已是终态（`PublishFinish(1)` / `PublishCancel(3)` / `PublishCanceling(7)`）就停止，不再继续 confirm。

6. **人工确认（写操作）**：工单卡在人工确认 / 审核节点时执行 `pipeline confirm`。命令会先读 `order get` 推断当前 flow / step，再确认。
   - **任意 site / region** 带 `--yes` 都可直接走 CLI live confirm（不要相信旧文档"仅 boe 泳道才允许"的说法，那已过时）。
   - 不传 `--yes` 时命令返回 dry-run 预览结果，包含 `dry_run: true`、`confirm_target`、`confirmed: false`，不会调用写接口。agent 必须把目标步骤展示给用户，并用 `AskUserQuestion` 让用户在「确认执行 `--yes`」/「取消」之间显式选择，不能自动补 `--yes` 重试。
   - 后端 `manualConfirm` 拒绝写入时，命令会失败并**优先保留上游 `AppError` 的 `code` / `hint`**（常见如 `LEGO_ENVELOPE_ERROR`、`LEGO_AUTH_REQUIRED`），同时在 JSON error `details` 里补 `error_message` 与 best-effort `web_url` 作为 confirm 上下文。只有上游抛的不是 `AppError` 时，才兜底改写成 `LEGO_CONFIRM_ORDER_FAILED`。此时必须停止自动化；若存在网页地址就一并交给用户，否则只交付错误信息。

7. **从插件名反查工单**：用户只给插件名、想看“最新发布工单”或“最新工单当前步骤”时，先 `order list --plugin-name <plugin>` 解析最新 `order id`，再 `order get` / `pipeline step-info get`。历史为空就如实告知查不到，**不要臆造 order id 或 flow / step 坐标**。

8. **先校验入参再执行写操作**：`plugin compile` / `order create` 里的标识类参数要先向后端确认存在，再决定是否执行：
   - `--plugin-name` → `plugin get`
   - `--branch` → `plugin branch list`
   - `--commit-hash` → `plugin commit list`
   - `--version`（必须是已编译且成功的版本）→ `plugin version list`
   - `--pipeline-id`（应为该插件 `pipeline_kind = 1` 的发布流水线；泳道发布可不传）→ `pipeline list`
   - `--scope-name`（`全量发布` 为内置值，可能不在 `scope list` 返回里）→ `scope list`

   后端查不到对应参数时，明确告诉用户该参数不存在并**中断后续操作**，不要继续 `plugin compile` / `order create`（含默认 dry-run / `--yes`），也不要擅自替换成相近的名字 / 版本 / id。**用户没提供该参数但后端候选 ≥ 2 时，用 `AskUserQuestion` 列出候选让用户选，不要 agent 自行决定**（详见 [Agent 交互协议](#agent-交互协议必读)）。

字段释义与各状态枚举（`pipeline_kind` / `FlowType` / `StepType` / `PublishStatus` / `CheckTaskStatus` / `ScmBuildStatus` 等）见 [references/lego.md](references/lego.md)。

## 输出说明

### 文本模式（默认）

查询类命令输出朴素表格 / KV 列表；枚举字段同时展示原始值与中文标签（如 `1 (PublishFinish 发布完成)`），释义见 [references/lego.md](references/lego.md)。

### JSON 模式（`--json`）

统一 envelope 为 `{ status, data, error, context }`，各命令 `data` 关键字段如下：

| 命令                                        | `data` 关键字段                                                                                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plugin get`                                | `plugin`（`plugin_name`、`scm_id`、`kind`、`is_adaptive`、`is_multi_ver`、`status`、`language`）                                                                                     |
| `plugin register`（默认 dry-run）           | `dry_run`、`request`                                                                                                                                                                 |
| `plugin register --yes`                     | `message`                                                                                                                                                                            |
| `plugin compile`（默认 dry-run）            | `dry_run`、`request`                                                                                                                                                                 |
| `plugin compile --yes`                      | `version`                                                                                                                                                                            |
| `plugin version list`                       | `count`、`versions`、`kind`、`ipc_only`、`online_version`、`version_regions`、`page`、`page_size`                                                                                    |
| `plugin compile-detail get`                 | `detail`                                                                                                                                                                             |
| `plugin commit list` / `plugin branch list` | `items`、`count`                                                                                                                                                                     |
| `pipeline list`                             | `items`、`total`                                                                                                                                                                     |
| `pipeline step-info get`                    | `step`                                                                                                                                                                               |
| `pipeline confirm`（dry-run / live 成功）  | `dry_run`、`order_id`、`region`、`current_flow_index`、`current_step_index`、`confirm_target`、`confirmed`、`web_url`；后端拒绝 live 写入时返回 JSON error，优先保留上游 `code` / `hint`，仅在非 `AppError` 异常时兜底成 `LEGO_CONFIRM_ORDER_FAILED`，confirm 上下文在 `details.error_message` / `details.web_url` |
| `scope list`                                | `items`、`count`、`offset`、`limit`                                                                                                                                                  |
| `order create`（默认 dry-run）              | `dry_run`、`request`                                                                                                                                                                 |
| `order create --yes`                        | `order_id`、`web_url`（可选）                                                                                                                                                        |
| `order list`                                | `items`、`count`、`page`、`page_size`                                                                                                                                                |
| `order get`                                 | `order`                                                                                                                                                                              |

## Notes

- `--json` 与 `--site` 都是全局参数，放在 `lego` 之前；`--region` 是 `lego` 子选项，放在 `lego` 之后、具体子命令之前
- 缺少必填参数时命令会输出完整帮助信息
- 写操作（`plugin register` / `plugin compile` / `order create` / `pipeline confirm`）默认 dry-run；agent 须先用默认预览结果让用户确认，再补 `--yes`
- `pipeline confirm` 任意 site 可用，无 `--yes` 返回 `confirm_target` 预览；后端拒绝 live 写入时优先保留上游错误码 / hint，仅非 `AppError` 异常才兜底成 `LEGO_CONFIRM_ORDER_FAILED`，网页兜底地址在 JSON error 的 `details.web_url`；agent 必须用 `AskUserQuestion` 让用户确认后再补 `--yes`，不能自动重试
- 用户没明确给出 `--order-id` / `--version` / `--branch` / `--commit-hash` / `--scope-name` / `--pipeline-id` 等关键参数，且查询命令返回多条候选时，必须用 `AskUserQuestion` 让用户选，不能 agent 自行决定
- 不要把 `status = 4`（PublishReady）误判为发布完成；最终完成态是 `status = 1`（PublishFinish）
- 发布前确保目标 `--version` 已编译成功，且 `--pipeline-id` / `--scope-name` 与该插件匹配

## References

- [references/lego.md](references/lego.md)：完整命令参数、字段释义与服务端枚举
- [../../invocation.md](../../invocation.md)：通用调用方式
- [../../troubleshooting.md](../../troubleshooting.md)：常见错误处理

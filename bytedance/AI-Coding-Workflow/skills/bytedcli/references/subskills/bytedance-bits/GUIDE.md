---
name: bytedance-bits
description: "Operate BITS DevOps platform via bytedcli: create/update dev tasks, import TCC configs, run pipelines, manage merge requests (including host-sub MR for SDK component releases with config-driven multi-sub-repo support), trigger component upgrades, query client workflow/integration/calendar OpenAPI surfaces, generate AI test cases, update lanes, bind branches, manage releases, upgrade existing TCE clusters in PPE/BOE envs, and debug Anywheredoor/任意门 proxy capture, share links, devices, mocks, filters, black paths, and curl conversion."
---

# bytedcli BITS

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

- 创建研发任务（支持多项目多分支）
- 查询和推进客户端 BITS MR 流程
- 创建主子仓 MR（单宿主+多子仓 SDK 组件发版，支持配置文件驱动和多子仓联合发版）
- 触发客户端组件升级、查询升级历史
- 在应用中心创建 Gecko PSM 并绑定已有 Gecko channel（`bits appcenter gecko create`）
- 查询客户端 workflow / integration / calendar OpenAPI 子域
- 运行自测流水线
- 将 TCC 配置导入研发任务
- 更新泳道配置
- 绑定代码分支
- 升级 PPE/BOE 环境内已有 TCE 集群
- 查询发布工作流
- 查询发布工单详情
- 创建发布工单
- 调试 Anywheredoor / 任意门（`bits anywhere`）：保留原设备抓包监控与 curl 转换，并支持 share 链接解析、设备选择、代理启停、mock 查询/创建/启停/删除、filter 与 black path 查询

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 大部分 Bits OpenAPI 能力（例如 `bits mr` / `bits component`）依赖 Bits OpenAPI token（请求头 `Authorization: Bearer <token>`）

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

### Token 获取与设置

- 如果缺少 token，先申请 Bits OpenAPI 权限并获取 token（参考：`https://bits.bytedance.net/open/open_api/permission`）

#### Token 优先级（从高到低）

1. 命令行 `--token <token>`（仅本次请求生效，不写入缓存；若请求 `401/403`，为避免覆盖 override token，会直接报错）
2. 环境变量 `CLIENT_BITS_SERVICE_TOKEN` + `CLIENT_BITS_USER`（必须同时存在；用于服务账号 token）
3. 环境变量 `CLIENT_BITS_TOKEN`
4. 本地 token cache（通过 `bytedcli bits auth ...` 管理；按 Bits `apiUrl` 的 host 分开缓存）

#### 推荐用法

- 普通个人 token：

```bash
export CLIENT_BITS_TOKEN="your-token"
```

- 服务账号 token（必须同时设置 user）：

```bash
export CLIENT_BITS_SERVICE_TOKEN="your-service-token"
export CLIENT_BITS_USER="service-user"
```

- 如果还希望为当前项目提供默认的 Bits 环境或默认的 `group_name` / `project_gitlab_id`，可以额外写 `.bits/project_config.json`：

```json
{
  "apiUrl": "https://bits.bytedance.net/",
  "group_name": "demo.group",
  "project_gitlab_id": 12345
}
```

#### 通过命令管理 token cache（推荐）

当 1~2 都未提供 token 时，调用 Bits OpenAPI 的命令会自动尝试获取并缓存 token；若接口返回 `401/403`，会自动刷新一次并重试一次。

```bash
bytedcli bits auth login [--force]
bytedcli bits auth status
bytedcli bits auth logout
bytedcli bits auth config-auth --token <token>
```

> `bits auth` 会自动读取当前 Bits 配置（例如 `BITS_API_URL` / `.bits/project_config.json.apiUrl`），并按 host 维度管理缓存文件。

## Quick start

### 升级 PPE/BOE 环境里的已有 TCE 集群

`bits env deploy-upgrade` 新增支持升级已有 PPE/BOE 环境内的 TCE 集群，核心参数为：`env + psm + cluster-id + branch/version`。它只用于升级已有集群；新建环境、新增服务或新增集群仍应使用 ENV 创建链路。

```bash
# 指定 SCM 版本升级。若同时传 --version 和 --branch，--version 优先生效。
bytedcli bits env deploy-upgrade \
  --env ppe_demo \
  --standard-env online_cn \
  --psm example.service.api \
  --cluster-id 12345 \
  --version 1.0.0.370

# 部署 Git 分支
bytedcli bits env deploy-upgrade \
  --env ppe_demo \
  --standard-env online_cn \
  --psm example.service.api \
  --cluster-id 12345 \
  --branch feat/demo
```

可先用 `bytedcli env service list --env <env> --standard-env <standard-env> --search <psm>` 或 ENV 页面确认目标 cluster id；提交后返回的 `Ticket ID` 用于继续查部署进度。

### 查看 PPE/BOE 环境实例详情和部署单

ENV 实例查询走 `env` 域命令，避免和 `bits env deploy-upgrade` 的升级入口混在一起。先用 `env service list` 按 PSM 定位实例 ID，再用 `env service get` 查看集群、实例与 SCM 版本信息。

```bash
bytedcli env service list \
  --env demo-ppe \
  --standard-env online_cn \
  --search example.service.api

bytedcli env service get \
  --instance-id 123456 \
  --standard-env online_cn
```

文本输出会展示集群 ID、集群名称、机房、主仓 SCM 版本、commit 以及实例列表；JSON 输出保留 ENV API 原始结构，便于脚本提取 `instances[].repo_info[].version`。

部署单查询同样复用 `env ticket`：

```bash
bytedcli env ticket list \
  --env demo-ppe \
  --standard-env online_cn \
  --psm example.service.api

bytedcli env ticket get \
  --ticket-id ticket-123 \
  --standard-env online_cn
```

### 创建研发任务

```bash
# 方式1: 使用 --services（向后兼容，单分支）
bytedcli bits develop create \
  --title "修复登录问题" \
  --services example.service.api \
  --lane test \
  --scm-mode branch \
  --scm-branch fix/login \
  --from-dev-id 12345 \
  --qa "qa@bytedance.com" \
  --meego "https://example.com/issues/123" \
  --var "custom_var_key=自定义变量" \
  --developer "dev@bytedance.com" \
  --dry-run

# 方式2: 使用 --change（多项目多分支）
bytedcli bits develop create \
  --title "分享按钮修复" \
  --change "service=DemoOrg|demo/web-app,branch=fix/share-button" \
  --change "service=DemoOrg|demo/admin-app,branch=fix/share-align" \
  --lane test \
  --space-id 1234567890 \
  --from-dev-id 12345 \
  --qa "qa@bytedance.com" \
  --meego "https://example.com/issues/123" \
  --var "custom_var_key=自定义变量" \
  --developer "dev@bytedance.com" \
  --dry-run

# 方式2b: 使用 --change 指定非主 SCM 依赖
# 适用于服务有多个 SCM 依赖，需要变更的不是主 SCM 的场景
bytedcli bits develop create \
  --title "控制台前端修复" \
  --change "service=example.node.open_web,scm=example/developer/console/frontend,branch=fix/foo" \
  --lane test \
  --from-dev-id 12345 \
  --dry-run

# 方式2c: --meego 可重复，一次性绑定多个 Meego 工作项
bytedcli bits develop create \
  --title "修复多个关联工单" \
  --services example.service.api \
  --lane test \
  --from-dev-id 12345 \
  --meego "https://example.com/issues/123" \
  --meego "https://example.com/issues/456" \
  --dry-run

# 方式2d: 使用 --change 复用 source branch 上已有的 open MR
# 等价于 Bits Web UI 上提示 "An unfinished MR already exists" 时点击 "use directly"
# 适用于已经手动创建了 MR、或上一次 develop create 已经开过 MR 的场景；
# 省略 mr= 时（默认）行为不变，由 Bits 后端自动开新 MR
bytedcli bits develop create \
  --title "复用已有 MR" \
  --change "service=DemoOrg|demo/web-app,branch=fix/share-button,mr=1780" \
  --lane test \
  --from-dev-id 12345 \
  --dry-run

# 方式3: 指定项目类型（使用 --service-type 自动解析 projectUniqueId）
bytedcli bits develop create \
  --title "Web 项目修复" \
  --services "demo/web-app,demo/admin-app" \
  --service-type PROJECT_TYPE_WEB \
  --lane test \
  --space-id 12345 \
  --dry-run

# 方式3: 指定 Bits space + 可选 work item / state / created-at 查询开发任务列表
bytedcli bits develop list \
  --space-id 12345 \
  --work-items "meego 123456" \
  --page 1 \
  --page-size 10
```

### 运行自测流水线

```bash
bytedcli bits develop quick-run \
  --dev-id 123456 \
  --stage DevDevelopStage \
  --task DevDevelopStageSelfTestTask \
  --control-planes CONTROL_PLANE_CN \
  --wait \
  --wait-timeout-sec 600
```

### 关闭研发任务及其流水线

`bits develop close` 对应 Bits Web 的研发任务关闭动作，走 `POST /api/v1/dev/task/close`，入参是 `devBasicId`，不是 Pipeline 页面的 `pipelineId`。从 develop detail URL 的 `/develop/detail/{devBasicId}` 提取 ID 后传 `--dev-id`；关闭原因用同组写操作通用的 `--reason`。先用 `--dry-run` 核对 payload，再真实执行。

如果页面可以关闭但 CLI 返回 `code=405` / `无权限`，优先排查 `x-jwt-token` 的租户身份是否一致。BITS close 的权限按 JWT 中的 tenant / scope / username 判断；referer、cookie 或 `devops_space_type` 不会把默认 `bytedance` 身份切到页面里的业务租户。需要临时复用页面同租户 JWT 时，用 `BYTEDCLI_USER_CLOUD_JWT="<page x-jwt-token>"` 注入后再执行 close，不要把真实 token 写入聊天、文档或提交记录。

```bash
bytedcli bits develop close \
  --dev-id 123456 \
  --reason "不需要了" \
  --dry-run

bytedcli bits develop close \
  --dev-id 123456 \
  --reason "不需要了" \
  --force
```

### 重跑 / 从失败处重试 / 取消 Pipeline run

`bits pipeline-run cancel` 面向整条 BITS Pipeline run（`runId`），对应 BITS 前端的 run-level cancel（operation `3`）。它不是 jobRun 的 force-skip；需要显式 `--reason`，建议先用 `--dry-run` 核 endpoint 与 payload，再决定是否真实取消。

`bits pipeline-run rerun` 是 run-level 全量重跑（operation `1`），会让 BITS 按整条 run 的重跑语义重新执行，可能重跑已经成功过的节点。

`bits pipeline-run retry` 是 run-level 从失败处重试（operation `2`，rerun from failure），适合让 BITS 按 run 级失败恢复语义处理 failed jobs。它不是单个原子 / jobRun 的精确重试；只想重试某个失败节点时，用 `bits job-run retry --job-run-id ... --job-uid ...`。

本 skill 不暴露 rollback、force-failed、raw operation 或 batch run operation。

```bash
bytedcli bits pipeline-run cancel \
  --run-id 1158906980866 \
  --reason "superseded by newer run" \
  --dry-run

bytedcli bits pipeline-run rerun \
  --run-id 1158906980866 \
  --dry-run

bytedcli bits pipeline-run retry \
  --run-id 1158906980866 \
  --dry-run
```

### 强制跳过 Pipeline jobRun

`bits job-run force-skip` 面向 BITS Pipeline 的 `jobRunId`，不是 legacy workflow 的 `jobId`。适合在 Pipeline 页面拿到 `jobRunId` / `pipelineRunId` 后跳过 FTF、TeslaX 等阻塞任务。

```bash
bytedcli bits job-run force-skip \
  --job-run-id 123456789 \
  --pipeline-run-id 987654321 \
  --space-id 12345 \
  --reason "TeslaX skipped for this launch"
```

### 重试失败的 Pipeline jobRun

`bits job-run retry` 面向 BITS Pipeline 的失败节点重试（operation `2`，BITS failed job rerun），不是重新触发整条 pipeline。适合 Goofy / ByteFaaS / transient 类节点失败后，只重跑当前 failed jobRun。命令默认先调用 `check_op_permission` 预检 `bits.servicePipeline.rerunfailedJobrun` 权限；如需只查看请求体，用 `--dry-run`。

```bash
bytedcli bits job-run retry \
  --job-run-id 2787514722 \
  --pipeline-run-id 1158906980866 \
  --space-id 4046305282 \
  --job-uid goofy_deploy-abc123 \
  --dry-run
```

### 继续发布 Pipeline jobRun

`bits job-run continue-release` 用于通过 / 拒绝 BITS Pipeline 的 `user_confirm`（人工确认 / 继续发布）节点，适合发布流水线在 Canary / 单机房完成后点“继续发布”，或最后“收尾关单”的场景。确认方法名**按节点自动解析**：命令会先读取该节点运行时的确认按钮（`extra_action`），回放对应的 `method_name` 与 `is_pass`，不再写死——因为不同节点方法名不同（例如观察放行节点用 `user_define_method`、收尾关单节点用 `user_define_method_for_bits`），写死会导致方法名不匹配、确认节点被后端打成 failed。默认动作是“通过”，`--reject` 为“不通过”；个别老节点解析不到时再用 `--method-name` 手动指定。先用 `--dry-run` 核 payload，再真实执行。

命令会自动把当前登录用户名注入到 `inputs.username`。这是**必需**的：星盾发布质检门（atom `starshield_process_guard`，`method_name=user_define_method`）的服务端直接读 `inputs.username`，缺它会 500 `KeyError:'username'`、把节点打成 failed 并卡住主流水线；变更观测 `ContinueRelease` 等门从鉴权侧取用户名、带上无害。个别需要前端表单状态回传的 user_define gate（如 rds_edit 类原子）需要附带 `display_params`，可通过 `--display-params <json>` 以 JSON 字符串形式注入到 `inputs.display_params`，faas 端会将其作为更新后的表单数据写入 `plugin_context.display_params`。可选 `--check-permission`（需配合 `--space-id`）会先做一次 RBAC 预检，无权时直接报缺 `bits.servicePipeline.customJobrun`，不会盲发写请求。

```bash
bytedcli bits job-run continue-release \
  --job-run-id 2787514722 \
  --pipeline-run-id 1158906980866 \
  --dry-run
```

### 列出 Pipeline jobRun 可用操作

`bits job-run list-operations` 只读，列出某 pipeline run 下每个 jobRun 当前支持的操作枚举（`2`=retry failed jobRun，`5`=force-skip，`8`=user_define / continue-release）。推进门禁或重试节点前先用它确认目标节点是不是可操作类型，避免盲调。

```bash
bytedcli bits job-run list-operations \
  --pipeline-run-id 1158906980866 \
  --space-id 4046305282
```

### 导入 TCC 配置到研发任务

```bash
# 先预览自动发现的 region / dir / config 列表
bytedcli bits develop import-tcc-configs \
  --dev-id 123456 \
  --psm example.service.api \
  --control-planes 2,3,4 \
  --dry-run

# 只导入指定配置名
bytedcli bits develop import-tcc-configs \
  --dev-id 123456 \
  --psm example.service.api \
  --config-names flow_config,ab_token
```

- 默认按 Dev Task workflow 导入，内部使用 BITS 的 `workflowType=2`。
- 默认控制面是 `2,3,4`，会按任务已配置的 region / dir 自动发现可导入配置。
- `--dry-run` 只输出导入计划，不会写入 BITS。

### 查看 Pipeline / Job Run 状态

#### 1) 用 `pipeline` 快速定位当前 run 状态和节点状态

```bash
# 最新一次 run
bytedcli bits pipeline <pipeline-id>

# 指定 run（可选）
bytedcli bits pipeline <pipeline-id> --run-seq <run-seq>

# 默认会折叠 hidden jobs（ignored / 尚未执行），并输出 hidden 摘要计数
# 如需展开 hidden jobs 并查看隐藏原因，显式打开
bytedcli bits pipeline <pipeline-id> --run-seq <run-seq> --show-ignored

# 显式补充每个 job 当前支持的 BITS operation enums
bytedcli bits pipeline <pipeline-id> --run-seq <run-seq> --with-job-operations
```

看输出里的两部分即可：

- `Bits Pipeline Latest Run`：整条 pipeline 的当前状态（如 `running (2)` / `failed (9)`）
- `Jobs`：每个 job 的状态与 `Job Run ID`，可快速定位当前卡在哪个 job
- `Operations`：仅在 `--with-job-operations` 时展示；常见值 `2`=retry failed jobRun、`5`=force-skip、`8`=user_define / continue-release。JSON 模式会在每个 job 上补 `operations`，并在 run 响应里保留 `jobOperations` 原始 map，方便脚本消费。

隐藏节点分类约定：

- `skipped`：run 中有记录，但状态是 `ignored (1)`（被跳过）
- `not_executed`：pipeline DSL 里定义了 job，但当前 run 还没创建该 job
  - 展开后状态会显示为 `not_started`（run 未结束）或 `not_created`（run 已结束）

#### 2) 用 `job-run` 查看单个节点的详细状态

```bash
bytedcli bits job-run <job-run-id> --pipeline-run-id <pipeline-run-id>
```

重点看：

- `Status`、`Fail Reason`
- `Steps / Atoms`（该 job 内部各 step 的状态）

### 基于模板创建流水线

```bash
# 基于模板复制流水线
bytedcli bits pipelines create \
  --space-id 12345 \
  --name "sample pipeline" \
  --template-id 123

# 当模板里的 pipeline.varGroup 不完整时，显式补充 varGroup 字段
bytedcli bits pipelines create \
  --space-id 12345 \
  --name "sample pipeline" \
  --template-id 123 \
  --var-group '{"description":{"value":"sample var group","lang":"zh","texts":{"en":"sample var group"}}}'
```

- `bits pipelines create` 当前是模板模式，`--template-id` 必填。
- `--var-group` 必须是 JSON 对象，只会 merge 到模板里的 `pipeline.varGroup`。
- CLI 不会自动补齐 `pipeline.varGroup.description`；如果 merge 后结构仍不满足后端要求，BITS API 会直接返回错误。

### 更新流水线 DSL（`bits pipelines set`）

`bits pipelines set` 用来把一份完整 pipeline DSL 整体 PUT 回去，常见用法是 "拉下来 → 局部改 → 写回去"：

```bash
# 1. 拉当前 DSL（注意是 -j；data.pipeline 即可写回的 DSL）
bytedcli bits pipelines get <pipeline_id> -j > /tmp/pipeline.json

# 2. 编辑 /tmp/pipeline.json 里 data.pipeline 的字段，例如改某个 stage 下所有 job 的 runEnv

# 3. 把 data.pipeline 写回（也接受完整 PUT body {note, editorType, pipeline}）
bytedcli bits pipelines set --pipeline-id <pipeline_id> --file /tmp/pipeline.json --note "调整 stage runEnv"
```

输出（`-j` 模式 `data` 字段）会带：

- `fromVersion` / `toVersion`：本次编辑前后的 `pipelineVersion.version`，可用于校验是否成功 bump
- `diffUrl`：`https://bits.bytedance.net/devops/<spaceId>/pipeline/edit_record/diff?pipelineId=<id>&fromVersion=X&toVersion=Y`，给用户在浏览器里 review 改动
- `backupPath`：PUT 之前的当前 DSL 本地备份（`os.tmpdir()/bytedcli/bits-pipeline-backup/<id>-<ts>.json`），出错时可回滚
- `sanitizedI18nPaths`：被自动剥成 `null` 的空 i18n 字段路径列表（见下方 Notes）
- `response`：服务端 PUT 响应原文，含完整 echoed pipeline DSL，可用于二次校验

**注意**：

- PUT 是整体替换。`--file` 里没出现的字段会被服务端清掉，所以必须基于 `bits pipelines get` 的最新 DSL 改，不要自己拼一份小子集。
- 文本模式（不带 `-j`）只渲染 KV 表，不打印 `response`；要看服务端回显请用 `-j`。

### 更新最新流水线 DSL 字段（`bits pipelines update-field`）

`bits pipelines update-field` 会先拉取最新 pipeline DSL，再按 JSON Pointer 修改指定字段，最后整体 PUT 回 BITS。它适合 release project pipeline 缺少上下文变量、QDE/TCE 原子字段需要小范围修复的 recovery 场景；先用 `--dry-run` 审核 payload，再正式写回。

```bash
# 先 dry-run，确认 data.changes / data.body.pipeline
bytedcli --json bits pipelines update-field \
  --pipeline-id <pipeline_id> \
  --set-string /stages/0/jobs/0/inputs/psm=example.psm \
  --set /stages/0/jobs/1/inputs/service_env='"CN"' \
  --note "release project pipeline recovery" \
  --dry-run

# 确认后去掉 --dry-run 正式写回
bytedcli bits pipelines update-field \
  --pipeline-id <pipeline_id> \
  --set-string /stages/0/jobs/0/inputs/psm=example.psm \
  --set /stages/0/jobs/1/inputs/service_env='"CN"' \
  --note "release project pipeline recovery"
```

输出（`-j` 模式 `data` 字段）会带：

- `changes`：实际变更的 JSON Pointer、旧值和新值；若没有任何变化会拒绝写回。
- `body`：最终 PUT 请求体，dry-run 时用它审查会发给 BITS 的完整 DSL。
- `backupPath` / `diffUrl` / `fromVersion` / `toVersion`：正式写回后用于回滚和浏览器 review。
- `sanitizedI18nPaths`：和 `pipelines set` 一样，PUT 前会把空 i18n 字段置为 `null`。

**注意**：

- `--set <pointer=json>` 的右侧按 JSON 解析，字符串值需要带 JSON 引号，例如 `--set /x='"CN"'`。
- `--set-string <pointer=value>` 的右侧按普通字符串处理，适合 PSM、branch、service_env 等文本字段。
- JSON Pointer 按 RFC 6901 转义：字段名里的 `/` 写成 `~1`，`~` 写成 `~0`。

### MR 相关

```bash
# 单仓 MR（使用 Bits OpenAPI，需要 CLIENT_BITS_TOKEN）
bytedcli --json bits mr create \
  --source-branch <source-branch> \
  --target-branch <target-branch> \
  --title <title> \
  --description <description> \
  --type optimize \
  --wip false \
  --remove-source true

# 查询空间 MR 创建表单字段和默认 custom_fields
bytedcli --json bits mr get-custom-fields \
  --group-name LarkFrontend

# 查询空间 MR 创建表单字段和默认 custom_fields
bytedcli --json bits mr get-custom-fields \
  --group-name LarkFrontend

# 单仓 MR + Meego 绑定（URL 模式，自动解析 projectKey 和 type）
bytedcli --json bits mr create \
  --source-branch feat/demo \
  --target-branch main \
  --title "feat: demo feature" \
  --type feature \
  --group-name LarkFrontend \
  --project-id 552443 \
  --meego "https://meego.larkoffice.com/larksuite/issue/detail/6841440562"

# 单仓 MR + Meego 绑定（ID 模式，需指定 type 和 project-key）
bytedcli --json bits mr create \
  --source-branch feat/demo \
  --target-branch main \
  --title "feat: demo feature" \
  --type feature \
  --group-name LarkFrontend \
  --project-id 552443 \
  --meego 6841440562 \
  --meego-type feature \
  --meego-project-key larksuite

# 平台 MR（单仓客户端 MR，走 Optimus API + JWT 认证，不要求子仓依赖）
# 与默认单仓 MR 的区别：默认单仓 MR 走 BITS OpenAPI；平台 MR 走客户端空间的平台评审流程
# group_name / host project id 在仓库存在 .bits/project_config.json 时自动读取，可省略
bytedcli --json bits mr create \
  --platform \
  --source-branch <source-branch> \
  --target-branch develop \
  --title <title> \
  --type optimize \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 发起平台 MR 的代码评审（reviewer 手动指定）
# --mr-id 用创建平台 MR 返回的 optimus_mr_id；group_name / project_id 同样可从 .bits/project_config.json 读取
bytedcli --json bits mr code-review start \
  --mr-id <optimus-mr-id> \
  --reviewer <reviewer-username> \
  --rule develop \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 通过平台 MR 的代码评审
# --mr-id 用创建平台 MR 返回的 optimus_mr_id；它就是 bits `code/detail/<id>` 页面 URL 里的那个数字
bytedcli --json bits mr code-review approve \
  --mr-id <optimus-mr-id> \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 用平台 MR id 反查底层 Bits-Code (GitLab) MR（project / iid / branches / web URL），便于直接在 GitLab 侧评审或评论
# --mr-id 与 start / approve 一致，都用 optimus_mr_id（= bits `code/detail/<id>` URL 里的数字）
bytedcli --json bits mr code-review gitlab \
  --mr-id <optimus-mr-id> \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 查询发起代码评审前可选的 reviewer 规则（scope / rule / 候选人），用于喂给 `bits mr code-review start` 的 reviewer 入参
# --mr-id 与 start 一致，都用 optimus_mr_id（= bits `code/detail/<id>` URL 里的数字）
bytedcli --json bits mr code-review rules \
  --mr-id <optimus-mr-id> \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 修改当前代码评审中某条规则选中的 reviewer
# 该命令封装 Bits Code Review 页面 API；接口在 BAM 有登记，但不是 BITS OpenAPI。
# 如果 CLI 失败而页面可操作，优先回到页面处理并带 MR/rule 信息反馈。
# --rule-id 用 `bits mr status --mr-id <optimus-mr-id> --json` 返回的 rule_id
bytedcli --json bits mr code-review reviewer-set \
  --mr-id <optimus-mr-id> \
  --rule-id <rule-id> \
  --reviewer <reviewer-username> \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 多主仓 MR（使用 Optimus API + JWT 认证，适用于 KMP 跨端场景）
# 兼容旧的单 host 输入：--host-* + --mr-dependency
bytedcli --json bits mr create \
  --multi-host \
  --source-branch <source-branch> \
  --target-branch develop \
  --title <title> \
  --type feature \
  --group-name <host-group-name> \
  --host-project-id <host-repo-bits-project-id> \
  --host-source <host-source-branch> \
  --host-target develop \
  --mr-dependency '{"projectId":<sub-repo-bits-project-id>,"sourceBranch":"<branch>","targetBranch":"develop"}' \
  --component '{"hostProjectId":<host-project-id>,"componentId":<kmp-component-id>}' \
  --custom-fields '{"risk_level":"low"}' \
  --meego "https://meego.larkoffice.com/<project-key>/story/detail/<id>" \
  --app-id <bits-space-app-id> \
  --cloud-id <bits-space-cloud-id>

# 高级多 host 输入：重复传 --host，每个 host 自带私有 mrDependencies；顶层 --mr-dependency 继续作为公共子仓依赖保留
bytedcli --json bits mr create \
  --multi-host \
  --source-branch <source-branch> \
  --target-branch develop \
  --title <title> \
  --type feature \
  --group-name <host-group-name> \
  --mr-dependency '{"projectId":300,"sourceBranch":"feature/public-sub","targetBranch":"develop"}' \
  --host '{"projectId":100,"sourceBranch":"feature/host-a","targetBranch":"develop","mrDependencies":[{"projectId":200,"sourceBranch":"feature/sub-a","targetBranch":"develop"}]}' \
  --host '{"projectId":101,"sourceBranch":"feature/host-b","targetBranch":"develop","mrDependencies":[{"projectId":201,"sourceBranch":"feature/sub-b","targetBranch":"develop"}]}' \
  --custom-fields '{"risk_level":"low"}'

# 主子仓 MR（高级：直接传参模式，BITS OpenAPI）
> 不推荐作为主路径。主子仓 + 多子仓场景优先使用下文的“配置文件驱动（`bits mr create-host-sub`）”，参数更少且不易配错。
> 直接传参模式适用于需要手动拼装 payload 或临时验证接口字段的场景。

bytedcli --json bits mr create \
  --host-sub \
  # 注意：bits mr create 会校验 --source-branch（即使 host-sub 下宿主 source 通常为空）
  --source-branch <placeholder-branch> \
  --target-branch develop \
  --title "feat: SDK component upgrade" \
  --type feature \
  --group-name <host-group-name> \
  --host-project-id <host-repo-gitlab-project-id> \
  --host-source "" \
  # 单子仓：--sub-component 可以省略 subRepoKey
  --sub-dependency '{"projectGitlabId":<sub-repo-gitlab-project-id>,"sourceBranch":"<branch>","targetBranch":"develop"}' \
  --sub-component '{"hostProjectId":<host-project-id>,"componentId":<component-id>,"publishType":"sem","versionBase":"1.0.0","versionSuffix":"rc","versionUpgradeType":"patch"}' \
  --sub-component '{"hostProjectId":<host-project-id>,"componentId":<component-id-2>,"versionBase":"2.1.0"}' \
  --meego "https://meego.larkoffice.com/<project-key>/story/detail/<id>" \
  --wip

# 多子仓直接传参模式：每个 --sub-component 必须显式带 subRepoKey（=目标 --sub-dependency 的 projectGitlabId 字符串）
bytedcli --json bits mr create \
  --host-sub \
  --source-branch <placeholder-branch> \
  --target-branch develop \
  --title "feat: multi-SDK upgrade" \
  --type feature \
  --group-name <host-group-name> \
  --host-project-id <host-repo-gitlab-project-id> \
  --host-source "" \
  --sub-dependency '{"projectGitlabId":5275,"sourceBranch":"feature/sdk-a","targetBranch":"develop"}' \
  --sub-dependency '{"projectGitlabId":5276,"sourceBranch":"feature/sdk-b","targetBranch":"develop"}' \
  --sub-component '{"subRepoKey":"5275","hostProjectId":<host-project-id>,"componentId":1335,"versionBase":"1.0.0"}' \
  --sub-component '{"subRepoKey":"5276","hostProjectId":<host-project-id>,"componentId":2222,"versionBase":"2.0.0"}'

# 说明：
# - --host-target 用于 multi-host 场景覆盖宿主 target；host-sub 场景一般只需 --target-branch。
# - --sub-component 缺省 versionBase 时，CLI 默认会按 componentId 自动解析基线版本并回填（取后端 data.versions[0]，
#   对齐 bits component get-base-versions / Bits 组件平台 UI 默认选中；prerelease 如 -alpha.x / -rc.x 也会被采用），
#   --json 输出会新增 auto_version_base 字段（含 enabled / status / resolved / skipped / user_provided）；
#   status 取值：disabled（关闭自动补齐）、not_needed（无组件需要补齐 / 用户已全部显式给出）、
#   fully_resolved（全部由 CLI 自动补齐）、partial_resolved（部分由用户显式提供、其余由 CLI 自动补齐）；
#   user_provided 列出本次调用中用户显式带了 versionBase 的 componentId 集合。
#   如需关闭自动补齐，加 --auto-version-base false。
# - --sub-component.componentId 等价于 component repo_id，可直接复用 bits component get-base-versions 的 --repo-id。
# - 多 --sub-dependency 场景下，每条 --sub-component 必须显式声明 subRepoKey（等于目标 sub-dependency 的 projectGitlabId 字符串），
#   否则 CLI 立即抛 BITS_INPUT_ERROR 并在 hint 中列出 availableSubRepoKeys；单子仓场景可省略。
#   兼容别名：subRepoKey / sub_repo_key / subProjectGitlabId / sub_project_gitlab_id 等价。

bytedcli --json bits mr search --state opened
bytedcli --json bits mr mine --author <user>
bytedcli --json bits mr status --mr-id <mr-id>
bytedcli --json bits mr diff --mr-id <mr-id>
bytedcli --json bits mr diff --mr-id <mr-id> --patch --file "src/path/to/file.ts"
bytedcli --json bits mr review-status --mr-id <mr-id>
bytedcli --json bits mr qa-status --mr-id <mr-id>
bytedcli --json bits mr approve --mr-id <mr-id>
bytedcli --json bits mr disapprove --mr-id <mr-id>
bytedcli --json bits mr remind-review --mr-id <mr-id>
bytedcli --json bits mr remind-qa --mr-id <mr-id>

# 为已有 MR 添加 reviewer
bytedcli --json bits mr reviewer add \
  --mr-id <mr-id> \
  --reviewer alice --reviewer bob \
  --role RD \
  --is-force \
  --reason "manual_add"

# 从已有 MR 移除 reviewer
bytedcli --json bits mr reviewer remove \
  --mr-id <mr-id> \
  --username alice

# 查询 MR 的 reviewer 列表
bytedcli --json bits mr reviewer info --mr-id <mr-id>

# 为 MR 创建 Lark 群聊
bytedcli --json bits mr chat create --mr-id <mr-id>

# 向 MR 的 Lark 群聊中添加用户
bytedcli --json bits mr chat add \
  --mr-id <mr-id> \
  --username alice \
  --member-type reviewer

# 从 MR 的 Lark 群聊中移除用户
bytedcli --json bits mr chat remove \
  --mr-id <mr-id> \
  --username alice

# 解散 MR 的 Lark 群聊
bytedcli --json bits mr chat dismiss --mr-id <mr-id>

# 查询 MR 产物包（package groups）
bytedcli --json bits mr packages --project-id <project-id> --mr-iid <mr-iid>
bytedcli --json bits mr packages --project-id <project-id> --mr-iid <mr-iid> --limit 10 --last-id <last-id>

# 查询 MR 下各子仓组件发布产物（host MR 自动展开为所有子仓 MR 后聚合）
# 既可传主仓（host）MR id，也可直接传子仓（sub）MR id；host MR 会通过 relation/list
# 自动展开为所有子仓 MR 并并发查询，sub MR 直接单查。
# 文本模式按子仓维度聚合相同字段为 Summary（status / version / version_base /
# release_info / log_url / pod_source / tt_repos），组件表只保留身份列。
bytedcli --json bits mr publish-records --mr-id <host-or-sub-mr-id>

# 可选：仅在已知子仓 group_name / project_gitlab_id 时补传，便于强制走特定 host
bytedcli --json bits mr publish-records \
  --mr-id <host-or-sub-mr-id> \
  --group-name <host-group-name> \
  --project-id <host-project-gitlab-id>

# 更新已有 MR：标题 / 描述 / WIP 状态 / 自定义字段
bytedcli --json bits mr update \
  --mr-id <mr-id> \
  --title "<new title>" \
  --description "<new description>" \
  --custom-fields '{"CASE_STUDY":"https://example.com/cs/123"}'

# 给已有 MR 追加绑定 Meego 工作项（URL 模式，自动解析 projectKey 和 type）
# 与 `mr create --meego` 等价，但作用在已经创建好的 MR 上
bytedcli --json bits mr update \
  --mr-id <mr-id> \
  --meego "https://meego.larkoffice.com/larksuite/issue/detail/7310890683"

# 注意 type 语义：Meego URL 里的 story=需求、issue=缺陷；
# Bits bind 接口里 task_type=issue 表示需求，task_type=bug 表示缺陷。

# 给已有 MR 追加绑定 Meego 工作项（ID 模式，需指定 type 和 project-key）
bytedcli --json bits mr update \
  --mr-id <mr-id> \
  --meego 7310890683 \
  --meego-type bug \
  --meego-project-key larksuite

# 多仓合码：查询完整 workflow / job 列表
bytedcli --json bits client workflow pipeline from-mr --mr-id <mr-id> --include-dependencies
```

`bits mr diff` 需要本地可用的 Codebase 登录态；优先复用 `bytedcli auth login` 的 SSO 会话，也支持 `bytedcli codebase auth config-add-pat <pat>`。

### 主子仓 MR — 配置文件驱动（create-host-sub）

适用于单宿主仓 + 多子仓的客户端 SDK 组件发版场景：从多个子仓收集 `.host-sub-mr.json`，自动拉取组件版本并创建主子仓 MR。

**前置条件**：`CLIENT_BITS_TOKEN` 已设置，且各仓库 source branch 已 push 到远端。

**推荐目录组织**：

- 宿主仓（例如 `commerce_demo`）根目录：`.host-sub-mr.json` 只放 `host`
- 每个子仓根目录：`.host-sub-mr.json` 只放 `sdk`

```json
// 宿主仓 .host-sub-mr.json
{
  "host": {
    "group_name": "commercial_sdk_demo",
    "project_gitlab_id": 414226,
    "target": "develop",
    "testing_group_name": "commercial_sdk_demo"
  }
}
```

```json
// 子仓 .host-sub-mr.json
{
  "sdk": {
    "display_name": "开屏 SDK",
    "sub_project_gitlab_id": 5275,
    "sub_target": "develop",
    "repo_ids": [1335, 45928, 40861],
    "publish_type": "sem",
    "version_suffix": "rc",
    "version_upgrade_type": "patch"
  }
}
```

**执行示例**：

```bash
# 多子仓联合发版：从多个子仓收集配置，合并发起一个 MR
# --sub-repo 支持 path:branch 格式为每个子仓指定独立分支
bytedcli --json bits mr create-host-sub \
  --host-config /path/to/host-repo \
  --sub-repo /path/to/splash_ad_sdk:feature/splash-v2 \
  --sub-repo /path/to/ad_base_sdk:feature/ad-base-v3 \
  --host-source release/1.0 \
  --title "feat: 联合升级" \
  --type feature

# 各子仓同分支：用 --sub-source 统一指定（此时每个 --sub-repo 不必带 :branch）
bytedcli --json bits mr create-host-sub \
  --host-config /path/to/host-repo \
  --sub-repo /path/to/splash_ad_sdk \
  --sub-repo /path/to/ad_base_sdk \
  --sub-source feature/xxx \
  --host-source release/1.0 \
  --title "feat: 联合升级"
```

**配置文件格式**（`.host-sub-mr.json`）：

- **子仓独立格式（推荐）**：`{ "sdk": {...} }`
- **宿主仓独立格式（推荐）**：`{ "host": {...} }`
- **全量格式（兼容）**：`{ "host": {...}, "sdks": { "sdk_name": {...} } }`

**关键选项**：

| 选项                         | 说明                                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| `--host-config <path>`       | 宿主仓目录或配置文件路径（必填）                                                            |
| `--sub-repo <path[:branch]>` | 子仓目录路径，可带分支 `path:branch`，可重复（必填）                                        |
| `--sub-source <branch>`      | 子仓统一分支（当不是每个 --sub-repo 都带 :branch 时必填）                                   |
| `--host-source <branch>`     | 宿主仓源分支（可选）                                                                        |
| `--title <text>`             | MR 标题（必填）                                                                             |
| `--type <type>`              | MR 类型：feature / bug / optimize / merge / lab / package / patch / slardar（默认 feature） |
| `--meego <url>`              | 绑定 Meego 工作项，可重复                                                                   |
| `--meego-type <type>`        | Meego 工单类型：bug / feature（当 --meego 传纯 ID 时必填）                                  |
| `--meego-project-key <key>`  | Meego 项目标识（当 --meego 传纯 ID 时必填）                                                 |
| `--no-wip`                   | 不标记 WIP                                                                                  |
| `--no-remove-source`         | 合并后保留 source 分支                                                                      |

**成功输出**：返回 `mr_link`（MR 链接），用于后续流转/通知。

### 主子仓 MR — 追加子仓（add-sub）

适用于已经创建好的主子仓 MR（`mr create --host-sub` 或 `mr create-host-sub`），后续再追加一个新的子仓 MR 依赖。**一次只追加 1 个子仓**；多个子仓需循环调用。

不承载 Meego 绑定；若需要补 Meego 关联请用 `bits mr update --meego ...`。

```bash
# 追加 1 个子仓到已有主子仓 MR
bytedcli --json bits mr add-sub \
  --mr-id 12345 \
  --host-project-id 414226 \
  --group-name commercial_sdk_demo \
  --sub-dependency '{"projectGitlabId":2001,"sourceBranch":"feature/demo","targetBranch":"develop"}' \
  --sub-component '{"componentId":1335}'

# --host-project-id 可省略：handler 会按 --mr-id 反查主 MR 的 project_id
bytedcli --json bits mr add-sub \
  --mr-id 12345 \
  --group-name commercial_sdk_demo \
  --sub-dependency '{"projectGitlabId":2001,"sourceBranch":"feature/demo","targetBranch":"develop"}'
```

**关键选项**：

| 选项                                | 说明                                                                                             |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `--mr-id <id>`                      | 已存在的主子仓 MR ID（必填）                                                                     |
| `--group-name <name>`               | 主仓 Bits 空间 group_name；缺省时读取 `.bits/project_config.json`                                |
| `--host-project-id <id>`            | 主仓 GitLab project id；省略时按 `--mr-id` 反查                                                  |
| `--sub-dependency <json>`           | 待追加的子仓依赖 JSON（**恰好 1 条**）。必须包含 `projectGitlabId / sourceBranch / targetBranch` |
| `--sub-component <json>`            | 该子仓内的组件升级 JSON，可重复；`hostProjectId` 可省略（fallback 到 `--host-project-id`）       |
| `--auto-version-base [true\|false]` | 缺省 `true`：缺 `versionBase` 的组件自动拉取基线版本                                             |

**成功输出**：返回 `{ host_sub_append: true, mr_id, appended_sub: { project_gitlab_id, source_branch, target_branch, components_count, status: "success" } }` 以及原始响应。

### Component 相关

提供客户端组件（如 iOS/Android 模块、跨端库等）在 Bits 平台的生命周期管理、升级与查询能力。支持的核心功能包括：

- **组件库基础查询**：根据 ID、名称或搜索条件查找组件库信息。
- **组件版本与升级管理**：执行组件升级 (`upgrade-repo`)、查询组件基准版本以及自动获取下个合理语义化版本号。
- **升级历史追溯**：根据 ID 或版本号获取某次升级的详细信息及关联构建任务流。
- **标签与关联检索**：查询平台组件标签、特定组件绑定的标签，以及获取目标组件的相关依赖和关联组件信息。

详情和所有命令用例请参考专属文档：

- `references/component.md`

### 应用中心 — 创建 Gecko PSM 并绑定已有 channel

`bits appcenter gecko create` 在 Bits 应用中心创建 Gecko 混合应用（Gecko PSM）并**绑定已有的 Gecko channel**，对应应用中心 `POST /api/v2/appcenter/creation/create_component`（`componentType=hybrid_component`），认证走 ByteCloud JWT（与 `bits component`/`bits mr` 的 OpenAPI token 链路不同，无需 Bits OpenAPI token）。

```bash
# 最小创建：仅必填 --name
bytedcli bits appcenter gecko create --name demo-gecko-psm
# 创建并绑定已有 channel（--channels 接收 JSON 数组）
bytedcli bits appcenter gecko create \
  --name demo-gecko-psm \
  --framework lynx \
  --node-id 12345678 \
  --space-id 87654321 \
  --git-full-name demo/demo_web_monorepo \
  --scm-name demo/demo/lynx_cards \
  --channels '[{"region":"tt-row","deploymentId":"7","channelId":"111111"},{"region":"us-ttp","deploymentId":"1","channelId":"222222"}]'
```

- `--name`：必填，Gecko PSM / 组件名称。
- `--framework`：框架方案 key（对应 `solutionKey`），默认 `lynx`。
- `--node-id`：服务树节点 ID；`--space-id`：关联空间 ID。
- `--git-full-name`：Git 仓库全名；`--scm-name`：SCM 名称。
- `--no-with-exist-scm` / `--no-with-exist-codebase`：默认复用已有 SCM 与 Codebase，加 `--no-*` 可关闭。
- `--is-mono` / `--mono-sub-path`：mono repo 及其子路径。
- `--channels`：JSON 数组，每项必填 `region`、`deploymentId`、`channelId`（要绑定的已有 channel 的 region 维度 id）；可选 `withExistChannel`（默认 `true`）。绑定多个 region/deployment 时各写一项。
  - `region` 既可传应用中心 provider key（`tt-row`/`tt-eu`/`tx`），也可直接传 Gecko channel 元数据里的别名（`row`/`eu-ttp`/`us-ttp`），命令会自动归一化（`row→tt-row`、`eu-ttp→tt-eu`、`us-ttp→tx`）。CN 暂未内置映射，需自行确认 CN 的 provider region key 后直接传规范值。
- 成功返回创建记录 ID（`id`，后端未返回时为 `null`，同时透出原始 `raw`）。

#### 易踩坑（实测沉淀）

- **`channelId` 取的是 region 维度的 `channelRegionId`，不是 channel meta id（平台无关原则）**：`--channels` 每项的 `channelId` 必须是某个 region+deployment 维度的 `channelRegionId`；一个 channel 名在 N 个 region × M 个 deployment 下会有 N×M 个 `channelRegionId`，每个都要作为一项写进 `--channels`（例如 3 region × 4 deployment = 12 项）。误把 channel meta id（一个 channel 名通常只有几个）当 `channelId` 传是最常见错误。
  - **TikTok Gecko 取数示例（仅适用于 TikTok 平台的 channel）**：先 `tiktok-gecko channel list --name <channel>` 找到 channel（其 `metaIdList` 是 channel meta id，**不能**直接用），再对每个 meta id 调 `tiktok-gecko channel get --channel-id <metaId>`，从 `detail.metaData.regions[].data[].channelRegionId` 逐个取值。
  - **其它 gecko 平台**（CN gecko 等）的 channel 不走 `tiktok-gecko` 命令，需从对应平台来源取 `channelRegionId`，且 region 需自行确认 provider region key（CLI 未内置 CN 映射）。
- **返回的 `id` 是创建记录 ID，不是最终 Gecko PSM / componentId**：不能用它拼 `hybrid_component:gecko_<id>` 去查 `component_summary`（会 not found）。最终 Gecko PSM 由后端异步生成，需稍后在应用中心按 `--name` 查看。
- **create 不幂等**：相同 `--name` 重复执行会创建多个组件，后端不报冲突；CLI 暂无 update/delete，重复或参数填错（如漏 `--space-id`/`--node-id`）只能去应用中心页面手动改/删。
- **参考组件的 `--space-id`/`--node-id` 无法从 `component_summary` 获取**：该接口不返回 `nodeId`、`spaceId` 常为空，需从应用中心组件页 / 服务树侧取真实值再传入。

### Client 子域

`bits client` 提供三组客户端 OpenAPI 子域：

- `bits client workflow`
  - workflow job、pipeline template、开发任务流水线
- `bits client integration`
  - 集成区版本、合入队列、封版报告、版本群
- `bits client calendar`
  - 版本日历 workspace、event、segment、mark

详情和所有命令用例请参考专属文档：

- `references/client.md`

其中 workflow 相关 OpenAPI 已经统一收口到 `bits client workflow`，不再单独保留根级 `bits workflow` 入口。

### AI 用例生成

从飞书 PRD 文档触发 AI 测试用例生成（异步，结果 5-15 分钟后在 Bits 平台查看）。

```bash
bytedcli bits case generate \
  --devops-id <space-id> \
  --dir-id <dir-id> \
  --prd-link "https://bytedance.larkoffice.com/docx/example" \
  --case-title "example-feature"

# 关闭严格模式 + 补充文档
bytedcli bits case generate \
  --devops-id <space-id> \
  --dir-id <dir-id> \
  --prd-link "https://bytedance.larkoffice.com/docx/example" \
  --no-strict-mode \
  --supplement-links "https://bytedance.larkoffice.com/docx/tech-doc"
```

### 用例上传

使用 Markdown 内容上传测试用例，支持指定文件内容或文件地址；未传 `--case-id` 时将新建用例集。需要提供 `--model-name`（联系 lixihe.lj 获取）。默认 `isStrictMode=false`；需要严格模式时显式传 `--strict-mode`。

```bash
bytedcli bits case upload \
  --devops-id <space-id> \
  --dir-id <dir-id> \
  --case-id <case-id> \
  --case-title "example-feature" \
  --model-name "example-model" \
  --md-content "# Title\\n- item"
bytedcli bits case upload \
  --devops-id <space-id> \
  --dir-id <dir-id> \
  --case-title "example-feature" \
  --model-name "example-model" \
  --strict-mode \
  --md-file ./example.md
```

### 更新泳道

```bash
bytedcli bits develop update-lane \
  --dev-id 123456 \
  --lane new_lane \
  --idcs lf,lq \
  --dry-run
```

### 更新 develop 任务

```bash
# 注意：传入 --change 时，会按 --change 列表重置关联项目（未包含的项目会被移除）
bytedcli bits develop update \
  --dev-id 123456 \
  --lane ppe_test \
  --name "demo develop title" \
  --change "service=example.service.api,branch=codex/demo" \
  --change "service=example.service.worker,branch=codex/worker" \
  --dry-run
```

### 绑定分支

```bash
bytedcli bits develop bind-branch \
  --dev-id 123456 \
  --branch codex/feature \
  --git-repo stone/coze-coding \
  --services example.service.api \
  --dry-run
```

### 绑定开发单到发布单

```bash
bytedcli bits develop bind-release \
  --dev-ids 2143012,2143013 \
  --release-ticket-id 1130150230274 \
  --dry-run
```

### 从研发任务推进到发布

`bits develop publish` 对应 BITS 研发任务页面上的“发布”按钮，用于 1:1 DevTask 发布链路。它会优先读取 DevTask 已关联的发布单并带上 `releaseTicketId`；如果还没有关联发布单，则不会另行创建空发布单，而是通过 DevTask 的发布阶段推进接口交给 BITS 生成/关联。

```bash
bytedcli bits develop publish --dev-id 2402911 --dry-run
bytedcli bits develop publish --dev-id 2402911
```

#### Agent Guidance：发布要先认领状态机（DevTask vs 发布单）

DevTask 工作流和发布单工作流是两条独立状态机。研发任务页面上的“发布”按钮属于 **DevTask** 状态机，对应命令是 `bits develop publish`（底层推进 `DevReleaseStage`），不是 `bits release` 下的命令。

- 关键陷阱：发布单**已经存在**并不代表它已接管整条链路。只要 DevTask 的发布交接还没完成，写操作依旧归 `bits develop`。看到发布单已存在就切到 `bits release status-operation` / `bits release pipeline run` 是错误路径。
- 当某次发布源自 BITS 研发任务时，优先先查 DevTask：`bytedcli --json bits develop get --dev-id <dev-id>`；推进前用 dry-run 探一次 `bytedcli --json bits develop publish --dev-id <dev-id> --release-ticket-id <release-ticket-id> --dry-run`，能解析出 `releaseTicketId` 就说明这才是“发布”按钮的正确入口。
- 只有 DevTask 发布交接完成、发布单 integration 也完成后，才切到发布单侧只读轮询（`bits release get` / `bits release stages` / `bits release stage pipeline` / `bits release stage deploy-overview`）。

为防止误操作，`bits release pipeline run` 现在会先做 can-run 预检：当后端 `canRun=false` 时命令直接 fail fast（`BITS_RELEASE_PIPELINE_NOT_RUNNABLE`），在 `hint` 里给出“先查 DevTask / 改用 `bits develop publish`”的修复建议，并在 `details.pipeline_not_runnable_reason` 暴露原因码，而不再返回一个看似成功、实则空跑的结果。确认发布单确实已接管该状态转移时，可加 `--force` 跳过预检强制运行。

### 处理 gatekeeper 检查项（skip / approve / reject）

`bits develop gatekeeper` 用于查看并处理研发任务某个阶段的 gatekeeper 检查项；它是推进 `pass-stage` 的前置入口。先用 `list` 拿到 `checkID`，再按检查项性质 skip / approve / reject：

```bash
# 1. 先列出当前阶段的 gatekeeper 检查项，拿到 checkID（--stage 默认 DevDevelopStage，准入阶段传 DevAccessStage）：
bytedcli bits develop gatekeeper list --dev-id 2383814
bytedcli bits develop gatekeeper list --dev-id 2383814 --stage DevAccessStage
# 2. 跳过可跳过的检查项（例如人工质量门禁）：
bytedcli bits develop gatekeeper skip --check-id 56616946794978 --reason "manual ops downgrade"
# 传 --dev-id 时，skip 后会回读 --stage 指定阶段（不传默认 DevDevelopStage）确认 check 已变为成功；
# 若后端返回 success 但门禁仍 failed，命令会报错而不是误报成功：
bytedcli bits develop gatekeeper skip --check-id 56616946794978 --dev-id 2383814 --stage DevAccessStage --reason "manual ops downgrade"
# 3. 通过人工检查项；--always 表示后续运行也始终通过：
bytedcli bits develop gatekeeper approve --check-id 56616946794978 --reason "looks good"
bytedcli bits develop gatekeeper approve --check-id 56616946794978 --reason "permanent waiver" --always
# 4. 驳回人工检查项：
bytedcli bits develop gatekeeper reject --check-id 56616946794978 --reason "not acceptable"
```

写操作（skip / approve / reject）的 operator 默认取当前 ByteCloud 登录用户，可用 `--operator` 覆盖；都支持 `--dry-run` 先打印请求体。`skip` 不传 `--dev-id` 时只提交 skip 请求；传 `--dev-id` 时会在请求成功后回读 `--stage`（默认 `DevDevelopStage`），确认目标 `checkID` 已变为 `CheckStatusSuccess`，避免后端接受请求但门禁未生效的 no-op 被误判为成功。单独传 `--stage` 不会触发验证，因为回读必须知道研发任务 `--dev-id`。

#### Agent Guidance：pass-stage 被 QCSS pending 阻塞

`bits develop pass-stage`（以及底层同一推进链路）遇到 QCSS 人工检查项未处理时，BITS 会返回 `bits_code 125536`（QCSS pending）。这种情况下命令会在错误里附带可直接复制的修复命令（`hint` + `details.setup_commands`），不需要再上网页或找 OnCall。处理对应的 QCSS 人工检查项后，重试同一条 `pass-stage` 即可。其中 `<space_id>` 取自 BITS workspace URL 上的 space id：

只有 QCSS 类检查项才走 `bytestable qcss manual pass`（发布期 final_result 卡住走 `qcss final-result pass`）。非 QCSS 的人工 gatekeeper 检查项现在可以直接用上面的 `bits develop gatekeeper {skip,approve,reject}` 处理（先 `gatekeeper list` 拿 `checkID`），处理后再重试 `pass-stage`，不必绕 qcss 命令。

```bash
# QCSS pending（125536）时，先处理人工项再重试 pass-stage：
bytedcli bytestable qcss manual pass --space-id 123456789 --dev-id 2402911
# 处理完成后重试：
bytedcli bits develop pass-stage --dev-id 2402911 --stage DevDevelopStage
# 发布期 QCSS final_result 卡住时，走 final-result 放行：
bytedcli bytestable qcss final-result pass --psm example.psm --pipeline-id 123456789 --meego-id 7000000001 --code-repo example/repo --branch-name master --addition-info "Code-only release. No TCC config change."
# 变更观测节点需要人工继续发布时，用 job-run continue-release：
bytedcli bits job-run continue-release --job-run-id 123456789 --pipeline-run-id 987654321
# rds_edit 等需要表单状态回传的节点，通过 --display-params 注入：
bytedcli bits job-run continue-release --job-run-id 123456789 --pipeline-run-id 987654321 --method-name UserDefinedMethod --display-params '[{"type":"RdsForms","modify_infos":[{"work_type":"DDL","sql":"CREATE TABLE ...","database":"demo_db","regions":["cn"]}]}]'
```

### 发布相关

```bash
# 按名称搜索发布工单（只有 workspace/space id + 工单名时，先搜出 ticket id）
# search.name 为关键词模糊匹配；不传 --name 则列出该 workspace 下全部发布工单。
# 返回每条工单的 ticket id / name / status / current stage / creator，拿到 ticket id 后再 get。
bytedcli bits release search \
  --workspace-id 4084696834 \
  --name "token修改发布"

# 查询发布工单详情
bytedcli bits release get --ticket-id <release-ticket-id>

# 查询发布工单阶段（id / name / type / status / pipeline count）
bytedcli bits release get-stages --ticket-id <release-ticket-id>

# 查询发布工作流
bytedcli bits release list-workflows \
  --workspace-id 150900021762 \
  --keyword "快速发布"

# 获取发布表单 schema
bytedcli bits release form-schema \
  --workspace-id 150900021762 \
  --workflow-id 162749140482

# 创建发布工单
bytedcli bits release create-ticket \
  --workspace-id 150900021762 \
  --workflow-id 162749140482 \
  --name "v1.0.0 发布" \
  --release-approvers "demo.user,bob" \
  --projects-json '[...]'

# 发布单集成阶段推进 / 状态修复；所有命令都支持 --body/--body-file 传完整后端 body
bytedcli bits release start-integration --ticket-id <release-ticket-id>
bytedcli bits release complete-integration \
  --ticket-id <release-ticket-id> \
  --operator <username> \
  --cancel-running-development-task 2
bytedcli bits release status-operation \
  --ticket-id <release-ticket-id> \
  --status <status-code> \
  --operator <username>
bytedcli bits release cancel \
  --ticket-id <release-ticket-id> \
  --operator <username> \
  --cancel-reason "not needed"
# cancel 默认使用平台取消原因类型；如需传完整后端 payload，用 --body/--body-file
bytedcli bits release check-status-recover \
  --ticket-id <release-ticket-id>

# 查询发布阶段 / 项目配置
bytedcli bits release stages --ticket-id <release-ticket-id>
bytedcli bits release project-configs \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id>

# 查询阶段流水线和准入信息
bytedcli bits release stage pipeline \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --control-plane 1
bytedcli bits release stage check-info \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id>
bytedcli bits release stage progress \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id>

# 触发阶段检查 / 阶段操作 / 重建阶段流水线
bytedcli bits release stage check \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --operator <username>
bytedcli bits release stage force-check \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id>
bytedcli bits release stage force-check-backward \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --control-plane 1
bytedcli bits release stage operation \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --operate-type NODE_OPERATE_TYPE_FINISH \
  --username <username>
bytedcli bits release stage force-rebuild-pipelines \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id>
bytedcli bits release stage recreate-pipelines \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id>

# 查询 change item 检查结果 / 部署策略；TCE 热部署 surgeConfig 可用 set-surge 快速更新
bytedcli bits release change-item check-result \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --project-unique-id <psm-or-web-name> \
  --project-type 1 \
  --control-plane 1
bytedcli bits release change-item deploy-strategy get \
  --ticket-id <release-ticket-id> \
  --project-unique-id <psm-or-web-name> \
  --project-type 1 \
  --control-plane 1
bytedcli bits release change-item deploy-strategy set-surge \
  --ticket-id <release-ticket-id> \
  --project-unique-id <psm> \
  --project-type 1 \
  --control-plane 1 \
  --username <username> \
  --disable-surge \
  --surge-percent 25 \
  --min-ready-second 10

# 查询 / 锁定 release integration 项目。TCE 项目默认 PROJECT_TYPE_TCE / CONTROL_PLANE_CN。
bytedcli bits release integration lock-info \
  --integration-id <integration-id> \
  --project-unique-id <psm-or-web-name> \
  --project-name <project-name>
bytedcli bits release integration lock \
  --integration-id <integration-id> \
  --release-ticket-id <release-ticket-id> \
  --project-unique-id <psm-or-web-name> \
  --project-name <project-name>

# 查询并运行发布 pipeline。Web/前端发布常需要 --use-change-items，TCE 发布若依赖策略则加 --attach-deploy-strategy。
# pipeline run 会先做 can-run 预检：canRun=false 时直接报错并提示改用 bits develop publish；确认发布单已接管时可加 --force 跳过。
bytedcli bits release pipeline change-items \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --control-plane 1
bytedcli bits release pipeline run \
  --ticket-id <release-ticket-id> \
  --stage-id <stage-id> \
  --username <username> \
  --control-plane 1 \
  --use-change-items \
  --attach-deploy-strategy

# 查询 / 处理质量门禁风险任务。skip/skip-approval 支持 --body 或 --body-file 传完整后端 body。
bytedcli bits release risk summary --ticket-id <release-ticket-id>
bytedcli bits release risk latest-task \
  --business-key <business-key> \
  --deployment-key <deployment-key> \
  --detect-provider 1
bytedcli bits release risk skip \
  --business-key <business-key> \
  --deployment-key <deployment-key> \
  --detect-provider 1 \
  --reason "FTF skipped for this launch"
bytedcli bits release risk manual-confirm \
  --business-key <business-key> \
  --operator <username> \
  --comment "confirmed"
```

### Anywheredoor — 设备抓包监控、share 链接、curl 转换与 mock

`bits anywhere` 原有能力是设备抓包监控与 capture-to-curl：`listen` / `status` / `watch` / `get` / `stop`。这个命令树也支持 share 链接解析、设备选择、mock 查询/维护、filter 与 black path 查询。完整命令与安全规则见 `references/anywheredoor.md`。

实现要点：

- 先用 `device list` 选真实设备；`did=0` 只适合部分只读查询，不适合 create/enable/delete mock 这类写操作。
- `watch` 默认走 HTTP 轮询模式（`--mode poll`），每 1.5s 拉一次 `/web-apis/proxy/v1/history` 的滑动窗口（默认 30s），按 capture id 去重，仅打印新增。
- `--url-path` 在客户端做 substring 匹配，同时把过滤值的最长 path segment 作为 backend hint 收窄响应（backend `path=` 是 per-segment 子串，多 segment 切片不识别）。
- backend 默认 10 分钟无续期会自动停止抓包；watch 超时后会拉不到新数据，需要重跑 `bits anywhere listen` 续期。
- `--mode ws` 仅作为 WebSocket 协议研究 escape hatch；实测 server 对非浏览器指纹连接 silently 拒推送，**不要在生产场景使用**。
- `share get --url <url>` 是只读查询：单条链接包含 `_proxy_share_item_id` 和 `appId`，可加 `--curl`；批量链接包含 `_proxy_share_items_id`，返回原始分享数据。
- `mock create-local`、`mock enable`、`mock disable`、`mock delete` 都是写操作，必须显式加 `--yes`；调试时优先创建 disabled 临时 mock，验证后删除。
- `mock create-local` 可用 `--query-filter key=value` 精准限制 query 参数；CLI 会生成 Anywheredoor backend 使用的 `content[0].extra_filter` JSON 字符串。复杂场景可传 `--extra-filter '<json-object>'`，但不要和 `--query-filter` 混用。

```bash
# 列出 app 下已授权设备
bytedcli bits anywhere device list --app-id 1234

# 启动抓包（10 分钟自动停止）
bytedcli bits anywhere listen \
  --app-id 1234 --did 1234567890123456

# 查询当前抓包状态
bytedcli bits anywhere status \
  --app-id 1234 --did 1234567890123456

# 实时监控某个 path 的 capture 并打印 curl（Ctrl+C 停止）
bytedcli bits anywhere watch \
  --app-id 1234 --did 1234567890123456 \
  --url-path /api/demo \
  --show-curl

# 把最近 30 分钟内 path 含 /api/demo 的 capture 全部 dump 出来
bytedcli bits anywhere watch \
  --app-id 1234 --did 1234567890123456 \
  --window-sec 1800 --include-snapshot \
  --url-path /api/demo

# 单条 capture 转 curl（已知 history_id + env，envcode 来自 list 中的 env 字段）
bytedcli bits anywhere get \
  --app-id 1234 --did 1234567890123456 \
  --history-id 1447858190 --env 8 --curl

# 从任意门 share 链接读取单条 capture，并转换为 curl
bytedcli bits anywhere share get \
  --url 'https://example.com/anywheredoor/proxy/share?appId=1234&_proxy_share_item_id=1447858190&env=8' \
  --curl

# 从任意门批量 share 链接读取原始数据
bytedcli --json bits anywhere share get \
  --url 'https://example.com/anywheredoor/proxy/share?appId=1234&_proxy_share_items_id=sample-share-id'

# 立即释放代理资源（不等 10 分钟自动停）
bytedcli bits anywhere stop \
  --app-id 1234 --did 1234567890123456

# 查询 local mock 列表
bytedcli bits anywhere mock list \
  --app-id 1234 --did 1234567890123456 \
  --type local --page-size 20

# 创建 disabled 的 local mock；确认后才执行写入
bytedcli bits anywhere mock create-local \
  --app-id 1234 --did 1234567890123456 \
  --name sample-local-mock \
  --method GET \
  --url-path /api/demo \
  --query-filter app=1 \
  --query-filter version_code=123456 \
  --body '{"ok":true}' \
  --serializer json \
  --yes

# 启停或删除 mock 都要明确确认
bytedcli bits anywhere mock enable \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --yes
bytedcli bits anywhere mock disable \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --yes
bytedcli bits anywhere mock delete \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --yes

# 查询 filter / black path
bytedcli bits anywhere filter get \
  --app-id 1234 --did 1234567890123456
bytedcli bits anywhere black-path get --app-id 1234
```

`watch` 输出列：`id`、`path`、`log_id`、`env`，可作为 `get --history-id <id> --env <env>` 的输入。
配合 `--show-curl` 或 `share get --curl` 可以直接拷贝得到的 `curl` 在本地复现请求（已自动剥离 `Host` / `Content-Length` / `Accept-Encoding` 等 curl 自管头，并把 cookies 合并成 `-b`）。

## Notes

- 需要结构化输出加 `--json`
- `bits develop list` 需要显式传 `--space-id`；`--work-items` 选填
- `bits develop list --state` 支持 `opened,closed,finished`，多个值用逗号分隔
- `bits develop list --created-at` 使用时间戳区间 `startTs,endTs`
- `--change` 格式：`service=<PSM>,branch=<sourceBranch>[,target=<targetBranch>][,scm=<scmName>][,mr=<iid>]`
- `--var` 可重复，格式：`name=value`
- `--title` 可省略：当同时传了 `--meego` 时，CLI 会自动从 Meego 工单获取标题填充；省略 `--title` 且无法从 Meego 获取时报错
- `--team-flow-id` 显式覆盖开发单创建时的 `teamFlowId`；当 `--dev-task-template-id` 与来源模板不一致时，CLI 不再默认继承旧模板的 `teamFlowId`
- `--env-setting-map-json` 用于覆盖创建接口的 `envSettingMap` 参数
- `--dry-run` 只打印 payload 不实际创建
- `mr create` 用于基于 source/target branch 创建客户端 BITS MR；至少需要 `source-branch`、`target-branch`、`title`
- `mr create --type` 支持 `feature | bug | optimize | merge | lab | package | patch | slardar`，默认 `optimize`
- `mr create --wip [true|false]` 可设置是否 WIP；只传 `--wip` 等价于 `--wip true`
- `mr create --remove-source <true|false>` 可设置合并后是否移除 source branch，默认 true；也支持 `--no-remove-source`
- `mr create --squash-commits [true|false]` 可设置合并时是否 squash commits；只传 `--squash-commits` 等价于 `true`，配合 `--squash-commit-message <message>` 可自定义 squash commit message。不传时不在请求中携带，保持空间默认行为；该能力按 Bits 空间配置开关，未开启 squash 的空间会忽略该字段。默认单仓、`--platform`/multi-host、host-sub 三种创建模式均支持
- 如果仓库上下文无法自动推断，还需要补 `--group-name` 或 `--project-id`
- `mr get-custom-fields` 会读取 Bits 空间 `create_mr` 表单字段，并输出可传给 `mr create --custom-fields` 的默认 custom fields；`mr create` 不会自动补默认字段
- `mr create --platform` 启用平台 MR 模式（Optimus API + JWT），用于在客户端空间创建单仓 MR 并走平台评审流程；与默认单仓模式（BITS OpenAPI）走不同链路，且不要求子仓依赖
- 平台 MR 的 `--group-name` 与 `--host-project-id`（GitLab project ID）在仓库存在 `.bits/project_config.json`（含 `group_name` / `project_gitlab_id`）时自动读取、可省略；建议带 `--app-id` / `--cloud-id`（对应 `x-bits-auth-appid` / `x-bits-auth-appcloudid`）；认证只依赖 SSO 登录态，不需要 `CLIENT_BITS_TOKEN`
- `mr code-review` 的 `start` / `approve` / `gitlab` / `rules` / `reviewer-set` 子命令的 `--mr-id` 都是同一个数字：创建平台 MR 时返回的 `optimus_mr_id`，等同于 bits `code/detail/<id>` 页面 URL 里的那个数字（参见 `src/api/bits/mr-optimus.ts` 里 `mr_link` 的拼接逻辑）；不要把它跟 BITS OpenAPI 的 legacy `mr_id` 混淆
- `mr code-review start` 对平台 MR 发起代码评审（Optimus API）
- `mr code-review start` 的 reviewer：简单场景用可重复的 `--reviewer` + `--rule`（`BRANCH_REVIEWER` 时 `--rule` 为分支名），多 scope 或复杂规则用可重复的 `--review-info` JSON；`--group-name` / `--project-id` 缺省时回退 `.bits/project_config.json`，`--operator` 缺省时取当前 SSO 用户
- 不确定 reviewer scope / role / rule 取值时，先跑 `mr code-review rules --mr-id <optimus-mr-id>` 拉取候选规则与可选 reviewer，再据此组装 `mr code-review start` 的 `--reviewer` / `--rule` 或 `--review-info`
- `mr code-review approve` 通过平台 MR 的代码评审；存在待处理评审变更时需显式加 `--always-approve` 才会强制通过
- `mr code-review gitlab` 把平台 MR 反查成底层 Bits-Code (GitLab) MR 信息（project / iid / 分支 / web URL），便于切到 GitLab 仓库做评审或评论；后端走 `/api/merge_request/branch` 接口（`dev_id` 字段），CLI 入参统一为 `--mr-id`
- `mr code-review rules` 拉取“发起代码评审前”的 reviewer 规则配置（scope / role / rule / 候选人），结果可作为 `mr code-review start` 中 `--reviewer` / `--rule` / `--review-info` 的输入来源；可选 `--fetch-mode <int>`，默认 `0` 表示当前规则集
- `mr code-review reviewer-set` 用于修改当前代码评审中某条已命中规则选中的 reviewer：先用 `mr status --mr-id <id> --json` 查看 `review_detail.mr_rule_results[].rule_results[]` 里的 `rule_id`，再传 `--rule-id` 和一个或多个 `--reviewer`；用户名会自动补成 `@bytedance.com` 邮箱，已传邮箱则原样保留；如果同时存在 `config_rule_id`，以 `rule_id` 为准
- `mr create --multi-host` 启用多主仓模式（Optimus API + JWT），适用于 KMP 跨端场景中 bits 宿主仓检测拦截单仓 MR 的情况
- `mr create --host-sub` 启用主子仓模式（BITS OpenAPI），适用于单宿主仓+多子仓的客户端 SDK 组件发版场景
- 主子仓模式的子仓嵌套在 hosts[0].mr_dependencies 中，组件版本嵌套在 mr_dependencies[0].components 中
- 主子仓模式必须提供 `--host-project-id`（宿主仓 GitLab project ID）和至少一个 `--sub-dependency`（子仓 JSON）
- `--sub-dependency` JSON 字段：`projectGitlabId`（必填）、`sourceBranch`（必填）、`targetBranch`（可选，默认取 --target-branch）
- `--sub-component` JSON 字段：`hostProjectId`（必填）、`componentId`（必填）、`publishType`（默认 sem）、`versionBase`、`versionSuffix`（默认 rc）、`versionUpgradeType`（默认 patch）
- `--sub-component` 可重复，所有 component 会自动挂到 sub-dependency 下
- 单 `--sub-dependency` 场景下 `--sub-component` 可省略 `subRepoKey`，组件天然全部归属唯一子仓
- 多 `--sub-dependency` 场景下，每条 `--sub-component` 必须显式声明 `subRepoKey`（字符串等于目标 `--sub-dependency` 的 `projectGitlabId`）；任一条缺省时 CLI 立即抛 `BITS_INPUT_ERROR`，hint 中列出 `availableSubRepoKeys`；`subRepoKey` 取值不在 `availableSubRepoKeys` 中同样抛 `BITS_INPUT_ERROR`
- `subRepoKey` 兼容别名：`subRepoKey` / `sub_repo_key` / `subProjectGitlabId` / `sub_project_gitlab_id` 等价
- `--sub-component.componentId` 等价于 component repo_id（与 `bits component get-base-versions --repo-id` 是同一标识）
- `--sub-component` 缺省 `versionBase` 时，CLI 默认会用 `componentId` 自动解析基线版本并回填，**对齐 `bits component get-base-versions`**：直接取后端 `data.versions[0]`，与 Bits 组件平台 UI"升级"按钮的默认选中项一致（不再做客户端类型过滤，prerelease 形态如 `-alpha.x` / `-rc.x` 也会被正常采用）。`--json` 输出新增 `auto_version_base` 字段（含 `enabled` / `status` / `resolved` / `skipped` / `user_provided`）；`status` 取值：`disabled`（关闭自动补齐）、`not_needed`（无组件需要补齐 / 用户已全部显式给出）、`fully_resolved`（全部由 CLI 自动补齐）、`partial_resolved`（部分由用户显式提供、其余由 CLI 自动补齐）；`user_provided` 列出本次调用中用户显式带了 `versionBase` 的 `componentId` 集合。如需关闭自动补齐，加 `--auto-version-base false`
- 自动补齐失败按错误码分流：本地 token 缺失/为空抛 `BITS_AUTH_ERROR`（先跑 `bytedcli bits login` 再重试），其余解析失败（含 token 失效/401、网络错误、`data.versions` 为空等）抛 `BITS_VERSION_BASE_NOT_FOUND`（按 hint 跑 `bits component get-base-versions` 或显式传 `versionBase` 或 `--auto-version-base false`）；创建链路本身失败时（仅 `AppError` 路径）会把 `auto_version_base` 挂在 `error.details` 里
- 主子仓模式默认 `--wip` 为 true
- `mr create-host-sub` 是配置文件驱动的主子仓 MR 创建命令，自动从 `.host-sub-mr.json` 读取 host/sdk 配置并拉取组件版本
- `mr create-host-sub --sub-repo <path[:branch]>` 可重复指定多个子仓路径（支持 `path:branch` 格式指定独立分支），进入多子仓联合发版模式
- `mr create-host-sub --host-config <path>` 指定宿主仓目录或配置文件，搭配 `--sub-repo` 使用
- 配置文件支持三种格式：全量（host+sdks）、子仓独立（sdk only，key 取目录名）、宿主仓独立（host only）
- 配置文件驱动模式按 SDK 目录天然分组，无需 `subRepoKey`
- 多子仓模式下不传 `--sdk` 则默认使用所有收集到的 SDK
- `mr add-sub` 用于向已创建的主子仓 MR 追加一个新子仓 MR 依赖：`--mr-id` 必填；`--sub-dependency` **恰好 1 条**（含 `projectGitlabId/sourceBranch/targetBranch`），多个子仓需循环调用；`--host-project-id` 缺省时按 `--mr-id` 自动反查；`--sub-component` 内的 `hostProjectId` 可省略（fallback 到 `--host-project-id`）；不承载 Meego 绑定（如需绑定走 `mr update --meego`）；其余参数（`--group-name` / `--auto-version-base`）行为与 `mr create --host-sub` 一致
- 多主仓模式支持两种输入：
  - 兼容单 host 输入：提供 `--host-project-id`，并至少传一个 `--mr-dependency`
  - 高级多 host 输入：重复传 `--host '<json>'`，每个 host JSON 自带私有 `mrDependencies`
- 顶层 `--mr-dependency` 表示公共子仓依赖，会保留在顶层 `mr_dependencies`
- `--host` JSON 里的 `mrDependencies` 表示该 host 的私有依赖，会进入对应 `hosts[*].mr_dependencies`
- 使用 `--host` 时不要混用顶层 `--component`；公共 `--mr-dependency` 仍可与 `--host` 并存
- `--host` JSON 字段：`projectId`（必填）、`sourceBranch`（可选，默认取 `--host-source`/`--source-branch`）、`targetBranch`（可选，默认取 `--host-target`/`--target-branch`）、`mrDependencies`（数组）、`components`（数组，可选）
- `--mr-dependency` 和 `--component` 均可重复传入多个；
- `--meego` 支持传入 Meego URL 或 ID，MR 创建后自动绑定关联信息
  - URL 模式：自动从 URL 解析 `projectKey` 和 `type`，如 `https://meego.larkoffice.com/larksuite/issue/detail/6841440562`
  - ID 模式：需配合 `--meego-type` 和 `--meego-project-key` 使用
- Meego URL 的 `type` 映射规则：`story` 表示需求（绑定 Bits `task_type=issue`），`issue` 表示缺陷（绑定 Bits `task_type=bug`）；注意 Meego 的 `issue` 在此语义上等同缺陷，而非需求
- `--meego-type` 指定 Meego 工单类型：`bug` 或 `feature`（ID 模式必填）
- `--meego-project-key` 指定 Meego 项目标识，如 `larksuite`（ID 模式必填）
- `mr update` 同样支持 `--meego` / `--meego-type` / `--meego-project-key`，用于给已经存在的 MR 追加绑定 Meego 工作项（解析规则与 `mr create` 一致），返回结果会带 `meego_bindings` 数组指明每条绑定的成功 / 失败原因；可重复传 `--meego` 一次绑多个
- `--app-id` 和 `--cloud-id` 用于传递 bits 空间鉴权 header（多主仓模式）；`--group-name` 在多主仓模式下是宿主仓的 host_group_name（可能与 bits 空间名不同）
- `mr status` 是客户端 BITS MR 的主入口；更稳定的程序化消费优先加 `--json`
- `mr packages` 查询 MR 关联的产物包（package groups），每个 group 包含多个 package（含可选 artifacts）；`--project-id` 为主仓 project_id（字符串），`--mr-iid` 为 MR 的 iid
- `mr publish-records` 查询 MR 下各子仓组件发布产物（OpenAPI `/openapi/merge_request/component/publish/record/list`）；`--mr-id` 同时支持 host MR id 与 sub MR id：host MR 会先用 `relation/list` 展开为所有子仓 MR 后并发查询，sub MR 直接单查；并发请求中单个子仓失败会被兜底写入 `sub_mrs[i].error`，不会让整体 fail-fast；host MR 实际无任何 sub-repo 时抛 `BITS_MR_NO_SUB_REPOS`
- `mr publish-records` 文本模式按子仓维度做 Summary 聚合：当一个子仓内所有组件的 `status` / `version_origin` / `version_final` / `version_base` / `release_info` / `log_url` / `pod_source` / `tt_repos` 完全一致时，提为子仓级 Summary，组件表只保留身份列（Name / Group / Module / ComponentID / PublishVersionID）；存在差异时会退化为完整列展开。`Release Window` 在缺失某一端时左/右用 `-` 兜底；`TT Repos` 超过 6 项以 `... (+N)` 截断。`-j/--json` 模式下保留全部原始字段（不截断、不聚合）
- `mr search` 适合按状态、作者、reviewer、source/target branch、mr_type 做列表筛选；`mr mine` 是带 author 过滤的快捷入口
- `mr status` 用来看整体状态、review 摘要和 pipeline 信息；`mr review-status` 聚焦 Review；`mr qa-status` 聚焦 QA
- 对于多仓合码，想拿完整 workflow / job 列表时，优先使用 `bits client workflow pipeline from-mr --include-dependencies`
- `--include-dependencies` 会同时展开 `CUSTOM_CI_MMR_HOSTS`（多主仓，`relation_type = mmr_host`）和 `CUSTOM_CI_MR_DEPENDENCIES`（多子仓 / 依赖仓，`relation_type = dependency`）
- `mr approve` / `mr disapprove` 用于审批动作；`mr remind-review` / `mr remind-qa` 用于催办动作
- `mr reviewer add` 给已有 MR 追加 reviewer；`--reviewer` 可重复或逗号分隔；`--role` 默认 `RD`；`--is-force` 强制覆盖；`--reason` 默认 `auto_add_current_developer`
- `mr reviewer remove` 从已有 MR 移除指定 reviewer；`--username` 为要移除的 reviewer 用户名
- `mr reviewer info` 查询 MR 的所有 reviewer 信息（含子仓）；`--mr-id` 必填
- `mr chat create` 为 MR 创建关联的 Lark 群聊；`--mr-id` 必填。**注意**：一个 MR 只会有一个关联群聊，第二次 create 仍会返回成功响应，但不会重新建群、也不会重新邀请 reviewer；如果群已被 `chat dismiss` 清空，请用 `mr chat add` 逐个补回 reviewer，不要再次 create
- `mr chat add` 向 MR 关联的 Lark 群聊中添加用户；`--mr-id` 和 `--username` 必填；`--member-type` 可选（如 `reviewer`、`developer`）
- `mr chat remove` 从 MR 关联的 Lark 群聊中移除用户；`--mr-id` 和 `--username` 必填
- `mr chat dismiss` 清空 MR 关联的 Lark 群聊成员（除 Bits Bot 外全部踢出，群聊本体保留）；`--mr-id` 必填；`--username` 可选（指定操作人）。dismiss 后想恢复成员请使用 `mr chat add` 逐个邀请，不要使用 `mr chat create`
- `mr review-status`、`mr approve`、`mr disapprove`、`mr remind-review`、`mr qa-status`、`mr remind-qa` 都支持两种定位方式：
  - `--mr-id`
  - `--project-id + --iid`
- 需要按客户端 Bits 维度做程序化查询时，优先使用 `bits mr ... --json`，不要自行拼装内部接口
- 如果命令报 token 缺失或鉴权失败，优先检查 `CLIENT_BITS_TOKEN` 是否已设置且权限已开通
- `component upgrade` 是客户端组件升级正式入口；payload 应符合正式 OpenAPI `req_schema`
- `bits client workflow` 适合查 workflow job / pipeline template / dev task pipeline；不会替代现有 `bits pipeline` 主域
- `bits client integration` 适合查集成区版本、封版报告、版本群、合入队列
- `bits client calendar` 适合查版本日历空间、事件和标记
- `component` 现已支持完整的组件生命周期查询，包括：`get-repo`、`search-repos`、`get-history-by-id` 等 14 个核心命令
- `--service-type` 支持：`PROJECT_TYPE_WEB`、`PROJECT_TYPE_TCE`、`PROJECT_TYPE_FAAS`、`PROJECT_TYPE_HYBRID`、`PROJECT_TYPE_CRONJOB`、`PROJECT_TYPE_CUSTOM`；传入后会按对应项目类型自动解析 `projectUniqueId`
- `--change` 支持可选的 `scm=<name>` 键，用于指定非主 SCM 依赖；省略时默认绑定主 SCM（`isMain === true`），行为与之前一致
- `--change` 支持可选的 `mr=<iid>` 键（仅 `develop create` 生效），用于复用 source branch 上已存在的 open MR——等价于 Bits Web UI 提示 "An unfinished MR already exists" 时点击 "use directly"；省略时（默认）由 Bits 后端自动开新 MR，行为与之前一致；`mr=` 必须是正整数
- `develop create` 使用多个 `--change` 且服务分属不同模板时，必须传 `--space-id` 以便跨模板解析项目；否则只会从首个匹配模板中取项目，未覆盖的服务将报错
- `pipelines set` 是整体替换（PUT 语义），调用方必须基于 `pipelines get` 拿到的最新 DSL 改后再写回；命令 PUT 之前会自动把当前 DSL 备份到 `os.tmpdir()/bytedcli/bits-pipeline-backup/<id>-<ts>.json`
- `pipelines set` 会在 PUT 前把所有空 i18n 字段（`{value: "", lang?, texts?}` 的 `StringInMultiLang`）置为 `null`，因为 BITS 校验器会拒绝 `value` 为空字符串但 GET 接口又会返回这种 sentinel 值；被剥的路径列在 `data.sanitizedI18nPaths`，最常见的是 `varGroup.description`
- `pipelines set` 的版本字段是 `pipelineVersion.version`（一个 wrapper 对象），不是裸数字；CLI 已经做了 unwrap，正常情况下 `data.fromVersion / data.toVersion` 应该连续递增

## References

- `../../invocation.md`

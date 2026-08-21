# 启动报错诊断（startup-errors.md）

本文用于诊断 Flink 流式作业「提交后起不来」一类问题。所有命令均为只读；本文给出的任何变更类动作（改并发/改内存/重置 offset/重启/重新部署等）一律只作为「建议命令」呈现，必须由你确认后自行执行，本 Skill 不会自动执行。

> 前置：① 先按 `locate-job.md` 把入口信息解析为 Flink Web URL + jid + 正确 --site/--vregion；② 确认已登录 `bytedcli auth status`；③ 全程加 -j；④ flink 命令必须带 --url，office 连不通加 --network office|prod 或 --refresh-cookie；⑤ 只读红线：只诊断、只给"建议命令"，不自动执行变更。命令/指标字典见 `command-reference.md`。

> 鉴权前置（实战第一坎）：本文所有真实查询都依赖有效 SSO 会话。开始前先 `bytedcli --json auth status` 确认登录状态；未登录时业务命令直接报 `AUTH_REQUIRED`。Agent（非交互终端）登录用 device-code 两步流程：`bytedcli --json auth login --begin` → 用户浏览器授权 → `bytedcli auth login --complete <token>`；交互终端直接 `bytedcli auth login`。详见 `command-reference.md` 鉴权节。

> 平台部署层命令（dorado/tce/sip）还需要 **Dorado projectId / taskId / instanceId** 等平台标识，来自 `locate-job.md` 解析出的任务页 / JSON 返回；本文示例里的 `<PID>/<TID>/<instanceId>/<appId>/<deploymentId>` 均为占位符。海外作业按各命令 `--help` 追加 `--site`、`-r/--region`、`--vregion/--vdc`，本文示例默认 cn 站点。

---

## 一、适用症状

出现以下任一现象时，按本文流程诊断：

- 作业提交后迟迟不进入 RUNNING，长时间停在 `INITIALIZING` / `CREATED` / `RESTARTING`，或在平台侧一直「部署中 / 启动中」。
- 部署失败：平台报「部署失败 / 启动失败」，或容器反复重启（CrashLoopBackOff）。
- 容器/Pod 长时间 `Pending`，或被驱逐（Evicted）。
- slot / quota 资源不足，调度不上。
- 镜像拉取失败（ImagePullBackOff / ErrImagePull）。
- 配置 / 依赖 / JAR 冲突导致 JM 或 TM 启动即报错（`ClassNotFoundException` / `NoSuchMethodError` / `LinkageError` 等）。
- 从 checkpoint / savepoint 恢复失败，导致作业起不来（状态不兼容、路径不存在、序列化不匹配）。

> 区分边界：如果作业**已经起来过、进入过 RUNNING，之后才挂**（运行期 failover、周期性重启），那不属于「启动报错」，请转 `failover.md`。本文只覆盖「从未稳定进入 RUNNING」的启动阶段。

---

## 二、先判引擎：流（Flink）还是批（Spark），别用错诊断工具

本 Skill 只诊断 **Flink 流式作业**。开始前务必先确认目标作业的计算引擎，**避免对 Flink 流作业误用 Spark 的诊断命令**：

- **`bytedcli dorado instance diagnose`** 的命令说明是「Get Dorado **offline task** instance diagnose data」，且 `--engine` **默认 `spark`**、`--run-mode` 默认 `system`。它本质是给 **Spark / 离线批任务**用的平台诊断聚合，**不要把它当成 Flink 流作业的权威根因来源**。
- **`bytedcli dorado get-container-log`** 命令说明明确是「for a **Spark** application」（拉 YARN AM 容器日志、走 Megatron API）。对 Flink 作业它可能拿不到对应容器，**优先用 Flink runtime 层的 `flink ...` 命令拿证据**（见第四节）。
- **`bytedcli megatron app search/get`** 不是 Spark 专属：`--application-type` 枚举含 Flink/SPARK/PRESTO/Ray 等，`app search` 是定位 Flink application（拿 `tracking_url`=Flink Web URL、判在线态）的核心命令，**Flink 流作业要走它**（见 `locate-job.md`）。但 `megatron spark-ui`、`dorado instance diagnose --engine spark` 等仍是 **Spark 专用**，不适用 Flink。

如何判断引擎（任一即可定性）：

- **任务类型**：在 `locate-job.md` 解析出的任务详情里看类型。Flink 流作业判别字段（`dorado task get` 返回）：`type=stream_managed_java_flink`、`conf.typeGroup=stream`、`engineType=flink-1.11`；Dorado 批任务类型形如 `hsql / fsql / stream_sql / doris_sql / mysql-hive / hive-clickhouse / common-dts-batch` 等（走 Spark/批）。
  ```bash
  bytedcli dorado task get <TID> -r <region> -j     # 看 type / conf.typeGroup / engineType
  ```
- **平台入口**：从 Flink 实时计算平台（有 Flink Web UI / REST URL）进来的就是 Flink 流作业；从离线 DataLeap / Spark 历史服务器进来的是 Spark 批。
- **探针**：`flink job list --url <URL>` 能连上 Flink REST，就是 Flink 作业。

结论：

- 目标是 **Flink 流作业** → 走本文第三、四、五节（Flink runtime 层用 `flink ...`，平台部署层用 `dorado instance/tce/sip`）。
- 目标其实是 **Spark / 离线批作业** → 不在本 Skill 范围，应改走 megatron(Spark) 体系：`bytedcli dorado instance diagnose <instanceId> --project-id <PID> -j`（默认 `--engine spark`）、`bytedcli megatron app get/search`、`bytedcli megatron spark-ui ...`、`bytedcli dorado get-container-log ...` 等。

> 注意：即便是 Flink 流作业，**平台部署层**（容器是否拉起、Pod 调度、配额、镜像）仍然走 dorado/tce/sip 通用命令——这些不是「Spark 专用」，可放心用；只有上面标注「Spark / Megatron」字样的诊断聚合才需要按引擎区分。

---

## 三、诊断决策树：先分层，再按状态定位

启动失败先判断卡在哪一层、卡在什么状态，避免在错的层里找证据：

```
作业起不来（已确认是 Flink 流作业）
│
├─ 0. 用 locate-job.md 拿到 Flink Web URL + Dorado projectId/taskId
│
├─ 1. flink job list --url URL -j      ← 探针：Flink 集群里到底有没有 job？
│     │
│     ├─ A. 命令报错 / 拉不到（连接被拒、404、超时、无 job）
│     │     → 说明 Flink runtime 还没拉起来或集群没建出来
│     │     → 卡在【平台部署层】，跳到 第四节
│     │
│     └─ B. 能拿到 job，但状态不对 → 卡在【Flink runtime 层】，跳到 第五节
│           按状态再分两类（证据路径不同）：
│           │
│           ├─ B1. 长期 INITIALIZING / CREATED，迟迟不 RUNNING
│           │      → 多为「申请不到 slot / 调度死锁 / 资源不足」：JM 在跑，
│           │        但拿不到足够 slot 把 task 部署出去。
│           │      → 先看 cluster overview（slotsAvailable）+ job get（看是否一直在
│           │        等待调度），再回平台部署层确认 TM 没拉够还是被抢占。
│           │
│           └─ B2. FAILED / RESTARTING（不停重启）
│                  → 多为「异常起不来」：类加载/配置/连接/状态恢复在初始化阶段抛异常。
│                  → 先看 job exception get 的根因异常栈 + JM 日志。
│
└─ 2. 任一层确认根因后 → 第六节「根因 → 证据命令 → 修复建议」表
```

判定口诀：
- **`flink job list` 是分层探针**：拉不到 → 平台部署层（第四节）；拉得到但状态不对 → Flink runtime 层（第五节）。
- **runtime 层再按状态分流**：`INITIALIZING/CREATED` 长期不动 → 资源/调度（看 `cluster overview` 的 slot + `job get`）；`FAILED/RESTARTING` → 异常（看 `job exception get` + JM 日志）。

---

## 四、平台部署层诊断（`flink job list` 拉不到 job 时）

此时 Flink REST 大概率还不可达，要回到 Dorado / TCE / 容器日志去看「为什么没拉起来」。

### 步骤 0：先判「是否成功提交到 YARN」（megatron app search）

判断作业是「从未成功提交」还是「提交了但容器没拉起/起即崩」，用 `megatron app search` 按作业名搜 application（同 `locate-job.md` 的在线态判别）：

```bash
# 按作业名（或较短关键词，--fuzzy 默认 true）搜 application，核对 tags 里的 job=dorado_<TID>
bytedcli megatron app search --app-name <作业名或关键词> --application-type Flink -j
```

读法（对应 F2 三分支）：
- **完全搜不到 application** → 从未成功提交到 YARN，问题在部署层/启动报错本身：查 Dorado 任务配置与提交日志（步骤 1）；本文 `flink_failure_zoo_case_heap_oom` 全名搜返回 0 条即此类（该任务从未生成 application）。
- **有 FAILED/KILLED app 但无 RUNNING** → 提交过、容器拉起后挂掉/被杀：看该 app 的 `diagnostics`（FAILED 诊断信息）+ `am_container_logs`（AM=JobManager 容器日志 URL，离线取证用），再走下面的容器日志取证。
- **有 RUNNING app** → 已进入 RUNNING，多半不属「从未起来」，取 `tracking_url` 转第五节 Flink runtime 层（或转 `failover.md`）。

### 步骤 1：看 Dorado 任务与提交侧状态

> ⚠️ **流式作业不走 instance 模型**：`dorado instance list` 对流作业实测返回 0 条（instance 模型属批/例行实例），不要对流作业跑 `instance list / instance get / instance diagnose`。流作业的"运行实体"以 megatron application 为准（见上面的 F2 三分支）。

```bash
# 任务详情：确认配置、cluster/queue、流作业判别字段（type=stream_managed_java_flink / conf.typeGroup=stream / engineType=flink-1.11）
bytedcli -j dorado task get <TID> -r <region>

# 仅当你确认目标其实是【批/例行】作业时，才用 instance 模型：
bytedcli dorado instance list --project-id <PID> --task-id <TID> --page-size 10 -j
bytedcli dorado instance get <instanceId> -r <region> -j
```

> `dorado instance diagnose` 默认 `--engine spark`，是 Spark/离线批的诊断聚合（见第二节）。**Flink 流作业不要把它当权威根因**；若你确认目标其实是 Spark 批作业，再用它，并按需要保留默认 `--engine spark`。Flink 流作业的根因优先从下面的容器日志 + 第五节 Flink runtime 证据拿。

### 步骤 2：看容器 stderr（启动期最关键的原始日志）

Pod 拉起即崩、镜像/依赖/启动脚本问题，最直接的证据在容器 `stderr`：

```bash
# 已知 YARN application_id 时，直接拉 AM 容器 stderr 末尾若干行
bytedcli dorado get-container-log --application-id application_<x>_<y> --file stderr --tail 300 -j

# 没有 application_id、只有某个具体容器的 logsLink 时
bytedcli dorado get-container-log --logs-url <containerLogsUrl> --file stderr --tail 300 -j
```

> `get-container-log` 命令说明是「for a Spark application」、走 Megatron。对 YARN 部署的容器它能拿到 stderr；若拿不到（非 YARN/容器路径不同），改从第五节 Flink JM/TM 日志取证。

在 stderr 里重点找：`OutOfMemoryError` / `Could not allocate ... slot` / `ClassNotFoundException` / `image pull` / `permission denied` / `Connection refused` / `Quota` 等关键字，决定走第六节哪一行。

### 步骤 3：看 TCE 部署步骤与 Pod 状态

判断是「部署流程卡住/失败」还是「Pod 调度不上/反复重启」：

```bash
# 部署单详情：哪一步卡住/失败（拿到 deployment/ticket ID 后）
bytedcli tce deployment get <deploymentId> -j
# 若拿到的是全局部署单 ID：
bytedcli tce deployment get <globalTicketId> --global -j

# Pod 维度：按 PSM 或 service/cluster 列出 Pod，看 Pending / CrashLoopBackOff / Evicted
bytedcli tce instance list --psm <PSM> --env prod -j
bytedcli tce instance list --service-id <serviceId> -j

# 按 IP / podName / host 反查单个 Pod 落点与状态
bytedcli tce instance search -k <IP|podName|host> -j
```

读法：
- 部署单某步骤 `failed/stuck` → 部署流程问题（配额、镜像、配置校验），见第六节。
- Pod `Pending` → 多半资源/调度/quota；`ImagePullBackOff` → 镜像；`CrashLoopBackOff` → 进程启动即崩（回到步骤 2 看 stderr）；`Evicted` → 被驱逐/抢占（叠加查 SIP，见第六节资源/抢占行）。

> 半侵入式只读取证（需用户确认）：若要进生产 Pod 抓 JVM 栈/GC/OOM/磁盘现场，可用 `tce` webshell 在 Pod 内执行**只读**诊断命令（`jstack` / `jmap -heap` / `jstat` / `top` / `dmesg` / `cat 日志` / `df` / `free` 等）。进的是生产 Pod，**先经用户确认**再执行；**禁止**在 webshell 内执行任何写/变更命令（`kill`、重启进程、改配置、删文件）。

---

## 五、Flink runtime 层诊断（`flink job list` 拉得到、但状态不对时）

集群已起、JM 在跑，要在 Flink 自身找启动失败根因。**先看状态属于哪一类**（第三节 B1/B2），再选证据路径。

### 步骤 1：确认 job 状态与（如有）根因异常栈

```bash
# 单作业时 --job-id 可省略（自动探测）；多作业先从 list 里取 jid
bytedcli flink job list --url <URL> -j
bytedcli flink job get --url <URL> --job-id <JID> -j

# 启动期根因异常栈（类加载/配置/连接/状态恢复都在这里）——FAILED/RESTARTING 必看
bytedcli flink job exception get --url <URL> --job-id <JID> -j
```

- **B2（FAILED / RESTARTING）**：`flink job exception get` 是 runtime 层最高优先级证据，对照异常类型走第六节对应行。
- **B1（长期 INITIALIZING / CREATED）**：通常异常栈是空的或只反复打「等待调度/分配 slot」，此时不要纠结异常栈，**直接走步骤 3 看资源/slot**。

### 步骤 2：看 JobManager 启动日志（B2 异常类问题优先）

端口冲突、HA/ZK、依赖缺失、配置解析失败往往只在 JM 日志里：

```bash
# 先列可用日志文件
bytedcli flink jobmanager log list --url <URL> -j
# 拉 JM 日志末尾（默认 500 行）；定位到具体文件可加 --name <file>
bytedcli flink jobmanager log get --url <URL> --tail 300 -j
# 看 stdout（部分启动报错打在 stdout）
bytedcli flink jobmanager log get --url <URL> --stdout --tail 300 -j
```

### 步骤 3：确认资源是否够（slot vs 需求）——B1「INITIALIZING/CREATED 不动」优先

```bash
bytedcli flink cluster overview get --url <URL> -j        # TM 数、slotsTotal、slotsAvailable
```

判读：
- `slotsAvailable` 长期为 0 或不足以满足作业并发 → **申请不到 slot / 资源不足**，作业卡在 `CREATED/INITIALIZING` 无法把 task 部署出去（第六节第 1 行）。
- 此时同步回**平台部署层**（第四节）确认：是 **TM 没拉够**（Pod `Pending`/数量不足）还是 **TM 被抢占/驱逐**（Pod `Evicted`，叠加 SIP）。两者修复方向不同。
- 若 slot 充足却仍长期不 RUNNING，可能是调度死锁/约束（如 slot sharing、location 约束）；用逃生口拉调度相关 REST 端点进一步看。

> metric 名纪律：如需指标佐证，Flink REST 指标名随版本/connector 变化，**先不带 `--names` 拉全量** `bytedcli flink jobmanager metric list --url <URL> -j` / `bytedcli flink cluster ...`，再从输出里挑选，不要臆造确定的指标名。

### 步骤 4：状态恢复失败排查

job 卡在恢复、或 exception 栈里出现状态/序列化/路径相关异常时：

```bash
# 看历史 checkpoint，确认是否有可用的最近完成点、恢复点是否存在
bytedcli flink job checkpoint list --url <URL> --job-id <JID> -j
# 看 checkpoint/恢复相关配置（间隔、模式、对齐、外部化等）
bytedcli flink job checkpoint-config get --url <URL> --job-id <JID> -j
# 看作业配置里的恢复相关项（state backend、restore path 等，以实际字段为准）
bytedcli flink job config get --url <URL> --job-id <JID> -j
```

### 步骤 5：sink / 外部系统在启动期连接失败

启动期连接下游/存储/注册中心失败（`Connection refused` / `UnknownHostException` / 认证拒绝等）只需在此一句带过：先看 `flink job exception get` 确认是外部连接问题，**详细的 sink/外部系统连接排查与处理走 `failover.md`**。

### 逃生口：任意 REST 路径

上面命令未覆盖、但你知道确切 Flink REST path 时：

```bash
bytedcli flink raw get --url <URL> --path /jobs/overview -j
bytedcli flink raw get --url <URL> --path <anyRestPath> -j   # 非 JSON 端点加 --text
```

---

## 六、根因 → 证据命令 → 修复建议

> 下表「修复建议」一栏全部是**建议命令/建议动作**。本 Skill 只输出建议；变更类操作（改并发/改内存/改镜像/重置恢复路径/重新部署等）必须由你确认后自行执行。

| 根因 | 典型现象 / 日志关键字 | 证据命令（只读） | 修复建议（需你确认后自行执行） |
|---|---|---|---|
| **资源 / slot 不足**（多见于长期 INITIALIZING/CREATED） | 作业卡 `CREATED/INITIALIZING` 不 RUNNING；Pod 长期 `Pending`；`Could not allocate the required slot` / `NoResourceAvailableException`；`slotsAvailable=0` | `bytedcli flink cluster overview get --url <URL> -j`；`bytedcli flink job get --url <URL> --job-id <JID> -j`；`bytedcli tce instance list --psm <PSM> --env prod -j` | 建议在平台「资源/并发」配置里下调 parallelism 或补足 TM/slot 配额后重新部署；建议确认目标资源池余量。**不自动改并发、不自动 rescale。** |
| **调度死锁 / 约束不满足**（INITIALIZING/CREATED 但 slot 看似够） | slot 充足却长期不 RUNNING；slot sharing / location 约束 / 调度排队 | `bytedcli flink cluster overview get --url <URL> -j`；`bytedcli flink job get --url <URL> --job-id <JID> -j`；`bytedcli flink raw get --url <URL> --path <调度相关RestPath> -j` | 建议核对 slot sharing group / 并发与拓扑约束；必要时联系平台 owner 排查调度。**不自动改拓扑/并发。** |
| **镜像 / 依赖问题** | `ImagePullBackOff` / `ErrImagePull`；拉镜像超时/认证失败；启动脚本找不到文件 | `bytedcli tce instance list --psm <PSM> --env prod -j`（看 Pod 状态）；`bytedcli dorado get-container-log --application-id <appId> --file stderr --tail 300 -j`；`bytedcli tce deployment get <deploymentId> -j` | 建议核对镜像 tag/仓库地址与拉取凭证；建议确认依赖产物（JAR/资源包）已正确打入镜像或上传后再重新部署。**不自动改镜像、不自动重部。** |
| **配置错误**（多见于 FAILED/RESTARTING） | JM 启动即退；`IllegalConfigurationException` / 配置项解析失败 / 端口冲突 / HA·ZK 连接失败 | `bytedcli flink jobmanager log get --url <URL> --tail 300 -j`；`bytedcli flink job exception get --url <URL> --job-id <JID> -j`；`bytedcli flink job config get --url <URL> --job-id <JID> -j` | 建议定位报错的具体配置键，在作业配置里修正（内存/端口/HA/checkpoint 配置等）后重新提交。**不自动改配置。** |
| **依赖 / JAR 冲突（类加载）**（FAILED/RESTARTING） | `ClassNotFoundException` / `NoClassDefFoundError` / `NoSuchMethodError` / `LinkageError` / `IncompatibleClassChangeError` | `bytedcli flink job exception get --url <URL> --job-id <JID> -j`；`bytedcli flink jobmanager log get --url <URL> --tail 300 -j`；`bytedcli dorado get-container-log --application-id <appId> --file stderr --tail 300 -j` | 建议排查 shade/relocation 与依赖版本，去除重复/冲突依赖或调整 classloader 顺序后重新打包提交。**不自动改依赖。** |
| **状态恢复失败（checkpoint/savepoint）** | 卡在恢复或反复重启；`Cannot map checkpoint/savepoint state` / `StateMigrationException` / 序列化不兼容 / restore path 不存在 | `bytedcli flink job exception get --url <URL> --job-id <JID> -j`；`bytedcli flink job checkpoint list --url <URL> --job-id <JID> -j`；`bytedcli flink job checkpoint-config get --url <URL> --job-id <JID> -j`；`bytedcli flink job config get --url <URL> --job-id <JID> -j` | 建议确认恢复点路径存在且与当前 jobgraph/算子 uid 兼容；如状态不兼容，建议评估「换用更早可用 checkpoint」或「无状态启动（放弃状态）」并由你决策。**不自动重置 offset、不自动跳过状态、不自动改恢复路径。** |
| **外部连接失败（sink/下游/注册中心）** | 启动期连接下游/存储/注册中心失败；`Connection refused` / `UnknownHostException` / `TimeoutException` / 认证拒绝 | `bytedcli flink job exception get --url <URL> --job-id <JID> -j`；`bytedcli flink jobmanager log get --url <URL> --tail 300 -j` | 确认是外部连接问题后，**详细排查与处理见 `failover.md`**；建议核对下游/存储地址、网络连通性与凭证（host、端口、token、白名单）后重试。**不自动改连接配置。** |
| **quota / 权限** | 部署单在配额/权限校验步骤失败；`Quota exceeded` / `Forbidden` / `permission denied` / `403` | `bytedcli tce deployment get <deploymentId> -j`；`bytedcli dorado get-container-log --application-id <appId> --file stderr --tail 300 -j`；`bytedcli dorado instance get <instanceId> -r <region> -j` | 建议向资源/权限 owner 申请扩配额或补授权后重新部署；建议确认提交身份具备目标资源/存储的访问权限。**不自动申请、不自动改权限。** |
| **资源被抢占 / 机器降级**（叠加项） | Pod `Evicted` 或频繁被杀；起不来与机房/机器降级、TCE 事件时间吻合 | `bytedcli tce instance search -k <podName|IP> -j`；`bytedcli sip event list --category TCE --keyword <作业名/podName> -j`；命中后 `bytedcli sip event get --id <eventId> -j` | 建议依据 SIP 事件结论错峰重试或迁移资源池；若为平台侧降级/抢占，建议联系平台 owner。**不自动迁移、不自动重试。** |

> SIP 注意：`sip event list` 的 `--biz` 默认 `tiktok_feeds`、`--filter` 默认 `{"libra":{"app":["TikTok"]}}`，**必须按目标作业的实际业务线/应用覆盖**，否则查不到相关事件。海外作业还需带 `--region`（可重复）。例如：
> ```bash
> bytedcli sip event list --category TCE --keyword <作业名> \
>   --biz <实际业务线> --filter '{"libra":{"app":["<实际应用>"]}}' \
>   --region <region> --duration 1h -j
> ```

---

## 七、离线无法核实 / 需你提供的输入

以下内容本工具无法在离线环境替你产出，请按提示获取，不要臆造：

- **Flink Web URL**：标准产出路径是 `megatron app search` 返回的 `tracking_url`（按作业名搜，核对 tags 里 `job=dorado_<TID>`），权威流程见 `locate-job.md`；从平台「Flink UI / 作业运行页」复制 URL 仅作兜底。
- **Dorado projectId / taskId / instanceId、TCE deploymentId、YARN application_id**：来自平台任务页或上一步命令的 JSON 返回；本文示例中的 `<PID>/<TID>/<instanceId>/<appId>/<deploymentId>` 均为占位符。
- **计算引擎（流 Flink / 批 Spark）**：按第二节判别；若拿不准，先 `bytedcli dorado task get <TID> -r <region> -j` 看任务类型，或看是否有 Flink Web REST URL。
- **具体 metric 名（`metric list --names`）**：随 Flink 版本/connector 变化。如需指标，先不带 `--names` 拉全量 `... metric list`，再从输出里挑选；本文不写死指标名。
- **`--site/--region/--vregion/--vdc`**：海外作业必须按实际站点/区域填写，取值见各命令 `--help`。

---

## 八、相邻文档

- 定位入口、拿 Flink Web URL（入口 A/B/C）：见 `locate-job.md`。
- 作业已起来过、之后才挂（运行期 failover / 周期性重启 / sink 等外部系统连接问题）：见 `failover.md`。
- 消费延迟 / lag 排查：见 `lag.md`。
- 反压排查：见 `backpressure.md`。
- 命令字段、全局参数（`-j`、`--site/--vregion/--vdc`、各命令完整选项）速查：见 `command-reference.md`。

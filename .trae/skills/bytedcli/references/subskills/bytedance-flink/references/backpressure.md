# 反压诊断

> 前置：① 先按 `locate-job.md` 把入口信息解析为 Flink Web URL + jid + 正确 --site/--vregion；② 确认已登录 `bytedcli auth status`；③ 全程加 -j；④ flink 命令必须带 --url，office 连不通加 --network office|prod 或 --refresh-cookie；⑤ 只读红线：只诊断、只给「建议命令」，不自动执行变更。命令/指标字典见 `command-reference.md`。

本文件只做**只读诊断 + 修复建议**：所有修复都以「建议执行的命令」形式给出，需你确认后自行执行，本 skill 绝不自动跑变更类操作（提并发 / rescale / 重启 / 改内存等）。

---

## 一、适用症状

出现下列任一现象时进入本流程：

- Flink UI 某算子标红 / `backPressuredTimeMsPerSecond` 高，吞吐（`numRecordsOutPerSecond`）下降。
- 作业整体 TPS 下降、处理延迟变大，但没有 failover、没有 restart。
- **消费 Lag 持续上升且伴随反压**：Lag 是「果」，反压是「因」——先按本文定位反压瓶颈算子；若定位后发现是 source 侧并发 / 分区不足（根本没反压、纯 source 读不过来），转 `lag.md`。
- 周期性反压（如每隔几分钟一次毛刺），常与 GC、Checkpoint 对齐、外部系统抖动相关。

> 区分点：如果伴随 `Task` 频繁 RESTARTING / 异常栈，那是 failover 而非单纯反压，先走 `failover.md`；反压的特征是作业 RUNNING、无异常栈，只是慢。

---

## 二、诊断决策树

```
反压 / 吞吐下降
│
├─0. 确认作业在跑、无 failover
│     flink job get --url $URL -j                     # state=RUNNING？有没有 restart 计数飙升
│     flink job exception get --url $URL -j            # 有根因异常栈 → 转 failover.md
│
├─1. 拿 DAG / 拓扑 / 并行度
│     flink job plan get --url $URL -j                 # 或 flink job get；得到各 vertex id、上下游、parallelism
│
├─2. 逐算子反压，从上游往下游扫
│     先试 flink vertex backpressure get --url $URL --vertex-id $VID -j
│       ├─ 正常返回 backpressure-level/ratio → 直接用（同集群部分作业仍可用）
│       └─ 若返回 {"status":"deprecated"}（部分作业实测如此）→ 立即切「指标法」：
│          flink vertex metric list 拉全量指标名，从中挑 backPressuredTimeMsPerSecond /
│          busyTimeMsPerSecond / idleTimeMsPerSecond / isBackPressured（先 list 再挑，不臆造）
│     找「第一个 自己 busy(高) 但其下游不 busy」的算子 = 瓶颈算子
│     （反压从瓶颈向上游传导：上游被反压是被动的，下游不忙说明瓶颈就在这一层）
│     ⚠️ deprecated ≠ 无反压；不要据此误判，必须改走指标法。
│
├─3. 量化瓶颈算子忙碌度
│     flink vertex metric list --url $URL --vertex-id $VID -j          # 先不带 --names 拉全量
│     再挑 busyTimeMsPerSecond / backPressuredTimeMsPerSecond / idleTimeMsPerSecond 复查
│
├─4. 瓶颈根因定位（见第四节表）
│     ├─ CPU 算不过来（busy 高、backpressured 低、idle 低、CPU 真实占用高）→ 提并发 / 优化逻辑
│     ├─ 阻塞等待（busy≈1000 但 JVM CPU 几乎为 0）→ map/算子里有同步阻塞（sleep/同步 RPC），改 Async I/O
│     ├─ GC（堆高、GC time 高）        → taskmanager metric + log
│     ├─ 数据倾斜（subtask 间不均）     → vertex subtask-time / 对比 subtask 指标
│     ├─ 外部 sink 慢（瓶颈是 sink 算子）→ apm service / apm grafana query 看下游服务
│     └─ UDF / 序列化热点              → tce webshell jstack 抓栈（半侵入式只读取证）
│
└─5. 资源面旁证
      直接用 flink job list 返回的 metric / dtop 两个现成 Grafana 大盘 URL；
      或 apm grafana query  host CPU / mem 趋势（是否打满 / 抖动）
```

---

## 三、诊断步骤详解

### 步骤 0：先排除 failover

```bash
# 作业整体状态、restart 计数（Godel 流作业 jid 恒为全 0）
bytedcli flink job get --url "$URL" --job-id 00000000000000000000000000000000 -j

# 如有根因异常栈 → 不是单纯反压，转 failover.md
bytedcli flink job exception get --url "$URL" --job-id 00000000000000000000000000000000 -j
```

`state` 应为 `RUNNING` 且 restart 不在快速增长。若有持续异常 / RESTARTING，转 `failover.md`（RESTARTING 时 vertex/job metric 会返回空数组，反压指标采不到，根因看异常栈）。

### 步骤 1：拿 DAG（拓扑 + 并行度）

```bash
# 先拿 jid（Godel 流作业 jid 恒为全 0："00000000000000000000000000000000"）
# flink job list 的返回里还带两个现成 Grafana 大盘 URL 字段：metric（作业大盘）/ dtop（资源大盘），直接复用
bytedcli flink job list --url "$URL" -j

# 拓扑与每个 vertex 的并行度（plan 的实际子命令是 get，--url 在 get 上）
bytedcli flink job plan get --url "$URL" --job-id 00000000000000000000000000000000 -j

# 或用 job get 看 vertices 概览（含每个 vertex 的 id、name、parallelism、状态）
bytedcli flink job get --url "$URL" --job-id 00000000000000000000000000000000 -j
```

记录每个算子的 `vertex-id`（下文 `$VID`，来自 `plan.nodes[].id`）、name、parallelism，以及上下游连接关系——决定步骤 2 的扫描顺序（**从 source 端往 sink 端走**）。

> Godel 流作业 `jid` 恒为全 0，`--job-id 00000000000000000000000000000000`；下文示例统一这么传。一个 URL 下有多个 job 时先 `flink job list --url $URL -j` 拿各自 `jid`。
> 想看大盘直接用 `flink job list` 返回里的 `metric` / `dtop` URL（flink-<cluster>-<jobname> 作业大盘 + flink-on-k8s-resource-v2 资源大盘），无需自己拼 `apm grafana query`。

### 步骤 2：逐算子反压，定位瓶颈

**先试 `backpressure get`，收到 deprecated 立即切指标法**：

```bash
# 先试这条（老版本可能仍工作）
bytedcli flink vertex backpressure get --url "$URL" --vertex-id "$VID" -j
```

⚠️ 该端点**并非一律废弃**：同集群同为 Flink 1.11/Godel，实测部分作业正常返回 `backpressure-level`（high/ok）+ 逐 subtask `ratio`（可直接用，且可与指标法互证），部分作业返回 `{"status": "deprecated"}`。收到 `deprecated` 时**立即切「指标法」**——不要把 deprecated 误判为「无反压」：

```bash
# 1) 先不带 --names 拉全量指标名（名字随版本而变，先 list 再挑，不臆造）
bytedcli flink vertex metric list --url "$URL" --vertex-id "$VID" -j

# 2) 从上一步实际存在的名字里挑反压相关项复查
bytedcli flink vertex metric list --url "$URL" --vertex-id "$VID" \
  --names backPressuredTimeMsPerSecond,busyTimeMsPerSecond,idleTimeMsPerSecond,isBackPressured -j

# 3) 必要时直接看 subtask 级详情（哪个 subtask 在反压）
bytedcli flink raw get --url "$URL" \
  --path /jobs/00000000000000000000000000000000/vertices/$VID/subtasks -j
```

> ⚠️ 作业 RESTARTING / 没有 RUNNING subtask 时，`flink vertex metric list`（及 `flink job metric list`）返回**空数组 `[]`**（status 仍 success）——这不是命令出错，是没有运行实体可采指标。此时根因看异常栈，**回 `failover.md` 看 `exception get`，不要在反压里反复重试 metric 空转**。

返回里关注每个 subtask 的反压指标（`isBackPressured` / `backPressuredTimeMsPerSecond`，字段名以实际输出为准）。

**判读规则（核心）**：反压沿数据流**从瓶颈向上游**传导。所以：

- 上游算子「被反压」（backpressured 高）通常是**被动的**，不是根因。
- 沿拓扑从上游往下游看，**第一个「自身 busy 高、但它的下游算子已经不忙（backpressured 低 / idle 高）」的算子，就是瓶颈**。
- 如果最末端 sink 算子 busy/backpressured 都不高，但上游全在反压——重点查 sink 写出的外部系统（步骤 4「外部 sink 慢」）。

### 步骤 3：量化瓶颈算子忙碌度

```bash
# 先不带 --names 拉全量，看有哪些 metric 可用（名字随 Flink 版本 / connector 变化）
bytedcli flink vertex metric list --url "$URL" --vertex-id "$VID" -j

# 再针对性复查（常见名，以上一步实际输出为准，不要臆造）
bytedcli flink vertex metric list --url "$URL" --vertex-id "$VID" \
  --names busyTimeMsPerSecond,backPressuredTimeMsPerSecond,idleTimeMsPerSecond -j
```

> ⚠️ 若此处返回空数组 `[]`（status 仍 success），说明作业 RESTARTING / 无 RUNNING subtask，无运行实体可采指标——不是命令错，回 `failover.md` 看异常栈，别空转。

三个值（单位 ms/s，0~1000）合起来近似 100%：

| 形态 | 含义 | 指向 |
|---|---|---|
| `busy` 高、`backpressured` 低、`idle` 低 | 自己算力打满，是瓶颈 | CPU / 逻辑 / 倾斜 |
| `backpressured` 高 | 被下游拖住，**非根因** | 继续往下游找 |
| `idle` 高 | 没数据可处理 | 瓶颈在更上游 / source（参考 `lag.md`） |

对吞吐再看（同样先拉全量再选）：`numRecordsInPerSecond` / `numRecordsOutPerSecond`。

### 步骤 4：瓶颈根因细分

定位到瓶颈算子后，按第四节的「根因 → 证据命令 → 修复建议」表深挖。下面是各分支用到的取证命令。

**(a) GC：** 先找到该算子落在哪些 TaskManager 上，再查 TM 指标与日志。

```bash
# 列出该 vertex 占用的 TaskManager（拿 tm-id）
bytedcli flink vertex taskmanager list --url "$URL" --vertex-id "$VID" -j

# TM 内存 / GC 指标（先全量再选；常见名以实际输出为准）
bytedcli flink taskmanager metric list --url "$URL" --tm-id "$TM_ID" -j
bytedcli flink taskmanager metric list --url "$URL" --tm-id "$TM_ID" \
  --names Status.JVM.Memory.Heap.Used,Status.JVM.Memory.Heap.Max,Status.JVM.GarbageCollector.<gcName>.Time,Status.JVM.GarbageCollector.<gcName>.Count -j

# GC / Full GC 日志（默认 tail 500 行，可 --full）
bytedcli flink taskmanager log get --url "$URL" --tm-id "$TM_ID" --tail 500 -j
# 看 stdout（部分 GC 打到 stdout）
bytedcli flink taskmanager log get --url "$URL" --tm-id "$TM_ID" --stdout --tail 500 -j
```

> Heap 长期贴近 Max + GC time 占比高 + 反压随 GC 周期性出现 → 内存 / GC 问题。

**(b) 数据倾斜：** 看瓶颈算子各 subtask 是否不均。

```bash
# 各 subtask 的处理时间分布
bytedcli flink vertex subtask-time list --url "$URL" --vertex-id "$VID" -j

# 各 subtask 的 records 指标（先全量，再对比 numRecordsIn/Out 在 subtask 间差异）
bytedcli flink vertex metric list --url "$URL" --vertex-id "$VID" -j
```

> 少数 subtask 的 records / busyTime 远高于其它 → key 分布倾斜（热 key）。

**(c) 外部 sink 慢（写 Hive / HBase / 外部 RPC）：** 瓶颈落在 sink 算子时，查下游服务延迟 / QPS。

```bash
# 下游服务概览（PSM 为 sink 写入的目标服务）
bytedcli apm service preview --psm "<downstream.psm>" --range 1h -j

# 下游服务 QPS（注意：service 命令用 --range / --start / --end，不是 --duration）
bytedcli apm service qps --psm "<downstream.psm>" --range 1h -j

# 或直接查目标系统的延迟/错误率指标趋势（grafana query 用 --duration / --start-time / --end-time）
bytedcli apm grafana query "<latency_or_error_metric{psm=<downstream.psm>}>" --duration 1h -j
```

> sink 算子 busy 不高却整体反压、下游服务 latency 升高 / 限流 → 外部系统是瓶颈。

**(d) UDF / 序列化 CPU 热点：** sink 不慢、纯 CPU 打满，进瓶颈 Pod 抓 JVM 栈确认热点函数。

> 口径：这里进的是**生产 Pod**，属**半侵入式只读取证**——只允许在 Pod 内执行**只读**诊断命令（jstack / jmap -heap / jstat / top / dmesg / cat 日志 / df / free 等）抓 JVM 栈 / GC / OOM / 磁盘；**需用户确认后再执行**。**禁止**在 webshell 内执行任何写 / 变更命令（kill、重启进程、改配置、删文件）。

```bash
# 1) 拿瓶颈 TM 的 pod IP（从步骤 (a) 的 taskmanager 信息里取 host/IP）
bytedcli tce instance search -k "<tm_ip_或_podName>" -j

# 2) 开一个可复用的 webshell 会话（按 PSM/pod 定位容器），拿 session-id
bytedcli tce webshell open --psm "<flink_tm_psm>" --pod-name "<podName>" --first -j

# 3) 在容器内只读抓栈（先 jps/ps 找 Java pid，再 jstack；多抓几次对比热点）
bytedcli tce webshell exec --session-id "$SID" --command "jps -l" -j
bytedcli tce webshell exec --session-id "$SID" --command "jstack <pid>" -j
```

> 多次 jstack 中反复出现在同一 UDF / 序列化 / 正则 / JSON 解析栈帧 → 该函数是 CPU 热点。

### 步骤 5：资源面旁证

> 最省事：直接打开 `flink job list --url $URL -j` 返回里的 `metric`（作业大盘）/ `dtop`（flink-on-k8s-resource-v2 资源大盘）两个现成 Grafana URL，CPU/mem/资源趋势一眼可见。下面的 `apm grafana query` 是补充手段。

```bash
# host 级 CPU / mem 趋势，确认是否物理打满或周期抖动
bytedcli apm grafana query "<host_cpu_metric{...}>" --duration 1h -j
bytedcli apm grafana query "<host_mem_metric{...}>" --duration 1h -j
```

> 指标 metric 名随 tenant / 接入方式不同，先用 `apm grafana search <prefix>` 找前缀，或 `apm metric search --prefix <prefix>` 定位可用 metric，再填到 query 里。

### 步骤 6：历史趋势回溯（ByteTSD，实测打通）

REST 指标只有**即时值**；反压的**历史**（什么时候开始、是否周期性、与发布/流量拐点的关系）走 ByteTSD——算子级指标在 `flink.taskmanager.<作业名>.<算子名>.<指标>` 下全量可查（schema 详见 `command-reference.md` §4.2）：

```bash
# 反压历史：哪个时间点开始反压、持续还是间歇（实测返回过真实数据）
bytedcli -j apm grafana query \
  "flink.taskmanager.<作业名>.<算子名>.backPressuredTimeMsPerSecond" \
  --duration 6h --aggregator avg --downsample 30m-avg

# buffer 占用旁证（inPoolUsage≈1=入口堵、outPoolUsage≈1=出口堵）+ isTaskStuck
bytedcli -j apm grafana query "flink.taskmanager.<作业名>.<算子名>.buffers.outPoolUsage" --duration 6h
bytedcli -j apm grafana query "flink.taskmanager.<作业名>.<算子名>.isTaskStuck" --duration 6h

# 数据倾斜趋势化：{taskid=*} 按 subtask 拆 series，逐个对比吞吐/忙碌度
bytedcli -j apm grafana query \
  "avg:flink.taskmanager.<作业名>.<算子名>.numRecordsOutPerSecond.rate{taskid=*}" --duration 1h
# JM 侧还有现成倾斜比指标：
bytedcli -j apm grafana query "flink.jobmanager.<作业名>.ratioTaskLoadSkew" --duration 1d
```

---

## 四、根因 → 证据命令 → 修复建议

> 修复建议一律是「**建议命令 / 建议动作**」，请你确认影响后自行执行。提并发 / rescale / 改内存 / 重启均属变更类操作，本 skill 不代为执行。

| 根因 | 证据（满足这些即指向该根因） | 取证命令 | 修复建议（确认后自行执行） |
|---|---|---|---|
| **下游算子 CPU 瓶颈**（算力打满） | 瓶颈算子 `busyTimeMsPerSecond` 接近 1000、`backPressuredTimeMsPerSecond` 低、`idleTimeMsPerSecond` 低；其下游算子不忙；host CPU 高 | `flink vertex backpressure get`（deprecated 则切指标法）；`flink vertex metric list --names busyTimeMsPerSecond,...`；`apm grafana query` host CPU | 建议**提升该算子并行度 / 整体并发**（在 Godel/Dorado 作业配置页改 parallelism 后重启，或评估是否可拆算子链 disableChaining）。给出建议参数与影响（需 savepoint 重启），由你在平台执行；本 skill 不下发 rescale。 |
| **阻塞型瓶颈**（同步等待，非算力） | 瓶颈算子 `busyTimeMsPerSecond` ≈1000 **但 TM `Status.JVM.CPU.Load` 几乎为 0**、GC 可忽略；吞吐 = 并发 ÷ 单条阻塞耗时（如 20 条/s/subtask ≈ 每条 50ms） | `flink vertex metric list --names busyTimeMsPerSecond,...` + `flink taskmanager metric list --names Status.JVM.CPU.Load,...`（busy 高 + CPU 低即一锤定音）；必要时 jstack 看线程停在哪 | 建议**消除每条记录的同步阻塞**：外部 RPC/IO 改 **Async I/O**（`AsyncDataStream.unorderedWait`）或攒批；若单条耗时不可避免，按 `目标QPS×单条耗时` 提该算子并发。属代码/配置变更，由你执行。 |
| **GC / 内存压力** | TM `Heap.Used` 长期贴近 `Heap.Max`；GC `Time`/`Count` 高；反压随 GC 周期性毛刺；TM 日志有频繁 Full GC | `flink vertex taskmanager list`；`flink taskmanager metric list --names ...Heap...,...GarbageCollector...`；`flink taskmanager log get`（含 `--stdout`） | 建议**调大 TM 堆 / managed memory 或增加 TM 数**；排查大状态 / 大对象 / 缓存未释放；必要时换 GC 策略。给出建议的内存配置改动，由你在作业配置页调整并重启。 |
| **数据倾斜**（热 key） | 瓶颈算子少数 subtask 的 `numRecordsIn/Out`、`busyTime`、处理时间远高于其它 subtask | `flink vertex subtask-time list`；逐 subtask 对比 `flink vertex metric list` | 建议在 SQL/作业逻辑层**对热 key 打散**（两阶段聚合 / 加随机前缀后再聚合、改 keyBy 分布、rebalance/rescale 重分区）。属代码 / SQL 变更，给出改写建议，由你修改后发布。 |
| **外部 sink 慢**（Hive/HBase/RPC/MQ 写出） | 瓶颈在 sink 算子，sink `busy` 不高但整体反压；下游服务 latency 升高 / 限流 / 错误率上升 | sink 处 `flink vertex backpressure get`（deprecated 则切 `metric list`）/ `metric list`；`apm service preview` / `apm service qps`；`apm grafana query` 目标系统延迟 | 建议**优化 sink**：增大 batch / 攒批写、提高 sink 并发或下游服务容量、加重试退避、评估异步写 / 升缓冲。下游扩容与限流调整需对应服务 owner 确认，本 skill 仅给建议。 |
| **UDF / 序列化 CPU 热点** | 纯 CPU 打满、sink 不慢；多次 jstack 反复落在同一 UDF / 序列化 / 解析栈帧 | `tce instance search`；`tce webshell open` + `tce webshell exec --command "jstack <pid>"`（**只读取证**，多抓对比） | 建议**优化热点函数**：缓存编译后正则 / 复用对象 / 换更快的序列化 / 降解析开销；或对该算子单独提并发。属代码变更，给出优化点，由你修改后发布。 |
| **资源不足**（host 物理打满 / TM 偏少） | host CPU 或 mem 打满、无单点倾斜、各 subtask 均匀但都忙；提并发后仍受限于物理资源 | `apm grafana query` host CPU/mem；`flink taskmanager list` 看 TM 数与负载 | 建议**扩资源**：增加 TaskManager / slot、提升单 TM 规格、或整体 rescale。资源变更需在平台执行并评估配额，本 skill 仅给建议命令与参数。 |

---

## 五、命令与字段说明（离线无法核实项，已诚实标注）

- **Flink REST 的具体 metric 名**（`--names` 的值）随 Flink 版本 / connector 而变。请**先不带 `--names` 跑 `metric list` 拉全量**，从输出里挑实际存在的名字再复查，不要臆造确定的指标名。⚠️**不带 `--names` 时返回的每条 `value` 都是 null**（那一趟只是名录），**必须带 `--names` 再跑第二趟才有数值**——第一趟的 null 不代表「无流量/算子没数据」，是没请求值。本文中的 `busyTimeMsPerSecond` / `backPressuredTimeMsPerSecond` / `idleTimeMsPerSecond` / `Status.JVM.Memory.Heap.*` / `Status.JVM.GarbageCollector.*` 为常见名，**以你环境实际输出为准**，`<gcName>` 需替换为实际 GC 器名。
- **apm 的 metric / query 表达式**：**Flink 自身指标已实测**——三层 schema（`flink.job.*{jobname=}` / `flink.jobmanager.<job>.*` / `flink.taskmanager.<job>.<算子>.*`，租户自动路由 `computation.flink`）直接照 `command-reference.md` §4.2 拼即可；host CPU/mem、下游延迟等非 Flink 指标名因 tenant / 接入方式而异，仍用 `apm grafana search <prefix>`（前缀匹配）先发现再查。
- **flag 差异（易错）**：`apm grafana query` 用 `--duration` / `--start-time` / `--end-time`（秒）；`apm service preview|qps` 用 `--range` / `--start` / `--end`。不要混用。
- **`flink job plan` 的子命令**：实际取 plan 要用 `flink job plan get --url $URL`（`--url` 在 `get` 子命令上，直接 `flink job plan --url` 会报 unknown option）。`plan.nodes[].id` 即各 vertex 的 `$VID`，`description` 含 HTML 转义（如 `-&gt;`）。
- **`flink vertex backpressure get` 并非一律废弃**：同集群（Flink 1.11/Godel）实测**部分作业正常返回** `backpressure-level`/`ratio`（可直接用），**部分作业返回** `{"status": "deprecated"}`。所以总是先试一次；收到 deprecated 即切指标法（`flink vertex metric list` 找 `backPressuredTimeMsPerSecond` / `busyTimeMsPerSecond` / `idleTimeMsPerSecond` / `isBackPressured`，先 list 再挑）或 `flink raw get --path /jobs/<jid>/vertices/<vid>/subtasks`。**deprecated ≠ 无反压，不要误判。**
- **算子被 chain 成单顶点时的盲区**：整条链（如 `Source -> Map -> Sink`）合并为一个 vertex 时，vertex 级 `numRecordsIn/Out` 恒为 0（链入口是 source、出口是 sink）、`busyTimeMsPerSecond` 可能 NaN——**不要据此判「无流量」**。破法：用**算子级指标** `<subtask>.<算子名>.numRecordsInPerSecond` 等（在 `vertex metric list` 全量输出里，如 `0.Map.numRecordsOutPerSecond`），可还原链内每个算子的吞吐。
- **`Status.JVM.CPU.Load` 在容器里失真**：它按**宿主机核数**归一化，容器配额下读数严重偏低（实测读数 0.043 ≈ 平台口径 47% 配额利用率）。判断「CPU 是否打满」以 **JM 日志里 autoscaler 的 `max CPU util`**（grep `Autoscaling result`）或 `flink job list` 返回的 `dtop` 资源大盘为准；CPU.Load 只用于「几乎为 0」的定性判断（阻塞型一锤）。
- **Godel 流作业 `jid` 恒为全 0**：`00000000000000000000000000000000`（`flink job list` 返回中的 `jid` 字段）。涉及 `--job-id` 的命令统一这么传；raw path 里的 `<jid>` 同理。
- **`metric list` 返回空数组 `[]` 的语义**：作业 RESTARTING / 无 RUNNING subtask 时，`flink vertex metric list` / `flink job metric list` 返回 `[]`（status 仍 success），是无运行实体可采指标，不是命令错误——此时回 `failover.md` 看 `exception get`，别空转重试。
- **Flink Web URL（`$URL`）来源**：标准产出路径为 `dorado task get` 取作业名 → `megatron app search` 取 RUNNING app 的 `tracking_url`；megatron 查不到时才退到从作业运行页复制。权威流程（入口 A/B/C）见 `locate-job.md`。
- **逃生口**：本文未覆盖的 REST 端点，用 `flink raw get --url $URL --path /any/rest/path -j`（非 JSON 端点加 `--text`）。

---

## 六、与其他诊断文件的衔接

- 反压定位过程中若发现作业其实在 **failover / 频繁重启**（有异常栈、RESTARTING）→ 转 `failover.md`。**反压剧烈时会演化为 failover**：下游顶死、上游算子拿不到输出 buffer 超时，root 栈报 `TimeoutException at RecordWriterOutput.pushToRecordWriter`，作业被周期性击杀（uptime 锯齿固定周期）——这仍是反压根因，解下游瓶颈即止血（见 `failover.md` 根因表「反压击杀」行）。
- 若反压根因实为 **source 侧读不过来 / 分区与并发不匹配**、或诉求是「Lag 怎么降下来」→ 转 `lag.md`（Lag 与反压常互为表里：先用本文确认瓶颈在算子还是 source，再决定走哪边）。
- 如何把入口信息解析成 Flink Web URL（入口 A/B/C）、site/vregion/vdc 取值 → `locate-job.md`；命令完整面与字段字典 → `command-reference.md`。

# 运行时 Failover 诊断

> 前置：① 先按 `locate-job.md` 把入口信息解析为 Flink Web URL + jid + 正确 --site/--vregion；② 确认已登录 `bytedcli auth status`；③ 全程加 -j；④ flink 命令必须带 --url，office 连不通加 --network office|prod 或 --refresh-cookie；⑤ 只读红线：只诊断、只给"建议命令"，不自动执行变更。命令/指标字典见 `command-reference.md`。

> 适用：作业已成功启动、进入 RUNNING 后，**运行过程中**频繁重启 / failover 的排查。
> 启动期（从未进入 RUNNING、提交即报错）的问题见 `startup-errors.md`；纯消费延迟见 `lag.md`；纯吞吐瓶颈见 `backpressure.md`。
> 本文所有命令均为**只读诊断**。所有"修复"内容都是**建议命令**，需你确认后自行执行；本流程绝不自动执行 rescale / 重启 / 重置 offset / 改并发 / 改内存 / 重新部署 / abort / set-success 等任何变更类操作。

---

## 0. 故障域全景（实测频次，先据此定优先级）

> 下表分类与占比来自风神「Flink failover 明细」大盘对约 96.8w 条 failover 日志的归并统计（6 故障域 / 18 子域 / 38 叶子），可作为**根因先验**：命中高频域先查，能显著缩短定位路径。占比是全量样本内的频次占比，仅供排查优先级参考，**不代表当前作业**。

| 故障域               | 实测占比 | 主要叶子（高频在前）                                             | 主要步骤  |
| -------------------- | -------- | ---------------------------------------------------------------- | --------- |
| **节点调度驱逐**     | ≈31%     | Godel 高负载驱逐 / 慢节点驱逐 / Pod 退出 / 机器下线 / 黑名单     | 步骤 2、4 |
| **外部依赖**         | ≈22%     | kafka/BMQ、RMQ、写 HDFS、Hive Metastore、数据湖、Abase、RPC、DTS | 步骤 6    |
| **业务逻辑与数据**   | ≈15%     | 启动失败 / NPE / 全局聚合超时 / 反序列化 / 类冲突                | 步骤 1、8 |
| **连接通信**         | ≈11%     | 网络异常 / TM 心跳超时(-80003) / 单点恢复                        | 步骤 2、4 |
| **资源内存**         | ≈9%      | 堆 OOM / 堆外 OOM / 容器 OOM / slot 申请失败                     | 步骤 2、5 |
| **State/Checkpoint** | ≈3%      | cp 制作/恢复失败 / 状态不兼容 / 单 TM state 超限                 | 步骤 3、7 |

> 约 8% 日志规则未命中（未分类）。占比靠前的「节点调度驱逐 + 外部依赖」合计过半，且多为**平台侧/外部侧**根因——优先用**退出码速查（步骤 2）**与 **`sip event`（步骤 4）**快速排除平台驱逐/外部抖动，再深挖应用层，避免一上来就翻业务栈。

---

## 1. 适用症状

出现以下任一现象，按本文排查：

- 作业 uptime 周期性归零、restart 次数持续增长（⚠️ `fullRestarts`/`numRestarts` 在部分版本的 `flink job metric list`（REST）中**不存在**，查询返回空——**走 ByteTSD**：`apm grafana query "flink.job.numRestarts{jobname=<作业名>}"`，见步骤 5；或以 uptime/start-time 推算）。
- Flink Exception 触发 **region failover**（局部子图重启）或 **global failover**（全图重启）。
- `megatron app search` 同名历史里**多个 FAILED application 首尾相接**（各存活数小时即 FAILED、新 app 随即顶上）= restart-strategy 熔断 → 整作业 FAILED → Dorado 自动重新提交的**application 级滚动循环**（实测 3 天滚 8 轮），故障比单次 failover 更严重。
- `TaskManager lost` / `Heartbeat of TaskManager ... timed out` / TM 频繁掉线。
- `OutOfMemoryError`（heap / direct / metaspace）、`Container killed`（被 YARN/K8s OOM-Kill）。
- checkpoint **连续失败 / 连续超时**，最终触发 `Checkpoint Coordinator is suspending` 类重启。
- **Sink / 外部写出失败**：sink 写 Hive/HBase/Doris/ClickHouse/MySQL 失败，维表 join 外部查询超时，两阶段提交（2PC）sink commit 失败导致重启。
- **state 体积暴涨**：checkpoint state size 单调上涨（state TTL 未配 / key 无限增长）、RocksDB / changelog state backend 增量 checkpoint 上传远端 DFS 失败。
- 外部系统异常：Kafka/BMQ 重平衡或拉取失败、Hive/HDFS 读写异常、状态后端（RocksDB/远端 DFS）异常、RPC/gRPC 超时。
- **发布 / SQL 变更后开始 failover**：最近一次上线后才频繁重启，疑似 SQL/配置变更引入问题。
- 机器侧：宿主机降级、Pod 被驱逐/迁移、磁盘满、网络抖动。

> 关键判断：**先确认是不是真在 failover**。`flink job get` 看 `state` 与 uptime/restart；若 state 长期 RUNNING、uptime 不归零、只是慢，则不是 failover，应转 `backpressure.md` 或 `lag.md`。

---

## 2. 入口 → Flink Web URL

诊断核心命令全部走 `flink` 子命令，**每条都需要 `--url <flinkWebUrl>`**。如何把 Dorado 任务 ID/URL、作业名、PSM 等入口信息解析为 Flink Web URL（入口 A/B/C），权威流程见 `locate-job.md`，本文不重复。

> 拿到 URL 后先验活：`bytedcli flink job list -j --url URL`，能列出作业与 jid 即连通正常（同时也验证了 SSO 会话有效；若挂起/鉴权报错，先 `bytedcli auth status` 排查、必要时 `bytedcli auth login`）。
> office 网络可加 `--network office|prod` 或 `--refresh-cookie`。
> **海外作业**：所有命令追加 `--site <i18n-tt|us-ttp|eu-ttp...>`，必要时再加 `--vregion`/`--vdc`（取值见各命令 `--help`）。下文示例默认国内（site=cn），海外请自行补 `--site`。

---

## 3. 诊断决策树

```
                ┌─────────────────────────────────────────────┐
                │ flink job get  (state / uptime / restart)    │
                │ flink job exception get  (找 ROOT CAUSE 栈)  │
                └───────────────────┬─────────────────────────┘
                                    │  读 root-cause 异常类型 + 时间戳 + 触发 vertex/TM
   ┌──────────┬──────────┬─────────┼──────────┬───────────┬──────────┐
   ▼          ▼          ▼         ▼          ▼           ▼          ▼
 应用层异常  OOM/资源  TM lost   checkpoint  Sink/外部    state 体积  发布/SQL
 (NPE/类型/ (OOM/GC/  心跳超时  连续失败    写出失败     暴涨        变更后
  脏数据/UDF) Container (机器降级/ (超时/对齐) (Hive/Doris/ (TTL未配/   failover
   )        Killed)   Pod驱逐)              CK/2PC/维表) key暴涨)
   │          │          │         │          │           │          │
   ▼          ▼          ▼         ▼          ▼           ▼          ▼
 看root栈  ②定位失败  ④基础设施  ③checkpoint ⑥看sink     ⑦看ck list  ⑧看SQL
 +对应     TM日志/    根因 sip+  list/get +  vertex异常  state size +diff
 vertex    metric     tce取证    ck-config   +apm旁证    单调暴涨
   └──────────┴──────────┴─────────┴──────────┴───────────┴──────────┘
                                    │
                                    ▼
                  ⑤ APM 趋势复核：failover 时间点前后的 CPU/mem/GC/网络曲线
                                    │
                                    ▼
                  归类到「根因分类表」→ 输出"建议命令"给用户确认
```

> **若 failover 伴随明显反压**（root cause 不清晰、但某 vertex 长期 busy/堆积导致 checkpoint 超时进而触发重启），并行参考 `backpressure.md` 定位反压源头。

---

## 4. 诊断步骤（逐步证据采集）

### 步骤 1 —— 确认 failover 与抓 root cause 异常

```bash
# 作业整体：state / 各 vertex 状态 / 计时（含 uptime、restart 相关字段）
bytedcli flink job get -j --url URL

# 根因异常栈：含 root-cause 异常、时间戳、触发的 vertex/TM location
bytedcli flink job exception get -j --url URL
```

要点：

- `flink job get` 看 `state`、`now/start-time`（推算 uptime）、以及作业级 restart 计数字段（字段名以实际 JSON 输出为准）。uptime 远小于作业启动时长、且周期性变化 = 正在反复 failover。
- `flink job exception get` 返回里通常含 `root-exception`（根因）和 `all-exceptions`（含各并发实例的衍生异常）。**只认 root cause**：衍生异常（如 `Job leader lost`、`Connection refused`、`PartitionNotFound`）往往是 TM 掉线后的连锁反应，不是真正原因。
- 从 root 异常里抽取三要素：**异常类型**、**timestamp**、**触发的 vertex / TaskManager(host:port)**。这三项决定后续往哪条分支走。
- ⚠️ **root-exception 可能是历史残留**（作业恢复后该字段不清空）：实测一个已稳定运行 8 天的 RUNNING 作业，root-exception 仍是 8 天前平台驱逐 TM 留下的。**先核对 timestamp 是否落在当前故障窗口**再采信；timestamp 久远 + 作业当前 RUNNING/任务全 RUNNING = 历史事件，不是正在发生的故障。
- 单作业时 `--job-id` 可自动探测；多作业并存时先 `flink job list -j --url URL` 取目标 jid，再对各命令显式传 `--job-id JID`。

### 步骤 2 —— 定位失败 TaskManager（OOM / GC / 网络 / 磁盘）

```bash
# 列出所有 TM，找到 root 异常里 host:port 对应的 tm-id
#   ⚠️ TM_ID 必须每次从这里现取——TM 被驱逐/重建后编号会递增（…-taskmanager-1-1 → 1-2 → 1-3），
#   复用旧编号查 metric/log 会拿到空结果（不是作业出错，是查了不存在的 TM）
bytedcli flink taskmanager list -j --url URL

# 拉该 TM 日志尾部（默认 500 行；OOM/GC/磁盘/网络报错通常在尾部）
bytedcli flink taskmanager log get -j --url URL --tm-id TM_ID --tail 500
#   看 stdout（GC 日志 / "OutOfMemoryError" 常打到 stdout）：
bytedcli flink taskmanager log get -j --url URL --tm-id TM_ID --stdout --tail 500
#   需要完整日志落盘细查：
bytedcli flink taskmanager log get -j --url URL --tm-id TM_ID --full --out /tmp/tm_${TM_ID}.log

# 该 TM 资源指标（heap 使用、GC 次数/耗时、CPU 等）
#   先不带 --names 拉全量，挑出需要的指标名，再用 --names 精确取：
bytedcli flink taskmanager metric list -j --url URL --tm-id TM_ID
bytedcli flink taskmanager metric list -j --url URL --tm-id TM_ID --names <从全量结果里挑选>
```

要点：

- 日志里抓关键字：`OutOfMemoryError`、`Direct buffer memory`、`Metaspace`、`GC overhead`、`Container ... killed`、`No space left on device`（磁盘满）、`Connection reset` / `timed out`（网络）。
- **内存/资源细分指纹（资源内存域 ≈9%）**：
  - 堆 OOM：`GC overhead limit` / `Java heap space` / Full GC 严重（≈7.9%，资源内存里最高）。若由 FileSystem StateBackend 致 FGC → 建议切 RocksDB；否则增单 TM 堆内存。
  - 堆外 OOM：`exceed configured Total Flink Memory` / `Insufficient number of network buffers`（network buffer 不足）→ 建议调 `taskmanager.network.memory.fraction` / `taskmanager.network.memory.max`，或字节内部 `taskmanager.memory.off-heap.fraction` 调整体 off-heap。
  - slot 申请失败：`NoResourceAvailableException: Could not allocate the required slot within slot request timeout` → 资源池不足、slot 申请超时（伴 ResourcePending 增加、Task 卡 SCHEDULED、部分/完全断流）；建议扩队列资源或换空闲队列、缩作业资源。
- **连接通信细分指纹（连接通信域 ≈11%）**：
  - 网络异常：`readAddress failed Connection timed out` / `Network is unreachable` / 网卡·交换机抖动 → 机器网络/交换机故障；建议网络平台确认机器、高优任务临时切集群，ipv6 队列开 `ipv6.enabled=true`。
  - 单点恢复：`Downstream failed` / `Corrupt` / `PartitionNotFound`（≈1.5%）→ 单点恢复机制上下游连接超时 / 脏数据致序列化错误；建议调大 `taskmanager.network.partition.downStreamTaskConnectTimeoutMs`（默认 15min，设 0 关闭），或加 `taskmanager.network.partition.downstream-conn-timeout-recovery.enabled=true` 由下游主动建连减少超时。
- **exitCode 速查（实测，节点调度驱逐占全量 ≈31%，绝大多数是平台侧非应用 bug，引擎会自动换 TM 自愈）**：
  - `-60024` / `-60025` = **Godel 高负载驱逐**（节点高负载，平台主动迁移 TM，≈11.2%）。JM 日志可见 `pod is marked for eviction` → `Start to evict the taskManagers(...) actively` → 申请新 TM 替换，约 1 分钟内自愈。root-exception 会残留 `Request to evict taskManagers actively`，勿误判（看 timestamp）。反复驱逐 → 建议扩容降利用率 / 高优任务切高优队列。
  - `-80015` / `-80025` = **Flink 慢节点驱逐**（节点 IO/CPU 慢被引擎判定慢节点，≈5.7%）。自动迁移到健康节点，通常无需干预；频繁迁移可调大 `slow-task.lag-time.threshold`（lag 阈值默认 5min）/ `slow-task.release.interval`（迁移间隔默认 2h），迟迟不迁移则调小。
  - `-80016` = **机器运维下线迁移**（物理机进运维/下线流程，≈4.2%）。观察自动迁移到健康节点即可。
  - `-80003` = **TM 心跳超时**（`The heartbeat of TaskManager ... timed out` / `disconnecting with resource manager`，≈3.6%）。先查该 TM GC 是否过高，再增资源 / 降 GC 压力；资源已足仍超时 → 建议升级 Flink oncall。
  - `-80001` / `-80006` = 其他/未归类退出码（伴 `Stopping TaskManager pod`，≈1.3%）。通常无需干预，确认作业整体已恢复即可。
  - `239` / `137` = **容器 OOM**（rss 物理内存超限被 OS/调度层 kill，≈0.4%；`239` 亦为字节 Flink TM 容器 JVM fatal heap OOM 退出码）。配合 **TM 编号短时间滚到很大**（如 `…-1-57`）+ 新 TM 存活仅几十秒 = **OOM 无限击杀循环**；建议扩单 TM 内存。
  - `Pod Terminated` / `Deleted` / `Shutting down` = **Pod 被调度层回收**（rss 超限即 OOM、被驱逐、节点故障、Coredump 等，≈5.5%）；若 rss 超限则建议扩内存。
  - `worker ... in blacklist` = **Flink 黑名单驱逐**（Pod/Task 频繁失败致所在物理机被拉黑，≈2.3%）；观察自动迁移即可，频繁拉黑 → 建议升级 Flink oncall。
- TM metric 的**具体指标名随 Flink 版本变化**，务必先拉全量再挑。常见关注项（**以实际输出为准**）：heap used/max、GC count、GC time、CPU load、network 相关。指标名与按义归类见 `command-reference.md`。
- **作业正 RESTARTING / 无 RUNNING subtask 时**，`flink vertex metric list` / `flink job metric list` 会返回空数组 `[]`（`status` 仍 success）——这不是命令错误，而是没有运行实体可采指标；此时根因看 `flink job exception get` 的 root cause，**不要反复重试 metric**。
- 若该 TM 在 `taskmanager list` 里**已不存在**（已被回收/迁移），说明是 TM lost / 被驱逐，直接转步骤 4 做基础设施取证。
- 单个 TM 详情可用 `bytedcli flink taskmanager get -j --url URL --tm-id TM_ID` 看 slot/资源配额。
- **离线/容器已回收时的取证补充**：TM 经 REST 已拿不到、或要看 JobManager(AM) 历史日志时，可用 `megatron app search`（按作业名搜）返回里的 `am_container_logs`（AM=JobManager 容器日志 URL）做离线取证；同条返回的 `diagnostics` 给 FAILED/KILLED 的诊断信息（定位流程见 `locate-job.md`）。

### 步骤 3 —— checkpoint 连续失败排查

```bash
# checkpoint 历史：失败/超时项、对齐耗时、size、间隔、最近 N 次成败
bytedcli flink job checkpoint list -j --url URL

# 单个失败/可疑 checkpoint 的明细（哪个 vertex/subtask 卡住、ack 情况）
bytedcli flink job checkpoint get -j --url URL --checkpoint-id CKPT_ID

# checkpoint 配置（interval / timeout / 对齐模式 / 最小间隔 / 并发上限）
bytedcli flink job checkpoint-config get -j --url URL
```

要点：

- `checkpoint list` 看 `failed`/`completed` 计数、最近若干次的 `end_to_end_duration`、`state_size`、`alignment` 耗时。**连续失败/超时**是触发重启的常见上游原因。
- 在 `checkpoint get` 里定位**是哪个 vertex/subtask 没 ack**（迟迟未完成）——往往与该 subtask 所在 TM 的反压、慢盘、或大状态相关；若是反压导致 barrier 对不齐，转 `backpressure.md`。
- 对照 `checkpoint-config get` 的 timeout 与实际 duration：若 duration 逼近/超过 timeout，是超时型失败；若 state_size 单调暴涨，疑似状态泄漏 / key 倾斜（专项判定见步骤 7）。
- 命令形态：`checkpoint list` 是概览（counts/latest/history），`checkpoint get` 必须带 `--checkpoint-id <id>`（缺失会报 `CLI_ARGS_MISSING`）。若 `checkpoint list` 报 `RestHandlerException: Checkpointing has not been enabled`，含义是**作业根本没开 checkpoint**（不是查询方式错），此时 checkpoint 不是 failover 根因，转其它分支。
- **制作失败按阶段分（实测指纹）**：`Checkpoint expired before completing`（超时）/ `Asynchronous task checkpoint failed`。超时**多由反压引起 → 先解反压**（`backpressure.md`）；**同步阶段慢**（snapshotState 访问第三方 / 非 SSD）→ 建议优化 snapshotState、用高优队列；**异步阶段慢**（HDFS 慢节点）→ 建议迁高优 HDFS 集群。
- **恢复失败（常表现为重启后起不来 / 反复重启，State/Checkpoint 域 ≈3%）**：
  - `Failed to rollback to checkpoint/savepoint` → 作业变更致状态与新 DAG 不兼容；建议恢复到原拓扑继续运行，或改动态参数 `state.checkpoints.namespace` 到不同值放弃从 cp 恢复（无状态重启）。
  - `The new key serializer must be compatible` / `There is no operator for the state` / `Unexpected state handle type` → 有字段/拓扑/StateBackend 改动致状态不兼容；建议确认改动符合预期且可丢数据后换 namespace 启动。
  - `LocalStateExceedDiskQuotaException`（单 TM 状态超磁盘限）→ 建议减单 TM 的 slot 数 + 增 TM 数量保持总并发不变，单 TM 状态量控制在 ~30GB。
  - 以上恢复类失败的修复（改 namespace / 调 slot 分布 / 回滚拓扑）一律为**建议命令交用户确认**，本流程不代为执行。

### 步骤 4 —— 基础设施根因（机器降级 / Pod 驱逐迁移 / 节点取证）

```bash
# 智能运维事件：机器降级、TCE 事件（Pod 驱逐/迁移）、限流降级
#   --keyword 用失败 TM 的 IP 或 pod 名；--category 为单值子串过滤（不可重复，
#   重复给只会取最后一个），需要多类别时按类别分别查询。
#   注意：--biz 默认 tiktok_feeds、--filter 默认 {"libra":{"app":["TikTok"]}}，
#   必须按实际业务线/应用覆盖，否则查不到目标作业相关事件。
bytedcli sip event list -j \
  --category Demotion \
  --keyword <tm_ip_or_pod> \
  --duration 1h \
  --biz <实际业务线，如 tiktok_feeds> \
  --filter '{"libra":{"app":["<实际应用名>"]}}'
#   再查 TCE 类别（Pod 驱逐/迁移）：
bytedcli sip event list -j \
  --category TCE \
  --keyword <tm_ip_or_pod> \
  --duration 1h \
  --biz <实际业务线，如 tiktok_feeds> \
  --filter '{"libra":{"app":["<实际应用名>"]}}'
#   命中后取详情：
bytedcli sip event get -j --id EVENT_ID

# Pod 取证：按 TM IP/pod 名全局搜实例
bytedcli tce instance search -j -k <tm_ip_or_pod>

# 进 Pod 看现场（dmesg/OOM/jstack）——半侵入式只读取证，需用户确认后再执行：
bytedcli tce webshell open -j --psm <PSM> --pod-name <POD> --first        # 拿 session-id
bytedcli tce webshell exec -j --session-id SESSION_ID \
  --command "dmesg -T | tail -n 80"                                       # 看 OOM-Kill/磁盘/网络内核日志
bytedcli tce webshell exec -j --session-id SESSION_ID \
  --command "jstack 1 | head -n 200"                                      # 看 JVM 线程栈（PID 以实际为准）
bytedcli tce webshell close -j --session-id SESSION_ID                    # 用完关闭
```

要点：

- `sip event list` 命中 **Demotion**（机器降级）或 **TCE**（Pod 驱逐/迁移/重调度）且时间窗与 failover timestamp 吻合 = 基础设施根因，**非应用 bug**。
- `--keyword`、`--biz`、`--filter` 三者要按实际作业覆盖默认值，否则可能漏掉事件。`--category` 一次只能传一个类别（单值子串过滤），需覆盖多类别时分别查询。时间窗用 `--duration` 或 `--start/--end` 卡到 failover timestamp 附近。
- webshell 定性为**半侵入式只读取证**：进的是生产 Pod，**需用户确认后再执行**，且只跑只读诊断命令（jstack / jmap -heap / jstat / top / dmesg / cat 日志 / df / free 等）抓 JVM 栈/GC/OOM/磁盘。**禁止**在 webshell 内执行任何写/变更命令（kill、重启进程、改配置、删文件）。

### 步骤 5 —— APM 趋势复核

在 failover timestamp 前后拉资源曲线，确认是"先有资源恶化后 failover"还是"failover 后才异常"：

```bash
# 先搜出可用指标前缀，再按需查询
bytedcli apm grafana search <作业/PSM 前缀>

# 查询某指标在 failover 时间点附近的曲线（CPU/mem/GC/网络）
#   --start-time/--end-time 用 failover timestamp 前后各取一段（epoch 秒）
bytedcli apm grafana query "<aggregator:downsample:metric{tags}>" \
  --start-time <ts_before> --end-time <ts_after>
#   或用相对窗口：
bytedcli apm grafana query "<metric{tags}>" --duration 1h
#   海外作业指定区域：
bytedcli apm grafana query "<metric{tags}>" --duration 1h --region <US-TTP|Singapore-Central...>
```

要点：曲线在 failover 时刻**之前**已抬头（CPU 打满 / heap 触顶 / GC 飙升 / 网络丢包）→ 资源/应用根因；曲线**之后**才异常 → 更可能是机器故障/外部系统先挂、作业被动重启。

**重启计数走 ByteTSD（实测打通，REST 没有这两个指标）**——`flink.job.numRestarts`/`fullRestarts` 在 ByteTSD 按 `jobname` tag 可查（schema 详见 `command-reference.md` §4.2）：

```bash
bytedcli -j apm grafana query "flink.job.numRestarts{jobname=<作业名>}" \
  --duration 10d --aggregator max --downsample 1d-max
```

曲线读法（实测口径）：**平直** = 稳定（历史偶发）；**阶梯/匀速上升** = 持续 failover（实测一慢性反压作业 22 天匀速 +150/天 至 3401 次，斜率恒定从不归零、也从不触发熔断）；**高速攀升后突然归零再攀升** = restart-strategy 熔断 → app FAILED → Dorado 重提的滚动循环（OOM 风暴实测每小时 +250~450 次、单代 app 攒 ~6000 次后归零）。配套还有 `flink.job.numberOfFailedCheckpoints`/`numberOfContinuousCheckpointFailure`（checkpoint 失败趋势）、`flink.jobmanager.<作业名>.numOfFailFilteredByAggregatedStrategy`（被熔断策略吞掉的失败数）。

**uptime 锯齿 = 最快的「固定周期 failover」判别法**（实测最灵）：`flink.job.uptime` 按 `1h-max` 拉，若每小时峰值都封顶在同一个值（如恒 ~10min），说明作业像节拍器一样**每隔固定时长就被重启一次**——这是慢性 failover 的铁证，比逐条翻异常快得多。

```bash
bytedcli -j apm grafana query "flink.job.uptime{jobname=<作业名>}" \
  --duration 24h --aggregator max --downsample 1h-max
#   读法：峰值÷60000=分钟；恒定封顶值 = failover 周期（实测 agent_mock_backpressure 恒 ~10min）
```

> ⚠️ 这种「megatron/flink job list 全程 RUNNING、采样时 backpressure 还报 ok」的慢性 failover，**应用层快照完全看不出**，只能靠 uptime 锯齿 + numRestarts 斜率 + root-exception timestamp 三者合判。

### 步骤 6 —— Sink / 外部写出失败专项

sink 写外部存储失败、维表 join 外部查询超时、2PC sink commit 失败，都会让对应 sink/lookup vertex 抛错并触发重启。先从 root 栈认领异常关键字，再定位是哪个 sink vertex，最后用 apm service/grafana 给外部系统侧旁证。

```bash
# 1) root 栈里认领 sink/外部写出异常（关键字见下表）
bytedcli flink job exception get -j --url URL

# 2) 定位是哪个 sink / lookup vertex 在抛错：先看 plan 找 vertex-id，再看该 vertex 详情
bytedcli flink job plan get -j --url URL
bytedcli flink vertex get -j --url URL --vertex-id VERTEX_ID

# 3) 外部系统侧旁证：sink/维表所连下游服务的 PSM 健康度与依赖成功率
#    —— preview 看下游 PSM 概览，deps 看上下游依赖 QPS / 成功率
bytedcli apm service preview -j --psm <下游服务 PSM>
bytedcli apm service deps -j --psm <下游服务 PSM>
#    或用 grafana 拉外部系统写入相关曲线（错误率 / 延迟），先 search 再 query
bytedcli apm grafana search <下游存储/PSM 前缀>
bytedcli apm grafana query "<metric{tags}>" --duration 1h
```

要点（root 栈关键字 → 外部系统）：

- **Hive / HDFS**：`org.apache.hadoop...`、`AlreadyBeingCreatedException`、`LeaseExpiredException`、`No lease on`、`could only be replicated to 0 nodes`、`NameNode` 相关 → Hive sink / HDFS 写入；查路径/配额/NN 状态。
- **HBase**：`RetriesExhaustedException`、`RegionTooBusyException`、`CallTimeoutException`、`NotServingRegionException` → HBase sink / 维表；查 region 热点与集群健康。
- **Doris / StarRocks**：`stream load` 失败、`Failed to flush`、`too many filtered rows`、`tablet writer write failed`、`backend ... not alive` → Doris sink；查 BE 存活、导入限流、schema 匹配。
- **ClickHouse**：`Too many parts`、`Memory limit (total) exceeded`、`DB::Exception`、`Connection refused` → CK sink；查 part 合并压力与内存。
- **MySQL / JDBC**：`Communications link failure`、`Deadlock found`、`Lock wait timeout exceeded`、`Data truncation`、`Duplicate entry` → JDBC sink；查连接池、锁、唯一键冲突。
- **维表 join 外部查询超时**：lookup 算子栈含 `TimeoutException` / `DEADLINE_EXCEEDED` / `Read timed out`，且抛错 vertex 是 lookup/join → 下游被查服务慢或限流；用 `apm service deps` 看该下游成功率与 QPS。
- **2PC sink commit 失败**（Kafka 事务 / 文件 sink 提交等）：栈含 `TwoPhaseCommitSinkFunction`、`commit ... failed`、`ProducerFencedException`、`InvalidTxnStateException`、`transaction.timeout.ms` → 事务超时或 producer 被 fence；checkpoint 完成后 commit 阶段失败会触发重启，结合步骤 3 的 checkpoint list 看是否 commit 阶段卡住。
- **Kafka / BMQ 生产侧**（外部依赖占全量 ≈22%，BMQ 子域 ≈8.5% 为外部依赖里最高）：
  - `TopicAuthorizationException: Not authorized to access topics` → 无读写权限；到 BMQ topic 详情页申请 owner / consumer group 读写权限，约 15min 生效。
  - `RecordTooLargeException` / `larger than the maximum request size` → 消息过大致频繁 failover / lag 暴涨；SQL 任务调大 `properties.max.request.size`（加在 SQL 的 properties、写到 sink 里，**不是运行参数**）。
  - `xx ms has passed since last append` / `batch creation plus linger time` / `last attempt plus backoff time` → send 线程在 timeout 内没把缓存请求发出（客户端瞬时大流量 / 参数与流量模型不匹配 / 客户端或 BMQ 服务端压力大）；核心是**攒 batch 提发送性能**：调大 `request.timeout.ms`（如 60s）、`batch.size`（几 MB）、`linger.ms`（几秒）；有反压可适当扩并发，无反压则减并发让单 task 攒更多数据。
  - `The request timed out` → Kafka 侧限流，需扩 partition。
  - `LeaderNotAvailableException` / `in the middle of a leadership election` → partition leader 选举中，预期客户端重试自愈。
- **RMQ**（≈5.2%）：`RMQClientException` / `InnerConsumer is closed` → 客户端心跳失败；组件故障 → 建议升级 RMQ oncall。
- **写 HDFS 失败/限流**（≈3.3%）：`Couldn't write data` / `SocketTimeoutException` / `Failed to download resource files timeout` → 热点机器 / 下载超时 / 集群限流；建议换或迁高优 HDFS 集群，下载超时近期靠重试。
- **Hive Metastore**（≈1.3%）：`MetaException ... don't have write permission to [cluster:hive db:... table:...]` / `commit partitions failed` → 写权限缺失或 Metastore 异常；建议申请目标库表写权限，服务异常重试。
- **HDFS/Hive 权限不足**（≈1.0%）：`AccessControlException: Please click url to Apply Permission for USER` → 点报错里的 acp 链接申请对应路径权限后重启。
- **数据湖 Hudi / Bytelake**（≈0.9%）：`org.apache.hudi.exception...` / `com.bytedance.bytelake.memtable...` / `Fluss metadata` / `Global Committer ... Changelog FAILED` → writer / 元数据 / changelog 提交异常；建议按对应组件排查写入冲突、compaction、元数据一致性。
- **在线存储 Abase**（≈0.6%）：`ERR exceed max replica request concurrency`（单值超 35MB）→ 写并发 / 单值过大；建议降 qps / value 或提扩容工单。
- **DTS**（≈0.25%）：`BitSailException Code` → DTS 任务异常码；建议升级 DTS oncall。
- 判 sink / 外部依赖根因后，修复（调 sink 并发/批量/超时、扩下游容量、改唯一键策略、申请权限、扩 partition 等）一律是**建议命令交用户确认**，本流程不代为执行，也不在外部系统侧做任何写操作。

### 步骤 7 —— state 体积暴涨判定

```bash
# 看最近若干次 checkpoint 的 state_size 是否单调暴涨
bytedcli flink job checkpoint list -j --url URL

# 单个 checkpoint 明细：看是哪个 vertex/operator 的 state 在膨胀
bytedcli flink job checkpoint get -j --url URL --checkpoint-id CKPT_ID
```

要点：

- 判定：`checkpoint list` 里 `state_size` 随时间**单调上涨且不回落** = state 泄漏。常见根因：**state TTL 未配置**（窗口/聚合状态永不清理）、**key 基数无限增长**（如以无界 ID 作 key 的 keyed state）、定时器堆积。结合 `checkpoint get` 看是哪个 vertex/operator 的 state 占大头。
- 远端上传失败关键字（RocksDB / changelog / 增量 checkpoint 上传远端 DFS）：`Could not materialize checkpoint`、`Asynchronous task checkpoint failed`、`Fail to upload`、`upload ... to ... failed`、HDFS/对象存储侧的 `LeaseExpiredException` / `quota` / `No space left`、`ChangelogStateBackend` 相关报错、`RocksDBException` / `IO error` / `Corruption`。这类是**状态后端上传/落盘失败**，不是纯体积问题，按外部存储（远端 DFS 配额/可用性）方向查。
- 修复（配 state TTL、改 key 设计、调 RocksDB 选项、扩远端存储配额、开/关增量 checkpoint 等）均为**建议命令交用户确认**，本流程不代为执行。

### 步骤 8 —— 发布 / SQL 变更后 failover

若 failover 紧随最近一次上线出现，优先怀疑 SQL/配置变更引入问题。看当前 SQL，并与上一发布版本做 diff。

```bash
# 看任务当前 SQL（需 task-id 与 project-id，均为必填）
bytedcli dorado task code -j --task-id <TASK_ID> --project-id <PROJECT_ID>

# 与上次发布版本对比 diff（taskId 为位置参数；默认 latest published vs draft）
#   --from / --to 指定版本号（--to -1 表示 draft）；-r 指定 region
bytedcli dorado task diff -j <TASK_ID>
bytedcli dorado task diff -j <TASK_ID> --from <旧版本号> --to <新版本号>
```

要点：

- `dorado task code` 拿当前 SQL 用于比对 root 栈里的算子/字段；`--task-id` 与 `--project-id` **均为必填**（不是位置参数）。
- `dorado task diff` 的 `taskId` 是**位置参数**，不带 `--from/--to` 时默认对比"最新已发布版本 vs 草稿"；要对比两个历史发布版本就显式给 `--from`/`--to`（`--to -1` = draft）。海外/跨区用 `-r/--region`。
- diff 里若新增/改写了 sink、维表 join、UDF、窗口聚合、并发/state 相关配置，且时间点与 failover 起始吻合 = 变更引入。修复 = **建议用户回滚到上一发布版本或修正 SQL 后重新发布**，本流程不代为发布/回滚。

---

## 5. 根因分类 → 证据命令 → 修复建议

> 修复列全部为**建议**，需用户确认后自行执行；本流程不代为执行任何变更。
>
> ⚠️ **建议分级**：修复建议要对准本表认定的**根因**。`开启/优化 checkpoint`、`改重启熔断阈值`、`开 region failover`、`调内存 buffer` 这类只**加快恢复 / 缩小影响面**、但阻止不了触发源的措施，是**优化项**，报告里要和根因修复**分开列、标注为优化项**——尤其当根因是**平台驱逐（-60024/-60025 高负载、-80015/-80025 慢节点、-80016 机器下线）/ 机器降级 / 外部系统抖动**这类作业侧改不掉的外因时，不要把"开 checkpoint"写成 P0 止血，它解决不了 failover，只是让每次冷启动变快。判据：**做了它 failover 会停吗？** 会停才是根因修复。例外：`checkpoint 连续失败`本身触发 failover 时，checkpoint 才是根因。

| 根因分类                                                | 典型证据（异常关键字 / 现象）                                                                                                                                                                                                                                                                                                                                                                                                      | 证据命令                                                                                                                                                                                                                           | 修复建议（仅建议，待确认）                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **应用异常 / 数据**（业务逻辑与数据 ≈15%）              | `NullPointerException`（≈2.1%）/`ClassCastException`/`NumberFormatException`/UDF 抛错；启动失败 `ApplicationExecutionException`/`JobException`（≈6.5%）；反序列化 `Failed to deserialize`/`Non-standard token Infinity`/PB schema 不匹配；类冲突 `NoSuchMethodError`/`NoClassDefFoundError`/`Required context properties mismatch`；全局聚合更新超时；`fastjson`/`jackson` 解析栈；Python 子进程/Gauss 框架栈；root 栈指向业务算子 | `flink job exception get -j --url URL`；定位 vertex 后 `flink vertex get -j --url URL --vertex-id VID`（见 `command-reference.md`）                                                                                                | 建议：NPE/业务逻辑→按栈补空值/类型校验后重发（引擎无关，业务自修）；启动失败→看 JM 启动日志，SQL/包/权限分别处理；反序列化/脏数据→开 `pb.ignore-parse-errors=true`/`json.ignore-parse-errors=true` 并核对格式，上游脏数据反馈生产方；类冲突→排 jar 依赖、rocksdb 依赖设 `provided`、SCM 选最新版；全局聚合超时→增 JM 资源/调大聚合阈值。**升级路径**：定位不出→ Flink oncall；框架内部异常→对应框架 oncall。**不在本流程内改代码或重启。** |
| **资源 OOM**（资源内存 ≈9%）                            | 堆 OOM `Java heap space`/`GC overhead limit`（≈7.9%）；堆外 `exceed configured Total Flink Memory`/`Insufficient number of network buffers`；容器 `退出码 239/137`（rss 超限 OOM-Kill）；slot `NoResourceAvailableException: Could not allocate the required slot within slot request timeout`                                                                                                                                     | `flink taskmanager log get -j --url URL --tm-id ID --tail 500`（含 `--stdout`）；`flink taskmanager metric list -j --url URL --tm-id ID`（heap/GC/CPU）；步骤 5 APM heap/GC 曲线                                                   | 建议：堆 OOM→增单 TM 堆内存，FileSystem StateBackend 致 FGC 则切 RocksDB；堆外→调 `taskmanager.network.memory.fraction/max` 或 `taskmanager.memory.off-heap.fraction`；容器 OOM→扩单 TM 内存；slot 申请超时→扩队列资源/换空闲队列/缩作业资源。**升级路径**：调优仍 OOM→ Flink oncall；容器反复被 kill→ Godel oncall；资源不足→ yarn oncall。**不自动 rescale / 改内存。**                                                                  |
| **机器故障 · 降级 · 平台驱逐**（节点调度驱逐 ≈31%）     | TM 在 `taskmanager list` 中消失；`Heartbeat ... timed out`/`TaskManager lost`；SIP 命中 Demotion/TCE 事件且时间吻合；退出码 `-60024/-60025`（Godel 高负载）、`-80015/-80025`（慢节点）、`-80016`（机器下线）、`-80003`（TM 心跳超时）、`-80001/-80006`（其他）；`worker ... in blacklist`（黑名单）；`Pod Terminated/Deleted/Shutting down`（Pod 回收）——退出码全集见步骤 2 速查                                                   | `flink taskmanager list -j --url URL`；`sip event list -j --category Demotion --keyword <ip> ...`（TCE 类别另起一条 `--category TCE`）；`sip event get -j --id ID`；`tce instance search -j -k <ip>`                               | 多为平台侧机器降级/Pod 驱逐迁移，作业重启后自愈。建议：确认是否反复命中同一坏节点 → 走平台机器置换/隔离流程；必要时联系对应运维。**升级路径**：反复驱逐→ Godel oncall；频繁慢节点迁移/迁移不生效、频繁拉黑→ Flink oncall。**不代为操作机器。**                                                                                                                                                                                             |
| **连接通信 · 单点恢复**（≈11%）                         | 网络：`readAddress failed Connection timed out`/`Network is unreachable`/网卡·交换机抖动；TM 心跳：退出码 `-80003`/`The heartbeat of TaskManager ... timed out`；单点恢复：`Downstream failed`/`Corrupt`/`PartitionNotFound`                                                                                                                                                                                                       | `flink taskmanager log get --tm-id ID --tail 500`；`flink taskmanager metric list`（看 GC）；`sip event list`（网络/限流事件）；步骤 5 APM 网络曲线                                                                                | 网络抖动→网络平台确认机器、高优切集群、ipv6 队列开 `ipv6.enabled=true`；TM 心跳超时→查 GC、增资源/降 GC；单点恢复→调大 `taskmanager.network.partition.downStreamTaskConnectTimeoutMs`（默认 15min，设 0 关）或开 `...downstream-conn-timeout-recovery.enabled=true`。**升级路径**：网络/机器故障→ yarn 网络 oncall；资源足仍超时/频繁单点超时→ Flink oncall。**调参交用户确认。**                                                          |
| **checkpoint / state 恢复失败**（State/Checkpoint ≈3%） | `Failed to rollback to checkpoint/savepoint`；`The new key serializer must be compatible`/`There is no operator for the state`/`Unexpected state handle type`（状态不兼容）；`LocalStateExceedDiskQuotaException`（单 TM state 超磁盘限）                                                                                                                                                                                          | `flink job exception get`；`flink job checkpoint-config get`；`dorado task diff`（看是否变更引入拓扑/字段改动）                                                                                                                    | 状态不兼容→恢复原拓扑，或确认可丢数据后改 `state.checkpoints.namespace` 换值无状态重启；单 TM 超限→减单 TM slot 数 + 增 TM 数保持总并发，单 TM 状态量控制 ~30GB。**升级路径**：仍无法恢复→ Flink oncall。**改 namespace/调 slot 交用户确认。**                                                                                                                                                                                             |
| **Sink / 外部写出失败**                                 | root 栈含 Hive/HDFS（`LeaseExpiredException`/`AlreadyBeingCreated`）、HBase（`RetriesExhausted`/`RegionTooBusy`）、Doris（`stream load`/`tablet writer`）、ClickHouse（`Too many parts`）、MySQL（`Lock wait timeout`/`Deadlock`）；2PC（`TwoPhaseCommitSinkFunction`/`ProducerFenced`/`InvalidTxnState`）；维表 join `TimeoutException`/`DEADLINE_EXCEEDED`                                                                       | `flink job exception get`；`flink job plan get` + `flink vertex get --vertex-id` 定位 sink/lookup vertex；`apm service preview --psm <下游>` / `apm service deps --psm <下游>`；`apm grafana search`+`query` 看外部写入错误率/延迟 | 建议：按外部系统分别处理——Hive/HDFS 查路径/lease/配额/NN；HBase 查 region 热点；Doris 查 BE 存活/导入限流/schema；CK 查 part 合并/内存；JDBC 查连接池/锁/唯一键；2PC 查事务超时/producer fence；维表慢查扩下游容量或加缓存。**调 sink 参数/扩容命令交用户在对应系统执行。**                                                                                                                                                                |
| **state 体积暴涨**                                      | `checkpoint list` 的 `state_size` 单调暴涨不回落；远端上传报错 `Could not materialize checkpoint`/`Fail to upload`/`RocksDBException`/`ChangelogStateBackend`/HDFS `quota`/`No space left`                                                                                                                                                                                                                                         | `flink job checkpoint list`；`flink job checkpoint get --checkpoint-id ID`（定位膨胀 operator）；远端存储侧自查                                                                                                                    | 建议：体积型 → 配 state TTL、修 key 设计避免无界基数、清理定时器堆积；上传失败型 → 扩远端 DFS 配额/确认可用性、评估增量 checkpoint 开关与 RocksDB 选项。**调参命令交用户确认。**                                                                                                                                                                                                                                                           |
| **checkpoint 失败（超时/对齐）**                        | `checkpoint list` 连续 failed/超时；某 subtask 长期未 ack；end_to_end_duration 逼近 timeout                                                                                                                                                                                                                                                                                                                                        | `flink job checkpoint list`；`flink job checkpoint get --checkpoint-id ID`；`flink job checkpoint-config get`                                                                                                                      | 建议：超时型 → 评估调大 checkpoint timeout / 改 unaligned checkpoint / 降 state_size；卡 subtask 由反压引起 → 见 `backpressure.md` 解反压。**调参命令交用户确认。**                                                                                                                                                                                                                                                                        |
| **发布 / SQL 变更后**                                   | failover 紧随最近一次上线；`dorado task diff` 显示 sink/维表/UDF/窗口/并发/state 配置变更，时间点与 failover 起始吻合                                                                                                                                                                                                                                                                                                              | `dorado task code --task-id ID --project-id PID`；`dorado task diff <taskId>`（默认 latest published vs draft，或 `--from/--to`）                                                                                                  | 建议：回滚到上一发布版本，或修正变更后重新发布；结合 root 栈定位是哪段新 SQL/配置引入。**不代为发布/回滚。**                                                                                                                                                                                                                                                                                                                               |
| **外部系统异常（非 sink 侧）**                          | 栈中含 Kafka/BMQ 重平衡或 fetch 失败、`RpcException`/gRPC `DEADLINE_EXCEEDED`                                                                                                                                                                                                                                                                                                                                                      | `flink job exception get`（外部系统报错）；Lag 相关见 `lag.md`（bmq/rmq consumer）                                                                                                                                                 | 建议：MQ 侧确认 topic/集群健康与权限；RPC 确认下游 PSM 健康（`apm service preview/deps`）。**建议命令交用户在对应系统执行。**                                                                                                                                                                                                                                                                                                              |
| **网络**                                                | `Connection reset`/`timed out`/`PartitionNotFound`/`Network buffer` 相关、跨机房抖动                                                                                                                                                                                                                                                                                                                                               | `flink taskmanager log get --tm-id ID --tail 500`；`sip event list`（限流/网络降级事件）；步骤 5 APM 网络曲线                                                                                                                      | 建议：确认是瞬时抖动（重启自愈，观察是否复现）还是持续异常；持续异常建议联系网络/平台侧排查链路与限流，必要时建议置换节点。**不代为操作。**                                                                                                                                                                                                                                                                                                |
| **反压击杀（硬反压→failover）**                         | root 栈 `RuntimeException: TimeoutException at ...RecordWriterOutput.pushToRecordWriter`（上游算子拿不到输出 buffer 超时被杀）；常伴 uptime 锯齿固定周期重启、下游算子 `busy≈1000`+倾斜、numRestarts 匀速涨不熔断                                                                                                                                                                                                                  | `flink job exception get`（认 `pushToRecordWriter`/`TimeoutException` 指纹）；下游算子 `flink vertex metric list --names busyTimeMsPerSecond,...`；`apm grafana query` 看 uptime 锯齿与算子反压历史                                | **这是反压问题的剧烈形态，不是单纯应用 bug**：转 `backpressure.md` 解下游瓶颈（消除阻塞/解 keyBy 倾斜/扩并发），治标可调大 `taskmanager.network.memory.*` 或 buffer 请求超时拉长发作周期。**调参/改代码交用户执行。**                                                                                                                                                                                                                      |

> 指标名（用于 `--names`）与按义归类、以及各 REST 字段含义，统一见 `command-reference.md`。
> 反压相关的 vertex 级排查见 `backpressure.md`。注意 `flink vertex backpressure get` **部分作业**返回 `{"status":"deprecated"}`（并非一律废弃，同集群有的作业仍正常返回 level/ratio）——收到 deprecated 时立即切指标法（`flink vertex metric list` 拉全量挑 `backPressuredTimeMsPerSecond`/`busyTimeMsPerSecond`/`idleTimeMsPerSecond`/`isBackPressured`），不要误判为「无反压」。

---

## 5.1 升级路径速查（自查无果时找对应 oncall）

> 仅在按上表取证、给出建议仍无法收敛时，建议用户升级对应平台 oncall；本流程只给路由，不代为开 oncall。

| 根因方向                                                                                                                   | 升级到                    |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 反复高负载驱逐 / Pod 异常退出 / 机器频繁下线 / 容器反复被 kill                                                             | Godel oncall              |
| 慢节点频繁迁移或不生效 / 黑名单频繁拉黑 / TM 心跳资源足仍超时 / 单点频繁超时 / OOM 调优无效 / 启动定位不出 / cp 仍无法恢复 | Flink oncall              |
| 网络·交换机故障 / slot 资源不足                                                                                            | yarn（网络 / 资源）oncall |
| BMQ 权限不生效·限流·消息过大调优无效·leader 选举不恢复                                                                     | BMQ oncall                |
| RMQ 客户端故障                                                                                                             | RMQ oncall                |
| 写 HDFS 限流持续 / HDFS 权限申请后仍报错                                                                                   | HDFS oncall               |
| Hive Metastore 持续异常 / 写权限                                                                                           | Hive oncall               |
| 数据湖 Hudi/Bytelake 写入持续失败                                                                                          | 对应湖仓 oncall           |
| Abase 持续超并发                                                                                                           | Abase oncall              |
| DTS 异常码                                                                                                                 | DTS oncall                |
| Gauss / 其他业务框架内部异常                                                                                               | 对应框架 oncall           |

> 业务侧根因（NPE、脏数据、类冲突）**引擎无关，业务自行修复**，不升级引擎 oncall。

---

## 6. REST 逃生口

命令面未直接封装的 REST 路径（如某些版本特有的 failover/coordinator 端点），用 `flink raw get` 直取：

```bash
bytedcli flink raw get -j --url URL --path /jobs/<jid>/exceptions
bytedcli flink raw get -j --url URL --path /jobs/<jid>/checkpoints/config
# 非 JSON 端点（如纯文本日志）加 --text
bytedcli flink raw get -j --url URL --path /jobmanager/log --text
```

---

## 7. 纪律提醒（务必遵守）

1. 全流程**只读诊断**。所有"修复建议"必须以"建议执行的命令"形式给出，并提示用户确认后自行执行；**绝不**呈现为已自动执行。
2. 任何 **rescale / 重启 / 重置 offset / 改并发 / 改资源 / 改内存 / 重新部署 / abort / set-success / 回滚 / 发布** 都属变更类操作，本流程**不执行**，只产出建议命令。
3. webshell 为**半侵入式只读取证**：进生产 Pod 需用户确认，仅跑只读诊断命令（jstack/jmap -heap/jstat/top/dmesg/cat/df/free 等），**禁止**任何写/变更命令（kill/重启/改配置/删文件）。
4. 命令面与 `--help` 之外的命令/参数**不要臆造**。Flink REST 的具体 metric 名随版本变化，**先不带 `--names` 拉全量再挑选**。
5. 海外作业记得 `--site` 及必要的 `--vregion`/`--vdc`；`sip event list` 的 `--biz`/`--filter`/`--keyword` 必须按实际业务线覆盖默认值，否则查不到目标事件；`--category` 为单值，多类别需分别查询。
6. 入口（Dorado/作业名/PSM）→ Flink Web URL 的解析流程见 `locate-job.md`（入口 A/B/C），本文不重复。

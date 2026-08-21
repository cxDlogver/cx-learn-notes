# 消费 Lag 诊断

> 前置：① 先按 `locate-job.md` 把入口信息解析为 Flink Web URL + jid + 正确 --site/--vregion；② 确认已登录 `bytedcli auth status`；③ 全程加 -j；④ flink 命令必须带 --url，office 连不通加 --network office|prod 或 --refresh-cookie；⑤ 只读红线：只诊断、只给"建议命令"，不自动执行变更。命令/指标字典见 `command-reference.md`。

> 适用场景：Flink source 消费滞后、Lag 持续增长、event-time 落后于 processing-time（watermark 落后）、窗口/定时器结果迟迟不输出。本文只做**只读诊断**并给出**修复建议命令**，所有变更类操作（调并发 / 扩分区 / 重置 offset / rescale / 重新部署）一律输出建议命令交由用户确认后自行执行，绝不自动执行。

定位作业（拿到 Flink Web URL、source 算子的 vertex-id、消费组 / topic / cluster 等）见 `locate-job.md`。一旦判断 Lag 由下游反压倒灌引起，转 `backpressure.md`；频繁失败 / rebalance 背后的 failover 根因见 `failover.md`。

---

## 一、适用症状

- Source 的 `pendingRecords`（待消费条数）持续 > 0 且不下降，或 Lag 曲线单调上升。
- 队列侧（Kafka/BMQ、RocketMQ/RMQ）消费组 Lag 大且增长，TPS 低于生产 TPS。
- `event-time` 与 `processing-time` 差值（watermark 落后）越来越大，下游开窗/定时器延迟触发。
- **窗口/定时器结果不输出**：上游一直在消费、看着不积压，但下游窗口算子迟迟不 fire、结果不落库——往往是 watermark 没推进到窗口边界。
- 业务侧表现为：实时大盘数据延迟、告警延后、补数追不上、某些指标"卡住不更新"。

> 注意区分三种「滞后」，根因和修复不同，先分清：
> - **消费滞后（Lag）**：队列里有数据，但 source 取得慢 —— 看 `pendingRecords` / 队列 Lag。
> - **进度滞后（source 端 watermark 落后）**：某个分区无数据/空闲（`sourceIdleTime` 高），或乱序水位推进慢 —— 看 source 算子 `watermark get` + `currentFetchEventTimeLag`。
> - **下游窗口不触发（DAG 端 watermark 落后）**：source 在动，但下游窗口算子收不到/收不全 watermark，结果不输出 —— 沿 DAG 逐算子 `watermark get`，找哪一跳 watermark 停住（见第三节 Step 3b 与第五节）。

---

## 二、诊断决策树

```
消费 Lag / 进度落后 / 窗口不触发
        │
        ├─ Step 0  确认入口与 source 算子
        │          locate-job.md → 拿到 Flink Web URL + source 的 vertex-id
        │
        ├─ Step 1  先分流：能力不足  vs  反压倒灌
        │          flink job get -j           （看各 vertex 是否 RUNNING、是否有 BACKPRESSURED）
        │          flink vertex backpressure get --vertex-id <下游算子vid> -j
        │            ├─ 返回 {"status":"deprecated"}（部分作业实测如此，≠ 无反压！正常返回则直接用）
        │            │     ──► 切指标法：flink vertex metric list 拉全量，找
        │            │         backPressuredTimeMsPerSecond / busyTimeMsPerSecond /
        │            │         idleTimeMsPerSecond / isBackPressured（先 list 再挑）
        │            ├─ 有明显反压（ratio 高 / status=HIGH，或上述指标偏高） ──► 转 backpressure.md
        │            │                                         （source 慢是结果，不是根因）
        │            └─ 确认无反压，source 自身吞吐就低 ───────► 继续 Step 2~4
        │
        ├─ Step 1b 近期有发布 / SQL 变更？（Lag 在某次上线后暴增）
        │          dorado task diff <taskId> -j      （改了什么 SQL / 版本对比）
        │          dorado task code  --task-id ... --project-id ... -j  （当前 SQL 全文）
        │
        ├─ Step 2  队列侧 Lag（确认队列里确实积压、看分区/倾斜）
        │          Kafka/BMQ: bmq consumer list -s <group> -j → 找 group/cluster
        │                     bmq topic get --topic-id <ID> -j → 分区数、流量
        │          RocketMQ/RMQ: rmq consumer stats --topic T --group G --cluster C \
        │                          --top-lag-queue 10 -j  → TPS / lag / 倾斜 queue
        │
        ├─ Step 3  Flink 侧 source 指标（吞吐、待消费、抓取延迟、空闲）
        │          flink vertex metric list --vertex-id <source_vid> -j   （先不带 --names 拉全量）
        │            → 再挑 numRecordsInPerSecond / pendingRecords /
        │              currentFetchEventTimeLag / sourceIdleTime
        │          flink vertex watermark get --vertex-id <source_vid> -j  （source 端 event-time 落后）
        │          flink job metric list -j                                （作业级汇总）
        │
        ├─ Step 3b 窗口不触发：沿 DAG 逐算子看 watermark（找停住的那一跳）
        │          flink job plan get -j                       （拿全 DAG 的 vertex-id 与上下游关系）
        │          flink vertex watermark get --vertex-id <每个算子vid> -j
        │            → source OK 但某下游算子 watermark 停住 ──► 多输入取 min / idle subtask 拖全局
        │
        ├─ Step 4  数据倾斜定位（部分 subtask/queue 积压，整体看着没满）
        │          rmq consumer stats ... --top-lag-queue N   （queue 级 lag 排序）
        │          flink vertex metric list 分 subtask 看 numRecordsInPerSecond
        │
        └─ Step 5  历史曲线（确认拐点、关联发布/重启/上游放量）
                   apm grafana query "<lag/吞吐 query>" --duration 1h -j
```

---

## 三、诊断步骤详解

> 以下命令默认在 cn 站点。海外作业需追加 `--site <i18n-tt|us-ttp|eu-ttp...>` 及对应 `--vregion/--vdc`（BMQ/RMQ 用 `-v/--vregion`，APM 用 `--region`）。Flink 命令的 `--url` 为 Godel stream-applications 的 Flink Web URL，**如何拿到该 URL 见 `locate-job.md`**（入口 A/B/C）；office 网络可加 `--network office` 或 `--refresh-cookie`。

### Step 0 — 拿到 source 的 vertex-id

先列作业、再看作业详情，从 plan/vertices 里识别 source 算子（名字通常含 `Source:` / connector 名）：

```bash
bytedcli flink job list --url "$URL" -j
bytedcli flink job get  --url "$URL" -j         # 单作业时 job-id 自动探测
bytedcli flink job plan get --url "$URL" -j     # 拿各 vertex 的 id 与拓扑
```

记下 source 的 `vertex-id`（下文 `$SRC_VID`），以及下游各算子的 vertex-id（窗口/聚合算子下文记为 `$WIN_VID`）。

### Step 1 — 先分流：能力不足 vs 反压倒灌

这是最关键的分流。**source 慢绝大多数情况是被下游反压拖住的结果**，此时优先解下游，而不是去扩 source 并发。

```bash
# 看整体状态：哪些 vertex 处于 BACKPRESSURED / 是否有 subtask 不在 RUNNING
bytedcli flink job get --url "$URL" -j

# 对 source 的直接下游算子逐个看反压（vertex-id 从 flink job plan get 取）
bytedcli flink vertex backpressure get --url "$URL" --vertex-id "$DOWNSTREAM_VID" -j

# ⚠️ 该端点并非一律废弃：部分作业正常返回 backpressure-level/ratio（直接用即可），
#    部分作业返回 {"status":"deprecated"}——deprecated ≠ 无反压！立即切指标法：先拉全量指标名，再挑反压相关指标
bytedcli flink vertex metric list --url "$URL" --vertex-id "$DOWNSTREAM_VID" -j
bytedcli flink vertex metric list --url "$URL" --vertex-id "$DOWNSTREAM_VID" \
  --names backPressuredTimeMsPerSecond,busyTimeMsPerSecond,idleTimeMsPerSecond,isBackPressured -j
```

判定：
- 下游 `backpressure` 的 `status` 为 `HIGH`、或 `backpressureLevel/ratio` 明显偏高 → **属于反压问题，转 `backpressure.md`**，本文 Step 2 之后可略读。
- backpressure get 返回 `{"status":"deprecated"}` → 用指标法判定：`backPressuredTimeMsPerSecond` 持续偏高 / `isBackPressured=true` → 同上转 `backpressure.md`（指标名随版本变化，先 list 再挑，不臆造）。
- 确认下游无反压（`OK` 或反压指标接近 0），但队列 Lag 仍涨、source 吞吐低 → 属于 source 自身消费能力 / 分区 / 倾斜 / 外部限流问题，继续 Step 2。

### Step 1b — 近期发布 / SQL 变更后 Lag 暴增

若 Lag 曲线在某个时间点陡增（见 Step 5 的拐点），先确认那个点是否对应一次发布 / SQL 变更——改了 SQL（加重计算、改 join、改 keyBy、去掉过滤）、改并发、改 connector 参数都可能让吞吐骤降。用 Dorado 看改动内容：

```bash
# 对比已发布版本与草稿（或指定版本号）之间的 SQL 差异，定位"改了什么"
bytedcli dorado task diff <taskId> -j
# 指定版本号对比：--from <已发布版本> --to <目标版本，-1=draft>；海外加 -r/--region
bytedcli dorado task diff <taskId> --from <ver> --to <ver> -j

# 拉当前 SQL 全文（需 task-id 与 project-id；可 --output 写文件）
bytedcli dorado task code --task-id "$TASK_ID" --project-id "$PROJECT_ID" -j
```

> `dorado task diff` 的 taskId 是**位置参数**（不是 `--task-id`）；`dorado task code` 才用 `--task-id`/`--project-id`。两者海外站点用 `-r/--region`。
> 判定：若 diff 显示新增了重计算 / 大 join / 改了并发或 keyBy，且时间点与 Lag 拐点吻合 → 基本可定位为「发布引入的回归」，把 diff 内容给业务确认，回滚或优化由用户执行（本 CLI 不执行上下线）。

### Step 2 — 队列侧 Lag

确认积压在队列侧确实存在，并拿到分区数 / TPS / 倾斜信息。

**Kafka / BMQ：**

```bash
# 按消费组名搜索，拿到 group 所属 cluster 等信息（-a 可查看非自己 owner 的组）
bytedcli bmq consumer list -s "$GROUP" -j

# 看 topic 的分区数与流量（分区数 = source 并发上限的参考）
bytedcli bmq topic get --topic-id "$TOPIC_ID" -j
```

> Lag / 各分区 offset 等数值从上述命令的 JSON 输出字段读取（字段名以实际输出为准）。重点关注：总 lag、分区数、是否某几个分区 lag 远高于其他（倾斜信号）。

**RocketMQ / RMQ：**

```bash
# TPS、总 lag、按 lag 降序的 top-N queue 明细（一条命令同时给吞吐 + 倾斜）
bytedcli rmq consumer stats --topic "$TOPIC" --group "$GROUP" --cluster "$CLUSTER" \
  --top-lag-queue 10 -j

# 需要时再看消费者实例分配（rebalance / 分配不均排查）
bytedcli rmq consumer allocation --topic "$TOPIC" --group "$GROUP" --cluster "$CLUSTER" -j
```

> `--top-lag-queue 10` 返回的 queue 明细可直接定位**倾斜 queue**：若少数 queue lag 极高而多数接近 0，基本可判为数据倾斜或分配不均。

### Step 3 — Flink 侧 source 指标

先**不带 `--names` 拉全量**，看清这个版本/connector 实际暴露了哪些 metric，再回头用 `--names` 精确取值：

```bash
# 1) 全量列出 source 算子的指标名（用于挑选）
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" -j

# 2) 挑选后精确取值（以下为常见名，以实际输出为准）
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" \
  --names numRecordsInPerSecond,pendingRecords,currentFetchEventTimeLag,sourceIdleTime -j

# 3) source 端 event-time 落后（watermark 推进情况）
bytedcli flink vertex watermark get --url "$URL" --vertex-id "$SRC_VID" -j

# 4) 作业级汇总指标
bytedcli flink job metric list --url "$URL" -j
```

> 若 `flink vertex metric list` / `flink job metric list` 返回空数组 `[]`（`status` 仍 success），通常是作业正 RESTARTING / 该 vertex 无 RUNNING subtask——没有运行实体可采指标，不是命令错误。此时先看 `flink job get` 的 state 与 `flink job exception get`，确认作业是否在反复 failover（转 `failover.md`），别在空指标上反复重试。

常见 source 指标含义（**名称随 Flink 版本 / connector 变化，务必以全量 `metric list` 的实际输出为准**）：

| 指标（常见名） | 含义 | 解读 |
|---|---|---|
| `numRecordsInPerSecond` | source 入流速率 | 远低于生产 TPS → 消费能力不足或被反压 |
| `pendingRecords` | 待消费条数（即 Lag） | 持续 > 0 且上升 → 积压 |
| `currentFetchEventTimeLag` | 抓取到的数据 event-time 与当前时间差 | 大且增长 → 进度落后 |
| `sourceIdleTime` | source 空闲时长 | 某些 subtask 高 → 分区无数据 / 空闲，watermark 被拖慢 |

> 分 subtask 查看 `numRecordsInPerSecond`，若各 subtask 速率悬殊，则是**数据倾斜**（见 Step 4）。

### Step 3b — 窗口/定时器不触发：沿 DAG 逐算子看 watermark

症状：source 一直在消费、`pendingRecords` 不高，但**下游窗口/聚合算子结果迟迟不输出**。根因通常不在 source，而在 watermark 没推进到窗口边界。要点：

- **多输入算子 watermark 取 min**：一个算子（如 join、union、keyBy 后的窗口）有多个上游输入通道时，它的 watermark = 所有输入通道 watermark 的**最小值**。只要任一上游（或任一并发实例）的 watermark 落后，整个下游算子的 watermark 就被压在那个最小值，窗口不 fire。
- **单个 idle subtask 拖住全局**：source 某个并发实例对应的分区长时间无数据，若未配置空闲检测（`withIdleness`），该 subtask 的 watermark 不前进，经 min 规则一路传导，**整条 DAG 的下游 watermark 都被这一个空闲 subtask 拖住**——表现就是下游窗口永远等不到边界、结果不输出。

排查：先拿全 DAG 拓扑，再**沿上下游逐算子**看 watermark，定位"watermark 在哪一跳停住"：

```bash
# 1) 拿全 DAG：各 vertex 的 id、上下游关系（找 source → ... → 窗口/聚合 → sink 链路）
bytedcli flink job plan get --url "$URL" -j

# 2) 逐算子看 watermark（从 source 起，沿链路一路往下游，每个算子都查一次）
bytedcli flink vertex watermark get --url "$URL" --vertex-id "$SRC_VID" -j   # source 端
bytedcli flink vertex watermark get --url "$URL" --vertex-id "$WIN_VID" -j   # 窗口/聚合算子
# ……对链路上每一跳重复，直到 sink
```

判定：
- source 的 watermark 在动、但某个下游算子 watermark 停住或远落后 → 该算子是 watermark 卡点。结合它的输入数（多输入取 min）判断是哪条输入/哪个并发实例拖后。
- 配合 source 的 `sourceIdleTime` 看是否某个 subtask 长期空闲（该分区无数据）。
- `watermark get` 输出常按 subtask 给出每个并发的 watermark；找那个**明显偏小（甚至为 Long.MIN / 未推进）**的 subtask，即拖住全局的那个。

修复方向（建议，由用户实施）：为 source 配置空闲分区检测（`WatermarkStrategy.withIdleness(...)` 等），让长期无数据的 subtask 不再拖住全局 watermark；或排查为何某上游通道/分区不产数据。属代码/配置变更，本 CLI 不执行。

### Step 4 — 数据倾斜定位

「整体 Lag 不大但部分滞后」「watermark 推不动」常由倾斜引起：

```bash
# 队列侧：哪个 queue 积压（RMQ）
bytedcli rmq consumer stats --topic "$TOPIC" --group "$GROUP" --cluster "$CLUSTER" \
  --top-lag-queue 20 -j

# Flink 侧：分 subtask 看 source 入流速率是否悬殊
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" \
  --names numRecordsInPerSecond -j
```

判定：少数 queue / subtask 承担绝大部分流量或 lag → 倾斜。倾斜根因常见于 key 分布不均、partition→subtask 映射不均、热点 key。

### Step 5 — APM 历史曲线

确认 Lag/吞吐的拐点，关联是否对应一次发布 / 重启 / 上游放量（拐点与发布对齐时，回到 Step 1b 用 `dorado task diff` 看改了什么）：

> 现成 Grafana 入口：`flink job list -j` 的返回里每个 job 直接带两个 dashboard URL——`metric`（`flink-<cluster>-<jobname>` 作业大盘）与 `dtop`（`flink-on-k8s-resource-v2` 资源大盘）。看 Lag/吞吐/资源曲线可直接复用这两个链接，不必每次都从 `apm grafana search` 重新拼 query。

```bash
# Flink 自身吞吐/消费趋势——三层 schema 已实测，直接拼（详见 command-reference.md §4.2）
bytedcli -j apm grafana query "flink.job.consumerRecordsRate{jobname=<作业名>}" --duration 1d
bytedcli -j apm grafana query \
  "flink.taskmanager.<作业名>.<source算子名>.numRecordsOutPerSecond.rate" --duration 1d
#   按 subtask 拆看分区倾斜：
bytedcli -j apm grafana query \
  "avg:flink.taskmanager.<作业名>.<source算子名>.numRecordsOutPerSecond.rate{taskid=*}" --duration 1h

# 队列侧（bmq/rmq）的 lag metric 名因接入而异——先前缀搜再查
bytedcli apm grafana search "<metric 前缀>" -j
bytedcli apm grafana query "<aggregator:downsample:metric{group_tags}{filter_tags}>" \
  --duration 1h -j
```

> `apm grafana query` 的 query 是**位置参数**。语法：`metric{tag=value}` 或 `aggregator[:downsample]:metric{group_tags}{filter_tags}`，分组用 `{tag=*}`（如 `{taskid=*}`）。Flink 自身指标照上面实测 schema 拼；其余（消费组/topic 维度的队列 lag）用 `apm grafana search`（**前缀匹配**）/ `apm metric tagk-list --metric <名> --tenant computation.flink` 先探测。

---

## 四、根因分类 → 证据命令 → 修复建议

> 修复列**全部是「建议命令」**：请用户核对参数、确认影响后**自行执行**；本 Skill 不代为执行任何变更。变更前建议确认 checkpoint 正常（`flink job checkpoint list -j`）。

| 根因 | 证据命令（只读） | 判定信号 | 修复建议（建议命令，需用户确认后自行执行） |
|---|---|---|---|
| **发布 / SQL 变更回归** | `dorado task diff <taskId> -j`；`apm grafana query` 看拐点是否对应上线时刻 | Lag 在某次发布后陡增；diff 显示新增重计算 / 大 join / 改并发 / 改 keyBy | 把 diff 内容给业务确认，回滚到上个版本或优化新逻辑——**上下线由用户在 Dorado 操作**，本 CLI 不执行 online/回滚 |
| **分区数不足**（并发被分区数卡住） | `bmq topic get --topic-id ID -j`；对比 source 并发（`flink job plan get -j`） | 分区数 ≤ source 并发，单分区已打满，扩并发无效 | 建议在队列平台**扩 topic 分区**（Kafka/BMQ 或 RMQ 控制台操作，非本 CLI 变更）；扩分区后再相应调高 source 并发。提示：扩分区对历史数据顺序有影响，需业务确认 |
| **source 并发不足**（分区充足但并发低） | `flink vertex metric list --names numRecordsInPerSecond,pendingRecords -j`；`flink job plan get -j`（看并发） | 单 subtask 速率打满、`pendingRecords` 持续涨、分区数 > 并发 | 建议提升 source 算子并发 / 整体 rescale（在 Godel/Dorado 作业配置页修改并发后提交，**由用户操作**）。本 CLI 不执行 rescale |
| **下游反压倒灌** | `flink vertex backpressure get --vertex-id <下游vid> -j`（返回 `{"status":"deprecated"}` 时切 `flink vertex metric list` 看 backPressuredTimeMsPerSecond/isBackPressured）；`flink job get -j` | 下游 `status=HIGH`/ratio 高，或反压指标持续偏高，source 速率被压低 | **转 `backpressure.md`** 解下游瓶颈（解算子热点 / 扩下游并发 / 优化 sink）。不要先动 source |
| **数据倾斜**（部分 queue/subtask 积压） | `rmq consumer stats ... --top-lag-queue N -j`；分 subtask `flink vertex metric list --names numRecordsInPerSecond -j` | 少数 queue/subtask lag 或速率远高于其他 | 建议排查 key 分布 / 调整分区策略（rebalance、加盐打散、改 keyBy）—— 属代码/配置变更，给出方向，由用户改后重提交 |
| **外部限流 / 队列读侧瓶颈** | `rmq consumer stats -j`（TPS 上不去且各 queue 均匀慢）；`apm grafana query` 看读 QPS 是否封顶 | TPS 顶在某固定值、扩并发不涨、无反压 | 建议联系队列/存储 owner 提升消费配额 / 读带宽（平台侧操作）；或评估降低单条处理开销。本 CLI 不改配额 |
| **重启回放 / 从旧 checkpoint 恢复** | `apm grafana query` 看 lag 拐点是否对应一次重启；`flink job get -j`（看作业启动时间）；`flink job checkpoint list -j` | lag 在某次重启后陡增、随后逐步收敛 | 一般为预期内追数，**建议先观察追平速度**；若追不动再按「并发/分区不足」处理。是否重置 offset / 跳读由用户决策，本 CLI 不重置 offset |
| **消费组 rebalance**（实例频繁重分配） | `rmq consumer clients/allocation -j`；`bmq consumer list -s GROUP -j`；TM 日志 `flink taskmanager log get` 找 rebalance 关键字 | 分配频繁变动、部分实例无分配、lag 抖动 | 建议排查 subtask 频繁失败/心跳超时（失败链路见 `failover.md`）；稳定并发与心跳后 rebalance 自止。本 CLI 不重启实例 |
| **进度滞后非积压**（分区空闲拖慢 source watermark） | `flink vertex watermark get -j`；`flink vertex metric list --names sourceIdleTime,currentFetchEventTimeLag -j` | `pendingRecords` 不高但 watermark 不推进、`sourceIdleTime` 高 | 建议为 source 配置空闲分区检测 / idle source 水位推进（`withIdleness` 等，代码配置变更，由用户实施） |
| **下游窗口不触发**（DAG 端 watermark 被 min 拖住） | `flink job plan get -j`（拿全 DAG）；沿链路逐算子 `flink vertex watermark get --vertex-id <每个vid> -j`；source 端 `sourceIdleTime` | source watermark 在动，但某下游算子（多输入 join/窗口）watermark 停在最小输入上；窗口结果不输出 | 定位拖后的输入通道 / 空闲 subtask；建议 source 配 `withIdleness`，或修复不产数据的上游通道。代码/配置变更，由用户实施 |

---

## 五、可直接复制的命令模板

```bash
# ===== 变量（按实际填写）=====
URL="<Flink Web URL，如何获取见 locate-job.md>"
SRC_VID="<source 算子 vertex-id，从 flink job plan get -j 取>"
WIN_VID="<下游窗口/聚合算子 vertex-id，从 flink job plan get -j 取>"
GROUP="<消费组名>"
TOPIC="<topic 名>"
TOPIC_ID="<BMQ topic id>"
CLUSTER="<RMQ cluster 名>"
TASK_ID="<Dorado 任务 ID>"
PROJECT_ID="<Dorado 项目 ID>"
# 海外作业追加： --site us-ttp --vregion US-TTP   （BMQ/RMQ 用 -v；APM 用 --region；Dorado 用 -r/--region）

# ===== Step 0 鉴权 + 拿拓扑 =====
bytedcli auth status                                                            # 先确认已登录
bytedcli flink job get --url "$URL" -j
bytedcli flink job plan get --url "$URL" -j                                     # 拿各 vertex-id

# ===== Step 1 分流：反压? =====
bytedcli flink vertex backpressure get --url "$URL" --vertex-id "$SRC_VID" -j   # 通常看下游 vid
# ⚠️ 返回 {"status":"deprecated"} 时（≠ 无反压）切指标法：
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" -j        # 先 list 再挑反压指标
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" \
  --names backPressuredTimeMsPerSecond,busyTimeMsPerSecond,isBackPressured -j

# ===== Step 1b 发布/SQL 变更? =====
bytedcli dorado task diff "$TASK_ID" -j                                         # taskId 是位置参数
bytedcli dorado task code --task-id "$TASK_ID" --project-id "$PROJECT_ID" -j

# ===== Step 2 队列侧 Lag =====
bytedcli bmq consumer list -s "$GROUP" -j
bytedcli bmq topic get --topic-id "$TOPIC_ID" -j
bytedcli rmq consumer stats --topic "$TOPIC" --group "$GROUP" --cluster "$CLUSTER" --top-lag-queue 10 -j

# ===== Step 3 Flink source 指标 =====
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" -j        # 先拉全量
bytedcli flink vertex metric list --url "$URL" --vertex-id "$SRC_VID" \
  --names numRecordsInPerSecond,pendingRecords,currentFetchEventTimeLag,sourceIdleTime -j
bytedcli flink vertex watermark get --url "$URL" --vertex-id "$SRC_VID" -j
bytedcli flink job metric list --url "$URL" -j

# ===== Step 3b 窗口不触发：沿 DAG 逐算子看 watermark =====
bytedcli flink vertex watermark get --url "$URL" --vertex-id "$SRC_VID" -j
bytedcli flink vertex watermark get --url "$URL" --vertex-id "$WIN_VID" -j      # 对链路每一跳重复

# ===== Step 5 历史曲线 =====
bytedcli -j apm grafana query "flink.job.consumerRecordsRate{jobname=<作业名>}" --duration 1d
bytedcli -j apm grafana query "avg:flink.taskmanager.<作业名>.<source算子>.numRecordsOutPerSecond.rate{taskid=*}" --duration 1h
bytedcli apm grafana search "<队列lag指标前缀>" -j      # 非 Flink 指标先探名（前缀匹配）
```

---

## 六、离线无法核实 / 需用户提供的项

- **Flink Web URL**：标准产出路径为 `dorado task get` 取作业名 → `megatron app search` 取 RUNNING app 的 `tracking_url`（详见 `locate-job.md` 入口 B/C）；megatron 查不到时才退到从作业运行页 / Flink UI 复制。
- **source / 窗口算子的 vertex-id**：从 `flink job plan get -j` / `flink job get -j` 的拓扑里识别（source 名字通常含 `Source:`）。
- **Dorado `task-id` / `project-id`**：`dorado task diff` 只需 taskId（位置参数）；`dorado task code` 需 `--task-id` + `--project-id`，从作业的 Dorado 任务页或 `locate-job.md` 的入口信息取。
- **具体 metric 名（`--names`）**：随 Flink 版本 / connector 变化，务必先不带 `--names` 拉全量 `metric list` 再挑选；本文表格中的名称为「常见名，以实际输出为准」。
- **APM query 的精确 metric 名与 tag key**：**Flink 自身指标已实测**（三层 schema 见 `command-reference.md` §4.2，免探直接拼）；队列/host 等其余指标用 `apm grafana search`（前缀匹配）/ `apm metric tagk-list --metric <名> --tenant computation.flink` / `apm metric tagv-list` 先探测。
- **消费组 / topic / cluster 标识**：从作业配置或队列平台获取后填入。

---

## 七、相关文档

- 入口解析、**如何拿 Flink Web URL**、识别 source/窗口 vertex-id：见 `locate-job.md`
- 判断为反压后的逐算子下钻与修复：见 `backpressure.md`
- 频繁失败 / rebalance 背后的 failover 根因：见 `failover.md`
- 启动报错排查：见 `startup-errors.md`
- 通用约定（`-j`、`--site`、`--vregion/--vdc`、海外站点、`flink raw get` 逃生口）、命令/指标字典：见 `command-reference.md`

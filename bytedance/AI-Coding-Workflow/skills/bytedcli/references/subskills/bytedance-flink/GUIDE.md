---
name: bytedance-flink
description: "基于 bytedcli 诊断 Flink / Godel 流式作业的启动报错、运行时 failover、消费 Lag、反压等问题。当用户需要排查 Flink 作业起不来 / 提交失败 / 频繁重启 / failover / TaskManager lost / OOM / checkpoint 连续失败 / 消费滞后 Lag / 反压 / 吞吐下降，或给出 Dorado 流式任务 ID·URL、Flink Web URL、作业名 / PSM 要求定位并诊断流式作业时使用。只读诊断，只给修复建议，绝不自动执行变更。"
---

# Flink 作业诊断（bytedance-flink）

用 ByteDance 内部 CLI `bytedcli` 对 Flink / Godel 流式作业做**只读诊断**，覆盖四类问题：
**启动报错 · 运行时 failover · 消费 Lag · 反压**。本 skill 定位根因并给出「建议命令」，由用户确认后自行执行。

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

---

## 🔴 红线：只读诊断 + 只给建议（务必遵守）

本 skill **只诊断、只输出"建议命令"，绝不自动执行任何变更操作**。下列命令属变更类，**禁止本 skill 主动执行**，只能作为「建议」呈现给用户、由其确认后自行运行：

- 作业生命周期：`dorado task online / stream-online / rerun`、`dorado instance abort / set-success`、`flink` 无写操作（REST 代理本身只读）。
- 部署/容器：`tce deployment action / cancel / execute-step`、`tce instance delete`、`tce service create / update / delete`。
- 队列/offset/并发/内存/重启：任何 rescale、重启、重置 offset、改并发、改内存、重新部署。
- `tce webshell exec`：仅可执行**只读取证命令**（`jstack` / `jmap -heap` / `jstat` / `top` / `dmesg` / `cat` 日志 / `df` / `free`），且进的是生产 Pod，**需用户确认后再执行**；禁止在 webshell 内跑任何写/kill/重启/改配置命令。

---

## ① 鉴权前置（实战第一坎）

所有真实查询都依赖有效 SSO 会话，未登录 / 会话失效会直接报 `AUTH_REQUIRED`。诊断前先确认：

```bash
bytedcli --json auth status      # 校验登录状态
```

**Agent（非交互终端）登录流程**（device-code，分两步，中间需用户在浏览器授权）：

```bash
# 1) 发起登录，拿到授权链接与 complete_token（non-blocking）
bytedcli --json auth login --begin       # 返回 verification_uri_complete + complete_token
#    把 verification_uri_complete 给用户，请其在浏览器完成授权
# 2) 用户授权后，回填 token 完成登录
bytedcli auth login --complete <complete_token>
# 3) 复核
bytedcli --json auth status
```

> 交互终端可直接 `bytedcli auth login`。命令报鉴权类错误（`AUTH_REQUIRED`）时，第一步永远先排查这里，而不是怀疑作业。

---

## ② 诊断主流程

```
Step 0  鉴权：bytedcli auth status（见上）
Step 1  定位：按 locate-job.md，把用户给的任意信息解析为
        【Flink Web URL + jid + 正确的 --site/--vregion】
        核心链路：dorado task get 取作业名 → megatron app search 按名搜，
        取 state=RUNNING 且 tags 含 job=dorado_<taskId> 的 app 的 tracking_url（=Flink Web URL）
        入口三选一：Dorado 流式任务 ID/URL · Flink Web REST URL · 作业名/PSM
Step 2  按症状路由到对应 playbook（见下表），逐步取证 → 定位根因 → 给建议命令
```

> **任何诊断都先走 Step 1（`locate-job.md`）。** 没有 Flink Web URL，`flink` 子命令无法工作。

### 症状 → playbook 路由

| 症状关键词 | 去哪个文件 |
|---|---|
| 作业起不来 / 提交失败 / 部署失败 / 容器反复重启 / 长期 INITIALIZING·CREATED / slot·quota 不足 / 镜像·依赖·配置错误 / 状态恢复失败 | **`references/startup-errors.md`** |
| 运行中频繁重启 / failover / Exception 触发重启 / TaskManager lost·心跳超时 / OOM / checkpoint 连续失败 / Sink 写出失败 / 机器降级被驱逐 | **`references/failover.md`** |
| 消费滞后 / Lag 持续增长 / event-time·watermark 落后 / 窗口不触发不输出 | **`references/lag.md`** |
| 反压 / 某算子 backpressure / 吞吐下降但无重启 / 数据倾斜 | **`references/backpressure.md`** |
| 命令怎么写 / 有哪些指标 / 任意 REST 逃生口 / apm 查询语法 / 鉴权 | **`references/command-reference.md`** |

> **三态互转判别（Lag / 反压 / failover 常相互引发）：** 有重启 → 先 `failover.md`；无重启但吞吐下降、算子 backpressure → `backpressure.md`；source 消费滞后但下游不忙 → `lag.md`。Lag 常因下游**反压**倒灌、反压常因某算子 **failover/GC**，三者要顺着 DAG 串起来看。

### 建议分级纪律（报告呈现，务必遵守）

**修复建议必须对准根因。** 只有「能消除/阻止根因」的措施才算**修复/止血**；只「降低影响面、加快恢复、缩短不可用时间」但不触及根因的措施是**优化项**，必须明确标为优化项，**不得包装成 P0/止血/根因**。

- 典型优化项（≠根因修复）：开启/优化 checkpoint、调 TM 内存、改重启熔断阈值、开 region failover（局部重启）、加 buffer/超时——它们让"出事后恢复更快/影响更小"，但**阻止不了**平台驱逐、上游放量、外部系统抖动等真正的触发源。
- **唯一例外**：当某项本身就是触发源时它才是根因——如 `checkpoint 连续失败` 直接触发 failover 时，checkpoint 才是根因；`OOM` 击杀时内存才是根因。判据：**「做了这件事，failover 会停吗？」** 会停=根因修复；不会停、只是恢复更快=优化项。
- 报告里把根因修复与优化项**分开列**，不要让读者以为开了 checkpoint 就解决了由外因驱动的 failover。

---

## ③ 全局须知速记

- **全程加 `-j`**（仅输出 JSON，便于解析）。
- **`flink` 命令必须带 `--url <flinkWebUrl>`**；office 网络连不通时加 `--network office|prod` 或 `--refresh-cookie`。`flink` 子命令带 `get`/`list` 叶子（如 `flink cluster overview get`、`flink job config get`、`flink job plan get`、`flink jobmanager metric list`）——以 `command-reference.md` 为准。
- **海外作业必须显式 `--site`**（默认 `cn`），取值 `cn|boe|i18n|i18n-bd|i18n-tt|us-ttp|us-ttp-bdee|us-ttp-usts|eu-ttp`，并按机房带 `--vregion`（如 `Singapore-Central`）/`--vdc`；`--auth-site` 默认由 `--site` 推导。**例外**：`dorado task get` 不收 `--site`（只 `-r/--region`），海外 dorado 鉴权靠 `-r <region>` 推导 + tiktok 登录态。
- **海外 TikTok-row 任务（`dataleap-sg.tiktok-row.net` 等）有两道前置门**：① 网络可达性——cn/国内环境**直连海外 endpoint 不通**，表现为 `HTTP_ERROR`/`fetch failed`+超时（≠ `AUTH_REQUIRED`），只能换海外网络/配代理；② tiktok SSO——`auth status` 的 `environments[]` 里 `tiktok`（`sso.tiktok-intl.com`）那项 `authenticated` 才算数，顶层 `authenticated:true` 不代表 tiktok 已登录。任一未过则诊断在第 0 步中止、无数据可取，**如实判定卡在哪道门并给解锁步骤，不臆造**。详见 `locate-job.md` 步骤 0b。
- **region 维度不要混淆**：`dorado` 用 `-r/--region`、`bmq topic` 用 `-v/--vregion`、`sip event` 用 `--region`，与全局 `--site` 是不同维度，各自取值集合不同。
- **流作业在线态以 `megatron app search` 的 `state` 为准**（存在 state=RUNNING 且 tags 含 `job=dorado_<taskId>` 的 application 即在线），不要用 `dorado task check-online`（只回薄布尔）。搜索是**前缀匹配**（中缀/后缀关键词 0 命中）；同名历史 app 多条、`_stage` 后缀是调试影子运行。详见 `locate-job.md`。
- **checkpoint 命令形态**：`flink job checkpoint` 是 GROUP——`flink job checkpoint list` 是**概览**（counts/latest/history），`flink job checkpoint get --checkpoint-id <id>` 是**单个详情**（缺 `--checkpoint-id` 会报 `CLI_ARGS_MISSING`）；`flink job checkpoint-config get` 看配置。未开 checkpoint 的作业会返回 `Checkpointing has not been enabled`（是没开，不是查法错）。
- **历史趋势走 ByteTSD**（REST 只有即时值）：`apm grafana query` 三层实测 schema——作业级 `flink.job.<指标>{jobname=<作业名>}`（含 REST 没有的 `numRestarts`/`fullRestarts`）、JM 级 `flink.jobmanager.<作业名>.<指标>`、算子级 `flink.taskmanager.<作业名>.<算子>.<指标>`（反压/吞吐全套趋势，`{taskid=*}` 按 subtask 拆倾斜）。租户自动路由 `computation.flink`。详见 `command-reference.md` §4.2。

## ④ 关键离线限制

- **标准链路可直接产出 Flink Web URL**：`dorado task get <taskId> -r <region>` 取 `.data.name` → `megatron app search --app-name <作业名/关键词>`，取 state=RUNNING 且 tags 含 `job=dorado_<taskId>` 的 app 的 `tracking_url`，即 Flink Web URL。兜底：从平台「Flink UI / 作业运行页」复制，或从 `dorado task get` JSON 返回里提取 URL 字段。**禁止臆造 URL。** 详见 `locate-job.md`。
- **Flink REST 指标名随版本 / connector 变化**：先不带 `--names` 拉全量 `... metric list` 看有哪些名（⚠️**此时 `value` 全为 null，只是名录**），**再带 `--names` 第二趟才取到数值**——别把第一趟的 null 误读成「无流量/无指标」。不要臆造确定的指标名。
- **`flink vertex backpressure get` 部分作业返回 deprecated**（并非一律——同集群有的作业正常返回 level/ratio，可直接用）：收到 `{"status":"deprecated"}` 即切**指标法**（`flink vertex metric list` 找 `backPressuredTimeMsPerSecond`/`busyTimeMsPerSecond`/`isBackPressured` 等），不要误判为「无反压」。注意 `vertex metric` **只有 `list` 叶子**（无 `get`）。详见 `backpressure.md`。
- **算子 chain 成单顶点时**，vertex 级 `numRecordsIn/Out` 恒 0、busy 可能 NaN——用**算子级指标** `<subtask>.<算子名>.numRecords*`（在 `vertex metric list` 全量里）还原链内吞吐，不要误判「无流量」。
- **流 / 批引擎判别**：`dorado instance diagnose` 默认 `--engine spark`、`megatron` 整组是 Spark；Flink 流作业一律用 `flink` 子命令，别误用 Spark 诊断。判别口径见 `startup-errors.md` / `command-reference.md`。

---

## ⑤ 文件索引

| 文件 | 职责 |
|---|---|
| `references/locate-job.md` | **统一入口**：三类入口 → Flink Web URL + jid + site/vregion；鉴权确认 |
| `references/startup-errors.md` | 启动报错：平台部署层 vs Flink runtime 层分层定位；引擎判别 |
| `references/failover.md` | 运行时 failover：异常根因 / TM·OOM / checkpoint / Sink 写出 / 机器降级 / 发布变更 |
| `references/lag.md` | 消费 Lag：bmq/rmq 队列 Lag + Flink source 指标 + watermark/窗口 |
| `references/backpressure.md` | 反压：逐算子定位瓶颈 + GC/倾斜/外部 sink 根因 |
| `references/command-reference.md` | 命令 & 指标**字典**：鉴权、全局参数、各子命令、apm 查询示例、`flink raw get` 逃生口 |

---

## ⑥ 最小分诊示例

```bash
# 0) 鉴权
bytedcli --json auth status

# 1) 定位：Dorado 任务 ID → 作业名
bytedcli -j dorado task get 125880782 -r cn
#   → .data.name=flink_failure_zoo_case_npe, cluster=Feins-LQ

# 2) 定位：作业名 → tracking_url（=Flink Web URL），核对 tags 里 job=dorado_<taskId>
bytedcli -j megatron app search --app-name flink_failure_zoo
#   → state=RUNNING, tracking_url=https://godel-stream-applications.byted.org/feins-lq/application-.../

# 3) 列作业、拿 jid 与状态（Godel 流作业 jid 常为全 0）
bytedcli flink job list --url "<trackingUrl>" -j

# 4) 看根因异常（failover / 启动异常都先看这里）
bytedcli flink job exception get --url "<trackingUrl>" --job-id 00000000000000000000000000000000 -j

# 5) 反压逐算子：先试 backpressure get；返回 {"status":"deprecated"} 则改指标法
bytedcli flink vertex backpressure get --url "<trackingUrl>" --vertex-id "<vid>" -j
bytedcli flink vertex metric list --url "<trackingUrl>" --vertex-id "<vid>" -j   # 找 backPressuredTimeMsPerSecond / busyTimeMsPerSecond 等
```

> 海外作业在上述命令后追加 `--site <site> --vregion <vregion>`。具体根因分析、证据链与建议命令，进入对应 `references/*.md`。

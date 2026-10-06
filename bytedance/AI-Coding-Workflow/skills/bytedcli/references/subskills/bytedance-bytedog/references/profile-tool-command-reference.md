# `bytedcli bytedog` 命令接口说明

本文说明当前 `bytedcli bytedog` 下可执行命令的调用方式、参数、输出、限制与示例。示例中的参数均为占位值

## 通用参数与用法

下方参数适用于 `bytedcli bytedog` 末级命令。后续每个命令的参数表只列业务参数，不再重复列出这些通用参数。

### bytedcli 全局参数
文档：`references/invocation.md`

| 参数             | 默认值                        | 取值                                                  | 用法                                                                                 |
| ---------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `--site <site>`  | `BYTEDCLI_CLOUD_SITE` 或 `cn` | `cn`、`boe`、`i18n-bd`、`i18n-tt`、`us-ttp`、`eu-ttp` | 需要覆盖默认站点时使用，写在 `bytedcli` 后、`bytedog` 前。 |
| `--json`         | `false`                       | 布尔开关                                              | 输出 bytedcli 标准 JSON envelope；业务对象放在 `data` 字段里，并附 `status` / `error` / `context`。 |

所有命令默认输出文本。需要机器可读输出时，在根命令使用全局 `--json`，例如：

```bash
bytedcli --json bytedog profile get \
  --url 'https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=tce' \
  --output-dir ./bytedog-output
```

## Agent 快速选择

| 目标                                       | 推荐命令                                                                                                                                                                                                                       | 关键输出                                  | 后续动作                                                           |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- | ------------------------------------------------------------------ |
| 已有 ByteDog 详情页 URL，获取状态和结果文件      | `bytedcli bytedog profile get --url <url>`                                                                                                                                                                                     | `status`、`result_urls`、`data-format.md`、结果文件路径、远端文件 URL、任务目标 | 有 `data-format.md` 时先读它；若 `files` 为空，说明详情页未返回可下载结果 URL |
| 需要先找 PID 或确认进程命令                | `bytedcli bytedog tool process list`                                                                                                                                                                                           | `PID`、`TID_NS`、`RSS_KB`、`CPU_%`、`CMD` | 把 `PID` 传给需要 `--pid` 的 create 命令                           |
| 创建新的 on-cpu 任务                       | `bytedcli bytedog profile oncpu create`                                                                                                                                                                                        | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 创建新的 continuous profiling 任务         | `bytedcli bytedog profile sprofile create`                                                                                                                                                                                     | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 创建新的 off-cpu / pthread / jemalloc 任务 | `bytedcli bytedog profile offcpu create` / `bytedcli bytedog profile pthread create` / `bytedcli bytedog profile je-stats create` / `bytedcli bytedog profile je-flamegraph create`                                          | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 为 jemalloc 增量内存火焰图启用目标容器     | `bytedcli bytedog profile je-flamegraph enable --pod demo-pod --pid 12345`                                                                                                                                                    | enable 详情页 URL                         | 执行 `bytedcli bytedog profile get --url <enable-detail-url>` 确认 `status=GOOD` 后等待采集窗口，再创建 `--type increment` 任务          |
| 分析 Java heap 使用、泄漏、对象分布或 GC 压力来源 | `bytedcli bytedog profile java-heapdump create --confirm-hang-risk`                                                                                                                                                            | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 定位 Java 分配热点或短时间 heap 增长        | `bytedcli bytedog profile java-allocation create`                                                                                                                                                                              | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 分析 Java GC 频率、停顿和回收效果           | `bytedcli bytedog profile java-gc create`                                                                                                                                                                                      | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 分析 Java 线程状态、阻塞和高 CPU 线程栈     | `bytedcli bytedog profile java-thread create`                                                                                                                                                                                  | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 分析 Java 锁竞争、锁等待或疑似死锁          | `bytedcli bytedog profile java-lock create`                                                                                                                                                                                    | 详情页 URL                                | 等任务完成后执行 `bytedcli bytedog profile get --url <detail-url>` |
| 查历史任务并获取详情页 URL                 | `bytedcli bytedog profile oncpu list --pod demo-pod --status GOOD` / `bytedcli bytedog profile java-heapdump list --pod demo-pod --status GOOD`                                                                               | `detail_url`                              | 对支持 get 的目标 URL 执行 `bytedcli bytedog profile get`          |

公开的 profile 子命令为 `oncpu`、`sprofile`、`offcpu`、`pthread`、`je-stats`、`je-flamegraph`、`java-heapdump`、`java-allocation`、`java-gc`、`java-thread`、`java-lock`。各类型都按 `create` 与 `list` 两个叶子命令使用；`je-flamegraph` 额外提供 `enable`，用于在增量采集前启用 TCE Pod 目标的 jemalloc memory flamegraph 能力。

## 执行约定

### Target combinations 目标组合速查

| 目标 | 参数组合 | 支持命令 | 备注 |
| ---- | -------- | -------- | ---- |
| Machine | `--ip` | `tool process list`、全部 `profile * create` | PID 级 create 命令还需要 `--pid`；`sprofile create` 只支持该目标。 |
| TCE Pod | `--pod` | `tool process list`、除 `sprofile create` 外的 `profile * create` | `--idc`、`--container-type` 只在 Pod 歧义或需要 sidecar 时传。 |
| Cloud IDE | `--workspace-id` | `tool process list`、`profile oncpu create` | 不支持 offcpu、pthread、jemalloc、Java create。 |
| Big data analytics | `--ip --app-id` | `tool process list`、`profile oncpu/offcpu/pthread/je-stats/je-flamegraph/java-* create` | create 命令必须同时传 `--pid`；TTP 支持情况见下方 TTP 表。 |
| Kubernetes | `--ip --k8s-pod --container-id` | `tool process list`、`profile oncpu/offcpu/pthread/je-stats/je-flamegraph create` | Java create 和 `sprofile create` 不支持；TTP 支持情况见下方 TTP 表。 |

- `bytedcli bytedog profile oncpu create` 的目标形态为：`--ip`、`--pod`、`--workspace-id`、`--ip --app-id`、`--ip --k8s-pod --container-id`。其中 `--app-id` 表示大数据分析实例，必须同时传 `--pid`，且只支持 `cpp/java/python`；Kubernetes 容器目标仅非 TTP 站点支持。
- `bytedcli bytedog profile sprofile create` 只支持 `--ip`。
- `bytedcli bytedog profile offcpu create` / `bytedcli bytedog profile pthread create` / `bytedcli bytedog profile je-stats create` / `bytedcli bytedog profile je-flamegraph create` 的目标形态为：`--ip`、`--pod`、`--ip --app-id`、`--ip --k8s-pod --container-id`；都需要 `--pid`。offcpu / pthread / je-flamegraph 的大数据分析实例和 Kubernetes 容器目标仅非 TTP 站点支持。
- `bytedcli bytedog profile je-flamegraph enable` 只支持 `--pod` 和 `--pid`，用于在增量采集前启用 TCE Pod 目标的 jemalloc memory flamegraph 能力。
- `bytedcli bytedog tool process list` 的目标形态为：`--ip`、`--pod`、`--workspace-id`、`--ip --app-id`、`--ip --k8s-pod --container-id`。
- 各 profile list 历史命令至少提供一个过滤条件：`--ip`、`--pod`、`--psm`。`bytedcli bytedog profile sprofile list` 只接受 `--ip`，不接受 `--pod` / `--psm`。
- 查可用结果文件或可交给 `bytedcli bytedog profile get` 的 detail URL 时，各 profile list 命令默认推荐加 `--status GOOD`。只有需要排查运行中或失败任务时，再改用 `--status RUNNING` / `--status BAD` 或省略状态过滤。
- 各 profile create 命令和 `bytedcli bytedog tool process list` 会尝试把 `--ip` 输入归一化为 ByteDog 可识别的目标 IP；各 profile list 命令不做 IP 归一化，按传入文本过滤历史记录。
- `--idc` 与 `--container-type primary|sidecar` 都是 `--pod` 目标的可选消歧参数。默认先只传 `--pod`；只有 Pod 解析跨 IDC/容器有歧义，或明确要采 sidecar 时再补充。未传 `--container-type` 时默认为 `primary`。
- `--tob` 只用于非 TTP 站点的机器 `--ip` 目标；`bytedcli bytedog profile oncpu/offcpu/pthread/je-stats/je-flamegraph create --ip ... --k8s-pod ... --container-id ...` 和 `bytedcli bytedog tool process list --ip ... --k8s-pod ... --container-id ...` 也可使用该开关。TTP 站点会忽略该开关。
- `bytedcli bytedog profile java-heapdump create`、`bytedcli bytedog profile java-allocation create`、`bytedcli bytedog profile java-gc create`、`bytedcli bytedog profile java-thread create`、`bytedcli bytedog profile java-lock create` 只支持在线采集目标：`--ip`、`--pod` 或 `--ip --app-id`。本期不支持 Kubernetes、Cloud IDE、本地文件上传、远端 URL 上传。
- `bytedcli bytedog profile java-heapdump create` 会采集完整 Java heap 快照，适合看对象分布、引用链和 retained size；快照文件可能很大，采集过程可能短时间影响目标进程，必须显式传 `--confirm-hang-risk`。JOL heapdump estimates 默认开启，需要关闭时传 `--no-jol`。
- `bytedcli bytedog profile java-allocation create` 是低开销分配采样，适合线上定位分配热点或短时间 heap 增长来源；采样结果不是完整分配日志，但通常足够定位热点调用栈。
- `bytedcli bytedog profile je-flamegraph create` 默认 `--type increment`，要求目标已处于 jemalloc memory flamegraph enable 状态；TCE Pod 目标未 enable 时，先执行 `bytedcli bytedog profile je-flamegraph enable --pod demo-pod --pid 12345 --wait`。
- 各 profile create 命令只提交异步任务并返回详情页 URL，不等待结果生成。完整结果统一用 `bytedcli bytedog profile get --url <detail-url> --output-dir <dir>` 获取。
- 非 TTP 站点的各 profile create 命令可选传 `--question <text>` / `--reason <text>`。
- `profile get` 只在详情页任务状态为 `GOOD` 时获取结果。任务仍在运行时会提示稍后重试；任务失败时会输出错误信息和可用提示。若 `GOOD` 详情页没有结果 URL 字段，命令会成功返回 `status`、`result_urls` 和空 `files`，不会生成 `data-format.md`。

### TTP 环境支持

| 命令 | TTP 目标支持 |
| --- | --- |
| `bytedcli bytedog profile oncpu create` | 支持主机、TCE Pod、Cloud IDE、大数据分析实例；不支持 Kubernetes 容器。 |
| `bytedcli bytedog profile offcpu create` / `pthread create` / `je-flamegraph create` | 仅支持主机、TCE Pod；大数据分析实例和 Kubernetes 容器仅非 TTP 站点支持。 |
| `bytedcli bytedog profile je-stats create` | 支持主机、TCE Pod、大数据分析实例、Kubernetes 容器。 |
| `bytedcli bytedog profile java-heapdump create` / `java-allocation create` / `java-gc create` / `java-thread create` / `java-lock create` | 支持主机、TCE Pod、大数据分析实例；不支持 Kubernetes 容器和 Cloud IDE。 |
| `bytedcli bytedog tool process list` | 支持所有目标形态；`--tob` 在 TTP 站点会被忽略。 |

## `bytedcli bytedog profile get`

获取一个或多个 ByteDog 详情页 URL 对应的任务状态、结果 URL 与可下载文件。该命令不创建任务，只读取已存在的详情页结果；只有详情页返回可下载或远端结果 URL 时才会在输出目录生成 `data-format.md`。可自动下载的小文件会保存到本地；Java heap dump `.hprof` 通常很大，`profile get` 不会自动下载，只会输出远端 TOS URL 和提示。

### 参数

| 参数                 | 必填 | 默认值                        | 取值                                                  | 说明                                                                                                                     |
| -------------------- | ---- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `--url <url>`        | 是   | 无                            | 单个 ByteDog detail URL，或英文逗号分隔的多个 URL     | 支持 on-cpu、off-cpu flamegraph、pthread lock、jemalloc stats、jemalloc memory flamegraph、continuous profiling、Java allocation、Java heap dump、Java GC、Java thread、Java lock 详情页。 |
| `--output-dir <dir>` | 否   | `.`                           | 本地目录路径                                          | 有结果 URL 时保存 `data-format.md` 与可自动下载结果文件的目录。目录不存在时会创建。                                                   |

### 输出

文本模式输出获取提示、任务目标、结果 URL 和文件列表。若结果里包含不会自动下载的大文件，还会额外输出远端文件 URL 与下载提示；若详情页没有结果 URL，则只输出状态和空 URL 字段提示，不会输出数据列表：

```text
- HINT
成功获取数据，请优先阅读 ./bytedog-output/data-format.md 获取**采集结果数据介绍和使用须知**
- 任务目标
1001: status=GOOD psm=demo.service ip=- podname=demo-pod
- 结果 URL
1001 perf_stack_url: https://example.com/perf.gz
- 数据列表
./bytedog-output/data-format.md
./bytedog-output/1001-perf_stack_url.collapse
```

JSON 模式输出 bytedcli 标准 envelope，业务字段在 `data` 内：

```json
{
  "status": "success",
  "data": {
    "hint": "成功获取数据，请优先阅读 ./bytedog-output/data-format.md 获取采集结果数据介绍和使用须知",
    "status": "GOOD",
    "data_format_path": "./bytedog-output/data-format.md",
    "targets": [
      {
        "id": 1001,
        "status": "GOOD",
        "psm": "demo.service",
        "ip": null,
        "podname": "demo-pod"
      }
    ],
    "result_urls": [
      {
        "id": 1001,
        "field": "perf_stack_url",
        "url": "https://example.com/perf.gz",
        "description": "on-cpu profiling result"
      }
    ],
    "files": ["./bytedog-output/data-format.md", "./bytedog-output/1001-perf_stack_url.collapse"],
    "remote_files": []
  },
  "error": null,
  "context": {
    "execution_time_ms": 123,
    "timestamp": "2026-06-08T10:00:00+08:00",
    "api_endpoint": "ByteDog Profile Get"
  }
}
```

`data-format.md` 会解释每个结果文件的格式和使用注意事项；只有 `data.data_format_path` 非空且 `data.files` 里实际包含 `data-format.md` 时才读取它。结果文件可能包括 `.collapse`、`.json`、`.txt`、`.log` 等格式，具体取决于详情页的 profile 类型和任务结果。Java heap dump 的 `.hprof` 原始文件只会作为远端 URL 输出，不会自动下载；需要复制 `data.remote_files[].url` 或文本模式的远端文件 URL 手动下载。

多个 URL 用英文逗号分隔时，命令会把所有可下载结果写入同一个输出目录；只要至少一个 URL 产出结果文件，就会生成一份合并后的 `data-format.md` 并写入 `data.data_format_path`。`data.targets`、`data.result_urls` 与 `data.files` 会包含所有任务和本地/远端结果位置；`data.remote_files` 只包含不会自动下载的远端文件。

当详情页任务状态不是 `GOOD` 时，命令不会获取结果文件。任务仍在运行时会提示稍后重试；任务失败时会输出任务错误信息和可用提示。若状态是 `GOOD` 但详情页没有任何结果 URL 字段，命令会成功返回 `status`、`result_urls`、`data_format_path: null` 和空 `files`，并提示未返回可下载结果文件 URL。

### Example

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=tce' \
  --output-dir ./bytedog-output
```

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/java-profiling/heap/detail?id=1002&from=memory' \
  --output-dir ./bytedog-output
```

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/java-profiling/heap/detail?id=1007&from=heap' \
  --output-dir ./bytedog-output
```

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/java-profiling/gc/detail?id=1003&from=gc' \
  --output-dir ./bytedog-output
```

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/java-profiling/thread/detail?id=1004&from=thread' \
  --output-dir ./bytedog-output
```

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/java-profiling/lock/detail?id=1005&from=lock' \
  --output-dir ./bytedog-output
```

```bash
bytedcli bytedog profile get \
  --url 'https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=tce,https://example.bytedog/profiling/jemalloc-profiling/stats?id=1006&from=machine' \
  --output-dir ./bytedog-output
```

```bash
bytedcli --json bytedog profile get \
  --url 'https://example.bytedog/profiling/continuous-profiling/detail?id=1006&time=long' \
  --output-dir ./bytedog-output
```

## `bytedcli bytedog profile oncpu create`

创建 on-cpu flamegraph 异步任务。

### 参数

| 参数                                  | 必填     | 默认值                        | 取值                                                                                                                                                                         | 说明                                                                                                                                    |
| ------------------------------------- | -------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无                            | 主机 IP 或 hostname                                                                                                                                                          | 单独使用时表示机器目标；与 `--app-id` 组合表示大数据分析实例；与 `--k8s-pod --container-id` 组合表示 Kubernetes 容器目标。             |
| `--pod <podname>`                     | 条件必填 | 无                            | TCE Pod 名称                                                                                                                                                                 | 用于对 TCE Pod 发起采样。                                                                                                               |
| `--workspace-id <id>`                 | 条件必填 | 无                            | Cloud IDE workspace ID                                                                                                                                                       | 用于对 Cloud IDE workspace 发起采样。                                                                                                   |
| `--app-id <application_id>`           | 条件必填 | 无                            | 大数据分析实例 Application ID                                                                                                                                                | 与 `--ip` 组合使用，表示大数据分析实例目标；必须同时传 `--pid`，且只支持 `--type cpp/java/python`。                                    |
| `--k8s-pod <podname>`                 | 条件必填 | 无                            | Kubernetes Pod 名称                                                                                                                                                          | 与 `--ip --container-id` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。                                                       |
| `--container-id <container_id>`       | 条件必填 | 无                            | Kubernetes container ID                                                                                                                                                      | 与 `--ip --k8s-pod` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。                                                            |
| `--idc <idc>`                         | 否       | 无                            | IDC 标识                                                                                                                                                                     | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。                                                                          |
| `--container-type <primary\|sidecar>` | 否       | `primary`                     | `primary`、`sidecar`                                                                                                                                                         | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                                                                                          |
| `--pid <pid>`                         | 否       | 无                            | 单个正整数 PID                                                                                                                                                               | 限定单进程采样。只允许一个 PID，不支持逗号或空格分隔。                                                                                  |
| `--duration <seconds>`                | 否       | `30`                          | `1` 到 `300` 的整数秒；`python --tools-type ebpf_profiler` 最少 `10` 秒                                                                                                      | 采样时长。超过 `300` 秒会自动按 `300` 秒提交；启用 `--inline` 且 `--pid` 存在、工具为 `perf` 或 `bytekd` 时，实际采样时长最多 `5` 秒。   |
| `--type <type>`                       | 否       | `cpp`                         | `cpp`、`java`、`python`、`go`、`rust`                                                                                                                                        | 采样语言类型。                                                                                                                          |
| `--tools-type <type>`                 | 否       | 按语言决定                    | `perf`、`bcc`、`bytekd`、`ebpf_profiler`、`pyspy`                                                                                                                            | `cpp/go/rust` 默认 `bytekd`，允许 `perf/bcc/bytekd`；`python` 默认 `ebpf_profiler`，TTP 站点只允许并默认 `pyspy`；`java` 会忽略该参数。 |
| `--callgraph-type <type>`             | 否       | `fp`                          | `fp`、`lbr`、`dwarf`                                                                                                                                                         | 仅在 `--tools-type perf` 时生效。                                                                                                       |
| `--interval <ns>`                     | 否       | `10000000`                    | 正整数纳秒                                                                                                                                                                   | 仅在 `--type java` 时生效，表示 Java 采样间隔。                                                                                         |
| `--perf-event <event[,event...]>`     | 否       | `cpu-cycles`                  | `cpu-cycles`、`cpu-clock`、`branch-misses`、`L1-icache-load-misses`、`L1-dcache-load-misses`、`LLC-load-misses`、`iTLB-load-misses`、`dTLB-load-misses`、`dTLB-store-misses` | 仅在 `--tools-type perf` 时生效。多个值用英文逗号分隔。                                                                                 |
| `--inline`                            | 否       | `false`                       | 布尔开关                                                                                                                                                                     | 在 `--pid` 存在且工具为 `perf` 或 `bytekd` 时解析 inline frame，并把实际采样时长限制在最多 `5` 秒。                                     |
| `--line-info`                         | 否       | `false`                       | 布尔开关                                                                                                                                                                     | 在 `--inline`、`--pid`、`--tools-type perf` 同时满足时解析源码行信息。                                                                  |
| `--python-subprocess`                 | 否       | `false`                       | 布尔开关                                                                                                                                                                     | 仅在 `--type python` 时包含 Python 子进程。                                                                                             |
| `--include-idle`                      | 否       | `false`                       | 布尔开关                                                                                                                                                                     | 仅在 `--type python --tools-type pyspy` 时包含 idle 样本；与其他 Python 工具组合会报错。                                                |
| `--include-native`                    | 否       | `true`                        | 布尔开关                                                                                                                                                                     | 仅在 `--type python` 时包含 native Python stacks；当前 CLI 不提供关闭开关。                                                            |
| `--tob`                               | 否       | `false`                       | 布尔开关                                                                                                                                                                     | 非 TTP 站点支持机器 `--ip` 目标和 Kubernetes 容器目标。用于 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。                               |
| `--question <text>`                   | 否       | 无                            | 文本                                                                                                                                                                         | 非 TTP 站点随 create 请求上传。                                                                                                         |
| `--reason <text>`                     | 否       | 无                            | 文本                                                                                                                                                                         | 非 TTP 站点随 create 请求上传。                                                                                                         |

目标形态必须恰好匹配一种：`--ip`、`--pod`、`--workspace-id`、`--ip --app-id`、`--ip --k8s-pod --container-id`。多传、少传或混用都会报输入错误。大数据分析实例目标必须传 `--pid`，并且不支持 `--type go` / `--type rust`。

### 输出

创建成功后输出详情页 URL 和后续获取命令提示。命令只提交异步任务，不等待结果文件生成。

```json
{
  "status": "success",
  "data": {
    "url": "https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=machine",
    "hint": "任务创建成功，执行 `bytedcli bytedog profile get --url 'https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=machine' --output-dir ./bytedog-output` 查看任务状态以及获取结果数据。"
  },
  "error": null,
  "context": {
    "execution_time_ms": 123,
    "timestamp": "2026-06-08T10:00:00+08:00",
    "api_endpoint": "ByteDog Profile Create"
  }
}
```

### Example

```bash
bytedcli bytedog profile oncpu create \
  --ip example-host
```

```bash
bytedcli bytedog profile oncpu create \
  --pod demo-pod \
  --pid 12345 \
  --type go \
  --tools-type perf \
  --perf-event cpu-clock,branch-misses \
  --inline
```

```bash
bytedcli --json bytedog profile oncpu create \
  --workspace-id sample-workspace \
  --type python \
  --tools-type pyspy \
  --include-idle
```

```bash
bytedcli bytedog profile oncpu create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345
```

```bash
bytedcli bytedog profile oncpu create \
  --ip example-host \
  --k8s-pod demo-pod \
  --container-id sample-container
```

## `bytedcli bytedog profile sprofile create`

创建 continuous flamegraph 异步任务。

### 参数

| 参数                               | 必填 | 默认值                        | 取值                                                  | 说明                                                                                                                    |
| ---------------------------------- | ---- | ----------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `--ip <ip>`                        | 是   | 无                            | 主机 IP 或 hostname                                   | 只支持机器目标。                                                                                                        |
| `--duration <seconds>`             | 否   | `1800`                        | `1` 到 `3600` 的整数秒                                | 采集时长。超过 `3600` 秒会自动按 `3600` 秒提交。                                                                         |
| `--start <unix_seconds>`           | 否   | 当前时间减去 `duration`       | Unix 秒级时间戳                                       | 采集开始时间。                                                                                                          |
| `--display-core`                   | 否   | `false`                       | 布尔开关                                              | 展示 core 信息。                                                                                                        |
| `--tob`                            | 否   | `false`                       | 布尔开关                                              | 非 TTP 站点仅支持 `--ip` 目标。显式传入时使用 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。 |
| `--question <text>`                | 否   | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                                                                         |
| `--reason <text>`                  | 否   | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                                                                         |

该命令不支持 `--pod` 和 `--workspace-id`。默认使用内场机器模式；非 TTP 站点显式传入 `--tob` 时使用 ToB 或 mysql 机器模式。

### 输出

创建成功后输出详情页 URL 和后续获取命令提示。命令只提交异步任务，不等待结果文件生成。

```json
{
  "status": "success",
  "data": {
    "url": "https://example.bytedog/profiling/continuous-profiling/detail?id=1003&time=long",
    "hint": "任务创建成功，执行 `bytedcli bytedog profile get --url 'https://example.bytedog/profiling/continuous-profiling/detail?id=1003&time=long' --output-dir ./bytedog-output` 查看任务状态以及获取结果数据。"
  },
  "error": null,
  "context": {
    "execution_time_ms": 123,
    "timestamp": "2026-06-08T10:00:00+08:00",
    "api_endpoint": "ByteDog Profile Create"
  }
}
```

### Example

```bash
bytedcli bytedog profile sprofile create \
  --ip example-host
```

```bash
bytedcli bytedog profile sprofile create \
  --ip example-host \
  --duration 900 \
  --start 1700000000 \
  --display-core
```

```bash
bytedcli --json bytedog profile sprofile create \
  --ip example-host
```

## `bytedcli bytedog profile offcpu create`

创建 off-cpu flamegraph 异步任务。

### 参数

| 参数                                  | 必填     | 默认值                        | 取值                                                  | 说明                                                                              |
| ------------------------------------- | -------- | ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无                            | 主机 IP 或 hostname                                   | 单独使用时表示机器目标；与 `--app-id` 组合表示大数据分析实例；与 `--k8s-pod --container-id` 组合表示 Kubernetes 容器目标。 |
| `--pod <podname>`                     | 条件必填 | 无                            | TCE Pod 名称                                          | 用于对 TCE Pod 发起采样。                                                         |
| `--app-id <application_id>`           | 条件必填 | 无                            | 大数据分析实例 Application ID                         | 与 `--ip` 组合使用，表示大数据分析实例目标；仅非 TTP 站点支持。                   |
| `--k8s-pod <podname>`                 | 条件必填 | 无                            | Kubernetes Pod 名称                                   | 与 `--ip --container-id` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。   |
| `--container-id <container_id>`       | 条件必填 | 无                            | Kubernetes container ID                               | 与 `--ip --k8s-pod` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。        |
| `--idc <idc>`                         | 否       | 无                            | IDC 标识                                              | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。                    |
| `--container-type <primary\|sidecar>` | 否       | `primary`                     | `primary`、`sidecar`                                  | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                                  |
| `--pid <pid>`                         | 是       | 无                            | 单个正整数 PID                                        | 采集进程。只允许一个 PID，不支持逗号或空格分隔。                                  |
| `--duration <seconds>`                | 否       | `30`                          | `1` 到 `300` 的整数秒                                 | 采样时长。超过 `300` 秒会自动按 `300` 秒提交。                                  |
| `--tools-type <type>`                 | 否       | `bytekd`                      | `bcc`、`bytekd`                                       | off-cpu 采样工具类型。                                                            |
| `--enhance`                           | 否       | `true`                        | 布尔开关                                              | 启用增强栈解析。                                                                  |
| `--tob`                               | 否       | `false`                       | 布尔开关                                              | 非 TTP 站点支持机器 `--ip` 目标和 Kubernetes 容器目标。用于 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。 |
| `--question <text>`                   | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                             |
| `--reason <text>`                     | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                             |

目标形态必须恰好匹配一种：`--ip`、`--pod`、`--ip --app-id`、`--ip --k8s-pod --container-id`。多传、少传或混用都会报输入错误。

### 输出

创建成功后输出详情页 URL 和后续获取命令提示。命令只提交异步任务，不等待结果文件生成。

### Example

```bash
bytedcli bytedog profile offcpu create \
  --pod demo-pod \
  --pid 12345
```

```bash
bytedcli bytedog profile offcpu create \
  --ip example-host \
  --pid 12345 \
  --tools-type bcc
```

```bash
bytedcli --json bytedog profile offcpu create \
  --ip example-host \
  --pid 12345
```

```bash
bytedcli bytedog profile offcpu create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345

bytedcli bytedog profile offcpu create \
  --ip example-host \
  --k8s-pod demo-pod \
  --container-id sample-container \
  --pid 12345
```

## `bytedcli bytedog profile pthread create`

创建 pthread lock profiling 异步任务。

### 参数

| 参数                                  | 必填     | 默认值                        | 取值                                                  | 说明                                                                              |
| ------------------------------------- | -------- | ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无                            | 主机 IP 或 hostname                                   | 单独使用时表示机器目标；与 `--app-id` 组合表示大数据分析实例；与 `--k8s-pod --container-id` 组合表示 Kubernetes 容器目标。 |
| `--pod <podname>`                     | 条件必填 | 无                            | TCE Pod 名称                                          | 用于对 TCE Pod 发起采样。                                                         |
| `--app-id <application_id>`           | 条件必填 | 无                            | 大数据分析实例 Application ID                         | 与 `--ip` 组合使用，表示大数据分析实例目标；仅非 TTP 站点支持。                   |
| `--k8s-pod <podname>`                 | 条件必填 | 无                            | Kubernetes Pod 名称                                   | 与 `--ip --container-id` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。   |
| `--container-id <container_id>`       | 条件必填 | 无                            | Kubernetes container ID                               | 与 `--ip --k8s-pod` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。        |
| `--idc <idc>`                         | 否       | 无                            | IDC 标识                                              | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。                    |
| `--container-type <primary\|sidecar>` | 否       | `primary`                     | `primary`、`sidecar`                                  | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                                  |
| `--pid <pid>`                         | 是       | 无                            | 单个正整数 PID                                        | 采集进程。只允许一个 PID，不支持逗号或空格分隔。                                  |
| `--duration <seconds>`                | 否       | `30`                          | `1` 到 `300` 的整数秒                                 | 采样时长。超过 `300` 秒会自动按 `300` 秒提交。                                  |
| `--enhance`                           | 否       | 非 TTP: `true`；TTP: `false`  | 布尔开关                                              | 启用增强栈解析。                                                                  |
| `--tob`                               | 否       | `false`                       | 布尔开关                                              | 非 TTP 站点支持机器 `--ip` 目标和 Kubernetes 容器目标。用于 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。 |
| `--question <text>`                   | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                             |
| `--reason <text>`                     | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                             |

目标形态必须恰好匹配一种：`--ip`、`--pod`、`--ip --app-id`、`--ip --k8s-pod --container-id`。多传、少传或混用都会报输入错误。

### 输出

创建成功后输出详情页 URL 和后续获取命令提示。命令只提交异步任务，不等待结果文件生成。

### Example

```bash
bytedcli bytedog profile pthread create \
  --pod demo-pod \
  --pid 12345 \
  --duration 120
```

```bash
bytedcli --json bytedog profile pthread create \
  --ip example-host \
  --pid 12345
```

```bash
bytedcli bytedog profile pthread create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345

bytedcli bytedog profile pthread create \
  --ip example-host \
  --k8s-pod demo-pod \
  --container-id sample-container \
  --pid 12345
```

## `bytedcli bytedog profile je-stats create`

创建 jemalloc stats 异步任务。

### 参数

| 参数                                  | 必填     | 默认值                        | 取值                                                  | 说明                                                                              |
| ------------------------------------- | -------- | ----------------------------- | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无                            | 主机 IP 或 hostname                                   | 单独使用时表示机器目标；与 `--app-id` 组合表示大数据分析实例；与 `--k8s-pod --container-id` 组合表示 Kubernetes 容器目标。 |
| `--pod <podname>`                     | 条件必填 | 无                            | TCE Pod 名称                                          | 用于对 TCE Pod 发起采样。                                                         |
| `--app-id <application_id>`           | 条件必填 | 无                            | 大数据分析实例 Application ID                         | 与 `--ip` 组合使用，表示大数据分析实例目标。                                      |
| `--k8s-pod <podname>`                 | 条件必填 | 无                            | Kubernetes Pod 名称                                   | 与 `--ip --container-id` 组合使用，表示 Kubernetes 容器目标。                      |
| `--container-id <container_id>`       | 条件必填 | 无                            | Kubernetes container ID                               | 与 `--ip --k8s-pod` 组合使用，表示 Kubernetes 容器目标。                           |
| `--idc <idc>`                         | 否       | 无                            | IDC 标识                                              | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。                    |
| `--container-type <primary\|sidecar>` | 否       | `primary`                     | `primary`、`sidecar`                                  | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                                  |
| `--pid <pid>`                         | 是       | 无                            | 单个正整数 PID                                        | 采集进程。只允许一个 PID，不支持逗号或空格分隔。                                  |
| `--tob`                               | 否       | `false`                       | 布尔开关                                              | 非 TTP 站点支持机器 `--ip` 目标和 Kubernetes 容器目标。用于 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。 |
| `--question <text>`                   | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                             |
| `--reason <text>`                     | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                             |

目标形态必须恰好匹配一种：`--ip`、`--pod`、`--ip --app-id`、`--ip --k8s-pod --container-id`。多传、少传或混用都会报输入错误。

### 输出

创建成功后输出详情页 URL 和后续获取命令提示。命令只提交异步任务，不等待结果文件生成。

### Example

```bash
bytedcli bytedog profile je-stats create \
  --ip example-host \
  --pid 12345
```

```bash
bytedcli --json bytedog profile je-stats create \
  --pod demo-pod \
  --pid 12345
```

```bash
bytedcli bytedog profile je-stats create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345

bytedcli bytedog profile je-stats create \
  --ip example-host \
  --k8s-pod demo-pod \
  --container-id sample-container \
  --pid 12345
```

## `bytedcli bytedog profile je-flamegraph enable`

为 TCE Pod 目标提交 jemalloc memory flamegraph enable 异步任务。该命令只执行 enable，不生成增量或全量采集结果；enable 任务达到 `GOOD` 后，再等待需要的采集窗口并执行 `bytedcli bytedog profile je-flamegraph create --type increment` 创建增量火焰图任务。自动化场景推荐加 `--wait`，让命令阻塞到 enable 任务完成。

### 参数

| 参数                                  | 必填 | 默认值    | 取值                 | 说明                                                                       |
| ------------------------------------- | ---- | --------- | -------------------- | -------------------------------------------------------------------------- |
| `--pod <podname>`                     | 是   | 无        | TCE Pod 名称         | enable 只支持 TCE Pod 目标。                                               |
| `--idc <idc>`                         | 否   | 无        | IDC 标识             | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。            |
| `--container-type <primary\|sidecar>` | 否   | `primary` | `primary`、`sidecar` | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                            |
| `--pid <pid>`                         | 是   | 无        | 单个正整数 PID       | 需要启用 jemalloc flamegraph 的进程。只允许一个 PID。                      |
| `--wait`                              | 否   | `false`   | 布尔开关             | 等待 enable 任务状态变为 `GOOD` 后再返回。                                 |
| `--wait-timeout <seconds>`            | 否   | `600`     | 正整数秒             | 配合 `--wait` 使用的最长等待时间。                                         |
| `--wait-interval <seconds>`           | 否   | `5`       | 正整数秒             | 配合 `--wait` 使用的轮询间隔。                                             |
| `--question <text>`                   | 否   | 无        | 文本                 | 非 TTP 站点随 enable 请求上传。                                            |
| `--reason <text>`                     | 否   | 无        | 文本                 | 非 TTP 站点随 enable 请求上传。                                            |

### 输出

创建成功后输出 enable 详情页 URL 和后续增量采集提示。未加 `--wait` 时不等待任务完成，应执行 `bytedcli bytedog profile get --url <enable-detail-url>` 查看 enable 任务状态；加 `--wait` 时会在 `status=GOOD` 后返回。

### Example

```bash
bytedcli bytedog profile je-flamegraph enable \
  --pod demo-pod \
  --pid 12345
```

```bash
bytedcli bytedog profile je-flamegraph enable \
  --pod demo-pod \
  --pid 12345 \
  --wait
```
## `bytedcli bytedog profile je-flamegraph create`

创建 jemalloc memory flamegraph 异步任务。

### 参数

| 参数                                  | 必填     | 默认值                        | 取值                                                  | 说明                                                                                 |
| ------------------------------------- | -------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `--ip <ip>`                           | 条件必填 | 无                            | 主机 IP 或 hostname                                   | 单独使用时表示机器目标；与 `--app-id` 组合表示大数据分析实例；与 `--k8s-pod --container-id` 组合表示 Kubernetes 容器目标。 |
| `--pod <podname>`                     | 条件必填 | 无                            | TCE Pod 名称                                          | 用于对 TCE Pod 发起采样。                                                            |
| `--app-id <application_id>`           | 条件必填 | 无                            | 大数据分析实例 Application ID                         | 与 `--ip` 组合使用，表示大数据分析实例目标；仅非 TTP 站点支持。                      |
| `--k8s-pod <podname>`                 | 条件必填 | 无                            | Kubernetes Pod 名称                                   | 与 `--ip --container-id` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。      |
| `--container-id <container_id>`       | 条件必填 | 无                            | Kubernetes container ID                               | 与 `--ip --k8s-pod` 组合使用，表示 Kubernetes 容器目标；仅非 TTP 站点支持。           |
| `--idc <idc>`                         | 否       | 无                            | IDC 标识                                              | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。                       |
| `--container-type <primary\|sidecar>` | 否       | `primary`                     | `primary`、`sidecar`                                  | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                                      |
| `--pid <pid>`                         | 是       | 无                            | 单个正整数 PID                                        | 采集进程。只允许一个 PID，不支持逗号或空格分隔。                                     |
| `--type <stock\|increment>`           | 否       | `increment`                   | `increment`、`stock`                                  | `increment` 表示增量采集；`stock` 表示全量采集。主机、大数据分析实例和 Kubernetes 目标仅支持 `increment`。 |
| `--process-name <cmd>`                | 否       | 无                            | 进程命令字符串                                        | 指定进程命令。建议先用 `bytedog tool process list` 确认。                          |
| `--je-version <version>`              | 否       | 自动选择                      | jemalloc 版本字符串                                   | 仅在 `--type stock` 时使用。显式传入时优先级最高。                                   |
| `--tob`                               | 否       | `false`                       | 布尔开关                                              | 非 TTP 站点支持机器 `--ip` 目标和 Kubernetes 容器目标。用于 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。 |
| `--question <text>`                   | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                                 |
| `--reason <text>`                     | 否       | 无                            | 文本                                                  | 非 TTP 站点随 create 请求上传。                                                 |

目标形态必须恰好匹配一种：`--ip`、`--pod`、`--ip --app-id`、`--ip --k8s-pod --container-id`。多传、少传或混用都会报输入错误。创建前会校验 jemalloc 环境状态；环境不可采集时不会创建任务。主机、大数据分析实例和 Kubernetes 目标只支持 `--type increment`；TCE Pod 目标可使用 `--type stock`。默认 `--type increment` 要求目标查询状态为 jemalloc memory flamegraph enable 状态；TCE Pod 目标未 enable 时，先执行 `bytedcli bytedog profile je-flamegraph enable --pod demo-pod --pid 12345 --wait`。若 TCE Pod 目标已做过全量采集，命令会提示改用全量采集；若大数据分析实例或 Kubernetes 容器目标不支持增量采集，命令会提示更换实例或改用对应 TCE Pod 目标。

### 输出

创建成功后输出详情页 URL 和后续获取命令提示。命令只提交异步任务，不等待结果文件生成。

### Example

```bash
bytedcli bytedog profile je-flamegraph create \
  --pod demo-pod \
  --pid 12345 \
  --process-name /opt/demo/bin/server
```

```bash
bytedcli bytedog profile je-flamegraph create \
  --pod demo-pod \
  --pid 12345 \
  --type stock \
  --je-version 5.2.1.sample
```

```bash
bytedcli --json bytedog profile je-flamegraph create \
  --ip example-host \
  --pid 12345
```

```bash
bytedcli bytedog profile je-flamegraph create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345

bytedcli bytedog profile je-flamegraph create \
  --ip example-host \
  --k8s-pod demo-pod \
  --container-id sample-container \
  --pid 12345
```

## `bytedcli bytedog profile java-heapdump create`

创建 Java heap dump 异步任务并返回详情页 URL，不等待结果生成。适合分析 Java heap 使用、疑似内存泄漏、对象分布、引用链、retained size 或 GC 压力来源。支持在线 TCE / machine / 大数据分析实例目标，不支持 Kubernetes、Cloud IDE、本地文件上传、远端 URL 上传。

该命令会采集完整 heap 快照，快照文件可能很大，采集过程可能短时间影响目标进程。必须显式传 `--confirm-hang-risk` 才会提交任务。JOL heapdump estimates 默认开启，关闭时传 `--no-jol`。

### 参数

| 参数                                  | 必填     | 默认值    | 取值                 | 说明                                      |
| ------------------------------------- | -------- | --------- | -------------------- | ----------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无        | 主机 IP 或 hostname  | 单独使用时表示 machine 目标；与 `--app-id` 组合表示大数据分析实例目标。 |
| `--pod <podname>`                     | 条件必填 | 无        | TCE Pod 名称         | 用于 TCE 在线采集。                       |
| `--app-id <application_id>`           | 条件必填 | 无        | 大数据分析实例 Application ID | 与 `--ip` 组合使用，表示大数据分析实例目标。 |
| `--pid <pid>`                         | 是       | 无        | 单个正整数 PID       | Java 进程 PID。只允许一个 PID。           |
| `--confirm-hang-risk`                 | 是       | `false`   | 布尔开关             | 确认 heap dump 可能导致目标进程 hang 住。 |
| `--no-jol`                            | 否       | JOL 开启  | 布尔开关             | 关闭 JOL heapdump estimates 输出。        |
| `--idc <idc>`                         | 否       | 无        | IDC 标识             | 只在 `--pod` 目标下用于 Pod 歧义消解。    |
| `--container-type <primary\|sidecar>` | 否       | `primary` | `primary`、`sidecar` | 只在 `--pod` 目标下用于容器歧义消解。     |
| `--question <text>`                   | 否       | 无        | 文本                 | 非 TTP 站点随 create 请求上传。           |
| `--reason <text>`                     | 否       | 无        | 文本                 | 非 TTP 站点随 create 请求上传。           |

### Example

```bash
bytedcli bytedog profile java-heapdump create \
  --ip example-host \
  --pid 12345 \
  --confirm-hang-risk

bytedcli bytedog profile java-heapdump create \
  --pod demo-pod \
  --pid 12345 \
  --confirm-hang-risk

bytedcli bytedog profile java-heapdump create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345 \
  --confirm-hang-risk
```

## `bytedcli bytedog profile java-allocation create`

创建 Java lightweight allocation sampling 异步任务并返回详情页 URL，不等待结果生成。适合线上低开销定位 Java 分配热点、短时间 heap 增长或分配压力来源；采样结果不是完整分配日志。支持在线 TCE / machine / 大数据分析实例目标，不支持 Kubernetes、Cloud IDE、本地文件上传、远端 URL 上传。

### 参数

| 参数                                  | 必填     | 默认值     | 取值                              | 说明                                  |
| ------------------------------------- | -------- | ---------- | --------------------------------- | ------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无         | 主机 IP 或 hostname               | 单独使用时表示 machine 目标；与 `--app-id` 组合表示大数据分析实例目标。 |
| `--pod <podname>`                     | 条件必填 | 无         | TCE Pod 名称                      | 用于 TCE 在线采集。                   |
| `--app-id <application_id>`           | 条件必填 | 无         | 大数据分析实例 Application ID     | 与 `--ip` 组合使用，表示大数据分析实例目标。 |
| `--pid <pid>`                         | 是       | 无         | 单个正整数 PID                    | Java 进程 PID。只允许一个 PID。       |
| `--duration <seconds>`                | 否       | `30`       | `1` 到 `300` 的整数秒             | 采样时长。                            |
| `--interval <interval>`               | 否       | `10000000` | `10000000`、`100ms`、`100us` 等值 | 轻量分配采样间隔。                    |
| `--idc <idc>`                         | 否       | 无         | IDC 标识                          | 只在 `--pod` 目标下用于 Pod 歧义消解。 |
| `--container-type <primary\|sidecar>` | 否       | `primary`  | `primary`、`sidecar`              | 只在 `--pod` 目标下用于容器歧义消解。 |
| `--question <text>`                   | 否       | 无         | 文本                              | 非 TTP 站点随 create 请求上传。       |
| `--reason <text>`                     | 否       | 无         | 文本                              | 非 TTP 站点随 create 请求上传。       |

### Example

```bash
bytedcli bytedog profile java-allocation create \
  --ip example-host \
  --pid 12345

bytedcli bytedog profile java-allocation create \
  --pod demo-pod \
  --pid 12345

bytedcli bytedog profile java-allocation create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345
```

## `bytedcli bytedog profile java-gc create`

创建 Java GC log profiling 异步任务并返回详情页 URL，不等待结果生成。适合分析频繁 GC、Full GC、停顿过长、回收效果异常或 GC 配置调优问题。支持在线 TCE / machine / 大数据分析实例目标，不支持 Kubernetes、Cloud IDE、本地文件上传、远端 URL 上传。

### 参数

| 参数                                  | 必填     | 默认值    | 取值                 | 说明                                  |
| ------------------------------------- | -------- | --------- | -------------------- | ------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无        | 主机 IP 或 hostname  | 单独使用时表示 machine 目标；与 `--app-id` 组合表示大数据分析实例目标。 |
| `--pod <podname>`                     | 条件必填 | 无        | TCE Pod 名称         | 用于 TCE 在线采集。                   |
| `--app-id <application_id>`           | 条件必填 | 无        | 大数据分析实例 Application ID | 与 `--ip` 组合使用，表示大数据分析实例目标。 |
| `--pid <pid>`                         | 是       | 无        | 单个正整数 PID       | Java 进程 PID。只允许一个 PID。       |
| `--idc <idc>`                         | 否       | 无        | IDC 标识             | 只在 `--pod` 目标下用于 Pod 歧义消解。 |
| `--container-type <primary\|sidecar>` | 否       | `primary` | `primary`、`sidecar` | 只在 `--pod` 目标下用于容器歧义消解。 |
| `--question <text>`                   | 否       | 无        | 文本                 | 非 TTP 站点随 create 请求上传。       |
| `--reason <text>`                     | 否       | 无        | 文本                 | 非 TTP 站点随 create 请求上传。       |

### Example

```bash
bytedcli bytedog profile java-gc create \
  --ip example-host \
  --pid 12345

bytedcli bytedog profile java-gc create \
  --pod demo-pod \
  --pid 12345

bytedcli bytedog profile java-gc create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345
```

## `bytedcli bytedog profile java-thread create`

创建 Java thread profiling 异步任务并返回详情页 URL，不等待结果生成。适合分析线程状态、thread dump、线程阻塞、Runnable/Waiting 分布、高 CPU 线程栈或疑似死锁线索。支持在线 TCE / machine / 大数据分析实例目标，不支持 Kubernetes、Cloud IDE、本地文件上传、远端 URL 上传。

### 参数

| 参数                                  | 必填     | 默认值     | 取值                              | 说明                                  |
| ------------------------------------- | -------- | ---------- | --------------------------------- | ------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无         | 主机 IP 或 hostname               | 单独使用时表示 machine 目标；与 `--app-id` 组合表示大数据分析实例目标。 |
| `--pod <podname>`                     | 条件必填 | 无         | TCE Pod 名称                      | 用于 TCE 在线采集。                   |
| `--app-id <application_id>`           | 条件必填 | 无         | 大数据分析实例 Application ID     | 与 `--ip` 组合使用，表示大数据分析实例目标。 |
| `--pid <pid>`                         | 是       | 无         | 单个正整数 PID                    | Java 进程 PID。只允许一个 PID。       |
| `--duration <seconds>`                | 否       | `30`       | `1` 到 `300` 的整数秒             | 采样时长。                            |
| `--interval <interval>`               | 否       | `10000000` | `10000000`、`100ms`、`100us` 等值 | 采样间隔。                            |
| `--per-thread`                        | 否       | `false`    | 布尔开关                          | 是否按线程拆分展示结果。              |
| `--idc <idc>`                         | 否       | 无         | IDC 标识                          | 只在 `--pod` 目标下用于 Pod 歧义消解。 |
| `--container-type <primary\|sidecar>` | 否       | `primary`  | `primary`、`sidecar`              | 只在 `--pod` 目标下用于容器歧义消解。 |
| `--question <text>`                   | 否       | 无         | 文本                              | 非 TTP 站点随 create 请求上传。       |
| `--reason <text>`                     | 否       | 无         | 文本                              | 非 TTP 站点随 create 请求上传。       |

### Example

```bash
bytedcli bytedog profile java-thread create \
  --ip example-host \
  --pid 12345

bytedcli bytedog profile java-thread create \
  --pod demo-pod \
  --pid 12345 \
  --per-thread

bytedcli bytedog profile java-thread create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345
```

## `bytedcli bytedog profile java-lock create`

创建 Java lock profiling 异步任务并返回详情页 URL，不等待结果生成。适合分析锁竞争、锁等待、锁冲突、monitor/synchronized 热点或疑似死锁。支持在线 TCE / machine / 大数据分析实例目标，不支持 Kubernetes、Cloud IDE、本地文件上传、远端 URL 上传。

### 参数

| 参数                                  | 必填     | 默认值     | 取值                              | 说明                                  |
| ------------------------------------- | -------- | ---------- | --------------------------------- | ------------------------------------- |
| `--ip <ip>`                           | 条件必填 | 无         | 主机 IP 或 hostname               | 单独使用时表示 machine 目标；与 `--app-id` 组合表示大数据分析实例目标。 |
| `--pod <podname>`                     | 条件必填 | 无         | TCE Pod 名称                      | 用于 TCE 在线采集。                   |
| `--app-id <application_id>`           | 条件必填 | 无         | 大数据分析实例 Application ID     | 与 `--ip` 组合使用，表示大数据分析实例目标。 |
| `--pid <pid>`                         | 是       | 无         | 单个正整数 PID                    | Java 进程 PID。只允许一个 PID。       |
| `--duration <seconds>`                | 否       | `30`       | `1` 到 `300` 的整数秒             | 采样时长。                            |
| `--interval <interval>`               | 否       | `10000000` | `10000000`、`100ms`、`100us` 等值 | 采样间隔。                            |
| `--idc <idc>`                         | 否       | 无         | IDC 标识                          | 只在 `--pod` 目标下用于 Pod 歧义消解。 |
| `--container-type <primary\|sidecar>` | 否       | `primary`  | `primary`、`sidecar`              | 只在 `--pod` 目标下用于容器歧义消解。 |
| `--question <text>`                   | 否       | 无         | 文本                              | 非 TTP 站点随 create 请求上传。       |
| `--reason <text>`                     | 否       | 无         | 文本                              | 非 TTP 站点随 create 请求上传。       |

### Example

```bash
bytedcli bytedog profile java-lock create \
  --ip example-host \
  --pid 12345

bytedcli bytedog profile java-lock create \
  --pod demo-pod \
  --pid 12345

bytedcli bytedog profile java-lock create \
  --ip example-host \
  --app-id sample-application \
  --pid 12345
```

## `bytedcli bytedog profile oncpu list`

查询 on-cpu flamegraph 历史记录，并输出可交给 `profile get` 的详情页 URL。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                                  | 说明                                               |
| ---------------------- | -------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                              | 目标过滤参数之一。不会做 IP 归一化。               |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                          | 目标过滤参数之一。                                 |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                              | 目标过滤参数之一。                                 |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔    | 按任务状态过滤。                                   |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                          | 按任务创建人过滤。                                 |
| `--page <n>`           | 否       | `1`                           | 正整数                                                | 页码，从 `1` 开始。                                |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                                | 每页条数。                                         |
| `--url-only`           | 否       | `false`                       | 布尔开关                                              | 文本模式只逐行输出详情页 URL。                     |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON 模式输出 bytedcli 标准 envelope，业务对象在 `data` 字段里：

```json
{
  "status": "success",
  "data": {
    "items": [
      {
        "id": 1001,
        "profile_type": "oncpu",
        "raw_type": "CPU_CPP_FLAMEGRAPH_ON_TCE",
        "status": "GOOD",
        "target": {
          "ip": null,
          "pod": "demo-pod",
          "psm": "demo.service"
        },
        "creator": "demo-user",
        "description": "sample task",
        "start_at": "2026-06-05T02:00:00.000Z",
        "end_at": "2026-06-05T02:00:30.000Z",
        "detail_url": "https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=tce"
      }
    ],
    "page": 1,
    "page_size": 20,
    "current_count": 1,
    "has_more": false
  },
  "error": null,
  "context": {
    "execution_time_ms": 123,
    "timestamp": "2026-06-08T10:00:00+08:00",
    "api_endpoint": "ByteDog Profile List"
  }
}
```

`current_count` 表示当前页返回条数，不代表历史总数。`has_more=true` 表示可能还有下一页。后面 list 子命令的 JSON envelope 形态相同，仅 `data` 内容不同。

### Example

```bash
bytedcli bytedog profile oncpu list \
  --ip example-host \
  --status GOOD
```

```bash
bytedcli bytedog profile oncpu list \
  --pod demo-pod \
  --psm demo.service \
  --status GOOD \
  --url-only
```

```bash
bytedcli --json bytedog profile oncpu list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile sprofile list`

查询 continuous flamegraph 历史记录，并输出可交给 `profile get` 的详情页 URL。

### 参数

| 参数                   | 必填 | 默认值                        | 取值                                                  | 说明                                               |
| ---------------------- | ---- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `--ip <ip>`            | 是   | 无                            | 目标 IP 或 hostname 文本                              | 按机器目标过滤。不会做 IP 归一化。                 |
| `--status <statuses>`  | 否   | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔    | 按任务状态过滤。                                   |
| `--creator <creators>` | 否   | 无                            | 创建人标识，可用英文逗号分隔                          | 按任务创建人过滤。                                 |
| `--page <n>`           | 否   | `1`                           | 正整数                                                | 页码，从 `1` 开始。                                |
| `--page-size <n>`      | 否   | `20`                          | 正整数                                                | 每页条数。                                         |
| `--url-only`           | 否   | `false`                       | 布尔开关                                              | 文本模式只逐行输出详情页 URL。                     |

该命令不接受 `--pod` 和 `--psm`。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`；`data` 示例：

```json
{
  "items": [
    {
      "id": 1007,
      "profile_type": "sprofile",
      "raw_type": "STEBPF-SPLIT",
      "status": "GOOD",
      "target": {
        "ip": "example-host",
        "pod": null,
        "psm": null
      },
      "creator": "demo-user",
      "description": null,
      "start_at": "2026-06-05T02:00:00.000Z",
      "end_at": "2026-06-05T02:30:00.000Z",
      "detail_url": "https://example.bytedog/profiling/continuous-profiling/detail?id=1007&time=long"
    }
  ],
  "page": 1,
  "page_size": 20,
  "current_count": 1,
  "has_more": false
}
```

`current_count` 表示当前页返回条数，不代表历史总数。`has_more=true` 表示可能还有下一页。

### Example

```bash
bytedcli bytedog profile sprofile list \
  --ip example-host \
  --status GOOD
```

```bash
bytedcli bytedog profile sprofile list \
  --ip example-host \
  --status GOOD \
  --url-only
```

```bash
bytedcli --json bytedog profile sprofile list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile offcpu list`

查询 off-cpu flamegraph 历史记录，并输出可交给 `profile get` 的详情页 URL。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                                  | 说明                                               |
| ---------------------- | -------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                              | 目标过滤参数之一。不会做 IP 归一化。               |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                          | 目标过滤参数之一。                                 |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                              | 目标过滤参数之一。                                 |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔    | 按任务状态过滤。                                   |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                          | 按任务创建人过滤。                                 |
| `--page <n>`           | 否       | `1`                           | 正整数                                                | 页码，从 `1` 开始。                                |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                                | 每页条数。                                         |
| `--url-only`           | 否       | `false`                       | 布尔开关                                              | 文本模式只逐行输出详情页 URL。                     |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`；`data` 示例：

```json
{
  "items": [
    {
      "id": 1003,
      "profile_type": "offcpu",
      "raw_type": "OFFCPU_FLAMEGRAPH_ON_TCE",
      "status": "GOOD",
      "target": {
        "ip": null,
        "pod": "demo-pod",
        "psm": "demo.service"
      },
      "creator": "demo-user",
      "description": null,
      "start_at": null,
      "end_at": null,
      "detail_url": "https://example.bytedog/profiling/off-cpu-profiling/flamegraph/detail?id=1003"
    }
  ],
  "page": 1,
  "page_size": 20,
  "current_count": 1,
  "has_more": false
}
```

### Example

```bash
bytedcli bytedog profile offcpu list \
  --pod demo-pod \
  --status GOOD
```

```bash
bytedcli bytedog profile offcpu list \
  --psm demo.service \
  --status GOOD \
  --url-only
```

```bash
bytedcli --json bytedog profile offcpu list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile pthread list`

查询 pthread lock profiling 历史记录，并输出可交给 `profile get` 的详情页 URL。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                                  | 说明                                               |
| ---------------------- | -------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                              | 目标过滤参数之一。不会做 IP 归一化。               |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                          | 目标过滤参数之一。                                 |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                              | 目标过滤参数之一。                                 |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔    | 按任务状态过滤。                                   |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                          | 按任务创建人过滤。                                 |
| `--page <n>`           | 否       | `1`                           | 正整数                                                | 页码，从 `1` 开始。                                |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                                | 每页条数。                                         |
| `--url-only`           | 否       | `false`                       | 布尔开关                                              | 文本模式只逐行输出详情页 URL。                     |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`；`data` 示例：

```json
{
  "items": [
    {
      "id": 1004,
      "profile_type": "pthread",
      "raw_type": "USER_LOCK_STAT_ON_TCE",
      "status": "GOOD",
      "target": {
        "ip": null,
        "pod": "demo-pod",
        "psm": "demo.service"
      },
      "creator": "demo-user",
      "description": null,
      "start_at": null,
      "end_at": null,
      "detail_url": "https://example.bytedog/profiling/off-cpu-profiling/lock/detail?id=1004"
    }
  ],
  "page": 1,
  "page_size": 20,
  "current_count": 1,
  "has_more": false
}
```

### Example

```bash
bytedcli bytedog profile pthread list \
  --psm demo.service \
  --status GOOD
```

```bash
bytedcli bytedog profile pthread list \
  --pod demo-pod \
  --status GOOD \
  --url-only
```

```bash
bytedcli --json bytedog profile pthread list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile je-stats list`

查询 jemalloc stats 历史记录，并输出可交给 `profile get` 的详情页 URL。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                                  | 说明                                               |
| ---------------------- | -------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                              | 目标过滤参数之一。不会做 IP 归一化。               |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                          | 目标过滤参数之一。                                 |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                              | 目标过滤参数之一。                                 |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔    | 按任务状态过滤。                                   |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                          | 按任务创建人过滤。                                 |
| `--page <n>`           | 否       | `1`                           | 正整数                                                | 页码，从 `1` 开始。                                |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                                | 每页条数。                                         |
| `--url-only`           | 否       | `false`                       | 布尔开关                                              | 文本模式只逐行输出详情页 URL。                     |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`；`data` 示例：

```json
{
  "items": [
    {
      "id": 1005,
      "profile_type": "je-stats",
      "raw_type": "JEMALLOC_STATS_ON_MACHINE",
      "status": "GOOD",
      "target": {
        "ip": "example-host",
        "pod": null,
        "psm": null
      },
      "creator": "demo-user",
      "description": null,
      "start_at": null,
      "end_at": null,
      "detail_url": "https://example.bytedog/profiling/jemalloc-profiling/stats?id=1005&from=machine"
    }
  ],
  "page": 1,
  "page_size": 20,
  "current_count": 1,
  "has_more": false
}
```

### Example

```bash
bytedcli bytedog profile je-stats list \
  --ip example-host \
  --status GOOD
```

```bash
bytedcli bytedog profile je-stats list \
  --pod demo-pod \
  --status GOOD \
  --url-only
```

```bash
bytedcli --json bytedog profile je-stats list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile je-flamegraph list`

查询 jemalloc memory flamegraph 历史记录，并输出可交给 `profile get` 的详情页 URL。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                                  | 说明                                               |
| ---------------------- | -------- | ----------------------------- | ----------------------------------------------------- | -------------------------------------------------- |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                              | 目标过滤参数之一。不会做 IP 归一化。               |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                          | 目标过滤参数之一。                                 |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                              | 目标过滤参数之一。                                 |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔    | 按任务状态过滤。                                   |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                          | 按任务创建人过滤。                                 |
| `--page <n>`           | 否       | `1`                           | 正整数                                                | 页码，从 `1` 开始。                                |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                                | 每页条数。                                         |
| `--url-only`           | 否       | `false`                       | 布尔开关                                              | 文本模式只逐行输出详情页 URL。                     |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`；`data` 示例：

```json
{
  "items": [
    {
      "id": 1010,
      "profile_type": "je-flamegraph",
      "raw_type": "JEMALLOC_FLAMEGRAPH_ON_TCE_INCREMENT_PROFILE",
      "status": "GOOD",
      "target": {
        "ip": null,
        "pod": "demo-pod",
        "psm": "demo.service"
      },
      "creator": "demo-user",
      "description": null,
      "start_at": null,
      "end_at": null,
      "detail_url": "https://example.bytedog/profiling/jemalloc-profiling/detail?id=1010&from=tce"
    }
  ],
  "page": 1,
  "page_size": 20,
  "current_count": 1,
  "has_more": false
}
```

### Example

```bash
bytedcli bytedog profile je-flamegraph list \
  --pod demo-pod \
  --status GOOD
```

```bash
bytedcli bytedog profile je-flamegraph list \
  --ip example-host \
  --status GOOD \
  --url-only
```

```bash
bytedcli --json bytedog profile je-flamegraph list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile java-heapdump list`

查询 Java heap dump 历史记录，并输出可交给 `profile get` 的详情页 URL。该命令不创建任务、不是异步写入命令；它只读取已存在的历史记录。

list 会覆盖历史记录里的 machine、TCE、YARN 与 URL 上传任务；create 当前支持在线 TCE / machine / 大数据分析实例目标。可用 `--ip`、`--pod`、`--psm` 过滤。`profile java-heapdump list` 不做 IP 归一化，按传入文本过滤历史记录。查可用结果文件或可交给 `profile get` 的 detail URL 时，默认推荐加 `--status GOOD`。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                               | 说明                           |
| ---------------------- | -------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                           | 目标过滤参数之一。             |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                       | 目标过滤参数之一。             |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                           | 目标过滤参数之一。             |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔 | 按任务状态过滤。               |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                       | 按任务创建人过滤。             |
| `--page <n>`           | 否       | `1`                           | 正整数                                             | 页码，从 `1` 开始。            |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                             | 每页条数。                     |
| `--url-only`           | 否       | `false`                       | 布尔开关                                           | 文本模式只逐行输出详情页 URL。 |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`。`current_count` 表示当前页返回条数，不代表历史总数；`has_more=true` 表示可能还有下一页。

### Example

```bash
bytedcli bytedog profile java-heapdump list \
  --pod demo-pod \
  --status GOOD

bytedcli bytedog profile java-heapdump list \
  --ip example-host \
  --status GOOD \
  --url-only

bytedcli --json bytedog profile java-heapdump list \
  --psm demo.service \
  --status GOOD
```

## `bytedcli bytedog profile java-allocation list`

查询 Java lightweight allocation sampling 历史记录，并输出可交给 `profile get` 的详情页 URL。该命令不创建任务、不是异步写入命令；它只读取已存在的历史记录。

list 会覆盖历史记录里的 machine、TCE 与 YARN 任务；create 当前支持在线 TCE / machine / 大数据分析实例目标。可用 `--ip`、`--pod`、`--psm` 过滤。`profile java-allocation list` 不做 IP 归一化，按传入文本过滤历史记录。查可用结果文件或可交给 `profile get` 的 detail URL 时，默认推荐加 `--status GOOD`。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                               | 说明                           |
| ---------------------- | -------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                           | 目标过滤参数之一。             |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                       | 目标过滤参数之一。             |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                           | 目标过滤参数之一。             |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔 | 按任务状态过滤。               |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                       | 按任务创建人过滤。             |
| `--page <n>`           | 否       | `1`                           | 正整数                                             | 页码，从 `1` 开始。            |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                             | 每页条数。                     |
| `--url-only`           | 否       | `false`                       | 布尔开关                                           | 文本模式只逐行输出详情页 URL。 |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`。`current_count` 表示当前页返回条数，不代表历史总数；`has_more=true` 表示可能还有下一页。

### Example

```bash
bytedcli bytedog profile java-allocation list \
  --pod demo-pod \
  --status GOOD

bytedcli bytedog profile java-allocation list \
  --ip example-host \
  --status GOOD \
  --url-only

bytedcli --json bytedog profile java-allocation list \
  --psm demo.service \
  --status GOOD
```

## `bytedcli bytedog profile java-gc list`

查询 Java GC log profiling 历史记录，并输出可交给 `profile get` 的详情页 URL。该命令不创建任务、不是异步写入命令；它只读取已存在的历史记录。

list 会覆盖历史记录里的 machine、TCE、YARN 与 URL 上传任务；create 当前支持在线 TCE / machine / 大数据分析实例目标。可用 `--ip`、`--pod`、`--psm` 过滤。`profile java-gc list` 不做 IP 归一化，按传入文本过滤历史记录。查可用结果文件或可交给 `profile get` 的 detail URL 时，默认推荐加 `--status GOOD`。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                               | 说明                           |
| ---------------------- | -------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                           | 目标过滤参数之一。             |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                       | 目标过滤参数之一。             |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                           | 目标过滤参数之一。             |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔 | 按任务状态过滤。               |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                       | 按任务创建人过滤。             |
| `--page <n>`           | 否       | `1`                           | 正整数                                             | 页码，从 `1` 开始。            |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                             | 每页条数。                     |
| `--url-only`           | 否       | `false`                       | 布尔开关                                           | 文本模式只逐行输出详情页 URL。 |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`。`current_count` 表示当前页返回条数，不代表历史总数；`has_more=true` 表示可能还有下一页。

### Example

```bash
bytedcli bytedog profile java-gc list \
  --ip example-host \
  --status GOOD

bytedcli bytedog profile java-gc list \
  --pod demo-pod \
  --status GOOD \
  --url-only

bytedcli --json bytedog profile java-gc list \
  --psm demo.service \
  --status GOOD
```

## `bytedcli bytedog profile java-thread list`

查询 Java thread profiling 历史记录，并输出可交给 `profile get` 的详情页 URL。该命令不创建任务、不是异步写入命令；它只读取已存在的历史记录。

list 会覆盖历史记录里的 machine、TCE、YARN 与 URL 上传任务；create 当前支持在线 TCE / machine / 大数据分析实例目标。可用 `--ip`、`--pod`、`--psm` 过滤。`profile java-thread list` 不做 IP 归一化，按传入文本过滤历史记录。查可用结果文件或可交给 `profile get` 的 detail URL 时，默认推荐加 `--status GOOD`。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                               | 说明                           |
| ---------------------- | -------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                           | 目标过滤参数之一。             |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                       | 目标过滤参数之一。             |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                           | 目标过滤参数之一。             |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔 | 按任务状态过滤。               |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                       | 按任务创建人过滤。             |
| `--page <n>`           | 否       | `1`                           | 正整数                                             | 页码，从 `1` 开始。            |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                             | 每页条数。                     |
| `--url-only`           | 否       | `false`                       | 布尔开关                                           | 文本模式只逐行输出详情页 URL。 |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`。`current_count` 表示当前页返回条数，不代表历史总数；`has_more=true` 表示可能还有下一页。

### Example

```bash
bytedcli bytedog profile java-thread list \
  --psm demo.service \
  --status GOOD

bytedcli bytedog profile java-thread list \
  --pod demo-pod \
  --status GOOD \
  --url-only

bytedcli --json bytedog profile java-thread list \
  --ip example-host \
  --status GOOD
```

## `bytedcli bytedog profile java-lock list`

查询 Java lock profiling 历史记录，并输出可交给 `profile get` 的详情页 URL。该命令不创建任务、不是异步写入命令；它只读取已存在的历史记录。

list 会覆盖历史记录里的 machine、TCE 与 YARN 任务；create 当前支持在线 TCE / machine / 大数据分析实例目标。可用 `--ip`、`--pod`、`--psm` 过滤。`profile java-lock list` 不做 IP 归一化，按传入文本过滤历史记录。查可用结果文件或可交给 `profile get` 的 detail URL 时，默认推荐加 `--status GOOD`。

### 参数

| 参数                   | 必填     | 默认值                        | 取值                                               | 说明                           |
| ---------------------- | -------- | ----------------------------- | -------------------------------------------------- | ------------------------------ |
| `--ip <ip>`            | 条件必填 | 无                            | 目标 IP 或 hostname 文本                           | 目标过滤参数之一。             |
| `--pod <podname>`      | 条件必填 | 无                            | TCE Pod 名称                                       | 目标过滤参数之一。             |
| `--psm <psm>`          | 条件必填 | 无                            | PSM 名称                                           | 目标过滤参数之一。             |
| `--status <statuses>`  | 否       | 无                            | `INIT`、`RUNNING`、`GOOD`、`BAD`，可用英文逗号分隔 | 按任务状态过滤。               |
| `--creator <creators>` | 否       | 无                            | 创建人标识，可用英文逗号分隔                       | 按任务创建人过滤。             |
| `--page <n>`           | 否       | `1`                           | 正整数                                             | 页码，从 `1` 开始。            |
| `--page-size <n>`      | 否       | `20`                          | 正整数                                             | 每页条数。                     |
| `--url-only`           | 否       | `false`                       | 布尔开关                                           | 文本模式只逐行输出详情页 URL。 |

`--ip`、`--pod`、`--psm` 至少提供一个。多个过滤参数可以同时提供，后端按组合条件查询。

### 输出

文本模式输出表格列：`ID`、`STATUS`、`TYPE`、`TARGET`、`CREATOR`、`START_AT`、`URL`，并输出 `Current Count` 与 `Has More`。

JSON envelope 形态同 `profile oncpu list`。`current_count` 表示当前页返回条数，不代表历史总数；`has_more=true` 表示可能还有下一页。

### Example

```bash
bytedcli bytedog profile java-lock list \
  --pod demo-pod \
  --status GOOD

bytedcli bytedog profile java-lock list \
  --ip example-host \
  --status GOOD \
  --url-only

bytedcli --json bytedog profile java-lock list \
  --psm demo.service \
  --status GOOD
```

## `bytedcli bytedog tool process list`

列出目标上的进程，用于确认 profile create 命令需要的 PID、容器内 namespace PID、进程命令、RSS 和 CPU 信息。

### 参数

| 参数                                  | 必填     | 默认值                        | 取值                                                  | 说明                                                                                                                     |
| ------------------------------------- | -------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `--pod <podname>`                     | 条件必填 | 无                            | TCE Pod 名称                                          | 单独使用时表示 TCE Pod 目标。                                                                                            |
| `--ip <ip>`                           | 条件必填 | 无                            | 主机 IP 或 hostname                                   | 单独使用时表示机器目标；与 `--app-id` 组合表示大数据分析实例；与 `--k8s-pod --container-id` 组合表示 Kubernetes 容器目标。 |
| `--workspace-id <workspace_id>`       | 条件必填 | 无                            | Cloud IDE workspace ID                                | 单独使用时表示 Cloud IDE workspace 目标。                                                                                 |
| `--app-id <application_id>`           | 条件必填 | 无                            | 大数据分析实例 Application ID                         | 与 `--ip` 组合使用，列出大数据分析实例进程。                                                                              |
| `--k8s-pod <podname>`                 | 条件必填 | 无                            | Kubernetes Pod 名称                                   | 与 `--ip --container-id` 组合使用，列出 Kubernetes 容器进程。                                                             |
| `--container-id <container_id>`       | 条件必填 | 无                            | Kubernetes container ID                               | 与 `--ip --k8s-pod` 组合使用，列出 Kubernetes 容器进程。                                                                  |
| `--idc <idc>`                         | 否       | 无                            | IDC 标识                                              | 只在 `--pod` 目标下可选使用，用于 Pod 歧义消解；默认不需要传。                                                           |
| `--container-type <primary\|sidecar>` | 否       | `primary`                     | `primary`、`sidecar`                                  | 只在 `--pod` 目标下可选使用，用于容器歧义消解。                                                                           |
| `--tob`                               | 否       | `false`                       | 布尔开关                                              | 非 TTP 站点支持机器 `--ip` 目标和 Kubernetes 容器目标。用于 ToB 或 mysql 机器模式；TTP 站点会忽略该参数。                  |

目标形态必须恰好匹配一种：`--ip`、`--pod`、`--workspace-id`、`--ip --app-id`、`--ip --k8s-pod --container-id`。多传、少传或混用都会报输入错误。

### 输出

文本模式固定输出表格列：`PID`、`TID_NS`、`RSS_KB`、`CPU_%`、`CMD`，并输出 `Current Count`。当后端返回大数据分析实例或 Kubernetes 上下文时，会额外展示 `APP_ID`、`POD`、`CONTAINER` 列。

JSON 模式输出 bytedcli 标准 envelope，业务对象在 `data` 字段里：

```json
{
  "status": "success",
  "data": {
    "target_type": "k8s",
    "target": "example-host",
    "k8s_pod": "demo-pod",
    "container_id": "sample-container",
    "processes": [
      {
        "pid": 1001,
        "tid_ns": 11,
        "cmd": "/opt/demo/bin/server --flag",
        "rss": 2048,
        "cpu": 1.25,
        "application_id": "sample-application",
        "pod_name": "demo-pod",
        "container_name": "main",
        "container_id": "sample-container"
      }
    ],
    "current_count": 1
  },
  "error": null,
  "context": {
    "execution_time_ms": 123,
    "timestamp": "2026-06-08T10:00:00+08:00",
    "api_endpoint": "ByteDog Tool ListProcesses"
  }
}
```

### Example

```bash
bytedcli bytedog tool process list \
  --pod demo-pod
```

```bash
bytedcli bytedog tool process list \
  --ip example-host \
  --tob
```

```bash
bytedcli --json bytedog tool process list \
  --workspace-id sample-workspace
```

```bash
bytedcli bytedog tool process list \
  --ip example-host \
  --app-id sample-application
```

```bash
bytedcli bytedog tool process list \
  --ip example-host \
  --k8s-pod demo-pod \
  --container-id sample-container
```

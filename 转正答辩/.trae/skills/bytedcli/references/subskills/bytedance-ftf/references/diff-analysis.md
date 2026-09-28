# FTF Diff 分析总入口

## 用途

当用户要求“分析 FTF diff”“看这个 task 为什么有 diff”“判断是不是代码引入”“给这个 flow diff 归因”时，先读本文件，再按输入类型进入具体 reference。

本文件定义分析顺序、证据分层和报告结构；随机值和数组乱序降噪见 `diff-denoise-reference.md`；具体命令参数见 `diff-query-reference.md`。

## 录制回放模型

FTF diff 分析要先理解流量来源和 mock 边界：

- FTF 通过基础组件拦截器录制和回放。入口流量会录制 inbound request/response，并初始化 FTF 上下文；对外调用（Redis、DB、TCC、RPC 等）依赖上下文识别当前流量是采集还是回放，从而做 outbound 采集或 mock。
- 上下文透传是关键前提。业务如果使用协程池、异步任务或主动断开 context，且没有透传 context/FTF session，对应 outbound 可能无法采集或无法 mock。
- 采集源不同，证据完整度不同：`bytecopy` 通常只有入口 request/response；`sdk` 才包含完整流量数据和下游请求。只有任务结果明确展示采集源或 outbound 证据时，才能把它纳入结论。
- 录制回放只天然覆盖“和一次请求绑定”的数据。异步加载到全局变量、localcache、TCC AddListener 写入全局变量、singleflight 复用结果等，都可能造成回放噪声，需要方法级 mock 或业务改造。

Agent 默认只能分析 FTF task / flow / logid 等任务执行结果。FTF 产物是否启动、组件版本是否支持、服务是否正确插桩、context 是否真实透传这类运行时前提，如果任务结果或日志没有明确证据，不能当作已验证事实；只能作为“外部待验证项”或“可能方向”输出。

## 任务形态与 diff 观察面

综合 task 分析时，先用 `bytedcli --json ftf task get --task-id <task_id>` 获取 OpenAPI 任务详情，读取顶层 `env`，以及 `psm_replay_param_detail.<psm>` 或 `psm_replay_param` 中的 `replay_env`、`base_replay_env`、`commit_hash`、`base_commit_hash`、`code_branch`、`inherited_branches`、`base_task_id`，并统计 `replay_method_params.*.mock_enable`。报告里必须输出任务形态和判断依据。

- 系统级任务：顶层 `env` 不是 BOE，`replay_env` 是 PPE 环境，且 method 级 `mock_enable` 大量或全部为 0。执行语义是 base 和 replay 在两个真实代码环境中分别回放真实入口请求，再对比 response。分析重点是 inbound response diff、代码版本差异、环境配置差异；通常不要期待 outbound diff。如果 outbound 为空，不要直接写成证据缺失或 CLI 异常。
- 沙箱任务：顶层 `env=boe` 或 `replay_env` 是 BOE 环境，且 method 级 `mock_enable` 大量或全部为 1。执行语义是回放入口请求时 mock 所有 outbound 依赖，用 outbound mock 隔离被测服务逻辑。分析时同时看 inbound response diff 和 outbound request diff；outbound request diff 可以作为定位被测服务内部逻辑变化的重要证据，inbound response diff 可能是 outbound request 参数变化传导导致的。顶层 `env=boe` 可以作为沙箱判断依据；如果同时 `mock_enable=1`，即使 PSM 参数里的 `replay_env=prod`，也不要仅凭这一点标成混合。
- 不确定/混合任务：顶层 `env` / `replay_env` 与 method 级 `mock_enable` 明显冲突，或不同 method 混用 `mock_enable=0/1`。不要强行归类；先按已选 method 的 `mock_enable` 和实际 diff 证据分析，并把冲突字段列为待确认项。

`trigger_type`、`trigger_platform`、URL 形态、plan 名称包含“沙箱”等只能作为辅助证据，不要单独作为任务形态结论。

## 输入路由

| 用户输入或目标                                                      | 下一步读取                  |
| ------------------------------------------------------------------- | --------------------------- |
| Tesla-X FTF task URL、task id、需要分析一批 diff cluster            | `task-diff-triage.md`       |
| Tesla-X flow diff URL、单条 record、单个字段差异、单个 logid        | `flow-diff-root-cause.md`   |
| 需要排除随机值 diff、数组乱序 diff，或判断降噪置信度                | `diff-denoise-reference.md` |
| 用户问“是不是这次代码改的”、给了本地 diff、MR URL、commit 或 branch | `code-diff-correlation.md`  |
| 需要查命令、参数、JSON 字段、API 形态                               | `diff-query-reference.md`   |

如果用户只给了一个 URL，先用 `bytedcli --json ftf target parse --url "<ftf-url>"` 判断是 task URL 还是 flow diff URL，不要手工拆 URL。

## 分析原则

- 先取证再下结论。至少确认任务上下文、diff 类型、base/replay 两边表现，再给根因判断。
- 默认只做只读查询。FTF plan trigger、task retry、task stop 都是写操作，必须等用户明确确认后再执行。
- 机器可读结果默认用 `bytedcli --json ftf ...`，并把 `--json` 放在 `ftf` 前面。
- 结论分层表达：已证明事实、基于事实的推断、仍需验证项。
- 不要只凭 `need_confirm_count`、平台标注、单个错误字符串或代码 diff 直接断言根因。
- 不要把 outbound 缺失一律当成业务回归。系统级任务通常不期待 outbound diff；沙箱任务才需要重点检查 outbound request diff、mock 匹配状态和 logid 错误。任务结果外的部署/插桩/context 前提要列为待验证。

## 用户可读术语

报告正文面向业务或测试同学时，优先使用用户能直接理解的中文术语；内部字段名只放在命令清单、证据附录或必要的括号说明里。

| 内部字段或习惯说法         | 用户侧推荐说法                 | 说明                                                                                                                           |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `aggregate`                | 汇总统计                       | `task aggregate` 写成“任务汇总统计”，`PSM aggregate` 写成“PSM 汇总统计”，`method aggregate` 写成“接口汇总统计”。               |
| `diff cluster` / `cluster` | diff 聚类                      | 第一次出现可写“diff 聚类（一组相似 diff）”。                                                                                   |
| `similarDiffId`            | 不在正文主描述中直接展示       | 正文用“接口 + path + 方向/现象 + 详情链接”描述，例如“`/demo/method` 的 `data->items->[*]`”。内部 ID 只放在命令清单或证据附录。 |
| `diffCount` / `diff_count` | 累计 diff 明细条数             | 这是平台累计记录的字段级差异条数，数组 path 会被元素数量放大。不要写成“独立问题数”或“业务对象数”。                             |
| `logCount` / `log_count`   | 命中流量数 / 覆盖流量数        | 优先用它描述影响范围。                                                                                                         |
| `top cluster`              | Top diff 聚类 / 主要 diff 聚类 | 排序理由要说清是按“命中流量数”还是“累计 diff 明细条数”。                                                                       |

推荐表达：

```text
`/demo/method` 的 `data->items->[*]` 覆盖 75 条流量，累计记录 3348 条 diff 明细。这个明细条数会受数组元素数量影响，只用于说明规模，不代表 3348 个独立问题。可通过具体 diff 链接确认：<diff-link>。
```

避免表达：

```text
similarDiffId=xxx，diffCount=3348、logCount=75。
```

如果查询结果或用户输入中有可打开的 diff / flow 直达链接，在正文中附“详情链接”；如果没有可靠链接，不要编造，只提供 task URL、接口、path 和代表 log_id。task 级报告里，diff 聚类的详情链接优先使用“代表流量 flow diff 链接”，生成规则见 `diff-query-reference.md` 的“Flow diff 链接拼接”。

## 标准流程

1. 收集上下文：任务状态、PSM、method、env、plan、branch/commit、PSM task id、replay cluster、Tesla-X 链接、diff 总量和待确认数量；先判断系统级/沙箱/不确定任务形态并记录依据。
2. 先跑统一证据包：`bytedcli --json ftf task evidence get --url "<ftf-task-url>" --top-n 10 --sample-size 3`。优先用这个结果作为 task meta、psm_task_id、任务/PSM/接口汇总统计、top method、top diff 聚类和代表样本的共同事实来源。若 URL 带 `diffReasons`，CLI 会自动应用该筛选；不要再额外传 `--annotation-op-type unannotated` 覆盖 URL。
3. 做 task 级 triage：用户要求分析 task 时，不能只输出任务状态、汇总统计或“初步分析”；必须进入 diff 聚类内容，至少覆盖当前轮应分析的聚类 path、代表流量、两侧值/差异形态、降噪依据或根因假设。
4. 确定分析范围：先按用户当前 URL 或显式参数对应的筛选范围圈定主线集合，引用 JSON 里的 `annotationOpTypeSource` 说明筛选来源，再按 method、direction、标注状态拆分。默认口径是未处理聚类；如果 URL 或显式参数选择了已标注/全部聚类，就以该筛选后的聚类集合作为当前轮。阈值在单个 method 内计算：当前 method 待分析 diff 聚类数不超过 10 个时默认覆盖全部；超过 10 个时当前轮详细分析 Top 10，并摘要剩余聚类的数量、归类和未展开原因，用户追问时继续下一批。若 evidence 已覆盖，可直接引用；需要更多聚类时再用 `task diff-cluster list/get`。不同 method 的 diff 可以使用 subagent 并行分析，但要共用同一份证据包和筛选口径。
5. 做降噪检查：随机值候选先用 `ftf diff path-profile get` 看跨流量 base/replay 分布；数组乱序候选用 `ftf diff array-check get` 拉两侧数组明细、候选主键和排序后比较结果。高置信降噪项可从主根因链路剔除；中置信候选只降权，仍参与后续分析。
6. 做单条 flow 根因分析：对代表性 case 拉 base/replay value、request/response、outbound、similar case、replay logid。
7. 判断是否需要代码关联：字段值变化、业务分支错误、过滤/排序/default/IDL/TCC/实验差异通常需要查代码；mock 未命中、环境脏数据、下游缺失、replay 配置错配可基于任务证据初判。context 未透传、组件不支持、产物未启动等只在任务日志明确出现时纳入初判，否则列为外部待验证项。
8. 输出分层报告，并把证据链接到具体 command 输出或日志字段。

## 报告结构

默认使用以下结构，按证据多少压缩或展开：

```text
结论摘要
- 当前判断：<系统问题 | 环境/平台问题 | 业务变更 | 疑似代码引入 | 证据不足>
- 影响范围：<task/method/cluster/case 数>
- 分析范围：<主线筛选口径、各 method + 方向待分析 diff 聚类数、全量覆盖或 Top 10 截断、剩余未分析数量>
- 优先级：<先看哪些 cluster 或 case>

任务与输入
- task / flow / record / MR / commit
- PSM / method / env / branch / commit / psm_task_id
- 任务形态：<系统级 | 沙箱 | 不确定/混合>，以及顶层 env、replay_env、mock_enable 统计、base/replay commit 获取情况

关键证据
- 任务 / PSM / 接口汇总统计
- 聚类级结论：每个已分析 diff 聚类单独一行，包含接口、方向、path、命中流量数、累计 diff 明细条数、标注状态、代表流量详情链接、降噪判断和当前判断
- FTF diff path、base/replay 值、状态码、错误信息
- request/response、outbound、similar case、logid 日志
- 代码 diff 命中的文件、函数、字段或分支

降噪判断
- 高置信降噪：
- 中置信候选：
- 不应降噪：
- 证据不足/待补充：

根因分析
- 逐条聚类结论之后，再输出任务级归纳；任务级结论不能替代聚类级结论
- 已证明事实
- 基于事实的推断
- 仍需验证项

建议动作
- 是否需要继续查某条 flow
- 是否需要代码确认或修复
- 是否需要平台清理、mock 补齐、重跑、降噪或外部确认
```

## 常见误判

- 把平台已标注噪声当成当前待处理 diff。筛待确认时要排除 `not_mark=true` 或已标注原因的记录。
- 把随机值或 order-only diff 当成业务回归。随机值要同时看跨流量分散和字段语义；数组乱序要基于两侧明细、稳定业务主键和排序语义判断。
- 把 replay 日志中的业务错误直接判为代码问题。需要结合任务结果里的 request/response、mock、下游和本分支代码改动；任务结果没有覆盖的环境前提只能列为待验证。
- 把 task 顶层 `code_branch` 为空当成没有绑定分支。有些任务只在 PSM replay 参数里记录 commit。
- 忽略 FTF 回放流量标识。回放 HTTP header / RPC extra 会带 FTF tag 和 task id，业务代码可能基于这些标识走不同逻辑。

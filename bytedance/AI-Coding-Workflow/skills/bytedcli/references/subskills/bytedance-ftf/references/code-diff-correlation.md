# FTF 与代码 Diff 关联判断

## 用途

当 FTF diff 需要判断“是否本分支代码引入”，或用户提供本地 `git diff`、Codebase MR URL、commit、branch 时，使用本流程。

本流程只判断代码相关性，不替代 FTF 平台取证。先用 `task-diff-triage.md` 或 `flow-diff-root-cause.md` 拿到具体 method、diff path、base/replay 值和日志证据，并按 `diff-denoise-reference.md` 完成随机值和数组乱序降噪检查。高置信降噪项不要继续硬找代码根因；中置信候选可以保留为低权重线索。

## 先确认任务绑定代码

代码关联判断前，必须确认：

- 任务形态是什么：系统级、沙箱，还是不确定/混合。先用顶层 `env`、`replay_env` 和 method 级 `mock_enable` 判断，并输出字段依据。顶层 `env=boe` 且 `mock_enable=1` 时优先按沙箱任务处理，即使 `replay_env=prod` 也不要仅凭这一点标成混合。
- baseline 是什么：基准任务、基准 commit、master/main，还是平台默认基线。
- replay 绑定的 branch/commit 是什么。
- PSM replay 参数里的 commit、env、replay cluster、IDL version 是否与用户预期一致。
- 顶层 `code_branch` 为空时，不要直接判定未绑定分支；有些任务会把 commit 写在 PSM replay 参数里。
- 任务结果是否包含能证明回放产物、env、replay cluster 或 logid 错误的证据。任务结果没有展示的 record/ftf bin、启动条件、覆盖率脚本、环境变量，不能作为代码关联判断的已验证前提。

常用复查：

```bash
bytedcli --json ftf task get --task-id 1234567
```

需要从任务返回里抽取 PSM replay 参数时，优先保留原始 JSON 证据，再摘出顶层 `env`、`commit_hash`、`base_commit_hash`、`replay_env`、`base_replay_env`、`replay_cluster`、`idl_version`、`code_branch`、`inherited_branches`、`base_task_id`，并统计 `replay_method_params.*.mock_enable`。

任务形态会影响代码版本证据的解释：

- 系统级任务：通常表现为顶层 `env` 不是 BOE、`replay_env` 是 PPE 环境，`mock_enable` 大量/全部为 0。base 和 replay 在两个真实代码环境中回放真实入口请求并比较 response，因此更应该关注 `base_commit_hash`、`commit_hash`、`base_replay_env`、`replay_env` 是否完整且符合预期。没有 outbound diff 通常不是异常。
- 沙箱任务：通常表现为顶层 `env=boe` 或 `replay_env` 是 BOE 环境，且 `mock_enable` 大量/全部为 1。入口请求回放时 mock outbound 依赖，`base_commit_hash` 可能为空；不要仅凭 base commit 缺失判定任务元数据异常。顶层 `env=boe` 可以作为沙箱判断依据；如果同时 `mock_enable=1`，即使 `replay_env=prod` 也按沙箱任务解释。优先结合 `code_branch`、`inherited_branches`、`base_task_id` / `base_task_id_realtime` 和 outbound request diff 建立代码相关性。
- 如果顶层 `env` / `replay_env` 与 `mock_enable` 明显冲突，或同一任务内 method 的 mock 设置混合，输出“不确定/混合任务”，并说明本次代码关联只覆盖已分析 method 的证据。

## 获取代码 diff

本地仓库场景：

```bash
git status --short
git diff --stat
git diff -- path/to/file.ts
git show <commit> --stat
git show <commit> -- path/to/file.ts
```

Codebase MR 场景：

```bash
bytedcli --json codebase mr diff 821 -R "example-org/example-repo"
bytedcli --json codebase mr diff 821 -R "example-org/example-repo" --file "path/to/file.ts"
```

如果命令不可用或参数不确定，先查 `bytedcli codebase mr --help`，不要猜测新的 codebase 命令。

## 从 FTF 证据反推代码区域

按以下线索缩小范围：

- method / RPC 名称：找 handler、service、IDL adapter、assembler、mapper。
- diff path：找字段定义、字段组装、默认值、过滤条件、排序逻辑。
- replay err_msg：找抛错位置、状态机分支、下游调用封装。
- outbound diff：沙箱任务里重点找下游请求参数构造、protocol/method 变化、调用次数变化、调用条件、fallback 逻辑。系统级任务通常不期待 outbound diff，不要因为没有 outbound 就降级为证据缺失。
- request 差异：先确认是否输入不同；输入不同通常不能直接归因到响应逻辑。
- context 相关风险：可以在代码 diff 中识别协程池、异步任务、context.Background、没有透传 request context 的调用路径；但是否真实导致本次任务 mock 缺失，需要任务日志或外部验证。
- 请求外状态风险：可以在代码 diff 中识别 TCC AddListener、localcache、全局变量、singleflight、异步预热和 BOE 特殊逻辑；是否命中本次 case 需要任务证据支持。

不要只用文件名相似或字段名相同下结论。需要看到代码变更与 FTF 证据之间有可解释的因果链。

## 相关性等级

| 等级 | 使用条件 |
| ---- | -------- |
| strong | 代码 diff 直接修改了对应 method、字段 path、排序/过滤/默认值或下游请求，且 FTF base/replay 差异与修改方向一致 |
| possible | 代码 diff 命中相关模块，或改变了 outbound 请求参数/次数/context 透传，但缺少字段级或日志级证据，需要补查 flow/logid 或补充本地单测 |
| weak | 代码 diff 只在邻近模块，FTF 证据不足以连接到字段差异；采集源、环境、mock、配置、localcache、TCC 异步或 singleflight 等方向缺少任务证据 |
| no evidence | 已查相关代码路径，未见能解释 diff 的改动；仍需说明检查范围 |

## 结论边界

- 不能只凭 FTF value diff 说“代码问题”；必须说明代码 diff 如何改变该字段、下游请求或业务分支。
- 不能只凭代码 diff 排除环境问题；如果 mock、DB、缓存、TCC、实验或 IDL 证据不完整，要保留验证项。
- 如果 base/replay 都成功且只是数组顺序变化，先按 `diff-denoise-reference.md` 检查元素集合、业务主键和排序后匹配结论，不要直接判回归。
- 如果 replay 失败来自环境资源缺失、mock 未命中或状态污染，代码相关性通常是 `weak` 或 `possible`，除非本分支改变了资源 key、请求参数、调用次数或 context 透传。
- 如果沙箱任务 outbound mock 失败，先按匹配规则解释：录制侧是否有同 protocol/method 的 outbound、请求参数是否 diff、候选是否已被使用、回放调用次数是否增加。只有这些变化能被代码 diff 解释时，才提高代码相关性等级。系统级任务通常不期待 outbound diff，不要套用沙箱 mock 失败逻辑。

## 输出要求

代码关联结论至少包含：

- FTF 证据：method、diff path、base/replay 值、logid 或 outbound 摘要。
- 任务形态证据：系统级 / 沙箱 / 不确定，顶层 `env`、`replay_env`、`mock_enable` 统计、base/replay commit 获取情况。
- 代码范围：本地 diff、MR diff、commit，检查过的文件/函数。
- 相关性等级：strong / possible / weak / no evidence。
- 因果说明：代码变更如何解释或不能解释 FTF diff。
- 后续验证：需要补充的日志、重跑、单测、配置确认或平台环境动作。

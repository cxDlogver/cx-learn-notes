# FTF Flow Diff 根因分析

## 用途

当用户给出 flow diff URL、单条 record、某个 diff path，或 task triage 已选出代表性 case 时，使用本流程。目标是解释 base/replay 为什么不同，并给出可验证的根因判断。

查询命令参数见 `diff-query-reference.md`；随机值和数组乱序降噪见 `diff-denoise-reference.md`；代码相关性判断见 `code-diff-correlation.md`。

## 核心模型

沙箱任务里的 outbound mock 分为两步：

1. 匹配：先在录制数据里找相同 protocol、method 的 outbound 请求。只有一个候选时直接使用；多个候选时，用回放请求参数和录制请求参数做 diff，选择差异最小的候选；请求一样或没有请求参数时，按时间顺序匹配。已用过的 outbound 默认不会再次匹配，除非业务/平台配置允许重复匹配。
2. mock：把匹配到的录制 outbound response 反序列化进回放服务拿到的 response 结构体。

因此 outbound diff 的关键不是“下游是否真的被调用”，而是“回放请求能否在录制 outbound 中找到可解释的匹配项，以及反序列化后的 response 是否能驱动同一业务分支”。

系统级任务不走这个 mock 边界：base/replay 在两个真实代码环境中回放真实入口请求并比较 response，通常不期待 outbound diff。单条 flow 分析如果来自系统级任务，应以 inbound response diff、真实 request、环境和代码版本差异为主，不要因为 outbound 为空判定证据缺失。

## 快速路径

```bash
# 1. flow diff URL：直接拉上下文。沙箱任务重点看 inbound/outbound；系统级任务通常以 inbound 为主。
bytedcli --json ftf flow diff get \
  --url "<ftf-flow-diff-url>" \
  --with-values \
  --with-outbound

# 2. 需要定位某一条 value diff 时，补 diff selector。
bytedcli --json ftf flow diff get \
  --url "<ftf-flow-diff-url>" \
  --with-values \
  --diff-id sample-diff \
  --similar-case-id sample-similar-case

# 3. 没有 URL 时，用 psm_task_id、method、log_id 查询。
bytedcli --json ftf flow diff get \
  --psm-task-id 123456701001 \
  --method GetDemo \
  --log-id sample-log-id \
  --with-values \
  --with-outbound
```

如果只有 task id 和 pid，先查原始 flow：

```bash
bytedcli --json ftf flow get --task-id 1234567 --pid sample-pid
```

## 取证顺序

1. 确认 selector：task id、PSM task id、method、logid、pid、record id、direction。
2. 继承 task 级任务形态判断：系统级任务主要看 inbound response diff，不强求 outbound；沙箱任务同时看 inbound response diff 和 outbound request diff。FTF 产物启动、组件支持、context 透传等任务结果外前提不能自行确认。
3. 读取 diff 摘要：diff path、diff reason、base/replay 摘要、状态码、err_msg、outbound diff。
4. 读取字段值：对 value diff 取 base/replay 的具体值，避免只看路径或摘要。
5. 读取 request/response：确认输入是否一致，base 和 replay 是否都成功。
6. 读取 outbound 匹配结果：是否有 `not match recorded outbound`、请求 diff、未使用的录制 outbound、重复匹配问题。
7. 读取相似 case：判断是单条偶发还是稳定模式。
8. 做降噪检查：随机值 diff 看跨流量分散和字段语义；数组乱序 diff 需要两侧明细、可解释主键和排序后匹配结论。
9. 读取 replay logid：时间窗围绕 replay_time，不要用当前时间。
10. 必要时进入代码关联：字段组装、过滤、默认值、排序、IDL、TCC/实验、状态机逻辑变化。

## Inbound 与 Outbound

Inbound value diff 重点看：

- diff path 是否对应稳定业务字段；
- base/replay 原始值、解析值、字段缺失和类型变化；
- request 是否一致，replay 是否命中同一业务分支；
- similar cases 是否指向同一字段或同一业务条件。

Outbound diff 只在沙箱任务或任务结果明确提供 outbound 证据时作为重点。主要看：

- 下游 PSM、method、请求参数和响应结构；
- mock 是否命中，是否命中同 protocol/method 的正确候选；
- 回放请求参数是否和录制 outbound 请求有 diff；请求 diff 通常说明对外请求参数发生变化，需要判断是否符合预期；
- 下游是否返回错误、空值或非预期默认值；
- 录制 outbound 调用次数是否少于回放调用次数；默认已匹配的 outbound 不会重复使用；
- outbound diff 是否能解释最终 inbound value diff。

## 常见根因模式

| 模式 | 关键证据 | 结论边界 |
| ---- | -------- | -------- |
| mock 未命中或下游 mock 缺失 | 沙箱任务日志有 `not match recorded outbound`，录制侧没有同 protocol/method outbound，或录制调用次数少于回放调用次数 | 可基于当前任务结果说明“匹配失败”；业务变更、环境代码不一致、组件不支持、context 丢失或缓存逻辑只能作为待验证方向，除非日志或用户补充证据明确出现。系统级任务通常不套用 mock 未命中逻辑 |
| mock 匹配错误 | 有候选 outbound，但请求 diff 指向错误候选或时间顺序/重复匹配导致响应不符合预期 | 先解释匹配规则，再判断是否需要调整请求幂等、重复匹配配置或方法级 mock |
| replay 环境数据污染 | base/replay 输入一致，但 replay 读到脏 DB/缓存/状态机数据 | 不要直接判代码问题，先给出清理或隔离验证建议 |
| 业务字段逻辑变化 | replay 成功，目标字段值稳定变化，代码 diff 命中字段组装/过滤/默认值 | 进入 `code-diff-correlation.md` 判断是否本分支引入 |
| 异步配置或全局状态无法 mock | 任务日志、字段 diff 或代码证据指向 TCC AddListener、localcache、全局变量、singleflight 等请求外状态 | 任务结果本身通常不能证明真实接入状态；只能建议方法级 mock、context 改造或降噪配置作为验证方向 |
| IDL/TCC/实验差异 | replay 日志显示配置、实验或 IDL 版本不同 | 任务结果能证明的只限日志和字段差异；TCC 异步监听写入全局变量不在默认 mock 范围，但是否发生需外部证据 |
| order-only diff | 数量和元素集合一致，仅顺序不同；两侧明细可按稳定业务主键排序比较 | 按 `diff-denoise-reference.md` 判断。只有排序后完全匹配，且顺序无业务语义时，才作为高置信降噪 |
| replay 业务错误 | replay status/err_msg/logid 指向业务异常 | 需要区分环境缺失、mock 缺失和本分支代码异常 |
| 反序列化或 interface 类型差异 | replay mock 后类型断言失败、json.Number 与 int64 等类型不一致 | 这是 mock 反序列化边界，通常需要业务兼容或方法级 mock |

## 输出要求

单条 flow 根因分析至少包含：

- 输入 selector：URL 或 psm_task_id/method/logid/record id。
- 任务形态：系统级 / 沙箱 / 不确定；系统级说明“不期待 outbound diff”，沙箱说明 outbound request diff 和 mock 匹配状态。
- diff 类型：inbound value diff、outbound diff、order-only、replay error。
- base/replay 对比：字段 path、值、状态码、错误信息、关键 request。
- 证据链：相似 case、record value、flow get、logid、outbound、mock 匹配状态。
- 降噪判断：随机值 diff 或数组乱序 diff 的证据、置信度和是否从主根因链路剔除。
- 根因判断：已证明事实、推断、仍需验证。
- 下一步：代码确认、方法级 mock、mock 补齐、环境清理、重跑、降噪、外部确认 context/部署前提，或继续查其他 case。

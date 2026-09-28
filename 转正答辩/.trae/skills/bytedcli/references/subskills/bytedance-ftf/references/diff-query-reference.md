# FTF Diff 查询参考

## 用途

FTF diff 查询命令用于从 Tesla-X / FTF / `assert.byted.org` 获取 diff 分析所需的只读证据。
当需要读取 task 上下文、diff cluster、flow diff、字段值、标注状态或相似 case 时，可以使用这些命令。

task/flow URL 查询命令会把 Tesla-X URL 解析成稳定 selector，再串联 task 上下文、diff cluster、record value、相似 case 和 outbound diff。`diff-attribution get/list` 是精查某条 inbound record 的直接入口。

本文件只覆盖 diff 分析取数相关的查询命令和 API 形态，不覆盖 FTF task 创建、plan trigger、retry、stop 等写操作。

查询输出要结合录制回放模型解释：`bytecopy` 采集通常不包含完整 outbound；`sdk` 采集才更适合下钻 outbound mock。没有 outbound 数据时，只能基于任务结果判断“当前结果缺少 outbound 证据”；采集源、FTF 产物启动状态等若结果未展示，应列为外部待验证项。

## JSON 输出约定

task/flow harness 命令默认输出精简分析 payload，只保留 Agent 归因需要的稳定字段：

- `task diff-cluster list/get` 不输出后端 raw 对象，也不透传未识别字段。
- `task evidence get` 输出统一证据包，包含 task meta、psm_task_id 映射、任务/PSM/接口汇总统计、top method、top diff 聚类、代表样本和原始来源 endpoint/参数，适合多个 agent 对同一 task 做同题分析时共用。传 task URL 时 CLI 会自动应用 URL 里的 `diffReasons` 筛选；没有 URL 筛选时默认只取未处理 diff 聚类；需要看全部时显式传 `--annotation-op-type all`。后端 similar diff 列表接口当前不支持服务端分页，CLI 会拉全量后按 URL 或显式参数过滤，再按 `--page` / `--page-size` 返回本页证据。JSON 字段名可能仍叫 `aggregates`，用户报告里统一写“汇总统计”。
- `task diff-cluster list` / `task analyze` 输出 `clusterSelection`：`total` 是当前筛选口径下、未应用 `--top` / `--top-n` 截断前的 diff 聚类数；`returned` 是本次返回或详细分析的聚类数；`remaining` 是剩余未展开聚类数；`truncated=true` 表示报告需要输出“剩余未分析聚类表”。
- `task diff-cluster list/get` / `task analyze` 的每个 `cluster` 都会尽量输出 `displayPath` 和 `flowDiffUrl`。报告正文优先使用 `displayPath` 作为 path；优先使用 `flowDiffUrl` 作为代表流量详情链接。缺字段时不要编造链接。
- `diff path-profile get` 按 task + psm + method + diff path 聚合 base/replay value 分布，输出 distinct count、top values、样本 log_id 和随机值置信度依据；它只提供依据，不直接定性。
- `diff array-check get` 对一个 diff path 或 similarDiffId 拉 base/replay array，尝试按显式或推断候选主键排序后比较；输出候选主键、排序后是否一致、`failedSamples` 失败样本，并标注需要业务语义确认。若 FTF 将同一数组 path 拆成 base-only / replay-only 两类元素级 diff 聚类，命令会额外输出 `pairedElementAlignment`，用于说明两侧元素能否按业务键一一对齐、对齐后是否仍有字段差异。
- `flow diff get --with-values` 保留 `base` / `replay` 和 origin/deepParse 的存在性、数量摘要；不输出 origin/deepParse 大字段。
- `flow diff get --with-outbound` 和 task 类命令的 `--with-outbound` 输出 `outbound.summary`、`outboundCount/newOutboundCount`、`baseOutboundPreview/replayOutboundPreview`、`outboundDiff`。preview 只用于报告取样，不是全量外调列表；完整外调需要继续下钻代表 flow。
- `flow diff get --diff-id/--similar-case-id/--diff-number` 会选中一条 value diff，并按 diff path 从 record value 中抽取 base/replay 值。
- `task analyze` 会把 task 上下文、diff cluster、value diff、record value 和 similar cases 串起来，适合从 task URL 直接产出可分析 JSON；默认 `--direction inbound`。传 task URL 时 CLI 会自动应用 URL 里的 `diffReasons` 筛选；没有 URL 筛选时只分析页面“标注原因”未处理过的聚类。
- `task diff-cluster get --with-values` 未显式传 `--direction` 时会自动按 inbound 聚类查询；显式传 `--direction all/outbound` 同时带 value 相关参数会报错。优先读取 JSON 的 `inbound.samples`。`valueSource=record_value` 表示值来自 record value + diff path 抽取；`valueSource=similar_case_list` 表示 value diff 明细没有命中该聚类，样本来自聚类代表 case。样本里的 `basePresent/replayPresent` 用于区分“该侧值存在”与“未抽到/不存在”，不要只凭字段缺省过度解释。
- 页面“标注原因”列对应聚类对象的 `opType` 字段；`opType=0` 或缺失表示“未处理过”。`--annotation-op-type unannotated` 等价于 `0`，`--annotation-op-type all` 表示不按人工标注原因过滤。不要为了“保险”固定传 `--annotation-op-type unannotated` 覆盖用户当前 URL；只有明确要覆盖 URL 筛选时才传该参数。JSON 里的 `annotationOpTypeSource` 会说明筛选来自 `url`、`explicit`、`default` 还是 `none`。

解释 outbound 查询结果时注意：

- `request diff` 表示回放 outbound 请求参数和录制 outbound 请求参数不同，需要判断是否符合本分支预期。
- `not match recorded outbound` 通常表示录制侧没有采集到对应 outbound，或录制调用次数少于回放调用次数。
- 同 protocol/method 有多个候选时，平台会基于请求 diff 和时间顺序匹配；已匹配的 outbound 默认不会重复使用。

## 鉴权

这些 API 通过 `X-Jwt-Token` header 使用 ByteCloud JWT 鉴权，不使用 Tesla RM token。
请先执行 `bytedcli auth login`，或通过环境变量提供 JWT：推荐使用通用变量 `BYTEDCLI_USER_CLOUD_JWT`。

## 查询命令

```bash
bytedcli --json ftf target parse --url "<ftf-url>"

bytedcli --json ftf task get --url "<ftf-task-url>"

bytedcli --json ftf task get --task-id 1234567

bytedcli --json ftf task evidence get \
  --url "<ftf-task-url>" \
  --page 1 \
  --page-size 20 \
  --top-n 10 \
  --sample-size 3

bytedcli --json ftf diff path-profile get \
  --url "<ftf-task-url>" \
  --psm example.psm \
  --method GetDemo \
  --sample-size 20

bytedcli --json ftf diff array-check get \
  --url "<ftf-task-url>" \
  --similar-diff-id sample-similar-diff \
  --key sample_id \
  --sample-size 5

bytedcli --json ftf task diff-cluster list \
  --url "<ftf-task-url>" \
  --direction all \
  --method GetDemo \
  --sort diff-count-desc \
  --top 20

bytedcli --json ftf task analyze \
  --url "<ftf-task-url>" \
  --direction inbound \
  --method GetDemo \
  --with-values \
  --sample-values 3 \
  --with-similar-cases \
  --top-n 10

bytedcli --json ftf task diff-cluster get \
  --url "<ftf-task-url>" \
  --similar-diff-id sample-similar-diff \
  --with-values \
  --sample-values 3 \
  --with-similar-cases \
  --with-outbound

bytedcli --json ftf flow diff get \
  --url "<ftf-flow-diff-url>" \
  --with-values \
  --with-outbound

bytedcli ftf diff-attribution get \
  --record-id 1234567_sample_record

bytedcli ftf diff-attribution list \
  --record-id 1234567_sample_record \
  --similar-case-id sample-similar-case \
  --diff-id sample-diff \
  --page 1 \
  --page-size 5

bytedcli ftf diff-attribution list \
  --record-id 1234567_sample_record \
  --similar-case-id sample-similar-case \
  --diff-id sample-diff \
  --all
```

使用 `get` / `list` 作为稳定入口。

如果需要机器可读输出，使用全局 JSON 模式：

```bash
bytedcli --json ftf diff-attribution get \
  --record-id 1234567_sample_record
```

## 参数

| 参数                | 是否必填    | 说明                                                          |
| ------------------- | ----------- | ------------------------------------------------------------- |
| `--record-id`       | 是          | 复合 inbound record id。case id 从第一个 `_` 之前的前缀派生。 |
| `--similar-case-id` | `list` 必填 | 相似 case 标识。                                              |
| `--diff-id`         | `list` 必填 | diff 标识。                                                   |
| `--page`            | 否          | 页码，默认 `1`。                                              |
| `--page-size`       | 否          | 分页大小，默认 `5`。                                          |
| `--all`             | 否          | 自动翻页获取全部相似 case，最多拉取 50 页。                   |
| `--business`        | 否          | 可选业务标识。为空时不会带入 API 请求。                       |
| `--env`             | 否          | FTF 环境，支持 `cn` 或 `boe`，默认 `cn`。                     |

URL harness 常用参数：

| 参数                   | 适用命令                                                     | 说明                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--url`                | `target parse` / `task *` / `flow diff get`                  | Tesla-X FTF task 或 flow diff URL。                                                                                                                                |
| `--direction`          | `task analyze` / `task diff-cluster *`                       | `inbound`、`outbound` 或 `all`。                                                                                                                                   |
| `--annotation-op-type` | `task evidence get` / `task analyze` / `task diff-cluster *` | `unannotated`、`all`、语义化标注原因，或逗号分隔的多值；显式传参优先于 URL `diffReasons`。`task evidence get` / `task analyze` 在无 URL 筛选时默认 `unannotated`。 |
| `--with-values`        | `task analyze` / `task diff-cluster get` / `flow diff get`   | 拉取 base/replay value 摘要。                                                                                                                                      |
| `--sample-values`      | `task analyze` / `task diff-cluster get`                     | 每个 cluster 的代表性 value diff 样本数。                                                                                                                          |
| `--with-similar-cases` | `task analyze` / `task diff-cluster get`                     | 拉取并汇总 inbound 相似 case。                                                                                                                                     |
| `--with-outbound`      | `task analyze` / `task diff-cluster get` / `flow diff get`   | 拉取 outbound diff 上下文。                                                                                                                                        |

`task diff-cluster get` 的 value 相关输出：

- `inbound.samples`：面向 agent 的稳定样本入口，包含 `source`、`path`、`recordId`、`logId`、`baseValue`、`replayValue`。
- `inbound.valueSource=record_value`：通过 `getValueDiffDetail` 匹配到聚类，再从 `getRecordValue` 按 path 抽值。
- `inbound.valueSource=similar_case_list`：`getValueDiffDetail` 没有返回能匹配该聚类的 value diff，CLI 改用 `getSimilarCaseListByDiffId` 的代表样本。
- `representativeValueDiffs`、`representativeSamples` 是兼容字段；新报告优先读 `samples`，并在结论里说明取值来源。

P0 diff 分析取证命令常用参数：

| 参数                     | 适用命令                                                               | 说明                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `--url` / `--task-id`    | `task evidence get` / `diff path-profile get` / `diff array-check get` | 二选一。task URL 会先解析 Tesla-X 上下文，并自动带入 URL 上的 `diffReasons` 筛选；task id 直接查询 task。 |
| `--psm`                  | 三个命令                                                               | 只分析某个 replay PSM。                                                                                   |
| `--method`               | 三个命令                                                               | 只分析某个 method。                                                                                       |
| `--top-n`                | `task evidence get` / `diff path-profile get`                          | 控制 top method / cluster 或聚合后返回的 top path profile。                                               |
| `--page` / `--page-size` | `task evidence get`                                                    | 对本地过滤后的 top diff 聚类分页；用于避免一次 evidence 输出过大。                                        |
| `--sample-size`          | 三个命令                                                               | 每个 cluster 或检查项拉取的代表样本数。样本量只作为置信度参考。                                           |
| `--diff-path`            | `diff path-profile get` / `diff array-check get`                       | 精确 diff path 过滤或数组检查 selector。                                                                  |
| `--similar-diff-id`      | `diff path-profile get` / `diff array-check get`                       | 精确 similarDiffId 过滤或数组检查 selector。它是内部定位 ID，用户报告正文优先用 method + diff path 表达。 |
| `--key`                  | `diff array-check get`                                                 | 显式排序主键；支持逗号分隔的组合键。未传时由命令基于元素字段推断候选键。                                  |

## 字段口径

- `diffCount` / `diff_count`：平台累计记录的字段级差异条数。数组、列表、重复元素 path 会放大这个数；它只用于说明规模或排序，不代表独立问题数、独立流量数或业务对象数。报告正文推荐写成“累计 diff 明细条数”。
- `logCount` / `log_count`：命中流量数，也可写“覆盖流量数”。面向用户说明影响范围时优先用这个口径。
- `similarDiffId`：相似 diff 聚类的内部定位 ID。命令入参和复现需要它，但报告正文不要用它做主语；用 method、diff path、方向、样本值和详情链接描述。
- `aggregate`：后端接口和 JSON 字段名。报告里翻译成“汇总统计”，如“任务汇总统计 / PSM 汇总统计 / 接口汇总统计”。

## Flow diff 链接拼接

生成 task 级分析报告时，如果某个 diff 聚类或代表样本具备完整流量上下文，应在正文附一个可点击的代表流量详情链接，方便用户直接打开 Tesla-X 复核。不要用 `similarDiffId` 代替用户可打开的链接。

优先读取 `task diff-cluster list/get` 或 `task analyze` JSON 里的 `cluster.flowDiffUrl`。只有旧版本 CLI 或特殊输出缺少该字段时，才按下面规则手工拼接。

链接格式：

```text
https://tesla-x.bytedance.net/space/<space_id>/f_app/task/diff/<task_id>/<psm_task_id>/<method_base64>/<protocol>/<log_id>
```

字段来源：

| URL 片段          | 来源字段                               | 说明                                                                                   |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------------------------- |
| `<space_id>`      | task URL / target parse 的 `spaceId`   | 没有 spaceId 时不要编造链接。                                                          |
| `<task_id>`       | task id                                | 例如 `1234567`。                                                                       |
| `<psm_task_id>`   | PSM task id                            | 例如 `123456701001`。                                                                  |
| `<method_base64>` | `method` 做 UTF-8 base64 后 URL encode | 例如 `/aftersale/apply_page_dynamic` -> `L2FmdGVyc2FsZS9hcHBseV9wYWdlX2R5bmFtaWM%3D`。 |
| `<protocol>`      | cluster / flow 的 protocol             | 常见为 `http`；没有证据时不要猜。                                                      |
| `<log_id>`        | 代表流量原始 log_id                    | 使用不带 method 后缀的原始 log_id，并 URL encode。                                     |

Node.js 拼接示例：

```js
function buildFlowDiffUrl({ spaceId, taskId, psmTaskId, method, protocol, logId }) {
  const methodBase64 = Buffer.from(method, "utf8").toString("base64");
  return `https://tesla-x.bytedance.net/space/${encodeURIComponent(spaceId)}/f_app/task/diff/${encodeURIComponent(
    String(taskId),
  )}/${encodeURIComponent(String(psmTaskId))}/${encodeURIComponent(methodBase64)}/${encodeURIComponent(
    protocol,
  )}/${encodeURIComponent(logId)}`;
}
```

报告正文推荐写法：

```text
`/aftersale/apply_page_dynamic` 的 `data->...` 覆盖 1 条流量，累计记录 4 条 diff 明细。代表流量详情：<flow-diff-url>。
```

注意：

- 这是“代表流量详情链接”，不是 diff 聚类永久链接；同一个 diff 聚类覆盖多条流量时，选择最能说明问题的一条代表流量。
- `method_base64` 一定要 URL encode。base64 可能包含 `/`、`+`、`=`，直接拼进 path 可能导致路径被拆坏。
- 如果只有 `recordId`，优先用 CLI 已解析出来的 `method/logId`；不要靠字符串猜测。必须从 `recordId` 反推时，确认 `recordId` 形如 `<psm_task_id>_<log_id>_<method-without-leading-slash>`，只去掉 method 的开头 `/`，内部 `/` 保留。
- 缺少 `spaceId`、`protocol` 或原始 `logId` 时，不生成链接；改为给 task URL + method + path + 代表 log_id。

## API 形态

- URL task 上下文：`GET /task/query?taskId={taskId}`
- task aggregate（任务汇总统计）：`POST /aggregate/report/task`，payload 带 `task_id` 和 `no_re_aggregate=true`
- PSM aggregate（PSM 汇总统计）：`POST /aggregate/report/psm`
- method aggregate（接口汇总统计）：`POST /openapi/assertion/aggregate/report/method`
- task diff cluster：`GET /nova/task/getSimilarDiffListByTaskId?taskId={psmTaskId}&type=inbound|outbound`
- cluster 代表样本：`GET /nova/valuediff/getSimilarCaseListByDiffId/{psmTaskId}?type={direction}&similarDiffId={similarDiffId}&page={page}&size={size}`
- record value：`GET /nova/record/getValue/{psmTaskId}`
- outbound diff：`GET /nova/valuediff/getOutbound`
- 相似 case：`GET /nova/valuediff/getSimilarCaseList/{caseId}`
- Inbound diff 详情：`GET /nova/valuediff/getValueDiffDetail/{caseId}`

两个接口都会通过 query 参数接收 `recordId`，并从同一个复合 record id 中派生 `{caseId}`。

## 验证方法

### 本地验证

文档或命令实现变更后，先跑基础校验：

```bash
npm run validate:skills
git diff --check
```

如果涉及 `diff-attribution` 命令、参数或 API 拼装逻辑，再跑聚焦单测：

```bash
node --test -r ts-node/register -r tsconfig-paths/register \
  test/api/ftf/client.test.ts \
  test/cli/handlers/ftf/diff_attribution.test.ts \
  test/cli/commands/ftf/ftf.test.ts
```

这些测试能验证：

- `recordId` 会从第一个 `_` 前派生 `{caseId}`。
- `get` 和 `list` 会转发正确参数。
- `page`、`page-size`、`business` 的默认值和空值处理符合预期。
- `--all` 会按页拉取相似 case，并在达到安全页数上限时标记 `truncated=true`。
- 请求会带 `X-Jwt-Token`、Tesla-X `origin` 和 `referer`。

### 真实只读 smoke

真实验证需要一条已经存在 value diff 的复合 inbound `record-id`。格式通常是：

```text
<psm_task_id>_<log_id>_<method-with-slashes-removed>
```

示例占位：

```text
1234567_sample_log_id:sample_call_id:50_SampleMethod
```

先查 diff 详情：

```bash
bytedcli --json ftf diff-attribution get \
  --record-id '1234567_sample_log_id:sample_call_id:50_SampleMethod'
```

期望结果：

- 返回 `code=200`、`message=OK`。
- `data.valueDiffList` 非空。
- 每条 diff 中包含真实的 `diffId` 和 `similarCaseId`。

然后用上一步返回的真实 `similarCaseId` 和 `diffId` 查相似 case：

```bash
bytedcli --json ftf diff-attribution list \
  --record-id '1234567_sample_log_id:sample_call_id:50_SampleMethod' \
  --similar-case-id 'sample-similar-case-id' \
  --diff-id 'sample-diff-id' \
  --page 1 \
  --page-size 5
```

如果需要一次性拉全量相似 case，可以加 `--all`：

```bash
bytedcli --json ftf diff-attribution list \
  --record-id '1234567_sample_log_id:sample_call_id:50_SampleMethod' \
  --similar-case-id 'sample-similar-case-id' \
  --diff-id 'sample-diff-id' \
  --all
```

期望结果：

- 返回 `code=200`、`message=OK`。
- `data.similarCaseList` 非空，或至少返回 `similarCount` / `similarRecordCount`。

不要用占位的 `sample-similar-case` / `sample-diff` 做真实 smoke；平台可能返回 500。必须先通过 `get` 取真实 id，再调用 `list`。

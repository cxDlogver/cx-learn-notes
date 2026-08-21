---
name: bytedance-bytest
description: "Operate ByteTest client automation testing via bytedcli: create, query, and cancel automation test tasks (toutiao.clientqa.ctest_api). Use when tasks mention ByteTest, bytest, client automation testing, ctest, ctest_api, auto_test, 客户端自动化测试, 自动化测试任务, 创建测试任务, 查询测试任务, or 终止/取消测试任务."
---

# bytedcli ByteTest

通过 bytedcli 操作 ByteTest 客户端自动化测试平台（PSM `toutiao.clientqa.ctest_api`）：创建、查询、终止自动化测试任务。

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

## When to use

- 创建自动化测试任务：`bytest task create`
- 创建任务并等待结果（create + 轮询直到结束）：`bytest task run`
- 查询任务列表：`bytest task list`
- 查询单个任务详情：`bytest task get`
- 终止（取消）任务：`bytest task cancel`

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 鉴权走 ByteCloud SSO JWT（请求头 `x-jwt-token`），首次使用先执行：`bytedcli auth login`

## Quick start

```bash
# 查询任务列表（--biz 必填）
bytedcli bytest task list --biz 1 --page 1 --page-size 20
bytedcli bytest task list --biz 1 --status success,failed --template-ids 123,456

# 查询任务详情
bytedcli bytest task get --id 123456

# 创建任务：完整 body 用 JSON 文件（推荐）
bytedcli bytest task create --params-file ./task.json --yes

# 也可用 JSON 字符串
bytedcli bytest task create --params '{"biz":1,"template_id":123,"name":"demo-task"}' --yes

# 预览请求体而不真正提交
bytedcli bytest task create --params-file ./task.json --dry-run

# 创建任务并等待跑完（create + 轮询，body 来源与 create 相同）
bytedcli bytest task run --params-file ./task.json --yes

# 自定义轮询间隔与超时（毫秒；默认间隔 15000、超时 1800000=30min）
bytedcli bytest task run --params-file ./task.json --yes --poll-interval-ms 10000 --wait-timeout-ms 600000

# 终止（取消）任务
bytedcli bytest task cancel --id 123456 --yes
```

## 项目级缺省配置（.bytest/config.json）

在仓库根目录放 `.bytest/config.json`，即可省去每次重复传 `--biz` 和完整 create body（显式 flag 始终优先）：

```json
{
  "biz": 1,
  "createParamsFile": ".bytest/task.json"
}
```

- `biz`：`bytest task list` 缺省业务线，省去 `--biz`。
- `createParamsFile`：`bytest task create` 缺省请求体文件（相对仓库根目录）；也可用 `"createParams": { ...完整 body... }` 内联。
- create body 解析优先级：`--params`/`--params-file` > `createParams` > `createParamsFile` > 约定文件 `.bytest/task.json`（存在即用）。

完整模板与字段说明见 `references/project-config.md`。

配置后：

```bash
bytedcli bytest task list                  # 用 config.biz
bytedcli bytest task create --dry-run       # 用 config 的 create body，先预览
bytedcli bytest task create --yes           # 用 config 的 create body，真正创建
```

## Agent Guidance

- **鉴权**：ByteCloud SSO JWT，请求头 `x-jwt-token`（不是 `Authorization: Bearer`）。由 `bytedcli auth login` 登录态自动获取与刷新；未登录或报 `invalid api token` 时先 `bytedcli auth login`。
- **`task list` 必须带 `--biz`**（业务线 id），否则报 `BYTEST_INPUT_ERROR`。
- **创建任务只接受完整 JSON body**：用 `--params-file <path>`（推荐）或 `--params <json>` 传入整个请求体。create body 很大且深层嵌套（`app`、`plugin_configs`、`device_filters`、`trigger_param_map`/`run_param_map`/`user_param_map` 等），无法用零散 flag 可靠拼出,务必基于模板 JSON 构造。可先对一条已存在任务跑 `bytest task get --id <id> -j` 参考字段结构。
- **写操作确认**：`task create` / `task run` / `task cancel` 需要 `--yes` 才会真正执行；用 `--dry-run` 只打印请求体。
- **`task run`（create + 等待结果）**：body 来源与 `task create` 完全相同（`--params-file` / `--params` / `.bytest/config.json` / `.bytest/task.json`）。创建后轮询 `task get`，直到任务到达终态（Success / Failed / Canceled）。任务以 **Failed 或 Canceled** 结束时命令退出码非零（便于脚本/CI 判断）；**轮询超时**不视为错误，会打印当前 task id / status 与“稍后用 `bytest task get --id <id>` 复查或重跑”的提示并以退出码 0 返回。`--poll-interval-ms`（默认 15000）、`--wait-timeout-ms`（默认 1800000=30min）单位均为毫秒。进度逐条打到 stderr，`--json` 时 stdout 仅输出最终单个 JSON 文档。
- **JSON 输出**：`--json` 是全局参数，放在命令前，例如 `bytedcli --json bytest task list --biz 1`。
- **站点**：默认 `cn`（`bytest.bytedance.net`）。国际站用 `--site i18n-bd|i18n-tt|eu-ttp`（`bytest.byteintl.net`），US 用 `--site us-ttp`（`bytest-us.bytedance.net`）。
- **`--status` 过滤值（语义名，逗号分隔）**：`unknown`、`success`、`failed`、`canceled`、`created`、`running`、`canceling`、`analyzing`、`queue`。CLI 会把这些名字映射成后端数字码;传入非法值会报 `BYTEST_INPUT_ERROR` 并列出全部允许值。例：`--status success,failed`。
- **输出里的任务状态码 `status`（TaskStatus）**：`0` Unknown、`1` Success、`2` Failed、`3` Canceled、`4` Created（已创建待执行）、`5` Running、`6` Canceling、`7` ResultAnalyzing、`8` Queue。文本输出展示语义标签（如 `Created`），JSON 含原始 `status` 与 `statusText`。
- **`user_result`（TaskUserResult）**：`0` Unknown、`1` Success、`2` Failed、`3` Canceled、`4` Interrupted、`5` DataLose、`6` PkgFailed、`7` AnalyzeFail、`8` DispatchTimeout；JSON 含 `userResult` 与 `userResultText`。
- **`task get` 失败明细**：detail 里的每个 case（`taskCases[]`）带 `name`、`status`/`statusText`、`failType`、`caseTags`，以及按设备拆分的 `reports[]`（`deviceId`、`status`/`statusText`、`execMsg`、`failType`、`failMsg`）。文本模式下 `Cases` 行显示 `<失败数> failed / <总数>`，并在下方渲染 `Failed Cases` 表（Case / Device / Result / Message）；JSON 模式返回完整结构化字段。`task run` 在任务失败/超时时也会输出同样的失败 case 表，便于直接定位是哪些用例、哪台设备、什么断言失败。要逐条看更深的日志/截图/HAR，再用 report 里的链接或 `case_result.json` 下钻。

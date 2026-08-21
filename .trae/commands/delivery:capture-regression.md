---
description: 将一次已修复或待修复的流程问题记录为回归用例，默认只记录不重跑，不阻塞 skill / command / agent 修改。
---

请按 `.trae/AGENTS.md` 的 Execution Record and Regression Case Policy 执行 `/delivery:capture-regression`。

## Usage

```text
/delivery:capture-regression --stage <prd|bam|plan|mock|task|code|verify|design> --issue "<问题>" --expected "<预期>"
```

允许从最近对话和 git diff 推断参数；无法推断 `stage`、`issue` 或 `expected` 时必须暂停提问。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/flow-regression-cases/README.md`
- 最近修改的 `.trae/AGENTS.md`、`commands/**`、`skills/**`、`agents/**` diff
- 当前 workspace 中能支撑该问题的相关阶段产物（如存在）

## Execute

创建或更新：

- `.trae/flow-regression-cases/<stage>/<case-id>.md`
- `.trae/flow-regression-cases/index.json`（如存在则增量更新；不存在可创建）

case 必须记录：

- `Case ID`
- `Target Stage`
- `Original Issue`
- `Expected Behavior`
- `Changed Process Files`
- `Related Tags`
- `Replay Mode`
- `Minimal Replay Context`
- `Assertions`
- `Cost / Priority`
- `Captured Workflow Version`

`Replay Mode` 必须为以下之一：

- `STATIC_ASSERTION`
- `ARTIFACT_ASSERTION_ONLY`
- `SHADOW_REPLAY_LIGHT`
- `SHADOW_REPLAY_HEAVY`
- `MANUAL_CONTEXT_REQUIRED`

Code 阶段如果上下文过大，不得强行生成 `SHADOW_REPLAY_HEAVY`。优先记录为 `ARTIFACT_ASSERTION_ONLY` 或 `MANUAL_CONTEXT_REQUIRED`，只断言可稳定复现的流程边界。

## Hard Rules

- 捕获 case 默认不运行 `/delivery:regress`，不得阻塞当前流程修改。
- 不得复制大段业务代码、完整日志、完整 DOM、完整 Figma JSON、截图原图或敏感信息进 case。
- 用例断言必须可检查；无法自动检查时写 `MANUAL_CONTEXT_REQUIRED` 并说明人工复现条件。
- 若问题来自 mock-preview，必须记录 `MOCK_PREVIEW` 边界；非 `MOCK_PREVIEW` 不得把缺 mock 当 blocker。

## Output

输出：

- case 文件路径
- index 更新摘要
- Replay Mode
- 是否建议加入 daily suite
- 是否需要立即 targeted regress（默认不需要）

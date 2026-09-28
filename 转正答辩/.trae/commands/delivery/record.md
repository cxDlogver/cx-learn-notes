---
description: 汇总当前需求 workspace 的执行记录，生成或更新 delivery-execution-record.md；只读分析阶段产物和 flow logs，不改变阶段状态。
---

请按 `.trae/AGENTS.md` 的 Execution Record and Regression Case Policy 执行 `/delivery:record`。

## Usage

```text
/delivery:record
/delivery:record --daily
```

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/flow-logs/README.md`
- 当前 workspace 下已存在的阶段产物

如果 `.trae/DELIVERY_STATE.md` 缺少有效 `workspace`，输出 `NO_ACTIVE_WORKSPACE`，不得伪造记录。

## Execute

在当前 workspace 生成或更新：

- `delivery-execution-record.md`

该记录是人类可读的需求执行履历，必须包含：

- `Workflow Version`：当前 `.trae` git commit / branch / dirty / rules hash。
- `Requirement Summary`：需求来源、workspace、执行模式。
- `Stage Timeline`：各阶段开始 / 结束 / Gate 结果，优先来自 `flow-logs`，缺失时从阶段产物推断并标注 `INFERRED`。
- `Key Artifacts`：每阶段关键文件、截图路径、mock 产物、checkpoint commit、回归报告。
- `Problems Found`：问题 id、phase、case_id/task_id/ruleId、分类、证据路径。
- `Resolutions`：解决方式、detour、修改文件 / 产物、closure evidence。
- `Remaining Risks`：未关闭风险、人工确认项和建议下一步。

## Hard Rules

- 不得修改 `.trae/DELIVERY_STATE.md`。
- 不得修改业务代码、mock 产物或阶段产物来让记录更好看。
- 不得把 `delivery-execution-record.md` 当成 case evidence、Gate 证据或阶段完成依据。
- 不得写入 cookie、JWT、token、原始 request / response body、截图原图、完整 DOM 或完整 Figma JSON。

## Output

输出 `delivery-execution-record.md` 路径、更新摘要、缺失信息和是否存在未关闭风险。

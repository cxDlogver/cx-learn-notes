---
description: 汇总 git 内本地 flow-logs，分析交付流程阶段、agent、Gate 和阻塞分布；只读，不改变阶段状态。
---

请按 `.trae/AGENTS.md` 的 Flow Log Hook Protocol 执行 `/delivery:analyze-flow`。

## Usage

```text
/delivery:analyze-flow
/delivery:analyze-flow --phase design
/delivery:analyze-flow --since 2026-06-24
```

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/flow-logs/README.md`

如果 `.trae/flow-logs/` 不存在或没有 `*.ndjson`，输出 `NO_FLOW_LOGS`，不得伪造分析。

## Execute

执行：

```bash
node .trae/scripts/analyze_flow_logs.mjs [--phase <phase>] [--since <YYYY-MM-DD>]
```

本命令只读本地 git 日志，不得修改 `.trae/DELIVERY_STATE.md`、阶段产物、业务代码或 mock 产物。

## Output

输出：

- Events / Phases / Agents / Results 统计。
- Gate Results 统计。
- Recent Risks。
- 若发现某阶段 BLOCKED / NEEDS_TARGETED_REVIEW / AUTO_FIX_REQUIRED 过多，给出下一步应检查的 command / skill / agent，但不得直接改规则。

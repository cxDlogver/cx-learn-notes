---
name: delivery-acceptance
description: 交付验收。用于最终检查 PRD 覆盖、技术方案落地、验证证据、设计对齐、遗留风险和 MR 描述。
context: fork
agent: delivery-reviewer
---

# Delivery Acceptance

## Purpose

判断当前需求是否达到提测、MR 或上线条件。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下全部阶段产物

如果验证未通过、设计存在 BLOCKER、P0 未决问题未处理，必须输出不可交付或有条件交付，不得包装成可交付。

## Mandatory Agent Delegation

必须委派 `delivery-reviewer` agent。

## Main Agent Gate Review

主 Agent 必须遵守 `.trae/AGENTS.md` 的 `Main / Subagent Collaboration Contract`。

`delivery-reviewer` 返回后，主 Agent 只审以下高信号内容：

- `Agent Gate Summary`。
- Acceptance Report 的 Delivery Conclusion、PRD Coverage、Verification Evidence、Design Alignment、Remaining Risks、Next Action。
- 是否存在 P0、验证失败、设计 BLOCKER、未登记临时代码或无关改动。
- MR Description Draft 是否披露验证证据和遗留风险。

只有当 summary 显示 `BLOCKED` / `NEEDS_TARGETED_REVIEW`、交付结论和阶段证据冲突、风险未披露、或验收证据缺失时，主 Agent 才定向回读对应阶段产物。不得默认重读全部 artifacts。

## Required Checks

1. PRD 原子需求覆盖度。
2. 技术方案落地度。
3. 代码改动范围是否符合 plan。
4. 验证证据是否完整。
5. 设计对齐是否通过。
6. P0/P1/P2 风险是否披露。
7. 是否有临时代码、debug 代码、无关改动。
8. MR 描述是否包含背景、改动、验证、风险、回滚。

## Required Outputs

必须更新：

- `08-acceptance-report.md`

运行态说明：

- `.trae/DELIVERY_STATE.md` 是本地状态机缓存，不属于本 skill 的交付产物。
- `delivery-reviewer` 不得直接修改 `.trae/DELIVERY_STATE.md`；如需记录验收状态，只由主 Agent 在 Gate Review 后做最小更新。

## Delivery Conclusion

必须给出三选一：

- 可交付：所有 Gate 通过。
- 有条件交付：存在非阻塞风险，需说明条件。
- 不可交付：存在 P0、验证失败、设计 BLOCKER 或实现缺失。

## Gate

若不可交付：必须说明回退阶段，例如 `/delivery:code`、`/delivery:verify`、`/delivery:design` 或继续暂停等待用户确认。

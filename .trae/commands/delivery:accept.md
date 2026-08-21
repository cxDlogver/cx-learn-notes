---
description: 执行最终交付验收，核对 PRD 覆盖、代码实现、验证证据、设计对齐、风险和 MR 描述
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:accept`。

必须读取：

- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的全部阶段产物
- `.trae/skills/08-delivery-acceptance/SKILL.md`

执行 `delivery-acceptance` skill，并委派 `delivery-reviewer` agent。

`delivery-reviewer` 返回后，主 Agent 必须先审 `Agent Gate Summary`，再审 Delivery Conclusion、PRD Coverage、Verification Evidence、Design Alignment 和 Remaining Risks。若 summary 为 `BLOCKED` / `NEEDS_TARGETED_REVIEW` 或结论与阶段证据冲突，不得输出可交付。

交付结论中的 diff、修改文件统计、验证证据与 MR 描述草稿，统一以 `.trae/AGENTS.md` 中 `Execution Environment Bootstrap Gate` 对应的 `Execution State` 为准。

必须输出：

- 交付结论：可交付 / 有条件交付 / 不可交付
- PRD 覆盖清单
- 代码改动清单
- 验证证据
- 设计对齐结果
- 遗留风险
- MR 描述草稿

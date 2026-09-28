---
name: writing-plans
description: Use when you have a spec or requirements for a multi-step task, before touching code
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for our codebase and questionable taste. Document everything they need to know: which files to touch for each task, code, testing, docs they might need to check, how to test it. Give them the whole plan as bite-sized tasks. DRY. YAGNI. TDD. Frequent commits.

Assume they are a skilled developer, but know almost nothing about our toolset or problem domain. Assume they don't know good test design very well.

**Announce at start:** "I'm using the writing-plans skill to create the implementation plan."

**Context:** If working in an isolated worktree, it should have been created via the `superpowers:using-git-worktrees` skill at execution time.

**Save plans to:** `docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md`
- (User preferences for plan location override this default)

## Project Delivery Override

When this skill is invoked by `/delivery:plan`, `tech-planning`, or `tech-planner`, the project delivery rules override the default Superpowers output contract.

Mandatory overrides:

- Save the plan to the current delivery workspace as `04-tech-plan.md`.
- Do not save the delivery plan to `docs/superpowers/plans/...`.
- The saved `04-tech-plan.md` must keep the native `writing-plans` implementation-plan format consumed by `executing-plans`.
- Do not replace the implementation plan with a custom technical summary format.
- Include Plan Readiness: `READY` / `PARTIAL_READY` / `BLOCKED`.
- Include Implementation Mode: `REAL_READY` / `REAL_READY_LIMITED` / `MOCK_PREVIEW` / `BLOCKED`.
- Include `PRD Logic Coverage Matrix` before the task list.
- Include `Business State Disposition Matrix` before the task list when PRD or Figma contains business-domain selectors, page tabs, content tabs, identity/permission states, or other option-driven page states.
- Include `Page-Level Figma Coverage Audit` before the `Figma / UI 改造清单` when `prd-figma-supplement.md` exists.
- Include `Figma-to-Component Mapping Audit` before the `Figma / UI 改造清单` when `prd-figma-supplement.md` exists and existing visible components may be reused.
- Include `Switcher Impact Contract` when a page-level switch, business-domain selector, top-level tab, or content tab appears in Figma or PRD.
- Include `Figma Region Contract` for every `FIGMA_MAIN_STATE_CONFIRMED` page with executable visual-structure tasks. This single contract replaces the old区域级 tables (visual structure acceptance / visual data source / visual detail / implementation contract / node contract). Each visible region gets one row with its `fileKey` + `nodeId`, data source, the data that execute must read from Figma MCP, visual structure/order, acceptance method, and fallback/blocking. Plan must not inline concrete色值/尺寸样例代码; the `nodeId` is the visual contract and execute reads actual data via Figma MCP.
- Include `Figma Interaction Contract` for every `FIGMA_MAIN_STATE_CONFIRMED` page. This contract must cover every visible actionable copy/control, its `nodeId`, before/after state, code implementation assertion, and verify click assertion.
- Include `Figma Cell Contract` for every page with table/list main state or key cells. This single contract replaces the old单元格级 tables (key cell visual / key cell structure / key cell element visual). Simple label cells take one row (inline style optional but `nodeId` required); complex cells expand into multiple rows (one row per child element sharing the same column name).
- Include a `Figma / UI 改造清单` section when `prd-figma-supplement.md` exists.
- Treat `ui-source-map.md` only as evidence index / source trace; do not use it as the primary source for implementation tasks.
- Convert confirmed Figma UI facts into implementation tasks before code execution, including top-level switches, table tabs, filters, table headers, action areas, and Modal / Drawer / Popover containers.
- Refuse to create executable page-structure tasks for a page whose full Figma main state is missing. PRD/wiki facts can drive fields and mock logic, but cannot substitute for page skeleton, region ordering, layout density, or container hierarchy.
- Refuse to keep an existing visible component in the plan unless it maps to a confirmed Figma region. Existing code may be reused as `LOGIC_ONLY`, but visible UI reuse requires an explicit component mapping decision.
- Refuse to plan any business-domain selector, page tab, content tab, or permission/identity option until every option is classified as `CREATE_NEW_VISIBLE`, `RESTRUCTURE_VISIBLE`, `KEEP_LEGACY_VISIBLE`, `REMOVE_VISIBLE`, or `LOGIC_ONLY`.
- Refuse to plan a page-level switch as a standalone local control. A switch must either drive region/component/store changes through a `Switcher Impact Contract`, or be disabled / skeleton / blocked when the target option has no confirmed main-state evidence.
- Refuse vague visual tasks such as "implement the filter area" when Figma evidence is available. Visual tasks must list region order, key copy, component type, button order, table column order, empty/skeleton behavior, and acceptance checks.
- Refuse vague style tasks such as "implement card group", "align Figma later", "use common card style", or "visual polish in design phase" when Figma evidence is available. Core regions must have executable style constraints before code: layout, spacing, background, border/radius/shadow, icon/illustration, typography, content hierarchy, state behavior, and screenshot/design-check evidence.
- Refuse plans that render actionable visible copy as static text. Copy such as `收起`, `展开`, `一键筛选`, `全部筛选`, `下载`, `自定义列`, `批量创建`, tab labels, drawer/modal buttons, and popover triggers must have interaction assertions and verify click steps.
- Convert every atomic requirement from `03-prd-analysis.md` into either an executable Task step or an explicit mock / skeleton exclusion. Do not rely on module summaries as coverage.
- Apply this override for every technical planning scenario:
  - first-time plan generation;
  - `/delivery:plan` rerun;
  - incremental plan repair after user input;
  - READY / PARTIAL_READY / BLOCKED output;
  - limited implementation plan;
  - mock / adapter / type-isolation plan.
- If the caller requires `/delivery:plan` output, follow that command's output contract instead of the generic execution handoff prompt.

For delivery usage, the required `04-tech-plan.md` structure is:

```md
# <Feature Name> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ...
**Architecture:** ...
**Tech Stack:** ...

## 1. Plan Readiness
...

## 1.1 Implementation Mode
...

## PRD Logic Coverage Matrix
...

## Business State Disposition Matrix
...

## Page-Level Figma Coverage Audit
...

## Figma-to-Component Mapping Audit
...

## Switcher Impact Contract
...

## Figma Region Contract
...

## Figma Interaction Contract
...

## Figma Cell Contract
...

## Figma / UI 改造清单
...

### Task 1: ...
...
```

The task list is mandatory. `/delivery:code` must be able to run `Use Skill: executing-plans` on `04-tech-plan.md` without first inventing or rewriting tasks.

Coverage rule:

- Each atomic requirement must map to `implementation_task`, a mode-specific behavior column, `verification`, and `real_integration_gap`.
- Use `mock_preview_behavior` only when `Implementation Mode = MOCK_PREVIEW`.
- Use `limited_behavior` or `adapter_behavior` for non-mock-preview limited implementation.
- Use `real_behavior` for full real implementation.
- PRD details such as permission visibility, recommendation filtering, sort order, validation limits, status transitions, success navigation, download/export behavior, and cross-system actions must be taskized.
- If a requirement is intentionally not fully implemented in mock-preview or limited implementation, the plan must still describe its skeleton/mock/adapter/no-op behavior and later real-integration recovery point.
- Each option exposed by a business-domain selector, page tab, content tab, route mode, or permission/identity state must map to a visible-state disposition, even when the option is "unchanged".

Delivery self-check override:

- When invoked by `/delivery:plan`, `tech-planning`, or `tech-planner`, the caller may require a Plan Gate Self Check after the plan is saved.
- In that case, re-read the saved `04-tech-plan.md`, verify the project-specific fixed table headers, enum allowlists, PRD coverage, Figma implementation contract, task file paths, and mock-preview leakage rules, then fix issues inline before returning.
- Return `Gate Self Check: PASS / FAIL` with Missing Sections, Invalid Enum, Weak Task Paths, Mock Preview Leakage, PRD Coverage Gaps, Figma Region Contract Gaps, Figma Interaction Gaps, Figma Cell Contract Gaps, Unsupported Implementation Assumptions, and Design Rework Coverage.

Business-state disposition gate:

```md
## Business State Disposition Matrix
| State Axis | Option | 本次动作 | UI 策略 | 主态基线 / Evidence | Plan 约束 | Verification |
|---|---|---|---|---|---|---|
```

Use these exact UI strategies:

- `CREATE_NEW_VISIBLE`: this option gets a new visible page/state from confirmed Figma or explicit PRD scope.
- `RESTRUCTURE_VISIBLE`: this option keeps the same business capability but its visible structure changes.
- `KEEP_LEGACY_VISIBLE`: this option intentionally keeps the previous/original visible page/state; evidence must be user confirmation plus old code path, screenshot, or route baseline.
- `REMOVE_VISIBLE`: this option's old visible UI is intentionally removed or hidden.
- `LOGIC_ONLY`: this option only changes params, permissions, adapter logic, data source, or mock data; it must not alter visible page structure.

Hard rules:

- `新增 X` does not imply every sibling option gets the new X UI. Sibling options must be classified independently.
- If an option is unchanged, it must be `KEEP_LEGACY_VISIBLE` or `LOGIC_ONLY`; do not model it as a skeleton unless the PRD explicitly asks for a placeholder state.
- `KEEP_LEGACY_VISIBLE` requires a preservation verification item, usually a screenshot or DOM assertion proving the legacy page/state remains visibly different from the new state.
- If the plan cannot decide whether an option is new UI, legacy UI, removed, or logic-only, Plan Readiness must be `BLOCKED` with reason `STATE_DISPOSITION_UNRESOLVED`.
- The `Switcher Impact Contract`, `Figma-to-Component Mapping Audit`, task list, and verification plan must reuse this matrix. Conflicting classifications make the plan invalid.

Mock Preview override:

- When the caller passes `--mock-preview` or asks to proceed without backend design using mock data, set `Implementation Mode = MOCK_PREVIEW`.
- In `MOCK_PREVIEW`, Plan Readiness must be `PARTIAL_READY` unless a non-mock P0 exists, in which case use `BLOCKED`.
- The plan must include `Excluded Real Integration`.
- The plan should record interface exploration findings and the inputs that `/delivery:task` will use to derive test cases and BAM mock rules. Do not invent `ruleId`, request matchers, static mock values, or mock response examples in the plan.
- The plan must state that BAM mock artifacts are generated or adjusted only through `/delivery:mock`, and `/delivery:mock` must base mock rules on real request / real response captured through natural UI operations.
- Missing backend design, interface paths, request / response fields, pagination, sorting, error codes, IM, touch task, BPO, download, or upload parsing protocols should become `PLAN_DISCOVERY` / `P1_RISK`, not a blocker for mock preview.
- Missing Figma main state for a page-level UI restructure is not a backend-design gap. It is a UI structure blocker and must become `BLOCKED_FOR_UI_STRUCTURE` for that page.
- Do not describe mock preview as real integration readiness.

Delivery plans must not defer known visual structure to a later design-check pass. If a confirmed Figma main-state fact is available, it must appear in both:

- the `Figma / UI 改造清单`;
- at least one executable task with concrete file paths and verification steps.

Delivery plans must also not invent missing visual structure. Before the task list, write a page-level audit:

```md
## Page-Level Figma Coverage Audit
| 页面 / 子视图 | UI 改造范围 | Figma 主态证据 | 结构覆盖结论 | Plan 动作 |
|---|---|---|---|---|
```

Use these exact conclusions:

- `FIGMA_MAIN_STATE_CONFIRMED`: enough evidence exists to implement page skeleton, region order, filters, table/list area, action area, and container hierarchy.
- `FIGMA_PARTIAL_STRUCTURE_ONLY`: only PRD/wiki/partial Figma evidence exists; do not write executable page-structure tasks.
- `NON_FIGMA_FUNCTIONAL_ONLY`: no page skeleton is being changed.

Use these exact actions:

- `TASKIZE_UI_STRUCTURE`: allowed to generate UI structure tasks.
- `TASKIZE_NON_STRUCTURAL_ONLY`: allowed to generate fields, data, adapter, mock behavior, or copy-only tasks, but not page skeleton tasks.
- `BLOCKED_FOR_UI_STRUCTURE`: stop the page's structure implementation and require Figma main-state capture.

If any core page in scope is `BLOCKED_FOR_UI_STRUCTURE`, Plan Readiness must be `BLOCKED` unless the plan explicitly removes that page from the executable scope. Do not downgrade this to a P2 visual-polish note.

Delivery plans must also audit existing visible component reuse before writing tasks. Use this section when the implementation touches existing pages or components:

```md
## Figma-to-Component Mapping Audit
| 现有组件 / 模块 | 当前可见行为 | Figma 对应区域 | 复用决策 | Plan 约束 |
|---|---|---|---|---|
```

Use these exact decisions:

- `KEEP_VISIBLE`: Figma has an equivalent visible region and the existing component can stay visible.
- `KEEP_LEGACY_VISIBLE`: Figma has no matching visible region, but the user explicitly confirmed that a switch option should keep the previous/original page; the component may be visible only under that legacy option.
- `RESTRUCTURE_VISIBLE`: Figma has a similar capability but the visible structure must be changed.
- `LOGIC_ONLY`: Figma has no matching visible region; only state, params, helpers, columns, store logic, or adapters may be reused.
- `REMOVE_VISIBLE`: Figma has no matching visible region and the visible UI must be removed.
- `CREATE_NEW_VISIBLE`: Figma has a confirmed visible region that existing components cannot represent.

Hard rules:

- A task may say "keep" or "reuse" a visible component only when this audit marks it `KEEP_VISIBLE`, `KEEP_LEGACY_VISIBLE`, or `RESTRUCTURE_VISIBLE`.
- A component marked `LOGIC_ONLY` or `REMOVE_VISIBLE` must not remain visibly rendered in implementation tasks.
- A component marked `KEEP_LEGACY_VISIBLE` must be scoped to the corresponding `TASKIZE_LEGACY_MAIN_STATE` switch option and must not appear in the Figma-confirmed main-state option.
- Page-level switches, tabs, filter blocks, table toolbars, drawers, modals, and popovers require this audit because old code often contains similarly named but semantically different UI.

Delivery plans must also define how page-level switches affect the page. Use this section whenever Figma or PRD contains a business-domain selector, page-level tab, content tab, or any control that changes the page below it:

```md
## Switcher Impact Contract
| Switcher | Option | 主态证据 | 影响区域 | 状态流向 | Plan 动作 |
|---|---|---|---|---|---|
```

Use these exact actions:

- `TASKIZE_FULL_STRUCTURE`: this option has confirmed Figma main-state evidence and may drive full region/component/store changes.
- `TASKIZE_LEGACY_MAIN_STATE`: this option has no separate Figma main state, but the user explicitly confirmed the previous/original page as the intended main state baseline.
- `TASKIZE_SKELETON_ONLY`: this option is in scope but lacks complete visual evidence; implement a clearly different skeleton / empty / disabled state, not a copy of another option.
- `DISABLE_UNTIL_FIGMA`: the option must be visible-disabled or hidden until main-state evidence is captured.
- `BLOCKED_FOR_SWITCHER_STRUCTURE`: the switch is core to the page and cannot be planned safely.

Hard rules:

- Every switch option must already exist in `Business State Disposition Matrix`; `Plan 动作` must be consistent with that option's UI strategy.
- A page-level switch must not be implemented as isolated local state. It must drive at least one downstream region, component prop, route/store state, request parameter, BAM mock response coverage when `MOCK_PREVIEW`, or skeleton state listed in `影响区域`.
- If one option has Figma evidence and another does not, the missing option must not reuse the confirmed option's full visual structure as if it were real. If the missing option is unchanged, use `TASKIZE_LEGACY_MAIN_STATE`; if it is intentionally placeholder-only, use `TASKIZE_SKELETON_ONLY`; if it has no safe state, use `DISABLE_UNTIL_FIGMA` or `BLOCKED_FOR_SWITCHER_STRUCTURE`.
- If the user explicitly confirms that an option should keep the previous/original page, use `TASKIZE_LEGACY_MAIN_STATE`; preserve the legacy page structure as that option's baseline and still wire the switch into downstream region/component/store state.
- `TASKIZE_SKELETON_ONLY` must not be used for an option that the PRD or user says should preserve an old page/state. Use `TASKIZE_LEGACY_MAIN_STATE` instead.
- Every executable task for the switch must name the downstream files and acceptance check proving the below-page content changes after switching.

Delivery plans must include a single region-level visual contract for confirmed Figma pages. This `Figma Region Contract` consolidates the previous区域级 tables (visual structure acceptance, visual data source, visual detail, implementation contract, node contract) into one table:

```md
## Figma Region Contract
| 页面/状态 | UI区域 | fileKey | nodeId | 数据来源 | 需execute提取的数据 | 视觉结构与顺序 | 验收方式 | fallback/blocking |
|---|---|---|---|---|---|---|---|---|
```

Hard rules:

- Every new or restructured visible region must appear with one row. When in scope this includes: title/switcher, filter area, recommendation area, toolbar, table/list, pagination, and modal/drawer/popover containers.
- `nodeId` must point to a real Figma node (with `fileKey`). "按 Figma" or "参考 Figma" without a `nodeId` is invalid and fails self-check.
- Plan must not inline concrete色值/尺寸样例代码 or TSX/SCSS. The `nodeId` is the visual contract; execute calls Figma MCP (`get_figma_data`) to read actual layout/visual/typography/state data before generating code.
- `数据来源` must be one or more of: `cache`, `mcp_targeted_read`, `screenshot`, `reference_source`.
- `需execute提取的数据` must list the style facts execute must read: layout, size, gap, padding, fill, stroke, radius, shadow, typography, copy, icon/image, and state.
- `视觉结构与顺序` must specify region order, component type, key copy, filter item order, recommendation layout, toolbar button order, table column order, container hierarchy, and switch-state differences. "Card group" alone is not enough.
- `验收方式` must require mock-debug screenshot and design-checker/screenshot comparison for core regions. Build-only, DOM-only, or API-only evidence is insufficient.
- If a non-critical detail is missing, cite `fallback/blocking: original page / same-domain page / similar page / design-system default`; if a missing detail affects visible region identity, mark `BLOCKED_FOR_VISUAL_DETAIL` or `PLAN_DISCOVERY`; do not invent style details.

Delivery plans must also include executable interaction contracts for every visible actionable control:

```md
## Figma Interaction Contract
| 页面/状态 | UI区域 | 可操作控件/文案 | nodeId | 触发前状态 | 触发动作 | 触发后状态 | Code执行断言 | Verify点击断言 |
|---|---|---|---|---|---|---|---|---|
```

Hard rules:

- Actionable copy/control includes visible link-like text, buttons, tabs, selects, dropdown triggers, popover triggers, modal/drawer actions, confirm/cancel buttons, and collapse/expand controls.
- A control visible in Figma or screenshot must not be treated as static typography unless the plan explicitly marks it `N_A_STATIC_TEXT` with evidence.
- `Code执行断言` must name the state/handler/store/adapter/component behavior to implement. "Render copy" is invalid for actionable controls.
- `Verify点击断言` must require mock-debug or integration-debug to trigger the control and assert before/after state. DOM text visibility alone is insufficient.
- If the post-click state is not visible in Figma main state, use reference source priority: original page/component, same-domain page, similar page, design-system default. If no reliable source exists and the behavior affects user flow, mark `BLOCKED_FOR_INTERACTION` or `PLAN_DISCOVERY`.
- Tasks must include checkbox steps for these interactions. For example, `收起` must specify whether rows hide, copy changes to `展开`, and clicking `展开` restores rows.

Delivery plans must also include a single cell-level contract for table/list main states and key cells. This `Figma Cell Contract` consolidates the previous单元格级 tables (key cell visual, key cell structure, key cell element visual) into one table:

```md
## Figma Cell Contract
| 页面/表格 | 列名 | nodeId | 单元格类型 | 子元素(逐行) | 形态/热区/空态 | execute提取数据 | 内联样式(简单标签可选) | Code执行断言 |
|---|---|---|---|---|---|---|---|---|
```

Hard rules:

- Simple label cells take one row. Inline style is allowed as a double safeguard, but `nodeId` is still required.
- Complex cells (multiple elements, interaction hot zones, mixed semantics) must expand into multiple rows — one row per child element sharing the same column name. Inline style is not mandatory for expanded rows.
- A complex cell must not be summarized in a single row. Multiple differently-semantic tags/badges must not be merged into one row.
- A row that only writes "按 Figma" or "badge 形态" without a `nodeId` fails self-check.

Planning behavior:

- Derive page structure from Figma regions first, not from the current JSX tree.
- Write the page composition blueprint before taskizing files: region order, container hierarchy, switch/tab semantics, filter area, recommendation area, toolbar, table/list, pagination, drawer/modal.
- Classify each existing component as `visual-region`, `interaction-control`, `data-adapter`, or `legacy-helper` before deciding reuse.
- Use the audit decision as the task verb: `KEEP_VISIBLE`, `RESTRUCTURE_VISIBLE`, `LOGIC_ONLY`, `REMOVE_VISIBLE`, or `CREATE_NEW_VISIBLE`.
- Store, params, helpers, and columns can be reused without keeping their old visible component. A `LOGIC_ONLY` component must appear only in store/helper steps, not JSX rendering steps.

If this override conflicts with any generic rule below, the delivery override wins.

## Scope Check

If the spec covers multiple independent subsystems, it should have been broken into sub-project specs during brainstorming. If it wasn't, suggest breaking this into separate plans — one per subsystem. Each plan should produce working, testable software on its own.

## File Structure

Before defining tasks, map out which files will be created or modified and what each one is responsible for. This is where decomposition decisions get locked in.

- Design units with clear boundaries and well-defined interfaces. Each file should have one clear responsibility.
- You reason best about code you can hold in context at once, and your edits are more reliable when files are focused. Prefer smaller, focused files over large ones that do too much.
- Files that change together should live together. Split by responsibility, not by technical layer.
- In existing codebases, follow established patterns. If the codebase uses large files, don't unilaterally restructure - but if a file you're modifying has grown unwieldy, including a split in the plan is reasonable.

This structure informs the task decomposition. Each task should produce self-contained changes that make sense independently.

## Bite-Sized Task Granularity

**Each step is one action (2-5 minutes):**
- "Write the failing test" - step
- "Run it to make sure it fails" - step
- "Implement the minimal code to make the test pass" - step
- "Run the tests and make sure they pass" - step
- "Commit" - step

## Plan Document Header

**Every plan MUST start with this header:**

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [One sentence describing what this builds]

**Architecture:** [2-3 sentences about approach]

**Tech Stack:** [Key technologies/libraries]

---
```

## Task Structure

````markdown
### Task N: [Component Name]

**Files:**
- Create: `exact/path/to/file.py`
- Modify: `exact/path/to/existing.py:123-145`
- Test: `tests/exact/path/to/test.py`

- [ ] **Step 1: Write the failing test**

```python
def test_specific_behavior():
    result = function(input)
    assert result == expected
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pytest tests/path/test.py::test_name -v`
Expected: FAIL with "function not defined"

- [ ] **Step 3: Write minimal implementation**

```python
def function(input):
    return expected
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pytest tests/path/test.py::test_name -v`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add tests/path/test.py src/path/file.py
git commit -m "feat: add specific feature"
```
````

## No Placeholders

Every step must contain the actual content an engineer needs. These are **plan failures** — never write them:
- "TBD", "TODO", "implement later", "fill in details"
- "Add appropriate error handling" / "add validation" / "handle edge cases"
- "Write tests for the above" (without actual test code)
- "Similar to Task N" (repeat the code — the engineer may be reading tasks out of order)
- Steps that describe what to do without showing how (code blocks required for code steps)
- References to types, functions, or methods not defined in any task

## Remember
- Exact file paths always
- Complete code in every step — if a step changes code, show the code
- Exact commands with expected output
- DRY, YAGNI, TDD, frequent commits

## Self-Review

After writing the complete plan, look at the spec with fresh eyes and check the plan against it. This is a checklist you run yourself — not a subagent dispatch.

**1. Spec coverage:** Skim each section/requirement in the spec. Can you point to a task that implements it? List any gaps.

**2. Placeholder scan:** Search your plan for red flags — any of the patterns from the "No Placeholders" section above. Fix them.

**3. Type consistency:** Do the types, method signatures, and property names you used in later tasks match what you defined in earlier tasks? A function called `clearLayers()` in Task 3 but `clearFullLayers()` in Task 7 is a bug.

If you find issues, fix them inline. No need to re-review — just fix and move on. If you find a spec requirement with no task, add the task.

## Execution Handoff

After saving the plan, offer execution choice:

**"Plan complete and saved to `<plan-path>`. Two execution options:**

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?"**

**If Subagent-Driven chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:subagent-driven-development
- Fresh subagent per task + two-stage review

**If Inline Execution chosen:**
- **REQUIRED SUB-SKILL:** Use superpowers:executing-plans
- Batch execution with checkpoints for review

---
name: ui-design-gate
description: Create UI design plans and require human confirmation before implementation. Use when Codex needs UI 设计, page layout, interaction states, visual acceptance criteria, frontend UX decisions, or an explicit human design gate.
---

# UI Design Gate

## Workflow

1. Read the spec, technical design, existing UI patterns, and available design system components.
2. Define screens, layout, interaction states, empty/loading/error states, validation behavior, and responsive behavior.
3. Keep the design consistent with the project's frontend conventions and domain.
4. Produce concrete UI acceptance criteria that can drive implementation and visual QA.
5. Stop and request human confirmation before coding UI changes.

## Design Rules

- Prefer existing components and TailwindCSS patterns.
- Avoid marketing-style layouts for operational/productivity tools unless explicitly required.
- Use proper controls: icons for tool actions, toggles for binary settings, tabs for views, inputs/sliders for values, and menus for option sets.
- Ensure text does not overlap, overflow, or depend on viewport-scaled font sizes.
- Do not finalize UI implementation decisions without explicit human approval.

## Mandatory Gate

After producing the UI plan, stop with:

```text
UI 设计需要人工确认。请明确回复“确认/继续/是”后再进入实现。
```

Do not continue to implementation until confirmation is received.

## Output Contract

Return:

- `stage_result`: UI design plan with screens, states, interactions, responsive behavior, and visual acceptance criteria.
- `open_questions`: UI decisions that need user or designer input.
- `risks`: Usability, accessibility, layout, or consistency risks.
- `next_stage_input`: Human-confirmed UI plan for `test-case-generation` and `fullstack-implementation`.

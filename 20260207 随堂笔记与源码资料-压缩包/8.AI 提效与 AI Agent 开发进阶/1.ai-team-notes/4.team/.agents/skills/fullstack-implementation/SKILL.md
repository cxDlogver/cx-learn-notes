---
name: fullstack-implementation
description: Implement approved frontend and backend tasks from specs, designs, and tests. Use when Codex needs 编码, React 19/Vite/TailwindCSS frontend work, backend work, full-stack implementation, or task-by-task delivery after design approval.
---

# Fullstack Implementation

## Workflow

1. Read the active Spec Kit artifacts: `spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, and `tasks.md`.
2. If `tasks.md` is missing, run or follow `$speckit-tasks` before editing code.
3. Run or follow `$speckit-analyze` before implementation when generated artifacts may be inconsistent.
4. Execute `$speckit-implement` task-by-task and mark completed tasks in `tasks.md`.
5. Inspect existing code before editing; follow local patterns, helpers, module boundaries, and naming.
6. Implement the smallest change set that satisfies the approved behavior.
7. Keep frontend work aligned with React 19, Vite, TailwindCSS, cspell, ESLint, and Prettier project conventions.
8. Add or update tests when the change touches behavior, contracts, or user-visible flows.
9. Stop and report blockers if required decisions were not approved, especially UI decisions.

## Implementation Rules

- Preserve KISS and YAGNI; avoid speculative abstractions.
- Apply DRY only where repeated logic or UI is already clear.
- Keep components, hooks, services, and utilities single-purpose.
- Do not switch package managers or add dependencies without clear need and user confirmation when risky.
- Do not execute git commit, push, reset, or destructive filesystem operations from this skill.

## Output Contract

Return:

- `stage_result`: Implemented behavior summary with key files or modules changed.
- `open_questions`: Any remaining implementation decisions or blockers.
- `risks`: Known limitations, compatibility concerns, or unverified behavior.
- `next_stage_input`: Change summary ready for `code-review-verification`.

When implementation is complete, hand off to code review before test execution.

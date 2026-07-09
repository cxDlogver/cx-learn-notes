---
name: spec-kit-orchestrator
description: Orchestrate separate Spec Kit delivery skills in order. Use when Codex needs to串联需求评审、需求拆解、方案调研设计、UI设计门禁、测试用例生成、编码、代码审查验证、测试、git提交建议, or run a full SDD workflow.
---

# Spec Kit Orchestrator

## Stage Order

Run these skills in order:

1. `requirement-review`
2. `requirement-breakdown` using `$speckit-specify` and `$speckit-clarify` when needed
3. `solution-research-design` using `$speckit-plan`
4. `ui-design-gate` as the required human UI approval gate
5. `test-case-generation` using `$speckit-checklist` and plan artifacts
6. `fullstack-implementation` using `$speckit-tasks`, `$speckit-analyze`, and `$speckit-implement`
7. `code-review-verification`
8. `test-execution`
9. `git-commit-proposal`

## Startup Checks

Before starting:

- Read `AGENTS.md` and relevant project configuration.
- Check for `.specify/` and active Spec Kit artifacts.
- Check whether `specify` CLI is available.
- If Spec Kit CLI is missing, stop and ask the user to install it. Do not continue with handwritten substitutes.
- If `.specify/` is missing and the user asked to proceed with Spec Kit, initialize with `specify init --here --integration codex --no-git`.
- Prefer `--no-git` during initialization unless the user explicitly requests repository initialization.
- Do not install dependencies or run package management commands without confirmation.

## Orchestration Rules

- Pass each stage's `next_stage_input` into the next stage.
- Preserve each stage's `stage_result`, `open_questions`, and `risks` in the running summary.
- Use official Spec Kit artifacts as the source of truth: `.specify/memory/constitution.md`, `.specify/feature.json`, `specs/*/spec.md`, `plan.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`, and `tasks.md`.
- Pause when `open_questions` block a decision.
- Pause at `ui-design-gate` until the user explicitly confirms UI design.
- Pause at `git-commit-proposal` until the user explicitly confirms git commit.
- If review finds critical issues, return to `fullstack-implementation`.
- If tests fail, return to the stage responsible for the failure.

## Spec Kit Alignment

Map team stages to Spec Kit concepts:

- Requirement review and breakdown align with `$speckit-constitution`, `$speckit-specify`, and `$speckit-clarify`.
- Solution design aligns with `$speckit-plan`.
- Test case generation aligns with `$speckit-checklist` and acceptance validation.
- Implementation aligns with `$speckit-tasks`, `$speckit-analyze`, and `$speckit-implement`.
- Review, testing, and commit proposal are team quality gates around the Spec Kit flow.

## Output Contract

Maintain a running delivery record:

- Current stage and status.
- Completed stage summaries.
- Blocking questions and decisions.
- Risks and mitigations.
- Commands run and validation results.
- Final commit proposal after tests pass.

Do not skip stages unless the user explicitly narrows the workflow.

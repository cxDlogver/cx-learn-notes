---
name: solution-research-design
description: Research and design implementation plans from a Spec Kit style spec. Use when Codex needs 方案调研设计, architecture choices, technical plan, dependency assessment, tradeoffs, data flow, or speckit-plan style outputs.
---

# Solution Research Design

## Workflow

1. Read the active Spec Kit `spec.md`, project conventions, and existing implementation before proposing changes.
2. Inspect relevant configs such as `package.json`, Vite, TailwindCSS, ESLint, Prettier, cspell, TypeScript, API, and test setup.
3. Run or follow `$speckit-plan` to generate `plan.md`, `research.md`, `data-model.md`, `contracts/`, and `quickstart.md` when applicable.
4. Prefer existing architecture, libraries, naming, and module boundaries.
5. Design the simplest implementation that satisfies the spec.
6. Call out alternatives only when they materially change cost, risk, or maintainability.

## Design Requirements

- Keep KISS and YAGNI as defaults.
- Apply DRY only when duplication is real and meaningful.
- Respect SOLID at component, service, and interface boundaries.
- Avoid adding dependencies unless the repo already uses them or the benefit is clear.
- For frontend work, align with React 19, Vite, TailwindCSS, cspell, ESLint, and Prettier conventions from `AGENTS.md`.

## Output Contract

Return:

- `stage_result`: Path and summary of generated Spec Kit plan artifacts.
- `open_questions`: Decisions that block implementation or UI confirmation.
- `risks`: Technical, dependency, compatibility, performance, and test risks.
- `next_stage_input`: Active feature directory and plan summary for `ui-design-gate` and `test-case-generation`.

Do not write implementation code in this stage unless the user explicitly requested a combined execution and no design ambiguity remains.

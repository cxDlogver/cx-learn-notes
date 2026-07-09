---
name: requirement-review
description: Review raw product or engineering requirements before breakdown. Use when Codex needs to perform 需求评审, validate goals, users, scope, acceptance criteria, risks, blockers, or Spec Kit pre-spec readiness.
---

# Requirement Review

## Workflow

1. Read the user's raw requirement and any local product or engineering context that is relevant and safe to inspect.
2. Identify the business goal, target users, current state, desired state, and measurable success criteria.
3. Separate in-scope work, out-of-scope work, assumptions, constraints, dependencies, and risks.
4. Check whether the requirement is ready for Spec Kit specification work.
5. Ask only for missing information that materially changes scope, behavior, risk, or acceptance criteria.

## Review Rules

- Prefer facts from repository files over guesses.
- Keep the review implementation-neutral unless the requirement already constrains implementation.
- Surface contradictions explicitly with concrete examples.
- Do not invent UI, API, schema, or architecture decisions at this stage.
- If the requirement is too vague to decompose safely, stop with blocking questions.

## Output Contract

Return:

- `stage_result`: Requirement review summary with goal, users, scope, constraints, risks, and acceptance criteria.
- `open_questions`: Blocking or high-impact questions only.
- `risks`: Product, technical, schedule, compliance, or dependency risks.
- `next_stage_input`: A concise reviewed requirement ready for `requirement-breakdown`.

If there are no blocking questions, state that the requirement is ready for breakdown.

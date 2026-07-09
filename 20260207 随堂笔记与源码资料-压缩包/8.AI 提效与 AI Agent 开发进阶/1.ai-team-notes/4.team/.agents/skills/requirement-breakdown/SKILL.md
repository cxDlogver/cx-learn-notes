---
name: requirement-breakdown
description: Break reviewed requirements into Spec Kit aligned specifications. Use when Codex needs 需求拆解, user stories, functional requirements, boundaries, non-functional requirements, acceptance criteria, or specify/clarify style outputs.
---

# Requirement Breakdown

## Workflow

1. Start from the reviewed requirement, not the raw request, when both are available.
2. Check that `specify` CLI and `.specify/` exist. If either is missing, stop and report the missing prerequisite.
3. Use `$speckit-specify` to create or update `specs/<feature>/spec.md` and `.specify/feature.json`.
4. Use `$speckit-clarify` only when externally visible behavior, data contracts, acceptance criteria, or scope remain ambiguous.
5. Treat the generated `spec.md` and requirements checklist as the source of truth for later stages.

## Spec Content

Include:

- User stories or scenarios.
- Functional requirements.
- Non-functional requirements when relevant.
- Explicit scope boundaries.
- Acceptance criteria.
- Dependencies and assumptions.
- Unresolved questions that block planning.

## Output Contract

Return:

- `stage_result`: Path and summary of the generated Spec Kit `spec.md` and requirements checklist.
- `open_questions`: Remaining questions that block planning or change acceptance criteria.
- `risks`: Ambiguities, missing dependencies, or requirement conflicts.
- `next_stage_input`: Active feature directory and spec summary ready for `solution-research-design`.

Do not proceed to technical design if core behavior or acceptance criteria remain unresolved.

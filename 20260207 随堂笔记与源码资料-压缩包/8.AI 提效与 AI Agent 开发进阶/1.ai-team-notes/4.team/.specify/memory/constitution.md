<!--
Sync Impact Report
Version change: template -> 1.0.0
Modified principles:
- Template principle 1 -> I. Spec-First Delivery
- Template principle 2 -> II. React 19 + Vite Frontend Baseline
- Template principle 3 -> III. Quality Gates Are Required
- Template principle 4 -> IV. Simple, Scoped Implementation
- Template principle 5 -> V. Human Gates for UI and Commit
Added sections:
- Engineering Constraints
- Delivery Workflow
Removed sections:
- Template placeholder sections
Templates requiring updates:
- ✅ .specify/templates/plan-template.md reviewed; existing Constitution Check is sufficient
- ✅ .specify/templates/spec-template.md reviewed; existing requirement structure is sufficient
- ✅ .specify/templates/tasks-template.md reviewed; existing task structure is sufficient
Follow-up items: none
-->

# React Vite Frontend Constitution

## Core Principles

### I. Spec-First Delivery

Every feature MUST start from Spec Kit artifacts before implementation. The active
`spec.md`, `plan.md`, `quickstart.md`, and `tasks.md` are the source of truth for
scope, behavior, validation, and execution order. Code changes that materially
deviate from those artifacts MUST update the relevant Spec Kit artifact first.

### II. React 19 + Vite Frontend Baseline

Frontend implementation MUST use React 19, Vite, TypeScript, and TailwindCSS unless
the feature plan explicitly justifies an alternative. Components MUST be function
components, Hooks MUST use the `use` prefix, and UI styling SHOULD prefer Tailwind
utility classes over one-off global CSS.

### III. Quality Gates Are Required

Each implemented feature MUST define and run appropriate checks before handoff.
For this project, quality gates include build/type validation, ESLint, Prettier
style checks, cspell spelling checks, and behavior tests when the feature changes
logic or user-visible workflows. Failed checks MUST be fixed or reported as
blocking risks before the feature is considered complete.

### IV. Simple, Scoped Implementation

Implementation MUST follow KISS, YAGNI, DRY, and SOLID. Add abstractions only when
they remove real duplication or isolate a concrete responsibility. New dependencies,
directory layers, or future-facing extension points MUST be justified by the
current feature plan.

### V. Human Gates for UI and Commit

UI design decisions MUST be confirmed by a human before UI implementation starts.
Git commit creation MUST also require explicit human confirmation. Passing tests
does not authorize automatic commits, branch operations, pushes, resets, or other
history-changing commands.

## Engineering Constraints

The project MUST preserve the conventions in `AGENTS.md`. Code comments MUST match
the language style already present in the edited file. The implementation MUST avoid
calling production APIs or sending sensitive data unless the user explicitly approves
that operation.

## Delivery Workflow

Delivery MUST follow this order unless the user narrows scope explicitly:

1. Requirement review.
2. Requirement breakdown with `$speckit-specify` and optional `$speckit-clarify`.
3. Solution design with `$speckit-plan`.
4. UI design gate and human confirmation.
5. Test case generation with `$speckit-checklist` where useful.
6. Task generation and implementation with `$speckit-tasks`, `$speckit-analyze`,
   and `$speckit-implement`.
7. Code review verification.
8. Test execution.
9. Git commit proposal with explicit confirmation gate.

## Governance

This constitution supersedes ad hoc implementation preferences for this project.
Amendments require updating this file, explaining the version bump, and checking
dependent Spec Kit templates for alignment. Version changes follow semantic
versioning: MAJOR for incompatible governance changes, MINOR for new or materially
expanded principles, and PATCH for clarifications.

**Version**: 1.0.0 | **Ratified**: 2026-06-06 | **Last Amended**: 2026-06-06

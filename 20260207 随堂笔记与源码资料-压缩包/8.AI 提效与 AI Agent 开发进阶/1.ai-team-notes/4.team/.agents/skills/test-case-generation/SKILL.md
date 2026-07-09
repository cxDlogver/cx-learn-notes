---
name: test-case-generation
description: Generate test cases from specs, designs, and UI decisions. Use when Codex needs 测试用例生成, test matrix, unit tests, integration tests, E2E scenarios, visual checks, quality gates, or Spec Kit checklist outputs.
---

# Test Case Generation

## Workflow

1. Read Spec Kit `spec.md`, `plan.md`, `quickstart.md`, and the confirmed UI plan when available.
2. Identify behavior that must be proven, not implementation details that can change safely.
3. Map each acceptance criterion to at least one verification method.
4. Use `$speckit-checklist` for requirement and quality checklist generation when useful.
5. Include negative, boundary, loading, error, authorization, and regression scenarios when relevant.
6. Keep the test plan proportional to risk and blast radius.

## Test Categories

Use only categories that apply:

- Unit tests for isolated logic.
- Component tests for UI behavior and state.
- Integration tests for module/API/data flow boundaries.
- E2E tests for critical user journeys.
- Visual/responsive checks for UI-heavy changes.
- Static checks for lint, format, spelling, type, and build quality.

## Output Contract

Return:

- `stage_result`: Spec Kit checklist/test matrix with scenario, purpose, setup, action, expected result, and priority.
- `open_questions`: Missing behavior or environment details that block useful tests.
- `risks`: Untested behavior, hard-to-automate checks, flaky areas, or environment dependencies.
- `next_stage_input`: Implementation-ready test expectations for `fullstack-implementation`.

Do not create excessive low-value tests for behavior already covered by existing stable checks.

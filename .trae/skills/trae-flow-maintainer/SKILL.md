---
name: trae-flow-maintainer
description: "Use when changing the `.trae` delivery framework itself: creating or modifying skills, commands, agents, gates, handoffs, role boundaries, regression rules, or workflow architecture after finding process errors, missing rules, obsolete logic, or over-restrictive behavior."
---

# Trae Flow Maintainer

## Purpose

Maintain the `.trae` delivery framework as a coherent state machine. Use this skill to change process rules without breaking command / skill / agent boundaries, phase gates, artifacts, or downstream execution.

## Core Model

Treat the framework as four layers:

| Layer | Owns | Typical files |
|---|---|---|
| Command | User entry, precheck, routing, final Gate Review | `commands/delivery:*.md` |
| Skill | Stage rules, required inputs, outputs, gates, stop conditions | `skills/*/SKILL.md` |
| Agent | Bounded execution role; no stage ownership | `agents/*.md` |
| Global contract | Cross-stage invariants and role map | `AGENTS.md`, `docs/*` |

Do not blur these roles. If a rule tells the system when a stage may start or pass, it belongs in the command / skill / global gate. If it tells a subagent how to perform a delegated slice, it belongs in an agent. If it changes a phase contract, update all affected layers.

## Workflow

1. Classify the user's requested change.
   - Role split problem: command / skill / agent ownership is wrong.
   - Gate problem: a phase can pass too early, blocks too often, or misses a blocker.
   - Handoff problem: verify/design/mock/code repair does not return to the right case or task.
   - Input strictness problem: task packets are rejected because field names are too rigid.
   - Legacy logic problem: obsolete names, compatibility paths, or old dispatch constants remain.
   - Coverage problem: plan / task / test / code / verify / design facts can drift.
2. Read the minimum full source set for that class:
   - Always read `AGENTS.md` relevant section, the target command, the target skill, and any directly named agent.
   - For cross-stage changes, also read upstream and downstream commands / skills.
   - For renamed roles, grep every old and new identifier across `AGENTS.md`, `commands/`, `skills/`, `agents/`, and `docs/`.
3. Decide the source of truth before editing.
   - Stage orchestration: command + stage skill.
   - Code writing: `code-writer`.
   - Code stage rules: `code-implementation`.
   - Task materialization: `task-planning` + `task-planner`.
   - Test case rules: `test-case-planning`.
   - Mock runtime: `/delivery:mock` + mock generator; main Agent owns browser / BAM mutation.
   - Design checking: `design-checker`; code rework goes to `code-writer`.
4. Patch narrowly, then propagate consistency.
   - Update the authoritative source first.
   - Mirror only the necessary precheck, Gate, and handoff wording in commands and `AGENTS.md`.
   - Update affected agents only for execution-role behavior.
   - Update docs only when they describe the changed framework contract.
5. Run a scenario simulation before finalizing.
   - Pick one realistic delivery scenario that would exercise the changed rule.
   - Walk the scenario through command -> skill -> agent -> artifact -> Gate.
   - Check whether the change reduces ambiguity without adding unnecessary handoffs.
   - Check communication cost: high-context browser/case judgment should stay with the main Agent unless the helper only returns mechanical evidence.
   - Record the simulation result in the final response or the changed artifact when the artifact has a review section.
6. Verify with searches and format checks.

## Architecture Rules

- A skill is not an agent. Do not dispatch work to a skill name.
- An agent is not a stage owner. Do not let an agent own phase routing, state transitions, cross-case queues, or final Gate Review.
- The main Agent owns state, browser/session continuity, mock detours, BAM patching, independent review dispatch, and final phase decisions.
- `code-writer` is the only code-writing agent. Do not reintroduce the removed legacy code implementation agent as an agent or dispatch target.
- `code-implementation` is the `/delivery:code` skill and rule source; it may define how to dispatch `code-writer`, but it is not the dispatched code executor.
- `/delivery:task` may detect plan drift and return `/delivery:plan`; it must not silently rewrite plan facts in `delivery-task.md` or `09-test-case-matrix.md`.
- `/delivery:mock` is the primary mock runtime entry for `MOCK_PREVIEW`, and it may also be used in `verify` / `design` for a concrete case-only `SAMPLE_COVERAGE_GAP` supplemental evidence detour when the real backend contract is already clear. That detour must not replace real request / response contract verification.

## Input Strictness Policy

Prefer semantic completeness over fixed field names:

- Required for bounded execution: goal, source evidence, executable scope, expected behavior, and verification / review point.
- Optional unless needed for safety: exact field names, explicit forbidden scope, explicit stop condition labels, exact mock boundary field.
- If a file path is unavailable but page, component, stack, selector, case, or code locator is enough to find the target safely, allow targeted discovery and require the agent to report how it localized the code.
- Stop only when the missing information prevents safe scope, expected behavior, or verification.

## Change Patterns

### Rename or Replace a Role

1. Identify old identifiers and compatibility constants.
2. Decide whether compatibility should be removed or translated.
3. Update command / skill / agent / docs references together.
4. Delete obsolete agent files if the role no longer exists.
5. Verify no old dispatch path remains.

Recommended checks:

```bash
rg -n 'old-role|OLD_CONSTANT|agents/old-role' AGENTS.md commands skills agents docs
rg -n 'new-role|new-skill' AGENTS.md commands skills agents docs
git diff --check
```

### Add or Tighten a Gate

1. Put the rule in the stage skill.
2. Add command precheck / Gate wording only if it affects stage entry or final pass.
3. Add `AGENTS.md` wording only if the invariant crosses stages.
4. Add the required output fields or audit rows to the relevant artifact template.
5. State the recovery route: continue, retry current case/task, call `/delivery:mock`, return `/delivery:task`, return `/delivery:plan`, or pause.

### Relax an Over-Strict Rule

1. Identify what safety property the old strictness protected.
2. Replace fixed schema requirements with semantic requirements.
3. Keep stop conditions for ambiguous goal, missing evidence, unsafe scope, or unverifiable result.
4. Update the executing agent and the upstream packet generator together.

### Fix Plan / Task / Test Drift

1. Keep `prd-source.md`, user decisions, and confirmed Figma evidence as source facts.
2. Let task/test stages detect drift and write findings.
3. Route factual conflicts back to `/delivery:plan`.
4. Do not let test cases “correct” plan by inventing a conflicting truth.

### Change an Agent Responsibility

1. Simulate a concrete case before changing the role. Example: code save -> HMR -> verify case -> design screenshot -> mock detour.
2. Split high-context judgment from mechanical execution.
   - Main Agent owns active case, browser interpretation, mock detour decisions, phase closure, and Gate Review.
   - Helper agents may run commands, summarize logs, start or inspect runtime, or collect explicit mechanical evidence.
3. If a proposed helper would require the main Agent to send full case context and then reinterpret a large evidence payload, prefer keeping that action in the main Agent.
4. Rename the agent only when the new responsibility is materially different; otherwise adjust description and invocation boundaries.

## Required Review Checklist

Before finishing any framework change, check:

- Commands still point to the correct skill and agent.
- Skills define rules, not agent identities pretending to be rules.
- Agents only describe delegated execution behavior.
- Upstream artifacts feed downstream artifacts without circular ownership.
- A realistic scenario simulation was performed, and the proposed handoffs are efficient enough for that scenario.
- Mock behavior is `N/A` outside `MOCK_PREVIEW`, except the narrow `verify` / `design` `SAMPLE_COVERAGE_GAP` supplemental evidence path. That exception must stay supplemental-only and must not mask `API_ISSUE` / `DATA_CONTRACT_MISMATCH`.
- Verify/design/code repair returns to the same active case or bounded task.
- New rules are not stricter than needed for safety.
- Old identifiers, constants, and deleted files are not referenced.

Use these checks when relevant:

```bash
rg -n 'code[-]implementer|DISPATCH_CODE[_]IMPLEMENTER|agents/code[-]implementer' .
rg -n '<new-term>|<old-term>' AGENTS.md commands skills agents docs
git diff --check
```

If the change alters a live delivery phase, recommend or run the matching flow regression:

```text
/delivery:regress --stage <prd|bam|plan|mock|task|code|verify|design> --issue "<problem>" --expected "<expected behavior>"
```

## Output

When reporting the change, include:

- Changed source of truth.
- Propagated files.
- Any intentionally removed compatibility path.
- Verification commands and result.
- Remaining risk, especially if no flow regression was run.

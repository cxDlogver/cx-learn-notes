---
name: "delivery-stage-rewind"
description: "Use when delivery artifacts or DELIVERY_STATE must be rewound to an earlier phase for clean replay, regression, or process-rule validation."
---

# Delivery Stage Rewind

## Overview

This skill creates a clean replay point for the delivery workflow without deleting audit history. It snapshots current artifacts, removes stale downstream outputs from the active workspace, and rewrites `.trae/DELIVERY_STATE.md` to the requested phase.

## When to Use

Use this when:

- A delivery skill, agent, or command was fixed and the phase must be rerun from a clean state.
- Existing artifacts are polluted by an old process rule and would make regression unreliable.
- The user asks to rewind, reset, replay, restore to `/delivery:prd`, or validate from a clean environment.

Do not use this to discard business code changes. This skill only touches `.trae` workflow files and the active artifacts workspace.

Do not use this skill for automatic Mock rework discovered during `/delivery:code`, `/delivery:verify`, or `/delivery:design`. Those cases must call `/delivery:mock`, repair Mock in a targeted detour, review BAM mock, and resume the originating stage. A full rewind to `mock` is only for explicit clean replay or process regression.

## Supported Target

Current implementation supports:

```text
/delivery:rewind prd
/delivery:rewind bam
/delivery:rewind plan
/delivery:rewind mock
/delivery:rewind task
/delivery:rewind --to prd
/delivery:rewind --to bam
/delivery:rewind --to plan
/delivery:rewind --to mock
/delivery:rewind --to task
```

Target semantics:

- `prd`: rewind to before PRD; preserve only pre-PRD inputs; next command is `/delivery:prd`.
- `bam`: rewind to before BAM; preserve pre-PRD inputs and PRD-stage artifacts, clear BAM-stage and downstream outputs; next command is `/delivery:bam`.
- `plan`: rewind to before Plan; preserve pre-PRD inputs and PRD-stage artifacts; next command is `/delivery:plan`.
- `mock`: rewind to before Mock; preserve PRD/BAM/Plan artifacts, clear BAM mock and downstream outputs; next command is `/delivery:mock`.
- `task`: rewind to before Task; preserve PRD/BAM/Plan artifacts and optional Mock artifacts if they already exist, clear task and downstream outputs; next command is `/delivery:task`.

The script intentionally rejects unsupported targets until their preservation rules are explicitly defined.

## Mandatory Precheck

Before executing the script, read:

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- `.trae/commands/delivery/prd.md`
- `.trae/commands/delivery/bam.md` when the target is `bam`
- `.trae/commands/delivery/plan.md` when the target is `plan`
- `.trae/commands/delivery/mock.md` when the target is `mock`
- `.trae/commands/delivery/task.md` when the target is `task`
- `.trae/scripts/delivery_stage_rewind.sh`

Confirm:

- `.trae/.git` exists and must be preserved.
- `DELIVERY_STATE.md` has a valid `workspace` path.
- The workspace contains `prd-source.md` and `00-inputs.md`.
- For target `bam`, `plan`, `mock`, or `task`, the workspace also contains `03-prd-analysis.md`, `uncertainty-register.md`, `ui-source-map.md`, and `decision-log.md`.
- For target `mock` or `task`, the workspace also contains `04-tech-plan.md`.
- For target `task` in `MOCK_PREVIEW`, existing `delivery-mock.md`, `mock/rule-map.json`, and per-interface `manifest.json` files are preserved if present, but they are not required because `/delivery:task` now generates the mock-preview contract before `/delivery:mock`.
- If target `plan` is requested and those PRD-stage artifacts are missing from the active workspace, the script must try to recover them from the most recent usable rewind snapshot for the same workspace before failing.

## Execution

Run:

```bash
.trae/scripts/delivery_stage_rewind.sh <prd|bam|plan|mock|task>
```

Use dry run first when the user asks to inspect the action:

```bash
.trae/scripts/delivery_stage_rewind.sh --to <prd|bam|plan|mock|task> --dry-run
```

## Rewind Contract

For `--to prd`, the active workspace must keep only pre-PRD inputs:

- `prd-source.md`
- `00-inputs.md`
- `01-intake.md`
- `02-task-space.md`
- `meego-summary.md`
- `repo-routing.md`
- `tech-doc-raw.md`
- `prd-source/`
- `prd-source.assets/`
- `tech-doc-raw/`
- `tech-doc-raw.assets/`
- `stage1-source-supplement.md`

For `--to bam`, the active workspace must keep the pre-PRD inputs plus PRD-stage outputs:

- `03-prd-analysis.md`
- `uncertainty-register.md`
- `ui-source-map.md`
- `decision-log.md`
- `figma-evidence-pack.md`
- `prd-figma-supplement.md`
- `figma-cache/`
- `supplement-sources/`

The active workspace must not keep:

- `bam/bam-sync-report.md`
- `bam/bam-method-metadata.json`
- old BAM update summaries
- Plan, code, verify, design, accept, and regression outputs

For `--to plan`, the active workspace must keep the pre-PRD inputs plus PRD-stage and BAM-stage outputs:

- `03-prd-analysis.md`
- `uncertainty-register.md`
- `ui-source-map.md`
- `decision-log.md`
- `figma-evidence-pack.md`
- `prd-figma-supplement.md`
- `figma-cache/`
- `supplement-sources/`
- `bam/`（若回退目标是 `plan` 且需要保留 BAM 证据）

For `--to mock`, the active workspace must keep all `--to plan` preserved files plus:

- `04-tech-plan.md`

The active workspace must not keep:

- `delivery-mock.md`
- `mock/`
- `delivery-task.md`
- `09-test-case-matrix.md`
- code, verify, design, accept, and regression outputs

For `--to task`, the active workspace must keep all `--to mock` preserved files plus the following optional artifacts if they exist:

- `delivery-mock.md`
- `mock/`

The active workspace must not keep:

- `09-test-case-matrix.md`
- `delivery-task.md`
- code, verify, design, accept, and regression outputs

### Snapshot Recovery For `plan`

When active workspace has already been rewound to before PRD, `/delivery:rewind plan` may still be valid if a recent snapshot contains completed PRD artifacts.

Recovery rules:

- Search `artifacts/_rewind-snapshots/<workspace-name>/` by timestamp descending.
- Candidate sources are each snapshot's `full-workspace/` and `stale-artifacts/`.
- A candidate is usable only if it contains all missing PRD core artifacts required for `plan`.
- Restore only the PRD-stage artifacts listed in the `--to plan` preserve set.
- Do not restore stale Plan, code, verify, design, accept, flow-regression, or unrelated scratch files.
- Record `recovered_from` and recovered file names in `rewind-log.md`.

All other active workspace files are moved into:

```text
artifacts/_rewind-snapshots/<workspace-name>/<timestamp>-to-<target>/stale-artifacts/
```

The entire pre-rewind workspace is also copied to:

```text
artifacts/_rewind-snapshots/<workspace-name>/<timestamp>-to-<target>/full-workspace/
```

## State Contract

After successful rewind to `prd`:

- `current_phase` becomes `prd`.
- `current_command` becomes `/delivery:prd`.
- `Pause State.is_paused` becomes `false`.
- `resume_command` becomes `/delivery:prd`.
- PRD phase becomes `PENDING`.
- Plan, code, verify, design, and accept phases become `STALE`.
- `.trae/.git` must remain untouched.

After successful rewind to `bam`:

- `current_phase` becomes `bam`.
- `current_command` becomes `/delivery:bam`.
- `Pause State.is_paused` becomes `false`.
- `resume_command` becomes `/delivery:bam`.
- PRD phase remains `DONE`.
- BAM-stage outputs are removed from the active workspace and moved to `stale-artifacts`.
- Plan, code, verify, design, and accept phases become `STALE`.
- `.trae/.git` must remain untouched.

After successful rewind to `plan`:

- `current_phase` becomes `plan`.
- `current_command` becomes `/delivery:plan`.
- `Pause State.is_paused` becomes `false`.
- `resume_command` becomes `/delivery:plan`.
- PRD phase remains `DONE`.
- Plan phase becomes `PENDING`.

After successful rewind to `mock`:

- `current_phase` becomes `mock`.
- `current_command` becomes `/delivery:mock`.
- `Pause State.is_paused` becomes `false`.
- `resume_command` becomes `/delivery:mock`.
- PRD and Plan phase remain `DONE`.
- Mock outputs are removed from the active workspace and moved to `stale-artifacts`.
- Task, code, verify, design, and accept phases become `STALE`.

After successful rewind to `task`:

- `current_phase` becomes `task`.
- `current_command` becomes `/delivery:task`.
- `Pause State.is_paused` becomes `false`.
- `resume_command` becomes `/delivery:task`.
- PRD, Plan, and Mock phase remain available when applicable.
- Task outputs are removed from the active workspace and moved to `stale-artifacts`.
- Code, verify, design, and accept phases become `STALE`.
- Code, verify, design, and accept phases become `STALE`.
- `.trae/.git` must remain untouched.

The script writes `rewind-log.md` into the active workspace with snapshot paths and moved files.

## Gate

If any of these checks fail, stop and do not run `/delivery:<target>`:

- Snapshot directory was not created.
- `DELIVERY_STATE.md` still points to a different phase than the target.
- `Pause State.is_paused` is still `true`.
- `.trae/.git` is missing.
- Required pre-PRD inputs are missing.

## Output

Final response should include:

- Target phase.
- Workspace path.
- Snapshot path.
- Files preserved.
- Files moved to stale artifacts.
- Next command: `/delivery:<target>`.

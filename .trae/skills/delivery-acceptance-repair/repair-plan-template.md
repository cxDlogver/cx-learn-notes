# Delivery Acceptance Repair Artifact Contract

Use this contract only for `/delivery:repair` artifacts under `artifacts/repair/<workspace-name>/<run-id>/`. Stage execution must use the current ordinary delivery command, skill, agent, and Gate referenced by `rerun-plan.json`; do not copy their behavior into repair artifacts.

## Artifact Layout

```text
artifacts/repair/<workspace-name>/<run-id>/
├── snapshot-ref.json
├── issue-source.md
├── source-manifest.json
├── issue-analysis.md
├── repair-plan.md
├── rerun-plan.json
├── repair-log.md
├── repair-closure.json
└── repair-result.md  # created after Design Gate PASS

artifacts/repair/_snapshots/<workspace-name>/<run-id>/
├── snapshot-manifest.json
├── inventory.sha256
├── DELIVERY_STATE.before-repair.md
├── full-workspace/
└── execution-repo/
```

For a new source identity, the immutable snapshot must exist before the repair run directory or any source cache is created. For a matched identity, reuse the unique existing run/snapshot and validate it before refreshing any artifact. Repair artifacts and snapshots are managed only under `artifacts/repair/`; active workspace snapshots must exclude any top-level legacy `repair/` directory.

## Source Identity Decision Contract

Before any write, resolve wiki links to their real object and use canonical `source_type + source_token` as the identity key. Run `scripts/resolve-repair-run.mjs` against the current workspace:

- `NEW_REPAIR_RUN`: no matching manifest exists; create one new snapshot/run.
- `REUSE_REPAIR_RUN`: exactly one matching run has a READY snapshot; reuse both.
- Matching identity with invalid snapshot, or multiple matching runs: stop and require explicit `--resume <run-id>`; never choose the latest run or create another snapshot.

The preflight is read-only. Full body/media extraction always happens after the snapshot decision and must run again even when the run is reused.

## Snapshot Reference Contract

`snapshot-ref.json`:

```json
{
  "version": 1,
  "status": "READY",
  "run_id": "20260710-120000-generic-feedback",
  "snapshot_root": "artifacts/repair/_snapshots/example-task/20260710-120000-generic-feedback",
  "manifest": "artifacts/repair/_snapshots/example-task/20260710-120000-generic-feedback/snapshot-manifest.json"
}
```

Rules:

- `run_id` must equal the repair run directory basename.
- `snapshot_root` must be exactly `artifacts/repair/_snapshots/<workspace-name>/<run-id>`.
- The referenced manifest must be `READY` and match the active workspace and run id.
- Snapshot paths must not escape through symlinks.

## Source Manifest Contract

`source-manifest.json` must contain:

```json
{
  "version": 1,
  "run_id": "20260710-120000-generic-feedback",
  "snapshot_run_id": "20260710-120000-generic-feedback",
  "snapshot_created_at": "2026-07-10T04:00:00Z",
  "source_url": "...",
  "source_type": "docx|sheet",
  "source_token": "...",
  "identity_resolution": {
    "checked": true,
    "key": "docx:canonical-token",
    "snapshot_decision": "CREATED|REUSED",
    "matched_run_id": null
  },
  "title": "...",
  "extracted_at": "2026-07-10T04:01:00Z",
  "content_digest": "sha256:<64-hex>",
  "complete": true,
  "transport": "mcp|feishu-lark",
  "refresh": {
    "checked": true,
    "previous_extracted_at": null,
    "current_extracted_at": "2026-07-10T04:01:00Z",
    "content_changed": false,
    "comparison_basis": ["normalized_body", "media_token_manifest"],
    "change_summary": ["full source refresh completed"]
  },
  "sheets": [],
  "raw_files": [],
  "media_files": [],
  "visual_evidence_inventory": [],
  "validation": { "status": "PASS", "details": [] }
}
```

- `identity_resolution.key` must equal `<source_type>:<source_token>`.
- `CREATED` requires `matched_run_id=null`; `REUSED` requires `matched_run_id=run_id`.
- `refresh.checked` must be true on every invocation. Reuse must retain the previous timestamp and compare fully refreshed body/media with the previous manifest; it may not reuse old analysis as current evidence.
- `extracted_at` and `refresh.current_extracted_at` must not be earlier than the immutable snapshot `created_at`. Visual evidence uses `ANALYZED|NOT_RELEVANT|BLOCKED`; any `BLOCKED` item prevents Analysis Gate PASS.

## Repair Plan Contract

`repair-plan.md` must be rendered from this skeleton:

```md
# <run-id> Repair Plan

- Snapshot Gate: PASS
- Snapshot Decision: CREATED / REUSED
- Source Identity: `<source_type>:<source_token>`
- Snapshot Ref: `snapshot-ref.json`
- Goal: <repair goal>
- Authoritative Evidence: <current issue source>
- Selected Replay Start: <init|prd|plan|task>
- Planning Method: delivery-acceptance-repair

## Issue Repair Matrix
| issue_id | source_ref | root_stage | rerun_from | current_deviation | task_change | test_case_change | status |

## Planned In-Place Changes
| change_id | issue_id | operation | stage | target_type | target | original_location | before | after | evidence_refs | verification |

## Requirement / Target Trace
| requirement_id | target_id | task_label | case_id | code_ref | expected_evidence |

## Stage Replay Plan
| stage | command_ref | skill_refs | owner | required_agent | gate |

## Unresolved Items
None
```

Rules:

- Every accepted issue must have an observed current deviation and at least one `ADD|UPDATE|DELETE`; `NO_CHANGE` is forbidden.
- Every issue must plan both a `TASK` change and a `TEST_CASE` change at their original artifact locations.
- Addendum/Override-only plans and parallel task/case tables are invalid.

## Rerun Plan Contract

`rerun-plan.json`:

```json
{
  "version": 2,
  "repair_run_id": "20260710-120000-generic-feedback",
  "inferred_start": "prd|plan|task",
  "forced_start": null,
  "normalized_forced_start": null,
  "selected_start": "init|prd|plan|task",
  "implementation_mode": "REAL_INTEGRATION|MOCK_PREVIEW",
  "must_rerun": ["task", "code", "verify", "design"],
  "issues": [
    {
      "issue_id": "REPAIR-001",
      "analysis_status": "CONFIRMED|TARGETED_ANALYSIS|UNRESOLVED",
      "root_stage": "PRD_CONFLICT|PRD_MISSING|PLAN_GAP|DESIGN_GAP|TASK_GAP|TEST_CASE_GAP|MOCK_RULE_GAP|CODE_ISSUE|VERIFY_MISSING|ENV_OR_DATA|UNRESOLVED",
      "rerun_from": "prd|plan|task",
      "source_ref": "问题来源稳定定位",
      "evidence_refs": ["source/media/example.png"],
      "facts": ["current evidence fact"],
      "unknowns": [],
      "current_deviation": {
        "status": "MISSING|EXTRA|INCORRECT",
        "artifact_refs": ["delivery-task.md#Task-1"],
        "summary": "observed deviation"
      },
      "affected_artifacts": ["delivery-task.md", "09-test-case-matrix.md"],
      "required_items": [
        {
          "requirement_id": "REQ-001",
          "statement": "independently acceptable behavior",
          "acceptance_targets": [
            { "target_id": "TARGET-A", "description": "target A" }
          ]
        }
      ],
      "planned_changes": [
        {
          "change_id": "CHANGE-TASK-001",
          "operation": "UPDATE",
          "stage": "task",
          "target_type": "TASK",
          "target": "Task label",
          "original_location": "delivery-task.md#Task-1",
          "before": "old checkbox contract",
          "after": "updated unchecked checkbox contract",
          "requirement_id": "REQ-001",
          "target_ids": ["TARGET-A"],
          "evidence_refs": ["issue-analysis.md#REPAIR-001"],
          "verification": "Task Coverage Audit PASS"
        },
        {
          "change_id": "CHANGE-CASE-001",
          "operation": "UPDATE",
          "stage": "task",
          "target_type": "TEST_CASE",
          "target": "CASE-A",
          "original_location": "09-test-case-matrix.md#CASE-A",
          "before": "old assertion",
          "after": "updated positive/negative/evidence contract",
          "requirement_id": "REQ-001",
          "target_ids": ["TARGET-A"],
          "evidence_refs": ["issue-analysis.md#REPAIR-001"],
          "verification": "Coverage Result PASS"
        }
      ],
      "alignment": {
        "comparison_mode": "EXACT_SET|ORDERED_EXACT|SUBSET|BEHAVIORAL|INVESTIGATE",
        "required_items": [],
        "forbidden_items": [],
        "missing_items": [],
        "extra_items": [],
        "incorrect_items": [],
        "actions": [],
        "test_contract": {
          "positive_assertions": [{ "target": "TARGET-A", "assertion": "observable positive fact" }],
          "negative_assertions": [{ "target": "TARGET-A", "assertion": "forbidden fact is absent" }],
          "aggregate_assertion": "complete expected behavior"
        }
      },
      "task_change": true,
      "test_case_change": true,
      "bam_update_required": false,
      "bam_impact_refs": [],
      "mock_rule_change": "NO|YES|REVIEW"
    }
  ],
  "stages": [
    {
      "stage": "task",
      "required": true,
      "command_ref": ".trae/commands/delivery:task.md",
      "skill_refs": [
        ".trae/skills/09-task-planning/SKILL.md",
        ".trae/skills/10-test-case-planning/SKILL.md"
      ],
      "owner": "subagent-assisted",
      "required_agent": "task-planner",
      "helper_agents": []
    },
    {
      "stage": "code",
      "required": true,
      "command_ref": ".trae/commands/delivery:code.md",
      "skill_refs": [".trae/skills/05-code-implementation/SKILL.md"],
      "owner": "subagent-assisted",
      "required_agent": "code-writer",
      "helper_agents": ["runtime-runner"]
    },
    {
      "stage": "verify",
      "required": true,
      "command_ref": ".trae/commands/delivery:verify.md",
      "skill_refs": [".trae/skills/06-debug-verification/SKILL.md"],
      "owner": "main-agent",
      "required_agent": null,
      "helper_agents": ["runtime-runner"]
    }
  ]
}
```

Stage reference rules:

- `prd`: `delivery:prd` + `03-prd-analysis`, agent `prd-analyzer`.
- `bam`: `delivery:bam` + current BAM skill, main Agent.
- `plan`: `delivery:plan` + `04-tech-planning`, agent `tech-planner`.
- `task`: `delivery:task` + both task/test planning skills, agent `task-planner`.
- `code`: `delivery:code` + `05-code-implementation`, agent `code-writer`.
- `verify`: `delivery:verify` + `06-debug-verification`, main Agent; only optional `runtime-runner` helper.
- `design`: `delivery:design` + `07-design-alignment`, agent `design-checker`.

`task`, `code`, `verify`, and `design` are always required and ordered. Repair does not call `/delivery:accept`. After Design Gate PASS, create `repair-result.md`, write the result back to the linked Feishu source, then commit the execution repo. `--code` is recorded as `forced_start=code` but normalized to `task`. BAM changes insert `bam` before `plan` and require `selected_start` no later than `plan`.

## Repair Log Contract

`repair-log.md` must contain:

```md
# Repair Log

## Artifact Change Ledger
| seq | stage | issue_ids | artifact | operation | original_location | before | after | evidence_refs | impact |

## Stage Handoff

### Stage: analysis
- owner: main-agent
- status: PASS
- command_ref: validator --stage analysis
- skill_refs: delivery-acceptance-repair
- executor_agent: null
- main_agent_gate_decision: PASS
- reviewed_evidence_refs: snapshot-ref.json, issue-analysis.md, rerun-plan.json
```

Each executed ordinary stage records its live `command_ref`, `skill_refs`, agent/helper use, actual changed files, stage Gate and main-Agent decision. A stage may record `NO_ARTIFACT_CHANGE` only when that stage is legitimately evidence-only; an accepted issue itself may never close as `NO_CHANGE`.

## Repair Closure Contract

`repair-closure.json`:

```json
{
  "version": 2,
  "repair_run_id": "20260710-120000-generic-feedback",
  "active_workspace": "artifacts/example-task",
  "active_execution_repo": "/absolute/execution/repo",
  "issues": [
    {
      "issue_id": "REPAIR-001",
      "target_closures": [
        {
          "requirement_id": "REQ-001",
          "target_id": "TARGET-A",
          "task_refs": [
            { "path": "delivery-task.md", "label": "updated target step", "change": "ADD|UPDATE", "status": "PENDING|DONE" }
          ],
          "case_refs": [
            { "path": "09-test-case-matrix.md", "case_id": "CASE-A", "change": "ADD|UPDATE", "verification_stage": "verify|design|verify+design", "status": "PENDING|PASS|PASS_WITH_NOTES|FAIL", "evidence_refs": [] }
          ],
          "code_refs": [],
          "status": "NOT_SATISFIED|SATISFIED"
        }
      ]
    }
  ],
  "overall_status": "NOT_STARTED|IN_PROGRESS|PASS|PASS_WITH_NOTES|PARTIAL|FAIL",
  "notes": [],
  "inputs": [],
  "repair_result": {
    "path": "repair-result.md",
    "feishu_writeback_status": "PENDING|WRITTEN|BLOCKED",
    "feishu_writeback_ref": "",
    "completion_commit": null
  }
}
```

Task stage must materialize every `task_ref` and `case_ref` in the existing workspace. Code may mark task status `DONE` only after the current Code Gate passes. Repair-result may mark a target `SATISFIED` only when its task, case, applicable code, verify/design evidence, freshness inputs, Feishu writeback, and completion commit all close.

## Repair Result Contract

`repair-result.md` is created only after Design Gate PASS:

```md
# Repair Result

## Issue Resolution Alignment
| issue_id | requirement_id | target_id | 问题 | 调整 | 解决结果 | 验收步骤 | result |
| REPAIR-001 | REQ-001 | TARGET-A | <source issue fact> | <in-place correction> | <user-visible final state> | 验收入口业务页：<manual verification URL>。前置条件：<runtime/login/mock readiness>。步骤：1. 打开业务页。2. 输入 <exact data or mock-returned data>。3. 点击 <exact control> 并等待 <state/request>。4. 确认 <expected result>。验收点：<positive and negative assertions>. | SATISFIED |

## Feishu Writeback
- Feishu Writeback: PASS
- Source: <original Feishu issue URL>
- Evidence Type: SCREENSHOT|ACCEPTANCE_STEPS
- Evidence: <screenshot reference or executable manual acceptance steps written into the Feishu source; not local artifact/log paths>

## Completion Commit
- Completion Commit: `<40-char execution repo HEAD sha>`
```

Rules:

- Every target closure must have one alignment row with the same issue / requirement / target IDs.
- The alignment table must map to the original issue source one problem per row and include the user-facing columns `问题 | 调整 | 解决结果 | 验收步骤`.
- Every `验收步骤` cell must be one executable manual acceptance process. The process text must include the business page URL or link to open, preconditions, exact input or mock-returned data needed by the steps, concrete UI interactions, expected result, and acceptance points.
- Feishu writeback must target the original issue source link and summarize the same resolution recorded locally.
- Feishu writeback evidence must be screenshots or executable manual acceptance steps. Local artifact paths, local log paths, markdown file paths, source-code paths, or `artifacts/**` / `verify-logs/**` references may appear only as internal evidence outside the Feishu writeback evidence.
- The completion commit is the only repair completion marker; it must be the current HEAD of `active_execution_repo`.

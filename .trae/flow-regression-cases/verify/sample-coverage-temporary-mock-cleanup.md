# Flow Regression Case

## Case ID

sample-coverage-temporary-mock-cleanup

## Target Stage

verify

## Original Issue

`/delivery:verify` 在 `REAL_READY_LIMITED` / 非 `MOCK_PREVIEW` 场景中遇到真实样本缺口时，把 `SAMPLE_COVERAGE_GAP` 解释得过窄：只有“真实 contract 已由真实证据完全关闭”才允许 `/delivery:mock`。这会阻止用临时 BAM mock 构造状态样本来验证 hover、状态和 UI 分支，即使接口字段、schema、generated types 和代码消费链路已经明确。

## Expected Behavior

当基础真实链路或接口合同已明确，且当前失败只因为缺少状态样本时，verify / design 可以对单个 active case 进入 `/delivery:mock`，生成临时 `Sample Coverage Mock`。该 mock 只能补充 `SUPPLEMENTAL_ONLY` 证据，不能替代真实 request / response 合同验证；当前 case 关闭后必须立即 cleanup，删除临时 mock 规则、BAM patch / wrapper patch、manifest active rule、临时 `__mock__` 文件和 debug 参数，并复查移除 debug 参数后页面不依赖临时 mock。

## Changed Process Files

- `AGENTS.md`
- `commands/delivery:verify.md`
- `commands/delivery:mock.md`
- `skills/06-debug-verification/SKILL.md`
- `skills/bam-mock-runtime-generator/SKILL.md`

## Related Tags

- stage: verify
- contracts: SAMPLE_COVERAGE_GAP, Sample Coverage Mock, cleanup
- commands: delivery:verify, delivery:mock
- agents: main-agent
- cost: low
- priority: P1

## Replay Mode

STATIC_ASSERTION

## Minimal Replay Context

- required_artifacts: none
- required_case: static scan of `.trae` process files
- optional_runtime: none

## Assertions

| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | Verify allows non-`MOCK_PREVIEW` `SAMPLE_COVERAGE_GAP` when基础真实链路或接口合同已明确，而不是要求真实状态样本已完全闭合。 | `skills/06-debug-verification/SKILL.md`, `AGENTS.md` | Rules mention `base_contract_evidence` or “基础真实链路或接口合同已明确”. | Rules still require only “真实 contract 已关闭/已闭合” as the trigger. |
| A2 | `/delivery:mock` accepts `base_contract_evidence` and records supplemental-only evidence for sample coverage. | `commands/delivery:mock.md` | Command requires `base_contract_evidence`, `mock_debug_param`, `supplemental_assertions`, and `forbidden_contract_assertions`. | Command requires only `real_contract_evidence` or lacks supplemental-only boundaries. |
| A3 | Temporary mock cleanup is mandatory before moving to the next case or ending the stage. | `AGENTS.md`, `commands/delivery:mock.md`, `skills/06-debug-verification/SKILL.md` | Rules require deleting temporary rules, BAM patch/wrapper patch, manifest active rule, temporary `__mock__`, and removing debug params. | Rules allow leftover sample-gap mock artifacts or defer cleanup to later stages. |
| A4 | Mock generator supports a distinct temporary sample-coverage synthetic rule kind. | `skills/bam-mock-runtime-generator/SKILL.md` | Skill mentions `sample_coverage_synthetic` and `SUPPLEMENTAL_ONLY`. | Skill only supports generic synthetic contract or treats temporary sample mock as real verification. |

## Daily Suite Policy

- include_in_daily: true
- reason: Static assertions are cheap and protect a verify-stage recovery route that prevents unnecessary blockers while preserving cleanup safety.

## Captured Workflow Version

- git_commit: pending
- git_branch: pending
- dirty: true
- rules_hash: pending

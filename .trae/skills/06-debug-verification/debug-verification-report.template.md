# 06 Debug Verification Report Template

## Summary
- Result: PASS / PASS_WITH_NOTES / NEEDS_TARGETED_REVIEW / BLOCKED
- Gate: 进入 /delivery:design / 回到 /delivery:code / /delivery:mock 已恢复 / 暂停提问
- Key Blockers:
- Key Notes:

## Pending Verification Merge Audit
| pending_item_id | task_id / handoff_id | source_ref | mapped_case_ids | matrix_action | execution_status | coverage_result |
|---|---|---|---|---|---|---|

## Verify Case Ledger
| case_id | order | owner | result | evidence | detour | next |
|---|---:|---|---|---|---|---|

## Case Result Index
| case_id | result | case_result_ref |
|---|---|---|

## Runtime Screenshot Evidence Index
| case_id | runtime_state | capture_scope | screenshot_path | verify_screenshot_key | sample_ref | dom_anchor | state_match_hints | design_reuse_note | materialization_type | result |
|---|---|---|---|---|---|---|---|---|---|---|

`screenshot_path` 必须指向当前 artifacts workspace 内真实存在、可读、类型为图片的文件；工具临时路径、聊天内预览图、inline screenshot、不可读路径或不存在路径不得写成可复用截图。写入索引前必须先按 `Screenshot And Runbook Protocol` 的临时目录规范定位截图：若使用 Trae 内置浏览器且 `browser_take_screenshot` 已返回图像预览或已传入 `filename`，必须先检查当前 artifacts workspace 内已记录或约定的截图目录，再按 `$(getconf DARWIN_USER_TEMP_DIR)/trae/screenshots/<filename>` 检索源截图；找到后复制 / 物化到当前 artifacts workspace，再写入 workspace 相对路径。

`materialization_type` 仅允许 `local_file`、`missing`、`not_applicable`；只有 `local_file` 可作为 `/delivery:design` 的可复用 runtime source。

## Environment / Baseline Checks
- execution_repo_root:
- dev_server:
- browser_runtime_mode:
- browser_tool:
- headless:
- browser_profile_or_state:
- network_evidence_level:
- sso_result:
- vmok_url:
- lint:
- typecheck:
- test:
- build:
- mock-debug:
- integration-debug:
- debug_code_check:
- changed_files_check:

## Evidence Index
- Screenshots:
- DOM / Network:
- Mock Hits:
- Integration:

## Failures / Detours
| issue | classification | root cause | action | recheck |
|---|---|---|---|---|

## Case Evidence Coverage Audit

| case_id | evidence_requirement_id | assertion_ref | verification_status | execution_ref | recording_status | evidence_type | evidence_ref | coverage_result |
|---|---|---|---|---|---|---|---|---|

`evidence_ref` 只能引用当前 artifacts workspace 内已持久化、存在、可读、类型匹配的证据文件或文件内锚点；不得引用 browser viewId、snapshot ref、inline screenshot、浏览器历史、不存在路径或业务代码路径。

## Gate Recommendation
<明确下一阶段或暂停原因>

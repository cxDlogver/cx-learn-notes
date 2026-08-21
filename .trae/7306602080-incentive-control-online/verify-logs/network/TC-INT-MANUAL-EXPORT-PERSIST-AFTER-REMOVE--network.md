# TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE Network Boundary

- `case_id`: `TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE`
- `repair_issue_id`: `REPAIR-005`
- `observed_at`: `2026-07-11T05:03:25+08:00`
- `effective_verify_mode`: `MOCK_PREVIEW`
- `api_name`: `apiDownloadContentRemoveRecord`
- `rule_id`: `R-BAM-DOWNLOAD-REMOVE-RECORD`
- `expected_path`: `/api/buyin/admin/content_activity/download_content_remove_record`

## Observation

After natural UI one-click removal, the toolbar remained visible and `导出剔除明细` stayed enabled. Repeated clicks opened the synthetic mock URL:

```text
https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080
```

The integrated browser Network panel did not retain a real `download_content_remove_record` fetch/XHR entry for these clicks.

## Boundary

This absence is expected in the current MOCK_PREVIEW runtime. The generated BAM wrapper for `apiDownloadContentRemoveRecord` can return a marked `BAM_MOCK_SYNTHETIC_CONTRACT` response before a real browser fetch/XHR is sent. Therefore this case records Network evidence as a synthetic BAM contract instead of a real XHR.

Persistent evidence:

- Runtime UI/export evidence: `verify-logs/evidence/TC-INT-MANUAL-EXPORT-PERSIST-AFTER-REMOVE--runtime.json`
- Synthetic request contract: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json`
- Synthetic response contract: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/response.json`
- Generated wrapper source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`

## Request Contract

The persisted synthetic request contains only preserved removed hit records:

| row | author_id | item_id | remove_reason | note |
|---|---|---|---|---|
| 0 | `900001` | `100001` | `手动移除` | 准入失败命中作品 |
| 1 | `900002` | `100002` | `命中【不激励】规则` | 不激励命中作品 |

Negative control:

- Valid current row `100003` / author `900003` remains in the Drawer after removal and must not appear in export records.
- Manual remove/export path does not call `apiCandidateRemove` / `candidate_remove`.

## Result

`PASS_WITH_NOTES` for verify:

- Runtime UI state proves the REPAIR-005 toolbar visibility behavior.
- Repeat export behavior reaches the same synthetic `lark_url` multiple times.
- Real Feishu sheet permission, field completeness, and backend persistence remain real-integration recheck items and are not claimed as passed here.

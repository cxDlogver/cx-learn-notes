# TC-INT-MANUAL-EXPORT Runtime Evidence

- `case_id`: TC-INT-MANUAL-EXPORT
- `captured_at`: 2026-07-08T16:50:29Z
- `browser_tool`: integrated_browser
- `business_view_id`: 4d0d888f-c82d-42ee-abee-63b7eabd8d7e
- `evidence_json`: verify-logs/evidence/TC-INT-MANUAL-EXPORT--runtime.json
- `screenshot`: screenshots/TC-INT-MANUAL-EXPORT--manual-hit--summary-action-before.png

## 前置状态

通过自然 UI 重建人工提报 mixed hit Drawer：

1. reload award page with `externalLeadsDomainMock=1`
2. click `新增提报`
3. input `100001,100002,100003`
4. click `提交`
5. wait until summary and `导出剔除明细` are visible

Observed:

- summary: `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：2个`
- rows visible: `100001`, `100002`, `100003`
- hit labels visible: `不满足准入门槛`, `命中【不激励】规则`
- button visible: `导出剔除明细`

## 自然点击结果

Action: natural browser click on `导出剔除明细`.

Runtime markers captured by page probe:

- `[BAM_MOCK_SYNTHETIC_CONTRACT]`
- `[BAM_MOCK_HIT]`

API:

- `apiName`: `apiDownloadContentRemoveRecord`
- `method`: `POST`
- `path`: `/api/buyin/admin/content_activity/download_content_remove_record`
- `ruleId`: `R-BAM-DOWNLOAD-REMOVE-RECORD`

Request records:

```json
[
  {
    "author_id": "900001",
    "item_id": "100001",
    "item_name": "人工提报准入失败作品",
    "remove_reason": "手动移除"
  },
  {
    "author_id": "900002",
    "item_id": "100002",
    "item_name": "人工提报不激励命中作品",
    "remove_reason": "命中【不激励】规则",
    "penalty_reason": "历史违规命中不激励规则"
  }
]
```

Negative request check:

- `100003` is not present in the export request.
- `records.length` is `2`.
- `operator_id` is not present because the current backend request contract `ContentRemoveRecord` only contains `author_id/item_id/item_name/remove_reason/penalty_reason`;真实 Feishu 表格的操作人来源和字段完整性保留为 real verify 回收项。

Synthetic response:

```json
{
  "st": 0,
  "code": 0,
  "msg": "success",
  "data": {
    "lark_url": "https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080"
  }
}
```

Open behavior:

- Browser tabs after click include tab index `2`, viewId `2c77af8b-9dd1-4fc6-a18d-b894a59abf41`.
- URL: `https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080`
- This equals response `data.lark_url`.

Download side-effect checks:

- page probe `fetches`: `[]`
- page probe `xhrs`: `[]`
- page probe `blockedRealDownloadRequests`: `[]`
- business tab network list after the event only contained monitoring XHRs.
- `$HOME/Downloads` checks after `2026-07-09 00:45:00 +0800` and within the last 120 minutes found no files.

DOM / visual negative checks after event:

- `导出剔除明细失败`: absent
- `下载移除明细`: absent
- `申诉`: absent
- fake award success text: absent
- `导出剔除明细` button remains visible in the same Drawer state.

## 结论边界

Current verify scope: `PASS_WITH_NOTES`.

This closes the frontend MOCK_PREVIEW runtime assertions for request shaping, removable-row filtering, `data.lark_url` open behavior, no local-file creation, and old-copy/appeal absence. It does not prove real Feishu sheet creation, real Lark permission, operator source, final sheet field completeness, or real backend audit/persistence for `download_content_remove_record`.

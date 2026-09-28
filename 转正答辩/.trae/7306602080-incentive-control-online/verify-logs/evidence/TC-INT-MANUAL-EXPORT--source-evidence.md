# TC-INT-MANUAL-EXPORT Source Evidence

## download_content_remove_record request contract

Evidence sources inspected:

- `tech-doc-raw.md`
- `bam/bam-sync-report.md`
- generated IDL under execution repo: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/namespaces/thrift_idls/ecom.buyin.admin_api/content_activity/content_activity.ts`

Relevant contract facts:

```ts
export interface ContentRemoveRecord {
  /** 作者id */
  author_id?: string;
  /** 投稿id */
  item_id?: string;
  /** 投稿名称 */
  item_name?: string;
  /** 移除原因 */
  remove_reason?: string;
  /** 处罚原因 */
  penalty_reason?: string;
}

export interface download_content_remove_record_request {
  /** 移除记录 */
  records?: Array<ContentRemoveRecord>;
}

export interface download_content_remove_record_data {
  /** 明细飞书链接 */
  lark_url?: string;
}
```

`bam/bam-sync-report.md` records the synced interface field list as:

```text
records, author_id, item_id, item_name, remove_reason, penalty_reason, lark_url
```

Interpretation for verify:

- Current frontend request contract can verify export rows and `lark_url` handling.
- Current request contract does not expose `operator_id`.
- PRD requires final exported sheet to contain 操作人; under MOCK_PREVIEW this remains a real verify item for actual Feishu sheet creation/content and backend operator-source filling.

# D2C Evidence Manifest

> task_id: `TASK-005`
> requirement_id: `AR-006, AR-007, AR-008, AR-009, AR-010`
> figma_fileKey: `fNJJ7mEmEMYU5y0tcAZm3X`
> archived_at: `2026-07-08`

## Archived Files

| node_id | file | source_temp_path | sha256 | usage |
|---|---|---|---|---|
| `25:13842` | `25_13842/figma_25_13842_1783501825825.xml` | `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/.d2c_temp/figma_25_13842_1783501825825.xml` | `add04df065baf493393f4b11bb658192a7752bcbd4af97ac2b56a2561a429b33` | parent XML contract only |
| `87:6973` | `87_6973/figma_87_6973_1783501944620.xml` | `.d2c_temp/figma_87_6973_1783501944620.xml` | `272a63272bacce0f04c9ad4554559dd18c34418264351f304b7a7ff1da44d07d` | drawer summary/action/table/footer XML |
| `87:6973` | `87_6973/figma_87_6973_1783501944620.jpg` | `.d2c_temp/figma_87_6973_1783501944620.jpg` | `4eeaf536f0e13d298f71385d9abc603f95a02511be81fc752cfaf62ec2f23df7` | valid visual ground truth |
| `87:7016` | `87_7016/figma_87_7016_1783502075850.xml` | `.d2c_temp/figma_87_7016_1783502075850.xml` | `4ac9597432bb46d086b39f9d6c3f2fa660441f26283fcb59cd52ab082d5f7588` | row status XML |
| `87:7016` | `87_7016/figma_87_7016_1783502075850.jpg` | `.d2c_temp/figma_87_7016_1783502075850.jpg` | `fcb8c0a89d0648610e1b8910fa289e3d37eb2144b9cf271ba05da1ce065de478` | valid visual ground truth |

## Consumed Contract

- Summary text node `87:6998`: `共100个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：5个`.
- Action order: `一键移除` before `导出剔除明细`.
- Row status labels:
  - `不满足准入门槛  命中【不激励】规则`
  - `命中【不激励】规则`
- Footer order: `取消` before `提交并投放`.
- Valid preview images:
  - `87:6973` shows drawer title, submit selector, summary/action, table and footer.
  - `87:7016` shows row-level red hit labels and row remove hot area.

## Excluded Generated Artifact

- The generated preview image for parent node `25:13842` was not archived because previous TASK-005 review marked it mismatched and not valid visual ground truth.
- Parent node `25:13842` XML is retained because it contains the broad structural contract and key text node references.

## Cleanup Status

- `source_temp_path` files are temporary D2C outputs and may be removed by `d2c_cleanup_temp`.
- This directory is the durable Code review evidence archive for TASK-005.

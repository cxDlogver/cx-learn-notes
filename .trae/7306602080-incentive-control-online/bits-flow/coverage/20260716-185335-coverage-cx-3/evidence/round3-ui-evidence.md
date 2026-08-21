# Round 3 真实线上 UI 覆盖证据

## 基本信息

- 覆盖模式: `/delivery:bits --coverage`
- 轮次: 3
- 线上入口: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 页面标题: `内容生态运营｜橙蕉`
- 目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- 目标文件版本: `huatuo:43bb9d69fb04bd15`
- 刷新前文件覆盖率: `77.70%`
- 刷新前 effective uncovered inserted rows: `31`
- 刷新前整体覆盖率: `82.18%`

## UI 操作路径

1. 在真实线上奖励投放页进入 `配置五`。
2. 点击二级页签 `剔除明细`。
3. 页面真实触发只读接口 `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`。
4. 表格展示 6 条真实剔除明细记录，包含 `作品内容`、`剔除发奖时间`、`剔除发奖原因`、`操作人`。

## Read-only 网络证据

- 请求: `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`
- 入参摘要:
  - `activity_id=7629288371705643310`
  - `config_id=7629288371705725230`
  - `page=1`
  - `page_num=20`
- 请求性质: 只读查询，无写接口、无浏览器 mock、无 BAM runtime mock。
- 浏览器 Network 观察: 请求列表中存在该 GET；随后页面触发 `batchGetEaUsers?employeeIds=6068830` 获取操作人展示信息。

## DOM / 表格证据

截图: `evidence/round3-dou-coin-remove-record-table.png`

表格摘要:

```json
{
  "selectedConfig": "配置五",
  "hasRemoveDetailTab": true,
  "hasCoinRemoveRecordTableHeaders": true,
  "rowCountExcludingHeader": 6,
  "observedTextSignals": {
    "hasVideoId": true,
    "hasRemoveTime": true,
    "hasRemoveReason": true,
    "hasOperator": true
  },
  "tableRows": [
    "作品内容 剔除发奖时间 剔除发奖原因 操作人",
    "- - ID: 7641951590119486066 2026/07/06 16:46:52 内容质量不佳 陈相",
    "- - ID: 7641951590119486066 2026/07/04 17:25:34 内容相关性低 陈相",
    "- - ID: 7641631136396987699 2026/07/04 17:14:51 内容相关性低 陈相",
    "- - ID: 7641631136396987699 2026/06/24 21:05:17 内容相关性低 陈相",
    "- - ID: 738100000000001002 2026/06/24 15:57:22 内容相关性低 陈相",
    "- - ID: 738100000000001002 2026/06/24 15:21:04 内容质量不佳 陈相"
  ]
}
```

## 覆盖目标

- `record.item_card?.item_model` 链路读取。
- 空封面时的 `-` fallback 渲染。
- `Tooltip.Auto` 标题 / ID 渲染。
- `remove_reason || '-'` 渲染，本次命中有真实原因。
- `operator_id ? <PeopleCard /> : '-'` 分支，本次命中 `PeopleCard`。

## 待刷新

- 本轮 UI 覆盖已完成，下一步通过 Huatuo browser capture server 刷新 `<cov-run-id>/coverage/`。

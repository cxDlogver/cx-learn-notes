# Coverage Optimization Plan Round 3

## 1. 背景与约束

- 轮次: `3`
- 状态: `PASS_WITH_NOTES`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx`
- 本轮目标文件报告: `coverage/r/award/components/dou-coin-remove-record-table/index.tsx/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `82.18%`
- 本轮结束整体覆盖率: `85.15%`
- 本轮选择原因: `Round 2 刷新后，按 same-run dedup 跳过已处理目标文件 batch-submit-modal/index.tsx，选择下一个 effectiveUncoveredInsertedRows 最大文件`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面，不使用 `localhost`、本地 dev server、本地 vmok 或 BAM runtime mock。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `31` |
| Files estimate uncovered rows | `31` |
| Cover ratio | `77.70%` |
| Insert lines | `139` |
| File coverage version | `huatuo:43bb9d69fb04bd15` |
| 选择依据 | `coverage/uncovered-list.json` rank 2；rank 1 已在本 run Round 2 处理 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | `huatuo:be381542a5504dab` | `huatuo:470be66717914175` | `ALREADY_TARGETED_SKIP` | `coverage-optimization-plan-round-2.md`、`evidence/round2-ui-evidence.md` |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | `huatuo:4ad77f572ef36501` | 不在当前 uncovered list | `NO_MATCH` | `coverage-exclusion-log.json#cov-20260716-171133-r1-step-reward-config-index-tsx` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `作品内容` 列读取 `item_card`、视频标题、视频 ID、封面 URL | 通过真实线上剔除明细表覆盖 | 当前业务链路需要展示被剔除作品信息 |
| 应保留逻辑 | 无封面 fallback `-` | 通过真实线上表格记录覆盖 | 当前真实记录无封面，能稳定覆盖 fallback |
| 应保留逻辑 | 剔除原因列 `remove_reason || '-'` | 通过真实线上表格记录覆盖 | 当前真实记录有 `内容质量不佳` / `内容相关性低` |
| 应保留逻辑 | 操作人列 `PeopleCard` | 通过真实线上表格记录覆盖 | 当前真实记录有 `operator_id`，会触发员工信息查询和 PeopleCard 渲染 |

### 3.1 报告未覆盖代码行

来源: `coverage/r/award/components/dou-coin-remove-record-table/index.tsx/report.md`。

#### L52-L75: 作品内容列渲染

```tsx
const itemInfo = record.item_card?.item_model?.base_model?.item_info?.base_info;
const videoTitle = itemInfo?.title || '-';
const videoId = record.item_card?.item_model?.item_id || '-';
const videoCover = itemInfo?.cover?.url_list?.[0];
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 当前真实剔除明细表有记录，可触发表格单元格渲染。
- 关联需求 / 用例: 剔除明细 Tab 展示。

#### L93, L106-L112: 剔除原因与操作人渲染

```tsx
render: (_, record) => record.remove_reason || '-'
return record.operator_id ? <PeopleCard ... /> : '-';
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `KEEP_AND_COVER`
- 原因: 真实记录包含剔除原因与操作人，能覆盖 `PeopleCard` 分支。
- 关联需求 / 用例: 剔除明细 Tab 展示。

## 4. 代码优化方案

本轮不修改业务代码。剩余未覆盖行是有效展示逻辑，可通过真实线上读接口和真实表格数据覆盖。

代码规则检查:

- [x] 未删除有效业务展示逻辑。
- [x] 未新增过度安全防护。
- [x] 未夹带无关重构。
- [x] 未修改 `src/bam/**`。
- [x] 未启动本地 dev server。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-3-01 | 剔除明细 Tab 展示 | 真实线上页面 -> 配置五 -> 剔除明细 | URL query、配置 tab、真实线上 GET response | 表格记录渲染、作品 ID、剔除时间、剔除原因、操作人 |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` | `GET` | DOU+ 币剔除明细查询 | 真实页面 URL `activity_id`、当前配置五 `config_id`、EcopTable 默认分页 | Network GET 记录、DOM 表格记录、截图 |
| `/common/index/batchGetEaUsers` | `GET` | 操作人信息展示 | 真实剔除记录中的 `operator_id` | Network GET 记录、DOM 操作人展示 |

## 7. 写接口拦截方案

本轮没有写接口。所有覆盖动作均为真实线上 UI 触发的只读查询，不需要浏览器 mock 响应。

## 8. 线上执行记录与证据

- 页面: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001`
- 执行方式: 真实线上页面、真实 UI 操作；读接口真实请求。
- 禁用项确认: 未使用本地调试入口、本地 dev server、本地 vmok、BAM runtime mock；无写接口。
- 线上入口证据: `evidence/round3-ui-evidence.md`
- 截图: `evidence/round3-dou-coin-remove-record-table.png`

## 9. 本轮 Huatuo 刷新结果

- 刷新产物目录: `coverage/`
- 分支报告: `coverage/report.md`
- 目标文件报告: `coverage/report.md` 最终未覆盖列表已不包含本轮目标文件
- 拉取方式: 使用 `scripts/collect-huatuo-branch-coverage.js --browserCaptureServer` 启动本地接收服务，在已登录 Huatuo 页面内发真实线上请求，并按脚本规范沉淀本轮覆盖率产物。
- 结果: `overallCoverRatio 82.18% -> 85.15%`; 本轮目标文件从最终未覆盖列表移除

## 10. 本轮决策

- Decision: `STOP_MAX_ROUNDS_REACHED`
- Summary: Round 3 已完成真实线上 UI 覆盖和 Huatuo 刷新验证；整体覆盖率提升到 `85.15%`，但仍低于阈值 `90%`。
- Next candidate: `MAX_ROUNDS_REACHED`

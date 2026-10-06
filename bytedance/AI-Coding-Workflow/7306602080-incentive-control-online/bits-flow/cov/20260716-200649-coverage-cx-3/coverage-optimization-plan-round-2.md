# Coverage Optimization Plan Round 2

## 1. 背景与约束

- 轮次: `2`
- 状态: `BLOCKED`
- 阈值: `90`
- 本轮目标文件: `apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts`
- 本轮目标文件报告: `coverage/r/award/stores/sendAwardToAuthorStore.ts/report.md`
- 最新分支覆盖率报告: `coverage/report.md`
- 当前业务仓库: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- 本轮开始整体覆盖率: `88.60%`
- 本轮结束整体覆盖率: `88.60%`
- 执行策略来源: `coverage-optimization-state.json.execution_policy`
- 全局排除日志: `../coverage-exclusion-log.json`
- 覆盖执行环境: 真实线上页面，不使用 `localhost`、本地 dev server、本地 vmok 或 BAM runtime mock。
- 请求边界: 读接口和无副作用接口保持真实线上请求；写接口若触发必须由内置浏览器拦截并返回 mock 响应，禁止真实命中后端。

## 2. 候选文件选择

| 字段 | 值 |
|---|---|
| Effective uncovered inserted rows | `26` |
| Files estimate uncovered rows | `26` |
| Cover ratio | `21.21%` |
| Insert lines | `33` |
| File coverage version | `huatuo:a8063018ce0bb551` |
| 选择依据 | 刷新后 `coverage/uncovered-list.json` 排名第 1，且未被同轮 state 或全局排除日志同版本拦截 |
| 全局排除日志状态 | `NO_MATCH` |
| 本次 run 处理状态 | `NO_MATCH` |

排除候选:

| 文件 | 排除记录版本 | 当前报告版本 | 处理 | 证据 |
|---|---|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` | `huatuo:470be66717914175` | `huatuo:91cb2311c8682c4e` | `ALREADY_TARGETED_SKIP` | 本 run round 1 已处理；same-run 去重生效 |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | `huatuo:4ad77f572ef36501` | `huatuo:4ad77f572ef36501` | `ACTIVE_SKIP` | `coverage-exclusion-log.json#cov-20260716-171133-r1-step-reward-config-index-tsx` |

## 3. 未覆盖行归类

| 分类 | 未覆盖点 | 处理策略 | 原因 |
|---|---|---|---|
| 应保留逻辑 | `clearPendingNoAwardAuthorItems` | 保留；需真实作者 no-award pending 后由批量提交成功清空 | TASK-007 要求发奖成功后合并 pending no-award 作者并清空 |
| 应保留逻辑 | `fetchData` 成功 / 失败时清空 `pendingNoAwardAuthorItems` | 保留；列表刷新和异常恢复路径需要清空 pending | 防止旧候选跨筛选 / 分页污染 |
| 应保留逻辑 | `updateAwardConfigForAuthor` / `updateAwardConfigForAuthors` 调用 `syncPendingNoAwardAuthorItems` | 保留；单卡 / 批量修改“不发奖”后用于后续提交剔除名单 | 当前需求链路可达，但需要真实作者候选 |
| 应保留逻辑 | `syncPendingNoAwardAuthorItems` 的增删和无 author id 跳过 | 保留；按 author id 维护 pending no-award 列表 | 业务语义明确，不做删除或压缩 |

### 3.1 报告未覆盖代码行

#### L134-L136, L219, L265: pending no-award author 清空

```ts
runInAction(() => {
  this.pendingNoAwardAuthorItems = [];
});
```

处理策略:

- 分类: `UI_COVERABLE`
- 结论: `BLOCKED`
- 原因: 需要真实作者列表、真实 no-award 修改和后续批量提交成功；当前线上所有 DOU+券作者配置都返回 0 位作者。
- 关联需求 / 用例: `TASK-007`, `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST`

#### L415, L473, L498-L518: pending no-award author 同步

```ts
this.syncPendingNoAwardAuthorItems([newAuthor]);
this.syncPendingNoAwardAuthorItems(updateAuthors);
```

处理策略:

- 分类: `WRITE_REQUEST_BROWSER_INTERCEPT`
- 结论: `BLOCKED`
- 原因: 需要通过真实 UI 选中作者并触发 `delivery_modify_save`；当前线上 DOU+券作者候选为空，无法构造真实 UI 入参。
- 关联需求 / 用例: `TASK-007`, `AR-004`

## 4. 代码优化方案

本轮不修改业务代码。目标文件的未覆盖行均为当前需求作者侧 no-award pending 列表所需逻辑；没有链路不通、与需求无关或可安全删除的代码。

代码规则检查:

- [x] 未删除链路可达业务代码。
- [x] 未新增过度安全防护。
- [x] 未夹带无关重构。
- [x] 未修改 `src/bam/**`。
- [x] 未启动本地 dev server。

## 5. 覆盖设计总览

| 覆盖任务 | 关联需求 / 用例 | 线上 UI 路径 | 请求入参来源 | 覆盖目标 |
|---|---|---|---|---|
| COV-2-01 | `TASK-007` | 真实线上页面 -> DOU+券配置 -> 作者列表 -> 单卡或批量修改为不发奖 | 真实 `search_delivery_author` 返回的作者行 | `syncPendingNoAwardAuthorItems` false 分支 |
| COV-2-02 | `TASK-007` | 同一作者重新改为发奖 | 真实作者行和现有 pending 列表 | `syncPendingNoAwardAuthorItems` true 删除分支 |
| COV-2-03 | `TC-INT-AWARD-SUCCESS-UPLOAD-NO-AWARD-LIST` | 选中可发奖作者 -> 批量提交成功 -> clear pending | 真实作者行、真实充值记录、写接口浏览器拦截 | `clearPendingNoAwardAuthorItems` |

## 6. 请求入参来源方案

| 接口 | 方法 | 用途 | 字段来源 | 证据要求 |
|---|---|---|---|---|
| `/api/buyin/admin/content_activity/search_delivery_author` | `GET` | 作者候选列表 | 真实线上页面切换 DOU+券配置自然请求 | 不接管请求、不替换响应 |
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 作者 no-award / re-award 修改 | 真实作者行、真实批量修改弹窗 | 若触发必须浏览器拦截，证明未命中后端 |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | DOU+券最终发奖 | 真实作者行、真实充值记录 | 若触发必须浏览器拦截，证明未命中后端 |
| `/api/buyin/admin/content_activity/candidate_remove` | `POST` | 发奖成功后上传 no-award 作者名单 | pending no-award 作者 | 若触发必须浏览器拦截，证明未命中后端 |

## 7. 线上执行记录

执行过程中只触发只读真实后端请求，没有触发写接口。

| 配置 | 奖励类型 | 真实 UI / 后端结果 | 结论 |
|---|---|---|---|
| 配置二 | `DOU+券` | `共0位满足准入门槛的作者，当前合计0位作者` | 无法触发作者 no-award 修改 |
| 配置三 | `DOU+券` | 存在制券失败警告；奖励下发列表 `共0位满足准入门槛的作者，当前合计0位作者` | 可用于 round 3 重提制券，但不能覆盖作者候选 pending |
| 配置四 | `DOU+券` | `共0位满足准入门槛的作者，当前合计0位作者` | 无法触发作者 no-award 修改 |
| 配置六 | `DOU+券` | `共0位满足准入门槛的作者，当前合计0位作者` | 无法触发作者 no-award 修改 |

证据:

- `evidence/round-2-author-empty-evidence.json`

## 8. 验收标准

| 验收项 | 标准 | 结果 |
|---|---|---|
| 候选选择 | 最大未覆盖有效候选已被处理 | `PASS` |
| 请求真实性 | 只读接口真实命中线上后端 | `PASS` |
| 写接口安全 | 未触发写接口 | `PASS` |
| 目标覆盖 | 当前线上数据无法触发目标分支 | `BLOCKED` |
| 全局排除登记 | 本目标文件已写入 `coverage-exclusion-log.json` | `PASS` |

## 9. 风险与阻塞点

- 阻塞: 当前线上 DOU+券作者配置均无作者候选，无法在真实 UI 中构造 `delivery_modify_save` 的作者入参。
- 剩余风险: 若后续线上产生作者候选，`sendAwardToAuthorStore.ts` 可在新 `fileCoverageVersion` 或新 run 中重新处理。

## 10. 本轮决策

- Decision: `CONTINUE`
- Summary: round 2 目标文件已确认当前真实线上 UI 阻塞，不进行业务代码删除或本地 mock。
- Next candidate: `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts`

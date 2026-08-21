# Coverage Optimization Log

- Run ID: `20260716-232605-coverage-cx-3`
- Mode: `/delivery:bits --coverage`
- Status: `IN_PROGRESS`
- Threshold: `96%`
- Rounds planned: `3`
- Workspace: `artifacts/7306602080-incentive-control-online`
- Repo: `meego-7306602080/repos/alliance-operation-mono`
- Branch: `cx-3`
- Submit authorized: `false`

## 1. 覆盖率拉取

初始拉取产物位于本 run 的 `coverage/` 目录。整体覆盖率为 `91.28%`，低于当前阈值 `96%`。本 run 必须继续执行覆盖率优化闭环，前序 `91.28% >= 90%` 的结论不适用于本次阈值。

产物:

- `coverage/latest.json`
- `coverage/report.md`
- `coverage/uncovered-list.json`
- `coverage/uncovered-list.md`
- `coverage/results/**`

初始摘要:

| 字段 | 值 |
|---|---|
| Huatuo generatedAt | `2026-07-16T15:27:00.632Z` |
| overallCoverRatio | `91.28%` |
| totalFiles | `24` |
| nonFullCoverageFiles | `8` |
| effectiveUncoveredInsertedRows | `86` |

## 2. Round 1

| 字段 | 值 |
|---|---|
| 目标文件 | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx` |
| 目标文件版本 | `huatuo:9412a594665bd189` |
| 目标文件覆盖率 | `89.66%` |
| 有效未覆盖行 | `3` |
| 处理方式 | 真实线上 UI 覆盖 + 写接口浏览器拦截 |
| 代码修改 | 无 |
| 当前结果 | `UI_COVERAGE_DONE_PENDING_HUATUO_REFRESH` |

同版本跳过候选:

- `sendAwardToAuthorStore.ts`：`huatuo:a8063018ce0bb551`
- `batch-submit-modal/index.tsx`：`huatuo:91cb2311c8682c4e`
- `utils.ts`：`huatuo:fd505ef218d83512`
- `manuallySubmitVideoStore.ts`：`huatuo:9b2e17f6cdac59ab`

未覆盖行:

| line | code |
|---:|---|
| 72 | `const authorId = item.author_info?.author_id;` |
| 73 | `return authorId && !selectedAuthorIds.has(authorId);` |
| 446 | `clearPendingNoAwardAuthorItems();` |

## 3. 真实线上 UI 覆盖计划

入口:

```text
https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001
```

执行路径:

1. 停留在 `配置二 / DOU+券 / 奖励下发`，使用真实作者候选。
2. 通过真实 UI 将 1 位作者修改为不发奖，形成 pending no-award author。
3. 选择剩余可发奖作者，点击 `批量提交`。
4. 读类接口保持真实请求：候选列表、充值记录、余额校验。
5. 写接口由浏览器内拦截：`delivery_modify_save`、`delivery_dou_plus_coupon`、`candidate_remove`。
6. 写接口拦截必须记录 `backend_write = not_sent`。
7. 保存 evidence 后刷新 Huatuo。

## 4. 写接口拦截

已完成真实线上 UI 覆盖，写接口均在浏览器内发网前截断，未触达后端。证据文件:

- `evidence/round-1-ui-evidence.json`

拦截结果:

| 接口 | 方法 | 触发 UI | 结论 |
|---|---|---|---|
| `/api/buyin/admin/content_activity/delivery_modify_save` | `POST` | 作者配置修改确认 | 拦截 2 次，`backend_write = not_sent` |
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | 投放奖励最终确认 | 拦截 3 次，v3 成功进入后续流程，`backend_write = not_sent` |
| `/api/buyin/admin/content_activity/candidate_remove` | `POST` | reward success 后自动上传 no-award author | 拦截 1 次，`remove_candidates_count = 1`，`backend_write = not_sent` |

补充排障记录:

- v1/v2 的投放成功 mock 仍被前端判定为 `提交作者奖励投放失败: -1, success`。
- 根因是运行时 `operation-request` 会把网络 JSON 包装成 `{ code, type, data, msg }`，而目标 helper 检查 `res.st`，`st` 被放进 `data.st` 后未被保留到 wrapper 顶层。
- v3 在浏览器会话内安装只读兼容 getter，将 mocked success wrapper 的 `res.st` 映射到 `res.data.st`；源码未修改，后端写请求仍未发送。
- v3 后 `/candidate_remove` 被触发，批量提交弹窗关闭，覆盖 `clearPendingNoAwardAuthorItems()` 路径。

截图记录:

- `browser_take_screenshot` 已返回会话内预览，显示弹窗关闭并回到配置二主页面。
- 工具未在 workspace、`/tmp`、Downloads、Desktop 或 `.trae-cn` 下生成本地 PNG；本地可复核证据以 `evidence/round-1-ui-evidence.json` 为准。

## 5. 验证

已完成:

- 真实 UI evidence JSON 可解析。
- 写接口记录 `backend_write = not_sent`。

待执行:

- `coverage/latest.json` 刷新自本轮脚本。
- `coverage-exclusion-log.json` 登记本轮目标文件和 `fileCoverageVersion`。
- 业务仓库 `git status --short` 保持无未提交业务代码改动。

## 6. Gate 当前结论

当前状态: `UI_COVERAGE_DONE_PENDING_HUATUO_REFRESH`。不得声明通过；待 Huatuo 刷新、state/exclusion log 更新后再关闭本轮。

## 7. Round 1 刷新结果

Round 1 完成后重新执行 Huatuo browser capture：

```text
/opt/homebrew/bin/node .trae/skills/bits-dev-flow/scripts/collect-huatuo-branch-coverage.js --repoRoot meego-7306602080/repos/alliance-operation-mono --gitRepo ecom/alliance-operation-mono --fromBranch master --toBranch cx-3 --outDir artifacts/7306602080-incentive-control-online/bits-flow/coverage/20260716-232605-coverage-cx-3/coverage --timeout 180000 --browserCaptureServer
```

刷新结论：

| 字段 | 值 |
|---|---:|
| overallCoverRatio before | `91.28%` |
| overallCoverRatio after | `95.11%` |
| threshold | `96%` |
| 结果 | `BELOW_THRESHOLD_CONTINUE_ROUND_2` |

Round 1 目标文件已从最新 `uncovered-list.json` 中清空，并登记到 `../coverage-exclusion-log.json`：

- entry_id: `cov-20260716-232605-r1-batch-operation-bar-index-tsx`
- fileCoverageVersion: `huatuo:9412a594665bd189`

## 8. Round 2

| 字段 | 值 |
|---|---|
| 目标文件 | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx` |
| 目标文件版本 | `huatuo:0676324834683b2c` |
| 目标文件覆盖率 | `90.48%` |
| 有效未覆盖行 | `10` |
| 处理方式 | 真实线上 UI 覆盖 + 写接口浏览器拦截 |
| 代码修改 | 无 |
| 当前结果 | `COMPLETED_THRESHOLD_MET` |

选择依据：

- 旧全局排除项 `cov-20260716-200649-r1-batch-submit-modal-index-tsx` 的版本为 `huatuo:91cb2311c8682c4e`。
- 最新报告中同文件版本为 `huatuo:0676324834683b2c`，按策略记为 `VERSION_CHANGED_ALLOW_RETARGET`。

Round 2 初始未覆盖行：

| line | code |
|---:|---|
| 89 | `message.warning('不发奖名单上传失败');` |
| 90 | `return;` |
| 99 | `message.warning(response?.msg || '不发奖名单上传失败');` |
| 102 | `message.warning('不发奖名单上传失败');` |
| 126 | `return { resultCode: 0 };` |
| 150 | `errorMessage = getAwardDeliveryExceptionMessage(error);` |
| 151 | `message.error(errorMessage);` |
| 182 | `return { resultCode: 0 };` |
| 209 | `errorMessage = getAwardDeliveryExceptionMessage(error);` |
| 210 | `message.error(errorMessage);` |

## 9. Round 2 真实线上 UI 覆盖

证据文件：

- `evidence/round-2-ui-evidence.json`

执行路径：

1. 先尝试 `配置五 / DOU+币 / 视频批量提交异常`。
2. 真实 UI 前置校验拦截：第一条作品缺少必填 `投放生效时间`，提示“请完成所有被选中卡片的必填项，再点击提交。待填写卡片序号1。”
3. 打开第一条作品 `修改配置` 后确认投放生效时间为空，且 DatePicker 要求选择当前时间之后的时间；为避免真实保存修改或绕过前置校验，停止该路径。
4. 切换到 `配置三 / DOU+券`，使用页面真实 `制券失败警告` 的 `点此查看并重新提交`。
5. 重新提交弹窗中选择真实充值记录 `cc抖+券-程可歆-3000`。
6. 读类余额校验保持真实请求，页面显示 `余额充足。剩余可用：6元`。
7. 点击 `确认提交`，浏览器内拦截 `/api/buyin/admin/content_activity/delivery_dou_plus_coupon`，不发送后端写请求。

Round 2 写接口拦截：

| 接口 | 方法 | 次数 | 触发 UI | 结论 |
|---|---|---:|---|---|
| `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | `POST` | 2 | 配置三制券失败重新提交确认 | 均在浏览器内发网前截断，`backend_write = not_sent` |

补充排障记录：

- Round 2 第一次 coupon mock 使用 `Object.prototype.st` 临时 getter 触发 `submitSendAwardAuthors` 异常路径。
- 为避免继续依赖 prototype shim，第二次 coupon mock 改为 XHR error 事件，直接走网络错误 reject 型拦截。
- 异常提交后 `重新提交制券` 弹窗未关闭，符合 `submitResult.resultCode != 0` 时不执行 `onOk` / 不关闭弹窗的行为。

## 10. 最终 Huatuo 刷新结果

重新执行 Huatuo browser capture：

```text
/opt/homebrew/bin/node .trae/skills/bits-dev-flow/scripts/collect-huatuo-branch-coverage.js --repoRoot meego-7306602080/repos/alliance-operation-mono --gitRepo ecom/alliance-operation-mono --fromBranch master --toBranch cx-3 --outDir artifacts/7306602080-incentive-control-online/bits-flow/coverage/20260716-232605-coverage-cx-3/coverage --timeout 180000 --browserCaptureServer
```

刷新结论：

| 字段 | 值 |
|---|---:|
| Huatuo generatedAt | `2026-07-16T16:22:16.524Z` |
| overallCoverRatio | `97.03%` |
| threshold | `96%` |
| effectiveUncoveredInsertedRows | `26` |
| 结果 | `PASS` |

最新报告：

- `coverage/latest.json`
- `coverage/report.md`
- `coverage/uncovered-list.json`
- `coverage/uncovered-list.md`

Round 2 目标文件登记到 `../coverage-exclusion-log.json`：

- entry_id: `cov-20260716-232605-r2-batch-submit-modal-index-tsx`
- fileCoverageVersion: `huatuo:0676324834683b2c`

说明：目标文件自身仍有残余未覆盖行，但本次 `/delivery:bits --coverage --threshold 96` 的整体覆盖率 Gate 已通过。

## 11. Gate 最终结论

- 执行模式：`--coverage`
- 阈值：`96%`
- 最终整体覆盖率：`97.03%`
- 轮次：2 / 3
- 代码修改：无业务代码修改
- 写接口：全部由浏览器内拦截，`backend_write = not_sent`
- 提交 / 推送 / 远端覆盖率评审：未执行，用户未传 `--submit`
- 状态：`PASS`

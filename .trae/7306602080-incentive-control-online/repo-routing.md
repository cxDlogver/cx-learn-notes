# Repo Routing

## 主结论

- 主仓库：`ecom/alliance-operation-mono`
- 本地目录：`/Users/bytedance/cx/spec-2/meego-9/meego-7306602080/repos/alliance-operation-mono`
- 主判断：`高置信`

## 选择依据

1. `PRD` 和技术文档都把需求承载页明确指向 `运营平台 > 内容活动 > 奖励配置 / 奖励投放 / 人工提报`，这是典型的运营 PC / 中后台页面信号，按 `code-route-skill` 应优先落到 `ecom/alliance-operation-mono`。
2. 实际代码检索命中 `apps/alliance-operation-content/src/routes/content-activity/...`：
   - `edit` 页面负责 `奖励配置` 与 `活动参与资格`
   - `award` 页面负责 `奖励投放`、`人工提报`、`投放明细`
3. 仓内已存在明确页面 URL 映射：
   - `/alliance-operation-content/content-activity/edit`
   - `/alliance-operation-content/content-activity/award`
4. 技术文档里的 `ecom.buyin.admin_api` 信号说明的是后端 / BAM 接口归属，不构成前端主仓归属证据。

## 候选仓库

1. `ecom/fe-buyin`
   - 原因：技术文档接口命名空间为 `ecom.buyin.admin_api`
   - 结论：仅体现后端域与 BAM 命名，不承载当前运营平台页面，故保留为候选但不作为主仓

## 需求点映射

| 需求点 | action | object_type | repo | page_url | code_path | 置信度 | 匹配依据 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 不激励规则前置透出：在 `奖励配置 > 活动参与资格 / 预埋用户名单` 下增加提示与跳转 | 修改 | 页面 / 表单模块 | `ecom/alliance-operation-mono` | `/alliance-operation-content/content-activity/edit` | `apps/alliance-operation-content/src/routes/content-activity/edit/page.tsx`<br>`apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | 高 | 仓内已有 `活动参与资格`、`预埋用户名单` 字段和 `奖励配置` 页面结构，可直接承载前置提示与链接跳转 |
| 发奖前剔除：在 `奖励投放` 页的候选列表和发奖提交链路前增加不激励校验、异常提示、阻断逻辑 | 修改 | 页面 / 业务流程模块 | `ecom/alliance-operation-mono` | `/alliance-operation-content/content-activity/award` | `apps/alliance-operation-content/src/routes/content-activity/award/page.tsx`<br>`apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | 高 | 仓内已有 `奖励投放页`、`奖励下发` 子 Tab、候选池配置切换，PRD 的 DOU+币 / DOU+券发奖前校验会落在此处 |
| 人工提报命中不激励提示、一键移除、导出移除明细 | 修改 | 页面 / 抽屉 / store | `ecom/alliance-operation-mono` | `/alliance-operation-content/content-activity/award` | `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/index.tsx`<br>`apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx`<br>`apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` | 高 | 当前仓内已存在 `人工提报` 分支和 `get_delivery_items_from_sheet` 调用，PRD 的命中提示、移除和导出属于现有人工提报流程增强 |
| 新增 `剔除明细` Tab 与列表筛选、查询、曝光 / 点击埋点 | 修改 | 页面 / 子 Tab / 数据表 | `ecom/alliance-operation-mono` | `/alliance-operation-content/content-activity/award` | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`<br>`apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-distribution-table/index.tsx`<br>`apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-distribution-table/index.tsx` | 高 | 当前已有 `奖励下发` / `投放明细` 子 Tab 和两套 detail table，`剔除明细` 更像在既有子 Tab 结构上新增或替换一个 detail 视图 |
| 前端接入技术文档新增 / 变更的 BAM 字段与接口：`get_delivery_items_from_sheet` 字段扩展、移除明细下载接口 | 修改 | API 接入 / 类型定义 | `ecom/alliance-operation-mono` | `/alliance-operation-content/content-activity/award` | `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`<br>`apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/namespaces/thrift_idls/ecom.buyin.admin_api/content_activity/content_activity.ts` | 中高 | 技术文档直接指定了 BAM 接口改动；仓内当前已有 `get_delivery_items_from_sheet` 接口与 IDL，后续字段扩展和新下载接口应在同一接入层落地 |

## 当前判断边界

- 当前已能稳定判断 `repo`、主页面 `page_url` 和一组高相关 `code_path`。
- `剔除明细` 最终是新增第三个子 Tab，还是替换当前 `投放明细` 的部分视图，还需以本次 `prd-source.md` 正式抽取结果为准。
- 若后续 PRD / 技术文档出现额外跨端展示要求，再补充其他仓的映射；当前没有足够证据支持跨仓前端改造。

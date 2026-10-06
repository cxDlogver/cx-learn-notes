# TASK-006 Dispatch Packet

> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> task_id: `TASK-006`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
> dispatch_owner: Main Agent

## Agent Gate Summary

- Task Source: `delivery-task.md ### Task 6`
- Requirement: AR-006, AR-007, AR-010
- Case / Rule / API: TC-UI-BATCH-HIT-REUSE / R-BAM-BATCH-SHEET-HIT / `apiGetDeliveryItemsFromSheet`
- Scope: 批量上传命中态复用 TASK-005 的 summary、红字行态和 submit guard；保持批量上传 radio/upload/table/footer baseline。
- UI Evidence Mode: `RUNTIME_BASELINE_ALLOWED`
- PRD / Figma Semantic Alignment: MATCHED_WITH_LIMITATION。Figma 只确认批量上传 baseline，用户决策 AF-003 明确复用手动输入命中态。
- Mock Boundary: BAM runtime mock only; Code 不实现 mock、不写 fixture、不调用浏览器。
- Stop Condition: sheet response 类型无法承载 `if_not_incentive` / `not_incentive_reason`，或复用需要新增独立批量上传命中骨架时停止。

## Task Contract

| field | value |
|---|---|
| task_id | TASK-006 |
| requirement_id | AR-006, AR-007, AR-010 |
| test_case_id | TC-UI-BATCH-HIT-REUSE |
| ruleId | R-BAM-BATCH-SHEET-HIT |
| apiName | apiGetDeliveryItemsFromSheet |
| figma_fileKey | fNJJ7mEmEMYU5y0tcAZm3X |
| figma_nodeId | `25:13971`, content `101:6308`, table `101:6332` |
| figma_state_scope | 奖励投放 / 人工提报 Drawer / 批量上传 baseline / 上传后复用命中 summary、row status、submit guard |
| code_locator | `stores/manuallySubmitVideoStore.ts`; `manually-submit-videos-drawer/submit-selector/index.tsx`; `manually-submit-videos-form/index.tsx`; drawer submit guard |
| verification_command | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` |

## PRD / Figma / Test Alignment

| source | contract |
|---|---|
| PRD / AR | 人工提报提交后对作品/账号执行不激励校验；命中时提示、不自动剔除；命中未移除前禁止提交。批量上传同属于人工提报链路。 |
| Figma baseline | F6/F8/IMG8 确认批量上传态：`批量上传` radio、飞书表格链接输入、上传模板入口、奖励配置表格 baseline、footer `提交并投放`。 |
| User decision | `decision-log.md` AF-003：批量上传命中项复用手动输入命中态，同一提示区、行态、按钮和提交限制。 |
| Test matrix | TC-UI-BATCH-HIT-REUSE：选择批量上传，输入 sheet URL；请求 `apiGetDeliveryItemsFromSheet`；命中字段被消费；baseline 保持且复用 summary/row/guard；不新增 unsupported hit UI。 |
| semantic_result | MATCHED_WITH_LIMITATION；限制项已由 AF-003 用户确认，不要求新 F2C 命中态。 |

## UI Evidence Fit

| mode | evidence_refs | code use | verify/design follow-up |
|---|---|---|---|
| RUNTIME_BASELINE_ALLOWED | `figma-cache/nodes/F6-get_figma_data-25_13971-d5.md`; `figma-cache/nodes/F8-get_figma_data-101_6332-d6.md`; `figma-cache/screenshots/25_13971-manual-submit-batch-upload-state.png`; `04-tech-plan.md` UI-006/Region/Interaction; AF-003 | 保留现有 `SubmitSelector` 批量上传 radio/input/template link 和 `ManuallySubmitVideosForm` table baseline；只把 hit 派生状态从 manual-only 改成 submit hit reusable | `/delivery:verify` 采集 batch upload DOM/Network/screenshot；`/delivery:design` 对 IMG8 baseline + 复用命中态做对齐 |

## Current Code Facts

- `handleSubmit({ url })` 设置 `submitMethod = kSubmitMethod.url`，并调用 `fetchVideosBySheetUrl`。
- `fetchVideosBySheetUrl` 已调用真实 `apiGetDeliveryItemsFromSheet`，成功后 `this.videoItems = this.fillIfDeliveryTrue(response.data.item_info || [])`。
- TASK-005 当前命中 UI 被 manual-only getter 限制：`manualInputHitItems`、`manualInputHitCount`、`manualInputTotalCount`、`hasManualInputHitItems`。
- TASK-005 当前 remove/export 方法也受 `isManualInputMode` 限制；TASK-006 需要让批量上传命中项共用同一 summary/action/row/guard，不得引入另一套 UI。

## Required Steps

1. 确认并保持 `apiGetDeliveryItemsFromSheet` 响应仍经 `fillIfDeliveryTrue` 进入 `videoItems`，不得改为本地 fixture、preview service 或 fallback store。
2. 将 TASK-005 的命中项判定、summary、row status、submit guard 抽成可复用派生逻辑，使手动输入和批量上传都能使用。
3. 保持批量上传 radio、上传模板、表格 baseline 和 footer 文案；不得新增独立批量上传命中骨架或 unsupported UI。
4. 完成后勾选 `delivery-task.md` TASK-006 四个 checkbox，并在 `05-implementation-log.md` 记录 TASK-006 implementation record、UI evidence usage、BAM coverage finding 和待验证项。
5. 运行验证命令；如失败，在当前 TASK-006 边界内修复或返回 BLOCKED。

## Forbidden Scope

- 不实现 TASK-007 发奖前治理处罚/timeout/exception/空名单逻辑。
- 不实现 TASK-008 埋点。
- 不新增业务 mock、fixture、preview service、fallback store、本地造数、fake success。
- 不修改 BAM generated wrapper、IDL、BAM marker、mock manifest、rule-map、`__mock__`。
- 不新增独立批量上传命中视觉骨架，不等待新设计，不删减批量上传 baseline。
- 不调用浏览器，不实施 `/delivery:mock`。

## Acceptance Assertions

- 批量上传请求仍走 `apiGetDeliveryItemsFromSheet`。
- sheet response 含 `if_not_incentive` / `not_incentive_reason` / `if_satisfy_delivery_rules === false` 时，显示与手动输入一致的 summary、红字行态、一键移除、导出剔除明细和 submit guard。
- 没有命中项时不展示 summary/action，批量上传 baseline 保持。
- `提交并投放` 在批量上传命中项未移除前不打开 `BatchSubmitModal`。
- build PASS；mock closure 仍登记给 `/delivery:verify`：TC-UI-BATCH-HIT-REUSE / R-BAM-BATCH-SHEET-HIT / `apiGetDeliveryItemsFromSheet`。

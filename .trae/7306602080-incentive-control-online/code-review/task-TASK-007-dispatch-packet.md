# TASK-007 Dispatch Packet

> stage: `/delivery:code`
> mode: `MOCK_PREVIEW`
> task_id: `TASK-007`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
> dispatch_owner: Main Agent

## Agent Gate Summary

- Task Source: `delivery-task.md ### Task 7`
- Requirement: AR-003, AR-004, AR-005
- Case / Rule / API: `TC-INT-AWARD-COIN-PENALTY` / `R-BAM-AWARD-COIN-PENALTY` / `apiDeliveryDouPlusCoin`; `TC-INT-AWARD-COIN-RELIEVED` / `R-BAM-AWARD-COIN-RELIEVED` / `apiDeliveryDouPlusCoin`; `TC-INT-AWARD-COUPON-PENALTY` / `R-BAM-AWARD-COUPON-PENALTY` / `apiDeliveryDouPlusCoupon`; `TC-INT-AWARD-COUPON-RELIEVED` / `R-BAM-AWARD-COUPON-RELIEVED` / `apiDeliveryDouPlusCoupon`; `TC-INT-AWARD-TIMEOUT` / `R-BAM-AWARD-COIN-TIMEOUT` / `apiDeliveryDouPlusCoin`; `TC-INT-AWARD-EXCEPTION` / `R-BAM-AWARD-COUPON-EXCEPTION` / `apiDeliveryDouPlusCoupon`; `TC-INT-AWARD-EMPTY-LIST` / `R-BAM-AWARD-COIN-EMPTY` / `apiDeliveryDouPlusCoin`
- Scope: 发奖提交前后的真实 wrapper 分支保护、固定治理错误文案、空名单无发奖成功假象；不改候选计算、金额编辑、排序、mock runtime 或埋点。
- UI Evidence Mode: `N/A`，非 UI / Figma 结构任务。
- PRD / Figma Semantic Alignment: MATCHED。TASK-007 来自 PRD 3.2 发奖前剔除与错误边界；Figma 仅提供页面入口背景，不要求视觉重建。
- Mock Boundary: BAM runtime mock only; Code 不实现 mock、不写 fixture、不调用浏览器。
- Stop Condition: 若当前真实 wrapper 响应无法通过 `st/code/msg` 和请求异常区分成功 / 阻断 / timeout / exception，且需要新增未登记字段或改 BAM generated 类型，停止并返回 `NEEDS_TARGETED_REVIEW` / `/delivery:plan`。

## Task Contract

| field | value |
|---|---|
| task_id | TASK-007 |
| requirement_id | AR-003, AR-004, AR-005 |
| test_case_id | TC-INT-AWARD-COIN-PENALTY, TC-INT-AWARD-COIN-RELIEVED, TC-INT-AWARD-COUPON-PENALTY, TC-INT-AWARD-COUPON-RELIEVED, TC-INT-AWARD-TIMEOUT, TC-INT-AWARD-EXCEPTION, TC-INT-AWARD-EMPTY-LIST |
| ruleId | R-BAM-AWARD-COIN-PENALTY, R-BAM-AWARD-COIN-RELIEVED, R-BAM-AWARD-COUPON-PENALTY, R-BAM-AWARD-COUPON-RELIEVED, R-BAM-AWARD-COIN-TIMEOUT, R-BAM-AWARD-COUPON-EXCEPTION, R-BAM-AWARD-COIN-EMPTY |
| apiName | apiDeliveryDouPlusCoin, apiDeliveryDouPlusCoupon |
| figma_fileKey | N/A |
| figma_nodeId | N/A |
| figma_state_scope | N/A |
| code_locator | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx`; `apps/alliance-operation-content/src/routes/content-activity/award/stores/couponDeliveryRecordStore.ts`; optional shared helper in `apps/alliance-operation-content/src/routes/content-activity/award/utils.ts`; constants in `apps/alliance-operation-content/src/routes/content-activity/award/constants.ts` |
| verification_command | `pnpm_config_verify_deps_before_run=false pnpm --dir /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content build` |

## PRD / Plan / Test Alignment

| source | contract |
|---|---|
| PRD / AR | AR-003/AR-004：DOU+币/券发奖前按后端治理校验结果阻断自然处罚，解除状态不阻断。AR-005：治理 timeout/exception 暂停发奖并展示固定文案；剔除后名单为空正常结束、不发放激励。 |
| Tech plan | `04-tech-plan.md:41-43`：发奖链路使用真实 wrapper response branch；错误边界只消费 `code/msg` 或约定错误分支；空列表走正常结束态。COPY-TIMEOUT=`治理校验失败，请稍后重试`；COPY-EXCEPTION=`治理校验异常，请联系管理员`。 |
| Test matrix | `09-test-case-matrix.md:38-44`：覆盖 DOU+币/券 punishment/relieved、timeout、exception、empty-list；矩阵 mock key 仅含 `code,st,msg` 或 network timeout，不要求新增业务字段。 |
| semantic_result | MATCHED。当前实现应基于真实 wrapper 的 `st/code/msg`、请求异常和提交 payload 是否为空，不得发明处罚状态字段、timeout code 或 empty-list response 字段。 |

## Current Code Facts

- `batch-submit-modal/index.tsx` 中 `submitSendAwardVideos` 调用 `apiDeliveryDouPlusCoin`；`submitSendAwardAuthors` 调用 `apiDeliveryDouPlusCoupon`。
- 现有成功判断是 `res.st === 0 && res.code === 0`，失败时展示 `${MESSAGES.SEND_AWARD_*_FAILED}: ${resultCode}, ${res.msg}`；catch 只展示通用失败文案。
- `handleOkClick` 在调用 wrapper 前已根据 `if_delivery === true` 组装 `deliveryList` / `deliveryItems` / `deliveryAuthors`。这里可以加空名单 guard，但不能改变候选筛选、金额、rank、排序算法。
- `couponDeliveryRecordStore.submitDelivery` 是券失败补发路径，调用同一个 `apiDeliveryDouPlusCoupon`；已有 `deliveryList` getter 返回当前可发券列表。
- 生成类型 `delivery_dou_plus_coin_response` / `delivery_dou_plus_coupon_response` 只有 `st`, `msg`, `code?`；不得修改 generated 类型或猜测新增字段。

## Required Steps

1. 在 `batch-submit-modal/index.tsx`、`couponDeliveryRecordStore.ts` 和必要的共享常量/工具中落地 TASK-007。保持真实 `apiDeliveryDouPlusCoin` / `apiDeliveryDouPlusCoupon` 调用链，禁止 mock、fixture、preview service、fallback store、fake success。
2. 用 PRD 固定文案覆盖治理 timeout / exception：
   - timeout: `治理校验失败，请稍后重试`
   - exception: `治理校验异常，请联系管理员`
   允许基于真实 response 的 `msg`/`code` 和 request catch 的 timeout-like 信息分类；禁止硬编码未登记的后端错误码映射。
3. 对非成功 response 阻止成功 toast 和 `onOk` 成功闭合。解除状态 mock 返回 `st=0, code=0` 时保持既有成功流程。
4. 对空名单场景，在发起真实奖励 wrapper 前保护：当当前提交来源对应的 `delivery_list` / `delivery_items` / `delivery_authors` 为空时，不发起空名单奖励发放，不展示 `提交成功` 奖励成功假象；按 PRD 正常结束并允许关闭/重置当前提交态。
5. 勾选 `delivery-task.md` TASK-007 的五个 checkbox，只勾选本任务，不改 TASK-008。
6. 更新 `05-implementation-log.md`：记录 TASK-007 execution record、BAM coverage findings、验证结果、待验证项。若发现矩阵已有 rule 但 runtime mock 需要补充，只能更新 `09-test-case-matrix.md` 对应 TASK-007 行的 `补充说明`，不得改合同列或 mock artifacts。
7. 运行验证命令；如失败，在 TASK-007 范围内修复或返回 BLOCKED。

## Forbidden Scope

- 不实现 TASK-008 埋点。
- 不修改 BAM generated wrapper、IDL、BAM marker、mock manifest、rule-map、`__mock__`。
- 不新增业务 mock、fixture、preview service、fallback store、本地造数、本地过滤 fixture 或 fake success。
- 不新增前端处罚状态计算；不基于未登记字段判断 `0/1/2` 状态。
- 不改变候选池查询、候选排序、金额编辑、充值记录校验、配置保存逻辑。
- 不调用浏览器，不实施 `/delivery:mock`。

## Acceptance Assertions

- 普通 DOU+币 / DOU+券提交仍走真实 wrapper；券失败补发仍走真实 `apiDeliveryDouPlusCoupon`。
- `st=0 && code=0` 保持成功流程；自然处罚 / 非成功 response 不展示成功 toast，返回值不触发 `onOk` 成功闭合。
- timeout 分支展示 `治理校验失败，请稍后重试`；exception 分支展示 `治理校验异常，请联系管理员`。
- 空提交名单不发起空名单奖励 wrapper，不展示奖励成功 toast；当前 modal/drawer 能正常结束。
- `delivery-task.md` 只勾选 TASK-007；TASK-008 保持未勾选。
- build PASS；mock closure 仍登记给 `/delivery:verify` 的 TASK-007 ruleIds。

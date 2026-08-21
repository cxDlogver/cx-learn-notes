# Delivery Mock Report

## Summary
- Mock Readiness: PASS（current `TC-INT-AWARD-EMPTY-LIST` setup detour scope）
- Origin Stage: `/delivery:verify`
- Resume Command: `/delivery:verify`
- Resume Case: `TC-INT-AWARD-EMPTY-LIST`
- Implementation Mode: `MOCK_PREVIEW`
- Scope Note: 本报告在已闭合的 `TC-INT-AWARD-TIMEOUT`、`TC-INT-AWARD-EXCEPTION` 相关 mock 之上，新增 `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` 只读 setup rule 和 `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST` 金额校验前置 rule：自然 UI 批量上传 empty-list 专用 sheet URL 的真实 GET 基线为业务校验失败，runtime 调原 GET 后最小恢复 1 条 `if_delivery=false` 且非命中态作品 `item_id=700004`，使 Drawer 物理列表非空、Modal 内有效 `delivery_list=[]`；自然 UI 选择充值记录后的真实金额校验请求为 `delivery_list=[]`，真实响应 `st/code=10000000,msg=参数错误,data={}`，runtime 调原 POST 后最小恢复 `data.can_delivery=true,current_use_amount=0`，只解除 Modal `确定` 置灰。两条 rule 均不模拟最终发奖成功，不新增 `apiDeliveryDouPlusCoin` success mock；下一步必须回到人工提报批量上传自然 UI，独立采集 setup / charge `[BAM_MOCK_HIT]`、Modal `本次共投放 0 个作品`、点击确定后无 `apiDeliveryDouPlusCoin` marker/XHR/fetch 且无成功发奖 toast。真实 sheet 权限、后端空有效名单样本、empty-list 金额校验和真实发奖事务仍是 real verify。

## Browser Runtime Precheck
- browser_runtime_mode: `TRAE_DESKTOP`
- browser_tool: `integrated_browser`
- headless: `false`
- browser_profile_or_state: Trae integrated browser current session（未读取 cookie / storage / token）
- network_evidence_level: DOM + screenshot + redacted request summary + console marker
- sso_result: `business_page`
- vmok_url: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7653282555822653742&cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001`
- local_service_owner_check: `localhost:8083` belongs to `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content`

## Interface Coverage
### Current SearchCandidate Detour: apiSearchDeliveryItems
- apiName: `apiSearchDeliveryItems`
- method/path: `GET /api/buyin/admin/content_activity/search_delivery_items`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-SEARCH-CANDIDATE-COIN-PENALTY`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - previous resume: `TC-INT-AWARD-COIN-PENALTY__search_candidate_restore`
  - completed resume: `TC-INT-AWARD-COIN-RELIEVED__search_candidate_restore`
- contract mode: `real_browser_request` failure baseline + `mockOperations`（真实请求可达但返回业务失败；runtime 调原 GET 后最小恢复两条候选样本。mock 只服务 MOCK_PREVIEW 前端候选选择，不证明真实候选池、治理状态或发奖事务）

### Preserved Setup Detour: apiDeliveryModifySave
- apiName: `apiDeliveryModifySave`
- method/path: `POST /api/buyin/admin/content_activity/delivery_modify_save`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - setup resume: `TC-INT-AWARD-COIN-PENALTY__setup_effective_time`
  - business resume: `TC-INT-AWARD-COIN-PENALTY`
- contract mode: `synthetic_contract`（配置保存写接口安全原因不发送真实后端请求；runtime 输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`；mock 只解除当前自然 UI 发奖前置必填拦截，不证明真实配置持久化）

### Current Final Award Detour: apiDeliveryDouPlusCoin
- apiName: `apiDeliveryDouPlusCoin`
- method/path: `POST /api/buyin/admin/content_activity/delivery_dou_plus_coin`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-AWARD-COIN-TIMEOUT`（preserved: `R-BAM-AWARD-COIN-PENALTY`, `R-BAM-AWARD-COIN-RELIEVED`）
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 当前恢复: `TC-INT-AWARD-TIMEOUT`
  - 已闭合保留: `TC-INT-AWARD-COIN-RELIEVED`
  - 已闭合保留: `TC-INT-AWARD-COIN-PENALTY`
- contract mode: `synthetic_contract`（发奖写接口安全原因不发送真实后端请求；timeout rule 返回 marked synthetic timeout-like response `{st:1,code:504,msg:"timeout"}` 并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`；mock 只验证前端 timeout response branch，不证明真实 timeout 链路或发奖事务一致性）

### Current Pre-Award Detour: apiChargeAmountCheck
- apiName: `apiChargeAmountCheck`
- method/path: `POST /api/buyin/admin/content_activity/charge_amount_check`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT`, `R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 已闭合保留: `TC-INT-AWARD-TIMEOUT__charge_amount_check`
  - 当前恢复: `TC-INT-AWARD-EMPTY-LIST__charge_amount_check`
- contract mode: `real_browser_request` failure baseline + `mockOperations`（timeout 真实请求可达且返回 `st=0/code=0` 但余额不足；empty-list 真实请求可达且返回 `st/code=10000000,msg=参数错误,data={}`。runtime 均调原 POST 后只做最小前置改写：timeout 设置 `data.can_delivery=true,left_amount=1900000`；empty-list 设置 success shell、`data.can_delivery=true,left_amount=1900000,current_use_amount=0`。mock 只解除对应上传名单样本的金额校验前置拦截，不替代最终 `apiDeliveryDouPlusCoin` 断言，不证明真实充值记录余额）

### Current Final Award Detour: apiDeliveryDouPlusCoupon
- apiName: `apiDeliveryDouPlusCoupon`
- method/path: `POST /api/buyin/admin/content_activity/delivery_dou_plus_coupon`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-AWARD-COUPON-RELIEVED`（preserved: `R-BAM-AWARD-COUPON-PENALTY`）
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 当前恢复: `TC-INT-AWARD-COUPON-RELIEVED`
  - 已闭合保留: `TC-INT-AWARD-COUPON-PENALTY`
- contract mode: `synthetic_contract`（发奖写接口安全原因不发送真实后端请求；relieved rule 返回 marked synthetic success `{st:0,code:0,msg:"success"}`，penalty rule 保留 marked synthetic non-success `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`，两者均输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`；mock 只验证前端 response branch，不证明真实治理状态、券账户或发奖事务一致性）

### Current SearchCandidate Detour: apiSearchDeliveryAuthor
- apiName: `apiSearchDeliveryAuthor`
- method/path: `GET /api/buyin/admin/content_activity/search_delivery_author`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 当前恢复: `TC-INT-AWARD-COUPON-PENALTY__search_candidate_restore`
  - 当前恢复: `TC-INT-AWARD-COUPON-RELIEVED__search_candidate_restore`
- contract mode: `real_browser_request` empty success baseline + `mockOperations`（真实请求可达且返回 `total_num=0/candidate_num=0/has_more=false`；runtime 调原 GET 后最小恢复作者候选 `800001` / `800002`。mock 只服务 MOCK_PREVIEW 前端候选选择，不证明真实候选池、治理处罚 / 解除状态或发奖事务）

### Current Setup Detour: apiGetDeliveryItemsFromSheet
- apiName: `apiGetDeliveryItemsFromSheet`
- method/path: `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-BATCH-SHEET-HIT`, `R-BAM-BATCH-SHEET-AWARD-TIMEOUT`, `R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 当前恢复: `TC-UI-BATCH-HIT-REUSE`
  - 已闭合保留: `TC-INT-AWARD-TIMEOUT__batch_sheet_setup`
  - 当前恢复: `TC-INT-AWARD-EMPTY-LIST__batch_sheet_setup`
  - 后续前置状态复用但仍需独立取证: `TC-INT-BATCH-ONE-CLICK-REMOVE`, `TC-INT-BATCH-EXPORT`
- contract mode: `real_browser_request` failure baseline + `mockOperations`（真实请求可达但 sheet 样本业务校验失败；runtime 仍调用原 GET 后最小改写 success shell 与 `data.item_info`。`R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` 只服务 empty-list case 上传名单 setup，不替代最终发奖 no-call/no-success 断言；真实 sheet 权限/模板仍是 real verify 回收项）

### Preserved Detour: apiDownloadContentRemoveRecord
- apiName: `apiDownloadContentRemoveRecord`
- method/path: `POST /api/buyin/admin/content_activity/download_content_remove_record`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-DOWNLOAD-REMOVE-RECORD`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 已完成恢复: `TC-INT-MANUAL-EXPORT`
  - 共享 rule 后续独立取证: `TC-INT-BATCH-EXPORT`
- contract mode: `synthetic_contract`（该接口会生成 Feishu 剔除明细链接，`MOCK_PREVIEW` 下不依赖真实飞书权限/表格生成链路；runtime 输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`）

### Preserved Detour: apiCandidateRemove
- apiName: `apiCandidateRemove`
- method/path: `POST /api/buyin/admin/content_activity/candidate_remove`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-CANDIDATE-REMOVE-SUCCESS`, `R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 当前恢复: `TC-INT-MANUAL-ONE-CLICK-REMOVE`
  - 共享 rule 后续独立取证: `TC-INT-BATCH-ONE-CLICK-REMOVE`
- contract mode: `synthetic_contract`（写接口安全原因不发送真实后端请求；success 与 failure branches 均由 runtime 输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`）

### Preserved Detour: apiSearchDeliveryItems
- apiName: `apiSearchDeliveryItems`
- method/path: `GET /api/buyin/admin/content_activity/search_delivery_items`
- target BAM file: `apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts`
- target rules: `R-BAM-MANUAL-SEARCH-HIT`
- default rule: `DEFAULT_NOOP`
- affected caseIds:
  - 当前恢复: `TC-UI-MANUAL-HIT-PAGE`
  - 共享 rule 仍需逐 case 执行: `TC-CELL-MANUAL-HIT-STATUS`, `TC-INT-MANUAL-SUBMIT-GUARD`, `TC-TRACK-MANUAL-HIT-EXPOSE`
  - 已完成并保留: `apiGetDouPlusCoinRemoveRecord` / `R-BAM-COIN-REMOVE-DEFAULT`, `R-BAM-COIN-REMOVE-FILTER`; `apiGetDouPlusCouponRemoveRecord` / `R-BAM-COUPON-REMOVE-DEFAULT`, `R-BAM-COUPON-REMOVE-FILTER`

## Current Request / Response Contract
### apiSearchDeliveryItems / R-BAM-SEARCH-CANDIDATE-COIN-PENALTY
- Real request artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/request.json`
- Real raw response artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/response.raw.txt`
- Real response artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/response.json`
- Mocked response artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/evidence.json`
- Matcher fields: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `candidate_pool_type=1`, `page_no=1`, `page_size=50`
- Collection-only fields: `publish_start_time=1782403200`, `publish_end_time=1783526399`, `session_unix_time=<运行态实际值>`
- Real response baseline: business failure `code=10001602 / 查询发放奖励失败`; this is not claimed as a real success contract.
- Response override keys: `st`, `code`, `msg`, `data.item_info`, `data.total_num`, `data.candidate_num`, `data.has_more`
- Mocked rows: penalty candidate `7655364163166869874` rank=1 without `delivery_config.effective_time`; relieved candidate `700002` rank=2 with `delivery_config.effective_time=1783656000`; `total_num=2`, `candidate_num=2`, `has_more=false`
- Safety boundary: `search_delivery_items` 是只读 GET，runtime 调原接口后用 `mockOperations` 最小改写；不得用该 mock 证明真实候选池状态、治理解除状态或后端真实 success response。

### apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED
- Synthetic request artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/request.json`
- Synthetic response artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/evidence.json`
- Matcher fields: `delivery_from=1`, `delivery_items.0.candidate_id=700002`
- Collection-only fields: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `charge_code=charge_code_award_coin_relieved_7306602080`, `session_unix_time=1783568265`, `delivery_items.0.rank=2`
- Response contract: `{st:0,code:0,msg:"success"}`
- Safety boundary: `delivery_dou_plus_coin` 是发奖写接口，`MOCK_PREVIEW` 下不发送真实后端请求；runtime 使用 marked synthetic success 验证前端 success branch。真实申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务保留为 real verify。

### apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-TIMEOUT
- Real request artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/request.json`
- Real raw response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.raw.txt`
- Real response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.json`
- Mocked response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/evidence.json`
- Matcher fields: `sheet_url=https://bytedance.larkoffice.com/sheets/award-timeout-7306602080`
- Collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`
- Real response baseline: business validation failure `code=10001604/st=10001604/msg=表格数据不符合要求，请检查数据格式是否正确`; this is not claimed as a real success contract.
- Response override keys: `st`, `code`, `msg`, `data.item_info`, `data.total_num`, `data.candidate_num`, `data.has_more`
- Mocked rows: `700003` 可投放 DOU+币作品；`if_delivery=true`, `total_num=1`, `candidate_num=1`, `has_more=false`
- Safety boundary: `get_delivery_items_from_sheet` 是只读 GET，runtime 调原接口后用 `mockOperations` 最小改写；该 rule 只形成 timeout case 上传名单前置状态，不替代最终 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT` 断言。

### apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST
- Real request artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/request.json`
- Real raw response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.raw.txt`
- Real response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.json`
- Mocked response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/evidence.json`
- Matcher fields: `sheet_url=https://bytedance.larkoffice.com/sheets/award-empty-list-7306602080`
- Collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`
- Real response baseline: business validation failure `code=10001604/st=10001604/msg=表格数据不符合要求，请检查数据格式是否正确`; this is not claimed as a real success contract.
- Response override keys: `st`, `code`, `msg`, `data.item_info`, `data.total_num`, `data.candidate_num`, `data.has_more`
- Mocked rows: `700004` 非有效投放 DOU+币作品；`if_delivery=false`, `if_satisfy_delivery_rules=true`, `if_not_incentive=false`, `total_num=1`, `candidate_num=0`, `has_more=false`
- Safety boundary: `get_delivery_items_from_sheet` 是只读 GET，runtime 调原接口后用 `mockOperations` 最小改写；该 rule 只形成 empty-list case 上传名单前置状态，不替代最终 `apiDeliveryDouPlusCoin` no-call/no-success 断言，不证明真实后端已返回空有效名单。

### apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT
- Synthetic request artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/request.json`
- Synthetic response artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/evidence.json`
- Matcher fields: `delivery_from=2`, `delivery_list.0.item_id=700003`
- Collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `charge_code=charge_code_award_coin_timeout_7306602080`, `session_unix_time=1783578953`, `delivery_list.0.delivery_config`, `delivery_list.0.delivery_reason`
- Response contract: `{st:1,code:504,msg:"timeout"}`
- Safety boundary: `delivery_dou_plus_coin` 是发奖写接口，`MOCK_PREVIEW` 下不发送真实后端请求；runtime 使用 marked synthetic timeout-like response 验证前端固定 timeout 文案 `治理校验失败，请稍后重试`、no success toast 和流程暂停。真实 timeout / network timeout 链路、治理接口一致性和最终发奖事务保留为 real verify。

### apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT
- Real request artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/request.json`
- Real raw response artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.raw.txt`
- Real response artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.json`
- Mocked response artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/evidence.json`
- Matcher fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `delivery_from=2`, `resource_type=5`, `delivery_list.0.amount=30000`
- Collection-only fields: `charge_code=LST12606290003681`, `session_unix_time=1783580153`
- Real response baseline: `st=0/code=0/msg=""` but `data.can_delivery=false`, `data.left_amount=0`, `data.current_use_amount=30000`; this is not claimed as a real sufficient-balance contract.
- Response override keys: `data.can_delivery`, `data.left_amount`
- Mocked response: `data.can_delivery=true`, `data.left_amount=1900000`, with `current_use_amount=30000` preserved.
- Safety boundary: `charge_amount_check` 是发奖前金额校验 POST，runtime 调原接口后用 `mockOperations` 最小改写；该 rule 只解除当前 timeout 上传名单前置置灰，不替代最终发奖 timeout 断言，也不证明真实充值记录余额。

### apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST
- Real request artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/request.json`
- Real raw response artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/response.raw.txt`
- Real response artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/response.json`
- Mocked response artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/evidence.json`
- Matcher fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `delivery_from=2`, `resource_type=5`, `delivery_list=[]`
- Collection-only fields: `charge_code=LST12606290003681`, `session_unix_time=1783591836`
- Real response baseline: `st/code=10000000,msg=参数错误,data={}`; this is not claimed as a real empty-list amount-check success contract.
- Response override keys: `st`, `code`, `msg`, `data.can_delivery`, `data.left_amount`, `data.current_use_amount`
- Mocked response: `st=0`, `code=0`, `msg=""`, `data.can_delivery=true`, `data.left_amount=1900000`, `data.current_use_amount=0`.
- Safety boundary: `charge_amount_check` 是发奖前金额校验 POST，runtime 调原接口后用 `mockOperations` 最小改写；该 rule 只解除当前 empty-list 上传名单前置置灰，不替代最终发奖 no-call/no-success 断言，也不证明真实充值记录余额或真实后端支持 empty `delivery_list`。

### apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY
- Synthetic request artifact: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/request.json`
- Synthetic response artifact: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/evidence.json`
- Matcher fields: `delivery_from=1`, `delivery_authors.0.candidate_id=800001`
- Collection-only fields: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `charge_code=charge_code_award_coupon_7306602080`, `session_unix_time=1783572400`, `delivery_authors.0.rank=1`
- Response contract: `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`
- Safety boundary: `delivery_dou_plus_coupon` 是发奖写接口，`MOCK_PREVIEW` 下不发送真实后端请求；runtime 使用 marked synthetic non-success response 验证前端不进入成功态。真实治理处罚状态、申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务保留为 real verify。

### apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-RELIEVED
- Synthetic request artifact: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/request.json`
- Synthetic response artifact: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/evidence.json`
- Matcher fields: `delivery_from=1`, `delivery_authors.0.candidate_id=800002`
- Collection-only fields: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `charge_code=charge_code_award_coupon_relieved_7306602080`, `session_unix_time=1783575400`, `delivery_authors.0.rank=2`
- Response contract: `{st:0,code:0,msg:"success"}`
- Safety boundary: `delivery_dou_plus_coupon` 是发奖写接口，`MOCK_PREVIEW` 下不发送真实后端请求；runtime 使用 marked synthetic success response 验证前端 success branch。真实申诉解除 / 自主解封解除状态、券账户一致性、治理接口一致性和最终发奖事务保留为 real verify。

### apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY
- Real request artifact: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/request.json`
- Real raw response artifact: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.raw.txt`
- Real response artifact: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.json`
- Mocked response artifact: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/evidence.json`
- Matcher fields: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `candidate_pool_type=1`, `award_period=1`, `page_no=1`, `page_size=50`
- Collection-only fields: `publish_start_time=1783440000`, `publish_end_time=1783526399`, `session_unix_time=<运行态实际值>`
- Real response baseline: success empty list `{st:0,code:0,msg:"",data:{total_num:0,candidate_num:0,has_more:false}}`; this is not claimed as a real non-empty candidate contract.
- Response override keys: `st`, `code`, `msg`, `data.total_num`, `data.candidate_num`, `data.delivery_author_info`, `data.has_more`
- Mocked rows: DOU+券可投放作者 `800001` rank=1 与 `800002` rank=2，均带 `coupon_type=1`、`coupon_config.freeAmount=5000`、`num=1`、领取有效期和使用有效期；`total_num=2`, `candidate_num=2`, `has_more=false`
- Safety boundary: `search_delivery_author` 是只读 GET，runtime 调原接口后用 `mockOperations` 最小改写；不得用该 mock 证明真实作者候选池、治理处罚 / 解除状态、券记录余额或最终发奖事务。

### apiDeliveryModifySave / R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE
- Synthetic request artifact: `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/request.json`
- Synthetic response artifact: `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/evidence.json`
- Matcher fields: `candidate_ids.0=7655364163166869874`, `if_delivery=true`
- Collection-only fields: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `session_unix_time=<运行态实际值>`, `item_modify_config.delivery_amount=5000`, `item_modify_config.delivery_duration=7200`, `item_modify_config.target_likes=44`, `item_modify_config.target_audience=1`, `item_modify_config.effective_time=1783648800`
- Interface necessity: 当前 DOU+币 SearchCandidate 页 50 个可投放候选均缺 `delivery_config.effective_time`，最终 `批量提交` 会被必填校验拦截；verify 必须通过真实 UI `修改配置/保存` 补齐第 1 个候选后再继续最终发奖 Modal `确定`。
- Response contract: `{st:0,code:0,msg:"success"}`
- Safety boundary: `delivery_modify_save` 是配置保存写接口，`MOCK_PREVIEW` 下不发送真实后端请求；runtime 使用 marked synthetic success 验证前置保存路径。真实保存持久化、权限、失败 msg、候选池刷新一致性保留为 real verify。

### apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-PENALTY
- Synthetic request artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/request.json`
- Synthetic response artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/evidence.json`
- Matcher fields: `delivery_from=1`, `delivery_items.0.candidate_id=7655364163166869874`
- Collection-only fields: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `charge_code=charge_code_award_coin_7306602080`, `session_unix_time=1783490000`, `delivery_items.0.rank=1`
- Scope update: 自然 UI DOU+币 SearchCandidate 样本使用 activity_id=`7655304206886322458`、config_id=`7655304206886338842`、candidate_id=`7655364163166869874`；旧 `700001` 仅为矩阵占位，最终 UI 提交前已被替换，避免写接口落到 `DEFAULT_NOOP` 或真实后端路径。
- Response contract: `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`
- Safety boundary: `delivery_dou_plus_coin` 是发奖写接口，`MOCK_PREVIEW` 下不发送真实后端请求；runtime 使用 marked synthetic response 验证前端不进入成功态。真实治理处罚状态、申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务保留为 real verify。

### apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-HIT
- Real request artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/request.json`
- Real raw response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.raw.txt`
- Real response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.json`
- Mocked response artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.mocked.json`
- Evidence artifact: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/evidence.json`
- Matcher fields: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`
- Collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`
- Real response baseline: business validation failure `code=10001604/st=10001604/msg=表格数据不符合要求，请检查数据格式是否正确`; this is not claimed as a real success contract.
- Response override keys: `st`, `code`, `msg`, `data.item_info`, `data.total_num`, `data.candidate_num`, `data.has_more`
- Mocked rows: `200001` 准入失败、`200002` 命中【不激励】规则、`200003` 可投放保留项；`total_num=3`, `candidate_num=1`, `has_more=false`
- Safety boundary: `get_delivery_items_from_sheet` 是只读 GET，runtime 调原接口后用 `mockOperations` 最小改写；不得用该 mock 证明真实 sheet 权限、模板格式或后端真实成功 response。

### apiDownloadContentRemoveRecord / R-BAM-DOWNLOAD-REMOVE-RECORD
- Synthetic request artifact: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json`
- Synthetic response artifact: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/response.json`
- Synthetic evidence artifact: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/evidence.json`
- Matcher fields: `records.0.remove_reason=手动移除`, `records.1.remove_reason=命中【不激励】规则`
- Collection-only fields: `records.0.author_id=900001`, `records.0.item_id=100001`, `records.0.item_name=人工提报准入失败作品`, `records.1.author_id=900002`, `records.1.item_id=100002`, `records.1.item_name=人工提报不激励命中作品`, `records.1.penalty_reason=历史违规命中不激励规则`
- Negative control: valid row `100003 / 900003` must not appear in the natural UI export request.
- Response contract: `{st:0,code:0,msg:"success",data:{lark_url:"https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080"}}`
- Safety boundary: `download_content_remove_record` 会生成外部 Feishu 明细资源，`MOCK_PREVIEW` 下不把真实飞书权限 / 表格可访问性作为当前 verify case 关闭依据；真实权限和操作人来源保留为 real verify 回收项。

### apiCandidateRemove / preserved
- Success synthetic request artifact: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/request.json`
- Success synthetic response artifact: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/response.json`
- Success evidence artifact: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/evidence.json`
- Success matcher fields: `remove_candidates.0.remove_reason=手动移除`, `remove_candidates.1.remove_reason=命中【不激励】规则`
- Success collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `candidate_id=100001/100002`
- Success response contract: `{st:0,code:0,msg:"success"}`
- Failure synthetic request artifact: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/request.json`
- Failure synthetic response artifact: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/response.json`
- Failure evidence artifact: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/evidence.json`
- Failure matcher fields: `remove_candidates.0.remove_reason=手动移除`, `remove_candidates.1.remove_reason=__BAM_MOCK_ABSENT__`
- Failure collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `candidate_id=100001`
- Failure response contract: `{st:1,code:1,msg:"一键移除失败"}`
- Safety boundary: `candidate_remove` 是写接口，`MOCK_PREVIEW` 下 success / failure probes 均不发送真实后端请求；真实持久化、失败 msg、候选池刷新和剔除明细联动保留为 real verify 回收项。

## Preserved Request / Response Contract
- Real request artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/request.json`
- Real raw response artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/response.raw.txt`
- Real response artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/response.json`
- Mocked response artifact: `mock/real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/response.mocked.json`
- Natural request matcher fields: `item_ids=100001,100002,100003,candidate_pool_type=2,page_no=1,page_size=50`
- Collection-only fields: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `session_unix_time=1783520153`
- Response override keys: `data.item_info`, `data.total_num`, `data.candidate_num`, `data.has_more`
- Real response baseline: success with 3 `item_info` rows where `if_satisfy_delivery_rules=false` but no `if_not_incentive/not_incentive_reason`; MOCK_PREVIEW minimal rewrite creates mixed manual hit state: 准入失败、不激励命中、可投放保留项。
- Preserved matcher boundary: `R-BAM-MANUAL-SEARCH-HIT` only matches the exact manual input and candidate pool request; different `item_ids` / `candidate_pool_type` / `page_no` / `page_size` fall back to `DEFAULT_NOOP`.

## Runtime Patch
- Manifest: `mock/apis/apiSearchDeliveryItems/manifest.json`; `mock/apis/apiGetDeliveryItemsFromSheet/manifest.json`; `mock/apis/apiChargeAmountCheck/manifest.json`; `mock/apis/apiDeliveryDouPlusCoin/manifest.json`; `mock/apis/apiDeliveryDouPlusCoupon/manifest.json`; `mock/apis/apiSearchDeliveryAuthor/manifest.json`; preserved `mock/apis/apiDeliveryModifySave/manifest.json`
- Runtime script: `mock/apis/apiSearchDeliveryItems/script.mjs`; `mock/apis/apiGetDeliveryItemsFromSheet/script.mjs`; `mock/apis/apiChargeAmountCheck/script.mjs`; `mock/apis/apiDeliveryDouPlusCoin/script.mjs`; `mock/apis/apiDeliveryDouPlusCoupon/script.mjs`; `mock/apis/apiSearchDeliveryAuthor/script.mjs`; preserved `mock/apis/apiDeliveryModifySave/script.mjs`
- Supplemental verify script: `mock/apis/apiSearchDeliveryItems/verify.mjs`; `mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs`; `mock/apis/apiChargeAmountCheck/verify.mjs`; `mock/apis/apiDeliveryDouPlusCoin/verify.mjs`; `mock/apis/apiDeliveryDouPlusCoupon/verify.mjs`; `mock/apis/apiSearchDeliveryAuthor/verify.mjs`; preserved `mock/apis/apiDeliveryModifySave/verify.mjs`
- Rule map index: `mock/rule-map.json`
- Rule map summary: `mock/rule-map.md`
- Change log: `mock/mock-log.md`
- BAM marker: `BAM_MOCK_PATCH_START apiSearchDeliveryItems` / `BAM_MOCK_PATCH_END apiSearchDeliveryItems`; `BAM_MOCK_PATCH_START apiGetDeliveryItemsFromSheet` / `BAM_MOCK_PATCH_END apiGetDeliveryItemsFromSheet`; `BAM_MOCK_PATCH_START apiChargeAmountCheck` / `BAM_MOCK_PATCH_END apiChargeAmountCheck`; `BAM_MOCK_PATCH_START apiDeliveryDouPlusCoin` / `BAM_MOCK_PATCH_END apiDeliveryDouPlusCoin`; `BAM_MOCK_PATCH_START apiDeliveryDouPlusCoupon` / `BAM_MOCK_PATCH_END apiDeliveryDouPlusCoupon`; `BAM_MOCK_PATCH_START apiSearchDeliveryAuthor` / `BAM_MOCK_PATCH_END apiSearchDeliveryAuthor`; preserved `BAM_MOCK_PATCH_START apiDeliveryModifySave` / `BAM_MOCK_PATCH_END apiDeliveryModifySave`
- Wrapper request field patch: N/A；生成 wrapper 已透传 `apiDeliveryModifySave` 所需 `activity_id/config_id/session_unix_time/candidate_ids/item_modify_config/if_delivery`，`apiChargeAmountCheck` 所需 `activity_id/config_id/charge_code/delivery_list/delivery_candidates/session_unix_time/delivery_from/resource_type`，`apiDeliveryDouPlusCoin` 所需 `activity_id/config_id/charge_code/delivery_list/delivery_items/session_unix_time/delivery_from`，`apiDeliveryDouPlusCoupon` 所需 `activity_id/config_id/charge_code/delivery_list/delivery_authors/session_unix_time/delivery_from`，以及 `apiSearchDeliveryAuthor` 所需 `activity_id/config_id/publish_start_time/publish_end_time/author_ids/page_no/page_size/session_unix_time/candidate_pool_type/award_period`
- Route / component / hook / store / service / adapter mock code: N/A（未修改）

## Verification Evidence
- DOU+币 SearchCandidate two-row mocked response: `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/response.mocked.json`
- DOU+币 SearchCandidate interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/verify.mjs` -> PASS
- DOU+币 SearchCandidate standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- DOU+币解除状态发奖 synthetic request: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/request.json`
- DOU+币解除状态发奖 synthetic response: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/response.json`
- DOU+币解除状态发奖 synthetic evidence: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/evidence.json`
- DOU+币解除状态发奖接口 supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoin/verify.mjs` -> PASS
- DOU+币解除状态发奖标准最终审核: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoin/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Timeout sheet setup real request: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/request.json`
- Timeout sheet setup real failure response: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.raw.txt`, `response.json`
- Timeout sheet setup mocked response: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.mocked.json`
- Timeout sheet setup evidence: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/evidence.json`
- Timeout sheet setup interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs` -> PASS
- Timeout sheet setup standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiGetDeliveryItemsFromSheet/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Empty-list sheet setup real request: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/request.json`
- Empty-list sheet setup real failure response: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.raw.txt`, `response.json`
- Empty-list sheet setup mocked response: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.mocked.json`
- Empty-list sheet setup evidence: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/evidence.json`
- Empty-list sheet setup interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs` -> PASS
- Empty-list sheet setup standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiGetDeliveryItemsFromSheet/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- DOU+币 timeout 发奖 synthetic request: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/request.json`
- DOU+币 timeout 发奖 synthetic response: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/response.json`
- DOU+币 timeout 发奖 synthetic evidence: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/evidence.json`
- DOU+币 timeout 发奖接口 supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoin/verify.mjs` -> PASS
- DOU+币 timeout 发奖标准最终审核: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoin/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Timeout charge amount check real request: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/request.json`
- Timeout charge amount check real failure response: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.raw.txt`, `response.json`
- Timeout charge amount check mocked response: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.mocked.json`
- Timeout charge amount check evidence: `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/evidence.json`
- Timeout charge amount check interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiChargeAmountCheck/verify.mjs` -> PASS
- Timeout charge amount check standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiChargeAmountCheck/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- DOU+券发奖自然处罚 synthetic request: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/request.json`
- DOU+券发奖自然处罚 synthetic response: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/response.json`
- DOU+券发奖自然处罚 synthetic evidence: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/evidence.json`
- DOU+券解除状态发奖 synthetic request: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/request.json`
- DOU+券解除状态发奖 synthetic response: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/response.json`
- DOU+券解除状态发奖 synthetic evidence: `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/evidence.json`
- DOU+券发奖接口 supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoupon/verify.mjs` -> PASS
- DOU+券发奖标准最终审核: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoupon/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- DOU+券作者候选空响应基线: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.json`
- DOU+券作者候选 mocked response: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.mocked.json`
- DOU+券作者候选 evidence: `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/evidence.json`
- DOU+券作者候选接口 supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryAuthor/verify.mjs` -> PASS
- DOU+券作者候选标准最终审核: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryAuthor/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Rehydration: `node .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs --mock-root artifacts/7306602080-incentive-control-online/mock --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api --apply` -> PASS（10 个 manifest 全量 reapply；`apiSearchDeliveryAuthor` / `apiDeliveryDouPlusCoupon` marker 已 REPLACE，并重插全部保留接口 marker）
- DOU+币第 1 个候选配置保存 synthetic request: `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/request.json`
- DOU+币第 1 个候选配置保存 synthetic response: `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/response.json`
- DOU+币第 1 个候选配置保存 synthetic evidence: `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/evidence.json`
- DOU+币第 1 个候选配置保存接口 supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryModifySave/verify.mjs` -> PASS
- DOU+币第 1 个候选配置保存标准最终审核: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryModifySave/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- DOU+币发奖自然处罚 synthetic request: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/request.json`
- DOU+币发奖自然处罚 synthetic response: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/response.json`
- DOU+币发奖自然处罚 synthetic evidence: `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/evidence.json`
- DOU+币发奖接口 supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoin/verify.mjs` -> PASS
- DOU+币发奖标准最终审核: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiDeliveryDouPlusCoin/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Rule map index count: `jq '.interfaces | length' artifacts/7306602080-incentive-control-online/mock/rule-map.json` -> `13`; total rules -> `36`
- Batch sheet natural failure evidence: `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--natural-failure-runtime.json`
- Batch sheet real request: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/request.json`
- Batch sheet real failure response: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.raw.txt`, `response.json`
- Batch sheet mocked response: `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.mocked.json`
- Batch sheet interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs` -> PASS
- Batch sheet standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiGetDeliveryItemsFromSheet/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Rehydration: `node .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs --mock-root artifacts/7306602080-incentive-control-online/mock --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api --apply` -> PASS（10 个 manifest 全量 reapply）
- Regression standard audits: `apiSearchDeliveryItems`, `apiCandidateRemove`, `apiDownloadContentRemoveRecord`, `apiGetDouPlusCoinRemoveRecord`, `apiGetDouPlusCouponRemoveRecord`, `apiGetDeliveryItemsFromSheet` -> PASS
- Download export synthetic request: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json`
- Download export synthetic response: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/response.json`
- Download export synthetic evidence: `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/evidence.json`
- Download export interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiDownloadContentRemoveRecord/verify.mjs` -> PASS
- Download export standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiDownloadContentRemoveRecord/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Rehydration: `node .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs --mock-root artifacts/7306602080-incentive-control-online/mock --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api --apply` -> PASS（新增 `apiDownloadContentRemoveRecord` marker，并重插全部保留接口 marker）
- Upstream author_id closure: `node artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/verify.mjs` -> PASS；standard final audit -> PASS
- Preserved interface regression: `apiCandidateRemove` / `apiGetDouPlusCoinRemoveRecord` / `apiGetDouPlusCouponRemoveRecord` supplemental verify and standard final audit -> PASS
- Candidate remove success synthetic request: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/request.json`
- Candidate remove success synthetic response: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/response.json`
- Candidate remove success synthetic evidence: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/evidence.json`
- Candidate remove failure synthetic request: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/request.json`
- Candidate remove failure synthetic response: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/response.json`
- Candidate remove failure synthetic evidence: `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/evidence.json`
- Candidate remove interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiCandidateRemove/verify.mjs` -> PASS（success + failure branches）
- Candidate remove standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiCandidateRemove/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Manual hit natural UI evidence: `verify-logs/evidence/TC-UI-MANUAL-HIT-PAGE--manual-hit-runtime.json`
- Manual hit runtime screenshot: `screenshots/TC-UI-MANUAL-HIT-PAGE--manual-drawer-hit--mock-hit.png`
- Preserved DOU+币 evidence: `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`, `verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json`, `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`, `screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png`
- Preserved DOU+券 evidence: `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`, `verify-logs/evidence/TC-DATA-COUPON-FILTER-SCHEMA--mock-hit-runtime.json`, `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`, `screenshots/TC-DATA-COUPON-FILTER-SCHEMA--coupon-filter-open--filter-mock-hit-table.png`
- Interface supplemental verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/verify.mjs` -> PASS
- DOU+币 regression verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiGetDouPlusCoinRemoveRecord/verify.mjs` -> PASS（保留）
- DOU+券 regression verification: `node artifacts/7306602080-incentive-control-online/mock/apis/apiGetDouPlusCouponRemoveRecord/verify.mjs` -> PASS（保留）
- Standard final audit: `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api` -> PASS
- Rehydration: `node .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs --mock-root artifacts/7306602080-incentive-control-online/mock --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api --apply` -> PASS

## Open Items
- `TC-INT-AWARD-COIN-RELIEVED` 已恢复 `/delivery:verify` 自然 UI 复验并以 `PASS_WITH_NOTES` 关闭当前 verify scope；SearchCandidate two-row sample、`apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-RELIEVED` synthetic success、success message / modal close-reset、no governance failure copy、no candidate deletion 已落盘到 case evidence。真实申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务仍是 real verify 回收项。
- `TC-INT-AWARD-COUPON-PENALTY` 已恢复 `/delivery:verify` 自然 UI 复验并以 `PASS_WITH_NOTES` 关闭当前 verify scope；`apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-PENALTY` 的 MOCK_PREVIEW 写接口安全门、SearchCandidate 作者候选恢复、non-success marker、错误提示和 no-real-write evidence 已落盘。
- `TC-INT-AWARD-COUPON-RELIEVED` 已恢复 `/delivery:verify` 自然 UI 复验并以 `PASS_WITH_NOTES` 关闭当前 verify scope；`apiSearchDeliveryAuthor / R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY` 双作者候选恢复、`800002` 选择、`apiDeliveryDouPlusCoupon / R-BAM-AWARD-COUPON-RELIEVED` synthetic success marker、modal close、no governance failure、no candidate deletion 与 no-real-write evidence 已落盘。
- `TC-INT-AWARD-TIMEOUT` 已恢复 `/delivery:verify` 自然 UI 复验并以 `PASS_WITH_NOTES` 关闭当前 verify scope；timeout setup、金额校验前置和最终 timeout synthetic 写接口安全门均保留，不得为后续 case 重开或改写。
- `TC-INT-AWARD-EMPTY-LIST` 是当前 Verify Case Queue 第 30 个 case；`apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` 已能通过 empty-list 专用 sheet URL 恢复 1 条 `if_delivery=false` 且非命中态作品 `item_id=700004`，manifest / rule-map / BAM runtime marker 已补齐并通过验证。下一步必须回到批量上传自然 UI 路径，触发 setup `[BAM_MOCK_HIT]`，打开投放 Modal 并采集 `本次共投放 0 个作品` 与最终无 `apiDeliveryDouPlusCoin` marker/XHR/fetch、无成功发奖 toast 的 no-call/no-success 证据。
- `TC-INT-AWARD-COIN-PENALTY` 已恢复 `/delivery:verify` 自然 UI 复验并以 `PASS_WITH_NOTES` 关闭当前 verify scope；真实配置保存持久化、治理处罚状态和发奖事务一致性仍是 real verify 回收项。
- `TC-UI-BATCH-HIT-REUSE` 已具备 `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-HIT` mock runtime；必须回到 `/delivery:verify` 通过自然 UI 批量上传路径重新点击 `提交`，采集 `[BAM_MOCK_HIT]`、target GET、summary、红字行态、submit guard、DOM 和本地截图后才能关闭 case。真实 sheet 权限、模板格式和后端真实 success response 仍是 real verify 回收项。
- `TC-INT-MANUAL-EXPORT` 已恢复 `/delivery:verify` 自然 UI 复验并关闭；真实 Feishu 表格权限、操作人来源和字段完整性仍是 real verify 回收项。
- `TC-INT-MANUAL-ONE-CLICK-REMOVE` 已具备 `apiCandidateRemove` success / failure mock runtime 安全门，并已回到 `/delivery:verify` 完成成功路径与失败路径自然 UI 证据对账；case 事实源见 `verify-logs/case-results/TC-INT-MANUAL-ONE-CLICK-REMOVE.md`，运行态证据见 `verify-logs/evidence/TC-INT-MANUAL-ONE-CLICK-REMOVE--runtime.json` 与 `verify-logs/evidence/TC-INT-MANUAL-ONE-CLICK-REMOVE--failure-runtime.json`。真实后端持久化、失败码和剔除明细联动仍是 real verify 回收项。
- `TC-UI-MANUAL-HIT-PAGE` 已恢复 `/delivery:verify` 自然 UI 复验并以 PASS_WITH_NOTES 关闭运行态断言；Figma 对齐和真实后端字段来源仍是后续复检项。
- 共享 `R-BAM-MANUAL-SEARCH-HIT` 的 `TC-CELL-MANUAL-HIT-STATUS`、`TC-INT-MANUAL-SUBMIT-GUARD`、`TC-TRACK-MANUAL-HIT-EXPOSE` 已逐 case 执行并独立 evidence mapping；本 batch detour 不改变这些已闭合事实。
- 后端 ready 后仍需 real verify 复验真实人工提报 `if_not_incentive/not_incentive_reason`、mixed 命中态、分页和 `candidate_num`。

## Resume
- mock_result: PASS（current `TC-INT-AWARD-EMPTY-LIST` setup detour）
- resume_command: `/delivery:verify`
- resume_case: `TC-INT-AWARD-EMPTY-LIST`
- current_verify_next_case: `TC-INT-AWARD-EMPTY-LIST`
- required_resume_checks:
  - 继续 Verify Case Queue 第 30 个 case `TC-INT-AWARD-EMPTY-LIST`
  - 使用已验证的 `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` 上传名单 setup rule，不能把 mock readiness 当成 case PASS
  - 不新增、不启用 `apiDeliveryDouPlusCoin` success mock；最终 pass 必须来自自然 UI 的 no-call/no-success 证据
  - 通过人工提报批量上传自然 UI 路径输入 `https://bytedance.larkoffice.com/sheets/award-empty-list-7306602080` 并触发 `apiGetDeliveryItemsFromSheet` `[BAM_MOCK_HIT]`
  - 确认 Drawer 物理列表非空、无 `不满足准入门槛` / `命中【不激励】规则` 命中提示，点击 `提交并投放` 后 Modal 显示 `本次共投放 0 个作品`
  - 点击 Modal `确定` 后采集无 `apiDeliveryDouPlusCoin` marker/XHR/fetch、无 `提交成功` / 发奖成功 toast、Modal 关闭 / 状态重置的必要本地 evidence
  - 更新 `06-debug-verification.md`
  - 保持全局 Gate 为 `NEEDS_TARGETED_REVIEW`，直到所有 verify 队列 case 均闭合

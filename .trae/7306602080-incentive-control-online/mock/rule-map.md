# BAM Mock Rule Map

## 总览
- 任务: `7306602080-incentive-control-online`
- 产物: `mock/`
- 接口数量: 13
- 规则数量: 37
- 最终验证: PASS（13 个接口 / 37 条规则已通过全量 reapply；本轮为 `TC-INT-AWARD-EMPTY-LIST` 新增 `apiGetDeliveryItemsFromSheet / R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST` 只读 setup rule，以及 `apiChargeAmountCheck / R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST` 金额校验前置 rule，接口级 supplemental verify、全量 reapply 和标准 `verify-bam-mock.mjs` 均通过。两条 rule 只构造 Drawer 非空 / Modal 空有效名单和可点击前置状态，不替代最终 `apiDeliveryDouPlusCoin` no-call 断言）

## 接口: apiGetDouPlusCoinRemoveRecord
- Method / Path: `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record`
- Manifest: `apis/apiGetDouPlusCoinRemoveRecord/manifest.json`
- 规则数量: 3
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `page`
  - `page_num`
  - `candidate_ids`
  - `operator_id`

### Rule: R-BAM-COIN-REMOVE-DEFAULT
- 覆盖 case_id:
  - `TC-UI-COIN-REMOVE-PAGE`
  - `TC-DATA-COIN-COLUMNS`
  - `TC-CELL-COIN-FIRST-ROW`
  - `TC-INT-REMOVE-TAB-SWITCH-COIN`
  - `TC-TRACK-REMOVE-DETAIL-TAB-COIN`
- 变更类型: 修改
- 最终验证: PASS（matcher 已收紧为无 `candidate_ids/operator_id` 时命中；标准审核和接口级补充校验通过；共享该 rule 的其它 case 仍需独立执行）
- UI 落点: DOU+币奖励投放 / 剔除明细 Tab
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `page=1,page_num=20,candidate_ids=__BAM_MOCK_ABSENT__,operator_id=__BAM_MOCK_ABSENT__`
  - 影响原因: 默认第一页分页请求决定当前默认列表 rule；`candidate_ids/operator_id` 必须缺省，避免筛选请求误命中默认 rule；`activity_id/config_id` 仅用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实响应基础上最小设置 `data.records`、`data.total`、`data.has_more`。
- Response key: `data.records,total,has_more`
- Mock value: 1 条 DOU+币作品维度剔除记录，`total=40`，`has_more=true`
- 覆盖场景: 默认首屏、表头白名单、首行 cell、剔除明细 Tab 切换、埋点前置可见态。
- 真实响应: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-DEFAULT/response.json`
- Mock 后响应: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-DEFAULT/response.mocked.json`
- Runtime operations:
  - `set data.records`
  - `set data.total`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-DEFAULT/request.json`
  - 影响匹配字段: `page=1,page_num=20,candidate_ids=__BAM_MOCK_ABSENT__,operator_id=__BAM_MOCK_ABSENT__`
  - 仅用于真实采集字段: `activity_id=7655304206886322458`, `config_id=7655304206886338842`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]`，表格展示作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人，且不出现投放金额或充值记录列。
- Real verify: 后端 ready 后复验真实分页、排序、`has_more` 和首行字段来源。
- 验证证据:
  - `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json`
  - `screenshots/TC-UI-COIN-REMOVE-PAGE--remove-detail-coin-default--mock-hit.png`
  - `mock/apis/apiGetDouPlusCoinRemoveRecord/manifest.json`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "records": [
      {
        "record_id": "coin_remove_record_20260708001",
        "remove_reason": "命中【不激励】规则",
        "operator_id": "chenxiang.2003",
        "remove_time": 1783508217
      }
    ],
    "total": 40,
    "has_more": true
  }
}
~~~

### Rule: R-BAM-COIN-REMOVE-FILTER
- 覆盖 case_id:
  - `TC-DATA-COIN-FILTER-SCHEMA`
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: DOU+币剔除明细 / 筛选区
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `candidate_ids=100001,100002,operator_id=6068830,page=1,page_num=20`
  - 影响原因: 作品 ID 批量输入与操作人 PeopleSelect 会改变筛选请求和列表刷新结果，必须与默认 rule 拆分，避免多 rule 命中。
- Mock 规则: 命中后调用原接口，在真实筛选响应基础上最小设置 `data.records`、`data.total`、`data.has_more`。
- Response key: `data.records,total,has_more`
- Mock value: 1 条筛选后的 DOU+币作品维度剔除记录，`total=1`，`has_more=false`
- 覆盖场景: DOU+币剔除明细筛选区作品 ID 批量输入、操作人选择、查询刷新和 request 字段映射。
- 真实响应: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-FILTER/response.json`
- Mock 后响应: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-FILTER/response.mocked.json`
- Runtime operations:
  - `set data.records`
  - `set data.total`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-FILTER/request.json`
  - 影响匹配字段: `candidate_ids=100001,100002`, `operator_id=6068830`, `page=1`, `page_num=20`
  - 仅用于真实采集字段: `activity_id=7655304206886322458`, `config_id=7655304206886338842`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-COIN-REMOVE-FILTER`，requestBody 包含 `candidate_ids/operator_id`，筛选区保留作品ID/操作人且列表刷新。
- Real verify: 后端 ready 后复验真实筛选结果、operator_id 权限范围、分页和排序。
- 验证证据:
  - `mock/real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-FILTER/evidence.json`
  - `verify-logs/evidence/TC-DATA-COIN-FILTER-SCHEMA--mock-hit-runtime.json`
  - `screenshots/TC-DATA-COIN-FILTER-SCHEMA--coin-filter-open--filter-mock-hit-table.png`
  - `mock/apis/apiGetDouPlusCoinRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "records": [
      {
        "record_id": "coin_remove_filter_record_20260708001",
        "remove_reason": "筛选命中【不激励】规则",
        "operator_id": "6068830",
        "remove_time": 1783510622
      }
    ],
    "total": 1,
    "has_more": false
  }
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: 未命中具体 rule 时必须保持原 BAM 响应。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: 复用当前接口真实请求基线。
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDouPlusCoinRemoveRecord/R-BAM-COIN-REMOVE-DEFAULT/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: 未命中 `page=1,page_num=20` 的请求返回原响应且不输出成功 mock hit。
- Real verify: 后端 ready 后复验真实分页 no-hit 行为。
- 验证证据:
  - `mock/apis/apiGetDouPlusCoinRemoveRecord/script.mjs`
  - `mock/apis/apiGetDouPlusCoinRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiGetDouPlusCouponRemoveRecord
- Method / Path: `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record`
- Manifest: `apis/apiGetDouPlusCouponRemoveRecord/manifest.json`
- 规则数量: 3
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `page`
  - `page_num`
  - `candidate_ids`
  - `operator_id`

### Rule: R-BAM-COUPON-REMOVE-DEFAULT
- 覆盖 case_id:
  - `TC-UI-COUPON-REMOVE-PAGE`
  - `TC-DATA-COUPON-COLUMNS`
  - `TC-CELL-COUPON-FIRST-ROW`
  - `TC-INT-REMOVE-TAB-SWITCH-COUPON`
  - `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: DOU+券奖励投放 / 剔除明细 Tab
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `page=1,page_num=20,candidate_ids=__BAM_MOCK_ABSENT__,operator_id=__BAM_MOCK_ABSENT__`
  - 影响原因: 默认第一页分页请求决定当前默认列表 rule；`candidate_ids/operator_id` 必须缺省，避免后续 DOU+券筛选请求误命中默认 rule；`activity_id/config_id` 仅用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实响应基础上最小设置 `data.records`、`data.total`、`data.has_more`。
- Response key: `data.records,total,has_more`
- Mock value: 1 条 DOU+券作者维度剔除记录，`total=40`，`has_more=true`
- 覆盖场景: 默认首屏、表头白名单、首行作者信息、剔除明细 Tab 切换、埋点前置可见态。
- 真实响应: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-DEFAULT/response.json`
- Mock 后响应: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-DEFAULT/response.mocked.json`
- Runtime operations:
  - `set data.records`
  - `set data.total`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-DEFAULT/request.json`
  - 影响匹配字段: `page=1,page_num=20,candidate_ids=__BAM_MOCK_ABSENT__,operator_id=__BAM_MOCK_ABSENT__`
  - 仅用于真实采集字段: `activity_id=7655304206886322458`, `config_id=7655304206886355226`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]`，表格展示作者信息 / 剔除发奖原因 / 剔除发奖时间 / 操作人，且不出现作品内容、券数量或投放状态列。
- Real verify: 后端 ready 后复验真实分页、排序、`has_more`、作者信息和操作人展示。
- 验证证据:
  - `mock/real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-DEFAULT/evidence.json`
  - `verify-logs/evidence/TC-UI-COUPON-REMOVE-PAGE--mock-hit-runtime.json`
  - `screenshots/TC-UI-COUPON-REMOVE-PAGE--remove-detail-coupon-default--mock-hit.png`
  - `mock/apis/apiGetDouPlusCouponRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "records": [
      {
        "record_id": "coupon_remove_record_20260708001",
        "author_info": {
          "author_id": "900001",
          "author_name": "券作者示例"
        },
        "remove_reason": "命中【不激励】规则",
        "operator_id": "6068830",
        "remove_time": 1783514440
      }
    ],
    "total": 40,
    "has_more": true
  }
}
~~~

### Rule: R-BAM-COUPON-REMOVE-FILTER
- 覆盖 case_id:
  - `TC-DATA-COUPON-FILTER-SCHEMA`
- 变更类型: 新增
- 最终验证: PASS（已采集自然筛选 request / response，并通过 reapply、接口级 verify 和标准 `verify-bam-mock.mjs`；当前 verify case 仍需自然点击 `查询` 捕获运行态 `[BAM_MOCK_HIT]`、DOM 和截图证据）
- UI 落点: DOU+券剔除明细 / 筛选区
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `candidate_ids=900001,900002,operator_id=6068830,page=1,page_num=20`
  - 影响原因: 作者 ID 批量输入与操作人 PeopleSelect 会改变筛选请求和列表刷新结果，必须与默认 rule 拆分，避免多 rule 命中；`activity_id/config_id` 仅用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实筛选响应基础上最小设置 `data.records`、`data.total`、`data.has_more`。
- Response key: `data.records,total,has_more`
- Mock value: 1 条筛选后的 DOU+券作者维度剔除记录，`total=1`，`has_more=false`
- 覆盖场景: DOU+券剔除明细筛选区作者 ID 批量输入、操作人选择、查询刷新和 request 字段映射。
- 真实响应: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-FILTER/response.json`
- Mock 后响应: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-FILTER/response.mocked.json`
- Runtime operations:
  - `set data.records`
  - `set data.total`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-FILTER/request.json`
  - 影响匹配字段: `candidate_ids=900001,900002`, `operator_id=6068830`, `page=1`, `page_num=20`
  - 仅用于真实采集字段: `activity_id=7655304206886322458`, `config_id=7655304206886355226`
  - 禁止字段: `author_ids` 未出现在自然 UI 请求中
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-COUPON-REMOVE-FILTER`，requestBody 包含 `candidate_ids/operator_id` 且不包含 `author_ids`，筛选区保留作者ID/操作人且列表刷新。
- Real verify: 后端 ready 后复验真实筛选结果、operator_id 权限范围、分页和排序。
- 验证证据:
  - `mock/real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-FILTER/evidence.json`
  - `mock/apis/apiGetDouPlusCouponRemoveRecord/manifest.json`
  - `mock/apis/apiGetDouPlusCouponRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "records": [
      {
        "record_id": "coupon_remove_filter_record_20260708001",
        "author_info": {
          "author_id": "900001",
          "author_name": "筛选券作者示例"
        },
        "remove_reason": "筛选命中【不激励】规则",
        "operator_id": "6068830",
        "remove_time": 1783516414
      }
    ],
    "total": 1,
    "has_more": false
  }
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: 未命中具体 rule 时必须保持原 BAM 响应。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: 复用当前接口真实请求基线。
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDouPlusCouponRemoveRecord/R-BAM-COUPON-REMOVE-DEFAULT/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: 未命中 `page=1,page_num=20` 且筛选字段缺省的请求返回原响应且不输出成功 mock hit。
- Real verify: 后端 ready 后复验真实分页 no-hit 行为。
- 验证证据:
  - `mock/apis/apiGetDouPlusCouponRemoveRecord/script.mjs`
  - `mock/apis/apiGetDouPlusCouponRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiSearchDeliveryItems
- Method / Path: `GET /api/buyin/admin/content_activity/search_delivery_items`
- Manifest: `apis/apiSearchDeliveryItems/manifest.json`
- 规则数量: 3
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `activity_id`
  - `config_id`
  - `item_ids`
  - `candidate_pool_type`
  - `page_no`
  - `page_size`

### Rule: R-BAM-MANUAL-SEARCH-HIT
- 覆盖 case_id:
  - `TC-UI-MANUAL-HIT-PAGE`
  - `TC-CELL-MANUAL-HIT-STATUS`
  - `TC-INT-MANUAL-SUBMIT-GUARD`
  - `TC-TRACK-MANUAL-HIT-EXPOSE`
- 变更类型: 新增
- 最终验证: PASS（真实 UI request / response 已捕获；reapply、接口级 verify 和标准 `verify-bam-mock.mjs` 已通过；浏览器自然 UI `[BAM_MOCK_HIT]`、DOM 和截图仍回到 `TC-UI-MANUAL-HIT-PAGE` 关闭）
- UI 落点: 人工提报 Drawer / 手动输入提交
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `item_ids=100001,100002,100003,candidate_pool_type=2,page_no=1,page_size=50`
  - 影响原因: 手动输入作品 ID 决定返回的人工提报行集合；`candidate_pool_type=2` 锁定待发奖池查询；第一页和默认 `page_size=50` 对应当前 Drawer 手动输入提交路径。`activity_id/config_id/session_unix_time` 只用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实响应基础上最小设置 `data.item_info`、`data.total_num`、`data.candidate_num`、`data.has_more`。
- Response key: `data.item_info,total_num,candidate_num,has_more`
- Mock value: 3 条人工提报作品，分别覆盖 `不满足准入门槛`、`命中【不激励】规则` 和可投放保留项；`total_num=3`，`candidate_num=1`，`has_more=false`
- 覆盖场景: 人工提报 Drawer 手动输入命中态、summary、`一键移除`、`导出剔除明细`、红字行态和提交 guard 前置可见态。
- 真实响应: `real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/response.json`
- Mock 后响应: `real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/response.mocked.json`
- Runtime operations:
  - `set data.item_info`
  - `set data.total_num`
  - `set data.candidate_num`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/request.json`
  - 影响匹配字段: `item_ids=100001,100002,100003`, `candidate_pool_type=2`, `page_no=1`, `page_size=50`
  - 仅用于真实采集字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `session_unix_time=1783520153`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-MANUAL-SEARCH-HIT`，requestBody 包含 `item_ids/candidate_pool_type/page_no/page_size`；Drawer 显示 summary、`一键移除`、`导出剔除明细`、`不满足准入门槛` 和 `命中【不激励】规则` 行态。
- Real verify: 后端 ready 后复验真实人工提报 `search_delivery_items` 是否返回 `if_not_incentive/not_incentive_reason` 及 mixed 命中态。
- 验证证据:
  - `mock/real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/evidence.json`
  - `mock/apis/apiSearchDeliveryItems/manifest.json`
  - `mock/apis/apiSearchDeliveryItems/script.mjs`
  - `mock/apis/apiSearchDeliveryItems/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "item_info": [
      {
        "item_card": {
          "item_model": {
            "item_id": "100001"
          }
        },
        "if_satisfy_delivery_rules": false,
        "if_not_incentive": false,
        "not_incentive_reason": []
      },
      {
        "item_card": {
          "item_model": {
            "item_id": "100002"
          }
        },
        "if_satisfy_delivery_rules": true,
        "if_not_incentive": true,
        "not_incentive_reason": [
          "历史违规命中不激励规则"
        ]
      },
      {
        "item_card": {
          "item_model": {
            "item_id": "100003"
          }
        },
        "if_satisfy_delivery_rules": true,
        "if_not_incentive": false,
        "not_incentive_reason": []
      }
    ],
    "total_num": 3,
    "candidate_num": 1,
    "has_more": false
  }
}
~~~

### Rule: R-BAM-SEARCH-CANDIDATE-COIN-PENALTY
- 覆盖 case_id:
  - `TC-INT-AWARD-COIN-PENALTY__search_candidate_restore`
  - `TC-INT-AWARD-COIN-RELIEVED__search_candidate_restore`
- 变更类型: 新增
- 最终验证: PASS（接口级 `verify.mjs`、全量 `reapply-bam-mocks.mjs --apply` 和标准 `verify-bam-mock.mjs` 已通过；业务 UI 验收仍回到 `TC-INT-AWARD-COIN-PENALTY` 与 `TC-INT-AWARD-COIN-RELIEVED` 各自独立取证）
- UI 落点: DOU+币奖励投放 / SearchCandidate 候选列表 / penalty setup 前置样本恢复 / relieved success 分支样本恢复
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `activity_id=7655304206886322458,config_id=7655304206886338842,candidate_pool_type=1,page_no=1,page_size=50`
  - 影响原因: 当前 active case reload 后 SearchCandidate 自然请求可达但返回 `code=10001602`，需要只恢复当前活动和配置一的候选行，避免粗匹配其它活动或配置；`publish_start_time/publish_end_time/session_unix_time` 只用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口保留真实失败基线，再最小设置 `st/code/msg/data.total_num/data.candidate_num/data.item_info/data.has_more`，恢复 penalty candidate `7655364163166869874` 与 relieved candidate `700002` 两行。
- Response key: `st,code,msg,data.total_num,data.candidate_num,data.item_info,data.has_more`
- Mock value: 2 条 DOU+币可投放候选；第 1 行 penalty candidate `7655364163166869874`，`rank=1`，刻意不包含 `delivery_config.effective_time`；第 2 行 relieved candidate `700002`，`rank=2`，预填 `delivery_config.effective_time=1783656000`。
- 覆盖场景: 恢复 `TC-INT-AWARD-COIN-PENALTY` 的 penalty 候选行以便继续真实 UI `修改配置/保存` 前置动作；同时恢复 `TC-INT-AWARD-COIN-RELIEVED` 的 relieved 候选行以便自然 UI 单选第 2 行并触发 success 发奖分支。该 rule 不替代 setup 保存 marker、最终发奖 marker、真实治理处罚/解除状态或持久化。
- 真实响应: `real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/response.json`
- Mock 后响应: `real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/response.mocked.json`
- Runtime operations:
  - `set st`
  - `set code`
  - `set msg`
  - `set data.total_num`
  - `set data.candidate_num`
  - `set data.item_info`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/request.json`
  - 影响匹配字段: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `candidate_pool_type=1`, `page_no=1`, `page_size=50`
  - 仅用于真实采集字段: `publish_start_time=1782403200`, `publish_end_time=1783526399`, `session_unix_time=1783565669`
- 响应合同: `real_browser_request`（真实响应是业务失败基线，非真实成功合同；mock 只做 MOCK_PREVIEW 样本恢复）
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-SEARCH-CANDIDATE-COIN-PENALTY`；mockedResponse 必须包含 penalty candidate `7655364163166869874` 与 relieved candidate `700002` 两行；penalty 行不得预填 `delivery_config.effective_time`，relieved 行必须预填 `delivery_config.effective_time=1783656000`；后续必须回到各自 case 的自然 UI 发奖路径采集写接口 marker。
- Real verify: 后端 ready 后复验真实 SearchCandidate 列表、真实 `delivery_modify_save` 持久化、真实治理处罚状态和最终发奖事务一致性。
- 验证证据:
  - `mock/real-connect/apiSearchDeliveryItems/R-BAM-SEARCH-CANDIDATE-COIN-PENALTY/evidence.json`
  - `mock/apis/apiSearchDeliveryItems/manifest.json`
  - `mock/apis/apiSearchDeliveryItems/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`
  - `node artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/verify.mjs`: PASS
  - `node .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs --mock-root artifacts/7306602080-incentive-control-online/mock --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api --apply`: PASS
  - `node .trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs --manifest artifacts/7306602080-incentive-control-online/mock/apis/apiSearchDeliveryItems/manifest.json --rule-map artifacts/7306602080-incentive-control-online/mock/rule-map.json --bam-root meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/bam/ecom.buyin.admin_api`: PASS

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "",
  "data": {
    "item_info": [
      {
        "item_card": {
          "item_model": {
            "item_id": "7655364163166869874"
          }
        },
        "if_delivery": true,
        "delivery_config": {
          "delivery_amount": 5000,
          "delivery_duration": 7200,
          "target_likes": 44,
          "target_audience": 1
        },
        "if_satisfy_delivery_rules": true,
        "rank": 1,
        "if_not_incentive": false,
        "not_incentive_reason": []
      },
      {
        "item_card": {
          "item_model": {
            "item_id": "700002"
          }
        },
        "if_delivery": true,
        "delivery_config": {
          "delivery_amount": 5000,
          "delivery_duration": 7200,
          "target_likes": 44,
          "target_audience": 1,
          "effective_time": 1783656000
        },
        "if_satisfy_delivery_rules": true,
        "rank": 2,
        "if_not_incentive": false,
        "not_incentive_reason": []
      }
    ],
    "total_num": 2,
    "candidate_num": 2,
    "has_more": false
  }
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS（与新增 SearchCandidate rule 一起重跑接口级 verify 和标准审核通过）
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: 未命中具体人工提报搜索 rule 或当前 SearchCandidate 恢复 rule 时必须保持原 BAM 响应。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: 复用 `R-BAM-MANUAL-SEARCH-HIT` 真实请求基线。
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整自然请求: `real-connect/apiSearchDeliveryItems/R-BAM-MANUAL-SEARCH-HIT/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: 未命中人工提报 mixed hit 或当前 SearchCandidate 恢复 matcher 的请求返回原响应且不输出成功 mock hit。
- Real verify: 后端 ready 后复验其它人工提报搜索条件和其它 SearchCandidate 配置 no-hit 行为。
- 验证证据:
  - `mock/apis/apiSearchDeliveryItems/script.mjs`
  - `mock/apis/apiSearchDeliveryItems/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiGetDeliveryItemsFromSheet
- Method / Path: `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet`
- Manifest: `apis/apiGetDeliveryItemsFromSheet/manifest.json`
- 规则数量: 4
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `sheet_url`

### Rule: R-BAM-BATCH-SHEET-HIT
- 覆盖 case_id:
  - `TC-UI-BATCH-HIT-REUSE`
- 变更类型: 新增
- 最终验证: PASS（已采集自然 UI request / failure response；接口级 verify、BAM marker patch、全量 reapply 和标准 `verify-bam-mock.mjs` 均通过；自然 UI mock-hit 复验仍回到 `TC-UI-BATCH-HIT-REUSE` 独立关闭）
- UI 落点: 人工提报 Drawer / 批量上传提交
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`
  - 影响原因: 批量上传 sheet URL 决定后端解析的数据行集合；本 rule 只覆盖当前 case 的稳定 sheet 样本，避免任意 sheet URL 被 mock；`activity_id/config_id` 只用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实失败响应基础上最小设置 success shell 和 `data.item_info`、`data.total_num`、`data.candidate_num`、`data.has_more`。
- Response key: `st,code,msg,data.item_info,total_num,candidate_num,has_more`
- Mock value: 3 条批量上传作品，分别覆盖 `不满足准入门槛`、`命中【不激励】规则` 和可投放保留项；`total_num=3`，`candidate_num=1`，`has_more=false`
- 覆盖场景: 批量上传 Drawer baseline、summary、红字行态、提交 guard，作为后续批量一键移除与导出前置可见态。
- 真实响应: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.json`
- Mock 后响应: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/response.mocked.json`
- Runtime operations:
  - `set st`
  - `set code`
  - `set msg`
  - `set data`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/request.json`
  - 影响匹配字段: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`
  - 仅用于真实采集字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`
- 响应合同: `real_browser_request`（自然 response 是业务校验失败基线，不声明为真实成功合同；成功字段来源由 generated type 与 store/render 消费链路限定）
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-BATCH-SHEET-HIT`，requestBody 包含目标 `sheet_url`；Drawer 显示批量上传 summary、`一键移除`、`导出剔除明细`、`不满足准入门槛` 和 `命中【不激励】规则` 行态，且不新增独立 unsupported UI。
- Real verify: 后端 ready 后复验真实可访问 sheet 的 `code=0` 响应、`if_not_incentive/not_incentive_reason` 字段来源、sheet 权限和模板格式。
- 验证证据:
  - `verify-logs/evidence/TC-UI-BATCH-HIT-REUSE--natural-failure-runtime.json`
  - `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/evidence.json`
  - `mock/apis/apiGetDeliveryItemsFromSheet/manifest.json`
  - `mock/apis/apiGetDeliveryItemsFromSheet/script.mjs`
  - `mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "item_info": [
      {
        "item_card": {
          "item_model": {
            "item_id": "200001"
          }
        },
        "if_satisfy_delivery_rules": false,
        "if_not_incentive": false,
        "not_incentive_reason": []
      },
      {
        "item_card": {
          "item_model": {
            "item_id": "200002"
          }
        },
        "if_satisfy_delivery_rules": true,
        "if_not_incentive": true,
        "not_incentive_reason": [
          "历史违规命中不激励规则"
        ]
      },
      {
        "item_card": {
          "item_model": {
            "item_id": "200003"
          }
        },
        "if_satisfy_delivery_rules": true,
        "if_not_incentive": false,
        "not_incentive_reason": []
      }
    ],
    "total_num": 3,
    "candidate_num": 1,
    "has_more": false
  }
}
~~~

### Rule: R-BAM-BATCH-SHEET-AWARD-TIMEOUT
- 覆盖 case_id:
  - `TC-INT-AWARD-TIMEOUT__batch_sheet_setup`
- 变更类型: 新增
- 最终验证: PASS（已采集自然 UI request / failure response；接口级 verify、BAM marker patch、全量 reapply 和标准 `verify-bam-mock.mjs` 均通过；业务 UI mock-hit 与最终发奖 timeout 断言仍回到 `TC-INT-AWARD-TIMEOUT` 独立取证）
- UI 落点: 人工提报 Drawer / 批量上传提交 / timeout setup
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `sheet_url=https://bytedance.larkoffice.com/sheets/award-timeout-7306602080`
  - 影响原因: timeout case 需要独立上传名单样本返回 `item_id=700003`，不能改写已闭合的 `R-BAM-BATCH-SHEET-HIT`；`activity_id/config_id` 只用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实失败响应基础上最小设置 success shell 和单条可投放作品 `700003`。
- Response key: `st,code,msg,data.item_info,total_num,candidate_num,has_more`
- Mock value: 1 条可投放 DOU+币作品，`item_id=700003`，`candidate_num=1`，`has_more=false`
- 覆盖场景: `TC-INT-AWARD-TIMEOUT` 的上传名单前置状态，使后续最终发奖 request 自然携带 `delivery_list[0].item_id=700003`。
- 真实响应: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.json`
- Mock 后响应: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/response.mocked.json`
- Runtime operations:
  - `set st`
  - `set code`
  - `set msg`
  - `set data`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/request.json`
  - 影响匹配字段: `sheet_url=https://bytedance.larkoffice.com/sheets/award-timeout-7306602080`
  - 仅用于真实采集字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`
- 响应合同: `real_browser_request`（自然 response 是业务校验失败基线，不声明为真实成功合同；success shell 和 `700003` 样本只服务 MOCK_PREVIEW 前置状态）
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-BATCH-SHEET-AWARD-TIMEOUT`；后续 final award request 必须自然携带 `delivery_from=2` 和 `delivery_list[0].item_id=700003`。
- Real verify: 后端 ready 后复验真实可访问 sheet 的 `code=0` 响应和可投放作品字段来源；真实 timeout 链路由 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT` 与联调复验覆盖。
- 验证证据:
  - `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-TIMEOUT/evidence.json`
  - `mock/apis/apiGetDeliveryItemsFromSheet/manifest.json`
  - `mock/apis/apiGetDeliveryItemsFromSheet/script.mjs`
  - `mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "item_info": [
      {
        "item_card": {
          "item_model": {
            "item_id": "700003"
          }
        },
        "if_delivery": true,
        "if_satisfy_delivery_rules": true,
        "if_not_incentive": false,
        "not_incentive_reason": []
      }
    ],
    "total_num": 1,
    "candidate_num": 1,
    "has_more": false
  },
  "st": 0,
  "code": 0,
  "msg": ""
}
~~~

### Rule: R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST
- 覆盖 case_id:
  - `TC-INT-AWARD-EMPTY-LIST__batch_sheet_setup`
- 变更类型: 新增
- 最终验证: PASS（已采集自然 UI request / failure response；接口级 verify、BAM marker patch、全量 reapply 和标准 `verify-bam-mock.mjs` 均通过；业务 UI mock-hit 与最终 no-call/no-success 断言仍回到 `TC-INT-AWARD-EMPTY-LIST` 独立取证）
- UI 落点: 人工提报 Drawer / 批量上传提交 / empty-list setup
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `sheet_url=https://bytedance.larkoffice.com/sheets/award-empty-list-7306602080`
  - 影响原因: empty-list case 需要独立上传名单样本返回 `if_delivery=false` 且非命中态作品 `item_id=700004`，不能改写已闭合的 batch-hit 或 timeout rule；`activity_id/config_id` 只用于真实采集，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实失败响应基础上最小设置 success shell 和单条 `if_delivery=false`、`if_satisfy_delivery_rules=true`、`if_not_incentive=false` 的 DOU+币作品 `700004`。
- Response key: `st,code,msg,data.item_info,total_num,candidate_num,has_more`
- Mock value: 1 条非有效投放 DOU+币作品，`item_id=700004`，`if_delivery=false`，`candidate_num=0`，`has_more=false`
- 覆盖场景: `TC-INT-AWARD-EMPTY-LIST` 的上传名单前置状态，使 Drawer 物理列表非空且无命中提示，并由 Modal 过滤得到空 `delivery_list`；最终 case pass 必须证明不调用 `apiDeliveryDouPlusCoin`。
- 真实响应: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.json`
- Mock 后响应: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/response.mocked.json`
- Runtime operations:
  - `set st`
  - `set code`
  - `set msg`
  - `set data`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/request.json`
  - 影响匹配字段: `sheet_url=https://bytedance.larkoffice.com/sheets/award-empty-list-7306602080`
  - 仅用于真实采集字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`
- 响应合同: `real_browser_request`（自然 response 是业务校验失败基线，不声明为真实成功合同；success shell 和 `700004` 样本只服务 MOCK_PREVIEW 前置状态）
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]` 且 ruleId=`R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST`；Drawer 物理列表非空且无命中提示；投放 Modal 显示本次共投放 0 个作品；点击 Modal 确定后不得出现 `apiDeliveryDouPlusCoin` marker、真实 XHR/fetch 或提交成功 toast。
- Real verify: 后端 ready 后用真实 sheet / 真实治理剔除样本复验后端是否能自然返回空有效名单；真实发奖事务状态仍需 real verify。
- 验证证据:
  - `mock/real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST/evidence.json`
  - `mock/apis/apiGetDeliveryItemsFromSheet/manifest.json`
  - `mock/apis/apiGetDeliveryItemsFromSheet/script.mjs`
  - `mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "item_info": [
      {
        "item_card": {
          "item_model": {
            "item_id": "700004"
          },
          "item_author_info": {
            "author_id": "970004"
          }
        },
        "if_delivery": false,
        "if_satisfy_delivery_rules": true,
        "if_not_incentive": false,
        "not_incentive_reason": []
      }
    ],
    "total_num": 1,
    "candidate_num": 0,
    "has_more": false
  },
  "st": 0,
  "code": 0,
  "msg": ""
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: 未命中目标 `sheet_url` 时必须保持原 BAM 响应。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: 复用 `R-BAM-BATCH-SHEET-HIT` 自然请求基线。
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整自然请求: `real-connect/apiGetDeliveryItemsFromSheet/R-BAM-BATCH-SHEET-HIT/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: 未命中目标 `sheet_url` 的请求返回原响应且不输出 `R-BAM-BATCH-SHEET-HIT` mock hit。
- Real verify: 后端 ready 后复验其它 sheet URL no-hit 行为。
- 验证证据:
  - `mock/apis/apiGetDeliveryItemsFromSheet/script.mjs`
  - `mock/apis/apiGetDeliveryItemsFromSheet/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiCandidateRemove
- Method / Path: `POST /api/buyin/admin/content_activity/candidate_remove`
- Manifest: `apis/apiCandidateRemove/manifest.json`
- 规则数量: 4
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `remove_candidates.0.remove_reason`
  - `remove_candidates.1.remove_reason`

### Rule: R-BAM-CANDIDATE-REMOVE-SUCCESS
- 覆盖 case_id:
  - `TC-INT-MANUAL-ONE-CLICK-REMOVE`
  - `TC-INT-BATCH-ONE-CLICK-REMOVE`
- 变更类型: 新增
- 最终验证: PASS（接口级 reapply、补充 verify 与标准 `verify-bam-mock.mjs` 均已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: 人工提报 Drawer / 一键移除
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `remove_candidates.0.remove_reason=手动移除,remove_candidates.1.remove_reason=命中【不激励】规则`
  - 影响原因: 两类命中行必须分别以 `手动移除` 和 `命中【不激励】规则` 进入移除 payload；`activity_id/config_id/candidate_id` 仅用于请求审计，不参与 matcher。
- Mock 规则: 命中后不发送真实后端写接口，返回标记的 synthetic success response `{st:0,code:0,msg:"success"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response
- Mock value: `{st:0,code:0,msg:"success"}`
- 覆盖场景: 人工提报一键移除当前 active case；同 rule 供后续批量上传一键移除 case 独立取证复用。
- 真实响应: N/A（synthetic_contract，写接口安全原因不发送真实后端）
- Mock 后响应: `real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/request.json`
  - 影响匹配字段: `remove_candidates.0.remove_reason=手动移除`, `remove_candidates.1.remove_reason=命中【不激励】规则`
  - 仅用于采集/审计字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `candidate_id=100001/100002`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后命中行消失、合法行保留，不出现 batch submit modal 或 fake award success。
- Real verify: 后端 ready 后复验真实 candidate_remove 持久化、失败 msg、候选池刷新和剔除明细记录。
- 验证证据:
  - `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-SUCCESS/evidence.json`
  - `mock/apis/apiCandidateRemove/manifest.json`
  - `mock/apis/apiCandidateRemove/script.mjs`
  - `mock/apis/apiCandidateRemove/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "success"
}
~~~

### Rule: R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT
- 覆盖 case_id:
  - `TC-INT-MANUAL-ONE-CLICK-REMOVE__negative_assertion`
- 变更类型: 新增
- 最终验证: PASS（接口级 reapply、补充 verify 与标准 `verify-bam-mock.mjs` 均已通过；verify case 必须回到自然 UI 失败路径独立取证）
- UI 落点: 人工提报 Drawer / 一键移除 / negative_assertion
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `remove_candidates.0.remove_reason=手动移除,remove_candidates.1.remove_reason=__BAM_MOCK_ABSENT__`
  - 影响原因: 失败路径通过自然 UI 先手动移除一条命中行，剩余单命中请求必须与双命中 success rule 拆分，避免多 rule 命中；`activity_id/config_id/candidate_id` 仅用于请求审计，不参与 matcher。
- Mock 规则: 命中后不发送真实后端写接口，返回标记的 synthetic failure response `{st:1,code:1,msg:"一键移除失败"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response
- Mock value: `{st:1,code:1,msg:"一键移除失败"}`
- 覆盖场景: `TC-INT-MANUAL-ONE-CLICK-REMOVE` 当前 active case 的 negative_assertion：API 失败不得移除行，其他行不变。
- 真实响应: N/A（synthetic_contract，写接口安全原因不发送真实后端）
- Mock 后响应: `real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/request.json`
  - 影响匹配字段: `remove_candidates.0.remove_reason=手动移除`, `remove_candidates.1.remove_reason=__BAM_MOCK_ABSENT__`
  - 仅用于采集/审计字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `candidate_id=100001`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后剩余命中行与合法行保持可见，出现失败提示，不出现 batch submit modal 或 fake award success。
- Real verify: 后端 ready 后复验真实 candidate_remove 失败码、失败 msg、列表不变和剔除明细无新增记录。
- 验证证据:
  - `mock/real-connect/apiCandidateRemove/R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT/evidence.json`
  - `mock/apis/apiCandidateRemove/manifest.json`
  - `mock/apis/apiCandidateRemove/script.mjs`
  - `mock/apis/apiCandidateRemove/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "st": 1,
  "code": 1,
  "msg": "一键移除失败"
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；no-hit 写请求不得用于当前 case closure。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiCandidateRemove/DEFAULT_NOOP/response.json`（结构性 artifact，不作为真实后端证据）
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiCandidateRemove/DEFAULT_NOOP/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-MANUAL-ONE-CLICK-REMOVE`。
- Real verify: 后端 ready 后复验其它 candidate_remove no-hit / error 行为。
- 验证证据:
  - `mock/apis/apiCandidateRemove/script.mjs`
  - `mock/apis/apiCandidateRemove/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiDownloadContentRemoveRecord
- Method / Path: `POST /api/buyin/admin/content_activity/download_content_remove_record`
- Manifest: `apis/apiDownloadContentRemoveRecord/manifest.json`
- 规则数量: 2
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `records.0.remove_reason`
  - `records.1.remove_reason`

### Rule: R-BAM-DOWNLOAD-REMOVE-RECORD
- 覆盖 case_id:
  - `TC-INT-MANUAL-EXPORT`
  - `TC-INT-BATCH-EXPORT`
- 变更类型: 新增
- 最终验证: PASS（接口级 reapply、补充 verify 与标准 `verify-bam-mock.mjs` 均已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: 人工提报 Drawer / 导出剔除明细
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `records.0.remove_reason=手动移除,records.1.remove_reason=命中【不激励】规则`
  - 影响原因: 两类待剔除记录必须分别以 `手动移除` 和 `命中【不激励】规则` 进入导出 payload；`author_id/item_id/item_name/penalty_reason` 用于请求审计，不参与 matcher；可发奖记录 `100003` 必须保持 excluded negative control。
- Mock 规则: 命中后不依赖真实 Feishu 明细表生成链路，返回标记的 synthetic success response `{st:0,code:0,msg:"success",data:{lark_url:"https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080"}}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `data.lark_url`
- Mock value: `data.lark_url=https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080`
- 覆盖场景: `TC-INT-MANUAL-EXPORT` 当前 active case；同 rule 供后续 `TC-INT-BATCH-EXPORT` 独立取证复用。
- 真实响应: N/A（synthetic_contract，外部 Feishu 资源生成链路不在 MOCK_PREVIEW 中发送真实后端）
- Mock 后响应: `real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/request.json`
  - 影响匹配字段: `records.0.remove_reason=手动移除`, `records.1.remove_reason=命中【不激励】规则`
  - 仅用于采集/审计字段: `records.0.author_id=900001`, `records.0.item_id=100001`, `records.0.item_name=人工提报准入失败作品`, `records.1.author_id=900002`, `records.1.item_id=100002`, `records.1.item_name=人工提报不激励命中作品`, `records.1.penalty_reason=历史违规命中不激励规则`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后 request 只包含剔除 records，不包含可发奖记录 `100003`，并打开返回的 `lark_url`。
- Real verify: 后端 ready 后复验真实 Feishu 表格权限、操作人来源、字段完整性和真实 `lark_url` 可访问性。
- 验证证据:
  - `mock/real-connect/apiDownloadContentRemoveRecord/R-BAM-DOWNLOAD-REMOVE-RECORD/evidence.json`
  - `mock/apis/apiDownloadContentRemoveRecord/manifest.json`
  - `mock/apis/apiDownloadContentRemoveRecord/script.mjs`
  - `mock/apis/apiDownloadContentRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "success",
  "data": {
    "lark_url": "https://bytedance.larkoffice.com/sheets/mock_content_remove_record_7306602080"
  }
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；no-hit 下载请求不得用于当前 case closure。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiDownloadContentRemoveRecord/DEFAULT_NOOP/response.json`（结构性 artifact，不作为真实 Feishu 后端证据）
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiDownloadContentRemoveRecord/DEFAULT_NOOP/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-MANUAL-EXPORT`。
- Real verify: 后端 ready 后复验其它 download_content_remove_record no-hit / error 行为。
- 验证证据:
  - `mock/apis/apiDownloadContentRemoveRecord/script.mjs`
  - `mock/apis/apiDownloadContentRemoveRecord/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiDeliveryModifySave
- Method / Path: `POST /api/buyin/admin/content_activity/delivery_modify_save`
- Manifest: `apis/apiDeliveryModifySave/manifest.json`
- 规则数量: 2
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `candidate_ids.0`
  - `if_delivery`

### Rule: R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE
- 覆盖 case_id:
  - `TC-INT-AWARD-COIN-PENALTY__setup_effective_time`
- 变更类型: 新增
- 最终验证: PASS（全量 reapply、接口级补充 verify 和标准 `verify-bam-mock.mjs` 已通过；必须回到自然 UI `修改配置/保存` 取证，不能直接关闭发奖 case）
- UI 落点: DOU+币奖励投放 / 第 1 个候选 / 修改配置 Drawer
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `candidate_ids.0=7655364163166869874,if_delivery=true`
  - 影响原因: 当前 verify 页面 50 个 DOU+币 SearchCandidate 候选均缺 `delivery_config.effective_time`；只允许第 1 个自然候选的发奖配置保存命中 synthetic success。`activity_id/config_id/session_unix_time/item_modify_config.*` 用于 payload 审计，不参与 matcher。
- Mock 规则: 命中后不发送真实后端配置保存写请求，返回标记的 synthetic success response `{st:0,code:0,msg:"success"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `{st:0,code:0,msg:"success"}`
- 覆盖场景: `TC-INT-AWARD-COIN-PENALTY` 的 UI 条件自动补齐前置动作；最终发奖 penalty 仍由 `apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY` 独立验证。
- 真实响应: N/A（synthetic_contract，写接口不在 MOCK_PREVIEW 中发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/request.json`
  - 影响匹配字段: `candidate_ids.0=7655364163166869874`, `if_delivery=true`
  - 仅用于采集/审计字段: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `session_unix_time=<运行态实际值>`, `item_modify_config.delivery_amount=5000`, `item_modify_config.delivery_duration=7200`, `item_modify_config.target_likes=44`, `item_modify_config.target_audience=1`, `item_modify_config.effective_time=1783648800`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 保存后第 1 个候选显示非空 `投放生效时间`，然后回到最终发奖 Modal `确定` 验证 penalty rule。
- Real verify: 后端 ready 后复验真实 `delivery_modify_save` 持久化、权限、失败 msg、候选池刷新和发奖提交前置条件。
- 验证证据:
  - `mock/real-connect/apiDeliveryModifySave/R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE/evidence.json`
  - `mock/apis/apiDeliveryModifySave/manifest.json`
  - `mock/apis/apiDeliveryModifySave/script.mjs`
  - `mock/apis/apiDeliveryModifySave/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "success"
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS（结构性 default fallback 已随接口级 verify 和标准 `verify-bam-mock.mjs` 审核；DEFAULT_NOOP 不得用于关闭当前写接口 case）
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；no-hit 写请求不得用于当前 case closure。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiDeliveryModifySave/DEFAULT_NOOP/response.json`（结构性 artifact，不作为真实后端证据）
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiDeliveryModifySave/DEFAULT_NOOP/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-AWARD-COIN-PENALTY`。
- Real verify: 后端 ready 后复验其它 delivery_modify_save no-hit / error 行为。
- 验证证据:
  - `mock/apis/apiDeliveryModifySave/script.mjs`
  - `mock/apis/apiDeliveryModifySave/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiDeliveryDouPlusCoin
- Method / Path: `POST /api/buyin/admin/content_activity/delivery_dou_plus_coin`
- Manifest: `apis/apiDeliveryDouPlusCoin/manifest.json`
- 规则数量: 3
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `delivery_from`
  - `delivery_items.0.candidate_id`
  - `delivery_list.0.item_id`

### Rule: R-BAM-AWARD-COIN-PENALTY
- 覆盖 case_id:
  - `TC-INT-AWARD-COIN-PENALTY`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: DOU+币奖励投放 / 发奖按钮 / 投放奖励 Modal
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `delivery_from=1,delivery_items.0.candidate_id=7655364163166869874`
  - 影响原因: `delivery_from=1` 区分页面筛选候选发奖路径；自然 UI 当前 DOU+币 SearchCandidate 样本 candidate_id=`7655364163166869874` 替代原矩阵占位 `700001`，确保 active verify 点击命中本 penalty rule。`activity_id/config_id/charge_code/session_unix_time/rank` 仅用于请求审计或 schema 保持，不参与 matcher。
- Mock 规则: 命中后不发送真实后端发奖写接口，返回标记的 synthetic non-success response `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `st=1`, `code=10017001`, `msg=命中自然处罚，无法发奖`
- 覆盖场景: `TC-INT-AWARD-COIN-PENALTY` 当前 active case 的 frontend response branch、error message、no success toast、modal no-success close/reset 和候选列表 no auto mutation。
- 真实响应: N/A（synthetic_contract，发奖写接口在 MOCK_PREVIEW 中不发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/request.json`
  - 影响匹配字段: `delivery_from=1`, `delivery_items.0.candidate_id=7655364163166869874`
  - 仅用于采集/审计字段: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `charge_code=charge_code_award_coin_7306602080`, `session_unix_time=1783490000`, `delivery_items.0.rank=1`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后前端展示非成功错误，不出现 `提交成功` toast，不执行成功关闭 / reset，不自动改变候选排序。
- Real verify: 后端 ready 后复验真实自然处罚状态、申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务；mock 不证明真实治理状态或事务一致性。
- 验证证据:
  - `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-PENALTY/evidence.json`
  - `mock/apis/apiDeliveryDouPlusCoin/manifest.json`
  - `mock/apis/apiDeliveryDouPlusCoin/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoin/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`

#### 响应报文
~~~json
{
  "st": 1,
  "code": 10017001,
  "msg": "命中自然处罚，无法发奖"
}
~~~

### Rule: R-BAM-AWARD-COIN-RELIEVED
- 覆盖 case_id:
  - `TC-INT-AWARD-COIN-RELIEVED`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: DOU+币奖励投放 / 发奖按钮 / 投放奖励 Modal
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `delivery_from=1,delivery_items.0.candidate_id=700002`
  - 影响原因: `delivery_from=1` 区分页面筛选候选发奖路径；`candidate_id=700002` 锁定 SearchCandidate mock 中的解除状态候选，避免复用 penalty rule 或落入 DEFAULT_NOOP。`activity_id/config_id/charge_code/session_unix_time/rank` 仅用于请求审计或 schema 保持，不参与 matcher。
- Mock 规则: 命中后不发送真实后端发奖写接口，返回标记的 synthetic success response `{st:0,code:0,msg:"success"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `st=0`, `code=0`, `msg=success`
- 覆盖场景: `TC-INT-AWARD-COIN-RELIEVED` 当前 active case 的 frontend success branch、no governance failure copy、modal success close/reset 和 no candidate deletion 断言。
- 真实响应: N/A（synthetic_contract，发奖写接口在 MOCK_PREVIEW 中不发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/request.json`
  - 影响匹配字段: `delivery_from=1`, `delivery_items.0.candidate_id=700002`
  - 仅用于采集/审计字段: `activity_id=7655304206886322458`, `config_id=7655304206886338842`, `charge_code=charge_code_award_coin_relieved_7306602080`, `session_unix_time=1783568265`, `delivery_items.0.rank=2`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后前端进入成功分支，不展示治理失败文案，不删除候选，不触发真实发奖写请求。
- Real verify: 后端 ready 后复验真实申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务；mock 不证明真实治理状态或事务一致性。
- 验证证据:
  - `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-RELIEVED/evidence.json`
  - `mock/apis/apiDeliveryDouPlusCoin/manifest.json`
  - `mock/apis/apiDeliveryDouPlusCoin/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoin/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "success"
}
~~~

### Rule: R-BAM-AWARD-COIN-TIMEOUT
- 覆盖 case_id:
  - `TC-INT-AWARD-TIMEOUT`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: 人工提报批量上传 / DOU+币奖励投放 / 发奖按钮 / 投放奖励 Modal
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `delivery_from=2,delivery_list.0.item_id=700003`
  - 影响原因: `delivery_from=2` 区分上传名单发奖路径；`item_id=700003` 由 timeout 专用 sheet setup rule 自然生成，锁定当前 timeout response branch。`activity_id/config_id/charge_code/session_unix_time/delivery_config/delivery_reason` 仅用于请求审计或 schema 保持，不参与 matcher。
- Mock 规则: 命中后不发送真实后端发奖写接口，返回标记的 synthetic timeout-like response `{st:1,code:504,msg:"timeout"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `st=1`, `code=504`, `msg=timeout`
- 覆盖场景: `TC-INT-AWARD-TIMEOUT` 当前 active case 的 fixed timeout copy、no success toast、流程暂停和 no real write 断言。
- 真实响应: N/A（synthetic_contract，发奖写接口在 MOCK_PREVIEW 中不发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/request.json`
  - 影响匹配字段: `delivery_from=2`, `delivery_list.0.item_id=700003`
  - 仅用于采集/审计字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `charge_code=charge_code_award_coin_timeout_7306602080`, `session_unix_time=1783578953`, `delivery_list.0.delivery_config`, `delivery_list.0.delivery_reason`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后前端展示固定文案 `治理校验失败，请稍后重试`，不出现成功 toast，不继续成功发奖流程，不触发真实发奖写请求。
- Real verify: 后端 ready 后复验真实 timeout / network timeout 链路、治理接口一致性和最终发奖事务暂停行为；mock 不证明真实 timeout 行为。
- 验证证据:
  - `mock/real-connect/apiDeliveryDouPlusCoin/R-BAM-AWARD-COIN-TIMEOUT/evidence.json`
  - `mock/apis/apiDeliveryDouPlusCoin/manifest.json`
  - `mock/apis/apiDeliveryDouPlusCoin/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoin/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`

#### 响应报文
~~~json
{
  "st": 1,
  "code": 504,
  "msg": "timeout"
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；no-hit 发奖写请求不得用于当前 case closure。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiDeliveryDouPlusCoin/DEFAULT_NOOP/response.json`（结构性 artifact，不作为真实发奖后端证据）
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiDeliveryDouPlusCoin/DEFAULT_NOOP/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-AWARD-COIN-PENALTY`、`TC-INT-AWARD-COIN-RELIEVED` 或 `TC-INT-AWARD-TIMEOUT`。
- Real verify: 后端 ready 后复验其它 delivery_dou_plus_coin no-hit / error / success 行为。
- 验证证据:
  - `mock/apis/apiDeliveryDouPlusCoin/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoin/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiChargeAmountCheck
- Method / Path: `POST /api/buyin/admin/content_activity/charge_amount_check`
- Manifest: `apis/apiChargeAmountCheck/manifest.json`
- 规则数量: 3
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `activity_id`
  - `config_id`
  - `delivery_from`
  - `resource_type`
  - `delivery_list.0.amount`
  - `delivery_list`

### Rule: R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT
- 覆盖 case_id:
  - `TC-INT-AWARD-TIMEOUT__charge_amount_check`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: 人工提报批量上传 / DOU+币奖励投放 / 发奖 Modal / 充值记录金额校验
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `activity_id=7653282555822653742,config_id=7653282555822735662,delivery_from=2,resource_type=5,delivery_list.0.amount=30000`
  - 影响原因: 当前 rule 只解除 timeout 上传名单样本的金额校验前置拦截；`charge_code/session_unix_time` 来自自然 UI 选择和页面会话，只用于请求审计，不参与 matcher。金额校验请求不包含 `item_id`，因此用当前上传名单样本自然携带的 `amount=30000` 收敛。
- Mock 规则: 命中后调用原 `charge_amount_check` 接口，在真实失败响应基础上最小设置 `data.can_delivery=true` 和 `data.left_amount=1900000`，保持 `st=0/code=0/current_use_amount=30000`，使 Modal `确定` 可点击并继续触发最终发奖 timeout safety rule。
- Response key: `data.can_delivery`, `data.left_amount`
- Mock value: `can_delivery=true`, `left_amount=1900000`
- 覆盖场景: `TC-INT-AWARD-TIMEOUT` 当前 active case 的发奖前金额校验前置状态；不替代最终 timeout response branch，不证明真实充值记录余额。
- 真实响应: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.json`
- Mock 后响应: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.mocked.json`
- Runtime operations:
  - `set data.can_delivery`
  - `set data.left_amount`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/request.json`
  - 影响匹配字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `delivery_from=2`, `resource_type=5`, `delivery_list.0.amount=30000`
  - 仅用于真实采集字段: `charge_code=LST12606290003681`, `session_unix_time=1783580153`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]`；requestBody 包含 `delivery_from=2`、`resource_type=5`、`delivery_list[0].amount=30000`；mockedResponse 包含 `data.can_delivery=true` 和 `data.left_amount=1900000`；最终 case 仍必须继续采集 `apiDeliveryDouPlusCoin / R-BAM-AWARD-COIN-TIMEOUT`。
- Real verify: 真实充值记录余额可用后，用自然 UI 复验后端 `can_delivery=true` 和真实 `left_amount`；当前 mock 不证明真实充值记录余额或最终发奖事务。
- 验证证据:
  - `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/evidence.json`
  - `mock/apis/apiChargeAmountCheck/manifest.json`
  - `mock/apis/apiChargeAmountCheck/script.mjs`
  - `mock/apis/apiChargeAmountCheck/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "can_delivery": true,
    "left_amount": 1900000,
    "current_use_amount": 30000
  },
  "st": 0,
  "code": 0,
  "msg": ""
}
~~~

### Rule: R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST
- 覆盖 case_id:
  - `TC-INT-AWARD-EMPTY-LIST__charge_amount_check`
- 变更类型: 新增
- 最终验证: PASS（自然 UI 已捕获 empty-list 金额校验真实请求 / 参数错误响应；接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击 `确定` 采集最终 no-call/no-success 证据）
- UI 落点: 人工提报批量上传 / DOU+币奖励投放 / empty-list 发奖 Modal / 充值记录金额校验
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `activity_id=7653282555822653742,config_id=7653282555822735662,delivery_from=2,resource_type=5,delivery_list=[]`
  - 影响原因: 当前 rule 只解除 empty-list 上传名单样本的金额校验前置拦截；`charge_code/session_unix_time` 来自自然 UI 选择和页面会话，只用于请求审计，不参与 matcher。该 matcher 与 timeout 的 `delivery_list.0.amount=30000` 拆分，避免多 rule 命中。
- Mock 规则: 命中后调用原 `charge_amount_check` 接口，在真实参数错误响应基础上最小设置 success shell、`data.can_delivery=true`、`data.left_amount=1900000`、`data.current_use_amount=0`，只使 Modal `确定` 可点击。
- Response key: `st`, `code`, `msg`, `data.can_delivery`, `data.left_amount`, `data.current_use_amount`
- Mock value: `st=0`, `code=0`, `msg=""`, `can_delivery=true`, `left_amount=1900000`, `current_use_amount=0`
- 覆盖场景: `TC-INT-AWARD-EMPTY-LIST` 当前 active case 的发奖前金额校验前置状态；不替代最终发奖接口、不证明真实充值记录余额、不展示成功发奖 toast。
- 真实响应: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/response.json`
- Mock 后响应: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/response.mocked.json`
- Runtime operations:
  - `set st`
  - `set code`
  - `set msg`
  - `set data.can_delivery`
  - `set data.left_amount`
  - `set data.current_use_amount`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/request.json`
  - 影响匹配字段: `activity_id=7653282555822653742`, `config_id=7653282555822735662`, `delivery_from=2`, `resource_type=5`, `delivery_list=[]`
  - 仅用于真实采集字段: `charge_code=LST12606290003681`, `session_unix_time=1783591836`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]`；requestBody 包含 `delivery_from=2`、`resource_type=5`、`delivery_list=[]`；mockedResponse 包含 `data.can_delivery=true` 和 `data.current_use_amount=0`；最终 case 仍必须继续采集无 `apiDeliveryDouPlusCoin` marker/XHR/fetch 和无成功发奖 toast。
- Real verify: 后端允许 empty `delivery_list` 金额校验或真实充值记录余额可用后，用自然 UI 复验真实 `can_delivery=true`；当前 mock 不证明真实充值记录余额或最终发奖事务。
- 验证证据:
  - `mock/real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST/evidence.json`
  - `mock/apis/apiChargeAmountCheck/manifest.json`
  - `mock/apis/apiChargeAmountCheck/script.mjs`
  - `mock/apis/apiChargeAmountCheck/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "",
  "data": {
    "can_delivery": true,
    "left_amount": 1900000,
    "current_use_amount": 0
  }
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；其它金额校验请求不得被当前 timeout / empty-list 前置 rule 捕获。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/response.json`（当前真实失败基线 artifact）
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiChargeAmountCheck/R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-AWARD-TIMEOUT` 或 `TC-INT-AWARD-EMPTY-LIST`；no-hit 请求必须继续走原金额校验接口。
- Real verify: 后端 ready 后复验其它 charge_amount_check no-hit / error / success 行为。
- 验证证据:
  - `mock/apis/apiChargeAmountCheck/script.mjs`
  - `mock/apis/apiChargeAmountCheck/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiGetDouPlusCouponMakeFailRecord
- Method / Path: `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_make_fail_record`
- Manifest: `apis/apiGetDouPlusCouponMakeFailRecord/manifest.json`
- 规则数量: 2
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `activity_id`
  - `config_id`

### Rule: R-BAM-COUPON-MAKE-FAIL-EXCEPTION
- 覆盖 case_id:
  - `TC-INT-AWARD-EXCEPTION__make_fail_setup`
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: DOU+券配置二 / 制券失败警告
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `activity_id=7655304206886322458,config_id=7655304206886355226`
  - 影响原因: 仅为当前 exception 活动的 DOU+券配置二恢复制券失败重提入口。
- Mock 规则: 调用原 GET 后最小设置 `data.task_list[0].delivery_task_id=fail_coupon_exception_800003`，展示 `点此查看并重新提交`。
- Response key: `data.task_list`
- Mock value: one failed task `delivery_task_id=fail_coupon_exception_800003`
- 覆盖场景: `TC-INT-AWARD-EXCEPTION` 的自然 UI 重提入口。
- 真实响应: `real-connect/apiGetDouPlusCouponMakeFailRecord/R-BAM-COUPON-MAKE-FAIL-EXCEPTION/response.json`
- Mock 后响应: `real-connect/apiGetDouPlusCouponMakeFailRecord/R-BAM-COUPON-MAKE-FAIL-EXCEPTION/response.mocked.json`
- Runtime operations: `set data.task_list`
- 验证断言: 自然 UI 配置二必须命中 `[BAM_MOCK_HIT]` 并展示 `点此查看并重新提交`，但不得触发最终发奖写接口。
- Real verify: 后端 ready 后用真实制券失败任务复验。

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配: `{}`
- Mock 规则: 未命中当前配置二 matcher 时保持原 BAM 响应。
- 验证断言: no-hit 请求不得命中 exception setup rule。

## 接口: apiGetDouPlusCouponDeliveryRecord
- Method / Path: `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_delivery_record`
- Manifest: `apis/apiGetDouPlusCouponDeliveryRecord/manifest.json`
- 规则数量: 2
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `activity_id`
  - `config_id`
  - `delivery_task_id`
  - `page`
  - `page_num`

### Rule: R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION
- 覆盖 case_id:
  - `TC-INT-AWARD-EXCEPTION__delivery_record_setup`
- 变更类型: 新增
- 最终验证: PENDING（待 reapply / supplemental verify / 标准 verify-bam-mock）
- UI 落点: DOU+券配置二 / 重新提交制券抽屉 / 发奖名单
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `activity_id=7655304206886322458,config_id=7655304206886355226,delivery_task_id=fail_coupon_exception_800003,page=1,page_num=20`
  - 影响原因: 只服务 make-fail setup 生成的失败任务，返回作者 `800003`，使最终 DOU+券重提发奖自然构造 `delivery_list[0].item_id=800003`。
- Mock 规则: 不发送真实后端请求，返回 marked synthetic failed author record，runtime 输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `data.records,total,has_more`
- Mock value: `records[0].author_info.author_id=800003`, `records[0].delivery_config.coupon_type=1`, `records[0].delivery_config.coupon_config.freeAmount=5000`
- 覆盖场景: `TC-INT-AWARD-EXCEPTION` 重提抽屉发奖名单 setup。
- 真实响应: N/A（上游 `delivery_task_id` 为 mock setup task；自然 GET 返回 `st/code=10000000 参数错误`，不能作为真实成功合同）
- Mock 后响应: `real-connect/apiGetDouPlusCouponDeliveryRecord/R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiGetDouPlusCouponDeliveryRecord/R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION/request.json`
  - 影响匹配字段: `activity_id`, `config_id`, `delivery_task_id`, `page`, `page_num`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；抽屉发奖名单显示作者 `800003`；不得点击最终提交作为 setup 验证。
- Real verify: 后端 ready 后用真实制券失败任务复验明细记录。
- 验证证据:
  - `mock/real-connect/apiGetDouPlusCouponDeliveryRecord/R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION/evidence.json`
  - `mock/apis/apiGetDouPlusCouponDeliveryRecord/manifest.json`
  - `mock/apis/apiGetDouPlusCouponDeliveryRecord/script.mjs`
  - `mock/apis/apiGetDouPlusCouponDeliveryRecord/verify.mjs`

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配: `{}`
- Mock 规则: 未命中当前失败任务明细 matcher 时保持原 BAM 响应。
- 验证断言: no-hit 请求不得命中 exception setup rule。

## 接口: apiDeliveryDouPlusCoupon
- Method / Path: `POST /api/buyin/admin/content_activity/delivery_dou_plus_coupon`
- Manifest: `apis/apiDeliveryDouPlusCoupon/manifest.json`
- 规则数量: 4
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `delivery_from`
  - `delivery_authors.0.candidate_id`
  - `delivery_list.0.item_id`

### Rule: R-BAM-AWARD-COUPON-PENALTY
- 覆盖 case_id:
  - `TC-INT-AWARD-COUPON-PENALTY`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: DOU+券奖励投放 / 发奖按钮 / 投放奖励 Modal
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `delivery_from=1,delivery_authors.0.candidate_id=800001`
  - 影响原因: `delivery_from=1` 区分页面筛选候选发奖路径；`candidate_id=800001` 锁定 DOU+券 penalty author submit branch。`activity_id/config_id/charge_code/session_unix_time/rank` 仅用于请求审计或 schema 保持，不参与 matcher。
- Mock 规则: 命中后不发送真实后端发奖写接口，返回标记的 synthetic non-success response `{st:1,code:10017001,msg:"命中自然处罚，无法发奖"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `st=1`, `code=10017001`, `msg=命中自然处罚，无法发奖`
- 覆盖场景: `TC-INT-AWARD-COUPON-PENALTY` 当前 active case 的 frontend response branch、error message、no success toast、no fake success 和 no 作品列误塞入券表。
- 真实响应: N/A（synthetic_contract，发奖写接口在 MOCK_PREVIEW 中不发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/request.json`
  - 影响匹配字段: `delivery_from=1`, `delivery_authors.0.candidate_id=800001`
  - 仅用于采集/审计字段: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `charge_code=charge_code_award_coupon_7306602080`, `session_unix_time=1783572400`, `delivery_authors.0.rank=1`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后前端展示非成功错误，不出现 `提交成功` toast，不 fake success，不把作品列塞入券表。
- Real verify: 后端 ready 后复验真实 DOU+券自然处罚状态、申诉解除 / 自主解封解除状态、治理接口一致性和最终发奖事务；mock 不证明真实治理状态或事务一致性。
- 验证证据:
  - `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-PENALTY/evidence.json`
  - `mock/apis/apiDeliveryDouPlusCoupon/manifest.json`
  - `mock/apis/apiDeliveryDouPlusCoupon/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoupon/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`

#### 响应报文
~~~json
{
  "st": 1,
  "code": 10017001,
  "msg": "命中自然处罚，无法发奖"
}
~~~

### Rule: R-BAM-AWARD-COUPON-RELIEVED
- 覆盖 case_id:
  - `TC-INT-AWARD-COUPON-RELIEVED`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 点击独立取证）
- UI 落点: DOU+券奖励投放 / 发奖按钮 / 投放奖励 Modal
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `delivery_from=1,delivery_authors.0.candidate_id=800002`
  - 影响原因: `delivery_from=1` 区分页面筛选候选发奖路径；`candidate_id=800002` 锁定 DOU+券 relieved author submit branch。`activity_id/config_id/charge_code/session_unix_time/rank` 仅用于请求审计或 schema 保持，不参与 matcher。
- Mock 规则: 命中后不发送真实后端发奖写接口，返回标记的 synthetic success response `{st:0,code:0,msg:"success"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `st=0`, `code=0`, `msg=success`
- 覆盖场景: `TC-INT-AWARD-COUPON-RELIEVED` 当前 active case 的 frontend success branch、no governance failure copy 和 no candidate deletion 断言。
- 真实响应: N/A（synthetic_contract，发奖写接口在 MOCK_PREVIEW 中不发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/request.json`
  - 影响匹配字段: `delivery_from=1`, `delivery_authors.0.candidate_id=800002`
  - 仅用于采集/审计字段: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `charge_code=charge_code_award_coupon_relieved_7306602080`, `session_unix_time=1783575400`, `delivery_authors.0.rank=2`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后前端进入 success flow，不出现治理失败文案，不误删候选。
- Real verify: 后端 ready 后复验真实 DOU+券申诉解除 / 自主解封解除状态、券账户一致性、治理接口一致性和最终发奖事务；mock 不证明真实治理状态或事务一致性。
- 验证证据:
  - `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-RELIEVED/evidence.json`
  - `mock/apis/apiDeliveryDouPlusCoupon/manifest.json`
  - `mock/apis/apiDeliveryDouPlusCoupon/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoupon/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`

#### 响应报文
~~~json
{
  "st": 0,
  "code": 0,
  "msg": "success"
}
~~~

### Rule: R-BAM-AWARD-COUPON-EXCEPTION
- 覆盖 case_id:
  - `TC-INT-AWARD-EXCEPTION`
- 变更类型: 新增
- 最终验证: PENDING（待接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs`）
- UI 落点: DOU+券奖励投放 / 重新提交制券抽屉 / 确认提交
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `delivery_from=2,delivery_list.0.item_id=800003`
  - 影响原因: `delivery_from=2` 区分 UploadCandidate 重提路径；`delivery_list.0.item_id=800003` 来自重提抽屉明细记录 `author_info.author_id=800003`。
- Mock 规则: 命中后不发送真实后端发奖写接口，返回标记的 synthetic exception response `{st:1,code:500,msg:"exception"}`，并输出 `[BAM_MOCK_SYNTHETIC_CONTRACT]` 与 `[BAM_MOCK_HIT]`。
- Response key: full synthetic response with `st/code/msg`
- Mock value: `st=1`, `code=500`, `msg=exception`
- 覆盖场景: `TC-INT-AWARD-EXCEPTION` 的 fixed exception copy、no success toast、no success continuation 和 no real write。
- 真实响应: N/A（synthetic_contract，发奖写接口在 MOCK_PREVIEW 中不发送真实后端）
- Mock 后响应: `real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-EXCEPTION/response.json`
- Runtime operations: synthetic response（不调用原接口）
- 真实接口请求:
  - 完整 synthetic request: `real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-EXCEPTION/request.json`
  - 影响匹配字段: `delivery_from=2`, `delivery_list.0.item_id=800003`
  - 仅用于采集/审计字段: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `fail_delivery_task_id=fail_coupon_exception_800003`, `charge_code=charge_code_award_coupon_exception_7306602080`, `session_unix_time=1783586962`
- 响应合同: `synthetic_contract`
- 验证断言: patched BAM 命中后输出 synthetic marker 和 hit marker；自然 UI 点击后展示 `治理校验异常，请联系管理员`，不出现 `提交成功` / `发奖成功`，不进入成功后续流程。
- Real verify: 后端 ready 后复验真实制券失败重提、治理异常响应和最终发券事务一致性。
- 验证证据:
  - `mock/real-connect/apiDeliveryDouPlusCoupon/R-BAM-AWARD-COUPON-EXCEPTION/evidence.json`
  - `mock/apis/apiDeliveryDouPlusCoupon/manifest.json`
  - `mock/apis/apiDeliveryDouPlusCoupon/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoupon/verify.mjs`

#### 响应报文
~~~json
{
  "st": 1,
  "code": 500,
  "msg": "exception"
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；no-hit发奖写请求不得用于当前 case closure。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiDeliveryDouPlusCoupon/DEFAULT_NOOP/response.json`（结构性 artifact，不作为真实发奖后端证据）
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiDeliveryDouPlusCoupon/DEFAULT_NOOP/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-AWARD-COUPON-PENALTY`、`TC-INT-AWARD-COUPON-RELIEVED` 或 `TC-INT-AWARD-EXCEPTION`。
- Real verify: 后端 ready 后复验其它 delivery_dou_plus_coupon no-hit / error / success 行为。
- 验证证据:
  - `mock/apis/apiDeliveryDouPlusCoupon/script.mjs`
  - `mock/apis/apiDeliveryDouPlusCoupon/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

## 接口: apiSearchDeliveryAuthor
- Method / Path: `GET /api/buyin/admin/content_activity/search_delivery_author`
- Manifest: `apis/apiSearchDeliveryAuthor/manifest.json`
- 规则数量: 2
- 默认规则: `DEFAULT_NOOP`
- 影响请求字段:
  - `activity_id`
  - `config_id`
  - `candidate_pool_type`
  - `award_period`
  - `page_no`
  - `page_size`

### Rule: R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY
- 覆盖 case_id:
  - `TC-INT-AWARD-COUPON-PENALTY__search_candidate_restore`
  - `TC-INT-AWARD-COUPON-RELIEVED__search_candidate_restore`
- 变更类型: 新增
- 最终验证: PASS（接口级补充 verify、全量 reapply 和标准 `verify-bam-mock.mjs` 已通过；verify case 必须回到自然 UI 独立取证）
- UI 落点: DOU+券奖励投放 / 配置二 / 作者候选列表
- 请求匹配:
  - 类型: 关键影响字段
  - key/value: `activity_id=7655304206886322458,config_id=7655304206886355226,candidate_pool_type=1,award_period=1,page_no=1,page_size=50`
  - 影响原因: 当前 rule 只恢复 DOU+券配置二的 InRank 首屏作者候选；`publish_start_time/publish_end_time/session_unix_time` 来自自然请求但会随页面会话变化，不参与 matcher。
- Mock 规则: 命中后调用原接口，在真实空响应基础上最小设置 `st=0`、`code=0`、`msg=""`、`data.total_num=2`、`data.candidate_num=2`、`data.delivery_author_info` 为可投放作者 `800001` / `800002` 两行、`data.has_more=false`，并输出 `[BAM_MOCK_HIT]`。
- Response key: `st/code/msg/data.total_num/data.candidate_num/data.delivery_author_info/data.has_more`
- Mock value: 2 条 DOU+券可投放作者候选，`author_info.author_id=800001` / `800002`，`if_delivery=true`，`rank=1/2`，均带完整券配置和领用 / 使用有效期。
- 覆盖场景: 恢复 `TC-INT-AWARD-COUPON-PENALTY` 与 `TC-INT-AWARD-COUPON-RELIEVED` 的前置候选作者，使自然 UI 可勾选作者并继续触发最终 `apiDeliveryDouPlusCoupon` 写接口 safety rule。
- 真实响应: `real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.json`
- Mock 后响应: `real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.mocked.json`
- Runtime operations:
  - `set st`
  - `set code`
  - `set msg`
  - `set data.total_num`
  - `set data.candidate_num`
  - `set data.delivery_author_info`
  - `set data.has_more`
- 真实接口请求:
  - 完整自然请求: `real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/request.json`
  - 影响匹配字段: `activity_id=7655304206886322458`, `config_id=7655304206886355226`, `candidate_pool_type=1`, `award_period=1`, `page_no=1`, `page_size=50`
  - 仅用于真实采集字段: `publish_start_time=1783440000`, `publish_end_time=1783526399`, `session_unix_time=1783573124`
- 响应合同: `real_browser_request`
- 验证断言: patched BAM 命中后输出 `[BAM_MOCK_HIT]`；页面渲染作者 `800001` / `800002` 且 checkbox 可选；自然 UI 选择对应作者后，最终发奖请求必须由 `apiDeliveryDouPlusCoupon` 分别生成 `delivery_authors.0.candidate_id=800001` / `800002`。
- Real verify: 后端 ready 后复验真实非空 DOU+券作者候选列表、`if_delivery`、`delivery_config`、`rank` 与最终发奖 request 字段来源。
- 验证证据:
  - `mock/real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/evidence.json`
  - `mock/apis/apiSearchDeliveryAuthor/manifest.json`
  - `mock/apis/apiSearchDeliveryAuthor/script.mjs`
  - `mock/apis/apiSearchDeliveryAuthor/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

#### 响应报文
~~~json
{
  "data": {
    "total_num": 2,
    "candidate_num": 2,
    "delivery_author_info": [
      {
        "author_info": {
          "author_id": "800001",
          "author_name": "券候选作者800001"
        },
        "if_delivery": true,
        "rank": 1
      },
      {
        "author_info": {
          "author_id": "800002",
          "author_name": "券解除作者800002"
        },
        "if_delivery": true,
        "rank": 2
      }
    ],
    "has_more": false
  },
  "st": 0,
  "code": 0,
  "msg": ""
}
~~~

### Rule: DEFAULT_NOOP
- 覆盖 case_id: N/A
- 变更类型: 新增
- 最终验证: PASS
- UI 落点: no-hit 默认规则
- 请求匹配:
  - 类型: 默认规则
  - key/value: `{}`
  - 影响原因: manifest 必须存在唯一默认规则；其它作者候选查询不得被当前 case 样本捕获。
- Mock 规则: 返回原响应，不做 response 改写。
- Response key: N/A
- Mock value: N/A
- 覆盖场景: no-hit fallback。
- 真实响应: `real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/response.json`
- Mock 后响应: N/A
- Runtime operations: N/A
- 真实接口请求:
  - 完整请求: `real-connect/apiSearchDeliveryAuthor/R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY/request.json`
  - 影响匹配字段: N/A
  - 仅用于真实采集字段: N/A
- 响应合同: 默认 no-op，不保存 mock response。
- 验证断言: DEFAULT_NOOP 不得用来关闭 `TC-INT-AWARD-COUPON-PENALTY`。
- Real verify: 后端 ready 后复验其它 search_delivery_author no-hit 行为。
- 验证证据:
  - `mock/apis/apiSearchDeliveryAuthor/script.mjs`
  - `mock/apis/apiSearchDeliveryAuthor/verify.mjs`
  - `.trae/skills/bam-mock-runtime-generator/scripts/verify-bam-mock.mjs`

# MTR Real Recheck Evidence 2026-07-13

## Scope

- command: `/delivery:verify --mtr`
- workspace: `artifacts/7306602080-incentive-control-online`
- implementation_mode_source: `04-tech-plan.md` / `delivery-mock.md` = `MOCK_PREVIEW`
- browser_tool: `integrated_browser`
- browser_runtime_mode: `TRAE_DESKTOP`
- entry_url: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&cjSiteCode=St12502250000001`
- user_supplied_url: `https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjDebugSubApp=alliance-operation-content&cjSiteCode=St12502250000001`
- mtr_debug_param_policy: 使用无 `externalLeadsDomainMock=1` 的 vmok 页面；保留 `cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content` 以验证本地代码入口。
- captured_at_latest: `2026-07-13T12:49:08.850Z`

## Environment Facts

| field | value |
|---|---|
| `activity_id` | `7629288371705643310` |
| `cjDebugSubApp` | `alliance-operation-content:http://localhost:8083/alliance-operation-content` |
| `externalLeadsDomainMock` | absent / `null` |
| `cjSiteCode` | `St12502250000001` |
| capture_installed_at | `2026-07-13T08:21:56.048Z` |
| resource_source_note | 页面存在 `http://localhost:8083/alliance-operation-content` fetch，同时也加载线上 CDN JS/CSS；本轮只声明业务请求/DOM 的 MTR 事实，不声明所有静态资源完全来自 localhost。 |
| screenshot_materialization | 奖励投放页 MTR 以 DOM + Network + response capture + tab + safety intercept 作为持久化证据；12:04 batch sheet 与 12:49 manual hit 自然 UI 成功态截图均由 browser tool inline 返回但未在 workspace 找到落盘文件，因此只登记为 `inline_runtime_screenshot`，不得写成 `local_file`。配置页 follow-up rerun 已将 `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png` 物化到 workspace，并在主报告登记为 `materialization_type=local_file`。 |

## MTR Real Recheck Queue And Result

| case_id / group | API / ruleId | real assertion | mock cleanup requirement | safety class | MTR evidence | MTR result |
|---|---|---|---|---|---|---|
| `TC-UI-CFG-ALL-BASELINE`; `TC-UI-CFG-PREFILLED-BASELINE`; `TC-INT-CFG-RULE-LINK` | N/A / config prompt + rule link | 配置页提示和规则 link 的 fresh real URL/token rerun | no data mock; existing verify runtime evidence remains historical | local UI / navigation | follow-up 已用无 `externalLeadsDomainMock=1` 的 `activity_id=7629288371705643310` edit 页自然进入奖励配置；DOM 覆盖 6 个提示/链接、4 个全部用户 sections、2 个预埋名单 sections；点击规则链接打开真实 Wiki 且原表单状态保持；配置页 runtime PNG 已物化到 workspace | `PASS_WITH_NOTES` for UI cases（设计对齐仍 pending；local PNG 已登记为 runtime source）；`PASS` for link interaction |
| `TC-UI-COIN-REMOVE-PAGE`; `TC-DATA-COIN-COLUMNS`; `TC-INT-REMOVE-TAB-SWITCH-COIN` | `GET /get_dou_plus_coin_remove_record`; source mock `R-BAM-COIN-REMOVE-DEFAULT` | 无 mock 参数下真实 DOU+币剔除明细可请求；Tab active；表头白名单正确；空态可见 | 不使用 `[BAM_MOCK_HIT]` / `mockedResponse` / `synthetic_contract` | readonly | real request `st=0/code=0`, `data.total=0`, `has_more=false`; DOM headers `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`; row `暂无数据` | `PASS_WITH_NOTES`；真实非空首行、排序和分页仍未覆盖 |
| `TC-CELL-COIN-FIRST-ROW` | same | 真实首行作品内容、原因、时间、操作人 renderer | same | readonly | 当前真实响应 `total=0`，无首行 | `OPEN_DATA_GAP` |
| `TC-DATA-COIN-FILTER-SCHEMA` | same filter path | `candidate_ids` / `operator_id` 权限范围真实复验 | same | readonly | 直接探测 `candidate_ids=100001,100002&operator_id=6068830` 返回 `code=95271007` / 页面长时间未操作断链；该证据不能作为 real pass | `OPEN_ENV_ISSUE` |
| `TC-UI-COUPON-REMOVE-PAGE`; `TC-DATA-COUPON-COLUMNS`; `TC-CELL-COUPON-FIRST-ROW`; `TC-INT-REMOVE-TAB-SWITCH-COUPON` | `GET /get_dou_plus_coupon_remove_record`; source mock `R-BAM-COUPON-REMOVE-DEFAULT` | 无 mock 参数下真实 DOU+券剔除明细可请求；Tab active；作者维度表头和首行 renderer 正确；无 DOU+币列残留 | 不使用 `[BAM_MOCK_HIT]` / `mockedResponse` / `synthetic_contract` | readonly | real response `records.length=3`, `total=3`, `has_more=false`; DOM rows show `大亮农业菌蔬优选店 ID: 109638766301`, remove reasons `内容相关性低` / `内容质量不佳`, operator `陈相` | `PASS` for real read/DOM; 排序多页仍未覆盖 |
| `TC-DATA-COUPON-FILTER-SCHEMA` | `GET /get_dou_plus_coupon_remove_record?...&candidate_ids=109638766301` | 作者ID筛选使用 `candidate_ids` 而不是 `author_ids` | same | readonly | natural UI filter request includes `candidate_ids=109638766301`; response still returns 3 real rows; DOM remains author table; no `author_ids` observed | `PASS_WITH_NOTES`；`operator_id` 权限范围未闭合 |
| `TC-TRACK-REMOVE-DETAIL-TAB-COIN`; `TC-TRACK-REMOVE-DETAIL-TAB-COUPON`; `TC-TRACK-MANUAL-HIT-EXPOSE`; `TC-TRACK-CFG-RULE-LINK` | operation logger / DA | DA UV 聚合与 direct collector payload | no data mock | external platform | local runtime can observe business XHR and generic collector traffic (`mcs.zijieapi.com/list`, `mcs.snssdk.com/v1/list`, `mon.zijieapi.com`) after config/manual interactions, but DA 平台口径未查询 | `OPEN_EXTERNAL_SYSTEM` |
| `TC-UI-MANUAL-HIT-PAGE`; `TC-CELL-MANUAL-HIT-STATUS`; `TC-INT-MANUAL-SUBMIT-GUARD`; `TC-TRACK-MANUAL-HIT-EXPOSE` | `GET /search_delivery_items`; source mock `R-BAM-MANUAL-SEARCH-HIT` | 真实人工提报治理字段来源、命中态和 cell 命中标签字段来源 | no data mock | readonly | direct probe still returns `code=95271007`, but 12:45-12:49 natural UI manual input used page `__token`, response `st=0/code=0`, `item_info.length=3`, all three rows `if_satisfy_delivery_rules=false`, DOM rendered summary + 3 red `不满足发奖条件` labels; clicking `提交并投放` did not open submit modal/success state and Network showed no reward write endpoint | `PASS_WITH_NOTES` for UI/cell/submit no-call; `PASS_WITH_NOTES / OPEN_EXTERNAL_SYSTEM` for tracking |
| `TC-INT-MANUAL-ONE-CLICK-REMOVE`; `TC-INT-BATCH-ONE-CLICK-REMOVE`; `TC-INT-MANUAL-EXPORT` | N/A / local UI state | 一键移除与导出前置 guard 不依赖真实后端响应；需要 natural UI no-call 证据 | no data mock | local UI no-call | 本轮未重新形成 manual/batch 命中态自然 UI before/action/after；仅确认它们不是后端 real verify 项，现有 runtime recheck 保持 OPEN | `MTR_LOCAL_ONLY_RECHECK_NOT_CLOSED` |
| `TC-UI-BATCH-HIT-REUSE`; `TC-INT-BATCH-EXPORT` | `GET /get_delivery_items_from_sheet`; source mock `R-BAM-BATCH-SHEET-HIT` | 真实 Feishu sheet 权限、解析字段和后端响应 | no data mock | readonly external data | direct probe with stable `batch-hit` URL still returned `code=95271007`, but 12:04 natural UI batch upload used page `__token`, real accessible sheet URL, response `st=0/code=0`, and DOM rendered summary `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`, 3 rows, `一键移除`, `导出移除明细` | `PASS_WITH_NOTES`；direct probe remains invalid evidence, exact `batch-hit` URL itself仍未证明；natural UI real sheet parse closed |
| award/write/export/save cases | `delivery_dou_plus_coin`; `delivery_dou_plus_coupon`; `candidate_remove`; `download_content_remove_record`; `delivery_modify_save` | 不得真实写后端；只能验证浏览器层 safety intercept 未放行 | active data mock disabled; browser-level safety intercept required | high-risk write | all five dangerous endpoints intercepted in browser context with `safety_intercept=true`, `backend_write=not_sent`, synthetic local status `499` | `PASS_WITH_NOTES`；不证明真实发奖、真实导出、真实持久化或真实配置保存；该 remaining_real_gap 为安全策略导致的 non-blocking note |

## Config Page Fresh Rerun Evidence

Detailed evidence: `verify-logs/evidence/mtr-config-pages-20260713.md`.

| field | value |
|---|---|
| historical sample check | `activity_id=7649322835323650313` edit page loaded without `externalLeadsDomainMock=1`, but `下一步` was blocked by `结束时间支持最早选到明天`; DOM end date was `2026-07-09`, so it is an expired sample and not counted as pass. |
| fresh entry | `activity_id=7629288371705643310` edit page loaded without `externalLeadsDomainMock=1`; first-step period `2026-02-01` to `2026-12-31`; natural `下一步` entered `奖励配置`. |
| config prompt DOM | prompt copy `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖` count `6`; rule link `查看【不激励】规则` count `6`; all links target `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`. |
| all-user coverage | `4` all-user sections contain activity qualification and prompt/link. |
| prefilled coverage | `2` prefilled sections contain `预埋用户名单` / `内容活动玩法圈选人群包` / `人群ID：cond_un_24263486` / `人群数量：7` and prompt/link. |
| negative DOM | `不激励数量=false`; `下载名单=false`; `申诉入口=false`; `旧白板占位=false`. |
| link click | clicking first rule link opened a real Lark Wiki tab with title `电商内容生态激励管控 - 飞书云文档` and content/navigation including `一、背景` / `二、底线问题剔除`; original business tab stayed on the same edit page. |
| no write evidence | browser capture `blockedWrites=[]`; no content-activity save/export/remove/award write endpoint observed during config-page click flow. |
| tracking boundary | browser-level click observed and generic collector requests appeared, but DA platform / direct event payload was not queried; `TC-TRACK-CFG-RULE-LINK` remains `OPEN_EXTERNAL_SYSTEM`. |

## Real Read Evidence

### DOU+币剔除明细默认读取

| field | value |
|---|---|
| method/path | `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` |
| query | `activity_id=7629288371705643310&config_id=7629288371705659694&page=1&page_num=20` |
| status | `200` |
| response summary | `st=0`, `code=0`, `msg=""`, `data.total=0`, `data.has_more=false` |
| DOM selected state | `配置一（人工提报）`; `剔除明细` |
| DOM headers | `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人` |
| DOM rows | `暂无数据` |
| negative DOM | no `作者信息` header in DOU+币 state |
| conclusion | 真实默认读链路、表头白名单、空态通过；真实首行/排序/分页仍缺数据样本。 |

### DOU+券剔除明细默认读取

| field | value |
|---|---|
| method/path | `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` |
| query | `activity_id=7629288371705643310&config_id=7629288371705676078&page=1&page_num=20` |
| status | `200` |
| response summary | `records.length=3`, `total=3`, `has_more=false` |
| record ids | `7657200834236662054`; `7658231190465282331`; `7657084877908640050` |
| author | `大亮农业菌蔬优选店`, `author_id=109638766301` |
| remove reasons | `内容相关性低`; `内容质量不佳` |
| operator | response `operator_id=6068830`; DOM displayed `陈相` |
| remove_time DOM | `2026/07/03 20:13:01`; `2026/07/03 20:12:56`; `2026/07/03 14:55:24` |
| conclusion | 真实默认读链路、作者维度表格、首行 cell 和无 DOU+币列残留通过。 |

### DOU+券作者 ID 筛选

| field | value |
|---|---|
| method/path | `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` |
| query | `activity_id=7629288371705643310&config_id=7629288371705676078&page=1&page_num=20&candidate_ids=109638766301` |
| status | `200` |
| response summary | `records.length=3`, `total=3`, `has_more=false` |
| request schema assertion | natural UI used `candidate_ids=109638766301`; no `author_ids` observed |
| DOM assertion | author table remains visible with rows for `大亮农业菌蔬优选店 ID: 109638766301` and operator `陈相` |
| conclusion | 作者ID -> `candidate_ids` 映射通过；`operator_id` 权限范围仍需真实复验。 |

## Invalid Direct Probe Evidence

以下探测不能作为 MTR real pass，只能作为环境限制 / 待复测证据。

| probe | response |
|---|---|
| `GET /get_dou_plus_coin_remove_record?...&candidate_ids=100001,100002&operator_id=6068830` | `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null` |
| `GET /get_dou_plus_coupon_remove_record?...&candidate_ids=109638766301&operator_id=6068830` | `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null` |
| `GET /search_delivery_items?...item_ids=100001,100002,100003` | `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null` |
| `GET /get_delivery_items_from_sheet?...sheet_url=batch-hit-7306602080` | `code=95271007`, `msg=页面长时间未操作已自动断开连接，请刷新后重试~`, `data=null` |

## Batch Sheet Retest 2026-07-13 11:34-11:35

| field | value |
|---|---|
| browser_view | `3ba09e4d-6bc7-4443-b4cd-5319a6a9e0d9` |
| page | no-mock award page `activity_id=7629288371705643310`, `cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content`, no `externalLeadsDomainMock=1` |
| precheck | page snapshot after reload showed business tabs `配置一（人工提报）` through `配置六`, not SSO |
| probe_1_time | `2026-07-13T11:34:23.460Z` to `2026-07-13T11:34:23.525Z` |
| probe_2_time | after navigating the same no-mock URL and waiting for business tabs, `2026-07-13T11:35:07.150Z` to `2026-07-13T11:35:07.208Z` |
| request | `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet?sheet_url=https%3A%2F%2Fbytedance.larkoffice.com%2Fsheets%2Fbatch-hit-7306602080&activity_id=7653282555822653742&config_id=7653282555822735662` |
| probe_1_response | HTTP `200`, JSON `{st:95271007, code:95271007, msg:"页面长时间未操作已自动断开连接，请刷新后重试~", data:null, total:0}` |
| probe_2_response | HTTP `200`, JSON `{st:95271007, code:95271007, msg:"页面长时间未操作已自动断开连接，请刷新后重试~", data:null, total:0}` |
| conclusion | Retest still cannot prove real Feishu sheet permission, field parsing, returned rows, or hit-state UI. Keep `OPEN_ENV_ISSUE`; required closure evidence remains a natural UI path with real accessible sheet returning `code=0` and rows/fields. |

## Batch Sheet Retest 2026-07-13 11:53

| field | value |
|---|---|
| browser_view | `3ba09e4d-6bc7-4443-b4cd-5319a6a9e0d9` |
| page | no-mock award page `activity_id=7629288371705643310`, `cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content`, `externalLeadsDomainMock=null` |
| precheck | page was freshly navigated and business tabs recovered before request; snapshot showed `配置一（人工提报）` selected and `配置二` through `配置六` visible |
| request_1 | historical batch sample params: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`, `activity_id=7653282555822653742`, `config_id=7653282555822735662` |
| response_1 | HTTP `200`, JSON `{st:95271007, code:95271007, msg:"页面长时间未操作已自动断开连接，请刷新后重试~", data:null, total:0}` |
| request_2 | current MTR page params: `sheet_url=https://bytedance.larkoffice.com/sheets/batch-hit-7306602080`, `activity_id=7629288371705643310`, `config_id=7629288371705659694` |
| response_2 | HTTP `200`, JSON `{st:95271007, code:95271007, msg:"页面长时间未操作已自动断开连接，请刷新后重试~", data:null, total:0}` |
| conclusion | Retest with both historical batch params and current activity/config params still returns `95271007`; keep `OPEN_ENV_ISSUE`. This still does not prove real sheet permission, field parsing, rows, or hit-state UI. |

## Batch Sheet Natural UI Retest 2026-07-13 12:02-12:04

| field | value |
|---|---|
| online_page_probe | no-mock online subapp tab `cjDebugSubApp=alliance-operation-content`; historical batch params and current activity/config params both returned HTTP `200` with business `st/code=95271007`, `data=null`。 |
| local_debug_direct_probe | no-mock local debug subapp tab `cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content`; historical batch params and current activity/config params both returned HTTP `200` with business `st/code=95271007`, `data=null`。 |
| natural_ui_precondition | local debug tab already had `新增提报` modal open; switched to `批量上传`, input sheet URL, installed temporary XHR/fetch response capture, clicked `提交`; no `提交并投放`, no remove/export write action. |
| natural_ui_request | XHR `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet?sheet_url=https%3A%2F%2Fbytedance.larkoffice.com%2Fwiki%2FPQRYwmPciiahPSkzo9vcYhm8n0f%3Fsheet%3DSeCvgK&activity_id=7629288371705643310&config_id=7629288371705659694&__token=[REDACTED]` |
| natural_ui_response | HTTP `200`; response starts with `{st:0, code:0, msg:"", extra:{log_id:"2026071320043290E396E75EBBF17ED266"}, data:{item_info:[...]}}` |
| dom_summary | Modal rendered `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`; buttons `一键移除` and `导出移除明细`; rows for video IDs `1279271921656`, `28083207347`, `7634842254674947950`; labels `不满足发奖条件`; values include amounts `329`, `20`, `100`, durations `2小时` / `12小时`, reasons `这个视频拍的很好` / `非常棒的视频` / `这个视频不错`. |
| screenshot | browser tool returned inline runtime screenshot for this state; workspace file lookup for `mtr-batch-sheet-natural-success-7629288371705643310-20260713.png` returned no local path, so it is not registered as `local_file`. |
| conclusion | Natural UI real sheet parsing is now closed as `PASS_WITH_NOTES`: direct probes without page token remain invalid evidence, and the exact old `batch-hit-7306602080` URL itself still returned `95271007`, but the browser user path with page token and a real accessible sheet proved real sheet permission, field parsing, rows, and hit-state UI. |

## Manual Hit Natural UI Retest 2026-07-13 12:45-12:49

| field | value |
|---|---|
| browser_view | `3ba09e4d-6bc7-4443-b4cd-5319a6a9e0d9` |
| page | no-mock local debug award page `activity_id=7629288371705643310`, `cjDebugSubApp=alliance-operation-content:http://localhost:8083/alliance-operation-content`, no `externalLeadsDomainMock=1` |
| natural_ui_precondition | Drawer already open from batch retest; switched to `手动输入`, entered `1279271921656,28083207347,7634842254674947950`, clicked `提交`; no `一键移除`, no export action, no backend write action before the submit-guard check. |
| natural_ui_request | XHR `GET /api/buyin/admin/content_activity/search_delivery_items?activity_id=7629288371705643310&config_id=7629288371705659694&page_no=1&page_size=50&item_ids=1279271921656%2C28083207347%2C7634842254674947950&session_unix_time=1783943926&candidate_pool_type=2&__token=[REDACTED]` |
| natural_ui_response | Same page-token read follow-up returned HTTP `200`, `st=0`, `code=0`, `msg=""`, `extra.log_id=2026071320481890E396E75EBBF1856953`, `data.item_info.length=3`, `data.total_num=0`, `data.candidate_num=0`; summarized rows all had `if_satisfy_delivery_rules=false`. |
| dom_summary | Modal rendered `共3个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：3个`; buttons `一键移除` and `导出移除明细`; rows for video IDs `1279271921656`, `28083207347`, `7634842254674947950`; each row displayed `不满足发奖条件`; row action `移除` remained visible. |
| cell_style | Runtime DOM scan found red row labels with computed `color=rgb(255, 77, 79)`, `font-size=12px`, `display=block`; no `申诉`, success text, or batch submit modal text was present. |
| submit_guard_check | Clicked `提交并投放` once after real rows were visible. Drawer/footer/summary remained; no `投放成功` / `提交成功` / `发奖成功`; no `投放奖励` / `确认投放` / `二次确认` modal. Browser Network after delayed check showed no `delivery_dou_plus_coin`, `delivery_dou_plus_coupon`, `candidate_remove`, `download_content_remove_record`, or `delivery_modify_save` request. The exact blocking toast from mock-preview was not captured in this real sample, likely because reward config fields were empty, so toast wording remains a note instead of a real pass claim. |
| tracking_observation | After manual summary render and guard click, browser Network contained generic collector/monitor traffic (`mcs.zijieapi.com/list`, `mcs.snssdk.com/v1/list`, `mon.zijieapi.com`), but direct event payload and DA / UV aggregation were not queried. |
| screenshot | browser tool returned inline runtime screenshot `mtr-manual-hit-natural-success-7629288371705643310-20260713.png`; no local workspace path was returned, so it is registered only as `inline_runtime_screenshot`, not `local_file`. |
| conclusion | Manual real search path is updated from stale `OPEN_ENV_ISSUE` to `PASS_WITH_NOTES`: direct probes without page token remain invalid evidence, but the natural UI path with page token proved real `search_delivery_items` access, returned rows, `if_satisfy_delivery_rules=false`, summary rendering, red cell status labels, row retention, and submit no-call safety. Remaining real gaps: no real `if_not_incentive=true/not_incentive_reason` sample, `total_num/candidate_num` were `0`, exact guard toast under fully filled reward config was not captured, and DA/UV aggregation remains external. |

## High-Risk Write Safety Intercept

| method | path | safety_intercept | backend_write | local_status | MTR conclusion |
|---|---|---|---|---|---|
| `POST` | `/api/buyin/admin/content_activity/delivery_dou_plus_coin` | true | `not_sent` | `499` | no real award write sent |
| `POST` | `/api/buyin/admin/content_activity/delivery_dou_plus_coupon` | true | `not_sent` | `499` | no real award write sent |
| `POST` | `/api/buyin/admin/content_activity/candidate_remove` | true | `not_sent` | `499` | no real candidate persistence write sent |
| `POST` | `/api/buyin/admin/content_activity/download_content_remove_record` | true | `not_sent` | `499` | no real Feishu export write sent |
| `POST` | `/api/buyin/admin/content_activity/delivery_modify_save` | true | `not_sent` | `499` | no real config save write sent |

Safety intercept evidence closes the no-backend-write safety assertion as `PASS_WITH_NOTES`. It does not close real transaction success, real persistence, real Feishu sheet generation, failure rollback, retry, or DA/UV aggregation; those items must be recorded in `remaining_real_gap` as non-blocking notes caused by the safety policy.

## Activity Rerun 2026-07-13 09:46-09:49

Detailed evidence: `verify-logs/evidence/mtr-rerun-activity-7629288371705643310-20260713.md`.

| field | value |
|---|---|
| local service | `http://localhost:8083/alliance-operation-content` returned `HTTP/1.1 200 OK` |
| business repo status before artifact writes | `git status --short` returned no output |
| no-mock award page | refreshed and loaded business body for `activity_id=7629288371705643310`; URL did not contain `externalLeadsDomainMock=1` |
| config page rerun | no-mock edit page still showed `奖励配置`; prompt count `6`, rule link count `6`, all-user sections `4`, prefilled sections `2`, negative scan passed |
| rule link rerun | clicking first `查看【不激励】规则` opened real Wiki `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`; original business tab stayed on the edit page |
| new screenshot | materialized `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png` (`PNG image data, 2022 x 1715`) |
| read probes after award-page refresh | coin default, coupon default, coupon author filter, manual search and batch sheet direct probes all returned `code=95271007`; recorded as `OPEN_ENV_ISSUE`, not real pass |
| write safety probe | five high-risk endpoints were intercepted in browser context with `safety_intercept=true`, `backend_write=not_sent`, local status `499` |

This rerun does not overwrite earlier natural UI MTR evidence. It adds a materialized config-page runtime screenshot and confirms the current direct read-probe environment remains partially disconnected for non-natural / direct API probes.

## Gate Implication

- MTR status: `PARTIAL_REAL_RECHECK_WITH_BLOCKERS`
- Do not update workspace label to `REAL_ENV_VERIFIED`.
- Keep `Implementation Mode: MOCK_PREVIEW` historical artifacts unchanged.
- Closed by real evidence:
  - Config page browser-verifiable rerun: all-user prompt/link, prefilled-list prompt/link, and rule-link navigation/no-side-effect.
  - DOU+币 default remove-detail read + table shell + empty state.
  - DOU+券 default remove-detail read + author rows.
  - DOU+券 author ID filter request schema (`candidate_ids`, not `author_ids`) and filtered DOM.
  - High-risk write endpoints did not leave the browser context during safety probes.
- Still open:
  - Config rule-link DA/UV platform payload and aggregation.
  - DOU+币 non-empty row / pagination / sorting.
  - `operator_id` real permission range.
  - manual submit real governance fields and natural UI hit state.
  - batch upload real Feishu sheet permission and parser success.
  - real export generated Feishu sheet permission / fields.
  - real award transaction, persistence, rollback and no-award upload persistence.
  - DA/UV aggregation and direct collector payload for remaining tracking cases.

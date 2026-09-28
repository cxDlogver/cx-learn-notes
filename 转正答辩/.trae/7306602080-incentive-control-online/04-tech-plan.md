# 不激励管控上线 Delivery Plan

> **For agentic workers:** This is the `/delivery:plan --mock-preview` technical plan. Do not implement directly from this file; `/delivery:task` must materialize executable tasks first.

**Goal:** 在内容活动奖励配置和奖励投放链路中完整落地「不激励」管控：配置页前置提示、发奖前剔除、人工提报命中态处理、剔除明细查询、导出和埋点。PRD 与技术文档定义本轮完整范围；BAM/IDL 若缺字段或存在差异，只作为同步差异和风险登记，不能删减页面、字段、导出和校验范围。

**Architecture:** 复用目标 app `apps/alliance-operation-content` 的现有 React + MobX 页面结构、Auxo/EcopTable 组件、BAM generated wrappers 与现有奖励投放 store/service 调用方式。新增 UI 仅落在奖励配置、奖励投放二级 Tab、人工提报 Drawer/Form/Store 及剔除明细表格组件；真实接口请求仍走 `src/bam/ecom.buyin.admin_api/**` 生成 wrapper，mock-preview 由后续 `/delivery:task` 与 `/delivery:mock` 基于真实 UI 请求闭合。

**Tech Stack:** React, TypeScript, MobX, `@ecom/auxo`, `@ecop/table`, `@ecop/user`, `@ecom/operation-logger`, BAM generated API wrappers, Edenx/EMO monorepo.

## Plan Readiness

- Plan Readiness: `PARTIAL_READY`
- Reason: `Implementation Mode` 明确为 `MOCK_PREVIEW`，无 P0/Figma/UI 结构阻塞；真实后端运行态、错误码、分页/排序细节、埋点事件名和正式跳转 URL 仍作为 P1/PLAN_DISCOVERY 进入后续任务和 mock 合同生成。
- Next command: `/delivery:task`
- Do not enter: `/delivery:code` before `/delivery:task` materializes task steps, test case matrix, and mock-preview contract inputs.

## Implementation Mode

- Implementation Mode: `MOCK_PREVIEW`
- mock_preview_behavior: 业务代码仍通过真实 BAM wrapper 发起请求；后续 `/delivery:task` 负责生成 Test Case Matrix、BAM Mock Response Field Coverage Matrix、Mock Preview Scope 和 Mock / Real Boundary 的输入要求，`/delivery:mock` 负责基于自然 UI 操作捕获的真实 request/response 生成或调整 BAM mock 产物。
- Exclusion principle: plan 阶段不生成 mock rules、不提供静态 mock response、不要求业务代码内置 mock 数据，也不在业务代码中规划任何模拟运行时替代方案。

## Critical Decisions And Evidence

| Decision | Plan effect | Evidence |
|---|---|---|
| PRD + 技术文档定义完整范围，BAM/IDL 差异只做风险登记 | 不删减配置提示、发奖剔除、人工提报、剔除明细、导出、埋点范围 | `decision-log.md` AF-006；`bam/bam-sync-report.md` |
| 配置页 `查看【不激励】规则` 跳转到「电商内容生态激励管控讨论」材料 | 计划保留 clickable link 与点击埋点；正式 URL/token 作为 P1 review | `decision-log.md` AF-001；`prd-source.md:147-152` |
| 导出剔除明细只导出已剔除记录；人工提报一键/行级移除仅更新前端提报名单并保留已移除记录用于导出；移除原因为「手动移除 / 命中【不激励】规则」，处罚原因取接口最新罚单原因 | 下载请求只组装已移除/剔除项；不导出可发奖记录；移除后导出入口保留且可重复导出 | `decision-log.md` AF-002；`prd-source.md:166-192`; `tech-doc-raw.md`; repair `REPAIR-002/003/004` |
| 批量上传命中不激励复用手动输入命中态 | 不等待独立 Figma；批量上传列表命中后复用汇总提示、行态、按钮、提交限制 | `decision-log.md` AF-003；F5/F6/F7/F8 |
| 操作人筛选复用现有人员搜索/选择能力 | 剔除明细表格沿用 `PeopleSelect`/`PeopleCard` | `decision-log.md` AF-005；现有投放明细表 |
| 本期不做申诉入口 | 不新增申诉入口、弹窗或跳转 | `decision-log.md` AF-007 |

## PRD Logic Coverage Matrix

| requirement_id | PRD logic | plan_item / task_materialization_hint | code_locator_hint | mock_preview_behavior | verification | real_integration_gap |
|---|---|---|---|---|---|---|
| AR-001 | 活动参与资格为「全部用户」时，在配置项下方展示不激励提示和 `查看【不激励】规则` 入口 | 增加条件渲染提示组件，保留原有配置项结构 | `src/routes/content-activity/edit/components/step-reward-config/index.tsx`; style in sibling `index.module.scss` | 点击仍走真实 link handler 与 logger；跳转 URL 由后续任务绑定确认材料地址 | 选择全部用户后 DOM 出现完整文案和链接；点击触发 window open / router jump 与点击埋点 | 正式 URL/token P1；不阻塞 UI |
| AR-002 | 活动参与资格为「仅限预埋用户」时展示同款提示和入口 | 同一提示组件复用于预埋用户名单配置项下方 | same as AR-001 | 同 AR-001 | 选择预埋名单后出现完整文案和链接；全部用户与预埋态截图分别验收 | 正式 URL/token P1 |
| AR-003 | DOU+币发奖前校验满足准入条件和排名的作品，按活动开始时间到发奖时间内最新处罚状态判断：`0 自然处罚` 阻断，`1 申诉解除` / `2 自主解封解除` 不阻断 | 发奖操作链路使用接口返回的剔除/不激励字段驱动阻断、剔除记录与提示；发奖成功后再调用 `apiCandidateRemove` 上传本次不发奖/剔除候选名单；保留现有排名/准入逻辑 | `send-award/index.tsx`; `award-videos`; batch submit modal; existing award APIs; post-success `apiCandidateRemove` | 通过真实 award wrapper 和成功后的 `apiCandidateRemove` 请求命中 BAM mock，覆盖作品维度 `0/1/2` 三类状态 | mock-preview 下点击奖励下发形成真实发奖请求；成功后上传 no-award list；UI 不展示被剔除项发奖成功 | 后端治理实时校验状态、异常码和最终发奖事务由 real verify 回收 |
| AR-004 | DOU+券发奖前校验满足准入条件和排名的作品/账号，按同一时间窗与状态规则处理：`0 自然处罚` 阻断，`1 申诉解除` / `2 自主解封解除` 不阻断 | DOU+券作者/作品维度发奖链路使用同一剔除规则和记录口径；发奖成功后再调用 `apiCandidateRemove` 上传本次不发奖/剔除候选名单 | `send-award/index.tsx`; `award-authors`; batch submit modal; existing award APIs; post-success `apiCandidateRemove` | 通过真实 award wrapper 和成功后的 `apiCandidateRemove` 请求命中 BAM mock，覆盖作者/作品维度 `0/1/2` 三类状态 | DOU+券发奖时命中作者/作品不进入成功发奖列表；解除状态不阻断；成功后上传 no-award list | 后端最终候选池和治理状态一致性 real verify |
| AR-005 | 治理接口超时/异常暂停发奖并展示 PRD 固定文案；剔除后名单为空时正常结束不发放激励 | 前端只按接口 `code/msg` 或约定错误分支展示 PRD 文案；空列表走正常结束态 | award submit handlers; shared message constants under award constants if needed | BAM mock 响应覆盖 timeout/exception/empty-list 场景；业务代码仍按真实返回分支执行 | 超时文案 `治理校验失败，请稍后重试`；异常文案 `治理校验异常，请联系管理员`；空名单无激励发放 | 错误码/错误对象承载方式 P1 |
| AR-006 | 人工提报提交中奖名单后校验手动作品/账号；命中仅提示不自动剔除 | store 接收 `if_not_incentive` / `not_incentive_reason`，列表保留命中项并显示行态 | `stores/manuallySubmitVideoStore.ts`; drawer form | `apiSearchDeliveryItems`/`apiGetDeliveryItemsFromSheet` 真实请求由 BAM mock 返回命中字段 | 命中项仍在表格中；未点击移除不会自动消失 | 手动输入接口是否已同步同字段需在 task discovery 验证 |
| AR-007 | 命中态展示汇总提示 `共{作品总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{作品个数}个` | 在 form/table 上方新增 summary alert，统计准入失败或不激励命中项 | `manually-submit-videos-form/index.tsx` | BAM mock 返回混合命中列表；前端按响应字段统计 | 数量与列表状态一致；无命中项不展示 alert | 统计字段无后端依赖 |
| AR-008 | `一键移除` 移除不满足准入门槛或命中不激励规则的作品 | 新增本地批量移除 action；不调用 `apiCandidateRemove`；移除前把命中项写入前端已移除记录，供后续导出剔除明细使用 | form + store | 无 manual remove BAM 请求；业务代码仅更新当前提报名单和 preserved removed records | 点击后命中项从当前列表移除，剩余可提交项保留；network 不出现 `candidate_remove` 请求 | 已移除记录生命周期和 drawer reset P1 |
| AR-009 | `导出剔除明细` 只导出已剔除记录；字段含账号ID、视频ID、视频名称、移除原因、处罚原因、操作人；活动期间命中多个罚单时处罚原因取最新罚单 | 新增导出按钮，基于前端 preserved removed records 组装 `ContentRemoveRecord[]` 并调用 `apiDownloadContentRemoveRecord`，返回 `lark_url` 后打开/展示；移除原因按 AF-002 映射为「手动移除 / 命中【不激励】规则」 | form + store; `apiDownloadContentRemoveRecord` | 真实下载请求由 BAM mock 返回 `lark_url`，不内置本地文件；mock 合同需覆盖最新罚单处罚原因字段 | 仅已移除/剔除项进入 request；可发奖项不导出；移除后导出入口仍可见且可重复导出；按钮文案为 `导出剔除明细`；处罚原因展示/导出为最新罚单原因 | 字段空值、处罚原因数组格式和 lark_url 打开方式 P1 |
| AR-010 | 未移除处罚作品/账号前禁止提交发奖名单 | 扩展 drawer submit guard：准入失败或 `if_not_incentive` 均阻断 `提交并投放` | `manually-submit-videos-drawer/index.tsx` | mock 返回命中项时 submit guard 本地阻断；移除后再进入现有 batch submit | 命中项存在时提示并不打开 batch submit modal；移除后可继续 | 无 |
| AR-011 | DOU+币奖励投放新增 `剔除明细` Tab，展示每次发奖批量产生的作品维度剔除名单 | 扩展 `SubTab`，新增 coin remove record table 组件，按配置项/奖励批次查询剔除记录 | `send-award/index.tsx`; new sibling `dou-coin-remove-record-table/index.tsx` | `apiGetDouPlusCoinRemoveRecord` 请求携带 activity/config/page/page_num/candidate_ids/operator_id，BAM mock 返回 records/total | active Tab 展示筛选区、作品内容/原因/时间/操作人、分页；多次发奖可按后端记录批次增量展示 | 排序/错误码 P1 |
| AR-012 | DOU+币筛选项：作品ID批量输入，操作人下拉搜索 | EcopTable search columns：`candidate_ids` 批量输入，`operator_id` PeopleSelect | `dou-coin-remove-record-table/index.tsx` | mock 按真实 query params 返回过滤结果 | 输入作品ID/操作人提交后 table request 参数正确，列表刷新 | 操作人范围由现有 PeopleSelect，后端是否接受 employee_id P1 |
| AR-013 | DOU+券奖励投放新增 `剔除明细` Tab，展示每次发奖批量产生的作者维度剔除名单 | 新增 coupon remove record table 组件，复用 SubTab，按配置项/奖励批次查询剔除记录 | `send-award/index.tsx`; new sibling `dou-coupon-remove-record-table/index.tsx` | `apiGetDouPlusCouponRemoveRecord` 请求携带 activity/config/page/page_num/candidate_ids/operator_id | active Tab 展示作者信息/原因/时间/操作人、分页；多次发奖可按后端记录批次增量展示 | 排序/错误码 P1 |
| AR-014 | DOU+券筛选项：作者ID、操作人下拉搜索 | EcopTable search columns：作者ID映射到 `candidate_ids`，`operator_id` PeopleSelect | `dou-coupon-remove-record-table/index.tsx` | mock 按真实 query params 返回过滤结果 | 输入作者ID/操作人提交后 table request 参数正确 | 字段名为 `candidate_ids` 但产品标签为作者ID，需在代码注释和测试断言中说明 |
| AR-015 | 配置页 `查看【不激励】规则` 点击统计点击 UV | 使用现有 `@ecom/operation-logger` 点击日志模式 | config prompt component | 真实点击触发 logger；mock 不影响日志调用 | spy/logger mock 断言点击事件含路径模块和 activity/config context | 事件名/element_id 按现有规范 P1 |
| AR-016 | 人工提报命中提示曝光统计曝光 UV | 命中 summary 首次展示时上报曝光 | manual form component | mock 返回命中字段驱动真实曝光逻辑 | 命中列表出现时曝光上报一次；重复渲染不重复上报 | 事件名/参数 P1 |
| AR-017 | 剔除明细 Tab 曝光/点击统计，参数区分配置项和奖励类型 | 扩展 `subTabModuleMetaMap` 或新增 click/expose log，参数含 config key 与 reward type | `send-award/index.tsx` | 真实切 Tab 触发 logger；mock 不影响 | 点击 `剔除明细` 后上报点击与曝光，extra 含配置项和 DOU+币/券 | 事件命名与 UV 口径 P1 |

## Business State Disposition Matrix

| State Axis | Option | 本次动作 | UI 策略 | 主态基线 / Evidence | Plan 约束 | Verification |
|---|---|---|---|---|---|---|
| 活动参与资格 | 全部用户 | 新增提示与可点击规则入口 | RESTRUCTURE_VISIBLE | Figma `1:9770`, IMG3, PRD 3.1 | 保留原配置项，提示位于配置项下方 | 全部用户态截图/DOM 包含提示和链接 |
| 活动参与资格 | 仅限预埋用户名单 | 新增同款提示与可点击规则入口 | RESTRUCTURE_VISIBLE | Figma `1:10938`, IMG4, PRD 3.1 | 不改变人群详情展示；提示在预埋名单配置区下方 | 预埋态截图/DOM 包含提示和链接 |
| 奖励投放 SubTab | 奖励下发 | 保留 legacy UI，同时接入发奖前剔除规则 | LOGIC_ONLY | current `SubTab.REWARD`; Figma confirms sibling tab | 不重排奖励下发主体；只增加剔除相关 guard/log/request | legacy 区域仍可见；剔除场景触发阻断 |
| 奖励投放 SubTab | 投放明细 | 保留 legacy 投放明细 | KEEP_LEGACY_VISIBLE | current `SubTab.DETAIL`; existing delivery tables | 不把剔除字段塞进投放明细 | DOU+币/券投放明细仍按原表展示 |
| 奖励投放 SubTab | 剔除明细 | 新增 visible Tab 和列表视图 | CREATE_NEW_VISIBLE | Figma `1:12120`/`1:12390`, IMG5/IMG6 | 与 legacy `奖励下发/投放明细` 并列；按 reward type 渲染不同表 | 点击新 Tab 显示剔除明细 |
| 奖励类型 | DOU+币 | 作品维度剔除明细 | CREATE_NEW_VISIBLE | Figma `1:12120` | 表头为作品内容/剔除发奖原因/剔除发奖时间/操作人 | records 渲染为作品卡 |
| 奖励类型 | DOU+券 | 作者维度剔除明细 | CREATE_NEW_VISIBLE | Figma `1:12390` | 表头为作者信息/剔除发奖原因/剔除发奖时间/操作人 | records 渲染为作者卡 |
| 提报方式 | 手动输入 | 增加命中 summary、行态、按钮、提交限制 | RESTRUCTURE_VISIBLE | Figma `25:13842`, `87:6973`, `87:7016`, IMG7 | 命中项只提示不自动剔除 | 手动输入命中项展示并阻断提交 |
| 提报方式 | 批量上传 | 复用手动输入命中态处理 | RESTRUCTURE_VISIBLE | Figma baseline `25:13971`, `101:6308`, `101:6332`, IMG8; AF-003 | 不等待独立命中态设计；命中 UI 与手动输入一致 | 批量上传 mock 命中后出现同款 summary/行态 |
| 申诉入口 | 本期不纳入 | 不新增入口 | REMOVE_VISIBLE | AF-007 | 提示、剔除、明细为本期范围；无申诉按钮 | 页面无新增申诉入口 |

## Page-Level Figma Coverage Audit

| 页面 / 子视图 | UI 改造范围 | Figma 主态证据 | cache_id / cache_path | 结构覆盖结论 | Plan 动作 |
|---|---|---|---|---|---|
| 奖励配置-全部用户 | 配置项下方提示与 link | node `1:9770`, screenshot IMG3 | F2 `figma-cache/nodes/F2-get_figma_data-1_9176-d3.md`; IMG3 | FIGMA_MAIN_STATE_CONFIRMED | TASKIZE_UI_STRUCTURE |
| 奖励配置-预埋用户名单 | 预埋名单配置项下方提示与 link | node `1:10938`, screenshot IMG4 | F2; IMG4 | FIGMA_MAIN_STATE_CONFIRMED | TASKIZE_UI_STRUCTURE |
| 奖励投放-DOU+币剔除明细 | active Tab、筛选区、作品表格、分页 | node `1:12120`, screenshot IMG5 | F3 `figma-cache/nodes/F3-get_figma_data-1_12120-d4.md`; IMG5 | FIGMA_MAIN_STATE_CONFIRMED | TASKIZE_UI_STRUCTURE |
| 奖励投放-DOU+券剔除明细 | active Tab、筛选区、作者表格、分页 | node `1:12390`, screenshot IMG6 | F4 `figma-cache/nodes/F4-get_figma_data-1_12390-d4.md`; IMG6 | FIGMA_MAIN_STATE_CONFIRMED | TASKIZE_UI_STRUCTURE |
| 人工提报-命中态 Drawer | Drawer、提报方式、summary、actions、表格、footer | state frame `25:13842`, content `87:6973`, rows `87:7016`, screenshot IMG7 | F5/F7; IMG7 | FIGMA_MAIN_STATE_CONFIRMED | TASKIZE_UI_STRUCTURE |
| 人工提报-批量上传 baseline | 批量上传 option、上传行、表格 baseline、footer | state frame `25:13971`, content `101:6308`, table `101:6332`, screenshot IMG8 | F6/F8; IMG8 | FIGMA_MAIN_STATE_CONFIRMED | TASKIZE_UI_STRUCTURE |
| 发奖前治理状态判断 | 非新增页面骨架；由接口字段驱动 | PRD 3.2 + BAM evidence | `tech-doc-raw.md`; `bam/bam-sync-report.md` | NON_FIGMA_FUNCTIONAL_ONLY | TASKIZE_NON_STRUCTURAL_ONLY |
| 数据埋点 | 点击/曝光逻辑，不新增页面骨架 | PRD 四、埋点需求 | `prd-source.md:200-208` | NON_FIGMA_FUNCTIONAL_ONLY | TASKIZE_NON_STRUCTURAL_ONLY |

## Field Source Coverage Audit

| 字段来源 | 字段 key | 产品标签/表头 | UI 落点 | 筛选映射 | 表格/列表映射 | 契约映射 | Task 映射 | 未覆盖处理 |
|---|---|---|---|---|---|---|---|---|
| BAM response | `if_not_incentive` | 命中【不激励】规则 | 人工提报行态/summary/submit guard | n/a | 命中项状态 | AR-006/007/010 | TMI-C | 手动输入接口字段需 task discovery |
| BAM response | `not_incentive_reason` | 处罚原因 | 人工提报导出字段 | n/a | 导出 `penalty_reason` | AR-009 | TMI-C | 数组/最新原因格式 P1 |
| BAM request | `records` | 导出剔除明细 | 导出按钮 | n/a | `ContentRemoveRecord[]` | AR-009 | TMI-C | 只含剔除项 |
| BAM request | `remove_candidates` | 发奖成功后的不发奖名单上传 | 奖励投放成功回调 | n/a | candidate remove payload | AR-003/004 | TMI-D | candidate_id 映射 P1 |
| BAM request | `candidate_ids` | 作品ID / 作者ID | 剔除明细筛选区 | 批量输入 ID 数组 | request params | AR-012/014 | TMI-B | 产品标签与字段名差异需注释 |
| BAM request/response | `page`, `page_num`, `total`, `has_more` | 分页 | 剔除明细分页 | EcopTable pagination | table total | AR-011/013 | TMI-B | 排序/has_more 使用方式 P1 |
| BAM response | `item_card` | 作品内容 | DOU+币剔除列表 | n/a | 封面/标题/ID | AR-011/012 | TMI-B | 按 existing delivery table renderer 复用 |
| BAM response | `author_info` | 作者信息 | DOU+券剔除列表 | n/a | 头像/昵称/ID | AR-013/014 | TMI-B | 按 existing coupon table renderer 复用 |
| BAM response | `remove_reason` | 剔除发奖原因 | 剔除明细列表/导出 | n/a | reason text | AR-009/011/013 | TMI-B/C | 枚举文案以 AF-002 为准 |
| BAM response | `operator_id` | 操作人 | 剔除明细筛选/表格 | PeopleSelect employee id | PeopleCard | AR-012/014 | TMI-B | 后端 employee_id 接受范围 P1 |
| User decision | rule discussion URL | 查看【不激励】规则 | 配置提示 link | n/a | n/a | AR-001/002/015 | TMI-A | 正式 URL/token P1 |

## Figma-to-Component Mapping Audit

| 现有组件 / 模块 | 当前可见行为 | Figma 对应区域 | 复用决策 | Plan 约束 |
|---|---|---|---|---|
| `step-reward-config/index.tsx` | 奖励配置 Form array、配置卡片、活动参与资格/人群字段 | `1:9770` / `1:10938` prompt | legacy local patch | 只新增提示与 link，不改奖励配置数据模型 |
| `send-award/index.tsx` `SubTab.REWARD/DETAIL` | 二级 Tab 只有奖励下发/投放明细 | `1:12120` / `1:12390` active 剔除明细 | legacy local patch | 新增 `SubTab.REMOVE_DETAIL='剔除明细'`，保留 legacy 两个 tab |
| `dou-coin-distribution-table` | DOU+币投放明细 EcopTable | DOU+币剔除明细作品表 | concrete reuse path | 新增 sibling table，复用 filterEmpty、PeopleSelect、PeopleCard、SmallerImage 模式 |
| `dou-coupon-distribution-table` | DOU+券投放明细 EcopTable | DOU+券剔除明细作者表 | concrete reuse path | 新增 sibling table，字段换成 remove record wrappers |
| `manuallySubmitVideoStore.ts` | 拉取人工提报候选，补默认 `if_delivery` | `25:13842` 命中态 | legacy local patch | 保存命中统计/剔除项，不把 mock 数据写入 store |
| `manually-submit-videos-drawer/index.tsx` | 只对准入失败阻断提交 | `87:7130` footer | legacy local patch | submit guard 覆盖准入失败和不激励命中 |
| `manually-submit-videos-form/index.tsx` | 表格内已有准入失败、投放记录行态 | `87:6998`, `87:7000`, `87:7002`, `87:7016` | legacy local patch | 新增 summary/action/status，保留 existing editable cells |
| `@ecom/operation-logger` existing usage | 页面/模块曝光、footer click | PRD 埋点需求 | concrete reuse path | 事件名/参数按现有规范 discovery，不新建独立 logger |

## UI Implementation Directive Matrix

| scope_id | fileKey / nodeId | figma_state_scope | implementation_directive | ui_evidence_mode | component_strategy | code_locator_hint | acceptance_focus |
|---|---|---|---|---|---|---|---|
| UI-001 | `fNJJ7mEmEMYU5y0tcAZm3X` / `1:9770`, text `1:10202` | 配置页全部用户 after | legacy local patch: 在活动参与资格配置项下方渲染提示和 link，link 独立可点击 | cache F2 + screenshot IMG3 | LEGACY_LOCAL_PATCH | `step-reward-config/index.tsx` | 文案、位置、link 点击和埋点 |
| UI-002 | `fNJJ7mEmEMYU5y0tcAZm3X` / `1:10938`, text `1:11370` | 配置页预埋名单 after | legacy local patch: 同一提示组件复用到预埋名单场景 | cache F2 + screenshot IMG4 | LEGACY_LOCAL_PATCH | `step-reward-config/index.tsx` | 同款文案、位置、link 点击 |
| UI-003 | `fNJJ7mEmEMYU5y0tcAZm3X` / `1:12120` | DOU+币剔除明细 | concrete reuse: 新增 DOU+币 remove record table，复用 EcopTable/PeopleSelect/SmallerImage | cache F3 + screenshot IMG5 | CONCRETE_REUSE_PATH | `send-award/index.tsx`; new `dou-coin-remove-record-table/index.tsx` | Tab/filters/table/pagination 与 request params |
| UI-004 | `fNJJ7mEmEMYU5y0tcAZm3X` / `1:12390` | DOU+券剔除明细 | concrete reuse: 新增 DOU+券 remove record table，复用 EcopTable/PeopleSelect/PeopleCard | cache F4 + screenshot IMG6 | CONCRETE_REUSE_PATH | `send-award/index.tsx`; new `dou-coupon-remove-record-table/index.tsx` | 作者维度表格与 request params |
| UI-005 | `fNJJ7mEmEMYU5y0tcAZm3X` / `25:13842`, content `87:6973`, rows `87:7016` | 人工提报命中态 | legacy local patch: 增加 summary alert、actions、行态、submit guard | cache F5/F7 + screenshot IMG7 | LEGACY_LOCAL_PATCH | drawer/form/store files | 命中项不自动移除、一键移除、导出、禁止提交 |
| UI-006 | `fNJJ7mEmEMYU5y0tcAZm3X` / `25:13971`, content `101:6308`, table `101:6332` | 批量上传 baseline | legacy local patch: 批量上传命中复用 UI-005 命中态；baseline 区域保留 | cache F6/F8 + screenshot IMG8 | LEGACY_LOCAL_PATCH | store/form/drawer files | 批量上传命中后同款命中处理 |
| UI-007 | PRD tracking table / existing logger | 埋点 | concrete reuse: 用 operation-logger 扩展 click/expose | PRD evidence + repo usage | CONCRETE_REUSE_PATH | config prompt, manual form, send-award | logger 参数含 activity/config/reward type |

## Switcher Impact Contract

| Switcher | Option | 主态证据 | 影响区域 | 状态流向 | Plan 动作 |
|---|---|---|---|---|---|
| 活动参与资格 | 全部用户 | `1:9770`, IMG3 | 配置项下方提示 | select all users -> prompt visible | 增加提示组件条件分支 |
| 活动参与资格 | 仅限预埋用户名单 | `1:10938`, IMG4 | 预埋名单配置项下方提示 | select crowd -> prompt visible | 复用提示组件 |
| 奖励投放配置 Tab | 配置一/配置二/... | Figma `配置一/配置二`; existing `tabKeyMap` | 当前 config id / reward type | active config -> sub tab content request params | 保持现有 config tab，剔除明细传 `currentConfigId` |
| 奖励投放 SubTab | 奖励下发 | existing `SubTab.REWARD` | 发奖操作区 | active reward -> existing reward UI +剔除逻辑 | 保留 visible UI，接入 guard/log |
| 奖励投放 SubTab | 投放明细 | existing `SubTab.DETAIL` | 投放记录表 | active detail -> legacy delivery tables | 保留 legacy |
| 奖励投放 SubTab | 剔除明细 | Figma `1:12120`/`1:12390` | 新筛选区/表格/分页 | active remove detail -> reward type table | 新增 SubTab 和条件渲染 |
| 奖励类型 | DOU+币 | `1:12120` | 作品维度剔除表 | reward type coin -> coin remove wrapper | 渲染 coin remove table |
| 奖励类型 | DOU+券 | `1:12390` | 作者维度剔除表 | reward type coupon -> coupon remove wrapper | 渲染 coupon remove table |
| 提报方式 | 手动输入 | `25:13842`, `87:6973` | 手动输入表格 | submit item ids -> hit state if response marks invalid | 展示命中态 |
| 提报方式 | 批量上传 | `25:13971`, `101:6308`; AF-003 | 上传后表格 | upload sheet -> same hit state if response marks invalid | 复用命中态 |

## Figma Region Contract

| 页面/状态 | UI区域 | fileKey | nodeId | 数据来源 | 需execute提取的数据 | 结构签名 | 必显元素/字段 | 禁显元素/残留 | 视觉结构与顺序 | 验收方式 | fallback/blocking |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 配置-全部用户 | 不激励提示/规则 link | `fNJJ7mEmEMYU5y0tcAZm3X` | `1:9770`, text `1:10202` | F2, IMG3, PRD 3.1 | prompt 文案、link 文案、配置项下方 placement | Form item 下方 inline prompt + link | `奖励发放环节...无法被发奖`; `查看【不激励】规则` | 不显示不激励数量/下载名单/申诉入口 | 原配置项 -> prompt -> 后续配置项 | DOM + screenshot + click verify | none |
| 配置-预埋名单 | 不激励提示/规则 link | same | `1:10938`, text `1:11370` | F2, IMG4, PRD 3.1 | 同上；预埋名单上下文 | 预埋名单详情下方 prompt + link | 同款完整文案 | 不新增名单下载/申诉 | 预埋名单信息 -> prompt -> 后续表单 | DOM + screenshot + click verify | none |
| DOU+币剔除明细 | SubTab 区 | same | `1:12120`, active tab `1:12273` | F3, IMG5 | Tab label/order and active state | Radio/Tab: 奖励下发、投放明细、剔除明细 | 三个 tab，剔除明细 active | 不隐藏 legacy tab | 配置 tab -> 配置摘要 -> SubTab | click + screenshot | none |
| DOU+币剔除明细 | 筛选区 | same | `1:12120` | F3, IMG5, PRD 3.3 | 作品ID批量输入、操作人搜索选择 | filter row above table | 作品ID、操作人 | 不用充值记录/投放状态筛选 | filters -> table | request param assertion | none |
| DOU+币剔除明细 | 表格 | same | headers `1:12278`, `1:12291`, `1:12281`; top `1:12120` | F3, IMG5 | columns, cell structure, header order | EcopTable with work composite first column | 作品内容、剔除发奖原因、剔除发奖时间、操作人 | 不显示投放金额/状态/充值记录 | table after filters | screenshot + row renderer tests | none |
| DOU+币剔除明细 | 分页 | same | pagination `1:12126` | F3, IMG5 | total text, page/page size controls | bottom pagination | `共40条`, page items, page size | 不做无限滚动 | table -> pagination | request page/page_num assertion | none |
| DOU+券剔除明细 | SubTab 区 | same | `1:12390`, active tab text under `1:12560` | F4, IMG6 | Tab label/order and active state | same SubTab as coin | 奖励下发、投放明细、剔除明细 | 不隐藏 legacy tab | 配置 tab -> 配置摘要 -> SubTab | click + screenshot | none |
| DOU+券剔除明细 | 筛选区 | same | `1:12390` | F4, IMG6, PRD 3.3 | 作者ID输入、操作人搜索选择 | filter row above table | 作者ID、操作人 | 不用作品内容筛选标签 | filters -> table | request param assertion | none |
| DOU+券剔除明细 | 表格 | same | headers `1:12561`, `1:12670`; top `1:12390` | F4, IMG6 | columns, author cell structure | EcopTable with author composite first column | 作者信息、剔除发奖原因、剔除发奖时间、操作人 | 不显示投放状态/券数量 | table after filters | screenshot + row renderer tests | none |
| DOU+券剔除明细 | 分页 | same | pagination `1:12401` | F4, IMG6 | total text, page/page size controls | bottom pagination | `共40条`, page items, page size | 不做无限滚动 | table -> pagination | request page/page_num assertion | none |
| 人工提报命中态 | Drawer 容器 | same | state `25:13842`, content `87:6973` | F5, IMG7 | drawer title, radio group, footer | right Drawer over page context | 提报视频、手动输入、批量上传、取消、提交并投放 | 不把背景低保真当业务实现 | header -> form -> table -> footer | screenshot + DOM | none |
| 人工提报命中态 | Summary/action 区 | same | `87:6998`, `87:7000`, `87:7002` | F5, IMG7 | summary copy, button order | alert + action group | summary text、一键移除、导出剔除明细 | 无自动剔除提示 | summary -> buttons -> table | click verify | none |
| 人工提报命中态 | 表格行态 | same | `87:7016`, row labels `87:7028`, `87:7113` | F7, IMG7 | row status labels, remove link | content cell under title/id shows red status | 不满足准入门槛、命中【不激励】规则、移除 | 不删除 existing 投放记录提示 | thumbnail/title/id -> red labels -> editable cells -> remove | row DOM + visual compare | none |
| 批量上传 baseline | 上传态和表格 baseline | same | state `25:13971`, content `101:6308`, table `101:6332` | F6/F8, IMG8 | radio selected state, upload row, table baseline | same Drawer with batch upload selected | 批量上传、上传模板、提交并投放 | 不新增独立命中态骨架 | radio -> upload -> table -> footer | screenshot + reuse hit-state test | none |

## Figma Interaction Contract

| 页面/状态 | UI区域 | 可操作控件/文案 | nodeId | 触发前状态 | 触发动作 | 触发后状态 | Code执行断言 | Verify点击断言 | 负向断言(禁显/无副作用) |
|---|---|---|---|---|---|---|---|---|---|
| 配置-全部用户/预埋名单 | 规则入口 | 查看【不激励】规则 | `1:10202` / `1:11370` | prompt visible | click link | 打开/跳转讨论材料，记录点击 | handler uses configured URL and operation logger | click triggers one logger call | 不展示下载/申诉入口 |
| 奖励投放 | SubTab | 剔除明细 | `1:12273` / `1:12560` | active `奖励下发` or `投放明细` | click tab | activeSubTab becomes remove detail | `SubTab.REMOVE_DETAIL` renders only matching reward type table | Tab active and request fires after table mount | legacy tabs remain clickable |
| DOU+币剔除明细 | 作品ID筛选 | 作品ID input/search | `1:12120` | table loaded | input IDs and submit | request params include `candidate_ids` | formatter keeps activity/config/page/page_num/candidate_ids | request payload assertion | 不改投放明细 table params |
| DOU+币/券剔除明细 | 操作人筛选 | 操作人 PeopleSelect | `1:12281` / `1:12390` | table loaded | select/search operator | request params include `operator_id` | uses existing `PeopleSelect` and `PeopleCard` | selected operator refreshes table | 不新增后端操作人列表接口 |
| DOU+券剔除明细 | 作者ID筛选 | 作者ID input/search | `1:12390` | table loaded | input author IDs and submit | request params include `candidate_ids` | label 作者ID maps to candidate_ids field | request payload assertion | 不用 `author_ids` unless IDL later changes |
| 剔除明细 | 分页 | pagination controls | `1:12126` / `1:12401` | table loaded | change page/pageSize | request params update `page`/`page_num` | EcopTable request maps current/pageSize | page request assertion | 不做 client-only pagination |
| 人工提报命中态 | 一键移除 | 一键移除 | `87:7000` | invalid/no-incentive rows exist | click | current list removes hit rows locally and preserves removed records for export | no `apiCandidateRemove`/`candidate_remove` request; store updates list and removed record cache | hit rows gone, valid rows remain | export records preserved; no manual remove network side effect |
| 人工提报命中态 | 导出剔除明细 | 导出剔除明细 | `87:7002` | removed records exist, including after one-click removal | click | download request succeeds and opens/shows `lark_url`; summary/action area remains displayed for repeated export | request `records` contains only preserved removed records | lark_url visible/opened; repeated click sends same removed records | valid rows not exported; 提报汇总栏 and buttons do not disappear after removal |
| 人工提报命中态 | 行级移除 | 移除 | `87:7043` etc. | row visible | click row remove | row removed from current list locally; hit rows are preserved for export | store setter updates list and removed record cache without candidate remove request | row count decreases | other rows unchanged |
| 人工提报命中态 | 提交并投放 | 提交并投放 | `87:7133` | hit rows exist | click footer ok | submit blocked with PRD/Ask First message | guard checks `if_satisfy_delivery_rules === false || if_not_incentive` | batch submit modal not opened | no reward submit request |
| 人工提报批量上传 | 批量上传 | 批量上传 radio/upload | `25:13971` / `101:6308` | drawer visible | upload sheet | response rows render; hit rows use same status/action contract | `apiGetDeliveryItemsFromSheet` response fields consumed | same summary and guard appear | no distinct unsupported hit UI |

## 剔除明细列表样式总表

| 页面/列表 | 列名 | nodeId | 数据字段 | renderer / component strategy | 筛选/排序 | 固定列/宽度策略 | 必显子元素 | 禁显子元素/残留 | Code执行断言 |
|---|---|---|---|---|---|---|---|---|---|
| DOU+币剔除明细 | 作品内容 | `1:12278` | `item_card.item_model...title`, `item_card.item_model.item_id`, cover | reuse `SmallerImage` + title/id vertical layout from coin delivery table | filter label 作品ID -> `candidate_ids`; no confirmed sort | first column, composite cell | 封面、视频标题、视频ID | 充值记录、投放状态 | renderer handles missing cover/title/id as `-` |
| DOU+币剔除明细 | 剔除发奖原因 | top `1:12120` | `remove_reason` | plain text | no confirmed sort | normal text column | reason text | 不展示处罚原因列 | column maps API field exactly |
| DOU+币剔除明细 | 剔除发奖时间 | `1:12291` | `remove_time` | `dayjs.unix(remove_time).format(...)` | no confirmed sort; Figma header has icon but sorting protocol P1 | normal time column | time text | 不展示投放时间字段 | unix seconds formatting verified |
| DOU+币剔除明细 | 操作人 | `1:12281` | `operator_id` | reuse `PeopleCard`, filter uses `PeopleSelect` | filter `operator_id` | normal user column | operator people card or `-` | 不新增操作人接口 | request includes employee id |
| DOU+券剔除明细 | 作者信息 | `1:12561` | `author_info.author_name`, `author_info.author_id`, avatar | reuse coupon distribution author renderer | filter label 作者ID -> `candidate_ids`; no confirmed sort | first column, composite cell | 头像/昵称/ID | 不展示作品内容 | renderer handles missing avatar/name/id |
| DOU+券剔除明细 | 剔除发奖原因 | `1:12670` | `remove_reason` | plain text | no confirmed sort | normal text column | reason text | 不展示处罚原因列 | column maps API field exactly |
| DOU+券剔除明细 | 剔除发奖时间 | top `1:12390` | `remove_time` | `dayjs.unix(remove_time).format(...)` | no confirmed sort | normal time column | time text | 不展示投放时间字段 | unix seconds formatting verified |
| DOU+券剔除明细 | 操作人 | top `1:12390` | `operator_id` | reuse `PeopleCard`, filter uses `PeopleSelect` | filter `operator_id` | normal user column | operator people card or `-` | 不新增操作人接口 | request includes employee id |

## 人工提报列表样式总表

| 页面/列表 | 列名 | nodeId | 数据字段 | renderer / component strategy | 筛选/排序 | 固定列/宽度策略 | 必显子元素 | 禁显子元素/残留 | Code执行断言 |
|---|---|---|---|---|---|---|---|---|---|
| 人工提报命中态 | 序号 | `87:7006` / rows `87:7016` | row index | existing Table index | n/a | existing | 序号数字 | n/a | stable row key/index |
| 人工提报命中态 | 视频/图文内容 | `87:7007`, row status `87:7028`/`87:7113` | `item_card`, `if_satisfy_delivery_rules`, `if_not_incentive`, `not_incentive_reason` | extend existing item_card cell | n/a | existing first content column | 封面、标题、ID、红字状态 | 不隐藏 existing 投放记录提示 | hit fields render red `命中【不激励】规则` |
| 人工提报命中态 | 投放金额(元) | `87:7008` | `delivery_config.delivery_amount` | existing editable InputNumber | n/a | existing | amount editor | n/a | existing validation kept |
| 人工提报命中态 | 投放时长 | `87:7009` | `delivery_config.delivery_duration` | existing Select | n/a | existing | duration select | n/a | existing validation kept |
| 人工提报命中态 | 转化目标偏好 | `87:7010` | `delivery_config.target_likes` | existing Select | n/a | existing | option text | n/a | existing validation kept |
| 人工提报命中态 | 投放生效时间 | `87:7011` | `delivery_config.effective_time` | existing DatePicker | n/a | existing | datetime | n/a | existing validation kept |
| 人工提报命中态 | 目标受众 | `87:7012` | `delivery_config.target_audience` | existing Select | n/a | existing | audience text | n/a | existing validation kept |
| 人工提报命中态 | 提报理由 | `87:7013` | `delivery_reason` | existing Textarea | n/a | existing | reason input | n/a | existing validation kept |
| 人工提报命中态 | 操作 | `87:7014`, row remove `87:7043` | row id/candidate id | existing row remove + local preserved removed records | n/a | existing action column | 移除 | 不新增申诉 | click removes only target row and does not call candidate remove |

## Figma Cell Contract

| 页面/表格 | 列名 | nodeId | 单元格类型 | 子元素(逐行) | 必显子元素/字段 | 禁显子元素/残留 | 形态/热区/空态 | execute提取数据 | 内联样式(简单标签可选) | Code执行断言 |
|---|---|---|---|---|---|---|---|---|---|---|
| 人工提报命中态 | 视频/图文内容 | `87:7028`, `87:7113` | complex status cell | cover/title/id/status labels | `命中【不激励】规则`; optionally `不满足准入门槛` | 不自动移除命中行 | status under item id; row remove remains hot | row `if_not_incentive`, `if_satisfy_delivery_rules` | red warning text from Figma style token | status visible when field true |
| 人工提报命中态 | 操作区 | `87:6998`, `87:7000`, `87:7002` | action summary | alert text; two buttons | summary count, 一键移除, 导出剔除明细 | 不显示申诉入口 | button click hot area follows Auxo Button；removed records 存在时保留完整提报汇总栏和按钮组；无当前命中项时 `一键移除` 置灰，`导出剔除明细` 保持可点击 | hit count, total count, removed records | Figma cache style read at execute | no current hit item still keeps summary/action area visible; one-click remove is disabled; export remains enabled |
| 配置提示 | 规则入口 | `1:10202`, `1:11370` | inline prompt/link | sentence + link copy | 完整 PRD copy, link copy | 不显示数量/下载 | link click area only on `查看【不激励】规则` | activity participation state | Figma text style read at execute | link not static text |

## Style Source Contract Matrix

| style_id | style_source | source field/token | frontend behavior | fallback boundary | backend config action |
|---|---|---|---|---|---|
| STYLE-CFG-PROMPT | FIGMA_COMPONENT_TOKEN | node `1:10202` / `1:11370` text style and fill | Execute reads Figma node/token and maps to existing Auxo text/link style | If exact token unavailable, use existing app link style but keep placement/copy | none |
| STYLE-REMOVE-TAB-ACTIVE | FIGMA_COMPONENT_TOKEN | active tab nodes `1:12273` / `1:12560` | Use existing Radio/Tab active styling consistent with app | Do not hardcode color if component supplies token | none |
| STYLE-REMOVE-FILTER | REFERENCE_SOURCE | existing EcopTable search form + Figma filter placement | Use existing table search controls; labels match PRD/Figma | No new bespoke filter component | none |
| STYLE-WORK-CELL | REFERENCE_SOURCE | existing coin delivery table renderer | Reuse cover/title/id composite layout | Missing cover displays fallback only as normal empty image/text state, not mock data | none |
| STYLE-AUTHOR-CELL | REFERENCE_SOURCE | existing coupon delivery table renderer | Reuse avatar/nickname/id layout | Missing avatar/name renders `-` | none |
| STYLE-HIT-STATUS | FIGMA_COMPONENT_TOKEN | row labels `87:7028`, `87:7113` | Red inline status under item id | If token unavailable, use existing danger text token | none |
| STYLE-HIT-SUMMARY | FIGMA_COMPONENT_TOKEN | alert `87:6998`, action group `87:6999` | Summary alert and buttons follow Figma order | Use Auxo alert/button tokens if exact fill unavailable | none |
| STYLE-REMOVE-REASON | BACKEND_FIELD | `remove_reason`, `not_incentive_reason` | Render backend text as reason; no frontend forced override except AF-002 labels for remove action | Empty backend reason renders `-` and records P1 if required | Backend must return final reason content |

## PRD Literal Copy Contract

| copy_id | source_ref | original copy | allow_rewrite | acceptance method |
|---|---|---|---|---|
| COPY-CFG-PROMPT | `prd-source.md:147-152`; Figma `1:10202`/`1:11370` | 奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖 | no | DOM exact text |
| COPY-CFG-LINK | same | 查看【不激励】规则 | no | clickable text exact |
| COPY-MANUAL-SUMMARY | PRD 3.2; Figma `87:6998` | 共{作品总数}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：{作品个数}个 | placeholders only | render count with exact template |
| COPY-HIT-LABEL | PRD 3.2; Figma `87:7113` | 命中【不激励】规则 | no | row label exact |
| COPY-INVALID-HIT-LABEL | Figma `87:7028` | 不满足准入门槛  命中【不激励】规则 | no except spacing can follow component layout | row label exact terms |
| COPY-ONE-CLICK-REMOVE | Figma `87:7000` | 一键移除 | no | button exact |
| COPY-EXPORT-REMOVE | PRD comments; Figma `87:7002` | 导出剔除明细 | no | button exact |
| COPY-SUBMIT | Figma `87:7133` | 提交并投放 | no | footer button exact |
| COPY-TIMEOUT | PRD 3.2 | 治理校验失败，请稍后重试 | no | error message exact |
| COPY-EXCEPTION | PRD 3.2 | 治理校验异常，请联系管理员 | no | error message exact |
| COPY-REMOVE-DETAIL-TAB | Figma `1:12273` / `1:12560` | 剔除明细 | no | tab exact |

## Figma / UI 改造清单

| ui_item | requirement_ids | Figma evidence | code locator | implementation summary | verification |
|---|---|---|---|---|---|
| 配置页不激励提示 | AR-001, AR-002, AR-015 | `1:9770`, `1:10938`, IMG3/IMG4 | `step-reward-config/index.tsx` | 条件展示提示与 link，接入点击埋点 | 两种参与资格状态截图、click logger |
| 奖励投放剔除明细 SubTab | AR-011, AR-013, AR-017 | `1:12120`, `1:12390`, IMG5/IMG6 | `send-award/index.tsx` | 新增 `剔除明细` SubTab，按 reward type 渲染表格 | tab click/render/logger |
| DOU+币剔除明细表 | AR-011, AR-012 | F3/IMG5 | new `dou-coin-remove-record-table/index.tsx` | `apiGetDouPlusCoinRemoveRecord` + EcopTable + PeopleSelect | request params + table render |
| DOU+券剔除明细表 | AR-013, AR-014 | F4/IMG6 | new `dou-coupon-remove-record-table/index.tsx` | `apiGetDouPlusCouponRemoveRecord` + EcopTable + PeopleSelect | request params + table render |
| 人工提报命中态 | AR-006, AR-007, AR-008, AR-009, AR-010, AR-016 | F5/F7/IMG7 | store/drawer/form files | 命中字段、summary、buttons、row status、submit guard、本地移除、已移除记录导出 | mock response -> hit UI, local remove/no candidate_remove request, export after removal, submit tests |
| 批量上传命中复用 | AR-006, AR-007, AR-010 | F6/F8/IMG8 + AF-003 | store/form/drawer files | sheet response 命中字段复用同一命中态 | batch upload hit scenario |
| 发奖前剔除逻辑 | AR-003, AR-004, AR-005 | PRD + BAM sync | send award handlers / existing award components | 接入剔除 wrapper/错误文案/空名单处理 | wrapper request + message assertions |
| 埋点 | AR-015, AR-016, AR-017 | PRD tracking table | config prompt/manual form/send-award | 复用 operation-logger，参数含 activity/config/reward type | logger unit/integration assertions |

## Interface And BAM Integration Plan

| API / wrapper | Current evidence | Planned usage | mock_preview_behavior | P1 discovery |
|---|---|---|---|---|
| `apiGetDeliveryItemsFromSheet` | Existing call in `manuallySubmitVideoStore.ts`; BAM field update has `if_not_incentive`, `not_incentive_reason` | 批量上传后读取命中字段 | natural UI sheet upload request drives BAM mock response | 手动输入 `apiSearchDeliveryItems` 是否同字段同步 |
| `apiCandidateRemove` | Generated wrapper; path `/api/buyin/admin/content_activity/candidate_remove` | 奖励下发成功后上传本次不发奖/剔除候选名单；人工提报一键/行级移除不得调用 | post-success real wrapper request with `activity_id`, `config_id`, `remove_candidates` | candidate_id source and failure message |
| `apiDownloadContentRemoveRecord` | Generated wrapper; request `records`, response `lark_url` | 导出剔除明细 | real wrapper request, BAM mock returns `lark_url` | 字段空值和处罚原因数组格式 |
| `apiGetDouPlusCoinRemoveRecord` | Generated wrapper; fields `activity_id`, `config_id`, `page`, `page_num`, `candidate_ids`, `operator_id` | DOU+币剔除明细 table | real GET request, BAM mock returns records/total | sort/error code/has_more use |
| `apiGetDouPlusCouponRemoveRecord` | Generated wrapper; same request shape | DOU+券剔除明细 table | real GET request, BAM mock returns records/total | product label 作者ID maps to `candidate_ids` |

## Excluded Real Integration

| exclusion_id | Excluded real integration | Why excluded in MOCK_PREVIEW | Required task/mock closure path | Real verify recovery |
|---|---|---|---|---|
| EX-RI-001 | 真实治理处罚状态与发奖事务一致性 | 后端治理接口、罚单表和发奖事务运行态不在 plan 阶段验证 | `/delivery:task` 生成接口场景；`/delivery:mock` 基于自然发奖操作请求生成 mock | 后端 ready 后用真实环境复验自然处罚/解除/空名单 |
| EX-RI-002 | 剔除明细接口排序、错误码、has_more 最终行为 | BAM/IDL 已同步但产品未定义排序和错误码 UI | task 中列 PLAN_DISCOVERY；mock 覆盖分页成功和错误提示 | 接口联调时替换/补充错误码映射 |
| EX-RI-003 | 正式 `查看【不激励】规则` URL/token | Ask First 确认目标材料，但具体 URL 需主 agent 定向核对 | task 中绑定当前材料地址并留 review item | URL 确认后替换常量/配置 |
| EX-RI-004 | 埋点事件名、element_id、UV 聚合口径 | PRD 给了路径/模块/字段，代码需按现有规范命名 | task 中搜索 logger 规范并生成命名映射 | 数据验收时与 DA/埋点平台核对 |
| EX-RI-005 | 导出飞书表格真实创建与权限 | `download_content_remove_record` 返回 `lark_url`，真实权限无法在 mock-preview 保证 | mock 只验证 request 字段和 lark_url handling | 真实接口验证表格可打开、字段齐全 |

## Task Materialization Inputs

| input_id | Candidate code locator | Implementation directive source | Allowed file range | Forbidden file range | Verification command suggestion | Real integration exclusion | Stop condition |
|---|---|---|---|---|---|---|---|
| TMI-A | `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/**` | UI-001/UI-002; AR-001/002/015 | config component and local styles/constants only | generated BAM, `.trae/DELIVERY_STATE.md` | package lint/typecheck; focused component test if framework exists | EX-RI-003/004 | Cannot locate participation state in form |
| TMI-B | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/**` | UI-003/UI-004; list style table; AR-011..014/017 | `send-award/index.tsx`, new sibling remove-record table components, local utilities | unrelated award APIs, non-target app/package | typecheck; table request unit tests; manual UI request capture | EX-RI-002/004 | Reward type/config id cannot be passed to table |
| TMI-C | `apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/**`; `stores/manuallySubmitVideoStore.ts` | UI-005/UI-006; AR-006..010/016 | manual submit store/drawer/form/local styles/constants; preserved removed-record state only | generated BAM, unrelated stores, manual `apiCandidateRemove` calls | typecheck; store tests; interaction tests for local remove/export-after-remove/submit guard | EX-RI-001/005 | `delivery_item_info` lacks usable item/candidate id after BAM sync |
| TMI-D | `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/award-videos/**`, `award-authors/**`, existing batch submit handlers | AR-003..005; REPAIR-001 | minimal hook points around submit/guard/message and post-success no-award upload | large refactor of reward calculation UI | wrapper request assertions for award success then `apiCandidateRemove`; error message tests | EX-RI-001/002 | Existing submit path cannot be safely located |
| TMI-E | Logger call sites in config prompt, manual form, send-award | AR-015..017 | existing operation-logger usage patterns only | new logging framework | logger spy tests; manual click/expose verification | EX-RI-004 | No existing event naming pattern found |

Downstream `/delivery:task` must generate Test Case Matrix, BAM Mock Response Field Coverage Matrix, Mock Preview Scope, and Mock / Real Boundary inputs from this plan. It must not ask business code to create mock data. BAM mock artifacts are generated or adjusted only through `/delivery:mock`; if two rounds of natural UI clicks cannot locate a required request, mark that interface as `synthetic_contract` for mock closure and add a real verify recovery item.

## Design Rework Task Materialization Inputs

| design_source | status | task input | blocking |
|---|---|---|---|
| `07-design-alignment.md` | TEMPLATE_ONLY; no design rework handoff | none | no |
| Figma cache F1-F8 / IMG1-IMG8 | G1-G18 PASS; all core main states confirmed | execute reads actual Figma node/token data before UI implementation | no |

## Risks And Low Confidence Items

| risk_id | Level | Item | Handling |
|---|---|---|---|
| R-001 | P1 | 正式规则跳转 URL/token | Targeted main review; does not block mock-preview UI |
| R-002 | P1 | 导出字段空值、`not_incentive_reason` 多值格式、处罚原因最新罚单口径 | Use AF-002 as frontend behavior; real verify with backend |
| R-003 | P1 | `candidate_id` 与 item/author id 映射 | task discovery before coding remove request |
| R-004 | P1 | 剔除明细接口排序、错误码、`has_more` | keep page/page_num/total; register discovery |
| R-005 | P1 | 埋点事件名和 UV 聚合口径 | reuse operation-logger; targeted naming review |
| R-006 | LOW | 手动输入接口是否和 sheet 接口同样返回不激励字段 | BAM sync confirms sheet update; task must inspect `apiSearchDeliveryItems` type/response |

## Plan Gate Self Check

| Check | Result | Notes |
|---|---|---|
| Missing Sections | PASS | Required sections included, including mock-preview and list/table contracts |
| Invalid Enum | PASS | Plan Readiness `PARTIAL_READY`; Implementation Mode `MOCK_PREVIEW`; Figma actions/enums use allowed values |
| Task Materialization Inputs | PASS | Inputs include code locators, directive sources, allowed/forbidden ranges, verification, exclusions, stop conditions |
| Mock Preview Leakage | PASS | No mock rules/static responses/business mock data planned |
| Mock Contract Placement | PASS | Mock matrices/scopes/boundaries only referenced as downstream `/delivery:task` outputs, not generated here |
| PRD Coverage Gaps | PASS | AR-001..AR-017 mapped with behavior, verification, real integration gap |
| Field Source Coverage Gaps | PASS_WITH_P1 | All visible fields mapped; P1 gaps registered for URL, reason format, sorting/error code |
| Figma Contract/Region/Cell/Interaction Gaps | PASS | F1-F8/IMG1-IMG8 consumed; no targeted MCP read needed |
| Unsupported Implementation Assumptions | PASS | Reuse decisions tied to repo evidence and generated BAM wrappers |
| Design Rework Coverage | PASS | `07-design-alignment.md` is TEMPLATE_ONLY; no design blocker |

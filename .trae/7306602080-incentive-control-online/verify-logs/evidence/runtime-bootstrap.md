# Runtime Bootstrap Evidence

- captured_at: 2026-07-08 18:19 CST
- browser_runtime_mode: TRAE_DESKTOP
- browser_tool: integrated_browser
- headless: false
- browser_view_id: 4c1e4095-84d7-42ee-abee-63b7eabd8d7e
- url: https://ecop.bytedance.net/alliance-operation-content/content-activity/list?cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- title: 内容生态运营｜橙蕉
- sso_result: business_page
- has_sso_text: false
- network_evidence_level: URL / method / resource type via integrated_browser network log; per-request payload/response details must be captured again for each active case when needed.
- network_log: verify-logs/evidence/runtime-bootstrap-network-2026-07-08T10-19-11-980Z.log
- console_summary: HMR connected; SIF first communication succeeded; React/defaultProps/findDOMNode/originTitle warnings present; watermark tenant warning present; alliance-operation-daren resource preload noise present.

## DOM Anchors

- Page contains `运营活动`, `创建内容活动`, `操作手册`.
- Filter/action anchors visible: `查询`, `重置`, `创建内容活动`.
- Table header sample visible: `活动信息`, `关联项目`, `活动状态`, `活动周期`, `活动目标`, `奖励类型`, `奖励下单金额`, `活动创建人`, `触达渠道`, `更新时间`, `操作`.
- List sample contains activity `测测不激励` with reward type `DOU+币、DOU+券`.

## Scope Note

This file only proves browser bootstrap and reusable runtime state. It does not close any verify case assertion. Each active case still requires its own persisted DOM / Network / screenshot evidence mapping.

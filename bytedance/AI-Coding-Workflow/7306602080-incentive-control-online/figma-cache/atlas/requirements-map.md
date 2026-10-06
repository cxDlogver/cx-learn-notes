# Requirement-to-Atlas Map

| requirement / UI state | PRD clue | atlas candidates | selected node / subregion | evidence_id | status | next action |
|---|---|---|---|---|---|---|
| 奖励配置-全部用户提示 | PRD 3.1: 全部用户配置项下方提示并查看规则 | 1:9770, whiteboard_05 | 1:9770 / prompt text | E-FIG-003 | matched | Plan consume |
| 奖励配置-预埋用户名单提示 | PRD 3.1: 仅限预埋用户配置项下方提示并查看规则 | 1:10938, whiteboard_05 | 1:10938 / prompt text | E-FIG-004 | matched | Plan consume |
| 查看【不激励】规则入口 | PRD 3.1 + 埋点 | 1:9770, 1:10938 | prompt link subregion | E-FIG-003; E-FIG-004 | matched | exact target URL remains P1 |
| 发奖前处罚状态判断 | PRD 2.2/3.2: 0自然处罚阻断，1/2解除不阻断 | no visual page required except manual submit | business rule, interface supplement L1 | E-PRD-003; E-TECH-001 | matched | Plan/BAM discovery for implementation fields |
| 人工提报命中汇总提示 | PRD 3.2: 共{作品总数}...{作品个数} | 25:13842 | 87:6993 / 87:6998 | E-FIG-007 | matched | Plan consume |
| 人工提报一键移除 | PRD 3.2: 点击后移除不满足/命中作品 | 25:13842 | 87:6999 / 87:7000 | E-FIG-007 | matched | Plan consume |
| 人工提报导出剔除明细 | PRD 3.2: 导出飞书表格字段 | 25:13842 | 87:6999 / 87:7002 | E-FIG-007 | matched | Button wording settled as “导出剔除明细”; export field details P1 |
| 人工提报行级命中文案 | PRD 3.2: 红字“命中【不激励】规则” | 87:7016 | BodyRows row labels | E-FIG-007 | matched | Plan consume |
| 人工提报提交限制 | PRD 3.2: 禁止提交处罚作品/账号 | 25:13842 footer/buttons | Drawer footer + PRD business rule | E-FIG-007; E-PRD-004 | matched | Plan consume |
| 提报方式-手动输入 | PRD/Figma drawer option | 25:13842 | 87:6973 radio group | E-FIG-007 | matched | Plan consume |
| 提报方式-批量上传 | PRD/Figma drawer option | 25:13971 | 101:6308 radio/upload/table | E-FIG-008 | matched/reference | same hit rules expected; no mode-specific hit variant found, P1 note only |
| DOU+币剔除明细 Tab | PRD 3.3: 新增 Tab, 作品ID/操作人筛选, 作品表 | 1:12120 | 1:12120 table/filter/pagination | E-FIG-005 | matched | Plan consume |
| DOU+券剔除明细 Tab | PRD 3.3: 新增 Tab, 作者ID/操作人筛选, 作者表 | 1:12390 | 1:12390 table/filter/pagination | E-FIG-006 | matched | Plan consume |
| 奖励下发 / 投放明细 legacy Tabs | Existing code and Figma show existing options | send-award index, 1:12120/1:12390 | existing SubTab REWARD/DETAIL | E-CODE-002; E-FIG-005; E-FIG-006 | legacy-baseline | Keep unless PRD explicitly changes |
| 剔除明细埋点 | PRD 4: exposure/click by config and reward type | 1:12120, 1:12390 | active tab + PRD tracking table | E-PRD-006; E-FIG-005; E-FIG-006 | matched | Plan consume |

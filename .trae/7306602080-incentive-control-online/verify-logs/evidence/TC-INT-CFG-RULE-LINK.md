# TC-INT-CFG-RULE-LINK Evidence

- captured_at: 2026-07-08 18:33 CST
- verification_method: natural UI
- entry: reward config page, prefilled-list prompt visible
- activity_id: 7649322835323650313
- business_view_id: 4c1e4095-84d7-42ee-abee-63b7eabd8d7e
- opened_wiki_view_id: 712e3b3e-d929-4ac2-8a24-ffc2dc015807
- business_url: https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7649322835323650313&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- screenshot: screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png
- before_network_log: verify-logs/evidence/TC-INT-CFG-RULE-LINK--before-network.log

## Before Click DOM

- Link text: `查看【不激励】规则`.
- Link href: `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink`.
- Link target / rel: `_blank` / `noopener noreferrer`.
- Link class: `src-routes-content-activity-edit-components-step-reward-config-index-module__noIncentiveRuleLink-x51YbM`.
- Link rect: x=617, y=515, width=128, height=20.
- Prompt rect: x=146, y=515, width=599, height=20.
- Parent prompt text includes both the explanatory copy and the rule link, but `entirePromptIsLink=false`.
- Link computed style: display `block`, color `rgb(0, 136, 255)`, font-size `14px`, line-height `20px`, text-decoration `none`, cursor `pointer`.
- Negative pre-scan: `下载名单=false`, `申诉=false`, `保存成功=false`, `提交成功=false`.

## Click Result

- Natural click target: accessibility ref `e62`, role `link`, name `查看【不激励】规则`.
- Browser reported a new tab opened.
- New tab URL: `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`.
- New tab title: `电商内容生态激励管控 - 飞书云文档`.
- New tab body includes `电商内容生态激励管控`, `一、背景`, and `二、底线问题剔除`.

## After Click Business Page State

- Business page URL remains unchanged.
- Business page title remains `内容生态运营｜橙蕉`.
- Rule link remains visible with text `查看【不激励】规则`.
- Prefilled-list radio state remains selected: `prefilledChecked=true`, `allUserChecked=false`.
- Link rect remains x=617, y=515, width=128, height=20.
- Prompt rect remains x=146, y=515, width=599, height=20.
- `entirePromptIsLink=false` after click.
- Negative post-scan: `下载名单=false`, `申诉=false`, `保存成功=false`, `提交成功=false`, `loadingSave=false`.
- Footer buttons still show `取消`, `保存草稿`, `上一步`, `下一步`; no save/submit completion UI appeared.

## Network / Side-Effect Scan

- After click, the original business tab network list contained only:
  - `POST https://mcs.snssdk.com/v1/list`
  - `POST https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=ecop_platform`
  - `POST https://mon.zijieapi.com/monitor_browser/collect/batch/?biz_id=alliance_operation_content`
- No activity save/submit endpoint, download endpoint, appeal endpoint, or form write request was observed in the original business tab after the click.

## Materialization

- Screenshot was initially generated in Trae temp screenshot storage and copied to workspace:
  `screenshots/TC-INT-CFG-RULE-LINK--prompt-visible--link-hot-area.png`.
- `file` reports: `PNG image data, 1474 x 1285, 8-bit/color RGB, non-interlaced`.

## Design Boundary

This evidence is a verify runtime source only. It records link hot area and state preservation, and does not claim Figma-vs-runtime visual alignment.

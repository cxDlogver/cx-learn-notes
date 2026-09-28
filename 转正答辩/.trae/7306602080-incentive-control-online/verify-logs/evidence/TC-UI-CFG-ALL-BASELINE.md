# TC-UI-CFG-ALL-BASELINE Evidence

- captured_at: 2026-07-08 18:23 CST
- verification_method: natural UI
- entry: content activity list -> editable activity `7649322835323650313` -> edit page -> click `下一步`
- url: https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7649322835323650313&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- screenshot: screenshots/TC-UI-CFG-ALL-BASELINE--config-all-user--config-prompt-row.png

## DOM Assertions

- `全部用户` radio wrapper class includes checked state: `auxo-radio-wrapper auxo-radio-wrapper-checked`.
- `仅限预埋用户` radio wrapper is present but not checked.
- Prompt container `[class*=noIncentivePrompt]` found.
- Prompt text includes exact PRD copy: `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖`.
- Rule link `[class*=noIncentiveRuleLink]` found with exact text: `查看【不激励】规则`.
- Rule link href: `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink`.
- Rule link target/rel: `_blank` / `noopener noreferrer`.

## Negative Assertions

- `不激励数量`: not present.
- `下载名单`: not present.
- `申诉`: not present.
- `旧白板` / `占位`: not present.
- `下载` button/text: not present in current reward config viewport.

## Runtime Style / Layout Facts

- Prompt rect: x=146, y=430, width=599, height=20.
- Rule link rect: x=617, y=430, width=128, height=20.
- Prompt display: `inline-flex`; align-items: `center`; gap: `8px`; color: `rgb(188, 189, 192)`; font-size: `14px`; line-height: `20px`.
- Rule link color: `rgb(0, 136, 255)`; font-size: `14px`; line-height: `20px`.
- `全部用户` label rect y=399; prompt rect y=430, showing prompt directly below the activity participation radio row.
- The `<a>` hot area covers only the link text rect, not the whole prompt sentence.

## Design Boundary

This evidence is a verify runtime source only. It does not claim Figma-vs-runtime visual alignment; `/delivery:design` must compare this screenshot with the Figma baseline for `node 1:9770`.

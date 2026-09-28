# TC-UI-CFG-PREFILLED-BASELINE Evidence

- captured_at: 2026-07-08 18:26 CST
- verification_method: natural UI
- entry: TC-UI-CFG-ALL reward config state -> click `仅限预埋用户`
- activity_id: 7649322835323650313
- url: https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7649322835323650313&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- screenshot: screenshots/TC-UI-CFG-PREFILLED-BASELINE--config-prefilled-user--config-prompt-row.png

## DOM Assertions

- `仅限预埋用户` radio wrapper class includes checked state: `auxo-radio-wrapper auxo-radio-wrapper-checked`.
- `全部用户` radio wrapper is present but not checked.
- `预埋用户名单` label is present.
- Participant combobox is present at x=158, y=451, width=354, height=30.
- Prompt container `[class*=noIncentivePrompt]` found below participant combobox.
- Prompt text includes exact PRD copy: `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖`.
- Rule link `[class*=noIncentiveRuleLink]` found with exact text: `查看【不激励】规则`.
- Rule link href: `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink`.
- Rule link target/rel: `_blank` / `noopener noreferrer`.

## Negative Assertions

- `下载名单`: not present.
- `申诉`: not present.
- `不激励数量`: not present.
- `全部用户专属容器`: not present.

## Runtime Style / Layout Facts

- Participant combobox rect: x=158, y=451, width=354, height=30.
- Prompt rect: x=146, y=515, width=599, height=20.
- Rule link rect: x=617, y=515, width=128, height=20.
- Prompt display: `inline-flex`; align-items: `center`; gap: `8px`; color: `rgb(188, 189, 192)`; font-size: `14px`; line-height: `20px`.
- Rule link color: `rgb(0, 136, 255)`; font-size: `14px`; line-height: `20px`.
- The prompt appears after the prefilled-list combobox and before `内容体裁要求`.

## Design Boundary

This evidence is a verify runtime source only. It does not claim Figma-vs-runtime visual alignment; `/delivery:design` must compare this screenshot with the Figma baseline for `node 1:10938`.

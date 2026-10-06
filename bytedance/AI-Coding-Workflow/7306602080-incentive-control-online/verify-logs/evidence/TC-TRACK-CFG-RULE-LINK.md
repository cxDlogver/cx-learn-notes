# TC-TRACK-CFG-RULE-LINK Evidence

- captured_at: 2026-07-08 18:39 CST
- verification_method: natural UI + runtime React props inspection + source check
- activity_id: 7649322835323650313
- business_view_id: 4c1e4095-84d7-42ee-abee-63b7eabd8d7e
- clicked_wiki_view_id: bb9befe2-2a64-4c16-82b0-8e58a4d968d0
- business_url: https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7649322835323650313&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&externalLeadsDomainMock=1&cjSiteCode=St12502250000001
- source_ref: `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx:60-78`

## Runtime Bound Handler Evidence

- DOM link found with text `查看【不激励】规则`.
- React props keys found on the DOM node: `__reactFiber$r1w062m16s`, `__reactProps$r1w062m16s`.
- Runtime DOM node has `onClick` function.
- Bound `onClick` source contains exactly one `sendElementClickLog` call.
- Bound `onClick` source uses the existing `@ecom/operation-logger` import symbol: `_ecom_operation_logger__WEBPACK_IMPORTED_MODULE_20__`.
- Bound `onClick` source contains:
  - `page_id: 'content_activity_edit'`
  - `module_id: 'reward_config_no_incentive_prompt'`
  - `module_name: '不激励规则提示'`
  - `parent_block_id: 'content_activity_edit'`
  - `parent_block_name: '内容活动编辑'`
  - `element_id: 'no_incentive_rule_link'`
  - `element_name: NO_INCENTIVE_RULE_LINK_COPY`
  - `element_type: 'link'`
  - `activity_id: activityId`
  - `config_index: configIndex !== undefined ? String(configIndex + 1) : undefined`
  - `config_id: configId !== undefined ? String(configId) : undefined`
  - `view_type: viewType`
  - second argument `{ node: e.currentTarget }`

## Source Evidence

`index.tsx:60-78` defines `handleRuleLinkClick` and calls:

```tsx
sendElementClickLog(
  {
    page_id: 'content_activity_edit',
    module_id: 'reward_config_no_incentive_prompt',
    module_name: '不激励规则提示',
    module_type: 'block',
    parent_block_id: 'content_activity_edit',
    parent_block_name: '内容活动编辑',
    parent_block_type: 'page',
    element_id: 'no_incentive_rule_link',
    element_name: NO_INCENTIVE_RULE_LINK_COPY,
    element_type: 'link' as any,
    activity_id: activityId,
    config_index: configIndex !== undefined ? String(configIndex + 1) : undefined,
    config_id: configId !== undefined ? String(configId) : undefined,
    view_type: viewType,
  },
  { node: e.currentTarget },
);
```

## Click Evidence

- Runtime click record count: `1`.
- Last click record:
  - text: `查看【不激励】规则`
  - href: `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink`
  - target: `_blank`
  - defaultPrevented: `false`
- Click opened a Lark Wiki tab:
  `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh`.
- The Wiki tab title/body contains `电商内容生态激励管控`.
- The click did not block navigation.

## Logger / Network Observation

- Temporary wrappers were installed for `fetch`, `XMLHttpRequest`, `navigator.sendBeacon`, `console.log`, and `window.collectEvent`, then restored after capture.
- `collectEvent` wrapper did not receive calls; the SDK likely keeps an internal reference or reports through worker/monitor plumbing.
- The temporary XHR spy captured monitor requests referencing `https://mcs.snssdk.com/v1/list`, which indicates the logging transport was active, but the current browser tool did not expose the business event payload.
- Because direct DA payload was not observable in this runtime, this case result is `PASS_WITH_NOTES`, not full `PASS`.

## Negative Assertions

- No duplicate call in the bound handler: `sendElementClickLogCallCountInBoundHandler=1`.
- No new logger SDK import was introduced in this component; it uses existing import `import { sendElementClickLog } from '@ecom/operation-logger';`.
- No console records were captured during the click.
- Temporary spy was restored:
  - `loggerInstalled=false`
  - `collectOriginalStillPresent=false`
  - `collectEventType=function`

## Pending Recheck

- DA platform / production analytics口径 still needs downstream recheck because direct event payload was not observable through the integrated browser runtime.

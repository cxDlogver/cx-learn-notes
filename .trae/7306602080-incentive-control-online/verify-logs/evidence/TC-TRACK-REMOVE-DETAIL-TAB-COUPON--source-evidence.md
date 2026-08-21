# TC-TRACK-REMOVE-DETAIL-TAB-COUPON Source Evidence

## Component Source

Source ref:

`apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`

Relevant source lines:

- `currentConfigLogContext`: lines 746-756.
- `subTabModuleMetaMap[SubTab.REMOVE_DETAIL]`: lines 774-808.
- `sendModuleExposeLog` for visible sub-tab module: lines 848-864.
- `Radio.Group onChange -> sendElementClickLog`: lines 962-990.

Key implementation facts:

- `currentConfigLogContext` includes `activity_id`, `config_id`, `config_index`, `config_name` and `reward_type`.
- `subTabModuleMetaMap[SubTab.REMOVE_DETAIL]` defines module exposure metadata for `remove_detail_data` and spreads `currentConfigLogContext` into `extra`.
- `Radio.Group` calls `sendElementClickLog` when `nextSubTab === SubTab.REMOVE_DETAIL`.
- Click payload includes `element_id='remove_detail_tab'`, `module_id='remove_detail_data'`, `module_name='内容活动剔除明细'`, `element_type='tab'` and `...currentConfigLogContext`.

Relevant source excerpt:

```tsx
const currentConfigLogContext = useMemo(
  () => ({
    activity_id: activity_id,
    config_id:
      currentConfigId !== undefined && currentConfigId !== null ? String(currentConfigId) : undefined,
    config_index: tabKeyMap[activeTab] ? String(activeTab + 1) : undefined,
    config_name: tabKeyMap[activeTab]?.key,
    reward_type: REWARD_TYPE_MAP[rewardType || 0] || '-',
  }),
  [activity_id, activeTab, currentConfigId, rewardType, tabKeyMap],
);
```

```tsx
[SubTab.REMOVE_DETAIL]: {
  module_id: 'remove_detail_data',
  module_name: '内容活动剔除明细',
  module_type: 'tab_module',
  parent_block_type: 'page',
  parent_block_id: 'activity_reward_distribution',
  extra: {
    ...currentConfigLogContext,
  },
},
```

```tsx
if (nextSubTab === SubTab.REMOVE_DETAIL) {
  sendElementClickLog(
    {
      page_id: 'activity_reward_distribution',
      module_id: 'remove_detail_data',
      module_name: '内容活动剔除明细',
      module_type: 'tab_module',
      parent_block_id: 'activity_reward_distribution',
      parent_block_name: '奖励投放页',
      parent_block_type: 'page',
      element_id: 'remove_detail_tab',
      element_name: SubTab.REMOVE_DETAIL,
      element_type: 'tab',
      ...currentConfigLogContext,
    },
    { node: e.target },
  );
}
```

## Runtime Bundle Check

Command:

```bash
curl -s 'http://localhost:8083/alliance-operation-content/static/js/async/content-activity/award/page.js' | sed -n '13080,13115p'
```

Observed bundle facts:

- Current local bundle contains the `Radio.Group` `onChange` implementation.
- Bundle code calls `sendElementClickLog(...)`.
- Bundle payload contains `module_id: 'remove_detail_data'`, `module_name: '内容活动剔除明细'`, `element_id: 'remove_detail_tab'` and object spread of `currentConfigLogContext`.

## Logger Transport Source

Source refs:

- `packages/operation-logger/src/index.ts:61-69`
- `packages/operation-logger/src/index.ts:147-164`
- `packages/operation-logger/src/index.ts:217-230`

Key facts:

- `sendTeaLog(eventName, params)` calls `window.collectEvent?.(eventName, { url, url_path, page_name, ...params })`.
- `sendModuleExposeLog` is `moduleCommonLog.bind(null, 'module_expose')`.
- `sendElementClickLog` is `elementCommonLog.bind(null, 'element_click')`.

Relevant source excerpt:

```ts
export function sendTeaLog(eventName: string, params = {}) {
  try {
    window.collectEvent?.(eventName, {
      url: window.location.href,
      url_path: window.location.pathname,
      page_name: window.location.href,
      ...params,
    });
  } catch (e) {}
}
```

```ts
export const sendModuleExposeLog = moduleCommonLog.bind(null, 'module_expose');
export const sendElementClickLog = elementCommonLog.bind(null, 'element_click');
```

## Runtime React Binding Evidence

Integrated browser React fiber inspection on the active `剔除明细` Radio.Button showed:

- Wrapper class: `auxo-radio-button-wrapper auxo-radio-button-wrapper-checked`.
- Input value: `剔除明细`.
- Fiber ancestors at depths 5 and 6 contain `memoizedProps.onChange`.
- The runtime `onChange` source contains:
  - `var nextSubTab = e.target.value`
  - `setActiveSubTab(nextSubTab)`
  - `if (nextSubTab === SubTab.REMOVE_DETAIL)`
  - `sendElementClickLog(...)`
  - `element_id: 'remove_detail_tab'`
  - spread of `currentConfigLogContext`

This proves the clicked runtime control is bound to the logger path in the active bundle, not only in TypeScript source.

## Runtime Context Resolution

After clicking `配置二 -> 剔除明细`, the active visible remove-detail module DOM contained:

```json
{
  "module_id": "remove_detail_data",
  "module_name": "内容活动剔除明细",
  "module_type": "tab_module",
  "parent_block_type": "page",
  "parent_block_id": "activity_reward_distribution",
  "extra": {
    "activity_id": "7655304206886322458",
    "config_id": "7655304206886355226",
    "config_index": "2",
    "config_name": "配置二",
    "reward_type": "DOU+券"
  }
}
```

The module rect was visible in the viewport (`x=215,y=492,width=1267,height=805`), so the exposure path had a visible module state to consume.

## Limitation

The temporary `window.collectEvent` wrapper received `0` calls in this runtime, while analytics transport requests were present. This mirrors `TC-TRACK-REMOVE-DETAIL-TAB-COIN`: the integrated browser cannot always observe direct business event payloads even when the local bundle/source path is bound and analytics transport is active.

Therefore this case closes as `PASS_WITH_NOTES`, with DA UV aggregation and direct collector payload as post-verify recheck items.

# TC-TRACK-MANUAL-HIT-EXPOSE Source Evidence

- captured_at: 2026-07-08T17:21:28Z
- execution_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- case_id: `TC-TRACK-MANUAL-HIT-EXPOSE`
- purpose: prove the runtime logger spy is observing the transport used by `sendModuleExposeLog`, and explain the duplicate/no-hit guards.

## Component Wiring

Source ref:

`apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx:604-644`

Key facts:

- The effect returns immediately when `hasSubmitHitItems` is false.
- The dedupe key is `activity_id|config_id|session_unix_time|submitMethod`.
- The effect skips reporting if `exposedHitSummaryKeysRef` already contains the key.
- On first hit summary visibility it calls `sendModuleExposeLog` with:
  - `page_id: activity_reward_distribution`
  - `module_id: manual_submit_hit_summary`
  - `module_name: 人工提报命中提示`
  - `module_type: block`
  - `parent_block_id: activity_reward_distribution`
  - `parent_block_name: 奖励投放页`
  - `activity_id`
  - `config_id`
  - `submitHitCount`
  - `submitHitTotalCount`
  - `submit_method`
  - `session_unix_time`
- After reporting, the key is added to `exposedHitSummaryKeysRef`.

Observed source excerpt:

```tsx
useEffect(() => {
  if (!hasSubmitHitItems) {
    return;
  }
  const exposeKey = [
    activity_id || '-',
    config_id || '-',
    session_unix_time || '-',
    submitMethod || '-',
  ].join('|');
  if (exposedHitSummaryKeysRef.current.has(exposeKey)) {
    return;
  }
  sendModuleExposeLog(
    {
      page_id: 'activity_reward_distribution',
      module_id: 'manual_submit_hit_summary',
      module_name: '人工提报命中提示',
      module_type: 'block',
      parent_block_id: 'activity_reward_distribution',
      parent_block_name: '奖励投放页',
      parent_block_type: 'page',
      activity_id,
      config_id,
      submitHitCount: String(submitHitCount),
      submitHitTotalCount: String(submitHitTotalCount),
      submit_method: submitMethod,
      session_unix_time: session_unix_time !== undefined ? String(session_unix_time) : undefined,
    },
    {},
  );
  exposedHitSummaryKeysRef.current.add(exposeKey);
}, [
  activity_id,
  config_id,
  hasSubmitHitItems,
  session_unix_time,
  submitHitCount,
  submitHitTotalCount,
  submitMethod,
]);
```

## Hit-State Derivation

Source ref:

`apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts:58-120`

Key facts:

- Reusable hit submit mode applies to `videoIds` and `url`.
- `isHitVideoItem` is true when `if_satisfy_delivery_rules === false` or `if_not_incentive === true`.
- `submitHitItems` filters current `videoItems` through `isHitVideoItem`.
- `submitHitCount` is `submitHitItems.length`.
- `submitHitTotalCount` is `videoItems.length` only in reusable hit submit mode.
- `hasSubmitHitItems` is `submitHitCount > 0`.

This explains why the accidental `999999999999` sample was not a no-hit state: the response contained `if_satisfy_delivery_rules=false`, so `hasSubmitHitItems` became true and a second exposure was expected.

## Logger Transport

Source ref:

`apps/alliance-operation-content/node_modules/@ecom/operation-logger/src/index.ts:61-69,147-164`

Key facts:

- `sendTeaLog(eventName, params)` calls `window.collectEvent?.(eventName, { url, url_path, page_name, ...params })`.
- `moduleCommonLog(event, params, options)` calls `sendTeaLog(event, ...)`.
- `sendModuleExposeLog` is `moduleCommonLog.bind(null, 'module_expose')`.

Observed source excerpt:

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
export function moduleCommonLog(
  event: string,
  params: IExtend<IModuleCommonEventParams> = {},
  options?: IOptions,
) {
  const parentParams = getParentCommonParams({
    ...options,
    nodeType: 'module',
  });

  sendTeaLog(event, {
    ...getModuleCommonParams(params),
    ...(parentParams || {}),
    ...params,
  });
}

export const sendModuleExposeLog = moduleCommonLog.bind(null, 'module_expose');
```

Therefore the runtime `collectEvent` wrapper is a direct spy on the transport used by `sendModuleExposeLog`.

## Runtime Bundle Check

Command:

```bash
curl -s 'http://localhost:8083/alliance-operation-content/static/js/async/content-activity/award/page.js' | rg -n -C 4 'manual_submit_hit_summary|sendModuleExposeLog'
```

Observed bundle facts:

- Current loaded local bundle contains `(0,_ecom_operation_logger__WEBPACK_IMPORTED_MODULE_11__.sendModuleExposeLog)`.
- The bundle contains `module_id: 'manual_submit_hit_summary'`.
- The relevant output was around bundle lines `3437-3445`.

This confirms the browser session was using the code path under verification, not only local TypeScript source.

## Scope Notes

- Verify evidence proves frontend runtime trigger and dedupe behavior.
- DA platform UV aggregation remains outside local verify and is recorded as a real analytics recheck item.
- No Figma-vs-runtime alignment is claimed by this tracking case.

# MTR Config Page Fresh Rerun Evidence 2026-07-13

## Scope

- command: `/delivery:verify --mtr`
- follow-up request: `将所有可以进行验证的配置页上进行验证`
- browser_tool: `integrated_browser`
- browser_runtime_mode: `TRAE_DESKTOP`
- app: `alliance-operation-content`
- local_dev_server: `http://localhost:8083/alliance-operation-content` health check returned `HTTP/1.1 200 OK`
- safety_policy: only natural read/navigation/click actions were executed; no save/submit/write action was intentionally triggered.

## Entry Attempts

| sample | URL | result |
|---|---|---|
| historical config sample | `activity_id=7649322835323650313` edit page without `externalLeadsDomainMock=1` | page loaded, but natural `下一步` was blocked by form validation: `结束时间支持最早选到明天`; DOM showed end date `2026-07-09`, so this sample is expired and not counted as fresh pass. |
| current MTR activity | `activity_id=7629288371705643310` edit page without `externalLeadsDomainMock=1` | page loaded; first step had valid activity period `2026-02-01` to `2026-12-31`; natural `下一步` entered `奖励配置`. |

Fresh config URL:

```text
https://ecop.bytedance.net/alliance-operation-content/content-activity/edit?type=edit&activity_id=7629288371705643310&cjDebugSubApp=alliance-operation-content%3Ahttp%3A%2F%2Flocalhost%3A8083%2Falliance-operation-content&cjSiteCode=St12502250000001
```

Assertions:

- URL did not contain `externalLeadsDomainMock=1`.
- `保存草稿` was disabled on the config page; no save action was clicked.
- browser-level safety interception was installed before config interaction for high-risk content-activity write paths, including `delivery_modify_save`; no blocked write was observed.

## Reward Config DOM Evidence

After clicking `下一步` on `activity_id=7629288371705643310`:

| field | observed value |
|---|---|
| active page | `奖励配置` step |
| config blocks | `配置1` through `配置6` |
| prompt copy | `奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖` |
| prompt count | `6` |
| rule link copy | `查看【不激励】规则` |
| rule link count | `6` |
| rule link href | all links point to `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh` |
| all-user sections | `4` sections contain activity qualification with `全部用户 / 仅限预埋用户` and the prompt/link |
| prefilled sections | `2` sections contain `预埋用户名单` plus the same prompt/link |
| negative scan | `不激励数量=false`, `下载名单=false`, `申诉入口=false`, `旧白板占位=false` |
| form state | `新增配置` / `复制配置` / `添加门槛` / `添加条件` disabled; `保存草稿` disabled; `上一步` and `下一步` available |

Representative all-user section:

```text
配置1 ... 活动参与资格 全部用户 仅限预埋用户 奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖 查看【不激励】规则 ...
```

Representative prefilled section:

```text
配置4 ... 活动参与资格 全部用户 仅限预埋用户 预埋用户名单 内容活动玩法圈选人群包 人群ID：cond_un_24263486 人群数量：7 查看更多详情 人群包将于2026-07-31过期， 可前往人群包详情进行续期 奖励发放环节将进行账号校验，命中【不激励】规则的账号无法被发奖 查看【不激励】规则 ...
```

## Rule Link Click Evidence

Action: clicked the first `查看【不激励】规则` link on the fresh no-mock config page.

Observed result:

| field | observed value |
|---|---|
| new tab URL | `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh` |
| new tab title | `电商内容生态激励管控 - 飞书云文档` |
| new tab body / navigation | contains `电商内容生态激励管控`, `一、背景`, `二、底线问题剔除` |
| original business URL | unchanged, still on the same `content-activity/edit?...activity_id=7629288371705643310...` reward config page |
| original form state | prompt/link count remained `6`; buttons remained disabled/enabled as before; no success/submission state appeared |
| browser capture link click count | `1` natural click on `查看【不激励】规则` |
| browser capture blocked writes | `[]` |
| browser capture requests after interaction | EDMP readonly group detail/search calls, `mcs.zijieapi.com/list`, `mon.zijieapi.com` monitor calls; no content-activity save/export/remove/award write endpoint observed |

Link hot-area evidence:

- each anchor text was exactly `查看【不激励】规则`.
- each anchor parent text contained the full sentence plus the link, so the whole prompt sentence was not the anchor.
- representative link rect was `w=128`, matching only the link copy width.

## Screenshot Evidence

Initial `browser_take_screenshot` returned an inline runtime screenshot for the reward config page. The tool did not write the requested `mtr-config-reward-config-20260713` PNG to workspace, so that initial attempt was not registered as a `local_file`. The activity rerun below supersedes screenshot materialization with a workspace PNG.

### Activity Rerun Screenshot Materialization

Follow-up rerun for `activity_id=7629288371705643310` used screenshot filename `mtr-rerun-config-7629288371705643310-20260713.png`. The source was found under `$(getconf DARWIN_USER_TEMP_DIR)/trae/screenshots/` and copied to the workspace:

```text
verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png
```

`file` reported `PNG image data, 2022 x 1715, 8-bit/color RGB, non-interlaced`, so this rerun screenshot is materialized as `local_file`. It supplements the DOM evidence above and is usable as a runtime source; it still does not turn verify into a Figma-vs-runtime design pass.

## Result By Case

| case_id | fresh rerun result | note |
|---|---|---|
| `TC-UI-CFG-ALL-BASELINE` | `PASS_WITH_NOTES` | Fresh no-mock config page contains all-user prompt/link sections and negative DOM scan passed. Existing design alignment note remains; activity rerun added local PNG `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png`. |
| `TC-UI-CFG-PREFILLED-BASELINE` | `PASS_WITH_NOTES` | Fresh no-mock config page contains prefilled-list sections with retained prefilled details and same prompt/link; negative DOM scan passed. Existing design alignment note remains; activity rerun added local PNG `verify-logs/screenshots/mtr-rerun-config-7629288371705643310-20260713.png`. |
| `TC-INT-CFG-RULE-LINK` | `PASS` | Natural click opened the target real Lark Wiki tab and preserved the original business form state; no save/download/appeal/write side effect observed. |
| `TC-TRACK-CFG-RULE-LINK` | `OPEN_EXTERNAL_SYSTEM` | Fresh natural click was observed and generic collector requests were present, but DA platform / direct payload aggregation was not queried. Runtime/browser-verifiable part is covered; DA/UV remains open. |

## Gate Implication

The previous config-page `OPEN_REAL_URL_GAP_FOR_FRESH_RERUN` is closed for the browser-verifiable UI and link cases above. The workspace still must not be promoted to `REAL_ENV_VERIFIED` because unrelated MTR blockers remain open, including manual governance fields, batch sheet parsing, real export, real award/write persistence, `operator_id` permission range, DOU+币 non-empty rows, and DA/UV aggregation.

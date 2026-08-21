# TASK-001 Review Packet

> stage: `/delivery:code`
> task_id: `TASK-001`
> generated_at: `2026-07-08 12:45:00 +0800`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`

## Task Summary

| item | value |
|---|---|
| requirement_id | `AR-001` |
| title | 配置页全部用户态不激励提示与规则入口 |
| cases | `TC-UI-CFG-ALL-BASELINE`, `TC-INT-CFG-RULE-LINK` |
| mode | `MOCK_PREVIEW` |
| mock boundary | No runtime mock; no BAM/mock/generated changes |
| UI Evidence Mode | `F2C_REQUIRED` |
| task source | `delivery-task.md:58-86` |
| context index | `code-review/context-index.md` |

## PRD / Figma Semantic Alignment

| dimension | evidence | conclusion |
|---|---|---|
| PRD | `prd-source.md:147-152` / `lark_parser_strict.md:60` requires prompt under 活动参与资格=全部用户 and link to 电商内容生态激励管控讨论 | MATCHED |
| Figma | node `1:9770`, text `1:10202`; D2C XML shows `audience-notice` with `DoubtIcon`, grey copy, blue link | MATCHED |
| Task | `delivery-task.md` requires exact copy, link hot area only on link text, no download/appeal/count/API | MATCHED |
| Test Matrix | `TC-UI-CFG-ALL-BASELINE` and `TC-INT-CFG-RULE-LINK` assert DOM exact text, placement, clickable link, and negative no extra download/appeal | MATCHED |

## UI Evidence

| evidence | path / excerpt |
|---|---|
| D2C archive | `code-review/d2c-evidence/task-TASK-001/1_9770/manifest.md` |
| D2C XML | `code-review/d2c-evidence/task-TASK-001/1_9770/figma_1_9770_1783501270027.xml`; source temp path was `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/.d2c_temp/figma_1_9770_1783501270027.xml` |
| D2C preview | `code-review/d2c-evidence/task-TASK-001/1_9770/figma_1_9770_1783501270027.jpg`; source temp path was `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/.d2c_temp/figma_1_9770_1783501270027.jpg` |
| Durable screenshot | `figma-cache/screenshots/1_9770-config-all-user-after.png` |
| Figma MCP | text node `1:10202`: PingFang SC 14px, line-height 20px, fill `#BCBDC0`, text includes `查看【不激励】规则` |
| D2C verify | Verdict `Excellent`; 0 critical, 0 moderate, 1 minor. Minor redundant `window.open` was fixed by targeted code-writer follow-up. |
| D2C cleanup | Temp XML/JPG may be cleaned after D2C verify; durable minimal archive is retained under `code-review/d2c-evidence/task-TASK-001/1_9770/`. |

## Final Diff And Changed Files

| artifact | path |
|---|---|
| changed files | `code-review/task-TASK-001-changed-files.md` |
| targeted diff | `code-review/task-TASK-001-targeted-diff.patch` |

Final business changed files:

| file | scope |
|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.tsx` | adds constants, `NoIncentiveRulePrompt`, native anchor link, and mounts it only when `has_select_crowd` is false |
| `apps/alliance-operation-content/src/routes/content-activity/edit/components/step-reward-config/index.module.scss` | adds Figma-aligned prompt/link styles |

## Code-Writer Gate Summary

Initial implementation:

- Result: `PASS`
- Scope Fit: only config page all-user prompt/link; no TASK-002+; no mock/BAM/generated.
- Validation: raw `pnpm --dir ... build` failed before build in dependency precheck; `pnpm_config_verify_deps_before_run=false pnpm --dir ... build` passed.
- Checkbox delta: `TASK-001` 6/6 steps checked.

D2C minor targeted fix:

- Result: `PASS`
- Changed only `index.tsx`.
- Removed redundant `onClick/preventDefault/window.open` from anchor and set `rel="noopener noreferrer"`.
- Build passed after fix.

## Mechanical Checks

| check | result | evidence |
|---|---|---|
| `git status --short` | PASS | only `index.tsx` and `index.module.scss` modified in business repo |
| `git diff --check` | PASS | exit code 0 after final diff |
| targeted debug scan | PASS | `rg` over the two changed files found no `console.log`, `debugger`, temp mock, or `.only(` |
| broad debug scan | BASELINE_FOUND | `task-TASK-001-debug-code-scan.md` shows pre-existing debug logs outside changed files |
| build | PASS | `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build`, final output total `28707.9 kB (gzip: 6622.6 kB)` |

## Scope Audit

| item | result |
|---|---|
| TASK-002 prefilled user state | Not implemented |
| TASK-003..TASK-008 | Not implemented |
| mock runtime / BAM marker / generated wrappers | Not modified |
| API request | Not added |
| download / appeal / count prompt | Not added |
| link target | Uses PRD-confirmed `https://bytedance.larkoffice.com/wiki/TraawmZfSi9dnlk25pBcKhRinUh?from=from_copylink` |

## Reviewer Focus

1. Confirm the final diff implements only `TASK-001` and does not accidentally affect prefilled user state beyond preserving hidden behavior.
2. Confirm `has_select_crowd === false` maps to “全部用户” and `true` remains reserved for `TASK-002`.
3. Confirm F2C evidence was consumed: icon, grey copy, blue link, inline row, 14px/20px, gap 8px.
4. Confirm native anchor still satisfies click/open requirement and link hot area is only the link text.
5. Confirm build and mechanical evidence are fresh after the D2C minor fix.

## Main Agent Preliminary Gate

`PASS_FOR_INDEPENDENT_REVIEW`: implementation and D2C minor fix are scoped, final build passes, and no mock/runtime or later-task changes were found. Final Task release still requires independent read-only review.

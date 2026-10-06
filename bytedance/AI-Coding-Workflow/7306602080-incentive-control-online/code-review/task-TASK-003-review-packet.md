# TASK-003 Review Packet

> created_at: `2026-07-08 13:21:22 +0800`
> workspace: `artifacts/7306602080-incentive-control-online`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
> task_id: `TASK-003`
> mode: `MOCK_PREVIEW`

## Task Summary

| item | value |
|---|---|
| requirement_id | `AR-011`, `AR-012` |
| cases | `TC-UI-COIN-REMOVE-PAGE`, `TC-DATA-COIN-FILTER-SCHEMA`, `TC-DATA-COIN-COLUMNS`, `TC-CELL-COIN-FIRST-ROW`, `TC-INT-REMOVE-TAB-SWITCH-COIN` |
| ruleId | `R-BAM-COIN-REMOVE-DEFAULT`, `R-BAM-COIN-REMOVE-FILTER` |
| UI Evidence Mode | `RUNTIME_BASELINE_ALLOWED` |
| implementation goal | 新增 DOU+币 `剔除明细` SubTab、作品ID/操作人筛选、作品维度表格和真实 `page/page_num` 分页 |
| explicit non-goals | 不实现 TASK-004 DOU+券表；不实现 TASK-008 埋点；不生成或修改 BAM mock runtime / generated mock / BAM marker |

## Source Contracts

| source | excerpt |
|---|---|
| `delivery-task.md ### Task 3` | 新增 `SubTab.REMOVE_DETAIL = 剔除明细`；新建 `dou-coin-remove-record-table`; 只调用 `apiGetDouPlusCoinRemoveRecord`; 参数为 `activity_id/config_id/page/page_num/candidate_ids/operator_id`; 列只保留 `作品内容/剔除发奖原因/剔除发奖时间/操作人`; 禁止 client-only pagination |
| `04-tech-plan.md UI-003` | DOU+币剔除明细使用 concrete reuse path，复用 `EcopTable/PeopleSelect/SmallerImage`，代码落点为 `send-award/index.tsx` 和新 `dou-coin-remove-record-table/index.tsx` |
| `04-tech-plan.md Region 147-150` | SubTab 三项为 `奖励下发/投放明细/剔除明细`; 筛选区为 `作品ID/操作人`; 表格列为 `作品内容/剔除发奖原因/剔除发奖时间/操作人`; 分页使用底部分页，展示 total 并发起 page/page_num 请求 |
| `04-tech-plan.md Interaction 165-169` | 点击 `剔除明细` 后 activeSubTab 渲染匹配 reward type 表；作品ID筛选映射 `candidate_ids`; 操作人筛选映射 `operator_id`; 分页更新 `page/page_num` |
| `04-tech-plan.md list style 180-183` | `item_card` 渲染作品内容；`remove_reason`; `remove_time` 用 `dayjs.unix(...).format(...)`; `operator_id` 用 `PeopleCard` |
| `09-test-case-matrix.md` | BAM matrix 已存在 `TC-UI-COIN-REMOVE-PAGE/R-BAM-COIN-REMOVE-DEFAULT` 和 `TC-DATA-COIN-FILTER-SCHEMA/R-BAM-COIN-REMOVE-FILTER`; Code 不改 mock runtime |

## PRD / Figma Semantic Alignment

| dimension | result | evidence |
|---|---|---|
| PRD contract | MATCHED | PRD 要 DOU+币奖励投放新增作品维度剔除明细，支持作品ID和操作人筛选、分页 |
| Figma contract | MATCHED | Figma cache node `1:12120` / IMG5；可见文案包含 `奖励下发`、`投放明细`、`剔除明细`、`作品内容`、`剔除发奖原因`、`剔除发奖时间`、`操作人`、`共40条` |
| task contract | MATCHED | TASK-003 六项 checkbox 均与 UI-003 / AR-011 / AR-012 同义 |
| test contract | MATCHED | cases 覆盖 Tab 切换、默认列表、筛选请求、列白名单、首行 cell 和分页请求 |
| scope boundary | MATCHED | TASK-004 DOU+券表与 TASK-008 logger 保持未实现；本 Task 不压缩完整交付范围，按串行队列后续继续 |

## Code Writer Result

```md
Result: PASS
Scope Fit: 仅实现 DOU+币剔除明细；未实现 DOU+券表、埋点、mock runtime 或 generated BAM
Validation: build PASS；business repo diff --check PASS；targeted scan PASS
P0 Blockers: 无
P1 Risks: UI/Network/截图/分页点击复核仍需 verify/design
```

## Changed Files

| file | status | scope |
|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | modified | 新增 `SubTab.REMOVE_DETAIL`、第三个 Radio、仅 DOU+币渲染 remove table；将 `subTabModuleMetaMap` 改为 `Partial<Record<SubTab, IModuleMeta>>`，避免提前实现 TASK-008 logger |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx` | added | 新增 DOU+币剔除明细 EcopTable，真实调用 `apiGetDouPlusCoinRemoveRecord` |
| `delivery-task.md` | modified | 仅勾选 TASK-003 六个 checkbox |
| `05-implementation-log.md` | modified | 追加 TASK-003 实现和验证记录，未宣称 independent review / main gate / checkpoint |

## Targeted Diff Summary

`send-award/index.tsx`:

```diff
+import DouPlusCoinRemoveRecordTable from '../dou-coin-remove-record-table';
 enum SubTab {
   REWARD = '奖励下发',
   DETAIL = '投放明细',
+  REMOVE_DETAIL = '剔除明细',
 }
-  const subTabModuleMetaMap = useMemo<Record<SubTab, IModuleMeta>>(
+  const subTabModuleMetaMap = useMemo<Partial<Record<SubTab, IModuleMeta>>>(
+                  <Radio.Button value={SubTab.REMOVE_DETAIL}>{SubTab.REMOVE_DETAIL}</Radio.Button>
+            {activeSubTab === SubTab.REMOVE_DETAIL && isCoinReward && (
+              <DouPlusCoinRemoveRecordTable activityId={activity_id} configId={currentConfigId || ''} />
+            )}
```

`dou-coin-remove-record-table/index.tsx`:

```tsx
export function formatEcopFilterParams(
  params: get_dou_plus_coin_remove_record_request & { page?: number; page_num?: number },
): Partial<get_dou_plus_coin_remove_record_request> {
  return (
    filterEmpty({
      activity_id: params.activity_id,
      config_id: params.config_id,
      candidate_ids: params.candidate_ids,
      operator_id: params.operator_id,
      page_num: params.page_num,
      page: params.page,
    }) || {}
  );
}
```

```tsx
const res = await apiGetDouPlusCoinRemoveRecord(filterParams);
return {
  data: res.data?.records || [],
  total: res.data?.total || 0,
};
```

## Mechanical Evidence

| check | result | evidence |
|---|---|---|
| TASK-003 checkbox delta | PASS | `delivery-task.md` TASK-003 six steps are `[x]`; TASK-004+ remain unchecked |
| changed business scope | PASS | `git status --short` shows only `send-award/index.tsx` and new `dou-coin-remove-record-table/` |
| generated/mock boundary | PASS | no generated BAM/mock/manifest/rule-map files touched |
| build | PASS | code-writer ran `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build` |
| whitespace | PASS | code-writer ran business repo `git diff --check` |
| debug/mock scan | PASS | targeted scan found no `console`, `debugger`, fixture, fake success, preview service, fallback store markers in touched business files |

## Review Questions

1. Does the diff strictly implement TASK-003 without reducing any TASK-003 requirement?
2. Does the new table consume the real BAM wrapper and request fields rather than local mock data?
3. Do visible columns and search fields match UI-003 / Figma `1:12120`?
4. Is leaving DOU+券 table to TASK-004 acceptable under the serial Task boundary, with no premature coupon implementation?
5. Is TASK-008 logger intentionally not implemented, and does the `Partial<Record<SubTab, IModuleMeta>>` change avoid breaking existing REWARD/DETAIL logging?

## Main Preliminary Gate

| gate | preliminary_result | note |
|---|---|---|
| task scope fit | PASS | TASK-003 only |
| PRD/Figma semantic alignment | PASS | AR-011/AR-012 + node `1:12120` + UI-003 all matched |
| UI evidence fit | PASS | `RUNTIME_BASELINE_ALLOWED`; reused existing EcopTable and coin table renderer baseline |
| mock/real boundary | PASS | real wrapper call chain; mock closure deferred to verify |
| verification freshness | PASS_PENDING_RECHECK | code-writer build evidence present; main Agent will rerun non-browser checks before checkpoint |
| checkpoint | PENDING | wait independent read-only review |

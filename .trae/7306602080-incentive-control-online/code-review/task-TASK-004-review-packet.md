# TASK-004 Review Packet

> created_at: `2026-07-08 13:32:37 +0800`
> workspace: `artifacts/7306602080-incentive-control-online`
> target_repo: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
> task_id: `TASK-004`
> mode: `MOCK_PREVIEW`

## Task Summary

| item | value |
|---|---|
| requirement_id | `AR-013`, `AR-014` |
| cases | `TC-UI-COUPON-REMOVE-PAGE`, `TC-DATA-COUPON-FILTER-SCHEMA`, `TC-DATA-COUPON-COLUMNS`, `TC-CELL-COUPON-FIRST-ROW`, `TC-INT-REMOVE-TAB-SWITCH-COUPON` |
| ruleId | `R-BAM-COUPON-REMOVE-DEFAULT`, `R-BAM-COUPON-REMOVE-FILTER` |
| UI Evidence Mode | `RUNTIME_BASELINE_ALLOWED` |
| implementation goal | DOU+券 `剔除明细` 渲染作者维度表，支持作者ID/操作人筛选和真实 `page/page_num` 分页 |
| explicit non-goals | 不改 DOU+币表条件；不实现 TASK-005+ 人工提报；不实现 TASK-008 埋点；不生成或修改 BAM mock runtime / generated mock / BAM marker |

## Source Contracts

| source | excerpt |
|---|---|
| `delivery-task.md ### Task 4` | 复用 Task 3 的 `SubTab.REMOVE_DETAIL`；新建 `dou-coupon-remove-record-table`; 作者ID标签映射请求字段 `candidate_ids`; 只调用 `apiGetDouPlusCouponRemoveRecord`; 列只保留 `作者信息/剔除发奖原因/剔除发奖时间/操作人`; 禁止 client-only pagination |
| `04-tech-plan.md UI-004` | DOU+券剔除明细使用 concrete reuse path，复用 `EcopTable/PeopleSelect/PeopleCard`，代码落点为 `send-award/index.tsx` 和新 `dou-coupon-remove-record-table/index.tsx` |
| `04-tech-plan.md Region 151-154` | SubTab 三项为 `奖励下发/投放明细/剔除明细`; 筛选区为 `作者ID/操作人`; 表格列为 `作者信息/剔除发奖原因/剔除发奖时间/操作人`; 分页使用底部分页，展示 total 并发起 page/page_num 请求 |
| `04-tech-plan.md Interaction 165-169` | 点击 `剔除明细` 后 activeSubTab 渲染匹配 reward type 表；作者ID筛选必须映射 `candidate_ids`; 操作人筛选映射 `operator_id`; 分页更新 `page/page_num` |
| `04-tech-plan.md list style 184-187` | `author_info` 渲染作者信息；`remove_reason`; `remove_time` 用 `dayjs.unix(...).format(...)`; `operator_id` 用 `PeopleCard` |
| `09-test-case-matrix.md` | BAM matrix 已存在 `TC-UI-COUPON-REMOVE-PAGE/R-BAM-COUPON-REMOVE-DEFAULT` 和 `TC-DATA-COUPON-FILTER-SCHEMA/R-BAM-COUPON-REMOVE-FILTER`; Code 不改 mock runtime |

## PRD / Figma Semantic Alignment

| dimension | result | evidence |
|---|---|---|
| PRD contract | MATCHED | PRD 要 DOU+券奖励投放新增作者维度剔除明细，支持作者ID和操作人筛选、分页 |
| Figma contract | MATCHED | Figma cache node `1:12390` / IMG6；可见文案包含 `奖励下发`、`投放明细`、`剔除明细`、`作者信息`、`剔除发奖原因`、`剔除发奖时间`、`操作人`、`共40条` |
| task contract | MATCHED | TASK-004 六项 checkbox 均与 UI-004 / AR-013 / AR-014 同义 |
| test contract | MATCHED | cases 覆盖 Tab 切换、默认列表、筛选请求、列白名单、首行 cell 和分页请求 |
| scope boundary | MATCHED | TASK-005+ 和 TASK-008 保持未实现；TASK-003 的 DOU+币条件未被改变 |

## Code Writer Result

```md
Result: PASS
Scope Fit: 仅实现 DOU+券剔除明细；未实现 TASK-005+、TASK-008、mock runtime 或 generated BAM
Validation: build PASS；business repo diff --check PASS；targeted scan PASS
P0 Blockers: 无
P1 Risks: UI/Network/截图/分页点击复核仍需 verify/design
```

## Changed Files

| file | status | scope |
|---|---|---|
| `apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx` | modified | import DOU+券 remove table; add `activeSubTab === SubTab.REMOVE_DETAIL && isCouponReward` render branch |
| `apps/alliance-operation-content/src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx` | added | 新增 DOU+券剔除明细 EcopTable，真实调用 `apiGetDouPlusCouponRemoveRecord` |
| `delivery-task.md` | modified | 仅勾选 TASK-004 六个 checkbox |
| `05-implementation-log.md` | modified | 追加 TASK-004 实现和验证记录，未宣称 independent review / main gate / checkpoint |

## Targeted Diff Summary

`send-award/index.tsx`:

```diff
+import DouPlusCouponRemoveRecordTable from '../dou-coupon-remove-record-table';
+            {activeSubTab === SubTab.REMOVE_DETAIL && isCouponReward && (
+              <DouPlusCouponRemoveRecordTable activityId={activity_id} configId={currentConfigId || ''} />
+            )}
```

`dou-coupon-remove-record-table/index.tsx`:

```tsx
export function formatEcopFilterParams(
  params: get_dou_plus_coupon_remove_record_request & { page?: number; page_num?: number },
): Partial<get_dou_plus_coupon_remove_record_request> {
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
search: {
  // 产品筛选标签为作者ID，IDL 字段为 candidate_ids。
  title: '作者ID',
}
```

```tsx
const res = await apiGetDouPlusCouponRemoveRecord(filterParams);
return {
  data: res.data?.records || [],
  total: res.data?.total || 0,
};
```

## Mechanical Evidence

| check | result | evidence |
|---|---|---|
| TASK-004 checkbox delta | PASS | `delivery-task.md` TASK-004 six steps are `[x]`; TASK-005+ remain unchecked |
| changed business scope | PASS | `git status --short` shows only `send-award/index.tsx` and new `dou-coupon-remove-record-table/` |
| generated/mock boundary | PASS | no generated BAM/mock/manifest/rule-map files touched |
| build | PASS | code-writer ran `pnpm_config_verify_deps_before_run=false pnpm --dir .../apps/alliance-operation-content build`; total `28733.3 kB (gzip: 6626.0 kB)` |
| whitespace | PASS | code-writer ran business repo `git diff --check` and touched-file trailing whitespace scan |
| debug/mock scan | PASS | targeted scan found no `console`, `debugger`, fixture, fake success, preview service, fallback store markers in touched business files |

## Review Questions

1. Does the diff strictly implement TASK-004 without reducing any TASK-004 requirement?
2. Does the new table consume the real BAM wrapper and request fields rather than local mock data?
3. Do visible columns and search fields match UI-004 / Figma `1:12390`?
4. Does `作者ID` correctly map to `candidate_ids` and avoid `author_ids`?
5. Does the diff avoid TASK-005+ manual submit scope and TASK-008 logger scope?

## Main Preliminary Gate

| gate | preliminary_result | note |
|---|---|---|
| task scope fit | PASS | TASK-004 only |
| PRD/Figma semantic alignment | PASS | AR-013/AR-014 + node `1:12390` + UI-004 all matched |
| UI evidence fit | PASS | `RUNTIME_BASELINE_ALLOWED`; reused existing EcopTable and coupon author renderer baseline |
| mock/real boundary | PASS | real wrapper call chain; mock closure deferred to verify |
| verification freshness | PASS_PENDING_RECHECK | code-writer build evidence present; main Agent will rerun non-browser checks before checkpoint |
| checkpoint | PENDING | wait independent read-only review |

# TC-INT-REMOVE-TAB-SWITCH-COUPON Source Evidence

## Source

- File: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`
- Scope: `SubTab.REMOVE_DETAIL` definition, SubTab click handler, DOU+币 / DOU+券 conditional render branch.

## Evidence

### SubTab enum and default state

- Lines 576-580 define `SubTab.REWARD = '奖励下发'`, `SubTab.DETAIL = '投放明细'`, and `SubTab.REMOVE_DETAIL = '剔除明细'`.
- Lines 726-731 initialize `activeSubTab` from query `sub_tab=detail` only for legacy 投放明细; otherwise the default is `SubTab.REWARD`.

### Reward type isolation

- Lines 741-744 derive `rewardType`, `isCoinReward`, and `isCouponReward` from the active top config.
- The active top config observed in runtime evidence is `配置二` with reward type `DOU+券`.

### Remove-detail metadata and click

- Lines 774-807 define `subTabModuleMetaMap[SubTab.REMOVE_DETAIL]` with `module_id='remove_detail_data'` and `module_name='内容活动剔除明细'`, plus current config context.
- Lines 962-989 render the three radio buttons and set `activeSubTab` from the natural click target.
- Lines 967-984 send the remove-detail tab click log only when `nextSubTab === SubTab.REMOVE_DETAIL`.

### Conditional render branch

- Lines 1038-1042 render legacy 投放明细 tables separately for DOU+币 and DOU+券.
- Lines 1044-1048 render remove-detail tables separately:
  - `activeSubTab === SubTab.REMOVE_DETAIL && isCoinReward` renders `DouPlusCoinRemoveRecordTable`.
  - `activeSubTab === SubTab.REMOVE_DETAIL && isCouponReward` renders `DouPlusCouponRemoveRecordTable`.

## Verification Interpretation

- Runtime active config is DOU+券, so the source condition selects `DouPlusCouponRemoveRecordTable`.
- The source has a separate DOU+币 branch guarded by `isCoinReward`, so DOU+币 remove table should not render for this case.
- This evidence supports runtime negative assertions for cross reward-type residue, while Figma-vs-runtime alignment remains `/delivery:design`.

# TC-INT-REMOVE-TAB-SWITCH-COIN Source Evidence

- captured_at: 2026-07-08T12:08:25Z
- purpose: 支撑 DOU+币奖励投放 `剔除明细` SubTab 切换时只渲染 DOU+币作品表、保留 legacy tabs、且不渲染 DOU+券表。

## SubTab Wiring

- Source: `meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/index.tsx`
- Lines 576-580 define `SubTab.REWARD='奖励下发'`, `SubTab.DETAIL='投放明细'`, `SubTab.REMOVE_DETAIL='剔除明细'`.
- Lines 962-990 render all three Radio buttons and call `setActiveSubTab(nextSubTab)` on change. This preserves legacy `奖励下发` / `投放明细` tabs while adding `剔除明细`.
- Lines 742-744 derive `isCoinReward` and `isCouponReward` from `currentConfig.reward_type`.
- Lines 1044-1049 render `DouPlusCoinRemoveRecordTable` only when `activeSubTab === SubTab.REMOVE_DETAIL && isCoinReward`, and render `DouPlusCouponRemoveRecordTable` only when `activeSubTab === SubTab.REMOVE_DETAIL && isCouponReward`.

## Runtime Evidence Link

- `verify-logs/evidence/TC-UI-COIN-REMOVE-PAGE--mock-hit-runtime.json` records natural UI steps: page reload, click `剔除明细` from default `奖励下发`, target GET request, `[BAM_MOCK_HIT]`, active `剔除明细`, and visible legacy tabs `奖励下发` / `投放明细`.
- Runtime headers are exactly `作品内容 / 剔除发奖原因 / 剔除发奖时间 / 操作人`, matching DOU+币作品表 and not DOU+券作者表.

## Reuse Boundary

- Reuse is valid because this interaction case targets the same natural click and default `R-BAM-COIN-REMOVE-DEFAULT` request as `TC-UI-COIN-REMOVE-PAGE`.
- This evidence does not close DOU+券 tab switching, tracking payload aggregation, or Figma-vs-runtime style alignment.

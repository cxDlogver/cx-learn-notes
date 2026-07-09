# 004 Preview Player Plan

## 技术方案

- 新增 `usePreviewPlayer` composable。
- 输入 duration、segments，输出 isPlaying、playheadMs、progress、currentSegment、play、pause、toggle、seek、stepToPreviousSegment、stepToNextSegment。
- 使用 `requestAnimationFrame` 驱动播放头，组件卸载时取消动画。
- App 组件只负责传入分镜数据和渲染状态。

## 失败模式

- duration 为 0：禁用播放并保持 0。
- segment 为空：预览区展示默认占位。
- seek 超出范围：自动 clamp 到 0 和 duration。

## 测试策略

- typecheck 覆盖 composable 类型。
- 后续 Vitest 覆盖 clamp、当前分镜计算、上一段/下一段跳转。


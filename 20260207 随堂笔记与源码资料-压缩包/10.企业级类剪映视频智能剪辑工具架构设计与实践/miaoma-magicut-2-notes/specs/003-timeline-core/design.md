# 003 Timeline Core Design

## UI 对齐

- Timeline Core 不直接渲染 UI。
- Renderer 负责把拖拽、裁剪、分割操作转换成 Timeline Core 命令。
- UI 使用算法返回的 collision 和 snapped time 更新视觉反馈。

## 状态

- `TimelineState` 包含 tracks、clips、playheadMs、snapPoints。
- `Clip` 继续复用 `@miaoma/shared` 类型。

## 视觉验收

- 本 feature 无独立视觉验收。
- 接入 UI 后要求移动 clip 不改变轨道高度和布局尺寸。


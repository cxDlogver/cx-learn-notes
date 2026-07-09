# 003 Timeline Core Plan

## 技术方案

- 新建 `packages/timeline-core`。
- 导出纯函数：`findClip`、`findCollisions`、`moveClip`、`trimClip`、`splitClip`、`snapTime`。
- 所有函数返回新对象，不原地修改入参。

## 失败模式

- 找不到 clip：抛出 `TimelineError`，code 为 `CLIP_NOT_FOUND`。
- 裁剪后时长过短：抛出 `INVALID_DURATION`。
- 分割点不在 clip 内：抛出 `INVALID_SPLIT_POINT`。

## 测试策略

- 无依赖验证检查包文件存在。
- 后续安装依赖后补 Vitest 单元测试。


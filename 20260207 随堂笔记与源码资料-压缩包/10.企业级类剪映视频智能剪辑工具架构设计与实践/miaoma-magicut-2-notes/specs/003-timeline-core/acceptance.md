# 003 Timeline Core Acceptance

## 自动化验证

- Given：时间线核心源码已生成。
- When：运行 `node scripts/validate-foundation.mjs`。
- Then：`packages/timeline-core` 关键文件存在，配置 JSON 可解析。

## 后续单元测试

- 移动 clip 不应修改原 state。
- 同轨 clip 重叠能被检测出来。
- 裁剪不能产生小于最小时长的片段。
- 分割后生成左右两个连续片段。
- 时间吸附选择阈值内最近点。


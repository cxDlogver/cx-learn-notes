# 004 Preview Player Acceptance

## 自动化验证

- Given：源码已更新。
- When：运行 `node scripts/validate-foundation.mjs` 与 `vue-tsc`。
- Then：校验和类型检查通过。

## 人工验证

- Given：应用已启动。
- When：点击播放、暂停、上一段、下一段，并拖动进度条。
- Then：播放头、当前分镜、字幕、时间显示和时间线游标同步变化。


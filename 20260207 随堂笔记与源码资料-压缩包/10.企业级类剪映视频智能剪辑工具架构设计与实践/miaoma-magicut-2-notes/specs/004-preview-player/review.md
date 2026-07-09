# 004 Preview Player Review

## 结果

- 状态：源码完成，已通过运行时交互验证。
- 完成项：`usePreviewPlayer`、播放/暂停、上一分镜、下一分镜、进度 seek、当前分镜联动、时间线游标。
- 补充项：Renderer 在无 Electron preload 的浏览器预览环境下会跳过桌面桥接调用，避免 `window.miaoma` 缺失导致页面报错。
- 未完成项：真实媒体帧解码、AudioContext 同步、PixiJS 合成预览。

## 验证

- 已通过：`node scripts/validate-foundation.mjs`。
- 已通过：`pnpm --filter @miaoma/desktop typecheck`。
- 已通过：`pnpm --filter @miaoma/desktop dev` 启动 Forge/Vite/Electron，`main.js` 入口正常生成并加载。
- 已通过：浏览器直连 Vite renderer 验证播放、暂停、上一分镜、下一分镜；播放头、当前分镜、字幕、时间显示和时间线游标同步变化。
- 后续：为 `usePreviewPlayer` 补 Vitest 单元测试，覆盖边界 seek、空 segments 和分镜跳转。

# 001 Desktop Shell Acceptance

## 自动化验证

- Given：项目源码已生成。
- When：运行 `node scripts/validate-foundation.mjs`。
- Then：关键桌面壳文件存在且 JSON 配置可解析。

## 人工验证

- Given：依赖已安装。
- When：运行 `pnpm dev` 或 `pnpm --filter @miaoma/desktop start`。
- Then：Electron 应用打开，显示暗色剪辑台布局。

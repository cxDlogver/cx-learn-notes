# Validation Workflow

## 1. Discover

读取项目已有约定，不要猜命令：

- `package.json` scripts
- ESLint 配置，例如 `eslint.config.js`
- 测试配置，例如 `vitest.config.ts`
- TypeScript 配置，例如 `tsconfig.json`
- 项目说明，例如 `AGENTS.md`、`README.md`

## 2. Select Commands

优先级：

1. 项目统一质量门禁，例如 `pnpm run check`。
2. 独立 scripts：`pnpm run lint`、`pnpm test`、`pnpm run build`。
3. 底层工具命令：仅当项目没有 scripts 时使用。

当前 React/Vite/pnpm 项目的默认命令：

```bash
pnpm run lint
pnpm test
pnpm run build
pnpm run check
```

`pnpm run check` 已串行覆盖 lint、test 和 build 时，最终验收只需跑它一次；排错时可先跑失败的单项命令。

## 3. Run Order

默认顺序：

1. Lint：快速发现静态规范和 React Hooks 问题。
2. Test：验证业务逻辑和回归场景。
3. Build：覆盖 TypeScript 与生产打包。
4. Check：作为最终完整门禁。

如果用户只要求某一类验证，运行对应最小命令即可。

## 4. Acceptance

完成标准：

- 所有被要求的命令退出码为 0。
- 输出中没有未解释的失败、错误或跳过原因。
- 如果存在无法执行的命令，必须说明阻塞原因和替代验证。
- 修复后至少重跑失败命令；涉及共享行为时重跑完整门禁。

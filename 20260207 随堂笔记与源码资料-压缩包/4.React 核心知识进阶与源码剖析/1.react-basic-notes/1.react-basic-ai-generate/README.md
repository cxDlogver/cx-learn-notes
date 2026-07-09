# react-basic-ai-generate

基于 React 19 + Vite 8 + TypeScript 的工程化基础项目，内置：

- ESLint + Prettier
- Vitest + Testing Library
- cspell 拼写检查
- husky + lint-staged + commitlint
- GitHub Actions CI

## 快速开始

```bash
pnpm install
pnpm dev
```

## 常用命令

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm spellcheck
pnpm check
pnpm build
```

## 提交与质量

- `pre-commit`：执行 `lint-staged`
- `pre-push`：执行 `pnpm check`
- `commit-msg`：执行 `commitlint`

如果仓库刚初始化，请先执行 `pnpm prepare` 以启用 husky hooks。

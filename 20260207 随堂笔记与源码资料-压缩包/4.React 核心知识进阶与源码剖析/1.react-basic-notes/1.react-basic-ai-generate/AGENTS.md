## 项目技术栈

- React 19
- Vite 8
- TypeScript
- pnpm

## 工程目录约定

- `src/`：业务与页面代码
- `src/test/`：测试初始化与测试工具
- `.github/workflows/`：CI 工作流
- `.husky/`：本地 Git hooks

## 开发命令约定

- `pnpm dev`：启动开发服务器
- `pnpm build`：类型检查并构建生产包
- `pnpm preview`：预览构建产物
- `pnpm lint`：执行 ESLint（0 warning）
- `pnpm lint:fix`：自动修复 ESLint 问题
- `pnpm typecheck`：执行 TypeScript 类型检查
- `pnpm test`：执行 Vitest 单元测试
- `pnpm test:watch`：Vitest 监听模式
- `pnpm spellcheck`：执行 cspell 拼写检查（代码 + 文档）
- `pnpm check`：执行 `lint + typecheck + test + spellcheck`

## 质量门禁

- 每次代码修改后必须执行 `pnpm lint`
- 提交前通过 `.husky/pre-commit` 自动执行 `lint-staged`
- 推送前通过 `.husky/pre-push` 自动执行 `pnpm check`
- CI 必须通过 `pnpm check` 与 `pnpm build`
- 提交信息必须符合 Conventional Commits（`commitlint`）

## ESLint 与 TypeScript 规则

- ESLint 使用 TypeScript + React Hooks + React Refresh 规则
- TypeScript 启用严格模式，禁止未使用变量与参数
- 配置 `eslint-config-prettier` 避免格式化规则冲突

## 测试规范

- 测试框架：Vitest + Testing Library + jsdom
- 测试文件命名：`*.test.ts`、`*.test.tsx`、`*.spec.ts`、`*.spec.tsx`
- 新增功能至少包含一个行为级测试用例

## 拼写检查规范（cspell）

- 检查范围：`src`、`public`、根目录配置、`.github`、Markdown 文档
- 默认阻断策略：拼写错误直接导致本地与 CI 失败
- 新术语进入项目前需写入 `cspell.config.yaml` 的 `words`

## 工程原则

- KISS：优先简单可读方案，避免引入不必要复杂度
- YAGNI：仅实现当前需求，禁止提前实现未来功能
- DRY：识别并消除重复逻辑，统一同类实现模式
- SOLID：保持职责清晰、依赖抽象、接口专一和可扩展

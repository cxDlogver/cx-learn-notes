# Failure Handling

## General Rules

- 先读报错和相关配置，再修改代码。
- 优先修根因，不通过禁用规则、删除测试或降低类型约束绕过问题。
- 每次修改保持最小范围，避免无关格式化和重构。
- 不执行 `git commit`、`git reset`、`git push`，除非用户明确要求。
- 不运行会批量重写文件的命令，例如 formatter、lint `--fix`，除非用户明确要求。

## ESLint Failures

处理顺序：

1. 定位报错文件、行号、规则名。
2. 查 ESLint 配置确认规则来源。
3. 修代码结构或依赖数组等真实问题。
4. 只有规则误报且有充分理由时，才考虑局部禁用，并写清原因。

React 项目重点关注：

- Hooks 依赖和调用顺序。
- 组件只导出约束，例如 `react-refresh/only-export-components`。
- 未使用变量、不可达代码和类型不安全写法。

## Test Failures

处理顺序：

1. 读取失败测试名、断言差异和堆栈。
2. 判断是实现缺陷、测试预期过时，还是测试环境问题。
3. 修实现时补充或保留回归测试。
4. 不删除有效断言来换取通过。

## Build Failures

常见分类：

- TypeScript 类型错误。
- 模块导入导出错误。
- Vite 打包或资源路径错误。
- 环境变量或依赖缺失。

处理后先重跑 `pnpm run build`，再按影响范围决定是否跑完整 `check`。

## Reporting

汇报时使用事实，不省略失败：

- `pnpm run lint`：通过/失败。
- `pnpm test`：通过/失败，测试数量。
- `pnpm run build`：通过/失败。
- `pnpm run check`：通过/失败。

如未运行某项，写明“未运行”及原因。

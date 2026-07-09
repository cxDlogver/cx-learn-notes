---
name: react-vite-engineer
description: React 19 + Vite + TailwindCSS 前端项目工程约定，包含 cspell、ESLint、Prettier 质量检查规范。
---

# 项目约定

本项目按 React 19、Vite、TailwindCSS、cspell、ESLint、Prettier 技术栈维护。所有代码变更应优先保持简单、明确、可验证，遵循 SOLID、KISS、DRY、YAGNI 原则。

## 技术栈

- React 19：使用函数组件、Hooks 和组合式组件设计。
- Vite：作为本地开发服务器与生产构建工具。
- TailwindCSS：作为主要样式方案，优先使用语义清晰的工具类。
- cspell：用于英文拼写与项目词汇检查。
- ESLint：用于代码质量、潜在错误和 React 规则检查。
- Prettier：用于统一代码格式。

## 开发原则

- 保持组件单一职责，避免把数据获取、状态编排、展示逻辑全部塞进一个组件。
- 只实现当前明确需要的能力，不预留未被使用的抽象、配置或扩展点。
- 发现重复 UI、逻辑或配置时，优先提取为小型组件、Hook 或工具函数。
- 优先使用项目已有模式；新增依赖、目录结构或架构层前必须确认确有必要。
- 样式优先使用 Tailwind 工具类；复杂重复样式再提取组件或局部样式。

## 目录建议

```text
src/
  assets/       静态资源
  components/   可复用 UI 组件
  hooks/        复用 Hook
  lib/          通用工具与第三方封装
  pages/        页面级组件
  styles/       全局样式入口
```

目录应按实际需求逐步创建，避免提前铺设空目录。

## 命令约定

如果 `package.json` 中存在对应脚本，优先使用以下命令：

```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm spellcheck
```

如果项目使用 `npm`、`yarn` 或其他包管理器，应遵循仓库已有 lockfile 和脚本，不擅自切换。

## 质量检查

提交或交付变更前，优先运行与变更范围匹配的检查：

- TypeScript 或构建相关变更：运行 `pnpm build`。
- 代码逻辑或组件变更：运行 `pnpm lint`。
- 格式相关变更：运行 `pnpm format` 或对应 Prettier 检查脚本。
- 文案、注释、文档或命名变更：运行 `pnpm spellcheck`。

如果脚本不存在，应先读取 `package.json`，使用项目实际配置的命令。

## React 约定

- 组件名使用 PascalCase，Hook 使用 `use` 前缀。
- 组件 props 使用明确类型，避免宽泛的 `any`。
- 可派生状态优先在渲染阶段计算，不额外存入 state。
- 副作用集中放在 `useEffect`，并保持依赖数组完整。
- 事件处理函数命名使用 `handleXxx`，传入子组件的回调用 `onXxx`。

## TailwindCSS 约定

- 优先使用布局、间距、字体、颜色等工具类直接表达 UI。
- 重复出现的复杂 UI 结构应提取组件，而不是复制整段 className。
- className 很长时可按布局、盒模型、视觉、状态的顺序整理。
- 不为单次使用的样式新增全局 CSS。

## ESLint 与 Prettier

- 不通过禁用规则掩盖问题；确需禁用时，使用最小作用域并说明原因。
- Prettier 负责格式，ESLint 负责质量规则，避免两者职责混用。
- 不手动制造与 Prettier 冲突的排版。

## cspell

- 优先修正拼写错误。
- 项目专有词汇、品牌名、缩写应加入 cspell 配置词典。
- 不为了通过检查而使用模糊、错误或不一致的命名。

## 变更要求

- 修改前先阅读相关文件，理解现有实现。
- 控制变更范围，只触碰完成任务所需文件。
- 不主动执行 `git commit`、创建分支、推送或重置仓库，除非用户明确要求。
- 删除文件、批量修改、依赖升级、生产 API 调用等高风险操作必须先获得用户明确确认。
- 代码注释语言应与所在文件现有注释保持一致。

<!-- SPECKIT START -->

Current Spec Kit plan: `specs/001-user-login-form/plan.md`.
Read it for feature-specific technology choices, source structure, validation
commands, and implementation constraints.

<!-- SPECKIT END -->

# todo-app

## 技术栈

- React19
- Vite
- Shadcnui

## UI 设计语言

两个流派

1. 规范 md 约束 DESIGN.md 约束
    - 团队可以自己沉淀定义
    - 借鉴现成的，改 DESIGN.md   https://getdesign.md/
2. 设计稿转代码
    - D2UI、D2C
    - **Pencil**、Figma、**Google Stitch**、蓝湖、墨刀、mastergo.....

## 项目结构与模块组织

当前项目是基于 Vite 的 React todo 应用：

- `src/`：存放应用源代码。
- `src/features/todos/`：存放 todo 类型、业务逻辑、持久化和页面组件。
- `src/components/ui/`：存放 Shadcnui 风格的最小 UI 组件。
- `src/lib/`：存放通用工具函数。
- `DESIGN.md`：定义视觉规范和还原验收标准。
- `PLAN.md`：记录第一版实现计划。

模块应保持单一职责。不要过早创建通用工具文件，只有在重复需求明确出现后再抽象复用。

## 构建、测试与开发命令

使用 `pnpm` 执行项目命令：

- `pnpm install`：安装依赖。
- `pnpm run dev`：启动本地开发服务。
- `pnpm test`：运行 Vitest 测试。
- `pnpm run lint`：运行 ESLint 静态检查。
- `pnpm run build`：执行 TypeScript 类型检查并生成生产构建。
- `pnpm run check`：串行运行 lint、test 和 build。

## 编码风格与命名约定

优先编写简单、明确的代码，避免过早抽象。新增模块时遵循 KISS、YAGNI、DRY 和 SOLID 原则。

命名应符合 TypeScript/React 惯例：变量和函数使用 `camelCase`，组件和类型使用 `PascalCase`。文件名应清楚表达主要职责或导出内容。

样式使用 Tailwind CSS，UI 组件遵循 Shadcnui 的 token、variant 和组合模式。格式和静态问题由 TypeScript 与 ESLint 兜底。

## 测试指南

测试文件与源文件同目录，并使用 `.test.ts` 后缀。

测试应覆盖核心行为、边界条件和公共接口。当前重点是 todo 纯逻辑和 `localStorage` 持久化。修复缺陷时，如可行，应添加回归测试。

## 提交与 Pull Request 规范

当前目录尚无 Git 历史。提交信息应简洁、使用祈使语气。推荐采用 Conventional Commits，例如 `feat: add todo filters` 或 `fix: handle invalid storage`。

Pull Request 应包含变更摘要、验证步骤、关联 Issue；涉及界面变更时，应附上截图或录屏。

## Agent 专用说明

编辑前先阅读现有文件。变更应聚焦用户请求，避免无关重构。除非用户明确要求，不要创建提交、分支或执行其他 Git 流程操作。

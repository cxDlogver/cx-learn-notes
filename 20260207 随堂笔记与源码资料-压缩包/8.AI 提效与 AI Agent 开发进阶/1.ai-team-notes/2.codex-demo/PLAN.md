# Todo List 应用开发计划

## Summary

构建一个基于 `React19 + Vite + Shadcnui + pnpm` 的单页 todo list 应用。第一版功能限定为基础 CRUD：新增、完成/取消完成、编辑、删除、筛选；数据使用 `localStorage` 持久化。视觉以 `DESIGN.md` 中“受 Spotify 启发的深色设计系统”为准，并通过浏览器截图做还原校验。

## Key Changes

- 初始化前端工程：使用 Vite React 模板、TypeScript、Tailwind CSS、Shadcnui 风格组件体系。
- 新增 `DESIGN.md`：定义深色效率工具风格，包括布局、色彩、字号、间距、按钮状态、空状态、完成态、错误态和响应式规则。
- 实现 todo 数据模型：`id`、`title`、`completed`、`createdAt`、`updatedAt`。
- 实现核心交互：新增、完成切换、内联编辑、删除、全部/未完成/已完成筛选。
- 使用固定本地存储 key：`todo-app:v1:todos`。

## Test Plan

- `pnpm test`：验证 todo 逻辑与持久化边界。
- `pnpm run lint`：运行静态检查。
- `pnpm run build`：执行 TypeScript 类型检查和生产构建。
- `pnpm run dev`：启动本地服务并用浏览器检查桌面与移动端视觉效果。

## Assumptions

- 第一版不做登录、多用户、后端同步、拖拽排序、优先级、截止日期、搜索或分组。
- 使用 `pnpm` 作为包管理器。
- 视觉风格为克制、高效、深色工具型界面，不做营销页或装饰性首页。
- 不执行 Git 提交、分支或其他 Git 流程操作。

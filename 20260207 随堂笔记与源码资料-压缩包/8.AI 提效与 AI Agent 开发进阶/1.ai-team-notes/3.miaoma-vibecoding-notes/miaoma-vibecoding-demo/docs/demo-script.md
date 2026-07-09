# 现场演示脚本

## 0. 准备工作

```bash
npm install
npm run build
npm run dev:demo
```

浏览器打开 `http://127.0.0.1:5173`，确认报名页能正常展示，提交按钮会打开反馈弹窗。

## 1. 展示没有 MCP 的问题

给 Codex 的提示词：

```text
请帮我写一个 AI 工程化公开课报名页，包含标题、课程亮点、报名表单和提交成功弹窗。页面要专业，适合资深前端工程师。
```

讲解观察点：

- Codex 可能直接写原生 button/input。
- Codex 可能臆造 `CourseCard`、`FormField` 等团队不存在的组件。
- 即使视觉还可以，代码也没有复用团队组件库资产。

## 2. 启用组件库 MCP

当前项目已经提供项目级 Codex 配置：

```text
.codex/config.toml
```

配置内容：

```toml
[mcp_servers.demo-component-library]
command = "node"
args = [
  "/Users/heyi/Downloads/miaoma-vibecoding-demo/mcp/component-library-server/dist/index.js"
]
startup_timeout_sec = 10
```

在项目根目录启动 Codex 后，使用 `/mcp` 查看 `demo-component-library` 是否已加载。

本地可单独启动验证：

```bash
npm run dev:mcp
```

## 3. 展示 MCP 工具能力

让 Codex 依次调用：

- `list_components`
- `get_component_doc`，参数为 `Button`
- `get_component_doc`，参数为 `Input`
- `search_component_examples`，参数为 `报名表单`

讲解重点：

- Codex 先拿到组件地图。
- 再按需查询具体组件 Props。
- 最后用示例约束生成代码，而不是凭空猜 API。

## 4. 启用 MCP 后重写页面

给 Codex 的提示词：

```text
请基于 @demo/ui 编写一个“AI 工程化公开课报名页”。要求：
1. 必须使用 Button、Input、Card、Modal。
2. 不要臆造组件库中不存在的组件。
3. 表单包含姓名、邮箱、团队角色。
4. 提交后用 Modal 展示报名成功反馈。
```

讲解对比点：

- 导入方式是否正确。
- Props 是否符合组件库文档。
- 样式入口是否导入 `@demo/ui/styles.css`。
- 页面是否避免重复封装基础组件。

## 5. 收束话术

组件库 MCP 的价值不是炫技，而是把团队已有资产转化为 AI 能理解的上下文接口。

当组件库、设计规范、接口文档、业务物料都能被 MCP 化，Codex 才能稳定进入团队研发流程。

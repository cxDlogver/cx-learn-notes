# @demo/component-library-mcp

这个 MCP Server 把 `@demo/ui` 的组件知识暴露给 Codex，核心目标是让 AI 编码时不要臆造团队组件。

## 工具

- `list_components`：返回组件列表、导入方式和适用场景。
- `get_component_doc`：按组件名返回 Props、约束和示例。
- `search_component_examples`：按场景搜索组件示例。

## 本地启动

```bash
npm run dev:mcp
```

## Codex 配置示例

```json
{
  "mcpServers": {
    "demo-component-library": {
      "command": "npm",
      "args": ["--workspace", "@demo/component-library-mcp", "run", "dev"]
    }
  }
}
```

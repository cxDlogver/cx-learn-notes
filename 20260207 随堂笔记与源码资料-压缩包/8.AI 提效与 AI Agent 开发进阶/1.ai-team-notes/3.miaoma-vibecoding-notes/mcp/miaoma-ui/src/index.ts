#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { componentCatalog, getComponentDoc, searchExamples } from "./catalog.js";

const server = new McpServer({
  name: "miaoma-ui",
  version: "0.1.0"
});

function textJson(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}

server.registerTool(
  "list_components",
  {
    title: "List @miaoma/ui components",
    description: "列出 @miaoma/ui 组件库的组件、导入方式和适用场景。",
    inputSchema: {}
  },
  async () =>
    textJson({
      packageName: "@miaoma/ui",
      styleImport: "import \"@miaoma/ui/styles.css\";",
      componentImport: "import { Button, Input, Card, Modal } from \"@miaoma/ui\";",
      components: componentCatalog.map((component) => ({
        name: component.name,
        importName: component.importName,
        purpose: component.purpose
      }))
    })
);

server.registerTool(
  "get_component_doc",
  {
    title: "Get @miaoma/ui component documentation",
    description: "按组件名返回 Props、约束和示例。",
    inputSchema: {
      name: z.string().describe("组件名，例如 Button、Input、Card、Modal。")
    }
  },
  async ({ name }) => {
    const component = getComponentDoc(name);

    if (!component) {
      return textJson({
        error: `未找到组件：${name}`,
        availableComponents: componentCatalog.map((item) => item.name)
      });
    }

    return textJson(component);
  }
);

server.registerTool(
  "search_component_examples",
  {
    title: "Search @miaoma/ui examples",
    description: "按场景关键词搜索组件使用示例。",
    inputSchema: {
      query: z.string().describe("场景关键词，例如 报名表单、弹窗、提交按钮。")
    }
  },
  async ({ query }) =>
    textJson({
      query,
      examples: searchExamples(query)
    })
);

await server.connect(new StdioServerTransport());

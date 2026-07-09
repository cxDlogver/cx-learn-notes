// model context protocal sdk
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const componentCatalog = [
  {
    name: "Button",
    importName: "Button",
    purpose: "用于明确动作触发，例如提交、打开弹窗、次级跳转和危险操作确认。",
    props: [
      {
        name: "variant",
        type: '"primary" | "secondary" | "ghost" | "danger"',
        required: false,
        description: "按钮视觉层级，默认 primary。",
      },
      {
        name: "size",
        type: '"sm" | "md" | "lg"',
        required: false,
        description: "按钮尺寸，默认 md。",
      },
      {
        name: "loading",
        type: "boolean",
        required: false,
        description: "提交中状态，会禁用按钮并展示 loading。",
      },
      {
        name: "disabled",
        type: "boolean",
        required: false,
        description: "禁用按钮。",
      },
      {
        name: "children",
        type: "ReactNode",
        required: true,
        description: "按钮文本或内容。",
      },
    ],
    constraints: [
      '提交类主操作使用 variant="primary"。',
      '取消、返回、关闭等弱操作使用 variant="secondary" 或 variant="ghost"。',
      '删除和不可逆动作使用 variant="danger"。',
    ],
    examples: [
      {
        title: "提交按钮",
        scenario: "表单提交或主流程动作",
        code: 'import { Button } from "@demo/ui";\n\n<Button type="submit" loading={submitting}>提交报名</Button>',
      },
      {
        title: "次级按钮",
        scenario: "打开详情、关闭弹窗或弱引导",
        code: 'import { Button } from "@demo/ui";\n\n<Button variant="secondary" onClick={onPreview}>查看详情</Button>',
      },
    ],
  },
];

const server = new McpServer({
  name: "miaoma-ui",
  version: "1.0.0",
});

function textJson(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}

server.registerTool(
  "list_components",
  {
    title: "list all @miaoma/ui components",
    description: "列出妙码官方组件库所有组件、导入方式、使用场景、变体等",
    inputSchema: {},
  },
  async () =>
    textJson({
      packageName: "@demo/ui",
      styleImport: 'import "@demo/ui/styles.css";',
      componentImport: 'import { Button, Input, Card, Modal } from "@demo/ui";',
      components: componentCatalog.map((component) => ({
        name: component.name,
        importName: component.importName,
        purpose: component.purpose,
      })),
    }),
);

// 监控项目实战介绍松散组合
await server.connect(new StdioServerTransport());

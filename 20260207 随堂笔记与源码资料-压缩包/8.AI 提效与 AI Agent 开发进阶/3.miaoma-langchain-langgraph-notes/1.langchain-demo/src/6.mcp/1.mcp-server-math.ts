// 服务和客户端之间的连接可以有几种形式
// 1. http 通信
// 2. 基于 进程通信

// 有一个组件库，创建一个组件库 MCP server，列举多少个组建、看某一个组件的属性.....
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const server = new Server(
  {
    name: "math-server",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "add",
        description: "求两个数的和",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "第一个数",
            },
            b: {
              type: "number",
              description: "第二个数",
            },
          },
          required: ["a", "b"],
        },
      },
      {
        name: "multiply",
        description: "求两个数的积",
        inputSchema: {
          type: "object",
          properties: {
            a: {
              type: "number",
              description: "第一个数",
            },
            b: {
              type: "number",
              description: "第二个数",
            },
          },
          required: ["a", "b"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "add": {
      const { a, b } = request.params.arguments as { a: number; b: number };
      return {
        content: [
          {
            type: "text",
            text: String(a + b),
          },
        ],
      };
    }
    case "multiply": {
      const { a, b } = request.params.arguments as { a: number; b: number };
      return {
        content: [
          {
            type: "text",
            text: String(a * b),
          },
        ],
      };
    }
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function main() {
  // 初始化传输协议
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.log("Math MCP server running");
}

main();

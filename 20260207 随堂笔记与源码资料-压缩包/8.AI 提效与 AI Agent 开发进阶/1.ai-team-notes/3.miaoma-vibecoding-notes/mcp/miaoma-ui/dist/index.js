#!/usr/bin/env node

// src/index.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// src/catalog.ts
var componentCatalog = [
  {
    name: "Button",
    importName: "Button",
    purpose: "\u7528\u4E8E\u660E\u786E\u52A8\u4F5C\u89E6\u53D1\uFF0C\u4F8B\u5982\u63D0\u4EA4\u3001\u6253\u5F00\u5F39\u7A97\u3001\u6B21\u7EA7\u8DF3\u8F6C\u548C\u5371\u9669\u64CD\u4F5C\u786E\u8BA4\u3002",
    props: [
      { name: "variant", type: '"primary" | "secondary" | "ghost" | "danger"', required: false, description: "\u6309\u94AE\u89C6\u89C9\u5C42\u7EA7\uFF0C\u9ED8\u8BA4 primary\u3002" },
      { name: "size", type: '"sm" | "md" | "lg"', required: false, description: "\u6309\u94AE\u5C3A\u5BF8\uFF0C\u9ED8\u8BA4 md\u3002" },
      { name: "loading", type: "boolean", required: false, description: "\u63D0\u4EA4\u4E2D\u72B6\u6001\uFF0C\u4F1A\u7981\u7528\u6309\u94AE\u5E76\u5C55\u793A loading\u3002" },
      { name: "disabled", type: "boolean", required: false, description: "\u7981\u7528\u6309\u94AE\u3002" },
      { name: "children", type: "ReactNode", required: true, description: "\u6309\u94AE\u6587\u672C\u6216\u5185\u5BB9\u3002" }
    ],
    constraints: [
      '\u63D0\u4EA4\u7C7B\u4E3B\u64CD\u4F5C\u4F7F\u7528 variant="primary"\u3002',
      '\u53D6\u6D88\u3001\u8FD4\u56DE\u3001\u5173\u95ED\u7B49\u5F31\u64CD\u4F5C\u4F7F\u7528 variant="secondary" \u6216 variant="ghost"\u3002',
      '\u5220\u9664\u548C\u4E0D\u53EF\u9006\u52A8\u4F5C\u4F7F\u7528 variant="danger"\u3002'
    ],
    examples: [
      {
        title: "\u63D0\u4EA4\u6309\u94AE",
        scenario: "\u8868\u5355\u63D0\u4EA4\u6216\u4E3B\u6D41\u7A0B\u52A8\u4F5C",
        code: 'import { Button } from "@demo/ui";\n\n<Button type="submit" loading={submitting}>\u63D0\u4EA4\u62A5\u540D</Button>'
      },
      {
        title: "\u6B21\u7EA7\u6309\u94AE",
        scenario: "\u6253\u5F00\u8BE6\u60C5\u3001\u5173\u95ED\u5F39\u7A97\u6216\u5F31\u5F15\u5BFC",
        code: 'import { Button } from "@demo/ui";\n\n<Button variant="secondary" onClick={onPreview}>\u67E5\u770B\u8BE6\u60C5</Button>'
      }
    ]
  },
  {
    name: "Input",
    importName: "Input",
    purpose: "\u7528\u4E8E\u8868\u5355\u8F93\u5165\uFF0C\u5185\u7F6E label\u3001helperText\u3001error \u4E0E\u57FA\u7840\u53EF\u8BBF\u95EE\u6027\u5C5E\u6027\u3002",
    props: [
      { name: "label", type: "ReactNode", required: false, description: "\u8F93\u5165\u9879\u6807\u9898\u3002" },
      { name: "error", type: "ReactNode", required: false, description: "\u9519\u8BEF\u4FE1\u606F\uFF0C\u5B58\u5728\u65F6\u4F1A\u8BBE\u7F6E aria-invalid\u3002" },
      { name: "helperText", type: "ReactNode", required: false, description: "\u8F85\u52A9\u8BF4\u660E\uFF0C\u65E0 error \u65F6\u5C55\u793A\u3002" },
      { name: "...inputProps", type: "InputHTMLAttributes<HTMLInputElement>", required: false, description: "\u652F\u6301\u539F\u751F input \u5C5E\u6027\uFF0C\u4F8B\u5982 name\u3001type\u3001placeholder\u3001required\u3002" }
    ],
    constraints: [
      "\u4E1A\u52A1\u8868\u5355\u4E0D\u8981\u81EA\u884C\u62FC label + input\uFF0C\u4F18\u5148\u4F7F\u7528 Input\u3002",
      "error \u548C helperText \u540C\u65F6\u5B58\u5728\u65F6\u4F18\u5148\u5C55\u793A error\u3002",
      "\u4E0D\u8981\u4F20 size \u5C5E\u6027\uFF0C\u7EC4\u4EF6\u5E93\u4FDD\u7559\u7EDF\u4E00\u9AD8\u5EA6\u3002"
    ],
    examples: [
      {
        title: "\u90AE\u7BB1\u8F93\u5165",
        scenario: "\u62A5\u540D\u8868\u5355\u90AE\u7BB1\u5B57\u6BB5",
        code: 'import { Input } from "@demo/ui";\n\n<Input label="\u90AE\u7BB1" name="email" type="email" placeholder="name@example.com" required />'
      },
      {
        title: "\u5E26\u8F85\u52A9\u8BF4\u660E",
        scenario: "\u9700\u8981\u89E3\u91CA\u7528\u9014\u7684\u8F93\u5165\u9879",
        code: 'import { Input } from "@demo/ui";\n\n<Input label="\u56E2\u961F\u89D2\u8272" name="role" helperText="\u7528\u4E8E\u53D1\u9001\u914D\u5957 Demo \u8D44\u6599" />'
      }
    ]
  },
  {
    name: "Card",
    importName: "Card",
    purpose: "\u7528\u4E8E\u627F\u8F7D\u4E00\u7EC4\u76F8\u5173\u5185\u5BB9\uFF0C\u4F8B\u5982\u8BAE\u7A0B\u3001\u8868\u5355\u3001\u6307\u6807\u8BF4\u660E\u6216\u914D\u7F6E\u9762\u677F\u3002",
    props: [
      { name: "title", type: "ReactNode", required: false, description: "\u5361\u7247\u6807\u9898\u3002" },
      { name: "extra", type: "ReactNode", required: false, description: "\u53F3\u4E0A\u89D2\u8865\u5145\u4FE1\u606F\u6216\u64CD\u4F5C\u3002" },
      { name: "children", type: "ReactNode", required: true, description: "\u5361\u7247\u4E3B\u4F53\u5185\u5BB9\u3002" }
    ],
    constraints: [
      "\u4E0D\u8981\u628A Card \u5D4C\u5957\u5728 Card \u91CC\u9762\u3002",
      "Card \u7528\u4E8E\u91CD\u590D\u9879\u3001\u8868\u5355\u5757\u548C\u5DE5\u5177\u5757\uFF0C\u4E0D\u7528\u4E8E\u5305\u88F9\u6574\u9875 section\u3002",
      "\u6807\u9898\u4FDD\u6301\u77ED\u53E5\uFF0C\u590D\u6742\u8BF4\u660E\u653E\u5165 children\u3002"
    ],
    examples: [
      {
        title: "\u8BAE\u7A0B\u5361\u7247",
        scenario: "\u5C55\u793A\u8BFE\u7A0B\u6A21\u5757\u5217\u8868",
        code: 'import { Card } from "@demo/ui";\n\n<Card title="\u8BFE\u7A0B\u8BAE\u7A0B" extra="60 \u5206\u949F"><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></Card>'
      }
    ]
  },
  {
    name: "Modal",
    importName: "Modal",
    purpose: "\u7528\u4E8E\u77ED\u6D41\u7A0B\u786E\u8BA4\u3001\u7ED3\u679C\u53CD\u9988\u6216\u8F7B\u91CF\u8BE6\u60C5\u5C55\u793A\u3002",
    props: [
      { name: "open", type: "boolean", required: true, description: "\u5F39\u7A97\u662F\u5426\u6253\u5F00\u3002" },
      { name: "title", type: "ReactNode", required: false, description: "\u5F39\u7A97\u6807\u9898\u3002" },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true, description: "\u6253\u5F00\u72B6\u6001\u53D8\u5316\u56DE\u8C03\u3002" },
      { name: "footer", type: "ReactNode", required: false, description: "\u5E95\u90E8\u64CD\u4F5C\u533A\u3002" },
      { name: "children", type: "ReactNode", required: true, description: "\u5F39\u7A97\u4E3B\u4F53\u5185\u5BB9\u3002" }
    ],
    constraints: [
      "Modal \u5FC5\u987B\u7531\u5916\u90E8\u72B6\u6001\u63A7\u5236 open\u3002",
      "\u5173\u95ED\u6309\u94AE\u548C ESC \u5DF2\u5185\u7F6E\uFF0C\u4E0D\u8981\u989D\u5916\u91CD\u590D\u5B9E\u73B0\u5173\u95ED\u903B\u8F91\u3002",
      "\u590D\u6742\u591A\u6B65\u9AA4\u6D41\u7A0B\u4E0D\u8981\u585E\u8FDB Modal\uFF0C\u5E94\u62C6\u6210\u72EC\u7ACB\u9875\u9762\u3002"
    ],
    examples: [
      {
        title: "\u7ED3\u679C\u53CD\u9988\u5F39\u7A97",
        scenario: "\u63D0\u4EA4\u62A5\u540D\u540E\u5C55\u793A\u6210\u529F\u53CD\u9988",
        code: 'import { Button, Modal } from "@demo/ui";\n\n<Modal open={open} title="\u62A5\u540D\u6210\u529F" onOpenChange={setOpen} footer={<Button onClick={() => setOpen(false)}>\u77E5\u9053\u4E86</Button>}>\u8D44\u6599\u4F1A\u53D1\u9001\u5230\u4F60\u7684\u90AE\u7BB1\u3002</Modal>'
      }
    ]
  }
];
function getComponentDoc(name) {
  const normalizedName = name.trim().toLowerCase();
  return componentCatalog.find((component) => component.name.toLowerCase() === normalizedName);
}
function searchExamples(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const examples = componentCatalog.flatMap(
    (component) => component.examples.map((example) => ({
      component: component.name,
      importName: component.importName,
      ...example
    }))
  );
  if (!normalizedQuery) {
    return examples;
  }
  return examples.map((example) => {
    const searchableText = `${example.component} ${example.title} ${example.scenario} ${example.code}`.toLowerCase();
    const score = normalizedQuery.split(/\s+/).filter((word) => searchableText.includes(word)).length;
    return { ...example, score };
  }).filter((example) => example.score > 0).sort((a, b) => b.score - a.score).map(({ score: _score, ...example }) => example);
}

// src/index.ts
var server = new McpServer({
  name: "miaoma-ui",
  version: "0.1.0"
});
function textJson(value) {
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
server.registerTool(
  "list_components",
  {
    title: "List @miaoma/ui components",
    description: "\u5217\u51FA @miaoma/ui \u7EC4\u4EF6\u5E93\u7684\u7EC4\u4EF6\u3001\u5BFC\u5165\u65B9\u5F0F\u548C\u9002\u7528\u573A\u666F\u3002",
    inputSchema: {}
  },
  async () => textJson({
    packageName: "@miaoma/ui",
    styleImport: 'import "@miaoma/ui/styles.css";',
    componentImport: 'import { Button, Input, Card, Modal } from "@miaoma/ui";',
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
    description: "\u6309\u7EC4\u4EF6\u540D\u8FD4\u56DE Props\u3001\u7EA6\u675F\u548C\u793A\u4F8B\u3002",
    inputSchema: {
      name: z.string().describe("\u7EC4\u4EF6\u540D\uFF0C\u4F8B\u5982 Button\u3001Input\u3001Card\u3001Modal\u3002")
    }
  },
  async ({ name }) => {
    const component = getComponentDoc(name);
    if (!component) {
      return textJson({
        error: `\u672A\u627E\u5230\u7EC4\u4EF6\uFF1A${name}`,
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
    description: "\u6309\u573A\u666F\u5173\u952E\u8BCD\u641C\u7D22\u7EC4\u4EF6\u4F7F\u7528\u793A\u4F8B\u3002",
    inputSchema: {
      query: z.string().describe("\u573A\u666F\u5173\u952E\u8BCD\uFF0C\u4F8B\u5982 \u62A5\u540D\u8868\u5355\u3001\u5F39\u7A97\u3001\u63D0\u4EA4\u6309\u94AE\u3002")
    }
  },
  async ({ query }) => textJson({
    query,
    examples: searchExamples(query)
  })
);
await server.connect(new StdioServerTransport());

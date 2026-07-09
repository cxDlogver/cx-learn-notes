export interface ComponentDoc {
  name: string;
  importName: string;
  purpose: string;
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  constraints: string[];
  examples: Array<{
    title: string;
    scenario: string;
    code: string;
  }>;
}

export const componentCatalog: ComponentDoc[] = [
  {
    name: "Button",
    importName: "Button",
    purpose: "用于明确动作触发，例如提交、打开弹窗、次级跳转和危险操作确认。",
    props: [
      { name: "variant", type: "\"primary\" | \"secondary\" | \"ghost\" | \"danger\"", required: false, description: "按钮视觉层级，默认 primary。" },
      { name: "size", type: "\"sm\" | \"md\" | \"lg\"", required: false, description: "按钮尺寸，默认 md。" },
      { name: "loading", type: "boolean", required: false, description: "提交中状态，会禁用按钮并展示 loading。" },
      { name: "disabled", type: "boolean", required: false, description: "禁用按钮。" },
      { name: "children", type: "ReactNode", required: true, description: "按钮文本或内容。" }
    ],
    constraints: [
      "提交类主操作使用 variant=\"primary\"。",
      "取消、返回、关闭等弱操作使用 variant=\"secondary\" 或 variant=\"ghost\"。",
      "删除和不可逆动作使用 variant=\"danger\"。"
    ],
    examples: [
      {
        title: "提交按钮",
        scenario: "表单提交或主流程动作",
        code: "import { Button } from \"@demo/ui\";\n\n<Button type=\"submit\" loading={submitting}>提交报名</Button>"
      },
      {
        title: "次级按钮",
        scenario: "打开详情、关闭弹窗或弱引导",
        code: "import { Button } from \"@demo/ui\";\n\n<Button variant=\"secondary\" onClick={onPreview}>查看详情</Button>"
      }
    ]
  },
  {
    name: "Input",
    importName: "Input",
    purpose: "用于表单输入，内置 label、helperText、error 与基础可访问性属性。",
    props: [
      { name: "label", type: "ReactNode", required: false, description: "输入项标题。" },
      { name: "error", type: "ReactNode", required: false, description: "错误信息，存在时会设置 aria-invalid。" },
      { name: "helperText", type: "ReactNode", required: false, description: "辅助说明，无 error 时展示。" },
      { name: "...inputProps", type: "InputHTMLAttributes<HTMLInputElement>", required: false, description: "支持原生 input 属性，例如 name、type、placeholder、required。" }
    ],
    constraints: [
      "业务表单不要自行拼 label + input，优先使用 Input。",
      "error 和 helperText 同时存在时优先展示 error。",
      "不要传 size 属性，组件库保留统一高度。"
    ],
    examples: [
      {
        title: "邮箱输入",
        scenario: "报名表单邮箱字段",
        code: "import { Input } from \"@demo/ui\";\n\n<Input label=\"邮箱\" name=\"email\" type=\"email\" placeholder=\"name@example.com\" required />"
      },
      {
        title: "带辅助说明",
        scenario: "需要解释用途的输入项",
        code: "import { Input } from \"@demo/ui\";\n\n<Input label=\"团队角色\" name=\"role\" helperText=\"用于发送配套 Demo 资料\" />"
      }
    ]
  },
  {
    name: "Card",
    importName: "Card",
    purpose: "用于承载一组相关内容，例如议程、表单、指标说明或配置面板。",
    props: [
      { name: "title", type: "ReactNode", required: false, description: "卡片标题。" },
      { name: "extra", type: "ReactNode", required: false, description: "右上角补充信息或操作。" },
      { name: "children", type: "ReactNode", required: true, description: "卡片主体内容。" }
    ],
    constraints: [
      "不要把 Card 嵌套在 Card 里面。",
      "Card 用于重复项、表单块和工具块，不用于包裹整页 section。",
      "标题保持短句，复杂说明放入 children。"
    ],
    examples: [
      {
        title: "议程卡片",
        scenario: "展示课程模块列表",
        code: "import { Card } from \"@demo/ui\";\n\n<Card title=\"课程议程\" extra=\"60 分钟\"><ol>{items.map((item) => <li key={item}>{item}</li>)}</ol></Card>"
      }
    ]
  },
  {
    name: "Modal",
    importName: "Modal",
    purpose: "用于短流程确认、结果反馈或轻量详情展示。",
    props: [
      { name: "open", type: "boolean", required: true, description: "弹窗是否打开。" },
      { name: "title", type: "ReactNode", required: false, description: "弹窗标题。" },
      { name: "onOpenChange", type: "(open: boolean) => void", required: true, description: "打开状态变化回调。" },
      { name: "footer", type: "ReactNode", required: false, description: "底部操作区。" },
      { name: "children", type: "ReactNode", required: true, description: "弹窗主体内容。" }
    ],
    constraints: [
      "Modal 必须由外部状态控制 open。",
      "关闭按钮和 ESC 已内置，不要额外重复实现关闭逻辑。",
      "复杂多步骤流程不要塞进 Modal，应拆成独立页面。"
    ],
    examples: [
      {
        title: "结果反馈弹窗",
        scenario: "提交报名后展示成功反馈",
        code: "import { Button, Modal } from \"@demo/ui\";\n\n<Modal open={open} title=\"报名成功\" onOpenChange={setOpen} footer={<Button onClick={() => setOpen(false)}>知道了</Button>}>资料会发送到你的邮箱。</Modal>"
      }
    ]
  }
];

export function getComponentDoc(name: string): ComponentDoc | undefined {
  const normalizedName = name.trim().toLowerCase();
  return componentCatalog.find((component) => component.name.toLowerCase() === normalizedName);
}

export function searchExamples(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  const examples = componentCatalog.flatMap((component) =>
    component.examples.map((example) => ({
      component: component.name,
      importName: component.importName,
      ...example
    }))
  );

  if (!normalizedQuery) {
    return examples;
  }

  return examples
    .map((example) => {
      const searchableText = `${example.component} ${example.title} ${example.scenario} ${example.code}`.toLowerCase();
      const score = normalizedQuery
        .split(/\s+/)
        .filter((word) => searchableText.includes(word)).length;

      return { ...example, score };
    })
    .filter((example) => example.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ score: _score, ...example }) => example);
}

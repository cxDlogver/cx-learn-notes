# 大厂前端 AI 工程化与组件库基建最佳实践，架构师带你速通 mcp、skill、vibecoding 前端神技

## 【初中级】有没有听说过 MCP、Skill、Vibecoding？它们和传统前端开发以及基础 AI 提效有什么本质区别？

- 局部效率提升，自动补全
- 个人效率
- 简单任务，长任务、复杂任务

### AI 提效

Context Engineering

- Memory
- RAG

前期一定要有公司团队知识库（组件库文档、新员工技术培训文档）、规范（编码规范、发布规范、版本管理规范）、资产（组件库、工具库、图表库、...）。让 AI 能够尽可能理解并且渗透到具体工作中

- 你的组件库有多少组件，分别有什么属性，有什么事件
- 你的设计规范，主题色...
- 代码风格
- 你的工具库有哪些共享方法

#### v1.0 
把这些东西写好在一个文档里面，用 AI 的时候直接复制粘贴 **【传统提示词工程】**
编写官网，要求如下：
  1. 我组件库10个组件，分别为：....，1.button 有什么属性、方法....
  2. 组件库整体设计风格是：......
  3. 代码风格参考 eslintrc 的配置
 
  严格遵守以上要求，编写官网，功能如下：
  1. 头部导航
  2. banner
  3. ......

提示词。1. 指令多了难以实施；2. 幻觉


#### v2.0

提示词，精简，在合适时间使用精简提示词

- skill【本地化能力】
    概念
        - 提示词
        - scripts 脚本
    任务边界化
        - 需求评审 skill
        - 规则验证 skill
        - 组件风格预设 skill
        - 组件库查询 skill

- mcp【远程插件能力】
    概念
        - LLM 层面只能负责需求决策等等，本身没有处理能力（调用 writeFile tool、readFile tool、对应 tool）
        - 远程 tool 协议「MCP」
    组件库 MCP
        - 当模型发现用户提示词中意图包含了查询组件库信息时，就调用这个远程 tool mcp
    天气 MCP 以前通过 HTTP 直接 json 传输 API。AI 查询天气
    设计图 Figma MCP

## 【中高级】请详细说说基于自定义组件库 MCP 的设计还原完整链路：从视觉 token 提取到 AI 生成符合约束的业务代码

你现在就是业务->AI落地桥梁

1. 现有组件库、图表库、工具库
    - 跟以往开发组件库不同，以前是给同事看的，现在还要给 AI 看（以更高效、更节省 token 的方式）
    - 持续迭代，AI 跟随组件库升级
2. AI 化

开发 Button 组件
- props
- events
- 用途
- 面向AI，组件 Schema

```json
{
  "name": "Button",
  "description": "按钮组件，用于触发一个操作",
  "props": [
    {
      "name": "type",
      "type": "'primary' | 'secondary' | 'danger'",
      "default": "'primary'",
      "description": "按钮类型"
    },
    {
      "name": "size",
      "type": "'small' | 'medium' | 'large'",
      "default": "'medium'",
      "description": "按钮尺寸"
    },
    {
      "name": "disabled",
      "type": "boolean",
      "default": false,
      "description": "是否禁用"
    }
  ],
  "events": [
    {
      "name": "onClick",
      "type": "(e: MouseEvent) => void",
      "description": "点击事件"
    }
  ],
  "examples": [
    {
      "title": "基础按钮",
      "code": "<Button type='primary'>主要按钮</Button>"
    }
  ]
}```

> AI 生成代码、文章、产物，都是趋于无规则的泛的，你怎样让 AI 在一定的边界内输出内容？

mcp 提供标准接口，来给 AI 提供组件、样例信息
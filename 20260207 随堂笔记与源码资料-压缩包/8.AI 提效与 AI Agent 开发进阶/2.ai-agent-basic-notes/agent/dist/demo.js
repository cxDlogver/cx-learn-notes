"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const openai_1 = require("@langchain/openai");
const z = __importStar(require("zod"));
const langchain_1 = require("langchain");
const llm = new openai_1.ChatOpenAI({
    apiKey: "ark-3a31d8e5-b77d-4a5e-990d-d0ffa0684a6a-08cad",
    model: "doubao-seed-2.0-mini",
    configuration: {
        baseURL: "https://ark.cn-beijing.volces.com/api/plan/v3",
    },
});
const calculator = (0, langchain_1.tool)((input) => eval(input.expression), {
    name: "calculator",
    description: "执行数学计算，支持加减乘除和括号",
    schema: z.object({
        expression: z.string().describe("数学表达式，例如：(3 + 5) * 2"),
    }),
});
const getWeather = (0, langchain_1.tool)((input) => `It's always sunny in ${input.city}!`, {
    name: "get_weather",
    description: "Get the weather for a given city",
    schema: z.object({
        city: z.string().describe("The city to get the weather for"),
    }),
});
const search = (0, langchain_1.tool)(async (input) => {
    return await fetch("https://www.baidu.com");
}, {
    name: "search",
    description: "百度搜索",
    schema: z.object({
        keywords: z.string().describe("搜索关键词"),
    }),
});
// // 计算器工具
// export const calculatorTool = {
//   name: "calculator",
//   description: "执行数学计算，支持加减乘除和括号",
//   parameter: z.object({
//     expression: z.string().describe("数学表达式，例如：(3 + 5) * 2"),
//   }),
//   async execute(args: any) {
//     try {
//       // 注意：生产环境不要使用eval，存在安全风险
//       // 这里仅用于演示，实际项目应使用安全的数学表达式解析库
//       const result = eval(args.expression);
//       return String(result);
//     } catch (error) {
//       return `计算错误：${(error as Error).message}`;
//     }
//   },
// };
const llmWithTools = llm.bindTools([calculator, getWeather, search]);
const invoke = async () => {
    const res = await llmWithTools.invoke(`
    1+1=？ 并且今天北京天气怎么样？帮我搜一下高考资讯`);
    console.log("🚀 ~ invoke ~ res:", res);
    const tool_calls = res.tool_calls;
    while (tool_calls?.length) {
        const firstTool = tool_calls.shift();
    }
};
invoke();
//# sourceMappingURL=demo.js.map
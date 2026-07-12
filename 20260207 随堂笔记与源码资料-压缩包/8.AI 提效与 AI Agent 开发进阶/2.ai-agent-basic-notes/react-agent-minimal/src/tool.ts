import { z } from "zod";

export interface Tool {
  name: string;
  description: string;
  parameters: z.ZodType;
  example: string;
  execute(args: unknown): Promise<string>;
}

const calculatorSchema = z.object({
  expression: z.string().describe("数学表达式，例如：(3 + 5) * 12")
});

export const calculatorTool: Tool = {
  name: "calculator",
  description: "执行数学计算，支持数字、括号、加减乘除",
  parameters: calculatorSchema,
  example: `{"expression":"(3 + 5) * 12"}`,
  async execute(args) {
    const { expression } = calculatorSchema.parse(args);

    if (!/^[0-9+\-*/().\s]+$/.test(expression)) {
      return "计算错误：表达式只能包含数字、括号和 + - * /";
    }

    try {
      const result = Function(`"use strict"; return (${expression})`)();
      return String(result);
    } catch (error) {
      return `计算错误：${(error as Error).message}`;
    }
  }
};

const weatherSchema = z.object({
  city: z.string().describe("城市名称，例如：北京、上海、广州")
});

export const weatherTool: Tool = {
  name: "get_weather",
  description: "查询指定城市的模拟天气",
  parameters: weatherSchema,
  example: `{"city":"北京"}`,
  async execute(args) {
    const { city } = weatherSchema.parse(args);

    const data: Record<string, string> = {
      北京: "晴天，25度，微风",
      上海: "多云，28度，东南风3级",
      广州: "小雨，22度，东北风2级"
    };

    return data[city] || `暂无${city}的天气信息`;
  }
};

export const defaultTools = [calculatorTool, weatherTool];

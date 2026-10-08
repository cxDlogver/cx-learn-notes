// 我自我介绍，帮我提取出来姓名、年龄、性别、手机号
/**
 * 我叫合一，我今年18岁，我是男的，我的手机号是13800000000
 */
// 输出成 json 格式数据
import { ChatOllama } from "@langchain/ollama";
import { readFileSync } from "fs";
import { join } from "path";
import * as z from "zod";

const invoke = async () => {
  const llm = new ChatOllama({
    // model: "qwen3:0.6b", // 模型名称
    model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
  });

  //   const prompt =
  //     "我叫合一，我今年18岁，我是男的，我的手机号是13800000000。请帮我用 json 格式输出姓名、年龄、性别、手机号，帮我按照纯文本方式输出，不要markdown";
  //   const prompt = "我叫合一，我今年18岁，我是男的，我的手机号是13800000000。";
  const prompt =
    "我叫合一，我是合二的哥哥，我弟弟 18 岁，我比他大1岁，我的手机号是13800000000。合一的信息是什么？";

  const img_url = `data:image/png;base64,${readFileSync(
    join(import.meta.dirname, "heyi.png")
  ).toString("base64")}`;

  const messages = [
    {
      role: "human",
      content: [
        {
          type: "text",
          text: prompt,
        },
        {
          type: "image_url",
          image_url: {
            url: img_url,
          },
        },
      ],
    },
  ];

  /**
   * 使用 样板 json object 格式输出
   * 例如：{ "name": "合一", "age": 18, "gender": "男", "phone": "13800000000" }
   * 例如：{ "name": string, "age": number, "gender": string, "phone": string }
   * 通过 zod 来定义 json schema 格式
   */
  const UserSchema = z.object({
    name: z.string(),
    age: z.number(),
    gender: z.string(),
    phone: z.string(),
  });

  //   const res = await llm.invoke(prompt);
  //   console.log(res.content);
  const modelWithStructuredOutput = llm.withStructuredOutput(UserSchema);

  const res = await modelWithStructuredOutput.invoke(prompt);
  console.log(res);
};

invoke();

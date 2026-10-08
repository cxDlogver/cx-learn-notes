// console.log("hello world");
import { ChatOllama } from "@langchain/ollama";

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
  });

  // const prompt = "合一的一些基本情况";

  // 这句提示词，我给你了模型一些关于合一的上下文信息
  /**
   * 1. 充足的上下文，并不是越多越好，compact
   * 2. 知识库
   */
  // 模型微调
  const prompt = `
  我是合一，我在妙码学院教 AI 大前端、全栈课程

  根据上面的介绍整合合一的一些基本情况`;

  const res = await llm.invoke(prompt);
  console.log(res.content);
};

invoke();

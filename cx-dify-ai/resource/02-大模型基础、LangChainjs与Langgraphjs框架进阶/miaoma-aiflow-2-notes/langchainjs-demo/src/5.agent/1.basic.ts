// console.log("hello world");
import { ChatOllama } from "@langchain/ollama";
import { createAgent, HumanMessage } from "langchain";

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
  });

  const prompt = "写一首关于天气晴朗的诗歌";

  const agent = createAgent({
    model: llm,
  });

  const res = await agent.invoke({
    messages: [
      new HumanMessage({
        content: prompt,
      }),
    ],
  });
  console.log(res.messages);
};

invoke();

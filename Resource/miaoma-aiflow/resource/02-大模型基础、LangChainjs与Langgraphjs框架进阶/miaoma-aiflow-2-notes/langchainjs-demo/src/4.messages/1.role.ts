import { ChatOllama } from "@langchain/ollama";
import { AIMessage, HumanMessage, SystemMessage } from "langchain";

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
    streaming: true,
  });

  const prompt = "前端监控";

  const res = await llm.invoke([
    // {
    //   role: "system",
    //   content: "你是一个专业的诗歌作者",
    // },
    // {
    //   role: "ai",
    //   content: "好的，我会写一首关于兄弟争斗的诗歌",
    // },
    // {
    //   role: "user",
    //   content: prompt,
    // },
    new SystemMessage({
      content: "你是一个专业的诗歌作者，模仿李白的风格",
    }),
    new AIMessage({
      content: "好的，我会写一首关于兄弟争斗的诗歌",
    }),
    new HumanMessage({
      content: prompt,
    }),
  ]);
  console.log(res.content);
};

invoke();

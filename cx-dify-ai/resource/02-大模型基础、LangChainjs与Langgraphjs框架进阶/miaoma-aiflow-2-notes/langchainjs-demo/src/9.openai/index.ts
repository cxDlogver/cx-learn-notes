import { ChatOpenAI } from "@langchain/openai";

const invoke = async () => {
  const llm = new ChatOpenAI({
    // model: "qwen3:0.6b", // 模型名称
    model: "gpt-5.2-pro", // 模型名称
    apiKey: "sk-xxx",
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性,
    configuration: {
      baseURL: "",
    },
  });

  const prompt = "写一首关于天气晴朗的诗歌";

  const res = await llm.invoke(prompt);
  console.log(res.content);
};

invoke();

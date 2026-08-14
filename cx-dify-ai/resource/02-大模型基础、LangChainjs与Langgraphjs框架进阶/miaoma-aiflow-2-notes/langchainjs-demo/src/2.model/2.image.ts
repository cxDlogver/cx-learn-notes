console.log("hello langchainjs-demo");
// qwen3:0.6b qwen3-vl:2b
// openAI model

// console.log("hello world");
import { ChatOllama } from "@langchain/ollama";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
    streaming: true,
  });

  const prompt = "图片中有些什么信息？";

  const img_url = `data:image/png;base64,${readFileSync(
    join(import.meta.dirname, "prompt.png")
  ).toString("base64")}`;

  const res = await llm.invoke([
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
  ]);
  console.log(res.content);
};

invoke();

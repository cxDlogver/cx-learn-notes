console.log("hello langchainjs-demo");
// qwen3:0.6b qwen3-vl:2b
// openAI model

// console.log("hello world");
import { ChatOllama } from "@langchain/ollama";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
    streaming: true,
  });

  const prompt = "写一首关于兄弟相争的诗歌";

  //   const res = await llm.invoke(prompt);
  //   console.log(res.content);
  //   writeFileSync(join(import.meta.dirname, `${prompt}-anwser.txt`), res.content);

  // 重构为流式输出
  for await (const chunk of await llm.stream(prompt)) {
    console.log(chunk);
    // 按照chunk.content 追加写入文件
    writeFileSync(
      join(import.meta.dirname, `${prompt}-anwser.txt`),
      chunk.content.toString(),
      { flag: "a" }
    );
  }
};

invoke();

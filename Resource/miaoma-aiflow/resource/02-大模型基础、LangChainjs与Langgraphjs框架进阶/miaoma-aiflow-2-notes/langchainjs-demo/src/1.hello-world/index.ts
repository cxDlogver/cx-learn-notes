// console.log("hello world");
import { ChatOllama } from "@langchain/ollama";
import { writeFileSync } from "node:fs";
import { join } from "node:path";

const invoke = async () => {
  const llm = new ChatOllama({
    model: "qwen3:0.6b", // 模型名称
    // model: "qwen3-vl:2b", // 模型名称
    temperature: 0.7, // 温度参数，控制生成文本的随机性
    //   如果是诗歌创作的场景，较高的温度值可以增加生成诗歌的多样性
    topP: 70, // 控制生成文本的多样性，较高的值会使生成的文本更加多样化
    //   较高的topK值可以增加生成文本的多样性，而较低的值则会使生成的文本更加集中
    topK: 70, //
    streaming: true,
  });

  const prompt = "写一首关于天气晴朗的诗歌";

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

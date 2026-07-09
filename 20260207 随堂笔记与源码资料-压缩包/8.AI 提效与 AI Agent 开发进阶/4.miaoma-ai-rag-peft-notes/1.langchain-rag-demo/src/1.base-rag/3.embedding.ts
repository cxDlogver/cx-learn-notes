import "dotenv/config";

import { OpenAIEmbeddings } from "@langchain/openai";
import { splitText } from "./2.text-spliter.js";

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const embeddingDocument = async () => {
  const texts = await splitText();

  embeddings.embedDocuments(texts);
};
// 离线工作流，向量嵌入
embeddingDocument();

const invoke = async () => {
  const res = await embeddings.embedDocuments(["合一"]);

  console.log(res);
};

invoke();

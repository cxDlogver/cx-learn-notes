import "dotenv/config";

import { OpenAIEmbeddings } from "@langchain/openai";
import { splitText } from "./2.text-spliter.js";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";

const embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL,
  },
});

const embeddingDocument = async () => {
  const texts = await splitText();
  console.log("🚀 ~ embeddingDocument ~ texts:", texts);

  //   embeddings.embedDocuments(texts);
  const vectorStore = await MemoryVectorStore.fromDocuments(
    texts.map(
      (text) =>
        new Document({
          pageContent: text,
        }),
    ),
    embeddings,
  );

  return vectorStore;
};

const invoke = async () => {
  // 离线工作流，向量嵌入
  const vectorStore = await embeddingDocument();
  const vector = await embeddings.embedQuery("小明");

  const res = await vectorStore.similaritySearchVectorWithScore(vector, 1);
  console.log("🚀 ~ invoke ~ res:", res);
};

invoke();

import "dotenv/config";

import { DistanceStrategy, PGVectorStore } from "@langchain/community/vectorstores/pgvector";

import { PoolConfig } from "pg";

import { OpenAIEmbeddings } from "@langchain/openai";
import { splitText } from "./2.text-spliter.js";
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

  const config = {
    postgresConnectionOptions: {
      type: "postgres",
      host: "127.0.0.1",
      port: 5432,
      user: "postgres",
      password: "heyi",
      database: "embedding",
    } as PoolConfig,
    tableName: "heyilangchainjs",
    columns: {
      idColumnName: "id",
      vectorColumnName: "vector",
      contentColumnName: "content",
      metadataColumnName: "metadata",
    },
    // supported distance strategies: cosine (default), innerProduct, or euclidean
    distanceStrategy: "cosine" as DistanceStrategy,
  };

  //   pgvector 来存
  const vectorStore = await PGVectorStore.initialize(embeddings, config);

  //   embeddings.embedDocuments(texts);
  await vectorStore.addDocuments(
    texts.map(
      (text) =>
        new Document({
          pageContent: text,
        }),
    )
  );

  return vectorStore;
};

const invoke = async () => {
  // 离线工作流，向量嵌入
  const vectorStore = await embeddingDocument();
  const vector = await embeddings.embedQuery("合一");

  const res = await vectorStore.similaritySearchVectorWithScore(vector, 1);
  console.log("🚀 ~ invoke ~ res:", res);

  return res
};

invoke();

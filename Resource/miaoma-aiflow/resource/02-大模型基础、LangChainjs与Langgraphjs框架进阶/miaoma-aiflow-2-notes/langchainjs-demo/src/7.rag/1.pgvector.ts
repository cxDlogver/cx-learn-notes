import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import {
  type DistanceStrategy,
  PGVectorStore,
} from "@langchain/community/vectorstores/pgvector";
import path from "node:path";

import { OllamaEmbeddings } from "@langchain/ollama";
import { PoolConfig } from "pg";

const loader = new CSVLoader(
  // @ts-expect-error
  path.resolve(import.meta.dirname, "../../rga-document/student.csv")
);

const loadDocument = async () => {
  const data = await loader.load();
  return data;
};

const embeddings = new OllamaEmbeddings({
  model: "nomic-embed-text:v1.5",
});

const embeddingStore = async () => {
  // Sample config
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

  const vectorStore = await PGVectorStore.initialize(embeddings, config);

  const data = await loadDocument();

  await vectorStore.addDocuments(data);

  return vectorStore;
};

const invoke = async () => {
  const vectorStore = await embeddingStore();

  const res = await vectorStore.similaritySearchWithScore("heyi");
  console.log(res);
};

invoke();

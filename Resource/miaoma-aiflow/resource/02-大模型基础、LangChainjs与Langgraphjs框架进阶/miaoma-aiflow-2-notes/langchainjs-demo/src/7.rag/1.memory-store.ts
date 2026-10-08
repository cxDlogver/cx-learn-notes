import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import path from "node:path";

import { OllamaEmbeddings } from "@langchain/ollama";

const loader = new CSVLoader(
  path.resolve(import.meta.dirname, "../../rga-document/student.csv")
);

// 加载文档
const loadDocument = async () => {
  const data = await loader.load();
  console.log(data);
  return data;
};

const embeddings = new OllamaEmbeddings({
  model: "mxbai-embed-large:latest",
});

// 文档的嵌入向量生成
const embeddingStore = async () => {
  const data = await loadDocument();
  const vectorStore = await MemoryVectorStore.fromDocuments(data, embeddings);

  return vectorStore;
};

const invoke = async () => {
  const vectorStore = await embeddingStore();
  const vector = await embeddings.embedQuery("合一");
  console.log(vector);


  const result = await vectorStore.similaritySearchVectorWithScore(vector, 1);
  console.log(result);
};

// 再向量查询
invoke();

import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
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
const embeddingDocument = async () => {
  const data = await loadDocument();
  embeddings.embedDocuments(data.map((doc) => doc.pageContent));
};

const invoke = async () => {
  const res = await embeddings.embedQuery("合一");
  console.log(res);
};

// 生成嵌入向量
embeddingDocument();
// 再向量查询
invoke();

// src/1.base-rag/4.memory-store.ts
import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";

// src/1.base-rag/2.text-spliter.ts
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// src/1.base-rag/1.loader-csv.ts
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import path from "node:path";
var loader = new CSVLoader(
  path.resolve(import.meta.dirname, "../rga-document/student.csv")
);
var loadDocument = async () => {
  const data = await loader.load();
  return data;
};

// src/1.base-rag/2.text-spliter.ts
var splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 3,
  chunkOverlap: 1,
  separators: ["\uFF0C"]
});
var splitText = async () => {
  const doc = await loadDocument();
  const chunks = await splitter.splitText(doc[0].pageContent);
  return chunks;
};

// src/1.base-rag/4.memory-store.ts
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/core/documents";
var embeddings = new OpenAIEmbeddings({
  model: process.env.EMBEDDING_MODEL,
  apiKey: process.env.API_KEY,
  configuration: {
    baseURL: process.env.BASE_URL
  }
});
var embeddingDocument = async () => {
  const texts = await splitText();
  console.log("\u{1F680} ~ embeddingDocument ~ texts:", texts);
  const vectorStore = await MemoryVectorStore.fromDocuments(
    texts.map(
      (text) => new Document({
        pageContent: text
      })
    ),
    embeddings
  );
  return vectorStore;
};
var invoke = async () => {
  const vectorStore = await embeddingDocument();
  const vector = await embeddings.embedQuery("\u5C0F\u660E");
  const res = await vectorStore.similaritySearchVectorWithScore(vector, 1);
  console.log("\u{1F680} ~ invoke ~ res:", res);
};
invoke();

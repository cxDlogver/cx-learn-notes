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
export {
  splitText
};

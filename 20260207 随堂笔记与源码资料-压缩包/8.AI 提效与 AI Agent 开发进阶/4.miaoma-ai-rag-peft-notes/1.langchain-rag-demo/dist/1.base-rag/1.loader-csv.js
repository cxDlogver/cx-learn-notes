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
export {
  loadDocument
};

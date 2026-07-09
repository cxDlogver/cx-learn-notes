// import { CSVLoader } from "@langchain/classic/document_loaders/fs/json";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
// import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import path from "node:path";

const loader = new CSVLoader(
  path.resolve(import.meta.dirname, "../rga-document/student.csv"),
);
// const loader = new DocxLoader(
//   path.resolve(import.meta.dirname, "../rga-document/文字文稿1.docx"),
// );

export const loadDocument = async () => {
  const data = await loader.load();

//   console.log(data);

  return data;
};

// loadDocument();

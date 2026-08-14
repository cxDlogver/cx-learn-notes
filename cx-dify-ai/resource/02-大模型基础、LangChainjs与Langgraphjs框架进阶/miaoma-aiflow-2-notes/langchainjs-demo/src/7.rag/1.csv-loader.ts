import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import path from "node:path";

const loader = new CSVLoader(
  path.resolve(import.meta.dirname, "../../rga-document/student.csv")
);

const loadDocument = async () => {
  const data = await loader.load();
  console.log(data);
  return data;
};

loadDocument();

import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import type { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path from "node:path";

import { readEmbeddingConfig } from "./env";

const DEFAULT_STUDENT_DATA_PATH = path.resolve(
  import.meta.dirname,
  "../../rga-document/student.csv"
);

export const createEmbeddings = () => {
  const config = readEmbeddingConfig();
  return new OpenAIEmbeddings({
    model: config.model,
    apiKey: config.apiKey,
    configuration: {
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    },
  });
};

export const loadStudentDocuments = async (
  filePath = DEFAULT_STUDENT_DATA_PATH
) => {
  const loader = new CSVLoader(filePath);
  return loader.load();
};

export const splitDocuments = async (
  documents: Document[],
  chunkSize = 500,
  chunkOverlap = 50
) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap,
  });

  return splitter.splitDocuments(documents);
};

export const createStudentVectorStore = async () => {
  const documents = await loadStudentDocuments();
  const splitDocs = await splitDocuments(documents);
  return MemoryVectorStore.fromDocuments(splitDocs, createEmbeddings());
};

export const retrieveStudentDocuments = async (query: string, k = 3) => {
  const vectorStore = await createStudentVectorStore();
  return vectorStore.similaritySearch(query, k);
};

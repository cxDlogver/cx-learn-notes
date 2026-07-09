// src/shared/knowledge-base.ts
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path2 from "node:path";

// src/shared/env.ts
import { config as loadDotEnv } from "dotenv";
import path from "node:path";
var DEFAULT_EMBEDDING_MODEL = "doubao-embedding-vision";
var ENV_FILE_PATH = path.resolve(import.meta.dirname, "../../.env");
loadDotEnv({ path: ENV_FILE_PATH });
var REQUIRED_MODEL_ENV_KEYS = [
  "LLM_MODEL",
  "BASE_URL",
  "API_KEY"
];
var readModelConfig = (env = process.env) => {
  const missingKeys = REQUIRED_MODEL_ENV_KEYS.filter((key) => {
    const value = env[key];
    return value === void 0 || value.trim() === "";
  });
  if (missingKeys.length > 0) {
    throw new Error(`\u7F3A\u5C11\u73AF\u5883\u53D8\u91CF: ${missingKeys.join(", ")}`);
  }
  return {
    model: env.LLM_MODEL.trim(),
    baseURL: env.BASE_URL.trim(),
    apiKey: env.API_KEY.trim()
  };
};
var readEmbeddingConfig = (env = process.env) => {
  const modelConfig = readModelConfig(env);
  const embeddingModel = env.EMBEDDING_MODEL?.trim();
  return {
    model: embeddingModel === "" || embeddingModel === void 0 ? DEFAULT_EMBEDDING_MODEL : embeddingModel,
    baseURL: modelConfig.baseURL,
    apiKey: modelConfig.apiKey
  };
};

// src/shared/knowledge-base.ts
var DEFAULT_STUDENT_DATA_PATH = path2.resolve(
  import.meta.dirname,
  "../../rga-document/student.csv"
);
var createEmbeddings = () => {
  const config = readEmbeddingConfig();
  return new OpenAIEmbeddings({
    model: config.model,
    apiKey: config.apiKey,
    configuration: {
      apiKey: config.apiKey,
      baseURL: config.baseURL
    }
  });
};
var loadStudentDocuments = async (filePath = DEFAULT_STUDENT_DATA_PATH) => {
  const loader = new CSVLoader(filePath);
  return loader.load();
};
var splitDocuments = async (documents, chunkSize = 500, chunkOverlap = 50) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  });
  return splitter.splitDocuments(documents);
};
var createStudentVectorStore = async () => {
  const documents = await loadStudentDocuments();
  const splitDocs = await splitDocuments(documents);
  return MemoryVectorStore.fromDocuments(splitDocs, createEmbeddings());
};
var retrieveStudentDocuments = async (query, k = 3) => {
  const vectorStore = await createStudentVectorStore();
  return vectorStore.similaritySearch(query, k);
};
export {
  createEmbeddings,
  createStudentVectorStore,
  loadStudentDocuments,
  retrieveStudentDocuments,
  splitDocuments
};

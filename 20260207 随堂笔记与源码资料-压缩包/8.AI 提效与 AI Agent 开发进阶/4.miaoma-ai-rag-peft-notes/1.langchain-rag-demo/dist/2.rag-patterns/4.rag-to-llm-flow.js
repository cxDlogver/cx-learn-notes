// src/shared/model.ts
import { ChatOpenAI } from "@langchain/openai";

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

// src/shared/model.ts
var createChatModel = ({
  config = readModelConfig(),
  temperature = 0
} = {}) => new ChatOpenAI({
  model: config.model,
  apiKey: config.apiKey,
  temperature,
  configuration: {
    apiKey: config.apiKey,
    baseURL: config.baseURL
  }
});

// src/shared/rag-format.ts
var formatMetadataValue = (value) => {
  if (typeof value !== "object") {
    return String(value);
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};
var formatMetadata = (metadata = {}) => {
  const entries = Object.entries(metadata).filter(
    ([, value]) => value !== void 0 && value !== null && value !== ""
  );
  if (entries.length === 0) {
    return "metadata=none";
  }
  return entries.map(([key, value]) => `${key}=${formatMetadataValue(value)}`).join(" ");
};
var formatDocumentsAsContext = (documents2) => {
  if (documents2.length === 0) {
    return "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4E0A\u4E0B\u6587\u3002";
  }
  return documents2.map((document, index) => {
    const metadata = formatMetadata(document.metadata);
    return `[${index + 1}] ${metadata}
${document.pageContent}`;
  }).join("\n\n");
};

// src/shared/knowledge-base.ts
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { OpenAIEmbeddings } from "@langchain/openai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import path2 from "node:path";
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
var splitDocuments = async (documents2, chunkSize = 500, chunkOverlap = 50) => {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize,
    chunkOverlap
  });
  return splitter.splitDocuments(documents2);
};
var createStudentVectorStore = async () => {
  const documents2 = await loadStudentDocuments();
  const splitDocs = await splitDocuments(documents2);
  return MemoryVectorStore.fromDocuments(splitDocs, createEmbeddings());
};
var retrieveStudentDocuments = async (query, k = 3) => {
  const vectorStore = await createStudentVectorStore();
  return vectorStore.similaritySearch(query, k);
};

// src/2.rag-patterns/4.rag-to-llm-flow.ts
var question = process.argv.slice(2).join(" ") || "\u8BF7\u6839\u636E\u5B66\u751F\u77E5\u8BC6\u5E93\u56DE\u7B54\uFF1Aheyi \u7684\u6210\u7EE9\u662F\u591A\u5C11\uFF1F";
var documents = await retrieveStudentDocuments(question, 3);
var context = formatDocumentsAsContext(documents);
var prompt = `\u4F60\u662F\u4E00\u4E2A\u4F01\u4E1A\u77E5\u8BC6\u5E93\u95EE\u7B54\u52A9\u624B\u3002
\u4E0B\u9762\u662F RAG \u68C0\u7D22\u9636\u6BB5\u8FD4\u56DE\u7684\u4E0A\u4E0B\u6587\uFF0C\u8BF7\u4E25\u683C\u57FA\u4E8E\u4E0A\u4E0B\u6587\u56DE\u7B54\u7528\u6237\u95EE\u9898\u3002
\u5982\u679C\u4E0A\u4E0B\u6587\u4E2D\u6CA1\u6709\u7B54\u6848\uFF0C\u8BF7\u56DE\u7B54\u201C\u4E0A\u4E0B\u6587\u4E2D\u6CA1\u6709\u8DB3\u591F\u4FE1\u606F\u201D\u3002
\u56DE\u7B54\u540E\u8BF7\u7528\u4E00\u53E5\u8BDD\u8BF4\u660E\u4F60\u5F15\u7528\u4E86\u54EA\u4E9B\u68C0\u7D22\u7ED3\u679C\u7F16\u53F7\u3002

<context>
${context}
</context>

\u7528\u6237\u95EE\u9898\uFF1A${question}`;
var model = createChatModel();
var response = await model.invoke(prompt);
console.log("\u6B65\u9AA4 1 - \u7528\u6237\u95EE\u9898:\n", question);
console.log("\n\u6B65\u9AA4 2 - RAG \u68C0\u7D22\u7ED3\u679C:\n", context);
console.log("\n\u6B65\u9AA4 3 - \u53D1\u9001\u7ED9\u5927\u6A21\u578B\u7684 Prompt:\n", prompt);
console.log("\n\u6B65\u9AA4 4 - \u5927\u6A21\u578B\u6700\u7EC8\u56DE\u7B54:\n", response.content);

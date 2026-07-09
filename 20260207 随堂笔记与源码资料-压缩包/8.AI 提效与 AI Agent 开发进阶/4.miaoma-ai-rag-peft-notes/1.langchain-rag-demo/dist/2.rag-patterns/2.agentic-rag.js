// src/2.rag-patterns/2.agentic-rag.ts
import { createAgent, tool } from "langchain";
import { z } from "zod";

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

// src/shared/model.ts
import { ChatOpenAI } from "@langchain/openai";
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
var formatDocumentsAsContext = (documents) => {
  if (documents.length === 0) {
    return "\u672A\u68C0\u7D22\u5230\u76F8\u5173\u4E0A\u4E0B\u6587\u3002";
  }
  return documents.map((document, index) => {
    const metadata = formatMetadata(document.metadata);
    return `[${index + 1}] ${metadata}
${document.pageContent}`;
  }).join("\n\n");
};

// src/2.rag-patterns/2.agentic-rag.ts
var question = process.argv.slice(2).join(" ") || "heyi \u7684\u6210\u7EE9\u662F\u591A\u5C11\uFF1F";
var retrieveStudentKnowledge = tool(
  async ({ query }) => {
    const documents = await retrieveStudentDocuments(query, 3);
    return formatDocumentsAsContext(documents);
  },
  {
    name: "retrieve_student_knowledge",
    description: "\u68C0\u7D22\u5B66\u751F CSV \u77E5\u8BC6\u5E93\uFF0C\u9002\u5408\u56DE\u7B54\u5B66\u751F\u59D3\u540D\u3001\u5B66\u53F7\u3001\u6210\u7EE9\u76F8\u5173\u95EE\u9898\u3002",
    schema: z.object({
      query: z.string().describe("\u7528\u4E8E\u68C0\u7D22\u5B66\u751F\u77E5\u8BC6\u5E93\u7684\u81EA\u7136\u8BED\u8A00\u67E5\u8BE2")
    })
  }
);
var agent = createAgent({
  model: createChatModel(),
  tools: [retrieveStudentKnowledge],
  systemPrompt: "\u4F60\u662F\u4E00\u4E2A RAG Agent\u3002\u9047\u5230\u5B66\u751F\u59D3\u540D\u3001\u5B66\u53F7\u3001\u6210\u7EE9\u76F8\u5173\u95EE\u9898\u65F6\uFF0C\u5FC5\u987B\u5148\u8C03\u7528 retrieve_student_knowledge\uFF0C\u518D\u57FA\u4E8E\u5DE5\u5177\u8FD4\u56DE\u5185\u5BB9\u56DE\u7B54\u3002"
});
var result = await agent.invoke({
  messages: [{ role: "user", content: question }]
});
var finalMessage = result.messages.at(-1);
console.log("Agent \u6700\u7EC8\u56DE\u7B54:\n", finalMessage?.content ?? result);

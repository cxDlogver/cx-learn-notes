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

// src/shared/hybrid-retrieval.ts
var documentKey = (document) => {
  const source = document.metadata?.source ?? "";
  return `${String(source)}::${document.pageContent}`;
};
var mergeHybridResults = ({
  vectorResults: vectorResults2,
  keywordResults: keywordResults2,
  maxResults = 4
}) => {
  const seen = /* @__PURE__ */ new Set();
  const merged = [];
  for (const document of [...vectorResults2, ...keywordResults2]) {
    const key = documentKey(document);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    merged.push(document);
    if (merged.length >= maxResults) {
      break;
    }
  }
  return merged;
};
var tokenize = (query) => query.toLowerCase().split(/[\s,，。！？?;；:：]+/).map((term) => term.trim()).filter(Boolean);
var keywordSearchDocuments = (documents2, query, maxResults = 4) => {
  const terms = tokenize(query);
  if (terms.length === 0) {
    return [];
  }
  return documents2.map((document) => {
    const content = document.pageContent.toLowerCase();
    const score = terms.reduce(
      (total, term) => total + (content.includes(term) ? 1 : 0),
      0
    );
    return { document, score };
  }).filter(({ score }) => score > 0).sort((left, right) => right.score - left.score).slice(0, maxResults).map(({ document }) => document);
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

// src/2.rag-patterns/3.hybrid-rag.ts
var question = process.argv.slice(2).join(" ") || "heyi \u591A\u5C11\u5206";
var toText = (content) => {
  if (typeof content === "string") {
    return content;
  }
  return JSON.stringify(content);
};
var parseQueryExpansion = (rawContent) => {
  const rawText = toText(rawContent);
  const queries = rawText.split(/\r?\n/).map((line) => line.replace(/^[-*\d.、\s]+/, "").trim()).filter(Boolean);
  return [.../* @__PURE__ */ new Set([question, ...queries])].slice(0, 4);
};
var model = createChatModel();
var expansionResponse = await model.invoke(`\u8BF7\u4E3A\u4E0B\u9762\u95EE\u9898\u751F\u6210 2 \u5230 3 \u4E2A\u9002\u5408\u68C0\u7D22\u77E5\u8BC6\u5E93\u7684\u6539\u5199\u67E5\u8BE2\u3002
\u8981\u6C42\uFF1A\u53EA\u8F93\u51FA\u67E5\u8BE2\uFF0C\u6BCF\u884C\u4E00\u4E2A\uFF0C\u4E0D\u8981\u89E3\u91CA\u3002

\u95EE\u9898\uFF1A${question}`);
var expandedQueries = parseQueryExpansion(expansionResponse.content);
var vectorStore = await createStudentVectorStore();
var sourceDocuments = await loadStudentDocuments();
var vectorResults = (await Promise.all(
  expandedQueries.map((query) => vectorStore.similaritySearch(query, 2))
)).flat();
var keywordResults = expandedQueries.flatMap(
  (query) => keywordSearchDocuments(sourceDocuments, query, 2)
);
var documents = mergeHybridResults({
  vectorResults,
  keywordResults,
  maxResults: 4
});
var context = formatDocumentsAsContext(documents);
var response = await model.invoke(`\u4F60\u662F\u4E00\u4E2A\u4E25\u8C28\u7684 Hybrid RAG \u95EE\u7B54\u52A9\u624B\u3002
\u4E0B\u9762\u7684\u4E0A\u4E0B\u6587\u6765\u81EA\u5411\u91CF\u68C0\u7D22\u548C\u5173\u952E\u8BCD\u68C0\u7D22\u7684\u5408\u5E76\u7ED3\u679C\u3002
\u8BF7\u53EA\u57FA\u4E8E<context>\u56DE\u7B54\uFF0C\u65E0\u6CD5\u5224\u65AD\u65F6\u76F4\u63A5\u8BF4\u660E\u4E0A\u4E0B\u6587\u4E0D\u8DB3\u3002

<context>
${context}
</context>

\u95EE\u9898\uFF1A${question}`);
console.log("\u6269\u5C55\u67E5\u8BE2:\n", expandedQueries.join("\n"));
console.log("\n\u5408\u5E76\u4E0A\u4E0B\u6587:\n", context);
console.log("\n\u6A21\u578B\u56DE\u7B54:\n", response.content);

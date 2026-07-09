import type { RagDocument } from "../shared/rag-format";
import {
  createStudentVectorStore,
  loadStudentDocuments,
} from "../shared/knowledge-base";
import {
  keywordSearchDocuments,
  mergeHybridResults,
} from "../shared/hybrid-retrieval";
import { createChatModel } from "../shared/model";
import { formatDocumentsAsContext } from "../shared/rag-format";

const question = process.argv.slice(2).join(" ") || "heyi 多少分";

const toText = (content: unknown) => {
  if (typeof content === "string") {
    return content;
  }

  return JSON.stringify(content);
};

const parseQueryExpansion = (rawContent: unknown) => {
  const rawText = toText(rawContent);
  const queries = rawText
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.、\s]+/, "").trim())
    .filter(Boolean);

  return [...new Set([question, ...queries])].slice(0, 4);
};

const model = createChatModel();

const expansionResponse = await model.invoke(`请为下面问题生成 2 到 3 个适合检索知识库的改写查询。
要求：只输出查询，每行一个，不要解释。

问题：${question}`);

const expandedQueries = parseQueryExpansion(expansionResponse.content);
const vectorStore = await createStudentVectorStore();
const sourceDocuments = await loadStudentDocuments();

const vectorResults = (
  await Promise.all(
    expandedQueries.map((query) => vectorStore.similaritySearch(query, 2))
  )
).flat();

const keywordResults = expandedQueries.flatMap((query) =>
  keywordSearchDocuments(sourceDocuments as RagDocument[], query, 2)
);

const documents = mergeHybridResults({
  vectorResults,
  keywordResults,
  maxResults: 4,
});

const context = formatDocumentsAsContext(documents);

const response = await model.invoke(`你是一个严谨的 Hybrid RAG 问答助手。
下面的上下文来自向量检索和关键词检索的合并结果。
请只基于<context>回答，无法判断时直接说明上下文不足。

<context>
${context}
</context>

问题：${question}`);

console.log("扩展查询:\n", expandedQueries.join("\n"));
console.log("\n合并上下文:\n", context);
console.log("\n模型回答:\n", response.content);

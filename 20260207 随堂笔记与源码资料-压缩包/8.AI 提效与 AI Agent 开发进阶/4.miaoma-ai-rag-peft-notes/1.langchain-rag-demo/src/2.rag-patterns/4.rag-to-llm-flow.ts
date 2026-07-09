import { createChatModel } from "../shared/model";
import { formatDocumentsAsContext } from "../shared/rag-format";
import { retrieveStudentDocuments } from "../shared/knowledge-base";

const question =
  process.argv.slice(2).join(" ") || "请根据学生知识库回答：heyi 的成绩是多少？";

const documents = await retrieveStudentDocuments(question, 3);
const context = formatDocumentsAsContext(documents);

const prompt = `你是一个企业知识库问答助手。
下面是 RAG 检索阶段返回的上下文，请严格基于上下文回答用户问题。
如果上下文中没有答案，请回答“上下文中没有足够信息”。
回答后请用一句话说明你引用了哪些检索结果编号。

<context>
${context}
</context>

用户问题：${question}`;

const model = createChatModel();
const response = await model.invoke(prompt);

console.log("步骤 1 - 用户问题:\n", question);
console.log("\n步骤 2 - RAG 检索结果:\n", context);
console.log("\n步骤 3 - 发送给大模型的 Prompt:\n", prompt);
console.log("\n步骤 4 - 大模型最终回答:\n", response.content);

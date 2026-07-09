import { createChatModel } from "../shared/model";
import { formatDocumentsAsContext } from "../shared/rag-format";
import { retrieveStudentDocuments } from "../shared/knowledge-base";

const question = process.argv.slice(2).join(" ") || "heyi 的成绩是多少？";

const documents = await retrieveStudentDocuments(question, 3);
const context = formatDocumentsAsContext(documents);

const prompt = `你是一个严谨的 RAG 问答助手。
请只基于<context>中的内容回答问题。
如果上下文没有答案，请回答“上下文中没有足够信息”。

<context>
${context}
</context>

问题：${question}`;

const model = createChatModel();
const response = await model.invoke(prompt);

console.log("检索上下文:\n", context);
console.log("\n模型回答:\n", response.content);

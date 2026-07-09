import { createAgent, tool } from "langchain";
import { z } from "zod";

import { retrieveStudentDocuments } from "../shared/knowledge-base";
import { createChatModel } from "../shared/model";
import { formatDocumentsAsContext } from "../shared/rag-format";

// 问的是你好，就不会走知识库检索
// const question = process.argv.slice(2).join(" ") || "你好"; 
const question = process.argv.slice(2).join(" ") || "heyi 的成绩是多少？";

const retrieveStudentKnowledge = tool(
  async ({ query }) => {
    const documents = await retrieveStudentDocuments(query, 3);
    return formatDocumentsAsContext(documents);
  },
  {
    name: "retrieve_student_knowledge",
    description:
      "检索学生 CSV 知识库，适合回答学生姓名、学号、成绩相关问题。",
    schema: z.object({
      query: z.string().describe("用于检索学生知识库的自然语言查询"),
    }),
  }
);

const agent = createAgent({
  model: createChatModel(),
  tools: [retrieveStudentKnowledge],
  systemPrompt:
    "你是一个 RAG Agent。遇到学生姓名、学号、成绩相关问题时，必须先调用 retrieve_student_knowledge，再基于工具返回内容回答。",
});

const result = await agent.invoke({
  messages: [{ role: "user", content: question }],
});

const finalMessage = result.messages.at(-1);

console.log("Agent 最终回答:\n", finalMessage?.content ?? result);

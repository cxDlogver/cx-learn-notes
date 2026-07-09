import { Command, MemorySaver } from "@langchain/langgraph";
import { createDeepAgent } from "deepagents";

import { ensureProviderEnv, getModel, threadConfig } from "../00-shared/lib/env";
import { collectReviewDecisions, hasInterrupt } from "../00-shared/lib/hitl";
import { printFinal, printTitle } from "../00-shared/lib/output";
import { sendCourseEmail, writeReleaseTicket } from "../00-shared/tools/domain-tools";

export async function runHumanInTheLoopDemo(): Promise<void> {
  ensureProviderEnv();
  printTitle("human-in-the-loop：敏感工具审批");

  const checkpointer = new MemorySaver();
  const agent = createDeepAgent({
    model: getModel(),
    tools: [writeReleaseTicket, sendCourseEmail],
    checkpointer,
    interruptOn: {
      write_release_ticket: { allowedDecisions: ["approve", "reject"] },
      send_course_email: { allowedDecisions: ["approve", "reject"] },
    },
    systemPrompt: [
      "你是课程运营助理。",
      "创建工单或发送邮件前要给出清晰理由。",
      "最终回答必须说明哪些动作被执行，哪些动作被拒绝或跳过。",
    ].join("\n"),
  });

  const config = threadConfig("hitl");
  let result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            "请创建一个 high 严重程度的发布工单，提醒补充 sandbox 安全说明；同时给 ops@example.com 发送课程通知邮件。",
        },
      ],
    },
    config,
  );

  if (hasInterrupt(result)) {
    const decisions = await collectReviewDecisions(result);
    result = await agent.invoke(new Command({ resume: { decisions } }), config);
  }

  printFinal(result);
}

await runHumanInTheLoopDemo();

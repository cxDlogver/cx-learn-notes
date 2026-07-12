import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { reactAgent } from "./agent.js";

async function main(): Promise<void> {
  const rl = createInterface({ input, output });

  console.log("最小 ReAct Agent");
  console.log("输入 exit 退出\n");

  try {
    while (true) {
      let question: string;

      try {
        question = await rl.question("你：");
      } catch (error) {
        if (
          error instanceof Error &&
          "code" in error &&
          error.code === "ERR_USE_AFTER_CLOSE"
        ) {
          break;
        }

        throw error;
      }

      if (question.trim().toLowerCase() === "exit") {
        break;
      }

      const answer = await reactAgent(question);
      console.log("\n助手：", answer);
      console.log();
    }
  } finally {
    rl.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

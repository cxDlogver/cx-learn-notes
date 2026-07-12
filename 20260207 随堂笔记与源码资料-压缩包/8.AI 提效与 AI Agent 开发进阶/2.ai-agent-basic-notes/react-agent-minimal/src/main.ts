import { reactAgent } from "./agent.js";

async function main(): Promise<void> {
  const questions = [
    "你好，介绍一下你自己",
    "计算 (3 + 5) * 12 等于多少",
    "北京今天天气怎么样"
  ];

  for (const question of questions) {
    console.log("\n==============================");
    console.log("用户问题：", question);

    const answer = await reactAgent(question);

    console.log("\n最终答案：", answer);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

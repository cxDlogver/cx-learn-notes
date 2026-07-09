import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { printObject, printTitle } from "./output";

type InterruptBundle = {
  actionRequests?: Array<{ name: string; args: unknown }>;
  reviewConfigs?: Array<{ actionName: string; allowedDecisions: string[] }>;
};

export function getInterruptBundle(result: unknown): InterruptBundle | null {
  const interrupts = (result as { __interrupt__?: Array<{ value?: InterruptBundle }> })
    .__interrupt__;
  return interrupts?.[0]?.value ?? null;
}

export function hasInterrupt(result: unknown): boolean {
  return getInterruptBundle(result) !== null;
}

function normalizeDecision(input: string): string {
  const normalized = input.trim().toLowerCase();
  if (["approve", "approved", "yes", "y", "是", "通过", "同意"].includes(normalized)) {
    return "approve";
  }
  if (["reject", "rejected", "no", "n", "否", "拒绝", "失败"].includes(normalized)) {
    return "reject";
  }
  return normalized;
}

async function collectManualDecisions(
  actionRequests: Array<{ name: string; args: unknown }>,
  configMap: Map<string, string[]>,
): Promise<Array<{ type: string }>> {
  if (!process.stdin.isTTY) {
    throw new Error(
      [
        "当前启用了人工审批，但 stdin 不是交互式 TTY。",
        "请在本地终端运行 npm run demo:hitl 或 npm run demo:sandboxes。",
        "如需非交互演示，可临时设置 HITL_AUTO_DECISION=approve 或 HITL_AUTO_DECISION=reject。",
      ].join("\n"),
    );
  }

  const rl = createInterface({ input, output });
  try {
    const decisions: Array<{ type: string }> = [];
    for (const action of actionRequests) {
      const allowed = configMap.get(action.name) ?? ["approve", "reject"];
      let decision = "";
      while (!allowed.includes(decision)) {
        const answer = await rl.question(
          `审批 ${action.name}，输入 ${allowed.join("/")}（默认 reject）：`,
        );
        decision = normalizeDecision(answer || "reject");
        if (!allowed.includes(decision)) {
          console.log(`无效审批结果：${answer || "(空)"}`);
        }
      }
      decisions.push({ type: decision });
    }
    return decisions;
  } finally {
    rl.close();
  }
}

export async function collectReviewDecisions(result: unknown): Promise<Array<{ type: string }>> {
  const bundle = getInterruptBundle(result);
  if (!bundle) return [];

  const actionRequests = bundle.actionRequests ?? [];
  const configMap = new Map(
    (bundle.reviewConfigs ?? []).map((config) => [config.actionName, config.allowedDecisions]),
  );

  printTitle("等待人工审批");
  for (const [index, action] of actionRequests.entries()) {
    const allowed = configMap.get(action.name) ?? ["approve", "reject"];
    printObject(`待审批 ${index + 1}: ${action.name}`, {
      args: action.args,
      allowedDecisions: allowed,
    });
  }

  const autoDecision = process.env.HITL_AUTO_DECISION;
  let decisions: Array<{ type: string }>;
  if (autoDecision === "approve" || autoDecision === "reject") {
    decisions = actionRequests.map((action) => {
      const allowed = configMap.get(action.name) ?? ["approve", "reject"];
      if (allowed.includes(autoDecision)) {
        return { type: autoDecision };
      }
      if (allowed.includes("reject")) return { type: "reject" };
      return { type: allowed[0] ?? "approve" };
    });
  } else {
    decisions = await collectManualDecisions(actionRequests, configMap);
  }

  printObject(
    "审批结果",
    decisions.map((decision, index) => ({
      action: actionRequests[index]?.name,
      decision: decision.type,
    })),
  );
  return decisions;
}

import assert from "node:assert/strict";
import test from "node:test";

import { MinimalAgent } from "../src/agent.ts";
import type { AgentSpec, ModelDecision } from "../src/contracts.ts";
import { ScriptedModel } from "../src/models.ts";
import { defaultTools } from "../src/tools.ts";

function createSpec(overrides: Partial<AgentSpec> = {}): AgentSpec {
  return {
    goal: "查询北京演示天气并计算温度加 2",
    allowedTools: ["get_weather", "calculator"],
    maxSteps: 5,
    acceptance: [
      {
        id: "weather",
        description: "天气已查询",
        requiredEvidenceTags: ["weather"]
      },
      {
        id: "calculation",
        description: "计算已执行",
        requiredEvidenceTags: ["calculation"]
      }
    ],
    ...overrides
  };
}

test("completes only after tool evidence satisfies every acceptance criterion", async () => {
  const decisions: ModelDecision[] = [
    {
      type: "tool_call",
      summary: "query weather",
      call: { id: "w", name: "get_weather", input: { city: "北京" } }
    },
    {
      type: "tool_call",
      summary: "calculate",
      call: {
        id: "c",
        name: "calculator",
        input: { operation: "add", left: 25, right: 2 }
      }
    },
    {
      type: "final",
      summary: "evidence ready",
      answer: "27°C",
      evidenceIds: ["w:e1", "c:e1"]
    }
  ];
  const agent = new MinimalAgent({ model: new ScriptedModel(decisions), tools: defaultTools });

  const result = await agent.run(createSpec(), "happy-path");

  assert.equal(result.state.status, "completed");
  assert.equal(result.answer, "27°C");
  assert.equal(result.state.observations.length, 2);
  assert.equal(result.state.evidence.length, 2);
  assert.equal(result.state.step, 3);
});

test("rejects an unknown tool and lets the next model step recover", async () => {
  const decisions: ModelDecision[] = [
    {
      type: "tool_call",
      summary: "hallucinated tool",
      call: { id: "bad", name: "browse_weather", input: { city: "北京" } }
    },
    {
      type: "tool_call",
      summary: "use an allowed tool",
      call: { id: "w", name: "get_weather", input: { city: "北京" } }
    },
    {
      type: "final",
      summary: "weather evidence ready",
      answer: "25°C",
      evidenceIds: ["w:e1"]
    }
  ];
  const agent = new MinimalAgent({ model: new ScriptedModel(decisions), tools: defaultTools });
  const spec = createSpec({
    acceptance: [
      { id: "weather", description: "天气已查询", requiredEvidenceTags: ["weather"] }
    ]
  });

  const result = await agent.run(spec, "guardrail-recovery");

  assert.equal(result.state.status, "completed");
  assert.equal(result.state.observations[0]?.error?.code, "tool_not_allowed");
  assert.ok(result.state.trace.some((event) => event.type === "action.rejected"));
});

test("rejects invalid tool input before execution and allows correction", async () => {
  const decisions: ModelDecision[] = [
    {
      type: "tool_call",
      summary: "invalid city type",
      call: { id: "invalid", name: "get_weather", input: { city: 42 } }
    },
    {
      type: "tool_call",
      summary: "correct city type",
      call: { id: "w", name: "get_weather", input: { city: "北京" } }
    },
    {
      type: "final",
      summary: "weather evidence ready",
      answer: "25°C",
      evidenceIds: ["w:e1"]
    }
  ];
  const agent = new MinimalAgent({ model: new ScriptedModel(decisions), tools: defaultTools });
  const spec = createSpec({
    acceptance: [
      { id: "weather", description: "天气已查询", requiredEvidenceTags: ["weather"] }
    ]
  });

  const result = await agent.run(spec, "input-recovery");

  assert.equal(result.state.status, "completed");
  assert.equal(result.state.observations[0]?.error?.code, "invalid_tool_input");
  assert.equal(result.state.observations[0]?.evidence.length, 0);
});

test("does not accept a model final answer without matching evidence", async () => {
  const decisions: ModelDecision[] = [
    {
      type: "final",
      summary: "claims completion too early",
      answer: "27°C",
      evidenceIds: []
    },
    {
      type: "blocked",
      summary: "cannot proceed",
      reason: "No evidence was collected"
    }
  ];
  const agent = new MinimalAgent({ model: new ScriptedModel(decisions), tools: defaultTools });

  const result = await agent.run(createSpec(), "unsupported-final");

  assert.equal(result.state.status, "blocked");
  assert.equal(result.answer, undefined);
  assert.ok(result.state.trace.some((event) => event.type === "completion.rejected"));
});

test("stops safely when the deterministic step budget is exhausted", async () => {
  const decisions: ModelDecision[] = [
    {
      type: "tool_call",
      summary: "query weather",
      call: { id: "w", name: "get_weather", input: { city: "北京" } }
    },
    {
      type: "final",
      summary: "would finish on a later step",
      answer: "25°C",
      evidenceIds: ["w:e1"]
    }
  ];
  const agent = new MinimalAgent({ model: new ScriptedModel(decisions), tools: defaultTools });
  const spec = createSpec({
    maxSteps: 1,
    acceptance: [
      { id: "weather", description: "天气已查询", requiredEvidenceTags: ["weather"] }
    ]
  });

  const result = await agent.run(spec, "budget-stop");

  assert.equal(result.state.status, "blocked");
  assert.match(result.state.terminationReason ?? "", /budget exhausted/i);
  assert.equal(result.state.step, 1);
});

import assert from "node:assert/strict";
import test from "node:test";

import type { ModelContext } from "../src/contracts.ts";
import { OpenAICompatibleModel } from "../src/models.ts";

const context: ModelContext = {
  goal: "test",
  acceptance: [],
  step: 1,
  remainingSteps: 1,
  tools: [],
  recentMessages: [],
  recentObservations: [],
  availableEvidence: [],
  recalledMemory: []
};

test("fromEnv supports API_KEY, BASE_URL, and LLM_MODEL", async () => {
  const names = [
    "AGENT_API_KEY",
    "AGENT_BASE_URL",
    "AGENT_MODEL",
    "API_KEY",
    "BASE_URL",
    "LLM_MODEL"
  ] as const;
  const previous = new Map(names.map((name) => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  let requestUrl = "";
  let authorization = "";

  try {
    delete process.env.AGENT_API_KEY;
    delete process.env.AGENT_BASE_URL;
    delete process.env.AGENT_MODEL;
    process.env.API_KEY = "test-key";
    process.env.BASE_URL = "https://example.test/v1/";
    process.env.LLM_MODEL = "test-model";

    globalThis.fetch = async (input, init) => {
      requestUrl = String(input);
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  type: "blocked",
                  summary: "test",
                  reason: "test complete"
                })
              }
            }
          ]
        }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const model = OpenAICompatibleModel.fromEnv();
    const decision = await model.decide(context);

    assert.equal(requestUrl, "https://example.test/v1/chat/completions");
    assert.equal(authorization, "Bearer test-key");
    assert.equal(decision.type, "blocked");
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      const value = previous.get(name);
      if (value === undefined) {
        delete process.env[name];
      } else {
        process.env[name] = value;
      }
    }
  }
});

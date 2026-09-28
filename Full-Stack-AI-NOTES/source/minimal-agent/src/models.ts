import type {
  AgentModel,
  JsonObject,
  ModelContext,
  ModelDecision
} from "./contracts.ts";

/**
 * 确定性脚本模型。
 *
 * 它不调用真实 LLM，而是按数组顺序返回预设决策。教学和单元测试中使用它，
 * 可以稳定复现 Agent Loop：工具调用、观察写回、最终答案验证。
 */
export class ScriptedModel implements AgentModel {
  private cursor = 0;
  private readonly decisions: ModelDecision[];

  constructor(decisions: ModelDecision[]) {
    this.decisions = structuredClone(decisions);
  }

  async decide(_context: ModelContext): Promise<ModelDecision> {
    // 每调用一次 decide 就消费一个预设决策，模拟模型在每一轮做出下一步动作。
    const decision = this.decisions[this.cursor++];
    if (!decision) {
      return {
        type: "blocked",
        summary: "The deterministic demo model has no next decision",
        reason: "Scripted decisions exhausted"
      };
    }
    return structuredClone(decision);
  }
}

/** OpenAI 兼容接口所需的最小配置。 */
interface OpenAICompatibleConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

/** 这里只读取 chat/completions 返回里最关键的 content 字段。 */
interface ChatCompletionResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

/** 判断 unknown 是否为普通对象，供 JSON 解析和类型收窄使用。 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** 校验模型 final 决策中的 evidenceIds。 */
function stringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

/**
 * 解析模型返回的 JSON 对象。
 *
 * 真实模型有时会把 JSON 包在 ```json 代码块里，这里做一次轻量清理；
 * 但最终仍要求内容必须是 JSON object，不能接受自由文本。
 */
function parseJsonObject(content: string): Record<string, unknown> {
  const normalized = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const parsed: unknown = JSON.parse(normalized);
  if (!isRecord(parsed)) {
    throw new Error("Model decision must be a JSON object");
  }
  return parsed;
}

/**
 * 将模型文本输出转换为 ModelDecision。
 *
 * 这是模型层的重要边界：即使真实 LLM 返回自然语言，Runtime 也只接受
 * 3 种结构化决策。解析失败会抛错，并由编排层将运行标记为 failed。
 */
function parseModelDecision(content: string): ModelDecision {
  const value = parseJsonObject(content);
  const summary = typeof value.summary === "string" ? value.summary : "";

  if (value.type === "tool_call" && isRecord(value.call)) {
    const input = isRecord(value.call.input) ? (value.call.input as JsonObject) : undefined;
    if (typeof value.call.name !== "string" || !input) {
      throw new Error("tool_call requires call.name and call.input");
    }
    return {
      type: "tool_call",
      summary,
      call: {
        id: typeof value.call.id === "string" ? value.call.id : crypto.randomUUID(),
        name: value.call.name,
        input
      }
    };
  }

  if (value.type === "final" && typeof value.answer === "string") {
    if (!stringArray(value.evidenceIds)) {
      throw new Error("final requires evidenceIds as a string array");
    }
    return { type: "final", summary, answer: value.answer, evidenceIds: value.evidenceIds };
  }

  if (value.type === "blocked" && typeof value.reason === "string") {
    return { type: "blocked", summary, reason: value.reason };
  }

  throw new Error("Unsupported model decision");
}

/**
 * 真实模型的决策协议。
 *
 * 这里明确要求模型返回 JSON Decision Envelope，而不是暴露长推理过程。
 * 工具结果、Evidence 和完成条件都由外部 Runtime 验证，模型不能自证完成。
 */
const DECISION_PROTOCOL = `
You are the decision component inside a controlled Agent runtime.
Return exactly one JSON object. Do not return markdown or hidden chain-of-thought.
Use a short, auditable summary instead of private reasoning.

Tool call:
{"type":"tool_call","summary":"why this action is useful","call":{"id":"unique-id","name":"tool-name","input":{}}}

Final candidate:
{"type":"final","summary":"why evidence is sufficient","answer":"answer","evidenceIds":["existing-evidence-id"]}

Blocked:
{"type":"blocked","summary":"why progress cannot continue","reason":"specific blocker"}

Never invent tool results or evidence IDs. A final candidate is accepted only by the external verifier.
`;

/**
 * OpenAI Compatible 模型适配器。
 *
 * 它把 ModelContext 发送给兼容 /chat/completions 的模型服务，并把返回内容
 * 解析为 ModelDecision。这样 MinimalAgent 不关心背后是真实模型还是脚本模型。
 */
export class OpenAICompatibleModel implements AgentModel {
  private readonly config: OpenAICompatibleConfig;

  constructor(config: OpenAICompatibleConfig) {
    // 去掉 baseUrl 末尾斜杠，避免拼接 /chat/completions 时出现双斜杠。
    this.config = { ...config, baseUrl: config.baseUrl.replace(/\/$/, "") };
  }

  /**
   * 从环境变量创建模型。
   *
   * AGENT_* 是项目专用变量，优先级高于全局变量，方便同一机器上多个 demo
   * 使用不同模型配置。
   */
  static fromEnv(): OpenAICompatibleModel {
    const apiKey = process.env.AGENT_API_KEY ?? process.env.API_KEY;
    const baseUrl = process.env.AGENT_BASE_URL ?? process.env.BASE_URL;
    const model = process.env.AGENT_MODEL ?? process.env.LLM_MODEL;
    if (!apiKey || !baseUrl || !model) {
      throw new Error(
        "Model environment is incomplete. Set AGENT_API_KEY / AGENT_BASE_URL / AGENT_MODEL " +
          "or API_KEY / BASE_URL / LLM_MODEL"
      );
    }
    return new OpenAICompatibleModel({ apiKey, baseUrl, model });
  }

  /**
   * 请求真实模型做一轮决策。
   *
   * 注意：这里发送的是已经裁剪好的 ModelContext，不是完整 AgentState。
   * 模型只能基于上下文层给出的信息做局部决策。
   */
  async decide(context: ModelContext): Promise<ModelDecision> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      signal: AbortSignal.timeout(60_000),
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify({
        model: this.config.model,
        temperature: 0.1,
        messages: [
          { role: "system", content: DECISION_PROTOCOL },
          { role: "user", content: JSON.stringify(context) }
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Model request failed: ${response.status} ${await response.text()}`);
    }

    const data = (await response.json()) as ChatCompletionResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("Model returned no content");
    }
    return parseModelDecision(content);
  }
}

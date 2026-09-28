import type {
  AgentSpec,
  AgentState,
  Evidence,
  JsonObject,
  Message,
  Observation,
  TraceEventType
} from "./contracts.ts";

/**
 * 创建一次运行的初始状态。
 *
 * 这里做了两件事：
 * 1. 校验任务最基本的约束，避免空目标或无效步数进入主循环；
 * 2. 把用户目标写入 messages，作为第一条上下文消息。
 */
export function createInitialState(
  spec: AgentSpec,
  runId: string = crypto.randomUUID()
): AgentState {
  if (!spec.goal.trim()) {
    throw new Error("Agent goal cannot be empty");
  }

  if (!Number.isInteger(spec.maxSteps) || spec.maxSteps <= 0) {
    throw new Error("maxSteps must be a positive integer");
  }

  return {
    runId,
    spec: structuredClone(spec),
    status: "running",
    step: 0,
    messages: [{ role: "user", content: spec.goal }],
    observations: [],
    evidence: [],
    trace: []
  };
}

/** 将一条消息追加到对话历史中，供后续 ContextBuilder 裁剪进模型上下文。 */
export function appendMessage(state: AgentState, message: Message): void {
  state.messages.push(message);
}

/**
 * 写入工具观察结果。
 *
 * 工具 Observation 会同时进入 observations、evidence 和 messages：
 * - observations 保存结构化工具结果；
 * - evidence 作为最终完成验证的证据池；
 * - messages 让下一轮模型能看到工具返回了什么。
 */
export function appendObservation(state: AgentState, observation: Observation): void {
  state.observations.push(observation);
  state.evidence.push(...observation.evidence);
  appendMessage(state, {
    role: "tool",
    toolCallId: observation.toolCallId,
    content: JSON.stringify(observation)
  });
}

/**
 * 追加可审计 Trace。
 *
 * Trace 不直接参与模型决策，主要用于调试、复盘和教学展示：
 * 你可以看到每一步是否构造了上下文、模型做了什么决定、工具是否执行成功。
 */
export function appendTrace(
  state: AgentState,
  type: TraceEventType,
  detail: JsonObject
): void {
  state.trace.push({
    sequence: state.trace.length + 1,
    step: state.step,
    type,
    detail
  });
}

/**
 * 标记任务完成。
 *
 * 只有反馈与控制层验证最终答案引用了足够 Evidence 后，才应该调用这个函数。
 * 模型层不能直接把状态改为 completed。
 */
export function completeState(state: AgentState, answer: string, evidence: Evidence[]): void {
  state.status = "completed";
  state.finalAnswer = answer;
  state.terminationReason = "All acceptance criteria have verified evidence";
  appendTrace(state, "run.completed", {
    evidenceIds: evidence.map((item) => item.id),
    answer
  });
}

/** 标记任务被阻塞。阻塞表示当前信息或能力不足，需要外部介入或改变条件。 */
export function blockState(state: AgentState, reason: string): void {
  state.status = "blocked";
  state.terminationReason = reason;
  appendTrace(state, "run.blocked", { reason });
}

/** 标记任务失败。失败通常表示运行时异常，而不是正常的工具失败或验收未通过。 */
export function failState(state: AgentState, reason: string): void {
  state.status = "failed";
  state.terminationReason = reason;
  appendTrace(state, "run.failed", { reason });
}

/**
 * 全项目的「协议层」。
 *
 * 这个文件只定义数据结构，不包含运行逻辑。它的作用类似 Agent Runtime
 * 内部各层之间的公共语言：模型层返回 ModelDecision，执行层返回
 * Observation，反馈与控制层检查 Evidence，编排层用 AgentState 串起所有信息。
 */
export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export interface JsonObject {
  [key: string]: JsonValue;
}

/** Agent 运行状态。 */
export type AgentStatus = "running" | "completed" | "blocked" | "failed";

/** 对话消息角色。这里的 tool 不是用户可见回复，而是工具执行结果写入上下文。 */
export type MessageRole = "system" | "user" | "assistant" | "tool";

/** 写入上下文窗口的消息。 */
export interface Message {
  role: MessageRole;
  content: string;
  toolCallId?: string;
}

/**
 * 验收条件。
 *
 * requiredEvidenceTags 是本项目的关键教学点：最终答案不能只靠模型自称完成，
 * 必须引用带有指定标签的 Evidence，反馈与控制层才会接受完成。
 */
export interface AcceptanceCriterion {
  id: string;
  description: string;
  requiredEvidenceTags: string[];
}

/**
 * 一次 Agent 运行的任务说明。
 *
 * goal 描述用户目标；allowedTools 是执行层白名单；maxSteps 是防无限循环预算；
 * acceptance 则给反馈与控制层提供可验证的完成条件。
 */
export interface AgentSpec {
  goal: string;
  acceptance: AcceptanceCriterion[];
  allowedTools: string[];
  maxSteps: number;
}

/** 模型请求执行某个工具时产生的结构化动作。 */
export interface ToolCall {
  id: string;
  name: string;
  input: JsonObject;
}

/**
 * 模型层每一轮只能做 3 类决定：
 *
 * - tool_call：请求执行一个工具；
 * - final：提交最终答案候选，但是否完成由控制层验证；
 * - blocked：说明已经无法继续推进。
 *
 * 这个联合类型把模型输出约束成可审计的决策，而不是让模型输出任意自然语言。
 */
export type ModelDecision =
  | {
      type: "tool_call";
      summary: string;
      call: ToolCall;
    }
  | {
      type: "final";
      summary: string;
      answer: string;
      evidenceIds: string[];
    }
  | {
      type: "blocked";
      summary: string;
      reason: string;
    };

/** 工具执行时生成的证据草稿，尚未拥有全局唯一 ID。 */
export interface EvidenceDraft {
  description: string;
  source: string;
  tags: string[];
}

/** 带 ID 的证据。最终答案必须引用这些证据 ID 才能通过验证。 */
export interface Evidence extends EvidenceDraft {
  id: string;
}

/** Agent Runtime 内部统一使用的错误结构。 */
export interface AgentError {
  code: string;
  message: string;
  retryable: boolean;
}

/** 工具原始执行结果。执行层会把它转换成 Observation 写入状态。 */
export interface ToolExecutionResult {
  ok: boolean;
  output: JsonValue;
  evidence?: EvidenceDraft[];
  error?: AgentError;
}

/**
 * 一次工具调用的观察结果。
 *
 * ReAct 循环中的 Observe 就对应这个结构：工具输出、成功状态、错误和证据
 * 都会被写回 AgentState，下一轮模型只能基于这些观察继续决策。
 */
export interface Observation {
  id: string;
  toolCallId: string;
  toolName: string;
  ok: boolean;
  output: JsonValue;
  evidence: Evidence[];
  error?: AgentError;
}

/** Trace 事件类型，用于观察编排层每一步发生了什么。 */
export type TraceEventType =
  | "run.started"
  | "context.built"
  | "model.decided"
  | "action.rejected"
  | "tool.executed"
  | "completion.rejected"
  | "run.completed"
  | "run.blocked"
  | "run.failed";

/** 可审计轨迹事件。每个事件都记录在第几步发生，以及当时的关键细节。 */
export interface TraceEvent {
  sequence: number;
  step: number;
  type: TraceEventType;
  detail: JsonObject;
}

/**
 * Agent 的完整运行状态。
 *
 * 这是编排层的核心数据结构。它保存目标、步骤、消息、观察、证据和 Trace。
 * CheckpointStore 保存的也是这个状态，因此 Agent 可以暂停后 resume。
 */
export interface AgentState {
  runId: string;
  spec: AgentSpec;
  status: AgentStatus;
  step: number;
  messages: Message[];
  observations: Observation[];
  evidence: Evidence[];
  trace: TraceEvent[];
  finalAnswer?: string;
  terminationReason?: string;
}

/**
 * 暴露给模型看的工具说明。
 *
 * 注意这里不包含 execute 函数，只包含名称、描述、Schema 和风险信息。
 * 这样模型知道「可以请求什么」，但不能绕过编排层直接执行工具。
 */
export interface ToolDescriptor {
  name: string;
  description: string;
  inputSchema: JsonObject;
  risk: "read" | "write" | "external";
  approval: "never" | "always";
}

/** 长期记忆条目。示例项目用内存实现，生产系统可以替换为数据库或向量检索。 */
export interface MemoryItem {
  id: string;
  content: string;
  tags: string[];
}

/**
 * 每轮传给模型的上下文。
 *
 * ContextBuilder 会从 AgentState 中裁剪最近消息、最近观察和可用证据，
 * 再加上工具说明和召回记忆。模型层只根据这个快照做下一步决策。
 */
export interface ModelContext {
  goal: string;
  acceptance: AcceptanceCriterion[];
  step: number;
  remainingSteps: number;
  tools: ToolDescriptor[];
  recentMessages: Message[];
  recentObservations: Observation[];
  availableEvidence: Evidence[];
  recalledMemory: MemoryItem[];
}

/** 模型层统一接口。脚本模型和真实 API 模型都实现这个接口。 */
export interface AgentModel {
  decide(context: ModelContext): Promise<ModelDecision>;
}

/** 控制层返回的通用验证结果。 */
export interface ValidationResult {
  ok: boolean;
  issues: string[];
}

/** Agent 运行结束时返回给调用方的结果。 */
export interface AgentRunResult {
  state: AgentState;
  answer?: string;
}

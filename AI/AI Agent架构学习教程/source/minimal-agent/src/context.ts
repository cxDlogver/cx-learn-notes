import type {
  AgentState,
  MemoryItem,
  ModelContext,
  ToolDescriptor
} from "./contracts.ts";

/**
 * 上下文裁剪参数。
 *
 * AgentState 可以不断增长，但模型上下文窗口有限。因此上下文层需要控制
 * 最近消息、最近工具观察和可用证据的数量，避免把所有历史都塞给模型。
 */
export interface ContextBuilderOptions {
  maxMessages: number;
  maxObservations: number;
  maxEvidence: number;
}

const DEFAULT_OPTIONS: ContextBuilderOptions = {
  maxMessages: 8,
  maxObservations: 6,
  maxEvidence: 20
};

/**
 * 上下文层的最小实现。
 *
 * 它不负责执行工具，也不负责做决策，只负责把当前 AgentState、可用工具说明
 * 和长期记忆整理成 ModelContext。模型每一轮看到的「现实版本」就来自这里。
 */
export class ContextBuilder {
  private readonly options: ContextBuilderOptions;

  constructor(options: Partial<ContextBuilderOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * 构造当前轮模型上下文。
   *
   * 这里使用 structuredClone 是为了避免模型实现或后续逻辑意外修改原始状态。
   * 示例中只做简单的尾部裁剪；生产系统通常还会加入语义检索、摘要压缩和优先级排序。
   */
  build(
    state: AgentState,
    tools: ToolDescriptor[],
    recalledMemory: MemoryItem[]
  ): ModelContext {
    return {
      goal: state.spec.goal,
      acceptance: structuredClone(state.spec.acceptance),
      step: state.step,
      remainingSteps: Math.max(0, state.spec.maxSteps - state.step),
      tools: structuredClone(tools),
      recentMessages: structuredClone(state.messages.slice(-this.options.maxMessages)),
      recentObservations: structuredClone(
        state.observations.slice(-this.options.maxObservations)
      ),
      availableEvidence: structuredClone(state.evidence.slice(-this.options.maxEvidence)),
      recalledMemory: structuredClone(recalledMemory)
    };
  }
}

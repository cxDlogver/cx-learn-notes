import { ContextBuilder } from "./context.ts";
import { ControlLayer, rejectedActionObservation } from "./control.ts";
import type {
  AgentModel,
  AgentRunResult,
  AgentSpec,
  AgentState,
  JsonObject,
  ModelDecision
} from "./contracts.ts";
import {
  EmptyMemoryStore,
  InMemoryCheckpointStore,
  type CheckpointStore,
  type LongTermMemoryStore
} from "./memory.ts";
import {
  appendMessage,
  appendObservation,
  appendTrace,
  blockState,
  completeState,
  createInitialState,
  failState
} from "./state.ts";
import { executeTool, ToolRegistry, type Tool } from "./tools.ts";

/**
 * Agent 运行所需的可替换组件。
 *
 * 这个项目刻意把模型、工具、上下文构造、控制层、Checkpoint 和长期记忆都做成
 * 可注入依赖，方便观察五层架构如何组合，也方便测试时替换为确定性实现。
 */
export interface AgentOptions {
  model: AgentModel;
  tools: Tool[];
  contextBuilder?: ContextBuilder;
  control?: ControlLayer;
  checkpoints?: CheckpointStore;
  longTermMemory?: LongTermMemoryStore;
  toolTimeoutMs?: number;
}

/** Trace 中不记录完整模型输出，只记录可审计摘要，避免 Trace 过大或泄露细节。 */
function decisionForTrace(decision: ModelDecision): JsonObject {
  if (decision.type === "tool_call") {
    return { type: decision.type, summary: decision.summary, tool: decision.call.name };
  }
  return { type: decision.type, summary: decision.summary };
}

/**
 * 最小 Agent Runtime。
 *
 * 它把五层串成完整闭环：
 * - 模型层：this.model.decide；
 * - 上下文层：this.contextBuilder.build；
 * - 执行层：ToolRegistry + executeTool；
 * - 编排层：drive 主循环、step、checkpoint、resume；
 * - 反馈与控制层：preflight、validateObservation、verifyCompletion。
 */
export class MinimalAgent {
  private readonly model: AgentModel;
  private readonly registry: ToolRegistry;
  private readonly contextBuilder: ContextBuilder;
  private readonly control: ControlLayer;
  private readonly checkpoints: CheckpointStore;
  private readonly longTermMemory: LongTermMemoryStore;
  private readonly toolTimeoutMs: number;

  constructor(options: AgentOptions) {
    // 构造函数只装配依赖，不启动运行。这样同一个 Runtime 可以用于 run 或 resume。
    this.model = options.model;
    this.registry = new ToolRegistry(options.tools);
    this.contextBuilder = options.contextBuilder ?? new ContextBuilder();
    this.control = options.control ?? new ControlLayer();
    this.checkpoints = options.checkpoints ?? new InMemoryCheckpointStore();
    this.longTermMemory = options.longTermMemory ?? new EmptyMemoryStore();
    this.toolTimeoutMs = options.toolTimeoutMs ?? 5_000;
  }

  /**
   * 启动一次新任务。
   *
   * run 会根据 AgentSpec 创建初始状态，写入 run.started Trace，保存第一个
   * Checkpoint，然后交给 drive 主循环推进。
   */
  async run(spec: AgentSpec, runId?: string): Promise<AgentRunResult> {
    const state = createInitialState(spec, runId);
    appendTrace(state, "run.started", { goal: spec.goal, maxSteps: spec.maxSteps });
    await this.checkpoints.save(state);
    return this.drive(state);
  }

  /**
   * 从 Checkpoint 恢复任务。
   *
   * 如果状态已经不是 running，说明任务已经完成、阻塞或失败，直接返回快照；
   * 只有 running 状态才继续进入 drive。
   */
  async resume(runId: string): Promise<AgentRunResult> {
    const state = await this.checkpoints.load(runId);
    if (!state) {
      throw new Error(`Checkpoint not found: ${runId}`);
    }
    if (state.status !== "running") {
      return { state, answer: state.finalAnswer };
    }
    return this.drive(state);
  }

  /**
   * Agent 主循环。
   *
   * 每轮流程是：
   * 1. 检查步数预算；
   * 2. 召回长期记忆并构造上下文；
   * 3. 请求模型给出结构化决策；
   * 4. 根据决策进入 blocked、final 验证或 tool_call 执行；
   * 5. 保存 Checkpoint，进入下一轮。
   */
  private async drive(state: AgentState): Promise<AgentRunResult> {
    while (state.status === "running") {
      if (state.step >= state.spec.maxSteps) {
        blockState(state, `Step budget exhausted at ${state.spec.maxSteps} steps`);
        break;
      }

      state.step += 1;
      // 长期记忆先按目标召回，再交给 ContextBuilder 组装进本轮模型上下文。
      const memory = await this.longTermMemory.recall(state.spec.goal, 3);
      const context = this.contextBuilder.build(
        state,
        this.registry.descriptors(state.spec.allowedTools),
        memory
      );
      appendTrace(state, "context.built", {
        messages: context.recentMessages.length,
        observations: context.recentObservations.length,
        memories: context.recalledMemory.length,
        remainingSteps: context.remainingSteps
      });

      let decision: ModelDecision;
      try {
        // 模型层只做决策，不直接修改状态，也不直接执行工具。
        decision = await this.model.decide(context);
      } catch (error) {
        failState(state, error instanceof Error ? error.message : String(error));
        break;
      }

      appendMessage(state, { role: "assistant", content: JSON.stringify(decision) });
      appendTrace(state, "model.decided", decisionForTrace(decision));

      if (decision.type === "blocked") {
        // 模型主动声明无法继续时，编排层将状态转为 blocked，并保存最后状态。
        blockState(state, decision.reason);
        break;
      }

      if (decision.type === "final") {
        // final 不是直接成功。控制层必须验证答案引用的 Evidence 覆盖所有验收条件。
        const { validation, evidence } = this.control.verifyCompletion(state, decision);
        if (validation.ok) {
          completeState(state, decision.answer, evidence);
          break;
        }

        appendTrace(state, "completion.rejected", { issues: validation.issues });
        appendMessage(state, {
          role: "user",
          content: `Completion validation failed: ${validation.issues.join("; ")}`
        });
        // 把拒绝原因写回上下文，下一轮模型可以补充工具调用或修正 Evidence 引用。
        await this.checkpoints.save(state);
        continue;
      }

      const tool = this.registry.get(decision.call.name);
      const preflight = await this.control.preflight(state, decision.call, tool);
      if (!preflight.ok) {
        // 被门禁拒绝的动作也记录成 Observation，保证模型能看到失败原因并自我纠偏。
        const observation = rejectedActionObservation(decision.call, preflight);
        appendObservation(state, observation);
        appendTrace(state, "action.rejected", {
          tool: decision.call.name,
          code: observation.error?.code ?? "action_rejected",
          issues: preflight.issues
        });
        await this.checkpoints.save(state);
        continue;
      }

      // 只有通过 preflight 的工具调用才会进入真实执行层。
      const observation = await executeTool(tool!, decision.call, this.toolTimeoutMs);
      appendObservation(state, observation);
      const postflight = this.control.validateObservation(observation);
      appendTrace(state, "tool.executed", {
        tool: observation.toolName,
        ok: observation.ok,
        evidenceIds: observation.evidence.map((item) => item.id),
        postflightPassed: postflight.ok
      });
      await this.checkpoints.save(state);
    }

    // 无论 completed、blocked 还是 failed，退出前都保存最终状态，便于复盘。
    await this.checkpoints.save(state);
    return { state, answer: state.finalAnswer };
  }
}

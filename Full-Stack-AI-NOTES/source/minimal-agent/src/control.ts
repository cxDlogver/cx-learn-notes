import type {
  AgentState,
  Evidence,
  ModelDecision,
  Observation,
  ToolCall,
  ValidationResult
} from "./contracts.ts";
import type { Tool } from "./tools.ts";

/**
 * 审批请求。
 *
 * 当工具声明 approval: "always" 时，控制层会把这份请求交给外部审批函数。
 * 示例项目没有真实人机交互，因此默认没有审批函数时一律拒绝。
 */
export interface ApprovalRequest {
  runId: string;
  tool: string;
  input: ToolCall["input"];
}

export type ApprovalHandler = (request: ApprovalRequest) => Promise<boolean>;

/** 工具执行前检查结果。code 用于生成更明确的失败 Observation。 */
export interface PreflightResult extends ValidationResult {
  code?: string;
}

/**
 * 反馈与控制层的最小实现。
 *
 * 它负责 3 类事情：
 * 1. preflight：工具执行前做白名单、注册、参数和审批检查；
 * 2. validateObservation：工具执行后确认结果是否成功；
 * 3. verifyCompletion：最终答案提交后，用 Evidence 覆盖验收条件。
 */
export class ControlLayer {
  private readonly approvalHandler?: ApprovalHandler;

  constructor(approvalHandler?: ApprovalHandler) {
    this.approvalHandler = approvalHandler;
  }

  /**
   * 工具执行前门禁。
   *
   * 模型只能「请求」工具调用，不能直接执行。所有请求都必须先经过这里，
   * 这样可以防止模型调用未授权工具、传错参数，或绕过高风险操作审批。
   */
  async preflight(state: AgentState, call: ToolCall, tool?: Tool): Promise<PreflightResult> {
    if (!state.spec.allowedTools.includes(call.name)) {
      return { ok: false, code: "tool_not_allowed", issues: [`Tool ${call.name} is not allowed`] };
    }

    if (!tool) {
      return { ok: false, code: "unknown_tool", issues: [`Tool ${call.name} is not registered`] };
    }

    const inputCheck = tool.validate(call.input);
    if (!inputCheck.ok) {
      return { ok: false, code: "invalid_tool_input", issues: inputCheck.issues };
    }

    if (tool.approval === "always") {
      const approved = this.approvalHandler
        ? await this.approvalHandler({ runId: state.runId, tool: call.name, input: call.input })
        : false;
      if (!approved) {
        // 没有审批处理器时默认拒绝，避免高风险工具在无人确认时被执行。
        return { ok: false, code: "approval_required", issues: ["Tool call was not approved"] };
      }
    }

    return { ok: true, issues: [] };
  }

  /**
   * 工具执行后检查。
   *
   * 这个示例只检查 ok 标志；真实系统可以在这里加入输出 Schema 校验、
   * 敏感信息扫描、业务规则检查或重试决策。
   */
  validateObservation(observation: Observation): ValidationResult {
    if (!observation.ok) {
      return {
        ok: false,
        issues: [observation.error?.message ?? "Tool returned an unsuccessful result"]
      };
    }

    return { ok: true, issues: [] };
  }

  /**
   * 最终答案验证。
   *
   * 模型提交 final 只是「候选答案」，不能直接完成任务。控制层会检查：
   * - 答案是否为空；
   * - 引用的 Evidence ID 是否真实存在；
   * - 每条验收条件要求的 Evidence tag 是否都被覆盖。
   */
  verifyCompletion(
    state: AgentState,
    decision: Extract<ModelDecision, { type: "final" }>
  ): { validation: ValidationResult; evidence: Evidence[] } {
    const evidence = decision.evidenceIds
      .map((id) => state.evidence.find((item) => item.id === id))
      .filter((item): item is Evidence => Boolean(item));
    const issues: string[] = [];

    if (!decision.answer.trim()) {
      issues.push("Final answer is empty");
    }

    if (evidence.length !== decision.evidenceIds.length) {
      issues.push("Final answer references missing evidence IDs");
    }

    for (const criterion of state.spec.acceptance) {
      const selectedTags = new Set(evidence.flatMap((item) => item.tags));
      const missingTags = criterion.requiredEvidenceTags.filter((tag) => !selectedTags.has(tag));
      if (missingTags.length > 0) {
        issues.push(
          `${criterion.id} is not proven; missing evidence tags: ${missingTags.join(", ")}`
        );
      }
    }

    return { validation: { ok: issues.length === 0, issues }, evidence };
  }
}

/**
 * 把 preflight 拒绝结果转换成 Observation。
 *
 * 这很关键：即使动作被拒绝，也会写回状态，下一轮模型可以看到失败原因，
 * 并据此修正工具名、参数或选择阻塞退出。
 */
export function rejectedActionObservation(
  call: ToolCall,
  result: PreflightResult
): Observation {
  return {
    id: `${call.id}:observation`,
    toolCallId: call.id,
    toolName: call.name,
    ok: false,
    output: null,
    evidence: [],
    error: {
      code: result.code ?? "action_rejected",
      message: result.issues.join("; "),
      retryable: result.code === "invalid_tool_input" || result.code === "unknown_tool"
    }
  };
}

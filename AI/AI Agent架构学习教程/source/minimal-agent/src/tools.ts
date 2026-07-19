import type {
  AgentError,
  Evidence,
  JsonObject,
  Observation,
  ToolCall,
  ToolDescriptor,
  ToolExecutionResult,
  ValidationResult
} from "./contracts.ts";

/**
 * 执行层工具接口。
 *
 * ToolDescriptor 是给模型看的说明；Tool 在此基础上增加 validate 和 execute。
 * 这样模型只能看到工具能力和参数 Schema，真正的参数校验和执行由 Runtime 控制。
 */
export interface Tool extends ToolDescriptor {
  validate(input: JsonObject): ValidationResult;
  execute(input: JsonObject): Promise<ToolExecutionResult>;
}

/**
 * 工具注册表。
 *
 * 编排层通过它根据模型请求找到真实工具；上下文层也通过它拿到可暴露给模型的
 * ToolDescriptor。注册表会拒绝重名工具，避免模型请求时出现歧义。
 */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: Tool[]) {
    for (const tool of tools) {
      if (this.tools.has(tool.name)) {
        throw new Error(`Duplicate tool: ${tool.name}`);
      }
      this.tools.set(tool.name, tool);
    }
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * 返回允许暴露给模型的工具描述。
   *
   * 注意这里按 spec.allowedTools 过滤。即使系统注册了很多工具，单次任务也只会
   * 暴露白名单中的工具，降低误调用和越权风险。
   */
  descriptors(allowedTools: string[]): ToolDescriptor[] {
    return allowedTools
      .map((name) => this.tools.get(name))
      .filter((tool): tool is Tool => Boolean(tool))
      .map(({ name, description, inputSchema, risk, approval }) => ({
        name,
        description,
        inputSchema: structuredClone(inputSchema),
        risk,
        approval
      }));
  }
}

/** 统一生成工具超时错误，便于控制层和 Trace 判断是否可重试。 */
function timeoutError(timeoutMs: number): AgentError {
  return {
    code: "tool_timeout",
    message: `Tool execution exceeded ${timeoutMs}ms`,
    retryable: true
  };
}

/**
 * 执行一次工具调用，并把工具结果转换成 Observation。
 *
 * 这里对应 ReAct 中的 Act → Observe：
 * - Act：执行 tool.execute；
 * - Observe：将 output、error、evidence 统一包装成 Observation；
 * - Timeout：用 Promise.race 防止工具长期占住 Agent 主循环。
 */
export async function executeTool(
  tool: Tool,
  call: ToolCall,
  timeoutMs: number
): Promise<Observation> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeout = new Promise<ToolExecutionResult>((resolve) => {
      timer = setTimeout(() => {
        resolve({ ok: false, output: null, error: timeoutError(timeoutMs) });
      }, timeoutMs);
    });

    const result = await Promise.race([tool.execute(call.input), timeout]);
    const evidence: Evidence[] = (result.evidence ?? []).map((item, index) => ({
      // Evidence ID 和 ToolCall ID 绑定，最终答案可以稳定引用它。
      id: `${call.id}:e${index + 1}`,
      ...item
    }));

    return {
      id: `${call.id}:observation`,
      toolCallId: call.id,
      toolName: call.name,
      ok: result.ok,
      output: result.output,
      evidence,
      error: result.error
    };
  } catch (error) {
    // 工具抛异常也会转为 Observation，而不是让整个进程直接崩溃。
    return {
      id: `${call.id}:observation`,
      toolCallId: call.id,
      toolName: call.name,
      ok: false,
      output: null,
      evidence: [],
      error: {
        code: "tool_exception",
        message: error instanceof Error ? error.message : String(error),
        retryable: false
      }
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

/** 离线天气数据。示例工具不访问网络，保证 demo 和测试稳定可重复。 */
const weatherData: Record<string, { condition: string; temperatureC: number }> = {
  北京: { condition: "晴", temperatureC: 25 },
  上海: { condition: "多云", temperatureC: 28 },
  广州: { condition: "小雨", temperatureC: 22 }
};

/** 支持英文城市别名，方便模型用英文参数也能命中演示数据。 */
const cityAliases: Record<string, string> = {
  beijing: "北京",
  shanghai: "上海",
  guangzhou: "广州"
};

/**
 * 天气工具：演示「读取外部事实」。
 *
 * 在真实 Agent 中，这类工具可能是 HTTP API、数据库查询或浏览器读取。
 * 这里使用离线数据，是为了突出工具契约、Observation 和 Evidence 的流程。
 */
export const weatherTool: Tool = {
  name: "get_weather",
  description: "查询演示数据集中指定城市的天气；这是离线示例，不代表实时天气。",
  inputSchema: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"]
  },
  risk: "read",
  approval: "never",
  validate(input) {
    // validate 只检查参数形状，不做真实查询；真实查询留给 execute。
    return typeof input.city === "string" && input.city.trim().length > 0
      ? { ok: true, issues: [] }
      : { ok: false, issues: ["city must be a non-empty string"] };
  },
  async execute(input) {
    const requestedCity = String(input.city).trim();
    const city = cityAliases[requestedCity.toLowerCase()] ?? requestedCity;
    const weather = weatherData[city];

    if (!weather) {
      return {
        ok: false,
        output: null,
        error: {
          code: "weather_not_found",
          message: `No demo weather data for ${city}`,
          retryable: false
        }
      };
    }

    return {
      ok: true,
      output: { city, ...weather },
      // Evidence 是最终验收的依据。没有证据，即使 output 正确也不能证明任务完成。
      evidence: [
        {
          description: `${city}演示天气为${weather.condition}，${weather.temperatureC}°C`,
          source: `demo://weather/${encodeURIComponent(city)}`,
          tags: ["weather", `weather:${city}`]
        }
      ]
    };
  }
};

/** 计算器支持的操作白名单，避免执行任意表达式或代码。 */
const operations = ["add", "subtract", "multiply", "divide"];

/**
 * 计算器工具：演示「确定性工具」。
 *
 * 模型可以决定何时计算、用什么参数计算；但真正的数学运算由工具完成，
 * 并通过 Evidence 证明计算结果来自执行层，而不是模型自由生成。
 */
export const calculatorTool: Tool = {
  name: "calculator",
  description: "对两个有限数字执行加、减、乘、除；不执行任意代码或表达式。",
  inputSchema: {
    type: "object",
    properties: {
      operation: { type: "string", enum: operations },
      left: { type: "number" },
      right: { type: "number" }
    },
    required: ["operation", "left", "right"]
  },
  risk: "read",
  approval: "never",
  validate(input) {
    const issues: string[] = [];
    // 参数校验集中在工具内部，控制层 preflight 会在执行前调用它。
    if (typeof input.operation !== "string" || !operations.includes(input.operation)) {
      issues.push("operation must be add, subtract, multiply, or divide");
    }
    if (typeof input.left !== "number" || !Number.isFinite(input.left)) {
      issues.push("left must be a finite number");
    }
    if (typeof input.right !== "number" || !Number.isFinite(input.right)) {
      issues.push("right must be a finite number");
    }
    return { ok: issues.length === 0, issues };
  },
  async execute(input) {
    const operation = String(input.operation);
    const left = Number(input.left);
    const right = Number(input.right);

    if (operation === "divide" && right === 0) {
      // 业务错误返回 ok=false，而不是抛异常；这能让模型在下一轮看到失败原因。
      return {
        ok: false,
        output: null,
        error: { code: "division_by_zero", message: "Cannot divide by zero", retryable: false }
      };
    }

    const resultByOperation: Record<string, number> = {
      add: left + right,
      subtract: left - right,
      multiply: left * right,
      divide: left / right
    };
    const result = resultByOperation[operation];

    return {
      ok: true,
      output: { operation, left, right, result },
      evidence: [
        {
          description: `${operation}(${left}, ${right}) = ${result}`,
          source: `tool://calculator/${operation}`,
          tags: ["calculation"]
        }
      ]
    };
  }
};

/** 默认工具集。入口文件和测试会直接使用这组教学工具。 */
export const defaultTools = [weatherTool, calculatorTool];

# Five-layer Minimal Agent

这是第 07 章的配套 TypeScript 项目。它不依赖 Agent 框架或第三方包，用最少的工程对象演示一个可控制、可验证的 ReAct Agent。

### 【运行要求】

Node.js 22.18 或更高版本。项目使用 Node 原生的 TypeScript 类型擦除能力，因此运行时不需要安装依赖；类型擦除不会代替静态类型检查。

```bash
npm run demo
npm test
```

演示使用确定性的 `ScriptedModel`，不会访问网络，也不需要 API Key。它依次查询离线天气工具、调用安全计算器，再提交带证据引用的最终答案。

真实模型联调使用当前项目目录下的 `.env`：

```bash
npm run demo:api
```

该命令通过 Node.js `--env-file=.env` 加载环境变量。本机模型服务使用系统信任链，因此脚本还通过 `NODE_EXTRA_CA_CERTS=/etc/ssl/cert.pem` 加载系统证书包；TLS 校验仍然保持开启。

### 【五层与代码的对应关系】

| 架构职责 | 代码 | 作用 |
| --- | --- | --- |
| 模型层 | `src/models.ts` | 产生结构化 Tool Call、Final Candidate 或 Blocked |
| 上下文层 | `src/context.ts`、`src/memory.ts` | 从 State、工具说明和 Memory 中选择本轮信息 |
| 执行层 | `src/tools.ts` | 定义工具契约、参数校验、超时、执行与 Observation |
| 编排层 | `src/agent.ts`、`src/state.ts` | 维护 State，运行循环，保存 Checkpoint，决定继续或结束 |
| 反馈与控制层 | `src/control.ts` | 执行前门禁、执行后检查和证据化完成验证 |
| 共享协议 | `src/contracts.ts` | 定义 State、Context、Decision、Observation、Evidence 等接口 |

### 【核心闭环】

```text
Spec → State → Context → Model Decision
                    ├─ Tool Call → Preflight → Tool → Observation → State
                    ├─ Final Candidate → Completion Verification → Complete / Continue
                    └─ Blocked → Save Checkpoint → Stop
```

模型不能直接执行工具，也不能直接把 State 改成 `completed`。工具调用先经过白名单、Schema 和审批门禁；模型提交的最终答案还必须引用能覆盖全部验收条件的 Evidence。

### 【接入真实模型】

`src/models.ts` 还提供 `OpenAICompatibleModel`，[`src/api-main.ts`](src/api-main.ts) 用它运行完整的真实 API Agent Loop。

项目支持两组环境变量。Agent 专用变量优先级更高：

| 配置 | Agent 专用变量 | 根目录全局变量 |
| --- | --- | --- |
| API Key | `AGENT_API_KEY` | `API_KEY` |
| Base URL | `AGENT_BASE_URL` | `BASE_URL` |
| Model | `AGENT_MODEL` | `LLM_MODEL` |

也可以在自己的入口中显式设置 Agent 专用变量：

```bash
export AGENT_API_KEY="..."
export AGENT_BASE_URL="https://example.com/v1"
export AGENT_MODEL="model-name"
```

```ts
const model = OpenAICompatibleModel.fromEnv();
```

示例使用 JSON Decision Envelope，而不是解析自由文本中的“思考/行动”。真实模型只返回简短决策摘要，不要求暴露私有推理过程；运行时仍会独立校验工具、参数、Evidence 和停止条件。

### 【这个最小版本没有做什么】

它没有实现数据库 Checkpoint、向量检索、流式输出、并行工具、分布式锁、幂等副作用、沙箱和真实人工审批。这些是从教学内核走向生产 Harness 时需要逐步替换或补充的能力，而不是继续向一个 `while` 循环里堆条件。

/**
 * AI Coding Workflow - TypeScript 示例
 *
 * Workflow:
 *
 *   Requirement Analysis
 *          ↓
 *       Planning
 *          ↓
 *    Implementation
 *          ↓
 *       Testing
 *
 *
 * 整个系统分成三层状态：
 *
 * 1. Agent Context
 *    当前阶段内部的短期上下文。
 *    例如 Coding Agent：
 *      - 刚刚读了什么文件
 *      - Tool 返回了什么
 *      - 当前修改到哪里
 *
 * 2. Structured Artifact
 *    每个阶段完成以后沉淀的稳定结果。
 *    例如：
 *      requirement.json
 *      plan.json
 *      implementation.json
 *      test-result.json
 *
 * 3. WorkflowState / Checkpoint
 *    整个长任务的真实执行状态：
 *      - 当前执行到哪个阶段
 *      - 哪些阶段已经完成
 *      - Artifact 在哪里
 *      - Retry 多少次
 *
 *
 * 核心原则：
 *
 * Agent 负责：
 *   “当前阶段怎么完成”
 *
 * Workflow Runtime 负责：
 *   “整个需求交付任务怎么推进”
 */

import {
  Agent,
  MemorySession,
  RunContext,
  run,
  tool,
} from '@openai/agents';

import { z } from 'zod';

import {
  mkdir,
  readFile,
  writeFile,
  rename,
} from 'node:fs/promises';

import path from 'node:path';


// ============================================================
// 1. 定义各阶段的 Structured Artifact
// ============================================================
//
// TypeScript Agents SDK 可以通过 Agent.outputType 指定 Zod Schema。
//
// SDK 会要求模型返回符合该 Schema 的 Structured Output。
//
// 因此：
//
// Requirement Agent
//      ↓
// RequirementArtifact
//      ↓
// Planning Agent
//
// 每个 Workflow Node 都可以形成明确的输出契约。
// ============================================================


const RequirementArtifactSchema = z.object({
  summary: z.string(),

  requirements: z.array(
    z.string()
  ),

  constraints: z.array(
    z.string()
  ),

  acceptanceCriteria: z.array(
    z.string()
  ),
});

type RequirementArtifact =
  z.infer<typeof RequirementArtifactSchema>;


const PlanTaskSchema = z.object({
  id: z.string(),

  description: z.string(),

  expectedFiles: z.array(
    z.string()
  ),

  acceptanceCriteria: z.array(
    z.string()
  ),
});


const PlanArtifactSchema = z.object({
  summary: z.string(),

  tasks: z.array(
    PlanTaskSchema
  ),

  risks: z.array(
    z.string()
  ),
});

type PlanArtifact =
  z.infer<typeof PlanArtifactSchema>;


const ImplementationArtifactSchema = z.object({
  summary: z.string(),

  changedFiles: z.array(
    z.string()
  ),

  completedTasks: z.array(
    z.string()
  ),

  remainingIssues: z.array(
    z.string()
  ),
});

type ImplementationArtifact =
  z.infer<typeof ImplementationArtifactSchema>;


const TestArtifactSchema = z.object({
  passed: z.boolean(),

  summary: z.string(),

  passedCases: z.array(
    z.string()
  ),

  failedCases: z.array(
    z.string()
  ),

  evidence: z.array(
    z.string()
  ),
});

type TestArtifact =
  z.infer<typeof TestArtifactSchema>;


// ============================================================
// 2. 定义 Workflow Runtime 自己维护的状态
// ============================================================
//
// 这份状态不是模型 Context。
//
// 它是 Workflow Runtime 的真实状态。
//
// Runtime 依赖它判断：
//
// currentStage 是什么？
// 哪些阶段已经完成？
// Artifact 保存在哪里？
// 当前阶段失败几次？
//
// 即使 Agent Session 被清空，
// WorkflowState 仍然应该存在。
// ============================================================


type StageName =
  | 'requirement'
  | 'planning'
  | 'implementation'
  | 'testing';


type StageStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed';


interface WorkflowState {
  /**
   * 一次完整需求交付任务的唯一 ID。
   *
   * Runtime 重启时，只要拿着相同 runId，
   * 就可以读取之前保存的 Checkpoint。
   */
  runId: string;

  /**
   * 用户最原始的需求。
   */
  originalRequirement: string;

  /**
   * 当前应该执行哪个阶段。
   */
  currentStage: StageName;

  /**
   * 整个 Workflow 的状态。
   */
  status:
    | 'running'
    | 'completed'
    | 'failed';

  /**
   * 每个阶段自己的状态。
   */
  stageStatus: Record<
    StageName,
    StageStatus
  >;

  /**
   * 已经生成的 Artifact 文件地址。
   *
   * 例如：
   *
   * {
   *   requirement: "./artifacts/run001/requirement.json",
   *   planning: "./artifacts/run001/planning.json"
   * }
   */
  artifacts: Partial<
    Record<
      StageName,
      string
    >
  >;

  /**
   * 每个阶段的重试次数。
   */
  retryCount: Partial<
    Record<
      StageName,
      number
    >
  >;
}


// ============================================================
// 3. 定义 OpenAI Agents SDK 的 Local Context
// ============================================================
//
// OpenAI TypeScript Agents SDK 明确区分两种 Context：
//
// 1. Local Context
//    程序代码、Tool、Hook 可以访问。
//    不会自动发给 LLM。
//
// 2. LLM-visible Context
//    真正传给模型的消息和历史。
//
// 所以 WorkflowState、Workspace、Logger 等
// 非常适合放在 Local Context。
// ============================================================


interface AppContext {
  /**
   * Workflow Runtime 的真实状态。
   */
  state: WorkflowState;

  /**
   * Coding Agent 操作的代码仓库。
   */
  workspace: string;

  /**
   * Artifact 存储目录。
   */
  artifactDir: string;
}


// ============================================================
// 4. 文件目录
// ============================================================


const ROOT_DIR =
  path.resolve('.ai-workflow');

const STATE_DIR =
  path.join(
    ROOT_DIR,
    'states',
  );

const ARTIFACT_DIR =
  path.join(
    ROOT_DIR,
    'artifacts',
  );


async function ensureDirectories() {
  await mkdir(
    STATE_DIR,
    {
      recursive: true,
    },
  );

  await mkdir(
    ARTIFACT_DIR,
    {
      recursive: true,
    },
  );
}


// ============================================================
// 5. Workflow Checkpoint
// ============================================================
//
// Checkpoint 解决的问题是：
//
// “整个 Workflow 当前执行到哪里？”
//
// 例如：
//
// requirement     completed
// planning        completed
// implementation completed
// testing         running
//
// 如果 Runtime 此时崩溃，
// 下次启动可以直接知道应该恢复 testing。
// ============================================================


function getStatePath(
  runId: string,
) {
  return path.join(
    STATE_DIR,
    `${runId}.json`,
  );
}


async function saveCheckpoint(
  state: WorkflowState,
) {
  const targetPath =
    getStatePath(
      state.runId,
    );

  const tempPath =
    `${targetPath}.tmp`;

  /**
   * 先写临时文件，
   * 再原子替换正式 Checkpoint。
   *
   * 避免出现：
   *
   * JSON 刚写一半
   * Runtime Crash
   * ↓
   * Checkpoint 损坏
   */
  await writeFile(
    tempPath,
    JSON.stringify(
      state,
      null,
      2,
    ),
    'utf8',
  );

  await rename(
    tempPath,
    targetPath,
  );
}


async function loadCheckpoint(
  runId: string,
): Promise<WorkflowState | null> {

  try {
    const content =
      await readFile(
        getStatePath(runId),
        'utf8',
      );

    return JSON.parse(
      content,
    ) as WorkflowState;

  } catch {
    /**
     * 文件不存在，
     * 表示这是一个新的 Workflow。
     */
    return null;
  }
}


// ============================================================
// 6. Structured Artifact 管理
// ============================================================
//
// Artifact 与 Checkpoint 不一样。
//
// Artifact 回答：
//   “这个阶段最终产出了什么？”
//
// Checkpoint 回答：
//   “整个 Workflow 执行到哪里？”
//
// 例如：
//
// plan.json
//   = Planning 最终得出了什么
//
// WorkflowState.currentStage
//   = 现在执行到 Implementation
// ============================================================


async function saveArtifact(
  runId: string,
  stage: StageName,
  artifact: unknown,
): Promise<string> {

  const runDir =
    path.join(
      ARTIFACT_DIR,
      runId,
    );

  await mkdir(
    runDir,
    {
      recursive: true,
    },
  );

  const artifactPath =
    path.join(
      runDir,
      `${stage}.json`,
    );

  await writeFile(
    artifactPath,
    JSON.stringify(
      artifact,
      null,
      2,
    ),
    'utf8',
  );

  return artifactPath;
}


async function readArtifact<T>(
  artifactPath: string,
): Promise<T> {

  const content =
    await readFile(
      artifactPath,
      'utf8',
    );

  return JSON.parse(
    content,
  ) as T;
}


// ============================================================
// 7. Agent 可以调用的 Tools
// ============================================================
//
// tool.execute 的第二个参数就是 RunContext<AppContext>。
//
// 因此 Tool 可以拿到：
//
// runContext.context.workspace
// runContext.context.state
//
// 这些信息属于 Local Context，
// 不会因为放进 AppContext 就自动发送给 LLM。
// ============================================================


const readFileTool = tool({
  name: 'read_file',

  description:
    '读取当前代码仓库中的指定文件',

  parameters: z.object({
    filePath: z.string(),
  }),

  execute: async (
    { filePath },
    runContext?: RunContext<AppContext>,
  ) => {
    if (!runContext) {
      throw new Error(
        'Missing RunContext',
      );
    }

    const workspace =
      runContext.context.workspace;

    const target =
      path.resolve(
        workspace,
        filePath,
      );

    return await readFile(
      target,
      'utf8',
    );
  },
});


const writeFileTool = tool({
  name: 'write_file',

  description:
    '修改当前代码仓库中的指定文件',

  parameters: z.object({
    filePath: z.string(),
    content: z.string(),
  }),

  execute: async (
    {
      filePath,
      content,
    },
    runContext?: RunContext<AppContext>,
  ) => {
    if (!runContext) {
      throw new Error(
        'Missing RunContext',
      );
    }

    const workspace =
      runContext.context.workspace;

    const target =
      path.resolve(
        workspace,
        filePath,
      );

    await mkdir(
      path.dirname(target),
      {
        recursive: true,
      },
    );

    await writeFile(
      target,
      content,
      'utf8',
    );

    return {
      success: true,
      filePath,
    };
  },
});


const runTestsTool = tool({
  name: 'run_tests',

  description:
    '执行当前项目的自动化测试',

  parameters: z.object({}),

  execute: async (
    _args,
    runContext?: RunContext<AppContext>,
  ) => {
    if (!runContext) {
      throw new Error(
        'Missing RunContext',
      );
    }

    const workspace =
      runContext.context.workspace;

    /**
     * 为了突出 Runtime 结构，
     * 这里不真的执行 shell。
     *
     * 实际实现可以替换成：
     *
     * execa('pnpm', ['test'], {
     *   cwd: workspace
     * })
     *
     * 或者放到 Sandbox 中运行。
     */

    return {
      workspace,
      exitCode: 0,
      stdout:
        'All tests passed',
    };
  },
});


// ============================================================
// 8. 定义四个阶段 Agent
// ============================================================
//
// 这里采用“一个阶段一个 Agent”的方式。
//
// 只是为了让架构更容易观察。
//
// 实际上也完全可以复用同一个 Agent，
// 在不同阶段动态配置：
//
// instructions
// tools
// skills
//
// 外层 Workflow Runtime 不需要关心这一点。
// ============================================================


const requirementAgent =
  new Agent<AppContext>({
    name:
      'Requirement Agent',

    instructions: `
你负责需求分析。

目标：
1. 理解用户需求。
2. 提取明确的功能要求。
3. 找出实现约束。
4. 给出可以验证的验收标准。

你不负责写代码。

最后按照 RequirementArtifact 输出。
    `.trim(),

    tools: [
      readFileTool,
    ],

    /**
     * OpenAI Agents SDK 会要求模型
     * 输出符合 Zod Schema 的结构化结果。
     */
    outputType:
      RequirementArtifactSchema,
  });


const planningAgent =
  new Agent<AppContext>({
    name:
      'Planning Agent',

    instructions: `
你负责技术规划。

输入包括：
- 原始需求
- Requirement Artifact
- 当前代码仓库

请把需求拆成明确、可执行的代码任务。

每个任务需要包含：
- 具体目标
- 可能涉及的文件
- 验收条件

最后按照 PlanArtifact 输出。
    `.trim(),

    tools: [
      readFileTool,
    ],

    outputType:
      PlanArtifactSchema,
  });


const codingAgent =
  new Agent<AppContext>({
    name:
      'Coding Agent',

    instructions: `
你负责代码实现。

输入包括：
- Requirement Artifact
- Plan Artifact
- 当前代码仓库

你可以：
- 阅读代码
- 修改代码
- 运行测试

如果测试失败，
继续分析问题并修改代码。

直到当前实现阶段完成。

最后按照 ImplementationArtifact 输出。
    `.trim(),

    tools: [
      readFileTool,
      writeFileTool,
      runTestsTool,
    ],

    outputType:
      ImplementationArtifactSchema,
  });


const testingAgent =
  new Agent<AppContext>({
    name:
      'Testing Agent',

    instructions: `
你负责独立测试验收。

输入包括：
- Requirement Artifact
- Plan Artifact
- Implementation Artifact
- 当前代码环境

请基于 Requirement 中的验收标准
独立检查最终实现。

不要因为 Coding Agent 声称已经完成
就直接通过。

最后按照 TestArtifact 输出。
    `.trim(),

    tools: [
      readFileTool,
      runTestsTool,
    ],

    outputType:
      TestArtifactSchema,
  });


// ============================================================
// 9. Stage 与 Agent 对应关系
// ============================================================


const AGENTS = {
  requirement:
    requirementAgent,

  planning:
    planningAgent,

  implementation:
    codingAgent,

  testing:
    testingAgent,
};


const STAGES: StageName[] = [
  'requirement',
  'planning',
  'implementation',
  'testing',
];


// ============================================================
// 10. Stage 与 Output Schema 对应关系
// ============================================================
//
// 虽然 Agent.outputType 已经会做 Structured Output，
//
// Runtime 这里再显式 parse 一次，
// 是为了让 Workflow Runtime 明确知道：
//
// 当前阶段最终保存的 Artifact
// 必须符合什么数据结构。
// ============================================================


const OUTPUT_SCHEMAS = {
  requirement:
    RequirementArtifactSchema,

  planning:
    PlanArtifactSchema,

  implementation:
    ImplementationArtifactSchema,

  testing:
    TestArtifactSchema,
};


// ============================================================
// 11. 构建模型真正能够看到的 Stage Input
// ============================================================
//
// 这是理解 Context 与 Artifact 区别
// 最重要的代码之一。
//
// AppContext:
//
//   WorkflowState
//   Workspace
//   Artifact Directory
//
// 这些属于 Runtime Local Context，
// 不会自动发给 LLM。
//
//
// buildStageInput():
//
//   才是真正组织模型当前阶段需要看到的信息。
//
//
// 阶段之间不会这样传：
//
// Coding Agent
// 100 轮完整 Conversation
//        ↓
// Testing Agent
//
//
// 而是：
//
// requirement.json
// plan.json
// implementation.json
//        ↓
// Testing Agent
//
// 从而实现阶段之间 Context 隔离。
// ============================================================


async function buildStageInput(
  state: WorkflowState,
): Promise<string> {

  const stage =
    state.currentStage;

  // --------------------------------------------------------
  // Requirement
  //
  // 第一阶段只需要原始需求。
  // --------------------------------------------------------

  if (
    stage === 'requirement'
  ) {
    return `
当前阶段：需求分析。

用户原始需求：

${state.originalRequirement}

请完成需求分析，
输出结构化 Requirement Artifact。
    `.trim();
  }


  // --------------------------------------------------------
  // 从 Planning 开始，
  // 后续阶段都会使用 Requirement Artifact。
  // --------------------------------------------------------

  const requirementPath =
    state.artifacts.requirement;

  if (!requirementPath) {
    throw new Error(
      'Requirement Artifact 不存在',
    );
  }

  const requirement =
    await readArtifact<
      RequirementArtifact
    >(
      requirementPath,
    );


  // --------------------------------------------------------
  // Planning
  //
  // 输入：
  //   原始需求
  //   +
  //   Requirement Artifact
  // --------------------------------------------------------

  if (
    stage === 'planning'
  ) {
    return `
当前阶段：任务规划。

用户原始需求：

${state.originalRequirement}

已经确认的 Requirement Artifact：

${JSON.stringify(
  requirement,
  null,
  2,
)}

请生成具体实施计划。
    `.trim();
  }


  // --------------------------------------------------------
  // Implementation
  //
  // 输入：
  // Requirement Artifact
  // +
  // Plan Artifact
  //
  // 注意：
  //
  // 不传 Requirement Agent
  // 或 Planning Agent 的完整 Conversation。
  // --------------------------------------------------------

  const planPath =
    state.artifacts.planning;

  if (!planPath) {
    throw new Error(
      'Plan Artifact 不存在',
    );
  }

  const plan =
    await readArtifact<
      PlanArtifact
    >(
      planPath,
    );

  if (
    stage ===
    'implementation'
  ) {
    return `
当前阶段：代码实现。

Requirement Artifact：

${JSON.stringify(
  requirement,
  null,
  2,
)}

Plan Artifact：

${JSON.stringify(
  plan,
  null,
  2,
)}

请按照计划完成代码修改，
并执行必要测试。
    `.trim();
  }


  // --------------------------------------------------------
  // Testing
  //
  // 输入：
  // Requirement
  // Plan
  // Implementation
  //
  // Testing Agent 不直接继承 Coding Agent
  // 完整的模型 Conversation。
  //
  // 这样 Review 更独立。
  // --------------------------------------------------------

  const implementationPath =
    state.artifacts
      .implementation;

  if (!implementationPath) {
    throw new Error(
      'Implementation Artifact 不存在',
    );
  }

  const implementation =
    await readArtifact<
      ImplementationArtifact
    >(
      implementationPath,
    );

  return `
当前阶段：测试验收。

Requirement Artifact：

${JSON.stringify(
  requirement,
  null,
  2,
)}

Plan Artifact：

${JSON.stringify(
  plan,
  null,
  2,
)}

Implementation Artifact：

${JSON.stringify(
  implementation,
  null,
  2,
)}

请根据 Requirement 中的验收标准
进行独立验收。
  `.trim();
}


// ============================================================
// 12. 每个 Stage 使用独立 Session
// ============================================================
//
// OpenAI SDK 的 Session 用来保存 Conversation History。
//
// 我们希望：
//
// Implementation 阶段内部：
//
// Run 1
//   ↓
// 修改代码
//   ↓
// Run 2
//   ↓
// 根据之前结果继续修改
//
//
// 可以共享同一个 Session。
//
//
// 但是：
//
// Implementation Session
//
// 不直接给：
//
// Testing Session
//
//
// 因此形成：
//
// 阶段内部
// → Context 连续
//
// 阶段之间
// → Context 隔离 + Artifact 传递
//
//
//
// 注意：
//
// MemorySession 只存在内存中。
//
// Runtime 进程重启以后，
// Session Context 会消失。
//
// 但这是故意保留的设计重点：
//
// 长任务真正的恢复基础是：
//
// Artifact + WorkflowState / Checkpoint
//
// 而不是依赖 Agent Conversation 永久存在。
// ============================================================


const stageSessions =
  new Map<
    string,
    MemorySession
  >();


function getStageSession(
  runId: string,
  stage: StageName,
) {
  const sessionId =
    `${runId}:${stage}`;

  let session =
    stageSessions.get(
      sessionId,
    );

  if (!session) {
    session =
      new MemorySession({
        sessionId,
      });

    stageSessions.set(
      sessionId,
      session,
    );
  }

  return session;
}


// ============================================================
// 13. 阶段验收
// ============================================================
//
// 这里写得比较简单。
//
// 真实项目里这里可以进一步组合：
//
// Rule Validation
// Evaluator Agent
// Review Agent
// Human Approval
//
// 这个位置实际上就是 Workflow 的 Gate。
// ============================================================


function validateStage(
  stage: StageName,
  artifact: unknown,
): boolean {

  switch (stage) {

    case 'requirement': {
      const result =
        RequirementArtifactSchema
          .parse(
            artifact,
          );

      return (
        result.requirements
          .length > 0
        &&
        result
          .acceptanceCriteria
          .length > 0
      );
    }


    case 'planning': {
      const result =
        PlanArtifactSchema
          .parse(
            artifact,
          );

      return (
        result.tasks.length > 0
      );
    }


    case 'implementation': {
      const result =
        ImplementationArtifactSchema
          .parse(
            artifact,
          );

      return (
        result
          .completedTasks
          .length > 0
      );
    }


    case 'testing': {
      const result =
        TestArtifactSchema
          .parse(
            artifact,
          );

      return result.passed;
    }
  }
}


// ============================================================
// 14. Workflow Stage 推进
// ============================================================


function getNextStage(
  currentStage: StageName,
): StageName | null {

  const index =
    STAGES.indexOf(
      currentStage,
    );

  if (
    index ===
    STAGES.length - 1
  ) {
    return null;
  }

  return STAGES[
    index + 1
  ];
}


// ============================================================
// 15. 执行当前 Stage
// ============================================================
//
// 这是 Workflow Runtime 和 Agent Runtime
// 真正交界的位置。
//
// 外层 Runtime：
//
//   currentStage
//      ↓
//   选择 Agent
//      ↓
//   buildStageInput()
//      ↓
//   run()
//
//
// OpenAI Agents SDK 的 run() 内部：
//
//   Model
//     ↓
//   Tool Call
//     ↓
//   Tool Result
//     ↓
//   Model
//     ↓
//   ...
//     ↓
//   Final Output
//
//
// 所以外层 Workflow 不需要自己实现 Agent Loop。
// ============================================================


async function runCurrentStage(
  appContext: AppContext,
): Promise<boolean> {

  const state =
    appContext.state;

  const stage =
    state.currentStage;

  const agent =
    AGENTS[stage];

  const session =
    getStageSession(
      state.runId,
      stage,
    );

  /**
   * 从结构化 Artifact
   * 构建当前 Agent 真正需要看到的输入。
   */
  const stageInput =
    await buildStageInput(
      state,
    );

  console.log(
    `\n===== ${stage} 开始 =====`,
  );

  /**
   * 当前 Stage 正式进入运行状态。
   */
  state.stageStatus[
    stage
  ] = 'running';


  /**
   * Agent 真正执行之前
   * 先保存一次 Checkpoint。
   *
   * 如果中间进程异常退出，
   * Runtime 至少知道：
   *
   * implementation:
   *   running
   */
  await saveCheckpoint(
    state,
  );


  try {

    // -------------------------------------------------------
    // OpenAI Agents SDK
    // -------------------------------------------------------
    //
    // run() 内部负责 Agent Loop。
    //
    // context:
    //   传 Runtime Local Context。
    //
    // session:
    //   保存当前 Stage 的模型 Conversation。
    // -------------------------------------------------------

    const result =
      await run(
        agent,
        stageInput,
        {
          context:
            appContext,

          session,

          /**
           * 防止 Agent 因为错误判断
           * 无限调用 Tool。
           */
          maxTurns: 30,
        },
      );


    // -------------------------------------------------------
    // finalOutput
    //
    // 因为 Agent 设置了 outputType，
    // SDK 已经要求模型返回结构化结果。
    //
    // Runtime 再根据对应 Schema 验证一次。
    // -------------------------------------------------------

    const schema =
      OUTPUT_SCHEMAS[
        stage
      ];

    const artifact =
      schema.parse(
        result.finalOutput,
      );


    // -------------------------------------------------------
    // Gate：阶段验收
    // -------------------------------------------------------

    const passed =
      validateStage(
        stage,
        artifact,
      );


    if (!passed) {

      state.stageStatus[
        stage
      ] = 'failed';

      state.retryCount[
        stage
      ] =
        (
          state.retryCount[
            stage
          ] ?? 0
        ) + 1;


      /**
       * 即使阶段失败，
       * 也必须保存 Runtime State。
       *
       * Runtime 重启以后才能知道：
       *
       * testing failed
       * retry = 1
       */
      await saveCheckpoint(
        state,
      );


      console.log(
        `${stage} 验收失败`,
      );

      return false;
    }


    // -------------------------------------------------------
    // 阶段成功以后：
    //
    // 最关键的一步不是：
    //
    // “让 Conversation 继续存在”
    //
    // 而是：
    //
    // “把稳定结果沉淀成 Artifact”
    // -------------------------------------------------------

    const artifactPath =
      await saveArtifact(
        state.runId,
        stage,
        artifact,
      );


    /**
     * Runtime 正式记录：
     *
     * 当前阶段已经完成。
     */
    state.stageStatus[
      stage
    ] = 'completed';


    /**
     * 保存当前阶段 Artifact 位置。
     */
    state.artifacts[
      stage
    ] = artifactPath;


    // -------------------------------------------------------
    // 决定下一阶段
    // -------------------------------------------------------

    const nextStage =
      getNextStage(
        stage,
      );


    if (!nextStage) {

      /**
       * 没有下一阶段，
       * 整个 Workflow 完成。
       */
      state.status =
        'completed';

    } else {

      state.currentStage =
        nextStage;
    }


    // -------------------------------------------------------
    // 阶段成功后的 Checkpoint
    // -------------------------------------------------------
    //
    // 例如：
    //
    // requirement       completed
    // planning          completed
    // implementation    completed
    //
    // currentStage      testing
    //
    //
    // 如果程序此刻崩溃，
    //
    // 下次 Runtime 加载该 Checkpoint 后，
    // 可以直接从 testing 开始。
    // -------------------------------------------------------

    await saveCheckpoint(
      state,
    );


    console.log(
      `${stage} 完成`,
    );

    console.log(
      `Artifact: ${artifactPath}`,
    );

    return true;

  } catch (error) {

    // -------------------------------------------------------
    // Model / Tool / Network / Runtime
    // 发生异常。
    // -------------------------------------------------------

    state.stageStatus[
      stage
    ] = 'failed';

    state.retryCount[
      stage
    ] =
      (
        state.retryCount[
          stage
        ] ?? 0
      ) + 1;


    /**
     * 注意：
     *
     * 这里故意不修改 currentStage。
     *
     * 所以 Runtime 下次恢复时，
     * 仍然会执行当前 Stage。
     */
    await saveCheckpoint(
      state,
    );

    throw error;
  }
}


// ============================================================
// 16. 整个 Workflow Runtime
// ============================================================
//
// 注意：
//
// 下面这个 while
// 不是 Agent Loop。
//
// Agent Loop 在 OpenAI run() 内部。
//
// 这里是 Workflow Runtime Loop：
//
// Requirement
//     ↓
// Planning
//     ↓
// Implementation
//     ↓
// Testing
//
//
// Runtime 负责：
//
// 状态
// Stage
// Gate
// Retry
// Artifact
// Checkpoint
// Resume
// ============================================================


async function runWorkflow(
  params: {
    runId: string;

    requirement: string;

    workspace: string;
  },
) {

  await ensureDirectories();


  // ---------------------------------------------------------
  // Runtime 首先尝试恢复已有 Checkpoint。
  // ---------------------------------------------------------

  let state =
    await loadCheckpoint(
      params.runId,
    );


  if (!state) {

    // -------------------------------------------------------
    // 第一次运行。
    // -------------------------------------------------------

    state = {
      runId:
        params.runId,

      originalRequirement:
        params.requirement,

      currentStage:
        'requirement',

      status:
        'running',

      stageStatus: {
        requirement:
          'pending',

        planning:
          'pending',

        implementation:
          'pending',

        testing:
          'pending',
      },

      artifacts: {},

      retryCount: {},
    };


    await saveCheckpoint(
      state,
    );


    console.log(
      '创建新的 Workflow',
    );

  } else {

    // -------------------------------------------------------
    // 以前执行过。
    //
    // 从 Checkpoint 恢复。
    // -------------------------------------------------------

    console.log(
      '发现已有 Checkpoint',
    );

    console.log(
      `恢复阶段: ${state.currentStage}`,
    );
  }


  // ---------------------------------------------------------
  // 构造 Local Context
  //
  // 后续所有 Agent Tool 都可以访问它。
  //
  // 但这个对象不会自动发送给模型。
  // ---------------------------------------------------------

  const appContext:
    AppContext = {

    state,

    workspace:
      path.resolve(
        params.workspace,
      ),

    artifactDir:
      path.join(
        ARTIFACT_DIR,
        params.runId,
      ),
  };


  // ---------------------------------------------------------
  // Workflow Runtime Loop
  // ---------------------------------------------------------

  while (
    state.status ===
    'running'
  ) {

    const success =
      await runCurrentStage(
        appContext,
      );


    if (!success) {

      const stage =
        state.currentStage;

      const retryCount =
        state.retryCount[
          stage
        ] ?? 0;


      // -----------------------------------------------------
      // 简化版 Retry 策略。
      //
      // 真正系统这里还可以：
      //
      // rollback
      // human review
      // 返回前一个 Stage
      // 修改 Plan
      // -----------------------------------------------------

      if (
        retryCount >= 3
      ) {

        state.status =
          'failed';

        await saveCheckpoint(
          state,
        );

        throw new Error(
          `${stage} 连续失败 ${retryCount} 次`,
        );
      }


      console.log(
        `准备重试 ${stage}，当前失败次数 ${retryCount}`,
      );
    }
  }


  console.log(
    '\n===== Workflow 完成 =====',
  );

  console.log(
    JSON.stringify(
      state.artifacts,
      null,
      2,
    ),
  );

  return state;
}


// ============================================================
// 17. 启动
// ============================================================


async function main() {

  await runWorkflow({
    /**
     * 同一个长任务要保持相同 runId。
     *
     * 例如程序中途退出：
     *
     * 再次执行同一个 runId，
     * Runtime 会读取已有 Checkpoint。
     */
    runId:
      'feature-login-001',

    requirement: `
新增登录模块：

1. 支持用户名密码登录。
2. 登录失败显示明确错误信息。
3. 登录成功后进入首页。
4. 增加对应自动化测试。
    `.trim(),

    workspace:
      './my-project',
  });
}


main().catch(
  (error) => {
    console.error(
      error,
    );

    process.exit(1);
  },
);
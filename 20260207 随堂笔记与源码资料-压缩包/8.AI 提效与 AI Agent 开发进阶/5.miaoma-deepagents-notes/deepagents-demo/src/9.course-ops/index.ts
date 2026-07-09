import { mkdir, readFile, stat, writeFile } from "node:fs/promises";

import { createCodeInterpreterMiddleware } from "@langchain/quickjs";
import { Command, InMemoryStore, MemorySaver } from "@langchain/langgraph";
import {
  CompositeBackend,
  createDeepAgent,
  FilesystemBackend,
  StateBackend,
  StoreBackend,
  type FilesystemPermission,
  type SubAgent,
} from "deepagents";

import { createTextFileData } from "../00-shared/lib/files";
import {
  ensureProviderEnv,
  getModelName,
  getModel,
  threadConfig,
  workspacePath,
} from "../00-shared/lib/env";
import {
  collectReviewDecisions,
  getInterruptBundle,
  hasInterrupt,
} from "../00-shared/lib/hitl";
import { printFinal, printObject, printTitle } from "../00-shared/lib/output";
import {
  getOrderMetrics,
  searchKnowledgeBase,
  sendCourseEmail,
  writeReleaseTicket,
} from "../00-shared/tools/domain-tools";

type ArtifactSummary = {
  path: string;
  exists: boolean;
  bytes?: number;
  firstHeading?: string;
};

type ApprovalSummary = {
  round: number;
  action: string;
  decision: string;
};

function logDetail(message: string, value?: unknown): void {
  console.log(`[detail] ${message}`);
  if (value !== undefined) {
    console.log(JSON.stringify(value, null, 2));
  }
}

async function summarizeArtifact(root: string, fileName: string): Promise<ArtifactSummary> {
  const absolutePath = workspacePath("data", "course-ops-workspace", fileName);
  try {
    const [metadata, content] = await Promise.all([
      stat(absolutePath),
      readFile(absolutePath, "utf8"),
    ]);
    return {
      path: `/workspace/${fileName}`,
      exists: true,
      bytes: metadata.size,
      firstHeading: content
        .split("\n")
        .find((line) => line.trim().startsWith("#"))
        ?.trim(),
    };
  } catch {
    return {
      path: `/workspace/${fileName}`,
      exists: false,
    };
  }
}

async function seedCourseOpsWorkspace(): Promise<string> {
  const root = workspacePath("data", "course-ops-workspace");
  await mkdir(root, { recursive: true });

  await writeFile(
    workspacePath("data", "course-ops-workspace", "course-request.md"),
    [
      "# 课程研发需求",
      "",
      "- 课程名称：5.deepagents 通用智能体开发指南。",
      "- 课程时长：120 分钟。",
      "- 目标学员：已有 LangChain.js / LangGraph.js 基础的 TypeScript 工程师。",
      "- 交付目标：产出可运行 demo、课程讲义、风险审查和发布准备事项。",
      "- 特别要求：所有源码必须遵守当前工程编号模块、tsup 构建和 dist 脚本规则。",
    ].join("\n"),
    "utf8",
  );

  await writeFile(
    workspacePath("data", "course-ops-workspace", "audience-notes.md"),
    [
      "# 学员画像",
      "",
      "- 更关心工程边界、可观测性、审批、安全和长期维护。",
      "- 不需要营销话术，需要能落地到代码和运行命令。",
      "- 对工具调用、文件写入、人工审批、子代理日志尤其敏感。",
    ].join("\n"),
    "utf8",
  );

  return root;
}

export async function runCourseOpsDemo(): Promise<void> {
  ensureProviderEnv();
  printTitle("course-ops：课程研发运营智能体实战");
  const startedAt = Date.now();

  const workspaceRoot = await seedCourseOpsWorkspace();
  logDetail("初始化受控工作区", {
    virtualPath: "/workspace/",
    rootDir: workspaceRoot,
    seededFiles: ["/workspace/course-request.md", "/workspace/audience-notes.md"],
  });

  const store = new InMemoryStore();
  const memoryNamespace = ["course-demo", "course-ops"];
  const rulesPath = "/course-ops-rules.md";
  const retrospectivePath = "/course-ops-retrospective.md";

  await store.put(
    memoryNamespace,
    rulesPath,
    createTextFileData(
      [
        "# 课程研发运营规则",
        "",
        "- 课程产物写入 `/workspace/`，不要写入源码目录。",
        "- 可复用的课程运营规则写入 `/memories/`。",
        "- 发布工单和对外邮件必须经过人工审批。",
        "- QA 审查必须放在最终交付前，风险点放在每个模块最后。",
      ].join("\n"),
    ),
  );
  logDetail("初始化长期运营规则", {
    namespace: memoryNamespace,
    rulesPath: `/memories${rulesPath}`,
  });

  const backend = new CompositeBackend(new StateBackend(), {
    "/workspace/": new FilesystemBackend({
      rootDir: workspaceRoot,
      virtualMode: true,
    }),
    "/memories/": new StoreBackend({
      store,
      namespace: memoryNamespace,
    }),
    "/skills/": new FilesystemBackend({
      rootDir: workspacePath("skills"),
      virtualMode: true,
    }),
  });
  logDetail("配置 CompositeBackend 路由", {
    default: "StateBackend",
    routes: {
      "/workspace/": `FilesystemBackend(${workspaceRoot})`,
      "/memories/": `StoreBackend(${memoryNamespace.join("/")})`,
      "/skills/": `FilesystemBackend(${workspacePath("skills")})`,
    },
  });

  const permissions: FilesystemPermission[] = [
    { operations: ["read"], paths: ["/"], mode: "allow" },
    { operations: ["read"], paths: ["/skills/**"], mode: "allow" },
    { operations: ["read", "write"], paths: ["/workspace/**"], mode: "allow" },
    { operations: ["read", "write"], paths: ["/memories/**"], mode: "allow" },
    { operations: ["read", "write"], paths: ["/**"], mode: "deny" },
  ];
  logDetail("配置文件系统权限", permissions);

  const researcher: SubAgent = {
    name: "course-researcher",
    description: "归纳 DeepAgents 课程主题，输出可进入课程大纲的高信号材料。",
    systemPrompt:
      "你是课程研究子代理。只负责资料归纳，必须指出主题、适用边界和课堂价值。",
    tools: [searchKnowledgeBase],
  };

  const qaReviewer: SubAgent = {
    name: "course-qa-reviewer",
    description: "审查课程研发产物是否满足工程约束、运行验证、安全审批和课堂交付要求。",
    systemPrompt:
      "你是课程 QA 子代理。输出缺口、风险、验收建议三部分，不要重写完整讲义。",
    tools: [searchKnowledgeBase, getOrderMetrics],
  };
  logDetail("配置子代理与 skills", {
    subagents: [
      {
        name: researcher.name,
        tools: ["search_knowledge_base"],
      },
      {
        name: qaReviewer.name,
        tools: ["search_knowledge_base", "get_order_metrics"],
      },
    ],
    skills: ["/skills/brief-writer", "/skills/order-analysis"],
  });

  const agent = createDeepAgent({
    model: getModel(),
    backend,
    store,
    permissions,
    checkpointer: new MemorySaver(),
    skills: ["/skills/"],
    middleware: [createCodeInterpreterMiddleware({ skillsBackend: backend })],
    tools: [searchKnowledgeBase, getOrderMetrics, writeReleaseTicket, sendCourseEmail],
    subagents: [researcher, qaReviewer],
    interruptOn: {
      write_release_ticket: { allowedDecisions: ["approve", "reject"] },
      send_course_email: { allowedDecisions: ["approve", "reject"] },
    },
    systemPrompt: [
      "你是 CourseOps 课程研发运营主代理。",
      "必须读取 /workspace/course-request.md、/workspace/audience-notes.md 和 /memories/course-ops-rules.md。",
      "资料归纳必须委派 course-researcher，最终交付前必须委派 course-qa-reviewer。",
      "课程 brief 必须使用 brief-writer skill；订单指标分析必须使用 order-analysis skill helper。",
      "必须把课程大纲写入 /workspace/course-outline.md。",
      "必须把讲义 brief 与指标分析写入 /workspace/teaching-brief.md。",
      "必须把 QA 审查写入 /workspace/qa-review.md。",
      "必须把可复用运营复盘写入 /memories/course-ops-retrospective.md。",
      "创建发布工单和发送邮件前会触发人工审批；如果被拒绝，最终回答要明确说明跳过。",
    ].join("\n"),
  });
  logDetail("创建 CourseOps agent", {
    model: getModelName(),
    tools: [
      "search_knowledge_base",
      "get_order_metrics",
      "write_release_ticket",
      "send_course_email",
    ],
    interruptOn: ["write_release_ticket", "send_course_email"],
    outputFiles: [
      "/workspace/course-outline.md",
      "/workspace/teaching-brief.md",
      "/workspace/qa-review.md",
      "/memories/course-ops-retrospective.md",
    ],
  });

  const config = threadConfig("course-ops");
  logDetail("启动课程研发运营任务", config);

  let result = await agent.invoke(
    {
      messages: [
        {
          role: "user",
          content:
            [
              "请完成一次课程研发运营闭环：",
              "1. 基于现有课程需求生成课程大纲和讲义 brief。",
              "2. 结合 course 产品线订单指标说明课程受众价值。",
              "3. 审查工程约束、运行命令、HITL、安全边界和 streaming 可观测性。",
              "4. 创建 high 严重程度的发布工单，标题包含“DeepAgents 课程发布准备”。",
              "5. 给 ops@example.com 发送课程发布准备邮件。",
              "最终只汇总写入路径、QA 结论、审批后实际执行的外部动作。",
            ].join("\n"),
        },
      ],
    },
    config,
  );
  logDetail("首轮 agent.invoke 完成", {
    interrupted: hasInterrupt(result),
  });

  const approvals: ApprovalSummary[] = [];
  let reviewRound = 0;
  while (hasInterrupt(result)) {
    reviewRound += 1;
    const bundle = getInterruptBundle(result);
    logDetail(`检测到人工审批中断 #${reviewRound}`, {
      actions:
        bundle?.actionRequests?.map((action) => ({
          name: action.name,
          args: action.args,
        })) ?? [],
      reviewConfigs: bundle?.reviewConfigs ?? [],
    });

    const decisions = await collectReviewDecisions(result);
    approvals.push(
      ...decisions.map((decision, index) => ({
        round: reviewRound,
        action: bundle?.actionRequests?.[index]?.name ?? `action-${index + 1}`,
        decision: decision.type,
      })),
    );
    logDetail(`人工审批决策已收集 #${reviewRound}`, approvals.slice(-decisions.length));

    result = await agent.invoke(new Command({ resume: { decisions } }), config);
    logDetail(`审批后恢复执行完成 #${reviewRound}`, {
      interruptedAgain: hasInterrupt(result),
    });
  }

  printFinal(result);
  const storedRetrospective = await store.get(memoryNamespace, retrospectivePath);
  printObject("CourseOps 长期复盘", storedRetrospective?.value ?? null);

  const artifacts = await Promise.all([
    summarizeArtifact(workspaceRoot, "course-outline.md"),
    summarizeArtifact(workspaceRoot, "teaching-brief.md"),
    summarizeArtifact(workspaceRoot, "qa-review.md"),
  ]);
  printObject("CourseOps 执行摘要", {
    durationMs: Date.now() - startedAt,
    model: getModelName(),
    workspaceRoot,
    artifacts,
    approvals,
    memory: {
      namespace: memoryNamespace,
      retrospectivePath: `/memories${retrospectivePath}`,
      written: Boolean(storedRetrospective),
    },
    rerunCommands: [
      "npm run demo:course-ops",
      "HITL_AUTO_DECISION=approve npm run demo:course-ops",
      "HITL_AUTO_DECISION=reject npm run demo:course-ops",
    ],
  });
}

await runCourseOpsDemo();

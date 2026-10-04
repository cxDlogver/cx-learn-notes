# Agent 治理通过身份、授权、审批与隔离约束工具执行

## 【知识概述】

**Agent 治理关注的是：系统怎样把模型提出的动作，限制在明确的身份、权限、业务规则和执行范围内。** 当 Agent 能读写文件、执行代码或调用业务服务时，一段输出就可能转化为真实操作。系统因此需要对每个关键环节作出可验证的控制，而不能仅凭模型认为某个动作合理就允许执行。

### 【先确认代表谁，再确定能够使用哪些能力】

假设用户让 Agent “清理项目里的过期文件”。系统首先需要通过**身份认证（Authentication）**确认发起者，并确定 Agent 以什么身份或凭证执行。Agent 不应从模型生成的“我是管理员”之类文本中获得管理员身份；可信身份应来自登录会话、服务凭证等系统机制。

知道身份以后，可以根据角色和任务阶段决定本轮暴露哪些**工具（Tool）**：分析阶段先提供文件查询，具备条件后再提供删除能力。**工具可见性（Tool Exposure）**决定模型能选择什么，能够减少误操作和不必要选择，但它只是能力筛选。实际执行入口仍然要检查权限，因为工具名称被隐藏并不能证明所有调用路径都受到保护。

### 【具体动作需要授权，高风险动作可能还需要审批】

模型提出“删除目录中的某个文件”以后，系统才获得具体目标和参数，可以进行**授权检查（Authorization）**：当前身份是否可以对这个路径执行删除，文件是否属于本项目，业务规则是否允许删除。认证回答“是谁”，授权回答“能否执行这个具体动作”，两者职责不同。

如果操作风险较高，可以引入 **HITL（Human-in-the-loop，人工介入）**，把待执行的目标、参数和影响范围展示给用户或审核者，让任务暂停并等待批准。批准需要对应明确的操作范围，不能把“同意删除某个文件”扩大成“允许以后删除任意文件”。如果等待期间资源或权限发生变化，恢复时还要按当前规则重新检查。

```text
确认执行身份
  → 根据角色和阶段筛选可见工具
  → 模型提出具体动作及参数
  → 检查动作、资源和业务规则
  → 按风险决定是否需要人工审批
  → 执行前核验当前条件，在限定范围内操作
  → 保存执行结果和治理记录
```

这是职责上的理解顺序，具体框架中的检查与审批可以分布在不同组件，也可能多次执行。关键是可信检查必须覆盖实际操作，而不是只检查模型给出的计划。

### 【隔离限制影响范围，业务服务保留最终检查】

即使允许删除目标文件，也不代表 Agent 应获得整台机器的任意读写能力。**Sandbox（沙箱）**及资源边界可限制代码执行的文件目录、网络访问、运行时间和资源消耗，使一次错误的影响尽量受控。具体采用哪些限制，需要根据工具类型和业务风险设计：本地代码执行与远程业务接口的控制方式不必相同。

**业务后端（Backend）**是实际拥有文件、账户或其他业务数据的服务，仍应校验身份、资源与操作条件。运行时的检查和人工批准不能替代后端权限校验。例如，Agent 层认为某个文件可以删除，存储服务仍需确认凭证有权访问该文件，并按自己的规则执行。

**Guardrail（护栏）**是用于检查输入、输出或工具参数等内容的机制，可以由确定性代码或模型实现。它能发现某些风险，但一项内容检查只覆盖自己的规则和接入范围。提示词及技能说明可以表达操作要求，真正的授权和资源限制则需要由可信执行系统落实。

### 【记录决策依据，才能解释和追溯操作】

执行以后，需要通过**审计记录（Audit）**保留谁发起、操作什么资源、依据哪条策略、谁批准以及最终结果。审计的意义不仅是排查技术错误，还包括确认责任和授权范围；存储方式、访问控制和保留策略应与这些用途相适应。

回到清理文件的例子：用户提出目标，模型选择候选文件，系统判断是否有权删除，必要时用户审批，执行环境限制可访问目录，后端最终核验，审计保存全过程。这些机制相互补充，每一种都控制一个具体风险。正文会进一步展开它们在工具调用链中的接入位置，以及长任务恢复、框架护栏和审批流程的边界。

## 1. 治理规则贯穿身份、动作与执行边界

### 【Agent Governance 的定位与治理目标】

Agent Governance（Agent 治理）并不是 Agent 出现以后才产生的新问题。

传统软件系统本身就需要解决：

```text
Authentication
身份认证
确认当前用户是谁

Authorization
权限校验
确认当前用户允许做什么

Risk Control
风险控制
防止恶意或危险操作

Audit
审计
记录谁在什么时候做了什么
```

NIST AI Risk Management Framework（AI 风险管理框架）把 `GOVERN` 定义为贯穿整个 AI 风险管理体系的 **cross-cutting function（横向能力）**，强调治理需要贯穿 AI 系统生命周期，并通过组织政策、责任机制和技术控制落实。[[1]](https://airc.nist.gov/airmf-resources/airmf/5-sec-core/)

Agent 出现以后，这些传统治理机制仍然存在，但治理对象发生了变化：

```text
传统系统

User
 ↓
Application
 ↓
Backend
```

逐渐变成：

```text
Agent System

User
 ↓
Agent
 ↓
Tool
 ↓
Backend / Environment
```

用户不再直接完成所有操作，而是把部分决策权和执行权交给 Agent。

#### <u>1. Agent 必须继承用户真实的权限边界</u>

例如用户只能读取某一个项目：

```text
User A

project:read
project:123
```

那么不能因为 Agent 本身拥有：

```text
read_project
```

这个 Tool，就允许它读取所有项目。

真正的权限仍然应该是：

```text
User Identity
+
Agent
+
Tool
+
Target Resource
        ↓
Authorization
```

也就是说：

> **Agent 的能力不能突破委托它执行任务的用户本身所拥有的权限边界。**

#### <u>2. Agent 自身的不确定性需要额外治理</u>

即使用户确实拥有某项权限，也不能说明 Agent 的每一次 Action 都应该自动执行。

例如用户有删除文件权限，Agent 却因为错误判断生成：

```text
delete_file(
  "/project/config/production.json"
)
```

此时问题已经不再是：

```text
用户有没有 delete 权限？
```

而是：

```text
这一次具体删除是否合理？
风险是否过高？
是否需要人工确认？
```

所以 Agent Governance 最终需要同时控制：

> **用户有没有资格做，以及 Agent 这一次是否应该做。**

### 【治理规则的整体放置原则】

Agent Governance 不应该把所有规则都塞进 Prompt，也不应该只依靠 Tool 层的一次校验。

更合理的结构是：

```text
                    Governance Policy
                     企业治理规则
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
 Prompt / Skill      Tool / Workflow      Runtime
 行为规范             能力边界            动态决策
        │                  │                  │
        └──────────────────┼──────────────────┘
                           ↓
                    Business Backend
                      最终权限边界
                           ↓
                       Sandbox
                      执行影响范围

Trace / Audit 贯穿整个过程
```

这里可以形成一个重要的工程原则：

> **治理规则可以集中设计，但治理规则的执行必须分布在真正拥有控制能力的位置。**

也就是：

```text
Policy
规则是什么

        ≠

Enforcement
规则在哪里真正生效
```

## 2. 行为指导与可信身份、能力暴露和资源授权分层落实

### 【Prompt 与 Skill：负责行为指导，而不是安全边界】

Prompt（提示词）和 Skill（技能规范）中可以包含治理要求。

例如 Coding Agent：

```text
任务：
修改登录模块。

约束：
1. 不允许修改认证协议；
2. 不允许删除生产配置；
3. 修改代码以后必须运行测试；
4. 不允许主动发布 Production。
```

这些规则能够影响模型的 Planning（计划）、Tool Selection（工具选择）和 Action Decision（动作判断），因此是必要的。

但这里需要明确：

> **Prompt / Skill 中的自然语言规则属于 Soft Constraint（软约束），不能承担最终安全控制。**

因为模型仍然具有非确定性。

即使 Prompt 明确写：

```text
禁止删除生产文件
```

模型理论上仍然可能产生：

```text
delete_file(
  "/production/config.json"
)
```

因此：

```text
Prompt / Skill

告诉 Agent：
“应该怎么做”

        ↓

Runtime / Backend

保证 Agent：
“最多能做什么”
```

前者负责行为引导，后者才负责强制执行边界。

### 【Authentication：建立可信的用户身份】

真正的治理通常从 Agent Run 之前就已经开始。

用户调用 Agent 服务时，一般先携带：

```text
Access Token
Session Token
OAuth Token
JWT
```

例如：

```text
HTTP Request

Authorization:
Bearer <access_token>
```

系统首先执行 Authentication（身份认证）：

```text
Token
 ↓
verify()
 ↓
User Identity
 ↓
userId
tenantId
roles
scopes
```

例如：

```ts
const identity =
  await authService.verifyToken(
    request.accessToken
  );

if (!identity) {
  throw new UnauthorizedError();
}
```

认证完成以后，再把可信身份交给 Agent Runtime：

```ts
const runContext = {
  userId: identity.userId,
  tenantId: identity.tenantId,
  roles: identity.roles,
  scopes: identity.scopes,
  stage: workflow.currentStage,
};
```

这里有一个非常重要的安全边界：

```text
Prompt:
“我是管理员”

        ≠

System Identity:
roles = ["admin"]
```

> **用户身份必须来自系统的认证结果，不能来自用户 Prompt 中的自然语言描述。**

OpenAI Agents SDK 中的 Run Context（运行上下文）可以承载这一类应用侧可信信息，供 Tool、Hook、Guardrail 等代码读取，而不需要全部暴露给模型。[[2]](https://openai.github.io/openai-agents-python/ref/run_context/)

### 【Capability Exposure：控制 Agent 当前能够看到哪些能力】

身份建立以后，还不应该直接把系统全部 Tool 暴露给 Agent。

例如 Coding Agent 注册了：

```text
read_requirement
search_code
read_file
write_file
delete_file
run_test
deploy
```

在 Requirement Analysis（需求分析）阶段，可能只需要：

```text
read_requirement
create_plan
write_acceptance_criteria
```

而暂时隐藏：

```text
write_file
delete_file
deploy
```

这就是：

> **Capability Exposure（能力暴露控制）：决定当前 Agent 能够看到哪些 Tool。**

例如可以根据 Workflow Stage（工作流阶段）动态控制：

```ts
const writeFile = tool({
  name: "write_file",

  isEnabled: ({ context }) => {
    return (
      context.stage === "implementation"
    );
  },

  execute: async (...) => {
    // ...
  },
});
```

于是：

```text
Analysis Stage
↓
write_file 不暴露

Implementation Stage
↓
write_file 暴露
```

OpenAI Agents SDK 当前支持根据 Runtime Context 动态决定 Function Tool 是否启用，从而控制模型当前可见的能力集合。[[3]](https://openai.github.io/openai-agents-js/guides/tools/)

这种机制不仅具有治理价值，也属于 Context Engineering 的一部分。

因为 Tool Description（工具描述）和 Tool Schema（工具参数结构）本身也会进入 Model Context。

如果一次暴露大量无关 Tool：

```text
几十甚至上百个 Tool
        ↓
大量无关 Tool Description
        ↓
Context Noise（上下文噪声）
        ↓
Tool Selection 更困难
```

因此：

```text
Workflow Stage
      ↓
动态选择当前需要的能力
      ↓
只暴露相关 Tool
```

同时解决：

```text
治理问题
减少不应该出现的能力

        +

Context 问题
减少无关 Tool 对模型决策的干扰
```

### 【Tool 可见性不能代替 Authorization】

这是整个治理体系中最重要的边界之一。

Tool 是否可见回答的是：

> **模型有没有机会选择这个 Tool？**

Authorization（权限校验）回答的是：

> **模型真正生成参数以后，这一次具体调用到底有没有权限执行？**

两者完全不同。

假设用户拥有：

```text
refund_order
```

这个能力，因此它可以暴露给模型。

模型随后生成：

```text
refund_order({
  orderId: 123,
  amount: 100000
})
```

只有到了这个时候，系统才知道：

```text
是哪一个订单
属于哪个 Tenant
退款金额是多少
目标资源是谁的
```

因此真正的权限判断可能是：

```text
User
+
Tool
+
Arguments
+
Target Resource
        ↓
Authorization
```

例如：

```ts
async function refundOrder(
  ctx,
  { orderId, amount }
) {
  const order =
    await orderService.get(orderId);

  if (
    order.tenantId !== ctx.tenantId
  ) {
    throw new ForbiddenError();
  }

  if (
    !ctx.scopes.includes(
      "order:refund"
    )
  ) {
    throw new ForbiddenError();
  }

  if (
    amount > ctx.refundLimit
  ) {
    throw new ForbiddenError();
  }

  return orderService.refund(
    orderId,
    amount
  );
}
```

这里本质上依然是非常普通的：

```text
if / else
+
Policy Check
```

因此应该明确区分：

```text
Tool Visibility

“能不能让模型看到？”

        ≠

Authorization

“这次具体调用有没有权限？”
```

工具不可见可以降低风险，但不能成为真正的权限边界。

## 3. 具体动作通过策略、护栏与审批接受执行前校验

### 【Runtime Policy：对具体 Tool Call 做动态决策】

当 Model 真正输出：

```text
Tool Call
+
Arguments
```

以后，就进入 Agent Governance 最重要的动态控制阶段。

Runtime Policy（运行时策略）需要结合：

```text
User Identity
Agent
Workflow Stage
Tool
Tool Arguments
Target Resource
Current State
```

判断：

```text
ALLOW
DENY
REQUIRE_APPROVAL
```

例如：

```ts
function evaluateToolPolicy({
  user,
  stage,
  tool,
  args,
}) {
  if (
    !user.scopes.includes(
      tool.requiredScope
    )
  ) {
    return "DENY";
  }

  if (
    tool.name === "deploy" &&
    args.environment === "production"
  ) {
    return "REQUIRE_APPROVAL";
  }

  return "ALLOW";
}
```

这里需要注意：

> **Runtime Policy 并不是一个必须使用 AI 判断的模块。多数权限、阶段和风险规则反而应该优先使用确定性代码。**

因为安全规则、权限规则和审批规则本身应该尽量具有确定性。

### 【Guardrail：检查具体 Action 是否符合安全规范】

即使 Authorization 已经通过，这一次 Tool Call 仍然可能存在内容风险。

例如用户确实有：

```text
send_email
```

权限。

但是 Agent 生成：

```text
send_email({
  content:
  "API KEY = sk-xxxx"
})
```

这时候：

```text
Authorization = PASS
```

仍然不应该直接执行。

因此还需要 Guardrail（护栏，即对输入、输出或 Tool 参数进行安全检查）。

可以理解成：

```text
Authorization

判断：
“你有没有资格做？”

        ↓

Guardrail

判断：
“你这一次准备怎么做，
内容本身是否符合规则？”
```

例如 Tool Input Guardrail：

```ts
if (
  args.content.includes("sk-")
) {
  return REJECT;
}

return ALLOW;
```

OpenAI Agents SDK 当前把 Guardrail 区分为 Agent Input、Agent Output 以及 Tool Input / Tool Output Guardrail，其中 Tool Input Guardrail 会在 Tool 真正执行之前检查参数。[[4]](https://openai.github.io/openai-agents-python/guardrails/)

因此：

> **Guardrail 是行为内容检查，不应该替代真正的权限系统。**

### 【HITL：把高风险决策升级给人工】

还有一类情况：

```text
Authorization = PASS
Guardrail = PASS
```

但仍然不应该让 Agent 自动执行。

例如：

```text
生产发布
删除核心文件
大额退款
权限变更
资金转移
```

这里问题不是操作违法，而是：

> **操作本身风险过高，不能把最终决策完全交给非确定性的 Agent。**

因此使用 Human-in-the-loop（HITL，人在回路，即 Agent 在关键 Action 前暂停执行，由人工批准或拒绝）。

例如：

```ts
const deploy = tool({
  name: "deploy",

  needsApproval: async (
    ctx,
    { environment }
  ) => {
    return (
      environment === "production"
    );
  },

  execute: async (...) => {
    // deploy
  },
});
```

于是：

```text
deploy("staging")
↓
自动执行


deploy("production")
↓
Interrupt
↓
保存 RunState
↓
Human Approval
↓
Approve / Reject
↓
Resume
```

OpenAI Agents SDK 当前 HITL 的运行模型就是敏感 Tool Call 触发暂停，保存运行状态，在人工 approve / reject 后再恢复执行。[[5]](https://openai.github.io/openai-agents-python/human_in_the_loop/)

需要进一步明确一点：

> **HITL 并不是 AI 独有的治理机制，传统业务系统本来就存在人工审批；但由于 Agent 能自主产生 Action，HITL 在 Agent System 中变得更加重要。**

### 【人工批准以后仍然需要重新校验】

审批快照需要放在服务端可信存储，审批人重新鉴权，待审批操作通过原子状态迁移消费，防止重复审批和重复恢复。反序列化运行快照本身不证明快照来源可信，也不证明审批人有权批准当前资源操作。[[6]](https://openai.github.io/openai-agents-js/guides/human-in-the-loop/)

人工批准并不意味着可以：

```text
Approve
↓
直接执行
```

因为：

```text
Agent 提出 Action
        ↓
等待审批
        ↓
可能几分钟 / 几小时以后
        ↓
真正执行
```

期间可能发生：

```text
用户权限变化
资源状态变化
订单状态变化
Policy 更新
审批对象失效
```

所以更安全的过程是：

```text
Human Approve
      ↓
Revalidate（重新校验）
      ↓
Authorization
Guardrail
Business State Check
      ↓
Execute
```

也就是说：

> **Approval 是风险决策，不应该成为绕过后续安全校验的通行证。**

### 【Business Backend：真实资源的最终权限边界】

Runtime 已经做过权限判断以后，真正的业务 Backend 仍然必须保留最终 Authorization。

例如：

```text
Agent Runtime

refund_order(123)
       ↓
Order Service
```

Order Service 仍然需要检查：

```text
调用身份是否合法
订单是否属于当前 Tenant
当前用户是否允许退款
订单状态是否允许退款
退款金额是否超过范围
```

不能设计成：

```text
Agent Runtime 说可以
        ↓
Backend 无条件相信
```

更合理的是：

```text
Runtime Authorization

提前过滤无效调用

        +

Backend Authorization

保护真实业务资源
```

这里可以形成一个稳定的工程原则：

> **谁真正拥有资源，谁就必须保留最终权限控制。**

因此：

```text
Agent Runtime
不是
Backend Security Boundary
```

Runtime 可以提高治理效率，但业务后端仍然是实际资源的最终安全边界。

## 4. 隔离、审计与工具执行链共同约束真实副作用

### 【Sandbox：限制 Agent 做错以后能够影响多大范围】

前面的 Authorization、Guardrail 和 HITL 主要判断的是：

> **能不能执行。**

Sandbox（沙箱，即隔离执行环境）解决的是：

> **即使执行出了问题，最多允许影响到哪里。**

例如 Coding Agent 可能需要：

```text
Shell
Python
npm
Filesystem
Browser
```

如果所有命令直接运行在：

```text
Developer Laptop
Production Server
Entire Company Network
```

风险很高。

更合理的是：

```text
Agent
 ↓
Sandbox
 │
 ├─ 独立 Workspace
 ├─ File System Boundary
 ├─ Network Allowlist
 ├─ CPU / Memory Limit
 ├─ Secret Isolation
 └─ Temporary Environment
```

因此可以把两者区分为：

```text
Authorization

控制：
“Agent 可以做什么”

        ↓

Sandbox

控制：
“即使 Agent 做错，
最多能影响什么”
```

也就是控制 Blast Radius（影响范围）。

### 【Trace 与 Audit：治理体系必须能够被追溯】

Governance 不只是阻止危险 Action。

企业还必须能够回答：

```text
谁发起了任务？
哪个 Agent 执行？
使用什么 Agent / Model 版本？
模型看到哪些 Tool？
模型请求调用什么 Tool？
Tool Arguments 是什么？
哪个 Policy 做出了判断？
为什么要求人工审批？
谁批准了操作？
Backend 最终执行了什么？
任务最后修改了什么资源？
```

因此 Trace（执行轨迹）和 Audit（审计记录）应该贯穿整个链路，而不是只在最后记录一句：

```text
Task Success
```

在 Governance 场景中，可以进一步区分：

```text
Trace
→ 发生了什么

Audit
→ 谁做的、为什么允许、谁批准的
```

### 【一条 Tool Call 的完整治理链路】

下面是应用层自定义的治理链路，不能直接当作 SDK 默认顺序。OpenAI Agents SDK 默认先处理审批，再执行适用的 Function Tool 输入护栏。Python 设置 `ToolExecutionConfig(pre_approval_tool_input_guardrails=True)`，或 JavaScript 设置 `toolExecution: { preApprovalInputGuardrails: true }`，才会增加审批前检查；审批通过后仍需再检查。护栏只覆盖支持相应管线的工具，不自动覆盖所有 Hosted Tool、内建工具或 Handoff。[[4]](https://openai.github.io/openai-agents-python/guardrails/) [[7]](https://openai.github.io/openai-agents-js/guides/guardrails/)

把前面的机制放在一起，一条生产级 Tool Call 可以整理成：

```text
User Request
      ↓
Authentication
验证 Token / Session
      ↓
Trusted User Context
user / tenant / role / scope
      ↓
Workflow
确定当前 Stage
      ↓
Capability Filtering
根据 User / Stage / Policy
过滤当前可见 Tool
      ↓
Model Context
只向模型暴露当前允许的 Tool
      ↓
Model
      ↓
Proposed Tool Call
tool + arguments
      ↓
Schema Validation
参数结构是否合法
      ↓
Runtime Authorization
User + Agent + Stage
+ Tool + Arguments + Resource
      ↓
Tool Input Guardrail
参数 / 内容是否违反安全规则
      ↓
Risk Evaluation
      ↓
是否需要 HITL？
   ┌─────────┴─────────┐
   ↓                   ↓
  Yes                  No
   ↓                    │
Interrupt               │
   ↓                    │
Human Review            │
   ↓                    │
Approve / Reject        │
   ↓                    │
Revalidate              │
   └──────────┬─────────┘
              ↓
     Backend Authorization
       最终资源权限校验
              ↓
      Sandbox / Executor
       限制执行影响范围
              ↓
          Real Action
              ↓
     Tool Output Guardrail
              ↓
          Tool Result
              ↓
       Trace / Audit
              ↓
          Agent Loop
```

这条链路中最重要的是：

```text
模型负责提出 Action

系统负责决定：
这个 Action
能不能执行
是否需要审批
在哪里执行
最多影响什么
```

### 【OpenAI Agents SDK 中的实现映射】

如果把这一套结构映射到实际代码，可以简化为：

```ts
// 结构示例：authService、policy、sandbox 和错误类型由应用实现。
// tool / z 来自 SDK 与 Zod；不是完整可运行程序。
const identity = await authService.verifyToken(request.accessToken);
if (!identity) throw new UnauthorizedError();
const context = {
  userId: identity.userId,
  tenantId: identity.tenantId,
  scopes: identity.scopes,
  stage: workflow.currentStage,
};
const deleteFile = tool({
  name: "delete_file",
  description: "删除获授权的工作区文件；重要路径需要审批。",
  parameters: z.object({ path: z.string() }),
  // 只控制可见性，不代替资源授权。
  isEnabled: ({ context }) => context.stage === "implementation",
  needsApproval: async (_ctx, { path }) => path.startsWith("/important/"),
  execute: async ({ path }, ctx) => {
    if (!ctx) throw new UnauthorizedError();
    // 审批后根据最新服务端事实重新校验，防止使用过时权限。
    const trusted = await authService.reloadTrustedIdentity(ctx.context.userId);
    if (!trusted || !trusted.scopes.includes("file:delete")) {
      throw new ForbiddenError();
    }
    if (!policy.canDelete(trusted.userId, path) || isProtectedFile(path)) {
      throw new ForbiddenError();
    }
    // 应用还需规范化路径，校验租户归属，并在实际执行处封堵竞态。
    return sandbox.deleteFile(path);
  },
});
```

这段代码中每一层的职责不同：

```text
verifyToken
→ 谁在调用

RunContext
→ 当前可信用户和业务状态

isEnabled
→ 模型当前能不能看到 Tool

needsApproval
→ 这次 Action 是否需要人工确认

execute 中的 Authorization
→ 具体参数和资源是否允许

sandbox
→ 实际执行的影响范围
```

因此不要把 `isEnabled` 误解成真正的权限校验，也不要把 `needsApproval` 误解成 Authorization。

它们只是治理链路中不同位置的控制点。

### 【Agent Governance 的整体框架】

最终可以把整个治理体系压缩成四类控制。

#### <u>1. Soft Guidance：行为软约束</u>

```text
Prompt
Skill
Instructions
```

作用：

> **告诉 Agent 应该怎样做。**

#### <u>2. Capability Boundary：能力边界</u>

```text
Tool Registry
Workflow Stage
Dynamic Tool Filtering
```

作用：

> **决定 Agent 当前能够看到和选择哪些能力。**

#### <u>3. Action Control：具体操作控制</u>

```text
Authorization
Guardrail
Risk Policy
HITL
```

作用：

> **决定模型提出的这一笔具体 Action 是否真的能够执行。**

#### <u>4. Execution Boundary：真实执行边界</u>

```text
Backend Authorization
Sandbox
Resource Isolation
```

作用：

> **保护真实业务资源，并限制错误 Action 的实际影响范围。**

而：

```text
Trace / Audit
```

贯穿所有层，提供完整的治理证据。

**核心认识**

整个 Agent Governance 最重要的不是增加尽可能多的限制，而是把**模型自主决策**和**确定性安全边界**分开。

可以形成一条稳定原则：

> **不确定的任务判断可以交给模型，确定性的身份、权限、安全、审批和资源边界必须交给代码和系统。**

因此 Agent Governance 最终可以概括为：

> **传统系统治理主要解决“用户是谁、用户能做什么”；Agent Governance 在此基础上进一步解决“Agent 代表这个用户能够看到什么能力、模型产生的这一次 Action 是否允许、是否需要人工确认，以及真实执行最多能够影响什么”。系统先通过 Authentication 建立可信用户身份，再根据用户和 Workflow Stage 动态控制 Tool 可见性；模型产生具体 Tool Call 后，再根据 Tool Arguments 和目标资源进行 Authorization、Guardrail 和风险判断，高风险操作通过 HITL 升级给人工；真正执行时，业务 Backend 仍保留最终权限校验，并通过 Sandbox 限制影响范围，最后使用 Trace 和 Audit 保存完整治理证据。**

## 5. 参考文献

[1] NIST. [5 AI RMF Core](<https://airc.nist.gov/airmf-resources/airmf/5-sec-core/>)[EB/OL]. 核验日期：2026-10-04。

[2] OpenAI. [Run context — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/ref/run_context/>)[EB/OL]. 核验日期：2026-10-04。

[3] OpenAI. [Tools — OpenAI Agents SDK (JavaScript/TypeScript)](<https://openai.github.io/openai-agents-js/guides/tools/>)[EB/OL]. 核验日期：2026-10-04。

[4] OpenAI. [Guardrails — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/guardrails/>)[EB/OL]. 核验日期：2026-10-04。

[5] OpenAI. [Human-in-the-loop — OpenAI Agents SDK (Python)](<https://openai.github.io/openai-agents-python/human_in_the_loop/>)[EB/OL]. 核验日期：2026-10-04。

[6] OpenAI. [Human-in-the-loop — OpenAI Agents SDK (JavaScript/TypeScript)](<https://openai.github.io/openai-agents-js/guides/human-in-the-loop/>)[EB/OL]. 核验日期：2026-10-04。

[7] OpenAI. [Guardrails — OpenAI Agents SDK (JavaScript/TypeScript)](<https://openai.github.io/openai-agents-js/guides/guardrails/>)[EB/OL]. 核验日期：2026-10-04。

# AI Coding 如何通过确定性工程机制提高 Agent 执行可靠性

## 【提问】

在 Agent 长任务执行过程中，模型本身具有不确定性。你们是如何通过确定性的工程机制，降低 Agent 对自然语言规范的依赖，从而提高任务执行的可靠性和稳定性的？

## 【回答框架】

这道题的核心不是解释 Command、Skill、Script、Gate 分别是什么，而是回答一个更通用的问题：

> **哪些规则应该继续交给模型理解和判断，哪些规则应该从自然语言中下沉成结构化状态和确定性检查？**

回答主线：

~~~text
Agent 需要处理复杂、开放的问题
        ↓
Skill / Prompt 用自然语言描述流程和规则
        ↓
自然语言规则仍依赖模型读取、理解、记忆和执行
        ↓
识别其中“可明确表达、可客观验证”的部分
        ↓
结构化状态 / 固定字段 / Schema
        ↓
Script / Test / Lint / Static Check
        ↓
将开放式自检转换成可重复的确定性检查
        ↓
Agent 保留真正需要语义理解、推理和规划的自由度
~~~

项目中的 Verify、流程回归和 Skill 可靠执行实践用于说明这一原则，但最终回答要上升到通用 Agent / Harness 设计，而不是局限在当前工作流已有实现。

---

## 【标准回答】

我认为 Agent 工作流里引入确定性工程机制，最核心的目的不是把 Agent 变成一个完全确定的传统程序，而是：

> **尽可能把那些本来存在明确规则和客观结果的事情，从模型的自然语言理解和自主判断中拿出来。**

Agent 真正擅长的是需求理解、问题分析、方案设计、动态规划这类开放任务。但如果像“字段是否完整”“测试是否成功”“证据文件是否存在”“是否还有未完成任务”这种本来可以程序化判断的问题，仍然全部依赖模型自己阅读规范、自己检查、最后再自己宣布完成，那么整个系统会引入没有必要的不确定性。

### 【自然语言规范可以指导 Agent，但不能天然变成确定性约束】

Skill、Prompt 和 Workflow 文档首先解决的是“告诉 Agent 应该怎么做”。

例如可以规定：

~~~text
所有 Test Case 必须执行
每个 PASS 必须保存证据
存在未关闭 Blocker 时不能完成
任务结束前必须检查全部验收项
~~~

这些规则当然有价值，但从执行机制上看，它们仍然需要模型：

~~~text
读取
→ 理解
→ 在长任务中持续记住
→ 判断当前是否满足
→ 决定是否继续
~~~

OpenAI 当前的 Skills 文档明确说明，Skill 由 `SKILL.md` 中的 instructions 和 supporting files 组成；模型先看到 Skill 的 metadata，在任务匹配后加载完整 instructions。也就是说，`SKILL.md` 首先仍然是模型消费的工作流说明，而不是天然存在于模型之外的机械约束。[E1]

因此，如果可靠性建设只是不断增加：

~~~text
MUST
必须
禁止
务必
一定要
~~~

本质上还是在加强自然语言提示，并没有改变“规则最终仍由模型解释和执行”这一事实。

这里不是说自然语言 Skill 没有作用，而是要继续判断：

> **这条规则真的需要模型每次重新理解吗？**

### 【先把隐含在模型上下文中的执行状态变成显式结构】

确定性工程的第一步通常不是直接写脚本，而是先把任务状态外部化。

例如 Agent 要执行很多 Test Case。如果只依赖上下文，它可能隐式维护：

~~~text
TC-001 已完成
TC-002 做过但还缺截图
TC-003 还没开始
……
~~~

任务变长、Context 被压缩、Session 中断或者多个 Agent 交接以后，这种只存在于模型当前上下文中的状态并不稳定。

更可靠的方式是提前建立固定结构：

~~~text
case_id
expected_result
actual_result
verification_status
evidence_type
evidence_ref
coverage_result
~~~

任务开始时先初始化：

~~~text
TC-001
verification_status = PENDING
evidence_ref = EMPTY
coverage_result = PENDING
~~~

Agent 完成当前验收项以后再增量更新：

~~~text
TC-001
verification_status = EXECUTED
evidence_ref = evidence/tc-001-network.json
coverage_result = PASS
~~~

这样就把：

~~~text
模型“记得自己完成了什么”
~~~

转换成：

~~~text
系统“明确记录当前任务处于什么状态”
~~~

当前 AI Coding Workflow 已经采用了这种设计方向。Verify / Design 会建立 Case Queue，并把 Assertion、Observed Value、Evidence 与结果映射到结构化阶段产物；工作流文档同时把 Artifact 定义为跨阶段的事实载体。[P1][P2]

这和长任务 Agent 的通用实践也是一致的：Anthropic 的长任务 Harness 实践强调把关键任务进度和结果持久化到外部产物，而不是只依赖当前 Context，在新的 Session 中再从这些稳定产物恢复任务状态。[E4]

### 【结构化以后，再把可机械判断的规则下沉成程序检查】

一旦任务状态被结构化，很多条件就没有必要继续让模型重复推理。

例如：

~~~text
required case 是否全部存在
必填字段是否为空
枚举值是否合法
evidence_ref 是否存在
引用文件是否真实存在
测试命令退出码是否为 0
构建是否通过
coverage 是否达到阈值
是否还有 PENDING / FAILED 项
~~~

这些都有相对明确的 Ground Truth。

与其写一大段自然语言：

> 请再次确认所有 Test Case 都已完成，所有证据都存在，并确保没有遗漏后再结束任务。

更可靠的方式是把检查固化成程序：

~~~text
validate()
  ↓
检查 Schema / Required Fields
  ↓
检查 Status
  ↓
检查 Evidence Files
  ↓
执行 Test / Build / Lint
  ↓
输出明确的 PASS / FAIL 和失败项
~~~

最终可能返回：

~~~text
PASS
~~~

或者：

~~~text
FAIL

TC-003 evidence_ref missing
TC-007 status = PENDING
TC-012 evidence file not found
~~~

这里真正发生的变化是：

> **模型对规则的解释，变成程序对状态的计算。**

OpenAI 当前的 Skill 构建文档也明确建议：当 workflow 需要 deterministic computation 或 file processing 时使用 `scripts/`；如果普通 instructions 和已有工具已经能够可靠完成任务，则没有必要额外增加 Script。[E2]

Anthropic 的 Skill Best Practices 则从“自由度”解释同一件事：多种方案都合理、依赖上下文判断时可以使用高自由度自然语言；执行脆弱、一致性要求高或只有少量合法路径时，应降低自由度，使用参数化脚本或更加明确的执行逻辑。[E3]

因此原则不是“Script 一定比 Skill 更好”，而是：

> **存在确定答案的问题，优先使用确定性机制；需要理解和判断的问题，继续发挥模型能力。**

### 【门禁的本质也是把完成条件从建议变成可执行判断】

同样的思想可以继续应用到任务完成条件。

例如：

> 如果存在未完成验收项，请不要进入下一阶段。

这首先可以写成自然语言规则。

进一步可以把状态显式化：

~~~text
requirements_complete
artifacts_complete
verification_complete
blocker_count
~~~

再进一步，只要这些条件具有明确含义，就可以由程序计算：

~~~text
requirements_complete == true
AND artifacts_complete == true
AND verification_complete == true
AND blocker_count == 0
~~~

最终得到：

~~~text
PASS
~~~

或者：

~~~text
BLOCKED
~~~

因此 Gate 在这道题里不需要被理解成某个特定框架组件。更通用地说，它表达的是：

> **把“满足哪些条件才允许继续”从一条需要模型主动遵守的自然语言建议，逐渐变成系统可以检查的执行条件。**

当前工作流已经存在显式 Phase Gate、P0/P1 风险状态、Case Evidence Coverage Audit 等机制；同时也已经存在真正的确定性静态回归脚本。[P1][P3]

例如当前仓库中的：

~~~text
scripts/check_browser_runtime_contract.mjs
~~~

会直接检查 Verify 模板字段、浏览器运行模式、Design handoff、Mock Schema 和 MCP 文档中的关键合同。如果缺少规定字段或仍存在错误规则，脚本直接累积 failure 并以非零退出码结束；全部满足后才输出：

~~~text
Browser runtime contract check passed
~~~

对应回归记录明确保存了：

~~~text
deterministic_check: PASS
node scripts/check_browser_runtime_contract.mjs
~~~

这就是一个很直接的项目例子：原本散落在多个 Markdown 文件里的关键流程不变量，被进一步提升成可以自动执行的静态检查。[P3]

但需要区分当前实现和通用设计：

> 当前仓库并不是所有 Gate 都已经脚本化；“将更多可客观判断的门禁条件程序化”属于这套设计原则可以继续扩展的方向，不能把它表述成已经全部完成的项目事实。

### 【Agent 负责不确定性，工程系统负责确定性】

这个设计原则并不限于 AI Coding。

Research Agent 可以把：

~~~text
source_count
primary_source_count
claim_source_mapping
~~~

结构化，再检查核心 Claim 是否都存在引用。

数据处理 Agent 可以维护：

~~~text
input_count
success_count
failure_count
~~~

并确定性检查：

~~~text
input_count == success_count + failure_count
~~~

Coding Agent 中则可以直接检查：

~~~text
test exit code
build status
lint result
changed file scope
coverage threshold
schema validity
artifact existence
~~~

这些问题没有必要再让 LLM 做一次主观解释。

而下面的问题仍然适合 Agent：

~~~text
PRD 为什么有歧义？
Bug 根因在哪里？
技术方案 A 和 B 应该怎么取舍？
当前异常需要先查看哪些文件？
已有证据说明了什么？
~~~

所以最终应该形成：

~~~text
LLM / Agent
负责开放问题
→ 理解
→ 推理
→ 规划
→ 探索
→ 复杂判断

Deterministic Engineering
负责明确问题
→ Structured State
→ Schema
→ Script
→ Test
→ Lint
→ Static Check
→ Executable Gate
~~~

OpenAI 在 Harness Engineering 的真实工程实践中也给出了很直接的例子：仅靠 Documentation 无法持续维持关键架构约束，因此把重要 invariants 编码为 custom linters 和 structural tests，进行机械执行；同时强调的是“enforcing invariants, not micromanaging implementations”，也就是固定真正重要的边界，而不是写死 Agent 的所有实现路径。[E5]

这正好说明：

> **确定性工程机制不是减少 Agent 的价值，而是避免把 Agent 的推理能力浪费在本可以由程序稳定完成的判断上。**

---

## 【项目实例】

这套思想在我的 AI Coding 工作流实践中，比较明显地体现在 Verify 和 Skill 可靠执行设计上。

项目材料《如何编写让 Agent 可靠执行的 Skill》把主要问题归纳为：Agent 在长任务中可能遗漏规定步骤、绕过检查或者提前判断完成；对应方案包括脚本校验、结构化合同、增量证据和失败回溯。[P4]

在 Verify 中，我们进一步把：

~~~text
Test Case
→ Assertion
→ Observed Result
→ Evidence
→ Conclusion
~~~

做成结构化验收链，而不是只保留一个总的 `PASS`。[P2]

对于字段完整性、证据文件存在性、状态是否合法、固定命令结果等可以机械判断的内容，可以继续通过 Script / Schema 做确定性检查；真正涉及页面语义、业务行为和根因分析的部分仍交给 Agent。

因此我在项目里总结出的不是某一个具体脚本，而是一条可以复用到其他 Agent 任务中的方法：

> **先识别自然语言规范中可以确定化的部分，再依次把它们变成显式状态、结构化合同和程序检查；只有真正需要上下文理解和推理的部分继续留给模型。**

---

## 【面试收束】

如果面试中需要简洁总结，我会这样回答：

> 我们不是试图消除 Agent 的不确定性，而是减少没有必要的不确定性。
>
> Skill 和 Prompt 很适合描述复杂流程和语义规则，但它们最终仍然依赖模型读取、理解和执行。对于长任务，如果所有状态和完成条件都只存在于自然语言里，就会增加模型记忆、自检和规则遵循的负担。
>
> 所以对于有明确状态的内容，我们会先结构化，把任务进度、Case、Evidence、Blocker 等从模型上下文中外部化；对于可以客观判断的条件，再进一步下沉成 Schema、Script、Test、Lint 或静态检查，让程序直接给出明确结果。
>
> 这样做不是把整个 Workflow 写死，而是让 **Agent 负责不确定性，让工程系统负责确定性**。模型把能力集中在需求理解、方案设计和问题定位上，工程机制负责状态完整性、规则校验和可重复验证，从而提高长任务执行的可靠性、稳定性和可复现性。

---

## 【项目证据】

[P1] [需求交付框架流程图](../AI-Coding-Workflow/docs/delivery-framework-flow.md)：当前工作流明确把 `scripts/` 定位为“确定性检查与验证工具”，Artifact 作为阶段产物和事实载体，并通过阶段 Gate 控制流程推进。

[P2] [Verify Skill](../AI-Coding-Workflow/skills/06-debug-verification/SKILL.md) 与 [AI Coding 专项材料](../AI%20Coding.md)：Verify 使用结构化 Case、Assertion、Observed Result 与 Evidence 记录验收结果，并要求缺失项不能直接关闭。

[P3] [浏览器运行合同静态检查脚本](../AI-Coding-Workflow/scripts/check_browser_runtime_contract.mjs) 与 [静态回归记录](../AI-Coding-Workflow/flow-regression-runs/2026-06-30-coco-cli-headless-browser-static.md)：真实脚本机械检查多个工作流文件中的关键不变量，回归报告记录 `deterministic_check: PASS`。

[P4] [如何编写让 Agent 可靠执行的 Skill](../如何让Agent可靠执行Skill-汇报分享.md)：项目调研与实践材料系统整理了结构化合同、脚本校验、增量证据、Gate 与失败回溯等设计方法。

---

## 【通用知识关联】

这道项目面试题对应两条通用 Agent 工程知识：

1. [Agent 完整学习教程](../../Full-Stack-AI-NOTES/A-Agent学习教程.md)：外层 Workflow 中，确定的任务优先使用 Code / API / Script，需要动态判断的任务再交给 Agent；长任务通过 Structured Artifact 和持久化状态降低对单次 Context 的依赖。
2. [Agent 编排通过代码与模型分配不同范围的执行决策权](<../../Full-Stack-AI-NOTES/QA/Agent 编排通过代码与模型分配不同范围的执行决策权.md>)：解释“能确定 → Code / Rule；无法提前确定 → Model”的决策权分配。
3. [Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性](<../../Full-Stack-AI-NOTES/QA/Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性.md>)：专门从通用 Agent / Harness 角度整理本题背后的可靠执行原则。

---

## 【外部依据】

[E1] OpenAI. [Skills](https://developers.openai.com/plugins/concepts/skills). Skill 由 `SKILL.md` instructions 与可选 scripts、templates、references 等组成；模型在任务匹配后加载完整工作流指令。

[E2] OpenAI. [Build skills](https://developers.openai.com/plugins/build/skills). 官方建议在 workflow 需要 deterministic computation 或 file processing 时使用 `scripts/`，同时指出普通 instructions 和现有工具已经可靠时不必额外增加脚本。

[E3] Anthropic. [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices). 官方按任务的 fragility 与 variability 调整自由度：开放任务使用文本指导，更脆弱、一致性要求更高的任务降低自由度并使用更明确的程序化方式。

[E4] Anthropic. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). 长任务通过进度文件、功能清单和稳定产物保存跨 Session 状态，减少只依赖模型上下文造成的状态丢失。

[E5] OpenAI. [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/). OpenAI 指出 Documentation alone 不能维持关键架构约束，并通过 custom linters 与 structural tests 机械执行 invariants；重点是 enforce invariants，而不是规定 Agent 的每一个实现动作。

---

## 【后续追问】

下一步可以继续追问：

> 结构化状态为什么能够提高长任务可靠性？它和 Context、Artifact、Checkpoint 分别是什么关系？

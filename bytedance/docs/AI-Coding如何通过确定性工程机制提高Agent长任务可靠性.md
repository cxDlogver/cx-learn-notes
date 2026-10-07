# AI Coding 如何通过确定性工程机制提高 Agent 长任务可靠性

## 【提问】

在 Agent 长任务执行过程中，模型本身具有不确定性。你们是如何通过确定性的工程机制，降低 Agent 对自然语言规范的依赖，从而提高任务执行的可靠性和稳定性的？

## 【回答框架】

这道题的核心不是区分 Command、Skill、Script、Gate 分别是什么，而是回答一个更通用的问题：

> **怎样把原本依赖模型理解、记忆和自检的自然语言规则，尽可能转换成结构化状态和可程序化验证的确定性约束。**

回答可以沿下面的主线展开：

~~~text
Agent 本身具有不确定性
        ↓
自然语言规范仍需要模型理解和遵循
        ↓
识别其中可以明确表达、明确验证的部分
        ↓
结构化状态 / 固定字段 / Schema
        ↓
Script / Test / Lint / Static Check
        ↓
把开放式判断转换成确定性检查
        ↓
模型只处理真正需要语义理解和复杂推理的问题
~~~

项目实例可以使用 AI Coding Workflow 的 Verify 阶段，但最终结论要能够迁移到其他长任务 Agent、Research Agent、Coding Agent 或业务 Agent。

---

## 【标准回答】

我认为确定性工程机制在 Agent 工作流中的核心作用，是：

> **把那些本来存在明确规则和客观结果的事情，尽可能从模型的自然语言理解和自主判断中拿出来，转换成结构化状态和可以程序化执行的检查。**

这样做不是为了消除 Agent 的不确定性，而是为了缩小模型必须自由判断的范围。

### 【自然语言规范仍然属于软约束】

Skill、Prompt、Workflow 文档能够告诉 Agent：

~~~text
所有 Test Case 必须完成
每一个 PASS 必须存在证据
存在 blocker 时禁止进入下一阶段
验收结果必须完整记录
~~~

但这些规则最终仍然需要模型完成：

~~~text
读取规则
→ 理解规则
→ 在长任务中持续记住
→ 判断当前是否满足
→ 决定下一步行为
~~~

因此，多写几次“必须”“禁止”并不会把一条自然语言规则自动变成系统级硬约束。

OpenAI 在 Harness Engineering 的真实工程实践中也提到，单纯依赖大型说明文档会带来上下文竞争、规则腐化和难以机械验证的问题，因此会把关键不变量进一步编码进 linter、CI 和 structural test，而不是只依赖文档。[[1]](https://openai.com/index/harness-engineering/)

### 【先把隐含在模型上下文中的状态外部化】

第一步通常不是立即写脚本，而是先把原来存在于模型上下文中的任务状态变成显式结构。

例如一个 Agent 正在执行多个 Test Case。

如果只依赖自然语言，状态可能只是：

> TC-001 做完了，TC-002 还有一个证据没补，TC-003 还没有开始。

更稳定的做法是先初始化结构化记录：

~~~text
case_id
expected_result
actual_result
verification_status
evidence_type
evidence_ref
coverage_result
~~~

例如：

~~~text
TC-001
verification_status = PENDING
evidence_ref = EMPTY
coverage_result = PENDING
~~~

执行完成以后更新为：

~~~text
TC-001
verification_status = EXECUTED
evidence_ref = evidence/tc-001-network.json
coverage_result = PASS
~~~

这样就完成了一个重要转换：

~~~text
模型“记得自己做到了哪里”
        ↓
系统明确记录“当前真实状态是什么”
~~~

Anthropic 在长任务 Agent Harness 的实践中采用了类似方式：初始化结构化 feature list，把所有功能先标记为 failing，再由后续 Agent 增量完成和更新；同时通过 progress file 与 Git 记录跨上下文保存真实进度，从而减少下一轮 Agent 重新猜测历史状态。[[2]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

当前 AI Coding Workflow 也已经采用这种设计方向：阶段结果写入 Artifact，Verify 使用 Case Queue、Verify Case Ledger 和 Case Evidence Coverage Audit 保存执行状态和验收结果，而不是只依赖聊天上下文。项目实现可参考：

- [需求交付框架流程图](../AI-Coding-Workflow/docs/delivery-framework-flow.md)
- [Verify Skill](../AI-Coding-Workflow/skills/06-debug-verification/SKILL.md)

### 【能够机械判断的规则继续下沉为程序检查】

结构化以后，就可以继续判断：

> 哪些事情其实根本不需要 LLM 再判断一次？

例如：

~~~text
required case 是否全部存在
字段是否为空
状态枚举是否合法
evidence_ref 是否填写
目标文件是否真实存在
test exit code 是否为 0
coverage 是否达到阈值
是否还存在未关闭 blocker
~~~

这些问题存在明确结果，更适合交给 Script、Schema、Test、Lint 或 Static Check。

原来的自然语言规范可能是：

> 请检查所有 Test Case 是否完整，确认所有证据已经保存，如果不存在遗漏则允许任务完成。

下沉以后可以变成：

~~~text
validate()
├─ required case 是否齐全
├─ required field 是否完整
├─ evidence file 是否存在
├─ status 是否合法
└─ blocker 是否为 0
~~~

最后程序只需要返回：

~~~text
PASS
~~~

或者明确返回：

~~~text
FAIL
TC-003 evidence_ref missing
TC-007 status = PENDING
~~~

这一步的关键不是“用了脚本”这个形式，而是：

> **把模型对规则的解释转换成程序对状态的计算。**

OpenAI 当前的 Skills 实践也建议把 Skill Script 设计成小型 CLI：能够直接运行、输出 deterministic stdout、在错误时明确失败，并把产物写到固定路径；这正适合承接可重复、可程序化的检查。[[3]](https://developers.openai.com/cookbook/examples/skills_in_api)

当前仓库自身也已经沉淀了同样的设计原则：

- [如何让 Agent 可靠执行 Skill](../如何让Agent可靠执行Skill-汇报分享.md)：明确提出软约束、结构化合同、脚本校验和 Gate 回溯；
- [AI Coding](../AI%20Coding.md)：明确提出“用脚本、结构化字段和模板替代部分自然语言做确定性规范”；
- [AI Coding Workflow](../AI-Coding-Workflow/docs/delivery-framework-flow.md)：把 `scripts/` 定位为“确定性检查与验证工具”。

### 【门禁的本质是把继续执行的条件变成可执行约束】

这个思想还可以继续用于任务完成和阶段推进。

例如：

> 当前阶段所有必须项没有闭合之前，不允许进入下一阶段。

最弱的实现方式仍然是一条自然语言：

~~~text
如果还有未完成项，请不要进入下一阶段。
~~~

更稳定的方式是先把状态显式化：

~~~text
requirements_complete
artifacts_complete
verification_complete
blocker_count
~~~

再用确定性逻辑判断：

~~~text
requirements_complete == true
AND artifacts_complete == true
AND verification_complete == true
AND blocker_count == 0
~~~

最后得到：

~~~text
PASS
~~~

或者：

~~~text
BLOCKED
~~~

因此，Gate 不必被理解成某个特定框架组件。它的通用含义是：

> **把“满足什么条件才能继续”从自然语言建议提升成系统能够执行和验证的约束。**

当前工作流已经存在阶段 Gate、P0 Blocker、Pause State、结构化验收产物等实践；进一步把适合机械判断的 Gate 条件脚本化，则属于这套思想可以继续演进的方向，不能把“设计思想”与“当前已经全部实现”混为一谈。

### 【确定性机制不是 AI Coding 特有能力】

这套思想可以迁移到其他 Agent 系统。

例如 Research Agent：

~~~text
至少 5 个来源
至少 2 个一手来源
每个关键结论必须绑定 Citation
~~~

可以结构化为：

~~~text
source_count
primary_source_count
claim_source_mapping
~~~

然后进行程序检查。

数据处理 Agent 可以建立：

~~~text
input_count
success_count
failure_count
~~~

并检查：

~~~text
input_count == success_count + failure_count
~~~

Coding Agent 中则可以确定性检查：

~~~text
test exit code
build status
lint status
changed file scope
coverage threshold
artifact existence
schema validity
~~~

OpenAI Harness Engineering 的核心经验也与此一致：重要边界和不变量适合机械执行，但不需要规定 Agent 的每一个具体实现动作。文章将其概括为“enforcing invariants, not micromanaging implementations”：中央约束边界、正确性和可重复性，在边界内部保留 Agent 的实现自由度。[[1]](https://openai.com/index/harness-engineering/)

### 【真正需要推理的问题仍然交给 Agent】

确定性工程机制并不意味着把所有 Skill 都改写成代码。

真正需要区分的是：

~~~text
存在明确 Ground Truth
可以稳定、重复判断
→ Structure / Schema / Script / Test / Lint

需要语义理解
依赖上下文
存在多条合理路径
→ Agent / LLM
~~~

例如：

~~~text
测试命令是不是成功
→ Script

为什么这个需求存在歧义
→ Agent
~~~

~~~text
Evidence 文件存不存在
→ Script

这些 Evidence 是否真的支持复杂业务判断
→ Agent / Human
~~~

~~~text
某个字段是否合法
→ Schema

技术方案应该选择 A 还是 B
→ Agent / Engineer
~~~

所以真正稳定的设计原则不是“全部确定化”，而是：

> **让 Agent 负责不确定性，让工程系统负责确定性。**

这和通用 Agent 编排中的“能确定的流程、权限、验收和状态尽量交给代码；只有无法提前穷举、需要运行时语义判断的部分才释放模型自主性”是同一条工程主线。通用知识可继续阅读 [Agent 完整学习教程](../../Full-Stack-AI-NOTES/A-Agent学习教程.md) 和 [Agent 编排通过代码与模型分配不同范围的执行决策权](<../../Full-Stack-AI-NOTES/QA/Agent%20编排通过代码与模型分配不同范围的执行决策权.md>)。

## 【项目实例：Verify 如何应用这套原则】

在当前 AI Coding Workflow 中，Verify 是最直接的实践。

如果只写：

> 所有 Test Case 都必须完成，并留下证据。

它仍然只是一条自然语言规则。

进一步设计以后，每一个 Case 会形成稳定的验收结构：

~~~text
Test Case
    ↓
Assertion
    ↓
Observed Result
    ↓
Evidence
    ↓
Coverage Result
~~~

Agent 负责真实页面操作、异常分析和问题定位；Artifact 保存当前状态；可以客观判断的字段完整性、证据存在性、测试结果和状态合法性，则尽可能交给结构化检查和脚本。

因此 Agent 的职责从：

~~~text
执行任务
+
记住当前进度
+
自己检查全部规范
+
自己宣布是否完成
~~~

逐渐变成：

~~~text
Agent
→ 理解、推理和执行复杂任务

Structured Artifact
→ 保存真实进度和状态

Deterministic Check
→ 检查可以客观判断的规则

Workflow
→ 根据检查结果继续、重试、返修或阻塞
~~~

当前项目的具体证据包括：

- [需求交付框架流程图](../AI-Coding-Workflow/docs/delivery-framework-flow.md)：`scripts/` 被定义为确定性检查与验证工具，Artifact 作为阶段事实来源；
- [Verify Skill](../AI-Coding-Workflow/skills/06-debug-verification/SKILL.md)：逐 Case 执行、结构化证据记录与 Evidence Coverage；
- [如何让 Agent 可靠执行 Skill](../如何让Agent可靠执行Skill-汇报分享.md)：软约束、结构化合同、脚本校验、增量状态和 Gate 回溯的专项实践；
- [AI Coding](../AI%20Coding.md)：记录“用脚本、结构化字段和模板替代部分自然语言做确定性规范”的工作总结。

## 【最终收束】

面试中可以最终收束为：

> **我们不是试图把 Agent 变成一个完全确定的传统程序，而是在长任务里持续识别哪些事情其实不需要模型判断。对于任务状态、字段完整性、测试结果、证据存在性、覆盖率、Schema 等存在明确 Ground Truth 的部分，尽量从自然语言规则下沉成结构化状态和可执行检查；而需求理解、方案设计、问题定位这类需要语义推理的部分继续交给 Agent。这样可以减少模型在长任务中对记忆、自检和规则遵循的依赖，把不确定性限制在真正需要智能判断的位置，从而提高整个 Workflow 的可靠性、稳定性和可复现性。**

## 【外部依据】

1. OpenAI. [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/). 2026-02-11。文章说明大型说明文档难以机械验证，并通过 custom linters、CI jobs 与 structural tests 强制关键 invariants。
2. Anthropic. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents). 2025-11-26。文章通过 JSON feature list、progress file、Git 和增量执行保存长任务状态，减少跨上下文任务漂移和过早完成。
3. OpenAI. [Skills in OpenAI API](https://developers.openai.com/cookbook/examples/skills_in_api). 2026。官方示例建议 Skill Script 像小型 CLI 一样运行，提供 deterministic stdout、明确错误和固定输出路径。

## 【继续展开】

后续可以继续追问：

> 哪些规则适合下沉成 Script，哪些规则必须保留给 Agent 或人工判断？如果把规则过度确定化，会带来什么问题？

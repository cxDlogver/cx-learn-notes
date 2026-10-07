# 如何避免 AI 因错误需求理解生成错误 Test Case

## 【提问】

在 AI Coding 工作流里，Test Case、任务规划和代码实现都可能由 AI 参与。如何避免 AI 在需求理解错误的情况下，生成一套与错误实现相互匹配的 Test Case，最终形成“自己出题、自己写代码”的闭环？

## 【回答框架】

这道题只回答一个问题：**如何保证 Test Case 本身建立在正确、独立的需求事实之上。**

主线是：

~~~text
关键需求事实先闭合
        ↓
Test Case 在 Code 前形成
        ↓
Requirement → Scenario → Test Case 建立覆盖关系
        ↓
关键 Test Case 由人工审查
~~~

这里不展开 Verify 阶段如何判断 PASS，也不讨论 DOM、Network、Screenshot 等运行证据。那些属于“验收执行结论如何可信”的另一道问题。

## 【标准回答】

我认为避免 AI “自己出题、自己写代码”的关键，不是完全禁止 AI 生成 Test Case，而是要保证 **Test Case 的事实来源和代码实现相互独立**。

首先要控制的是需求理解。

如果 AI 一开始就把需求理解错了，那么后面即使生成了一套结构完整的 Test Case，再按照这套 Case 写出代码，也只是把错误需求实现得非常一致。因此在需求分析阶段，我们会先识别需求中的不确定项。

AI 可以负责从 PRD、Figma、产品评论和已有技术资料中发现冲突和模糊点，但对于会影响业务语义和验收标准的问题，AI 不能自己推断一个答案，而是必须进入需求澄清。

这里也不能简单理解成“所有不确定性都必须在需求阶段解决”。我们实际会区分不同等级：

- 如果缺失内容会导致产品需求本身无法理解，例如核心业务规则冲突、用户操作语义不明、关键设计主态缺失，那么会作为阻塞项处理，不能继续进入后续规划。
- 如果只是接口字段、路径、错误码等技术实现细节还没有闭合，可以进入 Plan 阶段继续通过 BAM、已有 Service、技术文档等方式探索。

所以更准确的原则是：

> **影响需求语义和验收标准的关键不确定性，必须在进入任务规划和 Test Case 设计之前闭合。**

在“内容活动激励管控线上化”这个真实需求里，我们实际遇到过类似问题。例如：

- 批量上传命中问题作品后应该复用哪一种页面状态；
- 导出范围到底是所有问题记录，还是只导出已经剔除的记录；
- PRD 评论中提到申诉，但设计稿里没有对应入口，这一期是否需要实现。

这些问题如果 Agent 自己选择一种解释，后面的 Plan、Test Case 和代码就会沿着这个方向继续推进。因此 AI 负责发现和整理问题，但关键业务事实由产品或研发确认，确认结果再沉淀回需求事实。

第二个关键点是，**Test Case 必须先于 Code 形成，而且来源于已经确认的需求，而不是从当前实现反推。**

我们的链路是：

~~~text
PRD / Figma / 产品确认
        ↓
原子需求
        ↓
Scenario
        ↓
Test Case Matrix
        ↓
Code
~~~

而不是：

~~~text
Code
 ↓
AI 根据当前实现补 Test Case
~~~

原因是，如果 Test Case 在代码完成以后才生成，模型很容易受到当前实现影响，把“代码现在做成了什么”逐渐解释成“需求本来就应该是什么”。这样代码和测试虽然互相一致，但可能一起偏离真实需求。

所以我们把 Test Case Matrix 放在 Code 之前，并把它作为后续实现的验收合同。

这也是我们引入 ATDD（Acceptance Test-Driven Development，验收测试驱动开发）思想的原因。Agile Alliance 对 ATDD 的定义强调：不同角色应在对应功能实现之前共同识别验收标准和测试，这些验收测试从用户视角描述系统应该怎样工作，并作为需求的一种表达。

第三个控制点是，不能只看单条 Test Case 是否“写得合理”，还要检查需求覆盖关系。

我们会建立：

~~~text
Requirement
    ↓
Scenario
    ↓
Test Case
~~~

之间的映射。

当前真实交付记录中，Test Case Matrix 会直接做 Coverage Audit。例如“内容活动激励管控线上化”需求中，原子需求 AR-001 到 AR-017 都需要映射到具体 Test Case 和实现任务，不能只凭“已经生成了一批 Case”就认为测试设计完整。

以“存在问题作品时禁止提交”为例，如果只生成：

> 点击提交后出现提示。

这并不足以说明 Test Case 已经完整覆盖业务规则。

还需要继续检查它是否覆盖了该业务场景真正要求的行为边界，例如问题作品是否仍然保留、正常作品是否受到影响、提交动作在什么前置条件下应该被阻止等。

Given-When-Then 可以帮助我们结构化表达单个行为场景。Agile Alliance 对这一格式的定义也是：Given 描述上下文，When 描述动作，Then 描述应该能够观察到的结果。但 Given-When-Then 解决的是单条场景怎么表达清楚，并不能自动保证测试完整。

测试完整性仍然要通过 Requirement、Scenario 和 Test Case 的覆盖关系检查。

最后一个关键点是，**Test Case 本身也是人工审查的重要 Gate，而不是 AI 生成以后直接作为正确答案使用。**

我会把 Test Case Matrix 看成整个 AI Coding 工作流中最重要的中间产物之一，因为它承担两个作用。

第一，它是后续代码开发的验收合同。

第二，它也是对前面需求分析和任务规划的一次反向检查。

人工审查的重点不是看 Test Case 格式是否标准，而是判断：

> 如果这一组 Test Case 全部满足，是否真的可以证明当前需求按照产品预期被实现？

如果在审查 Test Case 时发现某个场景无法确定预期结果，或者 Case 与 PRD、Figma、产品确认存在冲突，就说明问题可能已经出现在需求分析或 Plan，而不是继续进入 Code。

所以我会把避免“AI 自己出题、自己写代码”总结成三层：

~~~text
需求事实先闭合
关键业务歧义不能由 AI 自己决定
        ↓
Test Case 与实现解耦
基于需求生成，并且发生在 Code 之前
        ↓
Test Case 自身接受审查
检查 Requirement → Scenario → Case 的准确性和覆盖完整性
~~~

因此核心不是简单换一个 Agent 来生成测试，而是**让测试标准的来源回到独立的需求事实，并在代码实现之前把它冻结成一个可审查的验收合同。**

## 【项目证据】

当前工作流中的实现与这套回答一致：

- PRD Analysis 阶段只在“产品需求本身无法理解”时将问题升级为 P0 阻塞；单纯接口字段、路径、错误码等技术缺口可以进入 Plan 阶段继续闭合。
- Test Case Planning 明确在 Code、Verify、Acceptance 之前生成独立的 `09-test-case-matrix.md`，并执行 PRD/Figma/交互覆盖审计。
- “内容活动激励管控线上化”真实 Test Case Matrix 中，Coverage Audit 记录 AR-001 到 AR-017 均已映射到 Test Case 和实现 Task。

对应仓库入口：

- [PRD Analysis Skill](../AI-Coding-Workflow/skills/03-prd-analysis/SKILL.md)
- [Test Case Planning Skill](../AI-Coding-Workflow/skills/10-test-case-planning/SKILL.md)
- [真实 Test Case Matrix](../AI-Coding-Workflow/7306602080-incentive-control-online/09-test-case-matrix.md)

## 【外部依据】

1. Agile Alliance, Agile Extension to the BABOK Guide：ATDD 由不同视角的成员在功能实现之前共同识别 Acceptance Criteria 和 Acceptance Tests。  
   https://www.agilealliance.org/wp-content/uploads/2017/08/AgileExtension_V2-Member-Copy.pdf

2. Agile Alliance, Given-When-Then：Given 描述上下文，When 描述动作，Then 描述应该出现的可观察结果。  
   https://agilealliance.org/glossary/given-when-then/

3. Agile Alliance, Agile Practice Guide：ATDD 强调团队先讨论验收标准并创建测试，再编写满足这些标准的代码。  
   https://www.agilealliance.org/wp-content/uploads/2021/02/AgilePracticeGuide.pdf

## 【后续追问】

这道题结束后，可以继续拆成下一道独立问题：

> Test Case 已经准确以后，AI 在 Verify 阶段如何保证最终 PASS 结论可信，而不是“自己执行、自己宣布通过”？

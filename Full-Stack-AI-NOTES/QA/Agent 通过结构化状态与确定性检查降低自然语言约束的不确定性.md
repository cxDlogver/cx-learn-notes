# Agent 通过结构化状态与确定性检查降低自然语言约束的不确定性

## 【知识概述】

Agent 的推理和工具选择具有开放性，但“是否完成必需测试”“某个字段是否合法”“是否已经取得规定证据”等问题往往存在可以直接计算的判断条件。**可靠性建设的关键不是继续叠加更强硬的 Prompt，而是区分哪些地方需要模型理解，哪些地方应交给可验证的状态与程序约束。**

如果所有要求都只写在 Skill 中，模型仍要自行记住、解释并宣布完成；改用结构化状态、校验脚本和可执行 Gate，则可以让结果独立于模型的自然语言总结被审查。OpenAI Skills 的工作流说明和脚本资源，以及 Anthropic 对长任务状态文件的做法，分别提供了这种分工的工程依据。[[1]](https://developers.openai.com/plugins/concepts/skills) [[2]](https://developers.openai.com/plugins/build/skills) [[3]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

## 【提问】

- Agent 本身具有不确定性，怎样通过工程机制提高长任务执行的可靠性？
- 为什么不能只靠 Prompt / Skill 中的“必须、禁止”来保证规范执行？
- 哪些规则应该保留语义判断，哪些应该下沉为状态、Schema、Script 或 Gate？
- “用确定性约束包围不确定 Agent”如何真正落实到一次任务执行？

## 【回答框架】

先从执行失败的根因切入：自然语言说明只有在模型正确消费并遵守时才起作用，不能保证后续阶段的完成条件已被满足。然后区分规则性质：目标理解、未知问题定位交给 Agent；字段校验、状态迁移和已有标准的判定交给程序。由于程序要检查具体事实，必须先把进度、实际结果和证据从聊天上下文变成外部结构化状态，再对其中可计算的条件执行 Schema、Test、Lint 或 Script；最后让 Gate 基于这些结果阻塞或放行。

~~~text
业务目标与开放问题
    ↓ Agent 负责推理、规划和解释异常
正式任务状态（Case、产物、证据、失败原因）
    ↓ 程序执行确定性校验
明确的 Gate 结果（PASS / FAIL / BLOCKED）
    ↓ 需要开放判断或高风险决策时
Agent / Human 审查并继续执行
~~~

结尾强调边界：程序能判断证据是否存在，不自动等于能够判断证据是否支持真实业务语义；强行程序化开放判断也可能制造新的错误合同。

## 【完整回答】

### 【一、可靠执行首先要划分模型判断与程序约束的责任】

我认为，要提升 Agent 在长任务中的可靠性，不能把方法简单理解为“把 Skill 写得更详细”，而应该先问：**哪些条件确实需要模型根据上下文思考，哪些条件已经有明确答案，应由系统直接检查。**

例如，“如何分析一次复杂性能回退”需要理解代码、提出假设并根据证据调整路径，适合 Agent；而“构建命令是否成功、目标文件是否存在、规定测试是否执行”通常可以由程序给出确定结论。模型有能力分析测试失败的原因，但没有必要代替程序再判断退出码是否为零。

这不是要让 Agent 完全确定化。相反，只有把规则稳定的部分从模型自由判断中分离，才能让它将推理能力集中用于真正不确定的问题。Anthropic 的 Skill 编写建议使用与任务风险相匹配的自由度：选择空间大时可以允许更开放的说明，操作脆弱且需要一致性时使用更明确的流程与脚本。[[4]](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)

### 【二、只有自然语言约束时，合规与完成仍可能退化成自我声明】

Prompt 和 Skill 能有效描述目标、约束和操作方法，但这类说明终究由模型读取与执行。OpenAI Skills 官方资料区分 Skill 元数据、指令正文与脚本等可携带资源；其中指令告诉模型如何工作，而脚本则能够承接明确的计算与文件处理。[[1]](https://developers.openai.com/plugins/concepts/skills) [[2]](https://developers.openai.com/plugins/build/skills)

假设我们只写“必须验证全部 Case，证据不足时不得结束”，却没有保存 Case 清单、进度或验证程序。任务执行数轮后，模型可能遗漏早先的待办，或者把“已经跑过测试”的说明误认为“已经满足全部完成条件”。

问题不一定是模型故意绕过规则，而是**规则文本与真实执行状态没有形成可以独立审查的对应关系**。因此下一步不是继续增加强调语气，而是让任务事实脱离短暂的对话上下文。

### 【三、结构化状态让进度、结果和证据成为可检查的事实】

对于包含多个任务、测试项和执行阶段的工作，可以将关键结果保存为外部状态，例如 `case_id`、`status`、`actual_result`、`evidence_ref` 和 `failure_reason`。这里每一项都有明确职责：哪个 Case、执行到什么状态、观察到什么、凭什么判断以及失败原因是什么。

如果信息只存在于聊天记录里，后续 Agent 或跨 Session 恢复时容易依赖对早先文字的重新解释；一旦将它们写成正式产物，Reviewer 和自动检查就可以读取同一组事实。Anthropic 在长时间运行 Agent 的工程实践中使用功能清单和进度文件保存跨会话状态，也是相近思路。[[3]](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)

不过，“状态已经持久化”只说明信息可读取，不意味着它一定真实。因此必须继续进入独立验证：**状态来自哪次工具执行、哪些值可以自动计算、哪些值仍要人工核对**。

### 【四、确定性校验把明确规则从语言解释变成程序判断】

状态具备结构以后，可以使用 Schema 或类型检查验证字段结构，用 Script 检查产物和文件范围，用 Test 验证行为，用 Lint 约束明确的代码规则。它们不需要额外调用一次 LLM 来判断一个已有标准的问题。

例如一个 Case 必须具有有效 `case_id`、实际结果和证据引用，程序可以先检查缺项；一个代码任务要求目标测试通过，就读取测试实际退出码；一个修改任务不得触碰非授权目录，可以根据变更路径直接检查。

OpenAI 在 Harness Engineering 中提出，应把真正重要的架构不变量落成 Linters 和 Structural Tests，而不是只维护说明文档；但与此同时，它也强调应约束关键不变量，而不是过度控制每个实现动作。[[5]](https://openai.com/index/harness-engineering/)

这说明确定性并不等于繁琐。只有当规则的真假确实可以从明确数据得出时，把它做成可执行约束才是可靠性收益。

### 【五、Gate 将“建议不要继续”转换成实际的放行条件】

接下来需要把单项检查收敛成阶段门禁（Gate）。例如，某个阶段要求所有必需 Case 已闭合、没有阻塞失败、必需证据齐全，那么就让 Gate 读取这些状态并给出 PASS、FAIL 或 BLOCKED；只有满足条件的阶段才允许继续。

这里的核心变化是：原先 Prompt 说“应该停止”，仍然依赖模型是否遵守；现在流程能根据明确规则直接阻断下一阶段，即使模型生成了“任务已经完成”的文本，也不能改变 Gate 的结果。

但要保留边界：例如某个 Evidence 引用存在、格式正确，仍不代表其内容足以证明产品验收语义。程序可以检查证据的结构与必要性，涉及复杂业务解释、视觉差异或风险判断时仍需 Agent 分析或人工审核。

### 【六、最终形成的是分工协作，而非用脚本取代 Agent】

所以，我会把提高 Agent 执行可靠性的思路总结为：**Agent 负责理解目标和处理开放问题；结构化状态负责保存执行事实；Script、Test 与 Schema 负责明确规则；Gate 负责阶段是否允许继续；人工复核处理高风险和尚无确定标准的判断。**

这样既避免了每次都靠模型重新解释已经明确的条件，也不会把需要语义理解的任务强行写死成规则。

例如 AI Coding 的验收中，程序可以确认每个 Case 是否有证据，但最终 Case 是否表达了**真实产品需求**仍然属于另一层质量问题。对此还需要需求澄清与修复回流机制，见[AI Coding 错误验收通过需求追溯与修复回流形成质量闭环](./AI%20Coding%20错误验收通过需求追溯与修复回流形成质量闭环.md)。完整工程目标是既让已知约束可执行，也让不确定问题能够被识别、核对和纠正。

## 【与相邻知识的关系】

这条原则和“代码编排 vs 模型编排”有关，但不是同一个问题。

[Agent 编排通过代码与模型分配不同范围的执行决策权](./Agent%20编排通过代码与模型分配不同范围的执行决策权.md)回答的是：**哪些下一步决策应该由代码决定，哪些应该交给模型。**

当前问题回答的是：**已经确定的规则，怎样进一步从自然语言约束下沉成可验证的工程约束。**

它也和长任务状态管理有关。[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](./Agent%20长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md)重点回答 State、Artifact、Checkpoint 和 Recovery；当前问题进一步解释为什么结构化状态还能成为确定性检查的输入。

## 【项目实践映射】

字节 AI Coding Workflow 中已经有多处对应实践：

- [AI Coding 如何通过确定性工程机制提高 Agent 可靠性](../../bytedance/docs/AI-Coding如何通过确定性工程机制提高Agent可靠性.md)：面试视角下的完整项目回答。
- [如何编写让 Agent 可靠执行的 Skill](../../bytedance/如何让Agent可靠执行Skill-汇报分享.md)：围绕结构化合同、脚本校验、增量记录和 Gate 回溯的专项调研。
- [浏览器运行合同静态检查脚本](../../bytedance/AI-Coding-Workflow/scripts/check_browser_runtime_contract.mjs)：把跨多个流程文件的重要 Browser Runtime Contract 下沉成真实可执行的静态检查。
- [静态回归记录](../../bytedance/AI-Coding-Workflow/flow-regression-runs/2026-06-30-coco-cli-headless-browser-static.md)：记录脚本执行后的 deterministic check 结果。

这些项目材料说明了一个通用原则怎样落地，但具体字段和目录属于项目实现，不应被当成所有 Agent 系统必须采用的标准。

## 【继续展开】

- **为什么结构化状态对长任务尤其重要？**
  - 继续阅读：[Agent 长任务通过任务分解、持久化状态与验收实现持续推进和恢复](./Agent%20长任务通过任务分解、持久化状态与验收实现持续推进和恢复.md)。
- **代码和模型应该分别拥有多少执行决策权？**
  - 继续阅读：[Agent 编排通过代码与模型分配不同范围的执行决策权](./Agent%20编排通过代码与模型分配不同范围的执行决策权.md)。

## 【参考资料】

[1] OpenAI. [Skills](https://developers.openai.com/plugins/concepts/skills)[EB/OL]. 核验日期：2026-10-07。

[2] OpenAI. [Build skills](https://developers.openai.com/plugins/build/skills)[EB/OL]. 核验日期：2026-10-07。

[3] Anthropic. [Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)[EB/OL].

[4] Anthropic. [Skill authoring best practices](https://platform.claude.com/docs/en/agents-and-tools/agent-skills/best-practices)[EB/OL]. 核验日期：2026-10-07。

[5] OpenAI. [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)[EB/OL]. 2026-02-11。

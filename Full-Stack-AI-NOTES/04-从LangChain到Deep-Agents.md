# 04 从 LangChain、LangGraph 到 Deep Agents

> 本章正文已整合进 [Agent 完整学习教程](./Agent学习教程.md) 第 9 章。
>
> 当前文件作为兼容入口保留，避免历史链接失效。

框架选型现在统一回到三个抽象层判断：

~~~text
Framework / Components
→ Model、Tool、Prompt、Agent API

Runtime / Orchestration
→ State、Graph、Checkpoint、Interrupt、Durable Execution

Harness
→ Planning、Filesystem、Context Offloading、Skills、Memory、Subagents、Sandbox、Approval
~~~

具体 API 和默认行为具有版本敏感性；稳定知识、当前官方文档入口和选型原则统一在 [Agent 完整学习教程](./Agent学习教程.md) 中维护。

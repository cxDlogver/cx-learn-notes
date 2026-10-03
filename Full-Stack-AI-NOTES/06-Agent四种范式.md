# 06 Agent 四种范式：从行动循环到多路径搜索

> 本章正文已整合进 [Agent 完整学习教程](./Agent学习教程.md) 第 12 章。
>
> 当前文件作为兼容入口保留，避免历史链接失效。

四种范式继续按控制粒度理解：

| 范式 | 控制粒度 |
| --- | --- |
| ReAct | Action |
| Plan-and-Execute | Task / Step |
| Reflexion | Trial |
| Tree of Thoughts | Candidate |

它们不是四套互斥 Agent 架构，也不等于 Multi-Agent Pattern。Reasoning / Control Pattern 与 Sequential、Concurrent、Manager、Handoff、Group Collaboration 等 Multi-Agent Orchestration Pattern 是两条正交维度，统一在 [Agent 完整学习教程](./Agent学习教程.md) 中维护。

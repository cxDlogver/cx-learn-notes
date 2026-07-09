# DeepAgents 课程讲义 Brief 与受众价值分析

---

## 一、课程讲义 Brief（基于 brief-writer 结构）

### 课程目标
让已有 LangChain.js/LangGraph.js 基础的 TypeScript 工程师掌握生产级 Agent 开发的工程方法论，跨越从 POC 到生产的鸿沟。

### 核心概念（5个）
1. **工程边界划分**：DeepAgents vs LangGraph 的职责分离
2. **Backend 抽象**：存储安全与沙箱隔离设计
3. **Skills + Subagents**：能力标准化与上下文隔离编排
4. **HITL 审批流**：敏感操作的人工介入机制
5. **三层可观测性**：主 Agent、子 Agent、Skills 日志体系

### Demo 指向汇总
| 模块 | 核心命令 |
|------|----------|
| 架构概览 | `npm init deepagent@latest` + `npm run dev` |
| Backend 安全 | `npm run dev -- --backend=sandbox` |
| Skills + Subagents | `npx deepagent create-skill` + `--debug-subagents` |
| HITL 审批 | `npm run dev -- --hitl --interrupt-on="write_file,execute"` |
| 可观测性 | `npm run dev -- --log-level=debug --log-subagents` |
| 生产部署 | `npx deepagent doctor --production` + `npx deepagent audit security` |

### 课堂练习设计
每模块配置 5 分钟改造任务：
1. 切换 Backend 类型观察状态持久化
2. 配置 CompositeBackend 读写分离
3. 创建带 matcher 的自定义 Skill
4. 增加路径参数的审批校验规则
5. 实现敏感信息的日志脱敏

### 风险点汇总（讲师重点提示）
1. 版本兼容：DeepAgents 与 LangGraph 强绑定
2. 沙箱逃逸：SandboxBackend 网络和挂载限制
3. 权限继承：子代理必须显式缩小权限
4. Checkpoint 丢失：生产必须用持久化存储
5. 日志泄露：工具参数脱敏不充分

---

## 二、课程受众价值分析（基于 order-analysis）

### 订单指标数据
```
course 产品线：128 笔订单，退款率 2.3%，平均席位数 2.4
```

### 业务含义
平均席位数 2.4 < 5，说明更偏**个人学习路径**，需要强调：
- 上手速度快（120 分钟从入门到生产配置）
- 低风险试错（提供完整 sandbox 环境）
- 可直接落地的代码和命令（不需要营销话术）

### 工程化行动建议
1. **Demo 优先**：每个模块以可运行命令开场，减少理论讲解
2. **风险前置**：每个模块末尾突出风险点，契合学员对安全和维护的关注
3. **代码可复用**：提供生产配置模板（Backend、权限、监控），学员可直接拷贝
4. **审批流程可视化**：HITL 模块重点演示审批日志和断点恢复，满足学员对人工审批的敏感需求

### 学员画像匹配度
| 学员关注点 | 课程覆盖方式 |
|------------|--------------|
| 工程边界 | 模块一明确 LangGraph vs DeepAgents 划分 |
| 可观测性 | 模块五完整日志体系 + trace 导出 |
| 审批流 | 模块四 HITL 完整演示（批准/拒绝/恢复） |
| 安全边界 | 模块二 Sandbox + VFS 权限控制 |
| 长期维护 | 模块五记忆管理 + 模块六生产部署审查 |
| 代码和运行命令 | 所有模块提供具体 npm 命令 |

# DeepAgents 通用智能体开发指南 - 课程大纲

**总时长：120分钟 | 目标学员：有 LangChain.js/LangGraph.js 基础的 TypeScript 工程师**

---

## 模块一：DeepAgents 架构概览与工程边界（20分钟）

### 目标
理解 DeepAgents 作为 Agent Harness 层的定位，清晰划分与 LangGraph 的工程边界。

### 核心概念
1. DeepAgents = LangGraph + 标准化工具 + VFS + Skills 管理 + 子代理编排 + 记忆管理
2. 边界划分：LangGraph 负责图状态与节点编排；DeepAgents 负责工程化抽象
3. 核心组件关系：Core → Backends → Skills → Subagents → HITL

### Demo 指向
```bash
npm init deepagent@latest ./my-agent
cd ./my-agent && npm install
npm run dev -- --task="列出当前目录结构"
```

### 练习
修改初始化项目的 backend 配置，从内存切换到文件系统后端，观察状态持久化差异。

### 风险点
- 过度封装导致调试定位困难
- DeepAgents 与 LangGraph 版本强绑定，升级需同步验证

---

## 模块二：Backend 存储抽象与安全沙箱（25分钟）

### 目标
掌握 Backend 选型策略和 Sandbox 安全加固方法，理解 VFS 权限控制机制。

### 核心概念
1. 五种 Backend 类型：State、Filesystem、Store、Composite、Sandbox
2. VFS 工具集权限控制：ls/read_file/write_file/edit_file/glob/grep
3. Sandbox 代码执行安全：生产环境必须使用隔离容器

### Demo 指向
```bash
npm run dev -- --backend=sandbox --task="执行 Python 脚本计算斐波那契数列"
npm run dev -- --task="在 /workspace 目录创建 config.json"
```

### 练习
配置 CompositeBackend 实现读写分离，写入路径使用 StoreBackend，读取路径使用 FilesystemBackend。

### 风险点
- Sandbox 配置不当导致容器逃逸
- write_file 默认覆盖行为导致误删
- 路径遍历攻击（../../etc/passwd）

---

## 模块三：Skills 能力封装与子代理编排（25分钟）

### 目标
学会标准化 Skills 开发，掌握子代理隔离编排和权限分级策略。

### 核心概念
1. SKILL.md Frontmatter 元数据规范
2. 按需加载机制：先匹配 frontmatter，再读详情
3. 子代理上下文隔离与权限分级
4. task 工具调用链设计

### Demo 指向
```bash
npx deepagent create-skill code-review
npm run dev -- --task="审查 src 目录代码质量" --debug-skills
npm run dev -- --task="请文档子代理生成API文档" --debug-subagents
```

### 练习
创建一个简单的代码格式化 Skill，配置 matcher 只在包含"格式化"或"format"关键词时触发。

### 风险点
- 子代理默认继承主 Agent 权限，必须显式缩小
- Skills matcher 过于宽泛导致误加载
- task 工具传递上下文过多导致 token 超限

---

## 模块四：Human-in-the-Loop 审批流设计（20分钟）

### 目标
掌握审批触发机制和断点恢复，理解不同审批交互模式的适用场景。

### 核心概念
1. interruptOn 敏感工具白名单配置
2. Checkpoint 持久化依赖
3. 三种审批模式：同步等待、异步回调、超时策略
4. 审批粒度：工具类型 + 参数校验

### Demo 指向
```bash
npm run dev -- --hitl --interrupt-on="write_file,execute"
npx deepagent approvals list
npx deepagent approvals approve <task-id>
npm run dev -- --resume <run-id>
```

### 练习
配置审批规则，只允许写入 /workspace 目录，拒绝写入 /etc 或 /root 目录的请求。

### 风险点
- 仅按工具类型审批，无法校验具体参数（如写入路径）
- 内存 checkpointer 重启后审批状态丢失
- 多个子代理同时等待审批导致资源耗尽

---

## 模块五：可观测性、日志与长期维护（20分钟）

### 目标
建立三层日志体系，掌握记忆管理策略和 Streaming 调试方法。

### 核心概念
1. 三层日志：主 Agent、子 Agent、Skills
2. 记忆管理：Namespace 隔离、TTL、LRU 清理
3. Streaming 事件输出与 token 用量追踪
4. 上下文压缩机制与失真风险

### Demo 指向
```bash
npm run dev -- --log-level=debug --log-subagents --log-skills
npx deepagent memory list --namespace=user-123
npx deepagent trace export <run-id> --format=json
```

### 练习
配置日志脱敏规则，隐藏 API_KEY 和 PASSWORD 环境变量的输出。

### 风险点
- 工具参数包含敏感信息，日志未脱敏
- 未配置 TTL 导致记忆存储无限膨胀
- 上下文压缩丢失重要信息导致执行错误

---

## 模块六：生产部署与风险审查（10分钟）

### 目标
掌握生产部署 Checklist 和风险自审方法，建立 Agent 运维思维。

### 核心概念
1. 发布前 Checklist：Backend、Sandbox、审批白名单、日志脱敏
2. 风险自审：权限最小化、边界检查、降级策略
3. 监控告警：超时、token 超限、审批积压、错误率

### Demo 指向
```bash
npx deepagent doctor --production
npx deepagent audit security
docker build -t my-agent:v1.0.0 .
```

### 练习
运行 deepagent audit security，修复至少 2 个发现的安全问题。

### 风险点
- 生产环境仍使用内存 Backend + 内存 checkpointer
- 缺少降级策略导致模型故障时完全不可用
- 子代理异常未被主 Agent 捕获和告警

---

## 课程交付物

| 交付物 | 说明 |
|--------|------|
| 可运行 Demo | 包含 Sandbox + HITL + Subagents 的完整示例 |
| 课程讲义 | 每个模块 PPT + 代码注释 + 风险对照表 |
| 风险审查清单 | 20 项生产部署必检项 |
| 发布准备模板 | Backend 配置、权限矩阵、监控告警配置 |

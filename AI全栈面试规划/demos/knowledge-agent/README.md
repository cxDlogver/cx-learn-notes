# 个人知识库 Agent

## 1. 当前状态

这是持续演进主 Demo 的工作目录。当前完成的是 **M-ADR 架构契约切片**，它先固定数据归属、信任边界、审批恢复链路和数据库骨架，避免后续把 Graph State、Checkpoint、业务数据库、向量库与队列混成同一种“状态”。

当前切片不等于 M0 完成：本机尚无 Docker，因此 PostgreSQL/pgvector 与 Redis/BullMQ 还没有实际启动和连接证据；React、NestJS、LangGraph.js 的最小纵向请求也尚未创建。

## 2. 已有产物

- [运行边界与请求生命周期](./docs/01-运行边界与请求生命周期.md)：ADR、模块图、数据放置、恢复与安全边界、验收场景。
- [架构契约](./contracts/architecture-contract.json)：供代码和测试读取的机器可检查约束。
- [第一版数据库迁移](./db/migrations/001_app_schema.sql)：业务表、版本表、审批、幂等、Outbox、审计和 pgvector Chunk。
- [契约验证器](./scripts/verify-contract.mjs)：检查关键状态是否只有一个明确归属、敏感副作用是否有审批和幂等策略、SQL 是否包含必要约束。

## 3. 运行验证

要求 Node.js 24 或更高版本：

```powershell
cd AI全栈面试规划/demos/knowledge-agent
npm run verify
```

通过只表示“架构契约内部一致、SQL 包含预期结构”，**不表示 SQL 已被 PostgreSQL 执行，也不表示 M0 服务可运行**。数据库迁移必须在真实 PostgreSQL + pgvector 上执行后，才能登记为运行证据。

## 4. 下一切片

下一步按 [Demo 组合规范](../../05-Demo组合规范.md) 进入 M0：建立 pnpm workspace，创建 React 控制台、NestJS API、LangGraph.js 无模型最小图，并让 `POST /runs` 的状态通过 SSE 或补偿查询映射到前端。PostgreSQL 与 Redis 接口先按本目录契约实现，实际联调未通过前保持 M0 未完成。

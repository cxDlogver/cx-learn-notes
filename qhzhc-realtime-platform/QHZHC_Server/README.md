# QHZHC Node.js 服务

TypeScript 服务同时提供登录注册、历史数据、天气代理、模拟器管理和 RobotSocket WebSocket。默认监听 `127.0.0.1:18080`，生产构建后还会托管 `../QHZHC_Web/dist`。

```bash
npm run typecheck
npm test
npm run build
npm run start
```

主要模块：

- `src/server/database.ts`：SQLite WAL、Session 和批量走航点事务；
- `src/server/simulator.ts`：每秒 1–2000 条、批次、暂停与故障注入；
- `src/server/robot-socket-hub.ts`：鉴权、握手、心跳、补传、背压；
- `src/server/weather.ts`：服务端天气代理与分时缓存；
- `src/server/app.ts`：HTTP API 与前端静态托管。

WebSocket 和前端恢复语义见项目根目录 `docs/websocket-and-rendering.md`。

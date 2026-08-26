# WebSocket 与高频渲染设计

## 1. 目标和边界

实时链路要同时满足四件事：数据库提交后的数据不丢序；断线后能从已确认位置续传；一批多条、每秒多批时不阻塞主线程；网络故障测试不能污染可视化页面。因此模拟控制只存在于 `/admin/simulator`，可视化页只消费数据。

## 2. 连接建立链路

1. 用户通过 HTTP 登录，服务端下发 `HttpOnly + SameSite=Lax` 的 Session Cookie。
2. 浏览器连接 `/ws/robots/QH-ZHC-01`；服务端在 Upgrade 阶段校验同一份 Session，匿名连接直接返回 401。
3. 浏览器必须在 5 秒内发送 `hello`，其中包含协议版本、车辆编号和最后已绘制序号。
4. 服务端返回 `welcome`，告知连接编号、心跳周期、当前最新序号和恢复起点。
5. 服务端查询 SQLite：若恢复点仍在保留窗口中，按每批最多 250 条进行 replay；超出窗口则返回 `gap`，要求 HTTP 快照恢复。
6. replay 完成后进入实时发布；客户端只对已经按帧交给可视化组件的数据发送 `ack`。

`hello` 让连接协商显式化，避免“Socket 已打开就假定双方状态一致”。协议版本不匹配、消息结构无效、车辆编号不一致都会使用业务关闭码终止。

## 3. 心跳、会话和重连

服务端同时使用两层保活：

- `ws ping/pong` 检测传输层是否仍可达；
- 应用层 `ping/pong` 更新业务活跃时间并返回最新序号。

每 8 秒检查一次，30 秒未活动或未响应协议心跳则终止连接。每轮检查还会重新验证 Session；会话过期使用 4001 关闭，前端不会无限重连到一个必然失败的会话。

可恢复断线采用 full-jitter 指数退避：上限为 `min(15000, 500 × 2^attempt)` 毫秒，实际等待在 250 ms 到上限之间随机。网络离线或页面隐藏时不重连；恢复在线、页面重新可见后立即尝试。4001、4003、4100 属于不可自动恢复错误。

页面进入后台时，浏览器的 `requestAnimationFrame` 会暂停。客户端会主动断开、清除未绘制帧并将有序缓冲区复位到“最后已绘制序号 + 1”；页面恢复后由 replay 补齐。这避免后台积压大量对象，也避免已接收但未绘制的数据被错误确认。

## 4. 顺序、重复与中断恢复

每个走航点在 SQLite 批量事务提交时获得单调递增 `sequence`。客户端 `OrderedTelemetryBuffer` 以期望序号为游标：

- 小于游标的数据视为重复 replay，直接忽略；
- 大于游标的数据暂存在 `Map<sequence, point>`；
- 游标命中后连续释放所有相邻数据；
- 发现缺口则发送 `resend(fromSequence, toSequence)`；
- 服务端最多补 5000 条，数据已被保留策略清理时返回 `gap`；
- 客户端通过 `/api/telemetry/latest` 获取 HTTP 快照，原子重置缓冲区后继续。

前端确认的是最后完成上屏的数据，不是最后到达网卡的数据。这个定义保证断开时宁可收到可去重的重复点，也不会漏掉尚未绘制的点。

## 5. 高频数据与浏览器渲染

链路各层都使用批处理：

| 层 | 策略 |
| --- | --- |
| 模拟器 | 按 `pointsPerSecond × batchInterval` 累积本批数量 |
| 数据库 | 一批数据放入单个 `BEGIN IMMEDIATE/COMMIT` 事务 |
| WebSocket | 一次消息携带 `TelemetryPoint[]`，replay 每批最多 250 条 |
| 顺序层 | 批量去重、排序释放，不为每个点创建定时器 |
| 帧队列 | 每帧最多 300 条且最多占用约 5 ms 主线程预算 |
| Vue 数据 | 一帧只做一次 `concat + slice`，保留最近 300 个展示点 |
| 二维/三维地图 | 同帧批次合并后跟随最新车位；浓度图元只保留最近 300 个 |
| 历史查询 | 超过上屏上限时按完整时间范围均匀采样，并保留首尾点 |

地图和图表仍使用原项目的 OpenLayers、Cesium 与 ECharts 组件。新链路只替换它们的数据入口，保留原来的图层、配色、大屏布局和走航车资源；仅隔离修复原项目在 1400px 以下将三列错误纵向堆叠的问题。车辆位置按浏览器帧合并到最新点，完整批次仍进入图表和有序游标；这样 2000 条/秒时不会强迫 Cesium 执行 2000 次镜头与车辆变换。

服务端若发现单个 WebSocket 的 `bufferedAmount` 超过 2 MiB，会用 1013 关闭慢客户端；客户端随后按最后 ack 位置恢复。相比无限堆积，这可以给慢浏览器明确的背压边界。

## 6. 故障注入与预期结果

| 模拟条件 | 预期行为 |
| --- | --- |
| 批次逆序/随机乱序 | 有序缓冲区等待缺口并按 sequence 上屏 |
| 重复点 | 序号去重，不重复绘制 |
| 传输丢弃 | 客户端发现 gap，先 resend，必要时 HTTP 快照 |
| 暂停插入 | Socket 保持连接，图表不产生伪数据 |
| 主动断开 | 指数退避重连，从最后 ack 位置 replay |
| 浏览器后台 | 主动释放帧积压；回到前台后 replay |
| Session 过期 | 服务端 4001 关闭，前端停止无效重连并回到登录流程 |

## 7. 关键源码

- `QHZHC_Server/src/server/robot-socket-hub.ts`：Upgrade 鉴权、握手、心跳、replay、背压。
- `QHZHC_Server/src/server/simulator.ts`：批量生成、暂停和故障条件。
- `QHZHC_Server/src/server/database.ts`：SQLite WAL、事务插入和历史查询。
- `QHZHC_Web/src/views/DataVisualization/services/realtimeClient.ts`：连接状态机、重连和 HTTP 恢复。
- `QHZHC_Web/src/views/DataVisualization/services/OrderedTelemetryBuffer.ts`：有序与去重。
- `QHZHC_Web/src/views/DataVisualization/services/FrameTelemetryQueue.ts`：浏览器帧预算。

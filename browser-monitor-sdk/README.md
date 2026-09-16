# cx-browser-monitor-sdk

`cx-browser-monitor-sdk` 是原生 JavaScript Browser Monitor SDK。当前已实现 Performance 采集内核，可以统一采集 LCP、FCP、INP、CLS、FPS 和 LoAF；Event、Error、Network、View、公共处理与发送链路仍处于目录设计阶段。

目录设计的核心原则是：浏览器 API 由 Instrumentation 统一负责，Collector 独立解释领域语义，公共数据处理与发送机制不归属任何单一 Collector。

Performance 内核只负责采集并通过订阅回调输出规范化指标，不会自行发送网络请求。

## 快速开始

```ts
import { createPerformanceMonitor } from 'cx-browser-monitor-sdk';

const monitor = createPerformanceMonitor();

const unsubscribe = monitor.subscribe((metric) => {
  // 把指标交给业务自己的处理或上报链路。
  console.log(metric.name, metric.value, metric.unit);
});

// 先订阅再启动，避免错过 buffered 性能数据。
monitor.start();

// 页面或应用彻底销毁时执行。stop() 是终止操作，实例不能再次启动。
unsubscribe();
monitor.stop();
```

浏览器直接引用 IIFE 构建时，工厂位于 `CXMonitorSDK.createPerformanceMonitor`。

## 性能指标

| 指标 | 数据来源                | 单位  | 语义                         |
| ---- | ----------------------- | ----- | ---------------------------- |
| LCP  | `web-vitals`            | ms    | Core Web Vital，加载体验     |
| FCP  | `web-vitals`            | ms    | 首次内容绘制诊断指标         |
| INP  | `web-vitals`            | ms    | Core Web Vital，交互响应体验 |
| CLS  | `web-vitals`            | score | Core Web Vital，布局稳定性   |
| FPS  | `requestAnimationFrame` | fps   | 页面可见期间的周期帧率样本   |
| LoAF | `PerformanceObserver`   | ms    | 长动画帧诊断记录             |

SDK 不会把原始 `PerformanceEntry`、DOM 节点、脚本 URL 或 `navigationURL` 交给订阅者。LoAF 只保留耗时分解和脚本数量等数值摘要。

```ts
const monitor = createPerformanceMonitor({
  metrics: {
    FPS: true,
    LoAF: true,
  },
  webVitals: {
    reportAllChanges: false,
  },
  fps: {
    sampleWindowMs: 5_000,
    sampleIntervalMs: 30_000,
  },
  loaf: {
    minDurationMs: 50,
    maxEntriesPerVisit: 20,
  },
});
```

所有指标默认开启。`metrics` 中没有填写的指标继续使用开启状态；只有显式设置为 `false` 才会关闭。

### 生命周期与兼容性

- 每个 Window 只创建一个 Monitor 实例；重复调用 `start()` 不会重复注册采集器。
- `stop()` 会断开 LoAF Observer、FPS 回调、定时器和页面生命周期监听，并阻止延迟到达的 Web Vitals 通知。
- FPS 在页面可见时立即采样 5 秒，完成后等待 30 秒再采下一组；页面隐藏时丢弃未完成窗口，恢复可见时重新采样。
- bfcache 恢复会建立新的访问边界，重置 LoAF 条数并重新启动 FPS；本版本不按 SPA 软导航拆分指标。
- 不支持某项浏览器 API 时不会产生伪造的零值。可以使用 `monitor.getCapabilities()` 查询实际能力。
- LoAF 目前不是全浏览器能力；不支持时 `LoAF` capability 为 `false`，SDK 不会用 Long Task 冒充。

## 环境要求

- Node.js 20 或更高版本
- pnpm 10.28.2 或更高版本

## 本地开发

```bash
pnpm install
pnpm dev
```

常用质量命令：

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm publint
pnpm check
```

## 构建产物

执行 `pnpm build` 后生成：

- `dist/index.js`：供现代构建工具使用的 ESM 入口。
- `dist/index.global.js`：供浏览器 `<script>` 标签使用的 IIFE 入口，全局名称为 `CXMonitorSDK`。
- `dist/index.d.ts`：TypeScript 类型声明。
- 对应的 Source Map 文件。

## 架构边界

| 层级              | 职责                                                          |
| ----------------- | ------------------------------------------------------------- |
| `core`            | 组合各模块，管理配置、生命周期和订阅出口                      |
| `instrumentation` | 统一注册浏览器 Hook；当前实现 PerformanceObserver             |
| `collectors`      | 将原始信号解释为遥测数据；当前实现 Performance                |
| `context`         | 在事件发生时生成页面、视图、会话、用户、设备和 SDK 上下文快照 |
| `processing`      | 依次完成规范化、脱敏、去重、采样和限流                        |
| `transport`       | 负责队列、批处理、发送、重试和主动刷新                        |
| `protocol`        | 定义跨模块原始信号、统一信封和各类 Payload 协议               |
| `shared`          | 保存经过审查、无领域归属且无业务状态的最小共享能力            |

Vue、React 等框架组件适配、Session Replay、Node.js 监控以及服务端存储和告警平台不属于该 Browser SDK 的责任范围。

Monitor SDK 的目标、完整数据链路和现有目录划分原因见 [目标、监控链路与目录设计](./docs/project-specification.md)。

## 发布前检查

```bash
pnpm check
pnpm pack --dry-run
```

发布包仅包含构建产物、README、CHANGELOG、许可证和必要的包元数据。

## License

[MIT](./LICENSE)

IIFE 构建内联的第三方依赖及其许可证见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。

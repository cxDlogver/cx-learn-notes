/** Shared, versioned RUM contract. Values are milliseconds unless stated otherwise. */
export const THRESHOLD_VERSION = "2026-09-07.1";
export interface MetricDefinition {
  name: string;
  title: string;
  unit: string;
  reason: string;
  method: string;
  good?: number;
  poor?: number;
  direction?: "higher";
  standard?: boolean;
  percentile?: number;
  source: string;
}
const standard = "https://web.dev/articles/vitals";
const custom = "项目初始工程目标；桌面前台可见，按场景和版本校准";
export const DEFINITIONS: MetricDefinition[] = [
  {
    name: "LCP",
    title: "LCP（Largest Contentful Paint）",
    unit: "ms",
    reason: "主要内容出现速度",
    method: "文档导航 P75；SPA 进入不适用，不能代表 Canvas / WebGL 就绪",
    good: 2500,
    poor: 4000,
    standard: true,
    percentile: 0.75,
    source: standard,
  },
  {
    name: "INP",
    title: "INP（Interaction to Next Paint）",
    unit: "ms",
    reason: "用户操作响应",
    method: "web-vitals 文档生命周期 P75；无交互不填零，混合路由不评级",
    good: 200,
    poor: 500,
    standard: true,
    percentile: 0.75,
    source: standard,
  },
  {
    name: "CLS",
    title: "CLS（Cumulative Layout Shift）",
    unit: "score",
    reason: "意外布局跳动",
    method: "web-vitals 会话窗口算法，访问 P75",
    good: 0.1,
    poor: 0.25,
    standard: true,
    percentile: 0.75,
    source: standard,
  },
  {
    name: "FCP",
    title: "FCP（First Contentful Paint）",
    unit: "ms",
    reason: "首个可见内容与白屏诊断",
    method: "文档导航 P75",
    good: 1800,
    poor: 3000,
    standard: true,
    percentile: 0.75,
    source: "https://web.dev/articles/fcp",
  },
  {
    name: "TTFB",
    title: "TTFB（Time to First Byte）",
    unit: "ms",
    reason: "初始请求诊断",
    method: "文档导航 P75；指导性阈值",
    good: 800,
    poor: 1800,
    standard: true,
    percentile: 0.75,
    source: "https://web.dev/articles/ttfb",
  },
  {
    name: "fps",
    title: "FPS（Frames Per Second）",
    unit: "FPS",
    reason: "主线程帧调度流畅性",
    method: "requestAnimationFrame（rAF）估算；5 秒窗口均值；非屏幕真实帧率；60 Hz 参考档位",
    good: 55,
    poor: 30,
    direction: "higher",
    source: "https://web.dev/articles/smoothness",
  },
  {
    name: "eventLoop",
    title: "ELD（Event Loop Delay）",
    unit: "ms",
    reason: "主线程调度阻塞",
    method: "100 ms 自重置计时，P95",
    good: 20,
    poor: 100,
    source: custom,
  },
  {
    name: "loafBlocking",
    title: "LoAF-BR（Long Animation Frame Blocking Ratio）",
    unit: "%",
    reason: "长动画帧造成的阻塞",
    method: "Σ blockingDuration / 有效观察时长；不与 Long Task 相加",
    good: 1,
    poor: 5,
    source: "https://w3c.github.io/long-animation-frames/",
  },
  {
    name: "chartUpdate",
    title: "CUT（Chart Update Time）",
    unit: "ms",
    reason: "定位配置生成和更新调用",
    method: "updateOptions 全调用 P95；非完整绘制时间",
    good: 8,
    poor: 16.7,
    source: custom,
  },
  {
    name: "mapUpdate",
    title: "MUT（Map Update Time）",
    unit: "ms",
    reason: "定位要素和实体更新",
    method: "按地图分组的更新调用 P95；非 GPU 耗时",
    good: 8,
    poor: 16.7,
    source: custom,
  },
  {
    name: "receiveApply",
    title: "RAT（Receive-to-Apply Time）",
    unit: "ms",
    reason: "实时处理链路延迟",
    method: "同一单调时钟，接收至同步状态应用完成 P95",
    good: 100,
    poor: 500,
    source: custom,
  },
  {
    name: "queueWait",
    title: "QWT（Queue Waiting Time）",
    unit: "ms",
    reason: "消费积压",
    method: "已消费批次入队到取出 P95",
    good: 50,
    poor: 200,
    source: custom,
  },
  {
    name: "wsRtt",
    title: "WS-RTT（WebSocket Round-Trip Time）",
    unit: "ms",
    reason: "网络与应用调度诊断",
    method: "本地 performance.now 匹配 ping/pong nonce，P95",
    good: 100,
    poor: 300,
    source: custom,
  },
  {
    name: "apiDuration",
    title: "API-RT（Application Programming Interface Response Time）",
    unit: "ms",
    reason: "请求等待",
    method: "包括刷新重试的逻辑请求 P95，按路径分组",
    good: 300,
    poor: 1000,
    source: custom,
  },
  {
    name: "ready",
    title: "BRT（Business Ready Time）",
    unit: "ms",
    reason: "首批数据、可见图表和当前地图就绪",
    method: "导航开始至首批业务绘制信号 P75；3D 阈值 3000/8000 ms",
    good: 2000,
    poor: 5000,
    percentile: 0.75,
    source: custom,
  },
  ...[
    ["received", "RPR（Received Points Rate）", "points/s"],
    ["consumed", "CPR（Consumed Points Rate）", "points/s"],
    ["queueLength", "QL（Queue Length）", "points"],
    ["queueOldest", "OQDA（Oldest Queued Data Age）", "ms"],
    ["chartCount", "CUR（Chart Update Rate）", "calls/s"],
    ["points", "CDP（Chart Data Points）", "points"],
    ["mapObjects", "MOC（Map Object Count）", "objects"],
    ["parse", "PST（Parsing and Sorting Time）", "ms"],
    ["queueTake", "QDT（Queue Dequeue Time）", "ms"],
    ["queueCallback", "QCT（Queue Callback Time）", "ms"],
    ["chartConfig", "CCGT（Chart Configuration Generation Time）", "ms"],
    ["chartSetOption", "SCT（SetOption Call Time）", "ms"],
    ["disconnect", "WSDC（WebSocket Disconnection Count）", "count"],
    ["reconnect", "WSRT（WebSocket Reconnection Time）", "ms"],
    ["resend", "RRC（Replay Request Count）", "count"],
    ["gap", "SGC（Sequence Gap Count）", "count"],
    ["apiFailure", "API-FR（Application Programming Interface Failure Rate）", "%"],
    ["apiCancel", "API-CR（Application Programming Interface Cancellation Rate）", "%"],
    ["apiAttempts", "API-AC（Application Programming Interface Attempt Count）", "count"],
    ["heap", "JSHU（JavaScript Heap Usage）", "bytes"],
    ["longTask", "LTD（Long Task Duration）", "ms"],
    ["resource", "RLT（Resource Load Time）", "ms"],
  ].map(([name, title, unit]) => ({
    name: name!,
    title: title!,
    unit: unit!,
    reason: "辅助定位，结合场景与基线解释",
    method: "诊断指标，不使用统一达标阈值",
    source: custom,
  })),
];
export const DEFINITION_MAP = new Map(DEFINITIONS.map((d) => [d.name, d]));
export type Rating = "good" | "needs-improvement" | "poor" | "diagnostic";
export function rating(name: string, value: number, mapType = "2d", referenceHz = 60): Rating {
  const d = DEFINITION_MAP.get(name);
  if (!d || d.good === undefined || d.poor === undefined) return "diagnostic";
  const good =
    name === "ready" && mapType === "3d"
      ? 3000
      : name === "fps"
      ? referenceHz === 60
        ? 55
        : referenceHz * 0.92
      : d.good;
  const poor =
    name === "ready" && mapType === "3d" ? 8000 : name === "fps" ? referenceHz * 0.5 : d.poor;
  return d.direction === "higher"
    ? value >= good
      ? "good"
      : value < poor
      ? "poor"
      : "needs-improvement"
    : value <= good
    ? "good"
    : value > poor
    ? "poor"
    : "needs-improvement";
}
// Logarithmic buckets: mergeable, bounded, <5% bucket-width error. Zero has its own bucket.
export interface Distribution {
  count: number;
  sum: number;
  max: number;
  bins: Record<string, number>;
}
export function emptyDistribution(): Distribution {
  return { count: 0, sum: 0, max: 0, bins: {} };
}
export function observe(d: Distribution, value: number): void {
  if (!Number.isFinite(value) || value < 0) return;
  const key =
    value === 0 ? "zero" : String(Math.ceil(Math.log(Math.max(0.000001, value)) / Math.log(1.05)));
  d.count++;
  d.sum += value;
  d.max = Math.max(d.max, value);
  d.bins[key] = (d.bins[key] || 0) + 1;
}
export function merge(a: Distribution, b: Distribution): Distribution {
  a.count += b.count;
  a.sum += b.sum;
  a.max = Math.max(a.max, b.max);
  for (const [k, v] of Object.entries(b.bins)) a.bins[k] = (a.bins[k] || 0) + v;
  return a;
}
export function quantile(d: Distribution, p: number): number | null {
  if (!d.count) return null;
  let n = 0;
  for (const k of Object.keys(d.bins).sort(
    (a, b) => (a === "zero" ? -Infinity : Number(a)) - (b === "zero" ? -Infinity : Number(b))
  )) {
    n += d.bins[k] || 0;
    if (n >= Math.ceil(d.count * p))
      return Math.min(d.max, k === "zero" ? 0 : Math.pow(1.05, Number(k)));
  }
  return d.max;
}
export interface Context {
  mapType: "2d" | "3d";
  mode: "realtime" | "history" | "initial" | "replay";
  dataSize: "small" | "medium" | "full";
  browser: string;
  device: "desktop" | "mobile";
  viewport: "small" | "medium" | "large";
  referenceHz: number;
}
export interface MetricSample {
  name: string;
  component: string;
  distribution: Distribution;
  metricId?: string;
  version?: number;
  value?: number;
  durationMs?: number;
  complete?: boolean;
}
export interface TimelineEvent {
  name: string;
  at: number;
  component: string;
  value?: number;
  status: string;
}
export interface PerformanceBatch {
  schemaVersion: 1;
  batchId: string;
  sessionId: string;
  documentId: string;
  viewId: string;
  release: string;
  environment: "development" | "production";
  thresholdVersion: string;
  context: Context;
  startedAt: number;
  endedAt: number;
  activeMs: number;
  complete: boolean;
  eligible: boolean;
  mixed: boolean;
  visible: boolean;
  dropped: number;
  capabilities: Record<string, boolean>;
  missing: Record<string, string>;
  metrics: MetricSample[];
  events: TimelineEvent[];
}
export interface PerformanceQuery {
  from: number;
  to: number;
  page: number;
  limit: number;
  filters: Record<string, string>;
}

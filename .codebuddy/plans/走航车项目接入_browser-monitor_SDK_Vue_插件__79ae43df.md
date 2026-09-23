---
name: 走航车项目接入 browser-monitor SDK（Vue 插件）
overview: 在走航车项目 QHZHC_Web（Vue 2 + vue-cli 5）中以插件形式接入 browser-monitor SDK，通过 pnpm workspace 引入，仅采集登录后的 /dataVisualization 页面（Web Vitals + FPS/LoAF + 路由视图），数据直送本地 browser-monitor 平台，不实现走航车自建的 SQLite 监控后端。
todos:
  - id: setup-workspace-deps
    content: 配置 pnpm workspace：根 pnpm-workspace.yaml 加入走航车 Web 包，QHZHC_Web 增加 workspace 依赖，构建 protocol 与 SDK 并验证安装
    status: completed
  - id: prepare-platform-project
    content: 在 browser-monitor 平台创建走航车项目，配置 appName、allowed_origins 含 9527 来源，取 publicKey 并组装 DSN
    status: completed
  - id: write-monitor-plugin
    content: 编写 src/plugins/monitor.ts：SDK 创建与启停、hash 路由 resolveRouteName、能力开关与环境变量
    status: completed
    dependencies:
      - setup-workspace-deps
  - id: wire-plugin-and-scope
    content: 在 main.ts 安装插件并在 router 中限定仅 /dataVisualization 采集，补充 Vue 原型类型声明
    status: completed
    dependencies:
      - write-monitor-plugin
      - prepare-platform-project
  - id: verify-end-to-end
    content: 执行 typecheck 与 build，并在浏览器中验证 view、LCP、FPS 上报到平台（accepted 增长、rejected 为 0）
    status: completed
    dependencies:
      - wire-plugin-and-scope
  - id: update-docs-and-readme
    content: 更新走航车 README 性能监控章节与接入说明，阐明与自建 SQLite 监控设计文档的关系
    status: completed
    dependencies:
      - verify-end-to-end
---

## 产品概述

在走航车可视化平台（`qhzhc-realtime-platform`）的前端 `QHZHC_Web` 中，以 **Vue 插件**形式接入工作区内的 browser-monitor SDK（`cx-browser-monitor-sdk`），把浏览器端性能数据直接上报到已部署的 browser-monitor 平台（平台自带聚合、看板与实验室测试），**不再实现**走航车设计文档中自建的 SQLite 性能监控后端。

## 核心功能

1. **SDK 插件封装**：新增 Vue 2 插件 `src/plugins/monitor.ts`，统一负责 SDK 创建、启动、停止、用户身份与视图命名，对外暴露 `Vue.prototype.$monitor`，与项目现有 `Vue.prototype.$axios / $echarts` 的注入风格保持一致。
2. **采集范围限定**：仅在登录后的 `/dataVisualization` 页面（2D/3D 地图、图表、实时数据流所在页）开启采集，进入即启动、离开即停止，其他路由与登录页不采集。
3. **采集能力**（三项，不含业务自定义事件、不含 JS 错误与网络请求）：

- Web Vitals：LCP / FCP / INP / CLS
- FPS 与 LoAF（大屏实时渲染场景重点关注帧率与长任务）
- 路由视图：`view.start` / `view.end`

4. **依赖引入**：通过根 `pnpm-workspace.yaml` 以 `workspace:*` 方式引入 SDK，不再走 npm 安装。
5. **数据直送平台**：上报到平台 ingest 端点，由平台完成投影、评分、聚合与看板展示；走航车侧不存监控数据。
6. **可开关、零侵入**：通过 `VUE_APP_*` 构建变量控制开关与 DSN，未配置时静默不采集，不影响任何业务功能、返回值与异常路径。

## 关键约束（已核实）

- 走航车使用 **hash 路由**（README 中入口形如 `/#/admin/performance`），而 SDK 会对 URL 清洗掉 query 与 fragment，默认会把所有 hash 路由归并成同一个 `pathname = /`。因此插件**必须**提供 `view.resolveRouteName`，从 `location.hash` 解析出真实路由名，否则平台侧 `route_name` 全部相同、无法区分页面。
- 平台 ingest 路径为 `POST /api/v3/ingest/:publicKey/envelopes`（官网插件中残留的 `/api/v2/` 已过期，以当前代码为准）；平台 API 已开启 CORS，跨域直报可行。
- 走航车 devServer 只代理 `/api` → 走航车后端 18080，因此 DSN **不能**使用 `/api/...` 相对路径，必须使用指向监控平台的绝对地址。

## 技术栈

| 层 | 选型 | 说明 |
| --- | --- | --- |
| 接入方 | Vue 2.6 + vue-cli-service 5（webpack 5）+ TypeScript（strict） | `QHZHC_Web`，npm workspaces 成员 |
| SDK | `cx-browser-monitor-sdk`（workspace 包，ESM + IIFE，tsup target es2020，含 d.ts） | 内部依赖 `web-vitals 6.2.1`，已打包 `@browser-monitor/protocol`（`noExternal`） |
| 依赖解析 | 根 `pnpm-workspace.yaml` | 新增走航车 Web 子包为 workspace 成员 |
| 接收端 | browser-monitor 平台 API（Fastify/Nest，端口 3000） | 已启用 CORS（`origin: true`），已支持 OPTIONS 预检 |
| 校验 | `npm run typecheck`（QHZHC_Web 严格 tsc）+ `npm run build` | 必须全部通过 |


## 实现方案

### 核心策略

**插件只做"生命周期与配置"，采集语义全部交给 SDK。** 插件不自己拼 HTTP、不重复实现计时与队列，只负责：创建实例 → 按路由开关 → 暴露实例 → 保证业务零侵入。

### 关键技术决策与取舍

1. **pnpm workspace 接入方式（主方案 + 回退）**

- 主方案：在根 `pnpm-workspace.yaml` 增加 `qhzhc-realtime-platform/QHZHC_Web`（**只加 Web 子包，不触碰 `QHZHC_Server` 与走航车的 npm workspaces 结构**），`QHZHC_Web/package.json` 增加 `"cx-browser-monitor-sdk": "workspace:*"`，在仓库根执行 `pnpm install` 生成链接。
- `workspace:*` 协议 npm 不支持，因此**必须先构建 SDK**（`dist` 是 workspace 依赖的解析目标）：`pnpm --filter @browser-monitor/protocol build` → `pnpm --filter cx-browser-monitor-sdk build`。
- 回退方案（若 pnpm 与走航车现有 `package-lock.json` / npm 流程冲突）：`pnpm --filter cx-browser-monitor-sdk pack` 产出 tgz，在 `QHZHC_Web` 用 `"cx-browser-monitor-sdk": "file:../../browser-monitor/sdk/dist-tgz/..."` 安装。优先保证 `npm run dev` 与 `npm run verify` 不回归。

2. **上报地址：绝对 DSN，不走 devServer 代理**

- DSN = `http://127.0.0.1:3000/api/v3/ingest/<publicKey>/envelopes`，通过 `VUE_APP_MONITOR_DSN` 注入。
- 理由：`vue.config.js` 已把 `/api` 代理到走航车后端 18080，相对路径会被误转发；平台已开 CORS 且允许 `content-type` 头，跨域直报无需改代理配置。
- 不新增 `transport.headers`（平台 `allowedHeaders` 仅放行 `content-type` / `x-csrf-token` / `x-request-id`，额外头会导致预检失败）。

3. **采集范围控制：在路由钩子里 start/stop，并明确取舍**

- 采用 `router.afterEach`：进入 `/dataVisualization` 时 `start()`，离开时先 `flush()` 再 `stop()`。
- **取舍说明**：SDK `start()` 必然会以当前 URL 创建一个 initial view；切换路由时 `history.hashchange` 已先于 `afterEach` 触发，因此离开瞬间会额外产生一条相邻路由的 `view.start`。替代方案（`beforeEach` 里 stop）虽无噪声，但会丢掉 `view.end`，导致该访问的停留时长缺失、且 LCP 样本只能靠平台 5 分钟超时兜底才置 final。
- **选择保证 `view.end` 完整性**，噪声通过在平台侧按 `routeName` 过滤消除。此取舍需在代码注释与文档中写明。

4. **hash 路由必须自定义 `resolveRouteName`（必须实现，否则数据不可用）**

- SDK 的 `ViewContext` 会清洗掉 URL 的 query 与 fragment，hash 模式下 `pathname` 恒为 `/`。
- 插件必须传入 `view.resolveRouteName`，从 `snapshot.hash`（形如 `#/dataVisualization`）解析出路由名，使平台侧 `route_name` 可区分。

5. **延迟 start 仍能取到 LCP/FCP**

- web-vitals 内部使用 `po.observe({ type, buffered: true })`，因此进入页面后才 `start()` 依然能取到本次硬导航已发生的 LCP/FCP 条目，不会漏采首屏。

6. **软导航默认关闭并在文档中说明**

- 走航车从 `/login` 跳到 `/dataVisualization` 是 hash 软导航；默认 `reportSoftNavs=false` 时该页不会产生新的 LCP（LCP 只归因到发起的硬导航）。
- 保持默认关闭：开启会让"相对软导航起点"的 LCP 与硬导航 LCP 混进同一分布，污染 p75 与良好率（已在平台侧聚合分析中确认该风险）。

7. **类型解析**

- `QHZHC_Web/tsconfig.json` 为 `module: ESNext` + `moduleResolution: "Node"`（经典解析，读 SDK 的 `main` / `types` 字段即可命中 `dist/index.d.ts`），无需改动；若后续 tsc 报找不到类型，再评估升级为 `NodeNext` / `Bundler`。
- 需新增 Vue 2 的类型增强声明，让 `this.$monitor` 与 `Vue.prototype.$monitor` 有类型。

## 目录结构

```text
f:/CX_notes/cx-learn-notes/
├── pnpm-workspace.yaml                                  # [MODIFY] 新增 qhzhc-realtime-platform/QHZHC_Web 为 workspace 成员
├── browser-monitor/
│   ├── protocol/                                        # [BUILD] 需先构建（SDK dts 依赖）
│   └── sdk/                                             # [BUILD] tsup 构建出 dist/index.js + index.d.ts
└── qhzhc-realtime-platform/
    ├── README.md                                        # [MODIFY] 性能监控章节补充"现改为直报 browser-monitor 平台"及与自建设计文档的关系
    └── QHZHC_Web/
        ├── package.json                                 # [MODIFY] 增加 "cx-browser-monitor-sdk": "workspace:*"
        ├── .env.local.example 或 README 环境变量表      # [MODIFY/NEW] VUE_APP_MONITOR_ENABLED / DSN / RELEASE
        └── src/
            ├── plugins/
            │   └── monitor.ts                           # [NEW] Vue 2 插件：创建/启动/停止 SDK、resolveRouteName、暴露 $monitor
            ├── types/
            │   └── monitor.d.ts                         # [NEW] Vue 2 原型类型增强（$monitor），可选并入 shims-vue.d.ts
            ├── main.ts                                  # [MODIFY] Vue.use(monitorPlugin)
            └── router/index.ts                          # [MODIFY] afterEach 按路径控制 start/stop（或由插件内部注册钩子）
```

## 关键代码结构

```ts
// src/plugins/monitor.ts（对外契约，非完整实现）
import type { PluginObject } from 'vue';
import type { Monitor, RouteLocation } from 'cx-browser-monitor-sdk';

export interface MonitorPluginOptions {
  enabled: boolean;      // VUE_APP_MONITOR_ENABLED
  dsn: string;           // VUE_APP_MONITOR_DSN，形如 http://host:3000/api/v3/ingest/<pk>/envelopes
  appName: string;       // 必须与平台项目 appName 完全一致，否则逐条 app_name_mismatch 拒绝
  release: string;       // VUE_APP_RELEASE
  environment: string;   // development / production
  /** 采集生效的路由名集合，默认 ['/dataVisualization'] */
  watchedRoutes?: readonly string[];
}

export declare const monitorPlugin: PluginObject<MonitorPluginOptions>;

/** 从 hash 路由解析稳定路由名；hash 模式下必须提供，否则 route_name 全部为 '/' */
export declare function resolveRouteName(location: RouteLocation): string | undefined;
```

## 实现注意事项（执行细节）

- **守卫顺序**：插件内部若注册 `router.afterEach`，需保证在 `main.ts` 中 `Vue.use(plugin, options)` 传入 router，或由 `router/index.ts` 显式调用；避免与现有 `beforeEach` 鉴权逻辑竞争。
- **幂等与安全**：SDK 的 `start/stop/destroy` 均幂等，重复调用安全；插件所有操作必须包在 try/catch 内，**任何监控异常不得冒泡到业务调用栈**（与走航车设计文档"监控不得覆盖业务返回值与异常"的约束一致）。
- **FPS 采样开销**：默认 `sampleWindowMs=5000 / sampleIntervalMs=30000`，对大屏渲染场景已是低频采样，保持默认即可，不额外提高频率。
- **LoAF 开销**：默认 `minDurationMs=50`、每 View 最多 20 条，保持默认。
- **采样率**：保持默认 `samplingRate=1`（内网项目量级小）；后续量大再调，且采样是"按会话稳定采样"，不会出现链路碎片。
- **性能影响面**：SDK 会包装 `history.pushState/replaceState`、注册 `PerformanceObserver`、页面生命周期监听；需确认离开页面时 `stop()` 被调用，避免定时器长期驻留。
- **不要改动**：`vue.config.js` 的 `/api` 与 `/ws` 代理规则（注释明确禁止代理 `/ws`），本次接入不触碰。

## 验证方式

1. `npm run typecheck`（走航车严格 tsc，含 `QHZHC_Web/tsconfig.json`）与 `npm run build` 必须通过。
2. 浏览器进入 `/#/dataVisualization`，确认：

- 平台 `raw-events` 出现该会话事件；
- `service-status` 的 `accepted` 增长、`rejected` 为 0（非 0 需看 `rejections` 的 code：常见 `app_name_mismatch`、`origin_not_allowed`）；
- 平台看板 24 小时内出现 `route_name = /dataVisualization` 的 LCP / FPS / view 样本。

3. 离开该页后确认 `view.end` 有 `ended_at`，且不再产生新的性能样本。
4. 关闭 `VUE_APP_MONITOR_ENABLED` 后回归：页面功能、控制台无异常、无网络上报。
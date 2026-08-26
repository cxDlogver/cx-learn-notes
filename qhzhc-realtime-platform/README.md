# 清华走航车可视化平台（原界面重构版）

本项目不是重新画一套界面，而是先完整复制 `2024_QH_ZHC`，再在副本中收敛功能并替换运行时。原数据可视化页面、二维 OpenLayers 地图、三维 Cesium 地图、图表布局、`truck.png` 和 `Cesium_Car.glb` 均沿用原项目。

当前只保留：

- 首页 `/index`
- 登录 `/login`、注册 `/register`
- 实时与历史数据可视化 `/dataVisualization`
- 独立的管理员模拟后台 `/admin/simulator`

模拟后台不嵌入数据可视化页面。新闻、团队、成果、数据资源和旧管理页面已从活动源码移到 `legacy-reference/QHZHC_Web_removed_modules`，便于追溯但不会参与路由和构建。

## 技术结构

```text
.
├── QHZHC_Web/       # 原 Vue 2 界面；活动业务脚本全部使用 TypeScript
├── QHZHC_Server/    # Node.js + Express + ws + node:sqlite，全部 TypeScript
├── docs/            # 架构、WebSocket 和性能设计
└── legacy-reference/
    ├── QHZHC_Server_Django/       # 原 Django 服务，仅作参考
    ├── QHZHC_fileter_Python/      # 原 Python 数据脚本，仅作参考
    └── QHZHC_Web_removed_modules/ # 已取消的前端板块
```

活动运行时不再依赖 Python、Django 或 PostgreSQL。Node.js 服务使用 SQLite WAL，并在一次事务内批量写入同一批走航点。

## 环境与启动

- Node.js 24 或更高版本（使用内置 `node:sqlite`）
- npm 10 或更高版本

```bash
cd /Users/bytedance/cx/spec-2/cxdlogver/cx-learn-notes/qhzhc-realtime-platform
npm install
npm run dev
```

`npm run dev` 会同时启动前后端；任一进程启动失败时会停止另一进程并返回非零状态。后端默认不启用文件监听，以避免大型原项目及依赖目录触发 macOS 的 `EMFILE: too many open files`。需要单独监听后端源码时可执行：

```bash
npm run dev:watch -w QHZHC_Server
```

开发地址：

- 前端：`http://127.0.0.1:9527`
- HTTP API 与 WebSocket：`http://127.0.0.1:18080`

默认管理员账号：

```text
admin / Admin@123456
```

生产构建并由 Node.js 统一托管：

```bash
npm run build
npm run start
```

可选环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `HOST` | `127.0.0.1` | Node.js 监听地址 |
| `PORT` | `18080` | HTTP 与 WebSocket 端口 |
| `DATABASE_PATH` | `.data/qhzhc.sqlite` | SQLite 文件，相对服务端工作目录 |
| `SESSION_TTL_HOURS` | `24` | 登录会话有效期 |
| `TELEMETRY_RETENTION` | `100000` | 服务端保留的最新走航点数 |
| `VUE_APP_API_BASE_URL` | 自动使用 `18080` | 前端 API 地址 |

## 模拟后台

管理员登录后访问 `/admin/simulator`，可配置：

- 每秒 1–2000 条数据；
- 50–2000 ms 批处理周期；
- 路线、环线和突发三种轨迹模式；
- 批次逆序、随机乱序；
- 重复率、传输丢弃率；
- 启动、暂停、立即插入 200 条、主动断开全部 WebSocket。

模拟数据先在一个 SQLite 事务中完成批量提交，再作为一个 WebSocket 批次发布，前端不会因“数据库已广播但事务回滚”产生幽灵数据。

## 质量检查

```bash
npm run verify
npm run test:integration -w QHZHC_Server
```

前端的 `.ts` 文件由严格 `tsc` 检查；Vue CLI 构建使用项目内的轻量转译加载器，以兼容原项目依赖和 Vue 2 单文件组件。WebSocket 集成测试需要允许测试进程临时监听本机随机回环端口。

`npm run verify` 会依次检查原版可视化模板、桌面端样式与车辆资源，执行前后端 TypeScript 检查和 70 个单元测试，再完成两端生产构建。原项目在 1400px 以下把三列错误堆成纵向的规则已隔离修复，不影响大屏视觉基线。

浏览器自动化验收截图保存在 `reports/`：

- `browser-home.png`
- `browser-visualization-2d.png`
- `browser-visualization-3d.png`
- `browser-visualization-3d-map.png`
- `browser-simulator-admin.png`

设计细节见 [WebSocket 与高频渲染设计](docs/websocket-and-rendering.md)。

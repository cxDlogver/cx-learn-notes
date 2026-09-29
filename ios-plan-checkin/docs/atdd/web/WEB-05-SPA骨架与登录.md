# WEB-05｜SPA 骨架与登录增量记录

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`；React + TypeScript 构建、同站点 API 客户端、短信登录、首次资料、Cookie 恢复及响应式导航已有代码和隔离浏览器探针 |
| 业务验收 | `WEB-AUTH-01～12` 均保持 `NOT_RUN`；现有截图与网络观测是开发增量，不签发完整 F/V/N |
| 依赖 | WEB-04 已完成；WEB-02 的证据工具可用但任务未完成，不能提前勾选 WEB-05 |
| 来源 | [执行计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-05、[Web PRD](../../PRD-计划打卡-Web-v1.md)、[技术方案](../../技术方案-计划打卡-Web-v1.md)、[验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) WEB-AUTH-01～12 |

## 本次代码与设计选择

- `apps/web` 新增 Vite 8、React 19、TypeScript SPA。`index.html` 声明中文和设备宽度视口；同一客户端按屏宽切换桌面侧栏与手机底部导航，颜色读取共享 `@plan-checkin/design-tokens`。仅在登录、资料和导航范围渲染真实功能，其余页面明确写明仍在建设，避免把空数据当作已加载。
- 浏览器只在模块内存保存短访问令牌和 CSRF 值，`__Host-plan-refresh` 由服务端以 Secure、HttpOnly、SameSite=Lax Cookie 设置。唯一写入 `sessionStorage` 的是独立设备 ID；不将手机号、验证码或 token 写入 URL/localStorage。手机号输入只显示尾号确认，错误就地提示。
- Web API 客户端从 `/api/v1` 同站点访问：进入页面先尝试 Cookie 会话恢复，私有请求带 Bearer access；到期时通过 Web Locks 串行轮换，跨标签仅广播“会话已更新”，其他标签重新读取自己的同站点会话，不广播令牌。401/403 轮换竞争会尝试 Cookie 恢复；写请求重试复用同一幂等键。断网直接提示，不在本地排队写入。
- 新手机号经验证码后读取 `/me`，用户名为空进入资料设置；用户名与昵称校验对应服务端规则，保存后到今日页。浏览器 History API 承载路由和 `next` 深链；目标只接受站内单斜线路径。
- 本机 Node 22.12 不满足仓库锁定的 pnpm 11.25 最低 Node 22.13。将 Node 22.13 与 pnpm 11.25 安装在忽略提交的项目 `docs/atdd/web/artifacts/` 下，使用锁定包管理器更新 workspace lockfile，没有替换系统 Node。

## 隔离实测与原始材料

测试 API 使用临时 PostgreSQL 17 的 `web_atdd_browser`、开发短信桩和 `http://127.0.0.1:5173` 同站点代理；API 运行在 3001，避免占用已存在的 3000 端口。验证码只由本机忽略提交的 SMS outbox 读入 Chrome/Edge CDP，不打印在工具日志或提交的步骤文件。API 和容器结束时由脚本清理。

| 探针 | 实际观察 | 原始材料 |
| --- | --- | --- |
| Chrome 手机登录页 | Chrome 153，390×844 CSS px，页面宽 390，无水平溢出与屏幕外控件 | [截图](./evidence/WEB-05/login-chrome-390/screen-after.png)、[布局](./evidence/WEB-05/login-chrome-390/visual-result.json)、[DOM](./evidence/WEB-05/login-chrome-390/dom.html) |
| Edge 桌面登录页 | Edge 154，1280×800 CSS px，页面宽 1280，无水平溢出与屏幕外控件 | [截图](./evidence/WEB-05/login-edge-1280/screen-after.png)、[布局](./evidence/WEB-05/login-edge-1280/visual-result.json) |
| Chrome 新用户链路 | Cookie 无效时会话 401，短信请求 201，Web 验证 201，本人资料 GET 200、PATCH 200；进入 `/today`，无横向溢出 | [最终截图](./evidence/WEB-05/login-flow-chrome-390-v2/screen-after.png)、[动作](./evidence/WEB-05/login-flow-chrome-390-v2/action-trace.json)、[网络](./evidence/WEB-05/login-flow-chrome-390-v2/network.json)、[布局](./evidence/WEB-05/login-flow-chrome-390-v2/visual-result.json) |
| Chrome 整页刷新 | 注册后刷新，`GET /auth/web/session` 和 `GET /me` 均 200，仍在 `/today` | [网络](./evidence/WEB-05/login-reload-chrome-390/network.json)、[存储元数据](./evidence/WEB-05/login-reload-chrome-390/browser-storage.json)、[截图](./evidence/WEB-05/login-reload-chrome-390/screen-after.png) |
| Edge 桌面新用户链路 | 短信验证及首次资料保存后到今日页，桌面侧栏可见 | [截图](./evidence/WEB-05/login-flow-edge-1280/screen-after.png)、[网络](./evidence/WEB-05/login-flow-edge-1280/network.json)、[布局](./evidence/WEB-05/login-flow-edge-1280/visual-result.json) |
| Chrome 既有账号 | 独立浏览器资料目录中再次短信登录，验证 201、本人资料 GET 200 后直接到今日，无资料 PATCH | [网络](./evidence/WEB-05/existing-login-chrome-390/network.json)、[最终页面](./evidence/WEB-05/existing-login-chrome-390/screen-after.png) |
| Chrome 退出与返回 | 设置页退出接口 201；浏览器返回后的页面仍为 `/login`，刷新 Cookie 不再存在 | [网络](./evidence/WEB-05/logout-back-chrome-390/network.json)、[存储元数据](./evidence/WEB-05/logout-back-chrome-390/browser-storage.json)、[动作](./evidence/WEB-05/logout-back-chrome-390/action-trace.json)、[截图](./evidence/WEB-05/logout-back-chrome-390/screen-after.png) |

Chrome 存储采集只保留名称和标志，不含 Cookie 值：[browser-storage.json](./evidence/WEB-05/login-flow-chrome-390-v2/browser-storage.json)显示 `localStorageKeys=[]`、`readableCookieNames=[]`、`sessionStorageKeys=["plan-checkin-web-device"]`，刷新 Cookie 的 `secure=true`、`httpOnly=true`、`sameSite=Lax`、`path=/`。网络证据只记录 API 路径、方法与状态，不保存请求头、手机号、验证码、令牌或响应正文。截图和 DOM 来自隔离账号，仍按私有验收证据管理。

首次启动页面时本机 3000 端口存在不含 Web 会话路由的服务，Vite 代理返回 404，页面如实显示重试错误；[失败截图](./evidence/WEB-05/login-initial-chrome-390/screen-after.png)保留。改用单独 3001 隔离 API 与同站点代理后重新执行上述 Chrome/Edge 实测，未修改服务端授权规则。

## 未完成与下一步

### 2026-09-29｜今日真实空态增量开始

目标：登录后调用权威 `GET /api/v1/today`，依据服务端 `items` 呈现真实空态或今日条目，并显示创建计划入口；请求失败保留错误和重试，不将失败伪装为空态。手机与桌面留存截图、网络和布局证据，随后更新检查清单与双格式台账。此增量仍不签发 `WEB-AUTH-03` PASS，创建计划完整表单由 WEB-07 接续。

### 2026-09-29｜今日空态浏览器复核

- 实现：`getToday()` 通过同站点鉴权请求读取服务端 `TodayDto`。加载、错误重试、真实空态和非空条目有独立状态；新用户空态展示“创建计划”链接，链接目标 `/plans/new` 目前仍为显式建设中页面，不将尚未实现的表单说成可用。
- Chrome 153 手机 390×844 的新用户注册链路取得短信挑战 201、验证 201、资料 PATCH 200、今日 GET 200；[截图](./evidence/WEB-05/today-empty-chrome-390-v2/screen-after.png)、[网络](./evidence/WEB-05/today-empty-chrome-390-v2/network.json)、[布局](./evidence/WEB-05/today-empty-chrome-390-v2/visual-result.json)显示空态和入口，文档宽 390、横向溢出为 false。
- Edge 154 桌面 1280×800 用另一隔离账号执行相同路径；[截图](./evidence/WEB-05/today-empty-edge-1280/screen-after.png)、[网络](./evidence/WEB-05/today-empty-edge-1280/network.json)、[布局](./evidence/WEB-05/today-empty-edge-1280/visual-result.json)保留桌面证据。
- 第一次 Chrome 全链路在验证码步骤前未找到控件，保留失败探针目录；随后独立 [短信步骤截图](./evidence/WEB-05/today-challenge-probe/screen-after.png)确认请求可进入验证码页，并用新隔离账号完整复测通过。未将失败覆盖为 PASS。`WEB-AUTH-03` 仍欠“账号不重复”的数据库反向证据及创建计划完整流，故保持 `NOT_RUN`。
- [WEB-05 检查清单](./evidence/WEB-05/checks.json)逐文件记录截图、DOM、网络、布局和检查日志的字节数及 SHA-256；`npm run check`、Web TypeScript、ESLint、Prettier、Vite build 均有原始输出。系统 Corepack 的 pnpm 签名错误使根 `npm run web:build` 首次失败，保留失败输出后使用项目私有 Node 直接运行已锁定 Vite 成功，没有修改全局工具。

### 2026-09-29｜换号双验证增量开始

按 `WEB-AUTH-11` 接入现有旧号＋新号双验证码接口：设置页进入换号，先校验新手机号，再仅显示两端掩码并分别输入验证码；确认成功后调用 Web 退出清除刷新 Cookie，提示重新以新号登录。浏览器采集脚本只在隔离开发短信桩读取相应 purpose 的一次性验证码，不保存码值。需要以独立账号实测成功、错误码与全会话撤销，并留 DB/网络反向断言，才可进入正式用例结果。

### 2026-09-29｜换号成功路径与双码页面复核

- 客户端接入 `POST /me/change-phone/challenge` 和 `POST /me/change-phone/confirm`；成功后调用 Web logout 清理 Cookie，并广播清理当前标签的内存会话。旧号身份来自已登录访问令牌，服务端要求旧号和新号两个 6 位验证码，前端不自行绕过。
- [换号确认页截图](./evidence/WEB-05/change-phone-form-chrome-390/screen-after.png)显示双号掩码与两个字段，390×844 无横向溢出；验证码只由受控本地短信桩送入 CDP，提交的步骤文件与网络记录均无明文验证码。
- [Chrome 完整换号网络](./evidence/WEB-05/change-phone-chrome-390/network.json)：旧号登录后挑战 201、确认 201、Web 退出 201，最终 [截图](./evidence/WEB-05/change-phone-chrome-390/screen-after.png)为登录页，[存储元数据](./evidence/WEB-05/change-phone-chrome-390/browser-storage.json)无刷新 Cookie 和 localStorage 项。
- [新号独立登录网络](./evidence/WEB-05/new-phone-login-chrome-390/network.json)含新号短信验证 201、本人资料 GET 200 和今日 GET 200，无首次资料 PATCH；[隔离库聚合](./evidence/WEB-05/change-phone-db.txt)为账号数 1、总会话 4、有效会话 1、已撤销 3、已消耗换号请求 1。聚合不含手机号或验证码。旧号会话撤销是服务端全会话规则的实测结果。
- 此处只签发成功路径开发探针；错误验证码、已占用手机号、过期和其他浏览器变体未形成完整 `WEB-AUTH-11` F/V/N，正式状态保持 `NOT_RUN`。

### 2026-09-29｜错误验证码与证据脱敏

- 使用另一隔离账号提交错误旧号验证码和真实新号验证码；[脱敏截图](./evidence/WEB-05/change-phone-invalid-chrome-390-v3/screen-after.png)显示可修正的两个密码式验证码字段和“验证码不正确”提示，[网络](./evidence/WEB-05/change-phone-invalid-chrome-390-v3/network.json)确认确认接口 400，页面仍在 `/settings/change-phone`。[数据库聚合](./evidence/WEB-05/change-phone-invalid-db.txt)为账号数 1、已消耗请求 0、错误尝试 1；没有换号。
- 首次错误路径截图暴露了测试验证码。立即将双码输入设为遮挡，并让采集器对所有 input/textarea 的 DOM 值和无障碍树文本框值脱敏；未提交的两份旧采集目录在确认绝对路径属于 WEB-05 证据区后清理，使用新隔离账号重新采集 v3。脱敏复查：AX 六位明文 `false`，DOM 验证码 value `false`，网络错误状态 `true`。这次隐私修复和被替换材料均在本节留痕。
- `WEB-AUTH-11` 仍缺已占用号码、过期和正式多浏览器变体；不得凭成功和单一错误路径签发完整 PASS。

### 2026-09-29｜access 到期自动续期探针开始

计划在受控 loopback 浏览器登录后只推进该页面的 `Date.now()` 16 分钟，再从计划页返回今日触发私人 GET。检查同站点 refresh 轮换和本人数据恢复、Cookie 标志、无重登或重复写业务数据；推进动作仅供隔离开发短信桩使用，证据记录偏移值。该探针不代替正式冻结候选构建与多标签 `WEB-AUTH-09`。

### 2026-09-29｜access 到期自动续期增量复核

[动作时间线](./evidence/WEB-05/access-refresh-chrome-390/action-trace.json)记录受控页面 `Date.now()` 前进 960000 ms；[网络](./evidence/WEB-05/access-refresh-chrome-390/network.json)在登录后先有今日 200，推进后只有一次 refresh 201，再有今日 200；最终 [截图](./evidence/WEB-05/access-refresh-chrome-390/screen-after.png)仍为本人今日空态，390×844 无横向溢出。探针只测试页面判定 access 到期与服务端续期的接线，计划详情页未实现，旧 refresh 重放和多标签轮换在 WEB-04 服务端/WEB-05 后续用例另证；`WEB-AUTH-07` 维持 `NOT_RUN`。

### 2026-09-29｜短信错误路径增量开始

按 `WEB-AUTH-05` 先测错误验证码：登录表单须显示可修正错误、不能建立会话；截图、DOM 与 AX 不可泄露验证码，因此验证码框改为遮挡输入，并由浏览器证据脚本继续去除字段值。随后再补过期、已用及限流变体，未齐之前保持 `NOT_RUN`。

### 2026-09-29｜非法号码与错误验证码浏览器复核

- [非法手机号截图](./evidence/WEB-05/invalid-phone-chrome-390/screen-after.png)显示字段旁错误；[网络](./evidence/WEB-05/invalid-phone-chrome-390/network.json)只有未登录会话探测 401，短信挑战请求次数为 0，390×844 无横向溢出。此为 `WEB-AUTH-02` 的单一非法号参数，空号和过快重发仍待测。
- [错误验证码截图](./evidence/WEB-05/invalid-code-chrome-390/screen-after.png)显示遮挡的 6 位输入和“验证码不正确”；[网络](./evidence/WEB-05/invalid-code-chrome-390/network.json)为短信挑战 201、Web 验证 400，[存储元数据](./evidence/WEB-05/invalid-code-chrome-390/browser-storage.json)的 Cookie 列表为空、路径仍为 `/login`。过期和已使用的参数组尚缺，`WEB-AUTH-05` 不签发 PASS。

1. 今日页已有真实空态与创建计划入口，计划列表/详情也已接入；`WEB-AUTH-03` 的非空态、多浏览器与完整 F/V/N 尚不满足。WEB-10 将继续接入打卡操作。
2. 验证码非法/到期/限流、多标签轮换、退出对另一浏览器会话的影响、换号、会话过期深链返回和存储安全，仍需逐例浏览器与 API/DB 反向断言。既有账号与单浏览器退出仅有上述增量探针，尚未形成完整用例。浏览器版本只覆盖本机 Chrome 153 和 Edge 154，非正式全矩阵。
3. `WEB-02` 的正式浏览器矩阵和 CI 外部证据保留仍缺；WEB-05 的 12 个稳定 ID 没有合法 `result.json`，不得勾选任务。每项满足后使用结果写入器保存 F/V/N、截图、DOM、网络、数据库和 SHA-256，再在 JSON 与 Markdown 同步勾选。

### 2026-09-29 03:34 CST｜AUTH07 真实计划页续期增量

- 在已有个人计划的隔离账号中，Chrome 153、390×844 登录后仅把浏览器页面时钟推进 16 分钟，再打开计划列表和详情。首轮[网络](./evidence/WEB-05/auth07-real-plan-chrome-390/network.json)出现三次顺序 refresh：服务端时钟未推进，客户端继续把每个新 access 的服务端绝对过期时间与已推进的浏览器时钟相比；页面始终可用，但这不是理想的单次续期结果。此首轮保留为问题证据，不纳入有效清单。
- `apps/web/src/data/api.ts` 改为使用 Web 会话响应的 `serverTime` 计算 access 剩余有效期，再按本地时钟记录截止值。复测[网络](./evidence/WEB-05/auth07-real-plan-chrome-390-v2/network.json)只有一次 refresh 201，随后计划 GET 200、分组 GET 200、本人计划详情 GET 200；[详情截图](./evidence/WEB-05/auth07-real-plan-chrome-390-v2/screen-after.png)显示本人计划，[布局](./evidence/WEB-05/auth07-real-plan-chrome-390-v2/visual-result.json)无横向溢出。[存储元数据](./evidence/WEB-05/auth07-real-plan-chrome-390-v2/browser-storage.json)无可读 Cookie 和 localStorage，刷新 Cookie 带 Secure、HttpOnly。
- [WEB-05 SHA-256 清单](./evidence/WEB-05/checks.json)现收录 18 次完整浏览器探针和八份旧检查输出。旧 refresh 重放拒绝、多标签竞态及正式 F/V/N 尚未与这次浏览器探针合并，`WEB-AUTH-07` 保持 `NOT_RUN`，WEB-05 `[ ]`。

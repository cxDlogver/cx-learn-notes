# WEB-02｜Web 验收证据工具进展

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`；校验、结果写入、本机 Chrome/Edge 交互采集、隔离种子、数据库到期边界与受控对象/Push 供应端探针已实现，正式浏览器矩阵和 CI 外部保留未完成 |
| 验收状态 | 136 个业务用例均 `NOT_RUN`；本页没有业务 PASS 或截图 |
| 依据 | [Web 验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) §1.3、[结果 schema](./acceptance-result.schema.json)、[任务计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-02 |

## 已实现的可复核能力

- `validate_result.py`：逐个解析 `result.json`，验证 Draft 2020-12 schema 与日期格式、稳定用例 ID、F/V/N 预期文本、来源引用及全部源文件 SHA-256。
- 对 PASS 结果检查 `evidence/<runId>/<caseId>/<variant>/result.json` 路径、必需证据代码、每个断言引用的原始文件、文件存在与 SHA-256；非 UI 的 V 只有矩阵写 `N/A` 时才可填 `N_A`。
- `check_execution_progress.py` 的 PASS 分支复用该校验器；此前的台账/任务勾选和唯一归属检查保留。
- `requirements.txt` 固定本地已用的 `jsonschema` 版本；工具不会自动生成或签发业务 PASS。
- `scripts/web-browser-capture.mjs` 通过本机 Chrome/Edge 的 CDP 采集 PNG、DOM、无障碍树、布局观测、浏览器版本和去敏日志；它只采集原始材料，不推断业务 F/V/N 通过。
- `record_result.py` 接收人工或 AI 评审填写的实际 F/V/N、环境、构建、证据代码和原始文件；自动带入基线预期/来源摘要、计算证据 SHA-256，校验后同步写 `result.json`、JSON 台账和本计划的 Markdown 执行日志。`PASS` 必须先有实现文件与 commit，重跑同一变体只替换台账当前指针，旧结果保留。工具不根据截图自动作业务通过结论。
- 浏览器采集器可读取最多 100 步的 `wait-for`、`click`、`type` 操作文件，采用真实鼠标/键盘事件；保存操作前后截图和不含输入内容的动作时间线。它仍只覆盖本机 Chrome/Edge，不代表完整浏览器支持矩阵。

## 工具自测（不计业务验收）

临时目录构造合成 `WEB-DATA-09` 结果，仅证明校验器行为。八项自测覆盖完整结构、缺原始文件、缺必需证据代码、结果路径错误、来源摘要过期、文件被篡改、断言未引用证据和预期文本不符。命令输出见 [tool-selftest.txt](./evidence/WEB-02/tool-selftest.txt)。所有合成结果和文件在临时目录自动删除，不写入 `evidence/<runId>/`，不更新 `caseLedger` 为 PASS。

## 浏览器探针实测（合成页面）

| 探针 | 实际浏览器与视口 | 观察 | 原始截图与采集记录 |
| --- | --- | --- | --- |
| 未设置 viewport meta | Chrome 153，要求 390×844，实际 CSS 布局 980×2121 | 浏览器按默认移动布局宽度处理；探针如实记录差异，不产生验收结论 | [截图](./evidence/WEB-02/browser-selftest/screen-after.png)、[布局](./evidence/WEB-02/browser-selftest/visual-result.json) |
| 响应式测试页 | Chrome 153，实际 390×844 | 无水平溢出，按钮位于可用宽度内；人工查看截图确认测试文字和按钮可见 | [截图](./evidence/WEB-02/browser-selftest-viewport/screen-after.png)、[DOM](./evidence/WEB-02/browser-selftest-viewport/dom.html)、[无障碍树](./evidence/WEB-02/browser-selftest-viewport/accessibility.json) |
| 桌面测试页 | Edge 154，实际 1280×800 | 无水平溢出，按钮位于可用宽度内 | [截图](./evidence/WEB-02/browser-selftest-edge/screen-after.png)、[采集元数据](./evidence/WEB-02/browser-selftest-edge/capture.json) |

三组采集的截图、DOM、无障碍树、布局、日志与元数据的 SHA-256 见 [浏览器文件清单](./evidence/WEB-02/browser-captures.json)。这些页面是无业务数据的 `data:` 自测页，不是计划打卡 Web 客户端；没有任何业务用例结果文件。

## 交互与结果写入工具自测（仍不计业务验收）

`browser-action-selftest.json` 在 Chrome 153 的 390×844 合成页面执行等待输入框、输入 `Synthetic user`、点击保存、等待结果节点。实际 [操作后截图](./evidence/WEB-02/browser-action-selftest/screen-after.png)显示输入和保存结果，DOM 中 `#saved` 的文字为 `Synthetic user`；[操作前截图](./evidence/WEB-02/browser-action-selftest/screen-before.png)与[动作时间线](./evidence/WEB-02/browser-action-selftest/action-trace.json)可复核。输入长度写入时间线，输入内容不写入时间线；DOM/截图仍可包含页面数据，只能在隔离账号和脱敏环境中采集。文件摘要见交互自测清单。

结果写入器的拒绝型测试验证：未知用例、包含 `../` 的运行目录以及尚无代码实施记录的 `PASS` 均在写入前拒绝。完整写入自测在临时目录生成合法的合成 `FAIL` 结果，并验证 JSON 台账和 Markdown 日志均包含相同结果路径；原有八项证据校验测试仍通过，共 12 项。临时结果自动清理，尚未用真实业务场景写过 `result.json`，136 项状态仍为 `NOT_RUN`。

## 本地归档与 CI 校验增量

`archive_evidence.py` 在归档前执行进度一致性检查，逐个验证现有业务 `result.json`，把 PRD/技术/ATDD 来源、执行计划、JSON 台账和所有证据写入带逐文件 SHA-256 索引的 ZIP，并再次从 ZIP 读取核验。输出被限制在忽略提交的 `docs/atdd/web/artifacts/`。一次本地自测生成 77 个文件、0 个业务结果的 ZIP，摘要 `1cef6490edc0ae8991b6e93e996c6ea6eea2477411ce0d4fbec254617c02f2e8`；逐文件哈希全部匹配，见[归档自测记录](./evidence/WEB-02/archive-selftest.json)。这个 ZIP 包含合成探针和开发证据，不构成业务验收。

仓库顶层 `.github/workflows/ios-plan-checkin.yml` 已接入 Python 3.11、`jsonschema` 依赖和 `web:atdd:check`，在原 `pnpm check` 之后运行工具自测及台账校验。尝试配置外部 CI artifact 上传被自动审批拒绝：证据、截图和台账上传到未核实的外部目的地有敏感数据外流风险。未配置上传，也没有改用其他外发路径；因此 **CI 产物保留要求尚未完成**。本地 ZIP 可供内部人工核验，外部保留策略待明确授权后再做。

## 隔离账号、业务数据和时钟增量

- `scripts/web-atdd-fixture.mjs` 只接受本机 `web_atdd_*` PostgreSQL 库、`APP_ENV=development`、`SMS_PROVIDER=stub` 和测试专用密钥。`seed RUN_ID SERVER_NOW_UTC` 创建 A 主人、B 好友、C 陌生人、D 被屏蔽者，A1/A2/A3 与 B1/C1/D1 六个独立 Web 会话，F/FD/W/O 及要做/不要做、暂停、归档、数值历史和部分周变体。可公开清单写入忽略提交的 `artifacts/fixtures/RUN_ID/manifest.json`；Cookie/CSRF 仅写同目录忽略提交的私密文件，日志不输出秘密。
- `cleanup RUN_ID` 读取清单并再次核对本机测试库和账号前缀，仅删除该运行的四个用户及级联数据，同时删除私密会话文件。对同一 `RUN_ID` 的“种子→清理→重建→清理”在临时 PostgreSQL 17 库通过：每轮 4 用户、10 计划、6 会话、5 记录、1 好友对、1 屏蔽对和 1 分享；清理后目标用户 0。真实 Web `/auth/web/session` 依次恢复 A1/A2/A3/B1/C1/D1 六个 Cookie，全部 200、`no-store`，A 三端同账号且会话彼此独立。原始输出与 SHA 见 [种子增量检查](./evidence/WEB-02/seed-checks.json)及[隔离服务输出](./evidence/WEB-02/fixture-selftest.txt)。
- `scripts/web-atdd-clock.mjs` 是只供本机隔离服务进程加载的冻结时钟预载入器；拒绝生产环境或非测试库。浏览器采集器的 `--frozen-now` 只允许合成页或 loopback 页面，在导航前注入相同 UTC 时钟，并用 `--timezone` 设置 IANA 浏览器时区；`timeline.json` 保存真实采集时间、页面时间、浏览器时区与动作顺序。Chrome 合成页在 `America/Los_Angeles` 下观察到与服务端相同的 `2026-09-28T13:00:00.000Z`，生产环境注入被拒绝。见[时钟自测](./evidence/WEB-02/clock-selftest.json)及[浏览器时间线](./evidence/WEB-02/browser-clock-selftest/timeline.json)。
- 限制：数据库的 `now()` 仍是隔离容器实时时钟；涉及 OTP/刷新到期的跨日场景必须连同数据库时间字段设计专用种子，不能仅依赖 Node/页面冻结。当前探针是合成页面，不是产品 Web 交互或正式跨浏览器验收。业务 136 项继续 `NOT_RUN`。

## 构建和验收基线变更后的 STALE 传播

`mark_stale.py --commit <候选源码提交> --reason <单行原因>` 在候选构建改变时，将当前用例指针中的旧 `PASS` 变为 `STALE`，保留原 `result.json`、截图及哈希；若所属任务已勾选，则同步撤销 Markdown 勾选和 JSON `DONE`，并递归打开已完成的下游任务。每个受影响用例与任务保留时间线，执行日志追加候选 commit、原因和需要复验的 ID。`--dry-run` 可先预览，不写文件。

`record_result.py` 仅接受与台账 `verificationBuildCommit` 一致的 `PASS`；`check_execution_progress.py` 校验当前来源文件 SHA，且通过用例的构建提交必须等于锁定候选。来源 PRD/技术/ATDD 变更而未重新生成并评审基线时直接失败。合成测试证明旧结果路径不被删除、同一构建不误标、无效提交拒绝、WEB-05 及下游 WEB-07 同时重开；现有结果校验与写入测试一起共 15 项通过。原始输出及哈希见 [STALE 增量检查](./evidence/WEB-02/stale-checks.json)。目前没有真实 PASS，故真实台账中没有被标为 `STALE` 的业务用例。

## 后续必须完成

### 可留存的结果写入样本（2026-09-29）

运行 `python docs/atdd/web/generate_tool_sample.py`，在 [tool-sample](./evidence/WEB-02/tool-sample/sample-check.json) 中生成并验证完整的 [合成结果 JSON](./evidence/WEB-02/tool-sample/evidence/synthetic-tool/WEB-DATA-09/api-fixture/result.json)、原始 `a.txt`、独立的 JSON 台账和 Markdown 执行日志。`sample-check.json` 列出逐文件 SHA-256。样本 `WEB-DATA-09` 故意为 `FAIL`；样本台账为 `FAIL`，正式台账仍是 `NOT_RUN`。路径在 `docs/atdd/web/evidence/WEB-02/tool-sample/`，不在正式业务 `evidence/<runId>/` 下。工具检查 15 项通过，正式 136 项没有因此通过。

### 数据库到期边界与受控供应端（2026-09-29）

- `web-atdd-fixture.mjs set-session-expiry RUN_ID ALIAS OFFSET_SECONDS` 仅接受本机 `web_atdd_*` 库、开发配置、六个隔离会话别名和 ±3600 秒范围，直接以 PostgreSQL `clock_timestamp()` 设置到期时间。隔离 PostgreSQL 17 中，A3 设置为数据库当前时间前 1 秒后，真实 `/auth/web/session` 返回 401；设置为当前时间后 3600 秒后恢复 200。A1/A2/B/C/D 不受影响，种子重建与最终清理仍通过。见[原始 HTTP/数据库输出](./evidence/WEB-02/expiry-selftest.txt)。这补上了仅冻结 Node/浏览器时钟不能覆盖数据库 `now()` 的缺口。
- 本地 SeaweedFS S3 限制为 `http://127.0.0.1:5173` 和 `http://localhost:5173` 两个开发源站。实际预检允许前者 200，对 `https://untrusted.example` 返回 403；签名 PUT 200、签名 GET 200 且 SHA-256 相同、无签名 GET 403，测试对象删除后的 HEAD 为 404。见[对象供应端记录](./evidence/WEB-02/object-provider.txt)。仅调整本地 compose 默认配置，拟发布环境的对象源站仍须独立配置和实测。
- Web Push 采用隔离进程内供应端桩：VAPID/加密 payload 经真实 `WebPushSender` 生成，桩记录 201/202 接受、410 永久失效、503 可重试与内网端点拒绝；外发网络请求为 0。见[Push 供应端记录](./evidence/WEB-02/push-provider.txt)。Worker 队列与失效处理的集成证据另见 [WEB-15](./WEB-15-分端提醒与WebPush服务.md)。短信使用真实 API 的受控 `SMS_PROVIDER=stub` 链路，见 [WEB-04](./WEB-04-Web会话与注册API.md)。
- [七项增量检查清单](./evidence/WEB-02/provider-checks.json)记录命令、退出码、原始输出大小和 SHA-256；含样本生成、到期、对象、Push、lint、格式和正式台账校验。没有产品 Web 页面，也没有把供应端探针记为业务 PASS。

1. 短信/对象/Push 受控桩和数据库到期边界已有独立实测；还需将对象签名直传和 Push Worker 与实际 Web 页面组成同一正式验收运行，补失败注入与跨组件原始证据。
2. 将本机 Chrome/Edge 运行器接入实际 Web 测试环境，补全手机 Safari/Chrome、桌面 Safari/Firefox 与版本记录，并从正式浏览器读取每个真实用例的环境和步骤。
3. CI 校验已接入；外部 artifact 保留因自动审批拒绝尚缺。需批准明确的证据目的地、访问控制和保存期限后再接入。候选构建变化已可传播 `STALE`，仍需将该命令接入正式运行流程并由责任人复验。
4. 合法但不计业务验收的结果样本已留存。完成全部剩余项之前 WEB-02 checklist 不勾选，后续依赖任务不能以本次合成自测解锁。

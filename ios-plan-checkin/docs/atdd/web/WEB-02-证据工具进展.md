# WEB-02｜Web 验收证据工具进展

| 项目 | 当前记录 |
| --- | --- |
| 任务状态 | `IN_PROGRESS`；工具校验层与本机 Chrome/Edge 采集探针已实现，隔离业务数据种子和正式浏览器矩阵未实现 |
| 验收状态 | 136 个业务用例均 `NOT_RUN`；本页没有业务 PASS 或截图 |
| 依据 | [Web 验收矩阵](../../ATDD-BDD-计划打卡-Web-v1-验收矩阵.md) §1.3、[结果 schema](./acceptance-result.schema.json)、[任务计划](../../任务执行计划-计划打卡-Web-v1.md) WEB-02 |

## 已实现的可复核能力

- `validate_result.py`：逐个解析 `result.json`，验证 Draft 2020-12 schema 与日期格式、稳定用例 ID、F/V/N 预期文本、来源引用及全部源文件 SHA-256。
- 对 PASS 结果检查 `evidence/<runId>/<caseId>/<variant>/result.json` 路径、必需证据代码、每个断言引用的原始文件、文件存在与 SHA-256；非 UI 的 V 只有矩阵写 `N/A` 时才可填 `N_A`。
- `check_execution_progress.py` 的 PASS 分支复用该校验器；此前的台账/任务勾选和唯一归属检查保留。
- `requirements.txt` 固定本地已用的 `jsonschema` 版本；工具不会自动生成或签发业务 PASS。
- `scripts/web-browser-capture.mjs` 通过本机 Chrome/Edge 的 CDP 采集 PNG、DOM、无障碍树、布局观测、浏览器版本和去敏日志；它只采集原始材料，不推断业务 F/V/N 通过。

## 工具自测（不计业务验收）

临时目录构造合成 `WEB-DATA-09` 结果，仅证明校验器行为。八项自测覆盖完整结构、缺原始文件、缺必需证据代码、结果路径错误、来源摘要过期、文件被篡改、断言未引用证据和预期文本不符。命令输出见 [tool-selftest.txt](./evidence/WEB-02/tool-selftest.txt)。所有合成结果和文件在临时目录自动删除，不写入 `evidence/<runId>/`，不更新 `caseLedger` 为 PASS。

## 浏览器探针实测（合成页面）

| 探针 | 实际浏览器与视口 | 观察 | 原始截图与采集记录 |
| --- | --- | --- | --- |
| 未设置 viewport meta | Chrome 153，要求 390×844，实际 CSS 布局 980×2121 | 浏览器按默认移动布局宽度处理；探针如实记录差异，不产生验收结论 | [截图](./evidence/WEB-02/browser-selftest/screen-after.png)、[布局](./evidence/WEB-02/browser-selftest/visual-result.json) |
| 响应式测试页 | Chrome 153，实际 390×844 | 无水平溢出，按钮位于可用宽度内；人工查看截图确认测试文字和按钮可见 | [截图](./evidence/WEB-02/browser-selftest-viewport/screen-after.png)、[DOM](./evidence/WEB-02/browser-selftest-viewport/dom.html)、[无障碍树](./evidence/WEB-02/browser-selftest-viewport/accessibility.json) |
| 桌面测试页 | Edge 154，实际 1280×800 | 无水平溢出，按钮位于可用宽度内 | [截图](./evidence/WEB-02/browser-selftest-edge/screen-after.png)、[采集元数据](./evidence/WEB-02/browser-selftest-edge/capture.json) |

三组采集的截图、DOM、无障碍树、布局、日志与元数据的 SHA-256 见 [浏览器文件清单](./evidence/WEB-02/browser-captures.json)。这些页面是无业务数据的 `data:` 自测页，不是计划打卡 Web 客户端；没有任何业务用例结果文件。

## 后续必须完成

1. 为隔离 A/B/C/D 账号、固定时钟和业务日期、短信/对象存储/Push 桩设计可重建种子与清理机制。
2. 将本机 Chrome/Edge 探针接入实际 Web 测试环境，并扩展正式矩阵所需的手机 Safari/Chrome、桌面 Safari/Firefox 与版本记录；在每个真实用例结果中写明浏览器、视口、主题和操作步骤。
3. 支持每个 `caseId + variant + runId` 的 F/V/N 实际观察和证据清单落盘、CI 产物保留、失败复测与 `STALE` 传播；连接 Markdown 执行日志和 JSON 台账。
4. 用真实浏览器对工具本身做一次采集冒烟，并证明无效结果在 CI 被拒绝。完成这些之前 WEB-02 checklist 不勾选，后续依赖任务不能以本次合成自测解锁。

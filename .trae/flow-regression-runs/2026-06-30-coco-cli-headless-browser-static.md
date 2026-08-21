# CoCo CLI Headless Browser Static Regression Report

## Workflow Version

- checked_at: 2026-06-30 Asia/Shanghai
- replay_mode: STATIC_ASSERTION
- target: Browser Runtime Mode for verify / design / mock
- formal_regress: BLOCKED_FOR_ACTIVE_WORKSPACE
- blocker_detail: 当前流程框架仓库没有 `.trae/DELIVERY_STATE.md` 和 active artifacts workspace，因此不执行正式 shadow replay；本次只做流程文件静态断言，不改写真实阶段产物。

## User Issue

用户要求将浏览器验证迁移为双分支：Trae 桌面环境继续沿用当前内置浏览器流程；CoCo / Trae CLI / 无桌面环境使用无头浏览器完成页面验证。

## Simulation Result

- result: PASS
- assertions: 6 / 6 PASS
- active_workspace_mutation_check: PASS，本次只修改流程规则、文档和回归用例；没有改写任何业务阶段产物。
- deterministic_check: PASS，`node scripts/check_browser_runtime_contract.mjs`

## Assertion Results

| id | assertion | result | evidence |
|---|---|---|---|
| A1_GLOBAL_BROWSER_MODES | 全局 Gate 定义 `TRAE_DESKTOP` 与 `COCO_CLI_HEADLESS` 两个浏览器运行模式，且无头分支禁止回退到有头 Chrome 假装验证 | PASS | `AGENTS.md` 包含 `Browser Runtime Mode`、`TRAE_DESKTOP`、`COCO_CLI_HEADLESS`、`不得依赖有头 Chrome` |
| A2_VERIFY_EVIDENCE_FIELDS | Verify 报告模板的 `Environment / Baseline Checks` 明确列出浏览器模式、工具、headless、profile/state、Network 能力、SSO 结果和 vmok URL | PASS | `skills/06-debug-verification/SKILL.md` 模板块包含 `browser_runtime_mode`、`browser_tool`、`headless`、`browser_profile_or_state`、`network_evidence_level`、`sso_result`、`vmok_url` |
| A3_DESIGN_AGENT_BRANCH | Design skill 和 `design-checker` 都要求使用主 Agent 指定的浏览器模式，不能自行切换桌面 / 无头分支 | PASS | `skills/07-design-alignment/SKILL.md` 与 `agents/design-checker.md` 均包含 `Browser Runtime Mode`、`COCO_CLI_HEADLESS` 和禁止切换规则 |
| A4_MOCK_MANIFEST_HEADLESS | BAM mock runtime 与 manifest schema 可记录无头浏览器 precheck | PASS | `skills/bam-mock-runtime-generator/SKILL.md` 与 `skills/bam-mock-runtime-generator/references/manifest-schema.md` 包含 `browserRuntimeMode`、`headless`、`playwright_chromium_headless`、`headless_browser` |
| A5_CLI_DOCS | CLI 安装文档包含 Playwright Chromium / headless browser 依赖和证据策略 | PASS | `docs/cli-installation.md` 包含 `Browser automation`、`playwright`、`Browser Runtime Modes`、`COCO_CLI_HEADLESS` |
| A6_DETERMINISTIC_CHECK | 静态回归不再只做全文 grep，而是检查模板块、fallback 文案、design handoff、mock schema 和 MCP docs | PASS | `scripts/check_browser_runtime_contract.mjs` 执行通过 |

## Scenario Simulation

1. `/delivery:verify` 在 CoCo / Trae CLI 中启动 dev server 并 health check 通过后，先记录 `browser_runtime_mode=COCO_CLI_HEADLESS`。
2. 主 Agent 用 Playwright Chromium headless 打开 vmok URL，复用 user data dir / storage state；若落到 SSO 且无可用登录态，分类为 `ENV_ISSUE / HOST_AUTH_REQUIRED` 并暂停。
3. 若登录态可用，verify 按 case 采集 DOM、screenshot、console、Network 证据，并在 `Environment / Baseline Checks` 和 `Case Evidence Coverage Audit` 同时写入对应字段。
4. `/delivery:design` 继承同一模式，`design-checker` 只能用主 Agent 提供的 headless 会话取证，返回压缩证据包和差异分级。
5. `/delivery:mock` 需要 UI 自然点击和 BAM warning 验证时，同样在 manifest `browserPrecheck` 中记录 headless browser 能力和 SSO 状态。

## Residual Risk

- 本次没有真实 active delivery workspace，未运行 dev server、Playwright 或 vmok 登录态验证；不能证明某个具体 CoCo 环境的 auth / network 权限已可用。
- 后续若 CoCo 平台提供专属浏览器 MCP 名称，需要把实际工具名补进 `browser_tool` 枚举或项目上下文，但当前规则已允许“其他实际工具名”作为 verify 报告口径。

# Flow Regression Case

## Case ID

coco-cli-headless-browser-branch

## Target Stage

verify

## Original Issue

流程默认把浏览器验证写成 Trae 桌面内置浏览器优先，并在失败时回退到有头 Chrome + 持久化 Profile。迁移到 CoCo / Trae CLI / 无桌面环境后，这条路径不可用，容易导致 verify / design / mock 在需要浏览器证据时仍尝试打开桌面浏览器，或跳过 DOM、截图、console、Network 证据。

## Expected Behavior

所有需要浏览器验证的阶段必须先判定 `Browser Runtime Mode`：Trae 桌面环境继续使用现有内置浏览器优先流程；CoCo / Trae CLI / 无桌面环境使用无头浏览器，优先 Playwright Chromium，其次可用的 Chrome DevTools / browser MCP headless 能力。阶段报告必须记录 `browser_runtime_mode`、`browser_tool`、`headless`、`browser_profile_or_state`、`network_evidence_level` 和 `sso_result`。无头分支缺登录态或浏览器能力时必须分类为环境问题并暂停，不得回退到有头 Chrome 或伪造验证通过。

## Changed Process Files

- `AGENTS.md`
- `PROJECT_CONTEXT.md`
- `commands/delivery/code.md`
- `commands/delivery/design.md`
- `commands/delivery/mock.md`
- `skills/05-code-implementation/SKILL.md`
- `skills/06-debug-verification/SKILL.md`
- `skills/06-debug-verification/browser-verify-runbook.template.json`
- `skills/07-design-alignment/SKILL.md`
- `skills/bam-mock-runtime-generator/SKILL.md`
- `skills/bam-mock-runtime-generator/references/manifest-schema.md`
- `agents/design-checker.md`
- `agents/runtime-runner.md`
- `docs/cli-installation.md`
- `docs/delivery-framework-flow.md`
- `docs/mcp-config-export.md`
- `scripts/check_browser_runtime_contract.mjs`

## Related Tags

- stage: verify
- stage: design
- stage: mock
- contracts: browser-runtime-mode, headless-browser, runtime-evidence
- agents: main-agent, design-checker, runtime-runner
- commands: delivery:verify, delivery:design, delivery:mock
- cost: low
- priority: P1

## Replay Mode

STATIC_ASSERTION

## Minimal Replay Context

- required_artifacts: none
- required_case: static scan of process files for desktop/headless browser branch rules
- optional_runtime: none

## Assertions

| id | assertion | evidence_file | pass_condition | fail_condition |
|---|---|---|---|---|
| A1 | Global gate defines two browser runtime modes. | `AGENTS.md` | Mentions both `TRAE_DESKTOP` and `COCO_CLI_HEADLESS`, and requires headless browser evidence for CoCo / CLI. | Browser verification only references Trae integrated browser or headed Chrome fallback. |
| A2 | Verify report template records headless browser evidence fields. | `skills/06-debug-verification/SKILL.md` | `Environment / Baseline Checks` explicitly lists `browser_runtime_mode`, `browser_tool`, `headless`, `browser_profile_or_state`, `network_evidence_level`, `sso_result`, `vmok_url`. | Verify report can omit browser mode or headless evidence fields even if other paragraphs mention them. |
| A3 | Design flow and design-checker obey the selected browser mode. | `skills/07-design-alignment/SKILL.md`, `agents/design-checker.md` | Both files require using the main Agent provided `Browser Runtime Mode` and forbid switching CoCo / CLI back to headed Chrome. | Design checker can choose its own browser branch or rely on desktop browser in CLI. |
| A4 | Mock runtime manifest can store headless browser precheck. | `skills/bam-mock-runtime-generator/references/manifest-schema.md`, `skills/bam-mock-runtime-generator/SKILL.md` | Schema and skill include headless/browser runtime mode fields. | Mock precheck only supports `integrated_browser` / system Chrome profile. |
| A5 | CLI installation docs include headless browser dependency and policy. | `docs/cli-installation.md` | Mentions Playwright Chromium or equivalent headless browser branch for CoCo / Trae CLI. | CLI docs only install desktop MCP/browser dependencies. |
| A6 | Static regression has deterministic coverage. | `scripts/check_browser_runtime_contract.mjs` | Script checks the exact verify report block, desktop fallback wording, design command handoff fields, mock manifest schema and MCP docs. | Regression relies only on loose full-text grep and can miss stale templates. |

## Daily Suite Policy

- include_in_daily: true
- reason: Static assertions are cheap and protect the no-desktop browser migration path.

## Captured Workflow Version

- git_commit: pending
- git_branch: current
- dirty: true
- rules_hash: pending

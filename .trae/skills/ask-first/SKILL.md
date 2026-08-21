---
name: ask-first
metadata:
  version: "2.0"
description: Use when PRD analysis is complete and unresolved product, UI, integration, scope, evidence, or implementation-mode choices may affect BAM or technical planning, including when the user asks to start planning, write a tech plan, decide defaults, or prepare an Ask First decision card.
---

# Ask First

Ask First is the decision-package skill between PRD analysis and BAM / technical planning. It turns unresolved planning choices into user-answerable questions, supplements missing context, and produces a Feishu card layout artifact. It does not start Feishu services, configure app credentials, wait for callbacks, or persist submitted answers; use `ask-first-service-runtime` for that runtime loop.

## Boundary

Use this skill to:

- Read existing PRD, Figma, BAM, technical docs, code baseline notes, `decision-log.md`, `prd-notes.md`, and `uncertainty-register.md`.
- Refine rough risks into concrete, answerable decisions.
- Split overloaded questions into one decision per question.
- Add missing business context, evidence entries, excerpts, and option tradeoffs.
- Generate or update `ask-first-request.md` and `ask-first-card.json`.
- Record pending decisions in `prd-notes.md`.

Do not use this skill to:

- Bootstrap `.trae/config/ask-first-runtime.local.json`.
- Ask users for app secrets, start long connection, send the card, process callbacks, or run text fallback.
- Write submitted decisions into `decision-log.md`.
- Unpause `.trae/DELIVERY_STATE.md`.

When the user wants to send the card, receive feedback, recover callback data, or continue after submission, load `ask-first-service-runtime`.

## Required Inputs

Before producing questions, read what exists in the current artifact workspace:

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- `prd-source.md` and referenced local resources such as `prd-source/`
- `03-prd-analysis.md`
- `uncertainty-register.md`
- `decision-log.md`
- `prd-notes.md`
- `ui-source-map.md`
- `prd-figma-supplement.md`, `figma-evidence-pack.md`, `figma-cache/manifest.md` when present
- `bam-sync-report.md` and `tech-doc-raw.md` when present

Read repository files only to clarify an Ask First question. Do not modify business code, generate `04-tech-plan.md`, or run side-effectful business commands.

## Workflow

1. **Reconstruct context**
   - Identify the PRD / task name and the next intended stage.
   - Summarize confirmed facts, especially user-provided or previously decided facts.
   - Remove stale uncertainties already resolved by `decision-log.md`, `prd-notes.md`, user replies, Figma evidence, BAM, or technical docs.
   - Record this in `ask-first-request.md` under `## Source Brief`; do not show that heading in the Feishu card.

2. **Scan for decisions**
   - Include P0/P1/P2/PLAN_DISCOVERY and low-confidence implementation-mode choices that could affect scope, user-visible behavior, real vs mock integration, code landing, acceptance, or rework cost.
   - Ask P0 items. P1/P2/PLAN_DISCOVERY must still be visible unless already resolved, duplicate, or purely internal implementation detail.
   - Cap one round at 10 questions. Keep all P0s; merge lower-priority items only when they share the same evidence, choice, and plan impact.

3. **Refine each issue**
   - Make each question about one decision only.
   - Add explicit business background so the user can immediately place the issue in the right page / list / tab / modal / column / current object / current state. Do not write ambiguous references such as `这列`、`这个标题`、`这里的列表列头` without anchoring them.
   - Write in business language first. If an internal term is unavoidable, translate it into a business object first and put the internal term only in a short parenthetical note.
   - Convert agent/tool/process failures into a business decision before asking. For example, do not ask whether the user accepts a failed design-node search; ask whether the related UI state must be blocked until design evidence is provided, or whether the current PRD wording is enough for this round.
   - Attach both an evidence entry and a readable excerpt. Missing clickable links are not a reason to drop a question.
   - Provide A/B/C/D options that map directly to later plan constraints.
   - Give a recommended option and a concrete reason based on evidence strength, rework cost, and current stage goals.
   - State the cost of not deciding now in user language: wrong scope, wrong page behavior, missing acceptance basis, blocked interface confirmation, or avoidable rework.

4. **Build artifacts**
   - Write `ask-first-request.md` as the complete machine-readable decision package.
   - Write `ask-first-card.json` as the user-facing Feishu JSON 2.0 card layout.
   - Update `prd-notes.md` with `## Ask First Pending Decisions`.
   - If there are no decisions, write a minimal `PASS_NO_USER_DECISION` note instead of inventing questions.
   - Include explicit route metadata in both artifacts: `resume_command` for blocked / still-unresolved answers, and `next_command_after_pass` for successful answers. Do not rely on runtime defaults.

5. **Hand off runtime**
   - If the user wants Feishu delivery, stop after artifacts are ready and invoke `ask-first-service-runtime`.
   - If the user explicitly wants current-chat confirmation, output the Markdown decision package and still require answers in a runner-compatible shape such as `AF-001=A; AF-002=D; AF-002_custom_input=...`.

## Decision Discovery Checklist

Ask only when a decision can change plan correctness:

| Area | Ask When |
| --- | --- |
| Scope / delivery mode | Full implementation, simulated-data preview, UI skeleton, adapter-only, phased delivery, or `PARTIAL_READY` would change task boundaries. |
| UI / interaction | Figma, PRD, comments, or current code disagree on visible behavior, page structure, states, copy, table columns, buttons, drawers, modals, popovers, empty/error/loading states, or hover/tooltip rules. |
| Data / integration | Real APIs, interface metadata, IM/BPO, approval, download/upload, jump links, external systems, simulated data, schemas, or field semantics are not closed. |
| Code reuse / architecture | Multiple plausible landing points, legacy reuse strategies, state models, routes, stores, adapters, or component reuse strategies exist. |
| Verification / acceptance | The acceptance method changes by choice: local simulated data, vmok, real environment integration, screenshot design alignment, or staged acceptance. |

Do not ask about agent-owned work such as whether to test, whether to read relevant code, whether to follow known Figma evidence, or whether the user accepts a tool search failure. Do the work, translate the blocker into a business decision, or record the blocker.

## Question Contract

`ask-first-request.md` is the traceable machine package. Keep it complete enough for runtime parsing and later plan consumption, but do not copy every field into the user-facing card.

Before the first question, write route metadata explicitly:

```md
- request_id: `ask_first_<date>_<task>_<seq>`
- artifact_workspace: `<workspace>`
- resume_command: `/delivery:prd`
- next_command_after_pass: `/delivery:bam`
```

`next_command_after_pass` must come from deterministic local routing evidence, not from a guess. When `bam/bam-link-detection.md` reports `BAM_LINKS_FOUND`, set it to `/delivery:bam`; otherwise set it to `/delivery:plan`. If routing evidence is missing or conflicting, stop and fix the upstream detection before handing off runtime.

Each question must describe one decision only. If the title needs two unrelated objects, two different pages / states, two different owners, or answers that would route to different next stages, split it into separate `AF-xxx` items before writing the card.

Split questions aggressively when any of these are true:

- One answer would affect more than one plan section, such as UI scope plus API strategy.
- A user might approve one part but reject another, such as approval flow and notification delivery.
- The evidence comes from different places and one source can be closed while another remains missing.
- One option blocks the next stage but another option only records a risk.
- The card title needs `以及`、`同时`、`顺便`、`另外` to explain the decision.

Each `ask-first-request.md` question uses this compact shape:

```md
### AF-<NNN>. <单一决策标题>

- 当前分级：P0_BLOCKER / P1_RISK / P2_DETAIL / PLAN_DISCOVERY
- 问题类型：<范围 / UI / 集成 / 代码复用 / 风险>
- 用户可见类型标签：<范围确认 / 设计证据 / 资料权限 / 接口边界 / 验收口径 / 外部系统 / 代码复用>
- 业务背景：<把问题放回具体页面 / 列表 / 弹层 / tab / 列 / 按钮 / 当前对象 / 当前状态，避免“这列/这个标题”无指代>
- 需要你决定：<用户此刻需要拍板的处理口径>
- 为什么现在问：<会改变哪个 plan 约束、实现范围、用户可见行为或验收>
- 推荐策略：<A/B/C/D 中的一个>
- 推荐理由：<一句话说明为什么该选项最少返工、证据最充分或最符合当前阶段目标>
- 背景证据：<来源清单 + 可读摘要；可含本地路径 / block id / comment id，但不能只写定位符>
- 材料摘要：
  - <事实 1：来源 + 摘录或画面描述>
  - <事实 2：来源 + 摘录或画面描述>
  - <事实 3：来源 + 摘录或画面描述；最多 3 条>
- 缺口 / 冲突：<为什么现有资料还不能直接裁决>
- 证据入口：<可点击链接；若没有，写“无可点击入口：原因 + 摘录”>
- 选项：
  - A. <具体处理口径>：后续如何消费；收益；代价 / 风险
  - B. <具体处理口径>：后续如何消费；收益；代价 / 风险
  - C. <具体处理口径>：后续如何消费；收益；代价 / 风险（仅在确有第三条路时给）
  - D. 人工输入：<由人工补充规则、改判分级或说明忽略原因>
- 补充输入提示：<选择 D 或需要补链接 / 文案 / 范围时，输入框应提示什么>
- 默认落盘：若用户说“你决定”，采用 <推荐策略>，记录为用户授权决策。
```

Option text must be concrete enough that the selected value can be written directly into `decision-log.md`. Avoid generic labels such as `方案 A`、`继续处理`、`暂不处理` unless the rest of the option names the exact scope and downstream behavior.

## User-Facing Card Layout

`ask-first-card.json` is a user-facing Feishu JSON 2.0 decision card. It should be much shorter than `ask-first-request.md`: first anchor the user in the right business context, then show observed facts, the exact decision needed, plan impact, evidence, recommendation, and finally the concrete choices.

- Root `schema: "2.0"`.
- `config.update_multi: true`.
- Header title must include the task name or business object, for example `<需求名>：请确认 <N> 个范围/证据问题`. Do not use only `需要你确认 <N> 个问题`.
- Header subtitle should explain why this card matters, for example `背景、冲突、证据入口已补齐；按题选择即可`. Put resend / smoke-test / timestamp noise in local artifacts, not in the visible title.
- The first markdown block must anchor the user before explaining the operation:
  - `背景`：which requirement / page / workflow this card belongs to.
  - `当前问题`：why the current evidence is not enough to continue safely.
  - `主要入口`：PRD, Figma, design comment, technical doc, interface doc, or `无可点击入口：<reason + excerpt>`.
  - `如何回答`：1 short sentence after the above context.
- A `form` container named with `ask_first_form_<request_id>`.
- The form uses vertical layout; put all interactive controls inside this form.
- One `select_static` or equivalent single-choice field per `AF-xxx`, named `af_001_choice`, `af_002_choice`, etc.
- Option values are exactly `A`, `B`, `C`, `D`.
- Each decision has a matching optional multiline input field, such as `af_001_custom_input`, with `input_type: "multiline_text"`, `rows: 2`, `max_length: 1000`, and a placeholder tailored to that question.
- `D`, downgrade, skip, wait-for-info, or custom options require non-empty custom input during runtime validation.
- Use a right-aligned submit button in a `column_set`. The button has stable `name: "ask_first_submit"`, `form_action_type: "submit"`, callback behavior, and value containing `request_id`, `artifact_workspace`, `resume_command`, and `decision_ids`.
- The submit callback value must also include `next_command_after_pass`; it must match the metadata in `ask-first-request.md`. Runtime still treats local artifacts as authoritative, but the card value is useful for diagnostics and stale-card triage.
- Use `hr` between questions when the card has more than one question.
- Use a `collapsible_panel` only for long evidence or debug detail. The panel contains display-only `markdown`; never put `form`, `select_static`, `input`, or submit buttons inside it.
- Do not hide the only important evidence inside a collapsed panel. Each question's main markdown must contain the key fact, the user decision, the recommendation, and the cost of not deciding. The panel is for excerpts and remaining gaps.
- Collapsible panel titles must be specific and action-oriented, such as `为什么建议选 B：按 PRD 继续` or `证据和未决缺口：线索图片范围`. Do not use vague titles such as `查看依据和缺口` or `定位证据和缺口`.
- Add a short user-facing type tag near the top of every question. Use plain Chinese labels such as `范围确认`, `设计证据`, `资料权限`, `接口边界`, `验收口径`, `外部系统`, or `代码复用`. The tag is for scanning and orientation only; do not make the user reason about internal severity or workflow states.

Each visible question is rendered in this order:

1. **Decision markdown**: title, `类型`, `背景`, `我看到了什么`, `需要你决定`, `我建议`, `不确认的代价`, and `你可以怎么选`.
2. **Optional evidence panel**: collapsed by default when evidence is long; includes excerpts, links, missing pieces, and only technical locator detail when truly helpful.
3. **Short reminder markdown only when needed**: for unusually long questions, restate `我建议` in one sentence before the selector.
4. **Single-choice selector**: A/B/C/D with concrete option labels.
5. **Supplement input**: optional, with a question-specific placeholder.
6. **Divider**: except after the last question.

The decision markdown uses this shape:

```md
### 问题 <N>：<用户能看懂的问题标题>

**类型**：<范围确认 / 设计证据 / 资料权限 / 接口边界 / 验收口径 / 外部系统 / 代码复用>

**背景**
- <明确指出页面 / 列表 / 弹层 / tab / 列 / 按钮 / 当前对象 / 当前状态>
- <补充为什么会在这个具体位置产生歧义或需要裁决>

**我看到了什么**
- <事实 1>
- <事实 2>
- <事实 3>

**需要你决定**：<这次到底要拍板什么，必须可直接转成后续计划约束>。

**我建议**：选 <A/B/C/D>，因为 <一句话理由>。

**不确认的代价**：<这会影响哪个页面、流程、字段、文案、任务范围或验收；不要写抽象风险>。

**你可以怎么选**
选择下面的 A/B/C/D。需要补充页面位置、文案、链接、范围或说明忽略原因时，选 D 并填写输入框。
```

When the question mentions a UI detail such as a column header, button label, tab title, tooltip, modal copy, or empty-state copy, the `背景` block must say exactly which page / list / section it belongs to. For example, do not write `列表列头`; write `public-opinion 页面待跟进列表的“报道账号/媒体”列头`.

The optional evidence panel uses this shape:

```md
**依据摘录**
- <可点击链接 + 原文 / 画面描述，或无链接原因 + 原文摘录>
- <最多 3 条>

**还缺什么**
- <缺口 / 冲突，不超过 2 条>
```

Use `reference/feishu-card-json-examples.md` only when you need the JSON shape. Do not inline long examples into the main skill.

## User Language Rules

Card body should sound like a person explaining a decision. The visible card body should avoid internal process words, English placeholders, and pseudo-precise Chinese terms that make the user translate agent logs back into product meaning.

Do not expose these terms in the visible card body unless placed in an optional technical note after a clear Chinese explanation:

- `Source Brief`
- `P0_BLOCKER`, `P1_RISK`, `P2_DETAIL`, `PLAN_DISCOVERY`
- `/delivery:prd`, `/delivery:bam`, `/delivery:plan`
- `NOT_FOUND_AFTER_SEARCH`
- `checkout`, `check out`, `mock`, `Plan`, `BAM`, `route`, `tracker`, `runtime`, `payload`, `storage key`, `SSOT`, `baseline`, `PASS`
- `G11`, `G13`, `Stage`, `owner`, `node-id`, `page_top_node`, `option-level`, `whiteboard`
- pseudo-formal Chinese terms when plain Chinese is clearer: `承接`, `落点`, `闭合`, `证据门禁`, `主态`, `接口合同`
- bare node ids, evidence ids, comment ids, block ids
- local-only file paths or line numbers as the only evidence

Preferred replacements:

| Internal Term | User-Facing Wording |
| --- | --- |
| Source Brief | 这次为什么找你确认 |
| P1_RISK | 这个点不确认，后面任务拆分可能写错 |
| Figma NOT_FOUND_AFTER_SEARCH | 我没找到这个状态的设计图 |
| checkout / check out | 确认、提交、进入下一步，按具体业务动作写 |
| mock | 模拟数据、占位预览、暂不接真实数据，按实际含义写 |
| Plan | 后续技术计划 |
| route | 跳转地址、页面路径、进入方式 |
| tracker | 埋点规则、统计事件 |
| runtime / payload / storage key | 运行时信息、提交内容、缓存字段；只在技术附录出现 |
| SSOT / baseline | 唯一依据、现有页面代码；不要直接写英文缩写 |
| legacy baseline | 现有页面代码（用于判断复用哪些已有代码） |
| BAM | 接口元数据（用于确认接口字段、路径和方法） |
| style contract | 视觉规格（列宽、截断、hover、tooltip 等） |
| 承接 / 落点 / 闭合 | 下一步怎么做、改到哪个页面、是否完成 |
| 证据门禁 | 需要补齐的依据 |
| 接口合同 | 接口字段和调用规则 |

## Evidence Rules

Every question needs:

- Text evidence: PRD paragraph, comment, whiteboard text, technical doc paragraph, BAM item, or code baseline path.
- Readable excerpt: a quote, table row, comment body, field explanation, or visual description that the user can understand without opening local artifacts.
- Visual evidence state for UI / interaction / visual / page-structure questions: Figma node, screenshot, whiteboard image, cached image, or a clear statement of what was searched and what is missing.
- Context anchor: for columns, buttons, tabs, titles, filters, list items, drawers, or modal copy, explicitly name the page / list / section / state where the item lives.

Clickable links are best effort, but excerpts are mandatory. If no link can be constructed, write `无可点击入口：<原因>` and include the concrete excerpt.

## Self-Check Gate

Before writing or sending artifacts, verify:

- All still-relevant P0/P1/P2/PLAN_DISCOVERY items are represented or explicitly removed in `Source Brief` with reasons.
- No question asks about something already decided.
- Each question title is concrete and user-readable.
- Each question has evidence entry, readable excerpt, recommended strategy, and options that map to plan constraints.
- Each question covers one decision only.
- No user-facing question bundles multiple issues such as scope + interface + UI state in one answer.
- The card body uses only user-facing section names: `类型`、`背景`、`我看到了什么`、`需要你决定`、`我建议`、`不确认的代价`、`依据摘录`、`还缺什么`、`你可以怎么选`.
- The card does not expose raw machine fields such as `当前分级`、`问题类型`、`背景证据`、`调试定位` unless rewritten into readable evidence or hidden in a collapsed evidence panel. If a type is shown to users, write it as `类型：范围确认`, not `问题类型：P1_RISK`.
- Local paths, ids, and debug locations never replace readable evidence.
- Any phrase like `这列`、`这个标题`、`这个按钮`、`这条规则` is anchored by `背景` to a specific page / list / section / state.
- No runtime service step is attempted by this skill.
- `ask-first-request.md` contains `request_id`, `artifact_workspace`, `resume_command`, and `next_command_after_pass`.
- `ask-first-card.json` submit value carries the same `request_id` and `next_command_after_pass`.

If any item fails, rewrite the question package before handing off to runtime.

## No-Decision Output

When no user decision is needed:

```md
## Ask First Gate
- Result: PASS_NO_USER_DECISION
- Decisions Logged: none
- Remaining P0: none
- Plan Inputs: no new Ask First constraints
- Next: /delivery:plan
```

Do not generate a Feishu card just for ceremony.

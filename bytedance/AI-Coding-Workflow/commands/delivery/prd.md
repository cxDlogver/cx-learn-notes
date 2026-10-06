---
description: 执行 PRD 解析，生成模块拆解、原子需求、验收标准和未决问题
---

请按 `.trae/AGENTS.md` 的 Phase Gate Rules 执行 `/delivery:prd`。

## Mandatory Precheck

必须读取：

- `.trae/AGENTS.md`
- `.trae/PROJECT_CONTEXT.md`
- `.trae/DELIVERY_STATE.md`
- 当前 workspace 下的 `prd-source.md`
- 当前 workspace 下的 `00-inputs.md`
- `.trae/skills/03-prd-analysis/SKILL.md`

如果 `DELIVERY_STATE.md` 中 `Pause State.is_paused = true` 且 `resume_command` 不是 `/delivery:prd`，必须停止并提示用户先处理当前暂停问题。

如果 `00-inputs.md` 未明确记录 `design_source_status`，必须停止并回到 `/delivery:init` 修复输入包。

如果 `design_source_status` 既不是 `FIGMA_FOUND` 也不是 `FIGMA_NOT_FOUND`（扫描未完成或失败），不得继续 `/delivery:prd`。

## Execute

执行 `prd-analysis` skill。
必须按 `prd-analysis` skill 的 Stage 1A/1B/1C/2 执行：

1. 主 Agent 只做阶段路由、固定输入包准备和门禁审查；不得亲自执行 Figma / Lark MCP 取证。
2. 如 PRD 含 Figma 链接或核心 UI 改造，必须委派 `prd-analyzer` agent 或 MCP-capable 子 Agent 扮演 `prd-analyzer` 执行 Stage 1A：调用 MCP、生成 / 修复 `figma-cache/`、`figma-evidence-pack.md` 与 `prd-figma-supplement.md`。
3. 如果命名型 `prd-analyzer` 运行时未暴露 `run_mcp`，主 Agent 必须改派具备 `run_mcp` 的子 Agent，并要求其读取 `.trae/agents/prd-analyzer.md` 后执行；不得亲自调用 MCP。
4. 必须由 `prd-analyzer` 角色子 Agent 执行 Stage 1B：审核 evidence pack 与 `prd-figma-supplement.md` 的 Gate 一致性；若缺口可通过最小 MCP 补抓闭合，由子 Agent 自行补抓和修复产物。
5. 审核必须覆盖 G1-G18、`Direct Node Targets`、`Sibling Overlay Scan`、`Figma Atlas Coverage Matrix`、`Visual Tile Index`、`Requirement-to-Atlas Coverage`、`Page Evidence Coverage Matrix`、`State Evidence Matrix` 和 `Deep Scan Coverage Matrix`；若本轮 PRD 明确实现的页面、Tab active 态、业务域 option、Drawer、Modal、Popover、Confirm、表格展开态截图 / node 不足，不得进入正式 PRD 分析或 `/delivery:plan`。
6. 审核失败时，主 Agent 只做 Gate Review 和定向再派发，不得亲自补 MCP 缺口或修正文档；属于本轮 UI 范围的深扫缺口必须由子 Agent 在当前 PRD 阶段闭合或登记 P0，不得后移到 Plan。
7. Stage 1 审核通过后，必须委派 `prd-analyzer` 角色子 Agent 完成长文 PRD 拆解。

每次子 Agent 返回后，主 Agent 必须先审 `Agent Gate Summary`，再审关键门禁表。只有 summary 和门禁表均支持 PASS，才能更新阶段状态；若为 `BLOCKED` 或 `NEEDS_TARGETED_REVIEW`，只定向回读对应 evidence，不得默认全文复审。

## Required Artifacts

- `03-prd-analysis.md`
- `uncertainty-register.md`
- `ui-source-map.md`
- `figma-evidence-pack.md` (当 `design_source_status = FIGMA_FOUND` 时必需)
- `prd-figma-supplement.md` (当 `design_source_status = FIGMA_FOUND` 时必需)
- `figma-cache/atlas/` (当 `design_source_status = FIGMA_FOUND` 时必需)
- `decision-log.md` 如有关键判断
- `prd-notes.md` 用于记录 Ask First 决策详情和飞书反馈过程

## Gate

PRD 阶段问题判定约束：

- 不要求用户在 PRD 阶段提供完整数据接口合同。
- 仅缺少接口路径、请求字段、响应字段、分页、排序、错误码时，不得作为阻塞 `/delivery:plan` 的 P0。
- 上述问题应登记为 `PLAN_DISCOVERY` / `P1_RISK`，交由 `/delivery:plan` 通过 BAM、仓库现有接口、service 或技术文档闭合；若用户选择 `MOCK_PREVIEW` 并需要运行时 mock 闭合预览，后续由 verify / design 在 active case 通过 `/delivery:mock` 生成或调整 BAM mock。非 `MOCK_PREVIEW` 下缺 mock 不阻塞后续阶段。
- 若 `design_source_status = FIGMA_FOUND`，但本阶段未满足 Figma 证据要求，必须登记为 P0 并交给 Ask First 提问；不得在未进入 Ask First 的情况下直接进入 `/delivery:plan`。
- 若 `design_source_status = FIGMA_NOT_FOUND`，只有满足白板 / legacy baseline 的降级前提时，才允许继续；具体判定以 `prd-analysis` skill 为准。

PRD 分析产物生成后：

1. 更新 `03-prd-analysis.md`、`uncertainty-register.md`、`ui-source-map.md` 和相关 Figma evidence。若存在 P0，不得只向用户口头提问，必须进入 Ask First 决策包。
2. `/delivery:prd` 先判断“是否进入 `/delivery:bam`”，不得承担 BAM 同步本身。
3. 判断下一步是 `/delivery:bam` 还是 `/delivery:plan` 时，必须实际执行下面的确定性检测命令，生成当前 workspace 的 `bam/bam-link-detection.md`；不得只凭人工阅读、快速 grep 或主观印象判断：

```bash
node .trae/scripts/sync_bam_config_from_tech_doc.mjs \
  --workspace <workspace> \
  --detect-only \
  --report <workspace>/bam/bam-link-detection.md
```

4. 评论区中的 BAM 文档链接与正文中的 BAM 文档链接同等有效。
5. 必须执行 `ask-first` skill，作为 PRD 完成后的人工决策闸门：
   - 必须读取 `03-prd-analysis.md`、`uncertainty-register.md`、`ui-source-map.md`、`decision-log.md`、`prd-notes.md`、`tech-doc-raw.md`、Figma evidence 和 `bam/bam-link-detection.md`。
   - 必须把 P0/P1/P2/PLAN_DISCOVERY/低置信策略全部列入决策包；P0 也必须交给人工回答，不得在 Ask First 前直接阻塞。
   - `ask-first-request.md` 与 `ask-first-card.json` 必须显式携带 `resume_command` 和 `next_command_after_pass`；若 `bam/bam-link-detection.md` 命中 BAM 链接，`next_command_after_pass` 必须为 `/delivery:bam`，否则为 `/delivery:plan`。
   - 启动 runner 前必须确认 `.trae/config/ask-first-runtime.local.json` 存在且具备 `app_secret_keychain` 或 `app_secret_env` secret 来源；若缺失，必须引导用户执行 `.trae/scripts/ask_first_runner/bootstrap_runtime_config.py` 完成本地初始化，等待用户反馈完成后再继续。
   - Ask First 问题和 `ask-first-card.json` 生成后，必须优先启动 `.trae/scripts/ask_first_runner/ask_first_long_connection.py` 正常模式；该模式先启动长连接接收器，再发送飞书交互卡片，并阻塞等待用户提交。不得用 `--send-only` 代替闭环。
   - 长连接监听必须保持在线，直到匹配的回调已落盘、文本 fallback 已通过 runner 落盘，或用户明确要求停止；匹配回调落盘后，当前 runner 必须显式断开并退出，避免残留旧 listener 干扰后续 Ask First 请求。不得仅因发送响应 / 消息预览显示“请升级至最新版本客户端”就停止监听或改走文本 fallback。
   - 只有在监听在线、用户提交最新标记卡片后仍返回“提交失败”且 `ask-first-events.jsonl` 未收到匹配的 `card.action.trigger`，或长连接 / developer-server 回调路径有明确不可用证据时，才允许按 `ask-first-service-runtime` 的 `TEXT_FALLBACK` 规则处理。
   - 若用户看到“忽略其他 Ask First 请求”或“目标回调服务未在线”，必须先按 `ask-first-service-runtime` 排查旧卡 / 旧 runner / request_id 不匹配；重发时必须让新卡具备可见标记并保持监听在线，不得让用户反复点击旧卡。
   - 用户提交后，回调必须返回冻结态 raw 卡片，展示用户已提交内容，并移除表单、输入框和提交按钮；PRD 后续流程以回调落盘后的 `ask-first-resume-request.json` 与 `DELIVERY_STATE.md.next_command` / `resume_command` 继续。
   - 卡片发送成功后，主 Agent 必须创建或更新附着当前线程的 heartbeat 唤醒机制：等待 `ask-first-resume-request.json.status = READY` 后自动恢复 `/delivery:prd`，不得要求用户手动再次输入 `/delivery:prd`；若当前运行环境没有 heartbeat 能力，必须记录降级原因。
   - 反馈落盘到 `decision-log.md` 和 `prd-notes.md` 后才允许进入下一阶段。
   - 若 Ask First Gate = `BLOCKED`，更新 `DELIVERY_STATE.md` Pause State，不得进入 `/delivery:bam` 或 `/delivery:plan`。
   - 若 Ask First Gate = `PASS` / `PASS_NO_USER_DECISION`，将 PRD 阶段标记为 DONE。
6. 若检测命中任意 BAM 文档链接，Ask First 放行后的下一步建议：`/delivery:bam`；否则 Ask First 放行后的下一步建议：`/delivery:plan`。

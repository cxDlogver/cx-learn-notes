# Trae MCP Config Export

Export time: 2026-06-23

Scope: `/Users/bytedance/Desktop/BPO2/.trae`

This file is a sanitized export of the MCP configuration and tool descriptors currently used by the Trae delivery workflow. It intentionally exports server names, stage usage, descriptor locations, tool names, required inputs, and migration notes only. It does not export tokens, cookies, OAuth state, UAT, session storage, local browser profiles, or any credential-bearing runtime config.

## Source Layers

| Layer | Source | Meaning |
| --- | --- | --- |
| Repo agent declarations | `.trae/agents/*.md` frontmatter | The MCP servers the workflow expects named agents to receive. |
| Trae runtime descriptors | `/Users/bytedance/.trae-cn/mcps/<session>/<agent>/<server>/` | Tool descriptors exposed by this local Trae runtime. These are schema descriptors, not portable auth configs. |
| Task evidence | `artifacts/7329579007-tr-policy-bpo-pass-through-phase-2/figma-evidence-pack.md` | MCP tools actually exercised in the BPO2 task. |
| Workflow rules | `.trae/commands/*`, `.trae/skills/*`, `.trae/agents/*` | Stage-specific rules that decide which MCP is required or preferred. |

## Repo Declared MCP Servers

| File | Declared MCP servers | Notes |
| --- | --- | --- |
| `.trae/agents/prd-analyzer.md` | `bytedance-figma-mcp`, `Figma_AI_Bridge`, `LarkDocs`, `feishu` | PRD evidence collection: Figma, Feishu/Lark docs, wiki, sheet, whiteboard, media. Requires `run_mcp`. |
| `.trae/agents/tech-planner.md` | `bytedance-figma-mcp` | Plan stage may read Figma node data/contracts while drafting `04-tech-plan.md`. |

Other agents do not declare `mcpServers` in frontmatter. They still consume outputs produced by MCP-backed stages, especially Figma evidence, D2C/F2C evidence, browser screenshots, and runtime verification evidence.

## Current Runtime Server Inventory

### BPO2 PRD Analyzer Runtime

Root: `/Users/bytedance/.trae-cn/mcps/s_BPO2-59140f6a/prd-analyzer`

| Server | Tool count | Role |
| --- | ---: | --- |
| `mcp_bytedance-figma-mcp` | 4 | Primary Figma source. Supports direct PRD `fileKey` / `nodeId` reads and Figma image export. |
| `mcp_Figma_AI_Bridge` | 0 in this root | Declared in repo, but not present under this BPO2 `prd-analyzer` runtime root. Present in broader `solo_agent` runtime. |
| `mcp_LarkDocs` | 2 | Lark doc and wiki search/content reads. |
| `mcp_feishu` | 45 | Feishu user-context tools: doc, wiki, sheet, media, whiteboard, auth/user checks, comments, IM, calendar, task, etc. |

### Current Trae Solo Agent Runtime

Root: `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent`

| Server | Tool count | Role |
| --- | ---: | --- |
| `integrated_browser` | 16 | Preferred desktop browser evidence source for verify/design runtime interaction, snapshots, screenshots, console, network; provides `browser_evaluate` for `/delivery:bits --coverage` Huatuo collection. |
| `mcp_chrome-devtools` | 29 | Desktop fallback or headless browser evidence source when the runtime exposes a DevTools path; also used for diagnostics, screenshots, console, network, performance. |
| `mcp_bytedance-figma-mcp` | 4 | Figma direct read/export. Same core schema as BPO2 PRD analyzer runtime. |
| `mcp_Figma_AI_Bridge` | 2 | Figma bridge fallback. Current workflow should prefer `mcp_bytedance-figma-mcp` when PRD URL/fileKey direct read is required. |
| `mcp_LarkDocs` | 2 | Lark document content/search. |
| `mcp_feishu` | 45 | Feishu user-context tools. |
| `mcp_d2c-mcp-server` | 4 | F2C/D2C evidence for first-time UI structure implementation. |
| `mcp_byted_fe_mcp` | 20 | FE component-library lookup and component usage search. |

### Current Trae Solo Coder Runtime

Root: `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_coder`

Observed servers:

- `integrated_browser`
- `mcp_LarkDocs`

This runtime is narrower than `solo_agent`; do not assume all Figma/D2C/Feishu tools are available inside `solo_coder`.

## Stage Usage Matrix

| Stage / command | MCP server(s) | Required / preferred tools | Output artifacts |
| --- | --- | --- | --- |
| `/delivery:init` | `mcp_feishu`, `mcp_LarkDocs` | `feishu_fetch_doc`, `feishu_lark_parser`, `feishu_wiki_space_node`, `feishu_doc_media`, `feishu_whiteboard`, `get_lark_doc_content` | PRD/tech-doc extraction reports, raw resources, copied local markdown references. |
| `/delivery:prd` | `mcp_bytedance-figma-mcp`, `mcp_feishu`, `mcp_LarkDocs` | `get_bytedance_figma_data`, `download_figma_images`, `feishu_search_doc_wiki`, `feishu_fetch_doc`, `feishu_sheet`, `feishu_whiteboard`, `feishu_doc_media`, `get_lark_doc_content` | `figma-evidence-pack.md`, `figma-cache/**`, `prd-figma-supplement.md`, PRD analysis. |
| `/delivery:plan` | `mcp_bytedance-figma-mcp`, optionally `mcp_byted_fe_mcp` | Figma node reads; component library lookup when implementation needs component evidence. | `04-tech-plan.md`, Figma Interaction Contract, Visual Contract. |
| `/delivery:code` | `mcp_d2c-mcp-server`, `mcp_byted_fe_mcp` | `get_d2c_json`, `get_d2c_result`, `get_d2c_scss_result`, `search_component`, `search_components_multi`, `list_library_components` | D2C/F2C evidence consumed by `F2C_REQUIRED` tasks. |
| `/delivery:verify` | `TRAE_DESKTOP`: `integrated_browser`, fallback `mcp_chrome-devtools`; `COCO_CLI_HEADLESS`: Playwright Chromium or headless browser MCP / DevTools | Desktop: `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, `browser_console_messages`, `browser_network_requests`; CLI: headless goto / DOM / screenshot / console / network equivalents | Runtime evidence, screenshots, network/console facts, case queue updates. |
| `/delivery:design` | `TRAE_DESKTOP`: `integrated_browser`; `COCO_CLI_HEADLESS`: Playwright Chromium or headless browser MCP / DevTools; plus `mcp_bytedance-figma-mcp`, `mcp_d2c-mcp-server` | Runtime screenshots/snapshots plus Figma node/screenshot or D2C node data | Design-vs-runtime evidence; design rework tasks when mismatch exists. |
| `/delivery:mock` | No MCP required by default | BAM mock is handled by local skill/scripts and platform/CLI integration, not exported here as MCP config. | `delivery-mock.md`, mock manifest, BAM marker patch evidence. |
| `/delivery:bits --coverage` | `integrated_browser` | `browser_navigate`, `browser_evaluate` | Huatuo branch coverage reports under `bits-flow/cov/<cov-run-id>/coverage/`, coverage state and review expression. |

## Server Details

### `mcp_bytedance-figma-mcp`

Descriptor roots:

- `/Users/bytedance/.trae-cn/mcps/s_BPO2-59140f6a/prd-analyzer/mcp_bytedance-figma-mcp`
- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_bytedance-figma-mcp`

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `get_bytedance_figma_data` | `fileKey` | `nodeId`, `depth` | Primary direct read from PRD Figma URL / fileKey / nodeId. |
| `get_figma_data` | `fileKey` | `nodeId`, `depth` | Backup direct Figma layout read. |
| `download_figma_images` | `fileKey`, `nodes`, `localPath`; each node needs `nodeId`, `fileName` | per-node `imageRef` | Export node/icon/image screenshots to local evidence cache. |
| `get_local_variables` | `fileKey` | none | Token/variable inspection when visual contract needs design token evidence. |

Rules:

- Must read the tool descriptor before calling.
- Must use PRD-provided URL/fileKey/nodeId when claiming direct Figma evidence.
- Must not use Figma Desktop active document/current selection as PRD evidence.
- Screenshot/export support is determined by runtime probe, not descriptor text alone.

### `mcp_Figma_AI_Bridge`

Descriptor root:

- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_Figma_AI_Bridge`

Observed tools:

- `get_figma_data`
- `download_figma_images`

Rules:

- Declared by `prd-analyzer`, but current workflow should prefer `mcp_bytedance-figma-mcp` for PRD URL/fileKey direct reads.
- Treat as fallback only after confirming its descriptor supports the same target URL/node semantics required by the stage.

### `mcp_LarkDocs`

Descriptor roots:

- `/Users/bytedance/.trae-cn/mcps/s_BPO2-59140f6a/prd-analyzer/mcp_LarkDocs`
- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_LarkDocs`
- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_coder/mcp_LarkDocs`

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `get_lark_doc_content` | one of `doc_url` or `doc_info{docs_type,docs_token}` | none | Read docx/sheet/bitable content when accessible. |
| `search_lark_doc` | `type`, `keyword`, `count` | none | Search document/wiki sources. |

### `larkparser`

Install package:

- `@byted/larkparser-cli`

MCP entrypoint:

- `larkparser-mcp`

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `lark_fetch` | document URL | mode / image caption / table header options | Convert Lark/Feishu docs to Markdown. |
| `lark_search` | query | max count / doc type filters | Search Lark/Feishu documents. |
| `lark_render` | Markdown content | title / document token / folder token | Create or update Lark document from Markdown. |
| `lark_auth` | action-specific | auth mode options | Auth status/login helper. |

Rules:

- This is a standalone LarkParser MCP/CLI and complements `mcp_feishu.feishu_lark_parser`.
- Auth is intentionally not exported. Use interactive `larkparser auth login`, or configure `USER_JWT_EXEC` / `USER_JWT_TOKEN` in the target environment.

### `mcp_feishu`

Descriptor roots:

- `/Users/bytedance/.trae-cn/mcps/s_BPO2-59140f6a/prd-analyzer/mcp_feishu`
- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_feishu`

Core workflow tools:

| Tool | Required inputs | Optional / action-specific inputs | Workflow use |
| --- | --- | --- | --- |
| `feishu_get_user` | none | `user_id`, `user_id_type` | Preflight/auth sanity check. |
| `feishu_auth` | action-specific | action-specific | Login/auth recovery, never export resulting credentials. |
| `feishu_fetch_doc` | `doc_id` | `offset`, `limit` | Fetch doc/wiki content as markdown. |
| `feishu_lark_parser` | `url` | `mode`, `enable_image_caption`, `enable_table_header_extract`, `agent_friendly` | Strict/enhanced parser output for doc extraction. |
| `feishu_wiki_space_node` | `action` | `space_id`, `token`, `obj_type`, etc. | Resolve wiki node to actual object token/type. |
| `feishu_search_doc_wiki` | `action=search` | `query`, `filter`, `page_token`, `page_size` | Search document/wiki references. |
| `feishu_doc_media` | `action` | download: `resource_token`, `resource_type`, `output_path`; insert: `doc_id`, `file_path` | Download PRD images / whiteboard thumbnails / media nodes. |
| `feishu_whiteboard` | `action` | list/read/render/write params such as `whiteboard`, `doc_id`, `input_path`, `content` | List whiteboard nodes, inspect embedded image tokens, render/create only when explicitly needed. |
| `feishu_sheet` | `action` | `url` or `spreadsheet_token`, `range`, `sheet_id`, etc. | Read/search/export spreadsheet references. |

Additional exposed Feishu tools:

- Bitable: `feishu_bitable_app`, `feishu_bitable_app_table`, `feishu_bitable_app_table_field`, `feishu_bitable_app_table_record`, `feishu_bitable_app_table_view`
- Calendar: `feishu_calendar_calendar`, `feishu_calendar_event`, `feishu_calendar_event_attendee`, `feishu_calendar_freebusy`
- Chat/IM: `feishu_chat`, `feishu_chat_members`, `feishu_im_user_fetch_resource`, `feishu_im_user_get_messages`, `feishu_im_user_get_thread_messages`, `feishu_im_user_message`, `feishu_im_user_search_messages`
- Docs/Drive: `feishu_create_doc`, `feishu_update_doc`, `feishu_doc_comments`, `feishu_drive_file`, `feishu_drive_permission`
- User/search/task/wiki/magic: `feishu_search_user`, `feishu_task_comment`, `feishu_task_subtask`, `feishu_task_task`, `feishu_task_tasklist`, `feishu_wiki_space`, `feishu_card`, `feishu_lark_ask`, `feishu_lark_ask_auth_check`, `feishu_lark_ask_topics`, `feishu_magic_doc`, `feishu_magic_faas`, `feishu_magic_page`, `feishu_meegle`, `feishu_tos_upload`

Rules:

- Preflight checks should first try MCP descriptors and `feishu_get_user`; use `feishu-lark` CLI only as fallback.
- Do not hardcode a session directory in workflow logic. Use glob discovery for `mcp_feishu/tools/<tool>.json`.
- Media/whiteboard extraction must save raw node JSON/media manifests when used as evidence.
- Auth outputs, OAuth state, UAT, and user tokens are not part of this export.

### `mcp_d2c-mcp-server`

Descriptor root:

- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_d2c-mcp-server`

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `get_d2c_json` | `figma_url` | `library`, `plugin_name`, `d2c_config.imageOptions` | Fetch structured D2C JSON evidence. |
| `get_d2c_result` | `figma_url` | `library`, `plugin_name`, `d2c_config.imageOptions` | Tailwind-style D2C code result for F2C evidence. |
| `get_d2c_scss_result` | `figma_url` | `library`, `plugin_name`, `d2c_config.imageOptions` | SCSS-style D2C code result for F2C evidence. |
| `get_d2c_plugin_list` | none | none | Discover public plugin names. |

Rules:

- `F2C_REQUIRED` tasks must have D2C/F2C evidence or block before implementation.
- D2C evidence supplements Figma node/screenshot evidence; it does not replace the need to trace back to a PRD Figma node.

### `mcp_byted_fe_mcp`

Descriptor root:

- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_byted_fe_mcp`

Core workflow tools:

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `search_component` | `query` | `repo` | Search component usage/docs by keyword. |
| `search_components_multi` | `queries` | `repo` | Search multiple component keywords at once. |
| `list_library_components` | `library` | none | List components from a known FE library. |

Additional exposed library tools:

- `apf`, `auxo`, `bpsc`, `bytes`, `dprc`, `keystone`, `kura`, `lgdesign`, `net-common`, `okee`, `okee-react-mobile`, `people`, `tinker-v1`, `tinker-v2`, `universe`, `universe-mobile`, `xgraph`

### `integrated_browser`

Descriptor root:

- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/integrated_browser`
- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_coder/integrated_browser`

Core workflow tools:

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `browser_navigate` | `url` | `newTab`, `position`, `take_screenshot_afterwards`, `viewId` | Open target page for verify/design. |
| `browser_snapshot` | none | `selector`, `maxDepth`, `interactive`, `compact`, `includeDiff`, `viewId` | Primary DOM/a11y evidence. |
| `browser_take_screenshot` | none | `filename`, `fullPage`, `ref`, `element`, `viewId` | Runtime screenshot evidence. |
| `browser_console_messages` | none | `viewId` | Console error/warning evidence. |
| `browser_network_requests` | none | `viewId` | Network request evidence. |
| `browser_click` | `element`, `ref` | `button`, `doubleClick`, offsets, modifiers, `viewId` | Interaction evidence. |
| `browser_type` | `element`, `ref`, `text` | `clear`, `slowly`, `submit`, `viewId` | Form/search interaction evidence. |
| `browser_wait_for` | none | `text`, `textGone`, `time`, `timeout`, `viewId` | Deterministic wait for runtime state. |

Additional exposed tools:

- `browser_evaluate`, `browser_get_attribute`, `browser_hover`, `browser_navigate_back`, `browser_press_key`, `browser_scroll`, `browser_select_option`, `browser_tabs`

`/delivery:bits --coverage` uses `browser_evaluate` from an authenticated Huatuo page to run the loader produced by the coverage script. The browser request must use the logged-in session in the browser page; cookies, request bodies, and raw credential-bearing state must not be copied into repo artifacts.

Rules:

- Use only in `TRAE_DESKTOP` as the preferred verify/design runtime source.
- Save screenshots under the active workspace `screenshots/` with stable case IDs when required.
- Verify can produce runtime sources for design, but must not claim Figma-vs-runtime visual pass.

### `mcp_chrome-devtools`

Descriptor root:

- `/Users/bytedance/.trae-cn/mcps/s_alliance-operation-mono-90c139bb/solo_agent/mcp_chrome-devtools`

Core fallback tools:

| Tool | Required inputs | Optional inputs | Workflow use |
| --- | --- | --- | --- |
| `new_page` | `url` | `background`, `isolatedContext`, `timeout` | Open page in DevTools fallback. |
| `navigate_page` | action-specific | `url`, `timeout`, reload options | Navigate/reload/back/forward. |
| `take_snapshot` | none | `verbose`, `filePath` | Fallback a11y tree evidence. |
| `take_screenshot` | none | `format`, `quality`, `uid`, `fullPage`, `filePath` | Fallback screenshot evidence. |
| `list_console_messages` | none | pagination/filter params | Fallback console evidence. |
| `list_network_requests` | none | pagination/filter params | Fallback network evidence. |
| `click` | `uid` | `dblClick`, `includeSnapshot` | Fallback interaction. |
| `fill` | `uid`, `value` | `includeSnapshot` | Fallback form fill. |
| `type_text` | `text` | `submitKey` | Fallback keyboard typing. |
| `wait_for` | `text[]` | `timeout` | Fallback wait. |

Additional exposed tools:

- Page: `close_page`, `list_pages`, `select_page`, `resize_page`, `emulate`
- Input: `drag`, `hover`, `fill_form`, `press_key`, `handle_dialog`, `upload_file`
- Diagnostics: `evaluate_script`, `get_console_message`, `get_network_request`, `lighthouse_audit`, `performance_start_trace`, `performance_stop_trace`, `performance_analyze_insight`, `take_heapsnapshot`

Rules:

- Use as `TRAE_DESKTOP` fallback when `integrated_browser` cannot provide required evidence, or as `COCO_CLI_HEADLESS` evidence source only when the available DevTools/browser MCP is explicitly headless. Otherwise CoCo / CLI should use Playwright Chromium or an equivalent headless browser runner.
- Browser profiles/cookies are local runtime state and are not exported.

## Portable Manifest

This is the normalized MCP list the workflow expects on a new Trae machine. It is intentionally server-name based; actual install/enable commands depend on the Trae MCP marketplace/internal bootstrap.

Runnable-style install template:

- `docs/mcp-servers.install.yaml`
- CLI dependency installation guide: `docs/cli-installation.md`

```json
{
  "mcpServers": [
    {
      "name": "bytedance-figma-mcp",
      "runtimeName": "mcp_bytedance-figma-mcp",
      "requiredFor": ["delivery:prd", "delivery:plan", "delivery:design", "F2C evidence"],
      "requiredTools": ["get_bytedance_figma_data", "get_figma_data", "download_figma_images", "get_local_variables"]
    },
    {
      "name": "Figma_AI_Bridge",
      "runtimeName": "mcp_Figma_AI_Bridge",
      "requiredFor": ["fallback only"],
      "requiredTools": ["get_figma_data", "download_figma_images"]
    },
    {
      "name": "LarkDocs",
      "runtimeName": "mcp_LarkDocs",
      "requiredFor": ["delivery:init", "delivery:prd"],
      "requiredTools": ["get_lark_doc_content", "search_lark_doc"]
    },
    {
      "name": "larkparser",
      "runtimeName": "larkparser",
      "requiredFor": ["delivery:init", "feishu-doc-extractor fallback"],
      "requiredTools": ["lark_fetch", "lark_search", "lark_render", "lark_auth"]
    },
    {
      "name": "feishu",
      "runtimeName": "mcp_feishu",
      "requiredFor": ["delivery:init", "delivery:prd", "feishu-doc-extractor"],
      "requiredTools": ["feishu_get_user", "feishu_auth", "feishu_fetch_doc", "feishu_lark_parser", "feishu_wiki_space_node", "feishu_search_doc_wiki", "feishu_doc_media", "feishu_whiteboard", "feishu_sheet"]
    },
    {
      "name": "d2c-mcp-server",
      "runtimeName": "mcp_d2c-mcp-server",
      "requiredFor": ["delivery:code F2C_REQUIRED", "delivery:design"],
      "requiredTools": ["get_d2c_json", "get_d2c_result", "get_d2c_scss_result", "get_d2c_plugin_list"]
    },
    {
      "name": "byted_fe_mcp",
      "runtimeName": "mcp_byted_fe_mcp",
      "requiredFor": ["delivery:plan", "delivery:code component evidence"],
      "requiredTools": ["search_component", "search_components_multi", "list_library_components"]
    },
    {
      "name": "integrated_browser",
      "runtimeName": "integrated_browser",
      "requiredFor": ["delivery:verify/design in TRAE_DESKTOP", "delivery:bits --coverage"],
      "requiredTools": ["browser_navigate", "browser_snapshot", "browser_take_screenshot", "browser_console_messages", "browser_network_requests", "browser_click", "browser_type", "browser_wait_for", "browser_evaluate"]
    },
    {
      "name": "chrome-devtools",
      "runtimeName": "mcp_chrome-devtools",
      "requiredFor": ["desktop browser fallback", "headless browser fallback when supported", "diagnostics"],
      "requiredTools": ["new_page", "navigate_page", "take_snapshot", "take_screenshot", "list_console_messages", "list_network_requests", "click", "fill", "type_text", "wait_for"]
    }
  ]
}
```

## New Machine Preparation

Before running this Trae workflow on a new machine, prepare:

1. Trae CN runtime with MCP support enabled.
2. Internal network/VPN/SSO access for ByteDance Figma, Feishu/Lark, D2C, and component-library MCPs.
3. MCP servers enabled in Trae with the same logical names listed in the portable manifest.
4. Feishu user-context auth completed; validate with `feishu_get_user`.
5. Figma MCP access validated with a harmless `get_bytedance_figma_data` call on an accessible fileKey.
6. Browser MCP validated with `browser_navigate`, `browser_snapshot`, `browser_take_screenshot`, console, and network tools.
7. Browser MCP validated with `browser_evaluate` before `/delivery:bits --coverage`; Huatuo login must stay in the browser session and must not be exported.
8. Optional CLI fallback for Feishu docs: `feishu-lark` plus a matching Node runtime, only when MCP is unavailable.

## Validation Checklist

Use this checklist after MCP setup:

```bash
# Descriptor presence, session root will vary per machine.
find ~/.trae-cn/mcps -path '*/mcp_bytedance-figma-mcp/tools/get_bytedance_figma_data.json' -print
find ~/.trae-cn/mcps -path '*/mcp_feishu/tools/feishu_get_user.json' -print
find ~/.trae-cn/mcps -path '*/integrated_browser/tools/browser_snapshot.json' -print
find ~/.trae-cn/mcps -path '*/mcp_d2c-mcp-server/tools/get_d2c_json.json' -print

# Secret scan for this export.
rg -n "Bearer|Authorization|cookie|jwt|password|secret|UAT|token=" /Users/bytedance/Desktop/BPO2/.trae/docs/mcp-config-export.md
```

Expected secret scan result: no credential values. The document may mention sensitive keywords only in “not exported” warnings or schema field names such as `resource_token`.

## Known Gaps

- The exported runtime paths are local descriptor paths and will change on another machine/session.
- Trae does not store portable server launch command/env in this repo; actual MCP install/enablement must be done through Trae/internal MCP setup.
- `mcp_Figma_AI_Bridge` is declared by `prd-analyzer` but current workflow rules prefer `mcp_bytedance-figma-mcp` for direct PRD Figma evidence.
- `solo_coder` currently exposes fewer MCP servers than `solo_agent`; do not delegate Figma/D2C/Feishu-dependent work to a runtime that lacks those tools.

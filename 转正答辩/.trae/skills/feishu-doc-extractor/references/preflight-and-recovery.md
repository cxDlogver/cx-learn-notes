# 前置检查、写入与恢复规范

本文件完整保留原 Skill 的 Preflight、Node/transport 选择、登录恢复、写入降级、恢复分类和补跑规范；执行对应阶段时必须完整读取。

## Preflight Checks

前置检查必须覆盖 Skill 文件、可用工具方式、`selected_transport` 对应 Node 版本、本地脚本 PATH、登录状态。将结果写入 `<RES>/raw/preflight.json`。先检查 MCP 工具是否可用；MCP 不可用时，再检查 `feishu-lark` CLI。确定 `selected_transport` 后，后续所有飞书工具调用统一使用该方式和对应 Node 版本；本地验收脚本和仓内 `.mjs` / `.js` 脚本也必须使用同一个 Node bin 的 `PATH` 前缀执行。如果工具缺失，或按 `Login Recovery` 恢复后登录仍未通过，只保存 preflight 失败证据并在最终回复给出修复指引；不要创建 `<REPORT>`，也不要继续读取正文、评论、媒体或白板。

### Skill Files

至少检查下列后续会用到的 Skill 文件，并在调用相关能力前读取对应 `SKILL.md`：

| Skill file | 作用 | 后续调用位置 |
| --- | --- | --- |
| `feishu-auth/SKILL.md` | 处理 OAuth、UAT、用户态 / bot mode、未登录或 token 过期时的恢复路径。 | `Preflight Checks` 的登录验证失败分支。 |
| `feishu-fetch-doc/SKILL.md` | 提供 wiki 真实对象解析、原始正文读取、正文媒体 token 识别的规则。 | `Resolve Source`、`Extract Body`、`Extract Media`。 |
| `feishu-lark-parser/SKILL.md` | 生成 Parser 增强阅读结果，仅作阅读顺序和人工理解辅助。 | `Extract Body`。 |
| `feishu-whiteboard/SKILL.md` | 说明 `list_nodes`、白板节点结构、坐标、样式和图片节点读取规则。 | `Extract Whiteboards`、`Whiteboard Rules`。 |
| `feishu-sheet/SKILL.md` / `feishu-bitable/SKILL.md` | 仅在 wiki 真实对象不是 docx 且用户仍要求对应类型抽取时使用。 | `Resolve Source` 的非 docx 分支。 |

如果专项 Skill 不存在但底层工具存在，可以继续执行，并在 `preflight.json` 的 `fallbacks` 中记录降级路径。

### Tool Selection

先检查 MCP，再检查 CLI。不要在 MCP 已确认可用时继续执行 CLI 前置检查。

MCP 检查要求：

- 通过 glob 查找并读取 `mcp_feishu/tools/<tool>.json`，不要硬编码会话目录。
- 至少检查 `feishu_wiki_space_node.json`、`feishu_fetch_doc.json`、`feishu_lark_parser.json`、`feishu_doc_comments.json`、`feishu_doc_media.json`、`feishu_whiteboard.json`。
- 调用 `feishu_get_user` 或等价只读工具验证 MCP 调用链和登录态。
- 记录 MCP 是否可用、工具 descriptor 命中情况、MCP 使用的 Node 版本；若能从进程路径识别 Node 版本，也一并记录。

MCP Node 版本确认方式：

```bash
ps -eo pid,ppid,command | rg 'feishu-lark-mcp-server|mcp_feishu|lark-doc'
SCRIPT_NODE_BIN="/Users/<user>/.nvm/versions/node/v24.15.0/bin"
test -x "$SCRIPT_NODE_BIN/node"
"$SCRIPT_NODE_BIN/node" -v
```

- 从 MCP 进程命令中的 `~/.nvm/versions/node/<version>/bin/<server>` 反推 `SCRIPT_NODE_BIN`；若只看到 `node <server-bin>`，继续解析 server bin 真实路径或父进程 `npm exec` 环境。
- 只有 `"$SCRIPT_NODE_BIN/node" -v` 成功，才允许后续脚本使用 `PATH="$SCRIPT_NODE_BIN:$PATH" node ...`。
- `preflight.json` 记录：`mcp.node_version.command_match`、`script_node_bin`、`version`、`status`。

若 MCP 可用，设置 `selected_transport="mcp"`，后续所有飞书工具调用使用 MCP，并按 descriptor schema 传参。

只有 MCP 不可用时，才检查 CLI。CLI 检查要求：

- 验证 `feishu-lark` 可执行、版本和对应 Node 版本。
- 如果当前 shell 找不到命令，通过 `nvm` 查找可用 `feishu-lark`。
- 记录最终选定的 `feishu-lark` 路径、Node 版本和 `PATH` 前缀。

```bash
for bin in "$HOME"/.nvm/versions/node/*/bin; do
  version="$(basename "$(dirname "$bin")")"
  if [ -x "$bin/feishu-lark" ]; then
    echo "$version: FOUND $bin/feishu-lark"
    PATH="$bin:$PATH" "$bin/feishu-lark" --version
  else
    echo "$version: not found"
  fi
done
```

若 CLI 可用，设置 `selected_transport="cli"`。后续所有飞书工具调用必须使用检查阶段选定的 `PATH` 前缀和同一个 Node 版本，不要混用当前 shell 的其他 `node` 或 `feishu-lark`。CLI stdout、临时输出或截断日志不算 raw 证据；必须把完整 JSON、Markdown、媒体和 manifest 写入 `<RES>/raw/` 或对应资源目录。

### Login State

使用 `selected_transport` 调用 `feishu_get_user` 验证用户态登录状态；如果验证失败，按 `feishu-auth` 的认证恢复路径处理。

```bash
feishu-lark call feishu_get_user '{}'
```

CLI fallback 时使用上面的命令；MCP 路径下使用 MCP 工具调用同名工具。登录状态通过条件：工具可执行；输出可以解析为 JSON；JSON 中不存在 `error` 字段；返回内容能识别当前用户信息。

注意：`feishu-lark call feishu_get_user '{}'` 可能在 exit code 为 0 时仍返回 JSON error，例如：

```json
{
  "error": "需要用户授权。请先运行 feishu_auth 工具完成飞书登录授权。"
}
```

遇到这种情况必须判定为 `auth.passed=false`。`auth.passed=false` 表示当前用户态认证暂不可用，不能直接读取飞书正文、评论、媒体或白板；必须先进入 `Login Recovery`。恢复流程完成且复验仍失败时，只保存失败证据并停止。恢复或用户提供可用 UAT 后，重新运行登录验证；只有 `auth.passed=true` 才能继续完整抽取。

### Login Recovery

`auth.passed=false` 不等于立刻中断。先判断失败是否可恢复，并执行一次自动恢复；恢复动作、命令退出码、stdout/stderr 摘要和复验结果都必须写入 `<RES>/raw/preflight.json` 的 `auth.recovery`。

可恢复认证失败包括：

- JSON `error` 包含 `需要用户授权`、`Token refresh failed`、`refresh token has been revoked`、`invalid_grant`、`token expired`、`Unauthorized`。
- CLI stderr/stdout 提示 token 过期、refresh token 失效、需要重新登录或需要用户授权。
- `feishu_get_user` 调用失败，且不是 MCP/CLI 工具缺失、Node 缺失、网络完全不可达或配置文件不可读。

自动恢复流程：

1. 读取 `feishu-auth/SKILL.md`，确认当前为用户态认证；如当前 profile 是 `authMode=bot`，切换到用户态，不要用 bot mode 继续文档抽取。
2. 使用 `selected_transport` 对应的认证能力恢复登录。若当前方式无法完成认证，再进入 `Tool Selection` 选择可用 fallback，并记录切换原因。
3. 对 token 过期或 refresh token 被撤销，先清除失效用户凭据，再重新发起用户态授权。若使用 CLI，必须使用检查阶段选定的 Node 版本和 `PATH` 前缀。
4. 进入 Device Flow 时，把授权链接和用户码提示给用户，等待用户完成授权；命令返回前不要创建报告。
5. 授权完成后，必须立即使用最终 `selected_transport` 重新执行 `feishu_get_user`。只有复验 JSON 不含 `error` 且能识别用户信息，才能把 `auth.passed` 置为 `true` 并继续抽取。
6. 如果用户提供 `FEISHU_UAT` 或 `--UAT`，先用该 token 执行 `feishu_get_user` 复验；通过后继续抽取，不要再强制 OAuth。

只有以下情况才能中断并保存 preflight 失败证据；这些情况均不得创建 `<REPORT>`：

- 自动恢复后 `feishu_get_user` 复验仍失败。
- `feishu-lark auth` 或 MCP 认证恢复返回失败、超时、被用户取消，或用户明确不进行授权。
- 缺少 MCP/CLI 工具、Node、配置文件不可读，或网络/权限错误导致无法发起认证。
- 文档访问权限不足，但用户态认证本身已通过；此时失败说明应写为权限不足，而不是 token 失效。

### Preflight Output

`<RES>/raw/preflight.json` 至少记录：可用 Skill、`selected_transport`、MCP/CLI 检查结果、登录验证与恢复结果、`write_probe`、fallback 和缺失能力。`auth.checked/passed` 与 `write_probe.checked/passed` 必须为 `true` 才能进入正文抽取；具体结构由 `validate-extracted-artifact.mjs --evidence <RES>` 校验。

## Artifact Write And Gatekeeping

完成 `<RES>` 目录创建后，先做写入探测并写入 `preflight.json.write_probe`。若 shell 写 `.trae` 被 denylist 拦截，必须记录错误并立刻切换到 `apply_patch`、工具 `output_path` 或其他已验证可写通道。不能把 MCP persisted-output、toolcall 临时文件、stdout 预览、摘要 JSON 或报告正文当作 raw 证据。

### Apply Patch Raw Write Fallback

当 shell 对 `.trae` 下 `<RES>` 写入、复制或移动被 denylist 拦截时，必须切换到 `apply_patch` 分文件写 raw，并记录 `preflight.json.write_probe.fallback="apply_patch"`。

- 每个 raw 或资源目标文件独立 patch：`fetch_doc_response.json`、`fetch_doc_content.md`、`lark_parser_strict.md` / `lark_parser_error.json`、`comments_page_<N>.json`、`whiteboard_<NN>_<token>_nodes.json` 和 manifest。最终报告只能由生成脚本创建。
- 内容必须来自 MCP 完整响应或 persisted-output 原文；允许只读解析和统计，禁止用 shell / Node / Python 向 `.trae` 写文件。
- 不得用临时路径、终端预览、统计摘要或截断片段代替 raw 文件。
- 每个 raw 文件写完后立即只读校验存在性、字节数、JSON 可解析性或 Markdown 非空；核心 raw 全部通过后才能把 `write_probe.passed=true`。
- 若 `apply_patch` 可写但 raw 未补齐，不得创建报告，必须回到对应抽取阶段补齐。

进入 `Compose Report` 前必须运行验收脚本的证据门禁，直接校验核心 raw 产物是否存在、非空、可解析且未疑似截断：

```bash
SCRIPT_NODE_BIN="<selected_transport_node_bin>"
test -x "$SCRIPT_NODE_BIN/node"
PATH="$SCRIPT_NODE_BIN:$PATH" node .trae/skills/feishu-doc-extractor/scripts/validate-extracted-artifact.mjs --evidence <RES>
```

证据门禁失败时，按脚本错误回到对应抽取阶段补齐；写入失败和临时输出未归档时不得创建报告。阶段门禁仍作为流程总控保留：`Preflight Gate` 校验登录和写入；`Source Gate` 校验 wiki 解析；`Body Gate` 校验 fetch/parser/media tokens；`Evidence Gate` 调用 `--evidence <RES>` 校验评论、媒体、白板节点和 manifest；`Report Gate` 调用 `<REPORT>` 模式校验最终报告。任一门禁失败必须按脚本错误或阶段错误修复后再继续。

### Recovery Classification

Gate 缺口默认分类为 `recoverable`。以下情况不得分类为不可恢复：MCP 内联或临时结果、任意数量的 Evidence / Report Gate 缺口、缺失 raw / manifest / 资源 / 链接、节点 JSON 截断或未落盘、某一种写入方式失败但存在 fallback、同一错误重复出现或重跑次数较多。

只有命中以下白名单并保留原始错误证据时，才允许分类为 `unrecoverable`：

- MCP、CLI 和所需底层工具均不可用，且无可用 fallback。
- 已按 `Login Recovery` 恢复认证，但复验仍失败、用户取消授权或明确拒绝授权。
- 用户态认证通过，但目标文档明确无访问权限。
- 源文档结构经证据验证无法无损表达，且不存在可保留原始块的降级形式。

### Gap Completion Rerun

对当前 `artifact_base` 执行“抽取 → Evidence Gate → 报告生成 → Report Gate”循环。任一 Gate 失败时，逐项记录错误、恢复分类和下一动作到 `<RES>/raw/rerun_ledger.json`，然后从 `Preflight Checks` 覆盖同一 `artifact_base` 的 raw、资源、manifest 和报告重新完整抽取。不得创建新 base 规避旧缺口，不得只修最终报告。

循环只在以下终态退出：两个 Gate 均通过；或所有剩余错误均命中 `unrecoverable` 白名单并有失败证据，此时不创建或交付 `<REPORT>`。存在 recoverable 错误时必须继续重跑。


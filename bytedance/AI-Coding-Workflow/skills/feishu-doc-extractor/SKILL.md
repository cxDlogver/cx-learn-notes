---
name: feishu-doc-extractor
description: Extract one Feishu/Lark document into a local three-part Markdown report with traceable body media, attachments, comments, whiteboards, node JSON, node images, and independent whiteboard analysis. Use when a document must be archived or analyzed with locally verifiable evidence.
---

# Feishu Document Extraction

抽取一个源文档到一个 `artifact_base`。编排 `feishu-fetch-doc`、`feishu-lark-parser`、`feishu-whiteboard`、`feishu-auth` 和本 Skill 脚本；专项工具参数以对应 Skill 为准。

## Core Contract

- 将 `feishu_fetch_doc` 的 `raw/fetch_doc_content.md` 作为唯一正文事实源。
- 仅将 strict Parser 产物作为阅读辅助；保存 `lark_parser_strict.md` 或 `lark_parser_error.json`，不要下载 Parser 图片、生成图片说明映射、做可信度分级或把 Parser 内容写回正文。
- 先完成正文媒体、附件、评论分页、白板缩略图、完整节点 JSON、全部节点图片和白板独立分析，再生成报告。资源未齐时不得创建或覆盖最终报告。
- 只用 `scripts/compose-report-body.mjs` 初始化报告和改写正文。不要手工重复脚本已处理的标题、表格、标签、空行、引用和资源链接排版。
- 仅人工处理无法确定的语义工作：评论定位、白板业务分析和无法无损表达的异常内容。
- 不做字数、语义长度、Parser 图片可信度或报告自报状态校验；以 Evidence Gate 和 Report Gate 的退出码为准。
- 确定 `selected_transport` 后统一使用对应 Node bin 执行 CLI 和本地 `.mjs` 脚本。
- 遇到可恢复缺口时按 [preflight-and-recovery.md](references/preflight-and-recovery.md) 覆盖同一 base 补跑，不要新建 base 或以 partial 占位结束。

## Output Contract

报告与资源目录使用同一个 `artifact_base`。用户未指定时依次使用标题 slug、源 token、`feishu_document`。

```text
.trae/extracts/<source-token-or-requested-folder>/
  <artifact_base>.md
  <artifact_base>/
    raw/
    logs/
    media/
    whiteboards/
    comments/
```

后文用 `<REPORT>` 表示报告，用 `<RES>` 表示同名资源目录。不要创建额外分析总报告。

## Required References

- 抽取前读取 [extraction-workflow.md](references/extraction-workflow.md)。
- 执行 Preflight、认证恢复或缺口补跑时读取 [preflight-and-recovery.md](references/preflight-and-recovery.md)。
- 文档含白板时读取 [whiteboard-analysis.md](references/whiteboard-analysis.md)。
- 回填评论或检查报告职责边界时读取 [report-format.md](references/report-format.md)。

## Workflow

1. 创建 `<RES>` 子目录，完成 transport、Node、认证与写入探测；此时不要创建 `<REPORT>`。
2. 解析 wiki 真实对象，保存 source、fetch、Parser 和 token 证据。
3. 分页保存评论到 `has_more=false`，下载全部正文图片与附件。
4. 对每个白板保存缩略图、完整节点 JSON、全部节点图片和独立分析。
5. 运行 Evidence Gate；失败则回到对应资源阶段补齐。
6. 用生成脚本原子创建三模块报告和 `body_reconstruction_manifest.json`：

   ```bash
   PATH="$SCRIPT_NODE_BIN:$PATH" node .trae/skills/feishu-doc-extractor/scripts/compose-report-body.mjs \
     --resources <RES> --report <REPORT>
   ```

7. 在生成正文中完成评论语义回填；白板评论写入对应独立分析，并同步 `comments_manifest.json`。
8. 运行 Report Gate；根据错误回到资源、白板分析、评论或正文阶段修复。

## Gates

```bash
test -x "$SCRIPT_NODE_BIN/node"
PATH="$SCRIPT_NODE_BIN:$PATH" node .trae/skills/feishu-doc-extractor/scripts/validate-extracted-artifact.mjs --evidence <RES>
PATH="$SCRIPT_NODE_BIN:$PATH" node .trae/skills/feishu-doc-extractor/scripts/validate-extracted-artifact.mjs <REPORT>
```

Evidence Gate 校验真实文件、媒体类型、数量、评论分页、白板节点和分析。Report Gate 额外校验三模块结构、正文资源映射、表格映射、评论唯一位置和相对链接。不要用手写 PASS、complete 或 manifest 状态替代脚本结果。

## Final Response

仅返回输出目录、报告路径、资源目录、关键数量、两个 Gate 的结果，以及失败项或需要人工确认的内容。提醒正文事实源是 `fetch_doc_content.md`，Parser 仅作辅助。

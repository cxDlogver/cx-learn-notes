# 完整抽取流程

## 1. Initialize Resources

确定唯一 `artifact_base`，仅创建 `<RES>/raw`、`logs`、`media`、`whiteboards`、`comments`。完成 Preflight 和写入探测；资源 Gate 通过前不要创建 `<REPORT>`。

## 2. Resolve Source

解析 URL/token。wiki 必须通过 `feishu_wiki_space_node` 获取真实 `obj_type`、`obj_token` 和标题并保存 `wiki_node.json`。只有 docx 继续本流程。

## 3. Extract Body

保存完整 fetch 响应和 `raw/fetch_doc_content.md`。strict Parser 成功时保存 `lark_parser_strict.md`，失败时保存 `lark_parser_error.json`；不要处理 Parser 图片。

从 fetch 正文提取 image、file、whiteboard token 到 `media_tokens.json`。

## 4. Extract Comments And Media

用源 wiki token 或真实 docx token 分页读取评论，逐页保存到 `comments/comments_page_<N>.json`，直到最后一页明确 `has_more=false`，并生成 `comments_manifest.json`。

下载全部正文图片与附件，在 `downloaded_media_manifest.json` 记录 token、类型、实际文件和下载结果。最终链接必须使用实际文件路径。

## 5. Extract And Analyze Whiteboards

按 [whiteboard-analysis.md](whiteboard-analysis.md) 保存每个白板的缩略图、完整节点 JSON、全部节点图片、独立分析和 `whiteboard_manifest.json`。节点 JSON 使用文件流落盘，禁止用可能截断 stdout 的同步捕获方式。

## 6. Resource Completion Gate

运行 Evidence Gate。它必须能从真实文件验证正文 token、评论分页、媒体、白板缩略图、节点 JSON、节点图片和分析；任一缺口都回到对应阶段补齐。

## 7. Compose Report

仅通过以下命令生成报告：

```bash
PATH="$SCRIPT_NODE_BIN:$PATH" node .trae/skills/feishu-doc-extractor/scripts/compose-report-body.mjs \
  --resources <RES> --report <REPORT>
```

脚本会再次执行 Evidence Gate，失败时不创建或覆盖报告；成功时原子生成 `# 文档概述`、`# 正文`、`# 验收检查`，从 `raw/fetch_doc_content.md` 改写正文，并生成精简的 `body_reconstruction_manifest.json`。不要创建 `report_body_seed.md`。

## 8. Backfill Comments

按 [report-format.md](report-format.md) 将评论放到可靠语义位置。白板评论只进入对应白板分析。完成后同步 `comments_manifest.json` 的定位方法和最终锚点。

## 9. Validate And Recover

运行 Report Gate。它不检查字数、语义覆盖率、Parser 图片映射/可信度或报告自报状态；只检查真实资源、数量、结构、映射、评论和链接。失败时按 [preflight-and-recovery.md](preflight-and-recovery.md) 对同一 base 补跑。

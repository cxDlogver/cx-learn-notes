# 报告与评论契约

## Script-Owned Layout

`scripts/compose-report-body.mjs` 独占以下确定性工作：

- 初始化且只初始化 `# 文档概述`、`# 正文`、`# 验收检查` 三个一级模块。
- 从 `raw/fetch_doc_content.md` 调整正文标题层级，转换 Lark 表格、callout、quote 和无语义标签。
- 根据 manifest 原位替换正文图片、附件和白板，并生成相对链接。
- 生成概述数量、白板索引、验收证据链接和 `body_reconstruction_manifest.json`。

不要手工重做这些排版，也不要创建 `report_body_seed.md`。脚本生成的 `<br />` 是表格单元格和白板轻量占位中唯一允许的 HTML。

## Module Responsibilities

- `# 文档概述`：源 URL、标题、类型、正文图片/附件/白板/节点图片/评论数量、Parser 辅助证据、评论证据和白板索引。
- `# 正文`：fetch 正文的脚本化改写、原位媒体/附件/白板链接及语义回填评论。不要放 manifest、日志、媒体索引、Parser 图片说明或“保真补充”章节。
- `# 验收检查`：脚本计算的资源数量和逐项证据链接。不要手写 PASS/FAIL、complete/partial/failed；以 Gate 退出码为准。

## Comment Placement

按以下优先级定位评论：

1. `parent_type=WHITEBOARD_BLOCK` 且有 `parent_token`：写入对应白板分析的 `关联评论`。
2. 有 quote：在生成正文中精确匹配。
3. 精确匹配失败：结合 fetch 原文、相邻标题和业务对象选择保守语义锚点，并在 manifest 记录 `semantic`。
4. 命中表格单元格：完整评论块放在整张表格之后，并记录行列或语义锚点。
5. `is_whole=true`：放入一个全文评论区域。
6. 仅在没有可靠锚点时放入一个未定位区域，并记录具体失败原因。

每条评论只出现一次，格式如下：

```markdown
> comment_id=`COMMENT_ID`，状态：已解决/未解决
> **引用 quote**：...
> **评论**：...
> **补充**：...
```

已定位评论的 `final_anchor` 必须存在于报告或白板分析，且评论块贴近锚点；白板精确绑定评论不得降级为未定位。

## Reconstruction Manifest

`body_reconstruction_manifest.json` 保留：

- `source_file`、`source_sha256`
- `blocks`
- `table_conversions`
- `resource_mappings`
- 空的 `removed_source_blocks`、`unresolved_source_blocks`

不要写入 `seed_file`、`seed_sha256`、`source_seed_equal` 或 `preservation_status`。表格映射覆盖每张源表格、全部源单元格和表格图片；资源映射覆盖每个 image、file、whiteboard token 及正文锚点。

## Forbidden Content

报告不得包含：

- 未解析的 `<image>`、`<file>`、`<whiteboard>`、`lark-*`、`mention-*` 标签
- 除脚本生成 `<br />` 外的 raw HTML
- Parser 图片 URL、`attachment://board_*`、Parser 图片说明映射或可信度结论
- 过程日志、raw manifest 转储、重复评论列表
- `源正文保真补充`、`表格内图片原位呈现`、`原文结构化文本对账` 等补丁式章节

Report Gate 负责结构、映射和链接硬校验；不要在文档中复制其逐条实现规则。

---
name: align-feishu-markdown-docs
description: Use when a local Markdown path or Feishu docx link must be aligned with the other side, including create-if-missing, media/table preservation, and clean local Markdown.
---

# Align Feishu And Markdown Docs

## 核心原则

当用户给出本地 Markdown 路径、飞书 Docx 链接，或同时给出两者，并表达“读取、写入、同步、对齐、导入、导出、保存、整理、补齐内容”等意图时，使用本 Skill。

目标是让**本地 Markdown 文档**和**飞书文档**在语义内容上对齐：正文、标题、图片、白板、表格、代码块、引用、链接和附件说明都必须保留；本地 Markdown 必须重新排版，不能残留飞书标签或无效 HTML。

## 固定路径

| 用途 | 默认值 |
| --- | --- |
| 本地默认目录 | `/Users/bytedance/cx/spec-2/cxdlogver/bytedance/benchmark/2-agent-benchmark-analyze` |
| 本地资源目录 | 与 Markdown 同名的 `<filename>_assets/` |
| 清单文件 | 与 Markdown 同目录，必要时写 `<filename>_manifest.json` |

除非用户明确指定其他目录，本地 Markdown 必须放在默认目录下。

清单文件至少记录：

| 字段 | 内容 |
| --- | --- |
| `feishu.url/token/revision` | 飞书目标身份与读取版本 |
| `local.path/assetsDir` | 本地 Markdown 与资源目录 |
| `sourceOfTruth` | 本轮同步方向：`feishu`、`local`、`new` 或 `user-confirmed` |
| `resources[]` | 图片、附件、白板、嵌入表格/多维表；包含原 token/name、localFilename、mime、size/hash、处理状态 |
| `counts` | 标题、图片、表格、白板/Mermaid、附件、链接、代码块数量 |
| `unlossless[]` | 无法无损转换的内容与人工说明 |

## 必须联动的能力

- **REQUIRED SUB-SKILL:** 使用 `lark-doc` 读取、创建、更新飞书 Docx；执行前遵守它要求的 `lark-shared`、fetch、create/update 参考文件。
- 飞书链接不得用 `WebFetch` 当正文来源。
- 若文档里出现电子表格、多维表格、画板等资源，按 `lark-doc` 路由切到对应能力下钻，不能只保留标签。

## 输入判定

先识别用户输入属于哪一种：

| 输入 | 动作 |
| --- | --- |
| 只有飞书 Docx 链接 | 读取飞书全文，生成或更新默认目录下的 Markdown。 |
| 只有本地 Markdown 路径 | 读取本地 Markdown，先从同名 manifest 找飞书目标；没有 manifest 时按标题搜索或创建飞书文档。 |
| 同时给出飞书链接和本地路径 | 读取两侧内容，执行对齐。 |
| 只给标题或目标名 | 在默认目录新建 Markdown，并创建飞书文档。 |

如果两侧都存在且内容不一致，必须先判断用户是否指定了方向：

- “把飞书写到本地 / 读取飞书保存到本地” → 飞书为真源；
- “把本地写入飞书 / 导入到飞书” → 本地为真源；
- “对齐 / 同步 / 保持一致”但未说明方向 → 先给出差异摘要并询问方向，不能静默覆盖。

差异摘要至少包含：标题/正文摘要、标题数、表格数、图片数、附件数、白板/Mermaid 数、代码块数、飞书 revision、本地文件修改时间、manifest 绑定关系。只要资源数量或 hash 不一致，就视为存在资源级冲突。

## 工作流

1. **定位目标**
   - 解析飞书 docx URL/token、本地 Markdown 路径和目标标题。
   - 本地路径缺失时，根据飞书标题或用户标题在默认目录生成安全文件名。
   - 本地文件 `ENOENT` 才算本地缺失；路径无权限、目录不存在但父级不可写、非 Markdown 文件都不能当作缺失静默处理。
   - 飞书读取返回明确“不存在/404/token invalid”才算飞书缺失；认证失败、权限不足、网络错误、租户不可访问、scope 缺失都必须先恢复认证或询问用户，不能新建重复文档。
   - 只有本地 Markdown 时，优先读取同名 manifest 里的飞书 token；没有 manifest 时按标题搜索飞书文档。搜索到 0 个才创建；搜索到 1 个可作为候选并在写入前确认；搜索到多个必须询问用户选择。

2. **完整读取**
   - 飞书侧同时读取 Markdown 和 XML/full：Markdown 用作正文底稿，XML 用于资源、标题、表格、白板、图片和嵌入对象审计。
   - 本地侧读取 Markdown、同名 assets 目录、manifest（如有）。
   - 记录两侧标题、正文大小、标题数、图片数、表格数、Mermaid/白板数、附件/链接数。

3. **资源保真**
   - 飞书图片必须下载到本地 assets，并替换为相对路径。
   - 白板或 Mermaid 内容优先保留 Mermaid 源码；如用户需要图片展示，再生成本地 SVG/PNG，但不能只保留截图而丢源码。
   - 本地图片写入飞书时必须上传或插入为飞书可见资源，不能保留本机绝对路径。
   - 附件必须下载到 assets 或子目录并以相对链接保留；写入飞书时必须上传为飞书附件或用明确的“附件说明 + 文件名 + 大小/hash”保留证据。
   - 嵌入电子表格、多维表格必须下钻读取可见数据；本地 Markdown 中至少保留标题、来源链接、关键表格数据或无法展开原因。
   - 表格必须保留表头、行列、空值、换行和链接；复杂合并单元格无法无损转 Markdown 时，在表格前后补充结构说明。

4. **本地 Markdown 重排**
   - 统一标题层级、段落空行、列表缩进、代码围栏、表格和图片位置。
   - 清理飞书残留标签：`callout`、`cite`、`readonly-block`、`whiteboard`、`grid`、`column`、`title`、`img`、`source` 等。
   - 清理不必要 HTML 标签；保留内容，转成 Markdown。确实无法表达的结构要写成人可读说明。
   - 图片引用必须使用相对路径，不能指向飞书临时下载地址或本机绝对路径。

5. **写入另一侧**
   - 写本地：使用 `apply_patch` 创建或更新 Markdown；资源文件通过下载或工具生成，保持相对链接稳定。
   - 写飞书：优先用 `lark-cli docs +create/+update`，根据 `lark-doc` 的 XML/Markdown 规则选择格式；图片、附件等资源按飞书能力插入。
   - 写入前确认目标身份，避免误覆盖同名但无关的文档。
   - 每次写入后更新 manifest，记录飞书 revision、资源映射和本轮真源。

6. **验收**
   - 本地 Markdown 文件存在且在默认目录或用户指定目录。
   - 飞书文档链接存在且可读取。
   - 本地图片链接全部可访问，图片文件非空且类型有效。
   - 本地附件链接全部可访问，文件非空且 size/hash 写入 manifest。
   - 表格数量和关键信息与真源一致。
   - 代码围栏成对。
   - 用代码块感知扫描确认：代码块外没有飞书标签、无效 HTML、内部 token、临时下载链接或无效占位符。
   - HTML 表格、`<br>`、`<span>`、`<div>`、`<a>` 等必须转为 Markdown 或可读文本；代码块内示例 HTML 不应误报。
   - 如果存在无法无损转换的内容，必须在最终回复中列出。

## 常用检查

```bash
rg -n '<(callout|cite|readonly-block|whiteboard|grid|column|title|img|source)\b|</(callout|cite|readonly-block|whiteboard|grid|column|title)>' <markdown>
rg -n 'internal-api-drive-stream|/space/api/box/stream/download/authcode|!\[[^]]*\]\(/' <markdown>
```

这些 `rg` 只能做快速筛查。最终必须用代码块感知脚本检查图片链接、附件链接、代码围栏、HTML/飞书标签和临时 URL；失败即回到对应步骤修复，不能把“工具调用成功”当作完成。

## 输出要求

最终回复必须包含：

- 本地 Markdown 路径；
- 飞书文档链接；
- 新建 / 更新了哪一侧；
- 图片、表格、白板/Mermaid、附件或链接的关键数量；
- manifest 路径和资源映射状态；
- 验收结果；
- 任何无法无损转换或需要用户确认的风险。

## 常见错误

| 错误 | 正确做法 |
| --- | --- |
| 只同步纯文本 | 必须审计图片、表格、白板、附件和链接。 |
| 用 WebFetch 抓飞书正文 | 必须使用飞书文档能力读取 Docx。 |
| 找不到一侧就停止 | 按规则新建缺失侧。 |
| 静默覆盖冲突内容 | 未指定方向时先摘要差异并询问。 |
| 本地保留飞书标签 | 转成干净 Markdown，并运行残留标签检查。 |
| 图片仍指向飞书临时 URL | 下载到本地 assets，并使用相对路径。 |

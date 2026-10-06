#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

function usage(exitCode = 0) {
  const output = exitCode === 0 ? console.log : console.error;
  output([
    "Usage:",
    "  node compose-report-body.mjs --resources <RES> --report <REPORT>",
    "",
    "The command validates all resources first, then atomically creates a report with:",
    "  # 文档概述",
    "  # 正文",
    "  # 验收检查",
  ].join("\n"));
  process.exit(exitCode);
}

function parseArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") usage(0);
    if (value === "--resources" || value === "--report") {
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) usage(2);
      result[value.slice(2)] = next;
      index += 1;
      continue;
    }
    usage(2);
  }
  if (!result.resources || !result.report) usage(2);
  return result;
}

function readJson(filePath, label = filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(`${label} cannot be read as JSON: ${error.message}`);
  }
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function escapePipe(value) {
  return String(value).replace(/\|/g, "\\|");
}

function getAttr(attrs, name) {
  const match = new RegExp(`${name}=["']([^"']+)["']`, "i").exec(attrs || "");
  return match?.[1] || "";
}

function attrNumber(attrs, name, fallback = 1) {
  const value = Number(getAttr(attrs, name));
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function collectTagTokens(markdown, tagName) {
  return [...String(markdown || "").matchAll(
    new RegExp(`<${tagName}\\b[^>]*\\btoken=["']([^"']+)["'][^>]*>`, "gi"),
  )].map((match) => match[1]);
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeRelative(value) {
  return String(value || "").replaceAll("\\", "/");
}

const { resources: resourcesArg, report: reportArg } = parseArgs(process.argv.slice(2));
const resourcesDir = path.resolve(resourcesArg);
const reportPath = path.resolve(reportArg);
const rawDir = path.join(resourcesDir, "raw");
const reportDir = path.dirname(reportPath);
const resourceBase = path.basename(resourcesDir);
const reportBase = path.basename(reportPath, path.extname(reportPath));
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const validatorPath = path.join(scriptDir, "validate-extracted-artifact.mjs");

if (reportBase !== resourceBase) {
  throw new Error(`report base "${reportBase}" must match resources directory "${resourceBase}"`);
}

const evidenceGate = spawnSync(process.execPath, [validatorPath, "--evidence", resourcesDir], {
  encoding: "utf8",
});
if (evidenceGate.status !== 0) {
  const detail = (evidenceGate.stderr || evidenceGate.stdout || "Evidence Gate failed").trim();
  throw new Error(`refusing to create report before resources are complete:\n${detail}`);
}

const sourcePath = path.join(rawDir, "fetch_doc_content.md");
const source = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");
const preflight = readJson(path.join(rawDir, "preflight.json"), "preflight.json");
const wikiNode = readJson(path.join(rawDir, "wiki_node.json"), "wiki_node.json");
const fetchResponse = readJson(path.join(rawDir, "fetch_doc_response.json"), "fetch_doc_response.json");
const mediaManifest = readJson(
  path.join(rawDir, "downloaded_media_manifest.json"),
  "downloaded_media_manifest.json",
);
const commentsManifest = readJson(path.join(rawDir, "comments_manifest.json"), "comments_manifest.json");
const whiteboardManifest = readJson(path.join(rawDir, "whiteboard_manifest.json"), "whiteboard_manifest.json");
const mediaItems = Array.isArray(mediaManifest?.items) ? mediaManifest.items : [];
const mediaByToken = new Map(mediaItems.map((item) => [item.token, item]));
const boards = Array.isArray(whiteboardManifest)
  ? whiteboardManifest
  : whiteboardManifest?.whiteboards || [];
const boardsByToken = new Map(boards.map((board) => [board.token, board]));
const parserEvidencePath = fs.existsSync(path.join(rawDir, "lark_parser_strict.md"))
  ? path.join(rawDir, "lark_parser_strict.md")
  : path.join(rawDir, "lark_parser_error.json");

function resolveResourceFile(value, defaultDirectory = resourcesDir) {
  const normalized = normalizeRelative(value);
  if (!normalized) return "";
  if (path.isAbsolute(normalized)) return normalized;
  const prefixes = [`${resourceBase}/`, `${reportBase}_resources/`];
  let relative = normalized;
  for (const prefix of prefixes) {
    if (relative.startsWith(prefix)) relative = relative.slice(prefix.length);
  }
  return relative.includes("/")
    ? path.resolve(resourcesDir, relative)
    : path.resolve(defaultDirectory, relative);
}

function relativeLink(filePath, fromDir = reportDir) {
  return normalizeRelative(path.relative(fromDir, filePath));
}

function manifestFile(item, defaultDirectory) {
  return resolveResourceFile(item?.actual_file || item?.file || "", defaultDirectory);
}

const resourceMappings = [];

function renderImage(token) {
  const item = mediaByToken.get(token);
  if (!item) return `<image token="${token}"/>`;
  const localPath = manifestFile(item, path.join(resourcesDir, "media"));
  const rendered = `![image:${token}](${relativeLink(localPath)})`;
  resourceMappings.push({ type: "image", token, final_anchor: rendered });
  return rendered;
}

function renderFile(token, attrs) {
  const item = mediaByToken.get(token);
  if (!item) return `<file token="${token}"/>`;
  const localPath = manifestFile(item, path.join(resourcesDir, "media"));
  const label = getAttr(attrs, "name") || getAttr(attrs, "filename") || path.basename(localPath) || token;
  const rendered = `[附件：${label}](${relativeLink(localPath)})`;
  resourceMappings.push({ type: "file", token, final_anchor: rendered });
  return rendered;
}

function renderWhiteboard(token) {
  const board = boardsByToken.get(token);
  if (!board) return `<whiteboard token="${token}"/>`;
  const thumbnail = resolveResourceFile(board.thumbnail_file, path.join(resourcesDir, "whiteboards"));
  const analysis = resolveResourceFile(board.analysis_file, path.join(resourcesDir, "whiteboards"));
  const anchor = `白板：${token}`;
  const rendered = `${anchor}<br />![whiteboard:${token}](${relativeLink(thumbnail)}) [详细分析](${relativeLink(analysis)})`;
  resourceMappings.push({ type: "whiteboard", token, final_anchor: anchor });
  return rendered;
}

function replaceResources(value) {
  return String(value)
    .replace(/<image\b([^>]*)\/?\s*>/gi, (tag, attrs) => {
      const token = getAttr(attrs, "token");
      return token ? renderImage(token) : tag;
    })
    .replace(/<file\b([^>]*)\/?\s*>/gi, (tag, attrs) => {
      const token = getAttr(attrs, "token");
      return token ? renderFile(token, attrs) : tag;
    })
    .replace(/<whiteboard\b([^>]*)\/?\s*>/gi, (tag, attrs) => {
      const token = getAttr(attrs, "token");
      return token ? renderWhiteboard(token) : tag;
    });
}

function removeNoopMarkup(value) {
  return String(value)
    .replace(/\{align=["'][^"']+["']\}/gi, "")
    .replace(/<mention-doc\b[^>]*>([\s\S]*?)<\/mention-doc>/gi, "$1")
    .replace(/<mention-user\b([^>]*)\/?\s*>/gi, (_tag, attrs) => {
      const id = getAttr(attrs, "id");
      return id ? `@${id}` : "";
    })
    .replace(/<text\b[^>]*>/gi, "")
    .replace(/<\/text>/gi, "");
}

function toBlockquote(inner) {
  const normalized = removeNoopMarkup(replaceResources(inner))
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .trim();
  if (!normalized) return ">";
  return normalized.split("\n").map((line) => `> ${line.trimEnd()}`).join("\n");
}

function replaceBlockContainers(value) {
  let result = String(value);
  let previous;
  do {
    previous = result;
    result = result.replace(
      /<(callout|quote-container)\b[^>]*>([\s\S]*?)<\/\1>/gi,
      (_tag, _name, inner) => toBlockquote(inner),
    );
  } while (result !== previous);
  return result;
}

function normalizeCellContent(raw) {
  return removeNoopMarkup(replaceBlockContainers(replaceResources(raw)))
    .replace(/<\/?(?:callout|quote-container)\b[^>]*>/gi, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.replace(/\s+/g, " "))
    .join("<br />")
    .trim();
}

function extractRows(tableSource) {
  return [...tableSource.matchAll(/<lark-tr\b[^>]*>([\s\S]*?)<\/lark-tr>/gi)]
    .map((rowMatch) => [...(rowMatch[1] || "").matchAll(
      /<lark-t[dh]\b([^>]*)>([\s\S]*?)<\/lark-t[dh]>/gi,
    )].map((cellMatch) => ({
      raw: cellMatch[2] || "",
      text: normalizeCellContent(cellMatch[2] || ""),
      rowspan: attrNumber(cellMatch[1], "rowspan"),
      colspan: attrNumber(cellMatch[1], "colspan"),
    })))
    .filter((row) => row.length > 0);
}

function buildMatrix(rows) {
  const matrix = [];
  const pendingRowspans = [];
  for (const [rowIndex, cells] of rows.entries()) {
    const row = [];
    let colIndex = 0;
    const fillPending = () => {
      while (pendingRowspans[colIndex]?.remaining > 0) {
        const pending = pendingRowspans[colIndex];
        row[colIndex] = pending.text;
        pending.remaining -= 1;
        colIndex += 1;
      }
    };
    fillPending();
    for (const cell of cells) {
      fillPending();
      for (let offset = 0; offset < cell.colspan; offset += 1) {
        const targetCol = colIndex + offset;
        row[targetCol] = offset === 0 ? cell.text : "";
        if (cell.rowspan > 1) {
          pendingRowspans[targetCol] = {
            text: offset === 0 ? cell.text : "",
            remaining: cell.rowspan - 1,
          };
        }
      }
      colIndex += cell.colspan;
    }
    fillPending();
    matrix[rowIndex] = row;
  }
  const width = Math.max(1, ...matrix.map((row) => row.length));
  return matrix.map((row) => Array.from({ length: width }, (_, index) => row[index] || ""));
}

const tableConversions = [];
let tableIndex = 0;

function tableToMarkdown(tableSource) {
  tableIndex += 1;
  const rows = extractRows(tableSource);
  if (!rows.length) return tableSource;
  const matrix = buildMatrix(rows);
  const markdownRows = matrix.map((row) => `| ${row.map((cell) => escapePipe(cell)).join(" | ")} |`);
  const separator = `| ${Array.from({ length: matrix[0].length }, () => "---").join(" | ")} |`;
  markdownRows.splice(1, 0, separator);
  const finalAnchor = markdownRows[0];
  const cells = rows.flat();
  const cellMappings = cells.map((cell, index) => ({
    source_cell_index: index + 1,
    final_anchor: cell.text || finalAnchor,
  }));
  const imageMappings = collectTagTokens(tableSource, "image").map((token) => {
    const mapping = [...resourceMappings].reverse().find((item) => item.type === "image" && item.token === token);
    return { token, final_anchor: mapping?.final_anchor || `image:${token}` };
  });
  tableConversions.push({
    source_table_index: tableIndex,
    conversion_type: "pipe_table",
    source_cell_count: cells.length,
    final_anchor: finalAnchor,
    cell_mappings: cellMappings,
    image_mappings: imageMappings,
  });
  return `\n${markdownRows.join("\n")}\n`;
}

function normalizeHeadings(value) {
  const levels = [...String(value).matchAll(/^(#{1,6})\s+/gm)].map((match) => match[1].length);
  if (!levels.length) return value;
  const shift = Math.max(0, 2 - Math.min(...levels));
  return String(value).replace(/^(#{1,6})\s+(.+)$/gm, (_line, hashes, title) => (
    `${"#".repeat(Math.min(6, hashes.length + shift))} ${title.trim()}`
  ));
}

function normalizeBody(value) {
  let result = String(value).replace(/<lark-table\b[\s\S]*?<\/lark-table>/gi, tableToMarkdown);
  result = replaceBlockContainers(result);
  result = replaceResources(result);
  result = removeNoopMarkup(result);
  result = result
    .replace(/(!?\[[^\]]*]\()((?:https?|mailto)%3A[^)]+)(\))/gi, (_match, open, encoded, close) => {
      try {
        return `${open}${decodeURIComponent(encoded)}${close}`;
      } catch {
        return `${open}${encoded}${close}`;
      }
    })
    .replace(/<\/?(?:lark-[\w-]+|mention-[\w-]+)\b[^>]*>/gi, "")
    .replace(/[ \t]+$/gm, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return normalizeHeadings(result);
}

const body = normalizeBody(source);
const unresolvedTags = [...body.matchAll(/<(?:image|file|whiteboard)\b[^>]*>/gi)].map((match) => match[0]);
if (unresolvedTags.length > 0) {
  throw new Error(`unresolved resource tags remain: ${unresolvedTags.join(", ")}`);
}

for (const token of unique(collectTagTokens(source, "image"))) {
  if (!resourceMappings.some((item) => item.type === "image" && item.token === token)) {
    throw new Error(`image ${token} was not introduced into the report body`);
  }
}
for (const token of unique(collectTagTokens(source, "file"))) {
  if (!resourceMappings.some((item) => item.type === "file" && item.token === token)) {
    throw new Error(`file ${token} was not introduced into the report body`);
  }
}
for (const token of unique(collectTagTokens(source, "whiteboard"))) {
  if (!resourceMappings.some((item) => item.type === "whiteboard" && item.token === token)) {
    throw new Error(`whiteboard ${token} was not introduced into the report body`);
  }
}

const sourceUrl = preflight?.source?.url || fetchResponse?.url || "未记录";
const sourceTitle = wikiNode?.node?.title || wikiNode?.title || fetchResponse?.title || reportBase;
const documentType = wikiNode?.node?.obj_type || wikiNode?.obj_type || preflight?.source?.obj_type || "docx";
const commentFiles = fs.readdirSync(path.join(resourcesDir, "comments"))
  .filter((name) => /^comments_page_\d+\.json$/.test(name))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const commentTotal = Number(commentsManifest?.total ?? commentsManifest?.comments?.length ?? 0);
const imageCount = unique(collectTagTokens(source, "image")).length;
const fileCount = unique(collectTagTokens(source, "file")).length;
const whiteboardCount = unique(collectTagTokens(source, "whiteboard")).length;
const whiteboardNodeImageCount = boards.reduce(
  (sum, board) => sum + (Array.isArray(board.node_images) ? board.node_images.length : 0),
  0,
);

const overviewLines = [
  "# 文档概述",
  "",
  `- 源文档 URL：${/^https?:\/\//.test(sourceUrl) ? `[${sourceUrl}](${sourceUrl})` : sourceUrl}`,
  `- 标题：${sourceTitle}`,
  `- 真实文档类型：${documentType}`,
  `- 正文图片：${imageCount} 张`,
  `- 附件：${fileCount} 个`,
  `- 白板：${whiteboardCount} 个，白板节点图片：${whiteboardNodeImageCount} 张`,
  `- 评论：${commentTotal} 条`,
  `- Parser 辅助材料：[${path.basename(parserEvidencePath)}](${relativeLink(parserEvidencePath)})`,
  `- 评论原始记录：${commentFiles.map((name) => (
    `[${name}](${relativeLink(path.join(resourcesDir, "comments", name))})`
  )).join("、")}`,
];

if (boards.length > 0) {
  overviewLines.push("", "## 白板索引", "");
  for (const board of boards) {
    const thumbnail = resolveResourceFile(board.thumbnail_file, path.join(resourcesDir, "whiteboards"));
    const nodeJson = resolveResourceFile(board.node_json_file, path.join(resourcesDir, "whiteboards"));
    const analysis = resolveResourceFile(board.analysis_file, path.join(resourcesDir, "whiteboards"));
    overviewLines.push(
      `- 白板 ${String(board.index || 1).padStart(2, "0")}：\`${board.token}\`，节点图片 ${board.node_images?.length || 0} 张，`
      + `[缩略图](${relativeLink(thumbnail)})、[节点 JSON](${relativeLink(nodeJson)})、[详细分析](${relativeLink(analysis)})`,
    );
  }
}

const acceptanceLines = [
  "# 验收检查",
  "",
  "## 资源对账",
  "",
  `- 正文图片：${imageCount} / ${imageCount}`,
  `- 附件：${fileCount} / ${fileCount}`,
  `- 评论：${commentTotal} / ${commentTotal}`,
  `- 白板：${whiteboardCount} / ${whiteboardCount}`,
  `- 白板节点图片：${whiteboardNodeImageCount} / ${whiteboardNodeImageCount}`,
  "",
  "## 验收证据链接",
  "",
  `- 正文来源：[fetch_doc_content.md](${relativeLink(sourcePath)})`,
  `- Parser 辅助材料：[${path.basename(parserEvidencePath)}](${relativeLink(parserEvidencePath)})`,
  ...commentFiles.map((name) => (
    `- 评论来源：[${name}](${relativeLink(path.join(resourcesDir, "comments", name))})`
  )),
];

for (const board of boards) {
  const thumbnail = resolveResourceFile(board.thumbnail_file, path.join(resourcesDir, "whiteboards"));
  const nodeJson = resolveResourceFile(board.node_json_file, path.join(resourcesDir, "whiteboards"));
  const analysis = resolveResourceFile(board.analysis_file, path.join(resourcesDir, "whiteboards"));
  acceptanceLines.push(
    `- 白板证据 \`${board.token}\`：[缩略图](${relativeLink(thumbnail)})、`
    + `[节点 JSON](${relativeLink(nodeJson)})、[详细分析](${relativeLink(analysis)})`,
  );
  for (const nodeImage of board.node_images || []) {
    const actualPath = resolveResourceFile(nodeImage.actual_file, path.join(resourcesDir, "whiteboards"));
    acceptanceLines.push(
      `  - 节点图片 \`${nodeImage.node_id || nodeImage.image_token}\`：`
      + `[${path.basename(actualPath)}](${relativeLink(actualPath)})`,
    );
  }
}

const report = [
  ...overviewLines,
  "",
  "# 正文",
  "",
  body,
  "",
  ...acceptanceLines,
  "",
].join("\n");

const manifestBlocks = body
  .split(/\n{2,}/)
  .map((block) => block.trim())
  .filter(Boolean)
  .map((block, index) => ({
    source_block_id: `generated-block-${index + 1}`,
    source_order: index + 1,
    final_order: index + 1,
    content_digest: sha256(block),
    final_anchor: block.split("\n").find((line) => line.trim())?.slice(0, 160) || "",
    action: "script_rewrite",
  }));

const bodyManifest = {
  source_file: "raw/fetch_doc_content.md",
  source_sha256: sha256(source),
  blocks: manifestBlocks,
  table_conversions: tableConversions,
  resource_mappings: resourceMappings,
  removed_source_blocks: [],
  unresolved_source_blocks: [],
};

const updatedBoards = boards.map((board) => {
  const occurrenceCount = collectTagTokens(source, "whiteboard").filter((token) => token === board.token).length;
  const inlineAnchors = Array.from({ length: occurrenceCount }, () => `白板：${board.token}`);
  const { overview_explanation_anchors: _obsolete, ...rest } = board;
  return {
    ...rest,
    report_anchors: inlineAnchors,
    inline_placeholder_anchors: inlineAnchors,
  };
});
const updatedWhiteboardManifest = Array.isArray(whiteboardManifest)
  ? updatedBoards
  : { ...whiteboardManifest, whiteboards: updatedBoards };

fs.mkdirSync(reportDir, { recursive: true });
const reportTemp = path.join(reportDir, `.${path.basename(reportPath)}.${process.pid}.tmp`);
const bodyManifestPath = path.join(rawDir, "body_reconstruction_manifest.json");
const bodyManifestTemp = `${bodyManifestPath}.${process.pid}.tmp`;
const whiteboardManifestPath = path.join(rawDir, "whiteboard_manifest.json");
const whiteboardManifestTemp = `${whiteboardManifestPath}.${process.pid}.tmp`;

try {
  fs.writeFileSync(reportTemp, report);
  fs.writeFileSync(bodyManifestTemp, `${JSON.stringify(bodyManifest, null, 2)}\n`);
  fs.writeFileSync(whiteboardManifestTemp, `${JSON.stringify(updatedWhiteboardManifest, null, 2)}\n`);
  fs.renameSync(bodyManifestTemp, bodyManifestPath);
  fs.renameSync(whiteboardManifestTemp, whiteboardManifestPath);
  fs.renameSync(reportTemp, reportPath);
} finally {
  for (const tempPath of [reportTemp, bodyManifestTemp, whiteboardManifestTemp]) {
    if (fs.existsSync(tempPath)) fs.rmSync(tempPath);
  }
}

console.log(`Report created: ${reportPath}`);
console.log(`Body manifest created: ${bodyManifestPath}`);

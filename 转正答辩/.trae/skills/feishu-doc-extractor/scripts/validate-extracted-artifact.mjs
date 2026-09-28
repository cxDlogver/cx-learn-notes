#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const errors = [];

function fail(message) {
  errors.push(message);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function numeric(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readText(filePath, label = filePath) {
  try {
    return fs.readFileSync(filePath, "utf8");
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
    return "";
  }
}

function requireFile(filePath, label = filePath) {
  if (!fs.existsSync(filePath)) {
    fail(`${label} is missing`);
    return "";
  }
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (error) {
    fail(`${label} cannot be stat'ed: ${error.message}`);
    return "";
  }
  if (!stat.isFile()) {
    fail(`${label} is not a file`);
    return "";
  }
  if (stat.size === 0) {
    fail(`${label} is empty`);
    return "";
  }
  return readText(filePath, label);
}

function requireJson(filePath, label = filePath) {
  const text = requireFile(filePath, label);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label} is not valid JSON or may be truncated: ${error.message}`);
    return null;
  }
}

function requireMarkdown(filePath, label = filePath) {
  const text = requireFile(filePath, label);
  if (text && !text.trim()) fail(`${label} has no meaningful content`);
  return text;
}

function requireDirectory(directory) {
  if (!fs.existsSync(directory) || !fs.statSync(directory).isDirectory()) {
    fail(`required artifact directory is missing: ${directory}`);
  }
}

function readBuffer(filePath, label = filePath) {
  try {
    return fs.readFileSync(filePath);
  } catch (error) {
    fail(`${label} cannot be read: ${error.message}`);
    return null;
  }
}

function imageKind(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "jpeg";
  const ascii12 = buffer.subarray(0, 12).toString("ascii");
  if (/^GIF8[79]a/.test(ascii12)) return "gif";
  if (ascii12.startsWith("RIFF") && ascii12.slice(8, 12) === "WEBP") return "webp";
  if (ascii12.startsWith("BM")) return "bmp";
  const prefix = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8").trimStart();
  if (/^<svg\b/i.test(prefix) || /^<\?xml[\s\S]*?<svg\b/i.test(prefix)) return "svg";
  return null;
}

function validateRealFile(filePath, label, { image = false } = {}) {
  const text = requireFile(filePath, label);
  if (!text) return false;
  const buffer = readBuffer(filePath, label);
  if (!buffer) return false;
  const prefix = buffer.subarray(0, Math.min(buffer.length, 4096)).toString("utf8");
  if (/(?:^|\b)(?:placeholder|dummy|fake)\b/i.test(prefix) || /no node payload returned/i.test(prefix)) {
    fail(`${label} is placeholder content`);
    return false;
  }
  if (image && !imageKind(buffer)) {
    fail(`${label} is not a recognized image`);
    return false;
  }
  return true;
}

function collectTagTokens(markdown, tagName) {
  return [...String(markdown || "").matchAll(
    new RegExp(`<${tagName}\\b[^>]*\\btoken=["']([^"']+)["'][^>]*>`, "gi"),
  )].map((match) => match[1]);
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeLink(rawLink) {
  try {
    return decodeURIComponent(rawLink.trim().replace(/^<|>$/g, "").split("#")[0]);
  } catch {
    return rawLink.trim().replace(/^<|>$/g, "").split("#")[0];
  }
}

function collectLocalLinks(markdown) {
  const links = [];
  for (const match of String(markdown || "").matchAll(/!?\[[^\]]*]\(([^)]+)\)/g)) {
    const link = normalizeLink(match[1]);
    if (!link || /^(?:https?:|mailto:|data:)/i.test(link)) continue;
    links.push(link);
  }
  return links;
}

function markdownSection(markdown, heading) {
  const source = String(markdown || "");
  const start = source.indexOf(heading);
  if (start < 0) return "";
  const sectionStart = start + heading.length;
  const sectionEnd = source.slice(sectionStart).search(/^##\s+/m);
  return sectionEnd >= 0
    ? source.slice(sectionStart, sectionStart + sectionEnd)
    : source.slice(sectionStart);
}

function nodeArray(parsed) {
  if (Array.isArray(parsed?.nodes)) return parsed.nodes;
  if (Array.isArray(parsed?.data?.nodes)) return parsed.data.nodes;
  if (Array.isArray(parsed?.data?.items)) return parsed.data.items;
  return [];
}

function imageTokenFromNode(node) {
  return node?.image_token
    || node?.imageToken
    || node?.image?.token
    || node?.image?.image_token
    || node?.payload?.image_token
    || null;
}

function collectSourceTables(markdown) {
  return [...String(markdown || "").matchAll(/<lark-table\b[\s\S]*?<\/lark-table>/gi)]
    .map((match, index) => ({
      index: index + 1,
      cellCount: (match[0].match(/<lark-t[dh]\b/gi) || []).length,
      imageTokens: unique(collectTagTokens(match[0], "image")),
    }));
}

const args = process.argv.slice(2);
const evidenceOnly = args[0] === "--evidence";
const inputPath = evidenceOnly ? args[1] : args[0];
if (!inputPath) {
  console.error("Usage: validate-extracted-artifact.mjs <report.md>");
  console.error("   or: validate-extracted-artifact.mjs --evidence <resources_dir>");
  process.exit(2);
}

const reportPath = evidenceOnly ? "" : path.resolve(inputPath);
if (!evidenceOnly && !fs.existsSync(reportPath)) {
  console.error(`report is missing: ${reportPath}`);
  process.exit(2);
}
const resourcesDir = evidenceOnly
  ? path.resolve(inputPath)
  : path.join(path.dirname(reportPath), path.basename(reportPath, path.extname(reportPath)));
const reportDir = evidenceOnly ? path.dirname(resourcesDir) : path.dirname(reportPath);
const resourceBase = path.basename(resourcesDir);
const rawDir = path.join(resourcesDir, "raw");
const mediaDir = path.join(resourcesDir, "media");
const whiteboardsDir = path.join(resourcesDir, "whiteboards");
const commentsDir = path.join(resourcesDir, "comments");

function resolveResourceFile(value, defaultDirectory = resourcesDir) {
  let normalized = String(value || "").replaceAll("\\", "/");
  if (!normalized) return "";
  if (path.isAbsolute(normalized)) return normalized;
  for (const prefix of [`${resourceBase}/`, `${resourceBase}_resources/`]) {
    if (normalized.startsWith(prefix)) normalized = normalized.slice(prefix.length);
  }
  return normalized.includes("/")
    ? path.resolve(resourcesDir, normalized)
    : path.resolve(defaultDirectory, normalized);
}

for (const directory of [resourcesDir, rawDir, mediaDir, whiteboardsDir, commentsDir, path.join(resourcesDir, "logs")]) {
  requireDirectory(directory);
}

const sourcePath = path.join(rawDir, "fetch_doc_content.md");
const source = requireMarkdown(sourcePath, "fetch_doc_content.md");
const sourceImages = unique(collectTagTokens(source, "image"));
const sourceFiles = unique(collectTagTokens(source, "file"));
const sourceWhiteboards = unique(collectTagTokens(source, "whiteboard"));

const preflight = requireJson(path.join(rawDir, "preflight.json"), "preflight.json");
const wikiNode = requireJson(path.join(rawDir, "wiki_node.json"), "wiki_node.json");
requireJson(path.join(rawDir, "fetch_doc_response.json"), "fetch_doc_response.json");
const mediaTokens = requireJson(path.join(rawDir, "media_tokens.json"), "media_tokens.json");
const commentsManifest = requireJson(path.join(rawDir, "comments_manifest.json"), "comments_manifest.json");
const mediaManifest = requireJson(
  path.join(rawDir, "downloaded_media_manifest.json"),
  "downloaded_media_manifest.json",
);
const whiteboardManifest = requireJson(
  path.join(rawDir, "whiteboard_manifest.json"),
  "whiteboard_manifest.json",
);

if (preflight) {
  if (!preflight.selected_transport) fail("preflight.json is missing selected_transport");
  if (preflight.write_probe?.checked !== true || preflight.write_probe?.passed !== true) {
    fail("preflight.json write_probe must be checked and passed");
  }
  if (preflight.auth?.checked !== true || preflight.auth?.passed !== true) {
    fail("preflight.json auth must be checked and passed");
  }
}
if (wikiNode && !(wikiNode?.node?.obj_type || wikiNode?.obj_type)) {
  fail("wiki_node.json is missing obj_type");
}

const parserStrictPath = path.join(rawDir, "lark_parser_strict.md");
const parserErrorPath = path.join(rawDir, "lark_parser_error.json");
const parserSucceeded = fs.existsSync(parserStrictPath);
if (parserSucceeded) requireMarkdown(parserStrictPath, "lark_parser_strict.md");
else if (fs.existsSync(parserErrorPath)) requireJson(parserErrorPath, "lark_parser_error.json");
else fail("either lark_parser_strict.md or lark_parser_error.json is required");

for (const [field, expected] of [
  ["images", sourceImages],
  ["files", sourceFiles],
  ["whiteboards", sourceWhiteboards],
]) {
  const actual = unique(Array.isArray(mediaTokens?.[field]) ? mediaTokens[field] : []);
  if (actual.length !== expected.length || expected.some((token) => !actual.includes(token))) {
    fail(`media_tokens.json ${field} do not match fetch source`);
  }
}

const commentPageFiles = fs.existsSync(commentsDir)
  ? fs.readdirSync(commentsDir).filter((name) => /^comments_page_\d+\.json$/.test(name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  : [];
if (commentPageFiles.length === 0) fail("at least one comments_page_<N>.json evidence file is required");
const comments = [];
for (const name of commentPageFiles) {
  const page = requireJson(path.join(commentsDir, name), name);
  if (Array.isArray(page?.items)) comments.push(...page.items);
}
if (commentPageFiles.length > 0) {
  const lastPage = requireJson(
    path.join(commentsDir, commentPageFiles.at(-1)),
    `final comment page ${commentPageFiles.at(-1)}`,
  );
  if (lastPage && lastPage.has_more !== false) fail("final comment page must record has_more=false");
}
const manifestComments = Array.isArray(commentsManifest?.comments) ? commentsManifest.comments : [];
if (numeric(commentsManifest?.total) !== null && commentsManifest.total !== comments.length) {
  fail(`comments_manifest total ${commentsManifest.total} != comment page count ${comments.length}`);
}
if (manifestComments.length !== comments.length) {
  fail(`comments_manifest entries ${manifestComments.length} != comment page count ${comments.length}`);
}
const manifestCommentIds = new Set(manifestComments.map((item) => item.comment_id).filter(Boolean));
for (const comment of comments) {
  if (comment.comment_id && !manifestCommentIds.has(comment.comment_id)) {
    fail(`comments_manifest is missing comment ${comment.comment_id}`);
  }
}

const mediaItems = Array.isArray(mediaManifest?.items) ? mediaManifest.items : [];
const mediaByToken = new Map(mediaItems.map((item) => [item.token, item]));
for (const [type, tokens] of [["image", sourceImages], ["file", sourceFiles]]) {
  for (const token of tokens) {
    const item = mediaByToken.get(token);
    if (!item) {
      fail(`downloaded media manifest is missing ${type} ${token}`);
      continue;
    }
    if (item.type !== type) fail(`downloaded media ${token} type ${item.type} != ${type}`);
    if (item.status !== "success" || !item.actual_file) {
      fail(`downloaded ${type} ${token} is not successful or lacks actual_file`);
      continue;
    }
    validateRealFile(
      resolveResourceFile(item.actual_file, mediaDir),
      `downloaded ${type} ${token}`,
      { image: type === "image" },
    );
  }
}

const boards = Array.isArray(whiteboardManifest)
  ? whiteboardManifest
  : whiteboardManifest?.whiteboards || [];
const boardTokens = unique(boards.map((board) => board.token).filter(Boolean));
if (
  boardTokens.length !== sourceWhiteboards.length
  || sourceWhiteboards.some((token) => !boardTokens.includes(token))
) {
  fail("whiteboard manifest tokens do not match fetch source");
}

const boardNodeImages = [];
const analysisFiles = [];
for (const [index, board] of boards.entries()) {
  const token = board.token || `entry-${index + 1}`;
  const actualOccurrences = collectTagTokens(source, "whiteboard").filter((value) => value === board.token).length;
  if (numeric(board.occurrences) !== null && board.occurrences !== actualOccurrences) {
    fail(`whiteboard ${token} occurrences ${board.occurrences} != source occurrences ${actualOccurrences}`);
  }
  const thumbnailPath = resolveResourceFile(board.thumbnail_file, whiteboardsDir);
  validateRealFile(thumbnailPath, `whiteboard ${token} thumbnail`, { image: true });
  const nodePath = resolveResourceFile(board.node_json_file, whiteboardsDir);
  const nodePayload = requireJson(nodePath, `node JSON for whiteboard ${token}`);
  const nodes = nodeArray(nodePayload);
  if (nodePayload && nodes.length === 0) fail(`whiteboard ${token} node JSON contains no nodes`);
  if (nodePayload && /placeholder|no node payload returned/i.test(JSON.stringify(nodePayload))) {
    fail(`whiteboard ${token} node JSON contains placeholder data`);
  }
  if (nodePayload && numeric(board.node_json_bytes) !== null) {
    const actualBytes = fs.existsSync(nodePath) ? fs.statSync(nodePath).size : 0;
    if (board.node_json_bytes !== actualBytes) {
      fail(`whiteboard ${token} node_json_bytes ${board.node_json_bytes} != actual ${actualBytes}`);
    }
  }
  const returnedToken = nodePayload?.whiteboard_id
    || nodePayload?.token
    || nodePayload?.data?.whiteboard_id
    || nodePayload?.data?.token;
  if (returnedToken && board.token && returnedToken !== board.token) {
    fail(`whiteboard ${board.token} node JSON belongs to ${returnedToken}`);
  }
  const imageNodes = nodes.map((node) => ({
    nodeId: node?.id || node?.node_id || null,
    imageToken: imageTokenFromNode(node),
  })).filter((item) => item.imageToken);
  const nodeImages = Array.isArray(board.node_images) ? board.node_images : [];
  if (nodeImages.length !== imageNodes.length) {
    fail(`whiteboard ${token} node_images entries ${nodeImages.length} != image nodes ${imageNodes.length}`);
  }
  const matchedIndexes = new Set();
  for (const imageNode of imageNodes) {
    const matches = nodeImages.map((item, manifestIndex) => ({ item, manifestIndex })).filter(({ item }) => (
      (imageNode.nodeId && item.node_id === imageNode.nodeId)
      || item.image_token === imageNode.imageToken
    ));
    if (matches.length !== 1) {
      fail(`whiteboard ${token} node image ${imageNode.nodeId || imageNode.imageToken} must map exactly once`);
      continue;
    }
    const { item, manifestIndex } = matches[0];
    if (matchedIndexes.has(manifestIndex)) {
      fail(`whiteboard ${token} node image manifest entry ${manifestIndex + 1} is reused`);
    }
    matchedIndexes.add(manifestIndex);
    if (item.status !== "success" || !item.actual_file) {
      fail(`whiteboard ${token} node image ${imageNode.nodeId || imageNode.imageToken} is incomplete`);
      continue;
    }
    const actualPath = resolveResourceFile(item.actual_file, whiteboardsDir);
    validateRealFile(actualPath, `whiteboard ${token} node image ${imageNode.nodeId || imageNode.imageToken}`, {
      image: true,
    });
    boardNodeImages.push({ token: board.token, nodeId: imageNode.nodeId, actualPath });
  }
  const analysisPath = resolveResourceFile(board.analysis_file, whiteboardsDir);
  const analysis = requireMarkdown(analysisPath, `analysis for whiteboard ${token}`);
  analysisFiles.push({ token: board.token, path: analysisPath, text: analysis });
  for (const heading of [
    "## 上下文",
    "## 结论摘要",
    "## 节点证据",
    "## 图片节点",
    "## 填充 / 高亮 / 标注分析",
    "## 关联评论",
    "## 需确认点",
  ]) {
    if (analysis && !analysis.includes(heading)) {
      fail(`analysis for ${token} is missing "${heading}"`);
      continue;
    }
    const section = markdownSection(analysis, heading);
    if (!section.trim()) fail(`analysis for ${token} has empty section "${heading}"`);
  }
  const conclusionSection = markdownSection(analysis, "## 结论摘要");
  for (const label of ["业务结论", "重点标注", "需求映射"]) {
    const match = conclusionSection.match(new RegExp(`\\*\\*${label}\\*\\*\\s*[：:]\\s*([^\\n]+)`, "u"));
    const value = match?.[1]?.trim() || "";
    if (!value) {
      fail(`analysis for ${token} is missing required conclusion field "${label}"`);
    } else if (/^(?:无|暂无|待补充|待确认|todo|tbd|n\/a|na|\.\.\.|…)+$/i.test(value)) {
      fail(`analysis for ${token} conclusion field "${label}" is not detailed enough`);
    }
  }
  const nodeEvidenceSection = markdownSection(analysis, "## 节点证据");
  for (const label of ["节点 JSON", "节点范围", "节点关系"]) {
    const match = nodeEvidenceSection.match(new RegExp(`\\*\\*${label}\\*\\*\\s*[：:]\\s*([^\\n]+)`, "u"));
    const value = match?.[1]?.trim() || "";
    if (!value) {
      fail(`analysis for ${token} is missing required node evidence field "${label}"`);
    } else if (/^(?:无|暂无|待补充|待确认|todo|tbd|n\/a|na|\.\.\.|…)+$/i.test(value)) {
      fail(`analysis for ${token} field "${label}" is not detailed enough`);
    }
  }
  const nodeEvidenceLinks = new Set(
    collectLocalLinks(nodeEvidenceSection).map((link) => path.resolve(path.dirname(analysisPath), link)),
  );
  if (!nodeEvidenceLinks.has(path.resolve(nodePath))) {
    fail(`analysis for ${token} is missing node JSON link in "## 节点证据"`);
  }
  if (/当前初始化记录|本次初始化保留|后续若 .*补充|placeholder/i.test(analysis)) {
    fail(`analysis for ${token} contains placeholder or deferred analysis`);
  }
  const analysisLinks = new Set(
    collectLocalLinks(analysis).map((link) => path.resolve(path.dirname(analysisPath), link)),
  );
  for (const item of boardNodeImages.filter((nodeImage) => nodeImage.token === board.token)) {
    if (!analysisLinks.has(path.resolve(item.actualPath))) {
      fail(`analysis for ${token} is missing link to node image ${item.nodeId}`);
    }
  }
}

if (evidenceOnly) {
  if (errors.length > 0) {
    console.error("Evidence validation failed:");
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log(`Evidence validation passed: ${resourcesDir}`);
  process.exit(0);
}

const report = readText(reportPath, "report");
const h1Headings = [...report.matchAll(/^# ([^#].*)$/gm)].map((match) => match[1].trim());
const expectedH1 = ["文档概述", "正文", "验收检查"];
if (
  h1Headings.length !== expectedH1.length
  || h1Headings.some((heading, index) => heading !== expectedH1[index])
) {
  fail(`document layout H1 headings must be: ${expectedH1.join(" -> ")}; found: ${h1Headings.join(" -> ")}`);
}

const bodyStart = report.indexOf("# 正文");
const acceptanceStart = report.indexOf("# 验收检查");
const body = bodyStart >= 0
  ? report.slice(bodyStart + "# 正文".length, acceptanceStart >= 0 ? acceptanceStart : undefined)
  : "";
const acceptance = acceptanceStart >= 0 ? report.slice(acceptanceStart) : "";
if (!body.trim()) fail("report body is empty");

const htmlCheck = report.replace(/<br\s*\/?\s*>/gi, "");
for (const [pattern, label] of [
  [/\{align=/i, "{align=...} residue"],
  [/<(?:image|file|whiteboard)\b/i, "raw media tag"],
  [/<\/?(?:lark-|mention-)[^>]*>/i, "Lark export tag"],
  [/<\/?[A-Za-z][^>]*>/, "raw HTML other than script-generated <br />"],
  [/attachment:\/\/board_/i, "Parser board attachment residue"],
  [/^#{2,6}\s*(?:源正文保真补充|原文保真补充|保真补充)\s*$/m, "source supplement section"],
  [/^#{2,6}\s*(?:表格内图片原位呈现|原文结构化文本对账|Parser\s*图片说明映射|raw\s*manifest|抽取日志)\s*$/im, "process appendix"],
]) {
  if (pattern.test(htmlCheck)) fail(`report contains ${label}`);
}

let previousHeadingLevel = 0;
for (const [index, line] of report.split("\n").entries()) {
  const heading = /^(#{1,6})\s+(.+)$/.exec(line);
  if (!heading) continue;
  const level = heading[1].length;
  if (previousHeadingLevel > 0 && level > previousHeadingLevel + 1) {
    fail(`heading level jumps from H${previousHeadingLevel} to H${level} at line ${index + 1}`);
  }
  previousHeadingLevel = level;
}
if ((report.match(/^```/gm) || []).length % 2 !== 0) fail("report contains an unclosed fenced code block");

const reportLinks = collectLocalLinks(report);
const reportLinkedFiles = new Set(reportLinks.map((link) => path.resolve(reportDir, link)));
for (const link of reportLinks) {
  const resolved = path.resolve(reportDir, link);
  if (!fs.existsSync(resolved)) fail(`broken local link in report: ${link}`);
}
for (const analysisFile of analysisFiles) {
  for (const link of collectLocalLinks(analysisFile.text)) {
    const resolved = path.resolve(path.dirname(analysisFile.path), link);
    if (!fs.existsSync(resolved)) fail(`broken local link in ${analysisFile.path}: ${link}`);
  }
}

if (!reportLinkedFiles.has(path.resolve(sourcePath))) fail("report is missing link to fetch_doc_content.md");
const parserEvidence = parserSucceeded ? parserStrictPath : parserErrorPath;
if (!reportLinkedFiles.has(path.resolve(parserEvidence))) fail("report is missing link to Parser evidence");
for (const name of commentPageFiles) {
  const commentPath = path.join(commentsDir, name);
  if (!reportLinkedFiles.has(path.resolve(commentPath))) fail(`report is missing link to ${name}`);
}

const bodyLinkedFiles = new Set(
  collectLocalLinks(body).map((link) => path.resolve(reportDir, link)),
);
for (const token of [...sourceImages, ...sourceFiles]) {
  const item = mediaByToken.get(token);
  if (!item?.actual_file) continue;
  const actualPath = resolveResourceFile(item.actual_file, mediaDir);
  if (!bodyLinkedFiles.has(path.resolve(actualPath))) fail(`media ${token} is not linked from the report body`);
}

for (const board of boards) {
  const token = board.token;
  const expectedOccurrences = collectTagTokens(source, "whiteboard").filter((value) => value === token).length;
  const reportAnchors = Array.isArray(board.report_anchors) ? board.report_anchors : [];
  const inlineAnchors = Array.isArray(board.inline_placeholder_anchors)
    ? board.inline_placeholder_anchors
    : [];
  if (reportAnchors.length !== expectedOccurrences) {
    fail(`whiteboard ${token} must record ${expectedOccurrences} report anchor(s)`);
  }
  if (inlineAnchors.length !== expectedOccurrences) {
    fail(`whiteboard ${token} must record ${expectedOccurrences} inline placeholder anchor(s)`);
  }
  for (const anchor of [...reportAnchors, ...inlineAnchors]) {
    if (!anchor || !body.includes(anchor)) fail(`whiteboard ${token} has an invalid body anchor`);
  }
  const inlineMarker = `白板：${token}`;
  const inlineCount = body.split(inlineMarker).length - 1;
  if (inlineCount !== expectedOccurrences) {
    fail(`whiteboard ${token} body occurrences ${inlineCount} != source occurrences ${expectedOccurrences}`);
  }
  const thumbnail = resolveResourceFile(board.thumbnail_file, whiteboardsDir);
  const nodeJson = resolveResourceFile(board.node_json_file, whiteboardsDir);
  const analysis = resolveResourceFile(board.analysis_file, whiteboardsDir);
  if (!bodyLinkedFiles.has(path.resolve(thumbnail))) fail(`whiteboard ${token} thumbnail is not linked from body`);
  if (!bodyLinkedFiles.has(path.resolve(analysis))) fail(`whiteboard ${token} analysis is not linked from body`);
  for (const [filePath, label] of [[thumbnail, "thumbnail"], [nodeJson, "node JSON"], [analysis, "analysis"]]) {
    if (!reportLinkedFiles.has(path.resolve(filePath))) fail(`report is missing whiteboard ${token} ${label} evidence link`);
  }
  for (const nodeImage of board.node_images || []) {
    const actualPath = resolveResourceFile(nodeImage.actual_file, whiteboardsDir);
    if (!reportLinkedFiles.has(path.resolve(actualPath))) {
      fail(`report is missing whiteboard ${token} node image ${nodeImage.node_id || nodeImage.image_token} link`);
    }
  }
}

const bodyManifest = requireJson(
  path.join(rawDir, "body_reconstruction_manifest.json"),
  "body_reconstruction_manifest.json",
);
if (bodyManifest) {
  if (bodyManifest.source_file !== "raw/fetch_doc_content.md") {
    fail("body reconstruction manifest source_file must be raw/fetch_doc_content.md");
  }
  if (bodyManifest.source_sha256 !== sha256(source)) {
    fail("body reconstruction manifest source_sha256 does not match fetch_doc_content.md");
  }
  for (const obsoleteField of ["seed_file", "seed_sha256", "source_seed_equal"]) {
    if (obsoleteField in bodyManifest) fail(`body reconstruction manifest contains obsolete field ${obsoleteField}`);
  }
  if (!Array.isArray(bodyManifest.removed_source_blocks) || bodyManifest.removed_source_blocks.length > 0) {
    fail("body reconstruction manifest removed_source_blocks must be empty");
  }
  if (!Array.isArray(bodyManifest.unresolved_source_blocks) || bodyManifest.unresolved_source_blocks.length > 0) {
    fail("body reconstruction manifest unresolved_source_blocks must be empty");
  }
  const blocks = Array.isArray(bodyManifest.blocks) ? bodyManifest.blocks : [];
  if (source.trim() && blocks.length === 0) fail("body reconstruction manifest blocks must not be empty");
  for (const [index, block] of blocks.entries()) {
    if (!block.source_block_id || !numeric(block.source_order) || !numeric(block.final_order)) {
      fail(`body block ${index + 1} is missing identity or order`);
    }
    if (!block.content_digest || !block.final_anchor || !body.includes(block.final_anchor)) {
      fail(`body block ${index + 1} is missing digest or final anchor`);
    }
    if ("preservation_status" in block) fail(`body block ${index + 1} contains obsolete preservation_status`);
  }
  const sourceTables = collectSourceTables(source);
  const tableConversions = Array.isArray(bodyManifest.table_conversions)
    ? bodyManifest.table_conversions
    : [];
  if (tableConversions.length !== sourceTables.length) {
    fail(`table_conversions ${tableConversions.length} != source table count ${sourceTables.length}`);
  }
  const seenTableIndexes = new Set();
  for (const [index, table] of tableConversions.entries()) {
    const sourceIndex = numeric(table.source_table_index);
    if (!sourceIndex || seenTableIndexes.has(sourceIndex) || sourceIndex > sourceTables.length) {
      fail(`table conversion ${index + 1} has invalid source_table_index`);
      continue;
    }
    seenTableIndexes.add(sourceIndex);
    const sourceTable = sourceTables[sourceIndex - 1];
    if (table.conversion_type !== "pipe_table" && table.conversion_type !== "layered_table") {
      fail(`table conversion ${index + 1} has invalid conversion_type`);
    }
    if (table.source_cell_count !== sourceTable.cellCount) {
      fail(`table conversion ${index + 1} source_cell_count does not match source`);
    }
    if (!table.final_anchor || !body.includes(table.final_anchor)) {
      fail(`table conversion ${index + 1} final_anchor is missing from body`);
    }
    const cellMappings = Array.isArray(table.cell_mappings) ? table.cell_mappings : [];
    if (cellMappings.length !== sourceTable.cellCount) {
      fail(`table conversion ${index + 1} cell_mappings do not cover all cells`);
    }
    const imageMappings = Array.isArray(table.image_mappings) ? table.image_mappings : [];
    if (imageMappings.length !== sourceTable.imageTokens.length) {
      fail(`table conversion ${index + 1} image_mappings do not cover source images`);
    }
    for (const token of sourceTable.imageTokens) {
      const mapping = imageMappings.find((item) => item.token === token);
      if (!mapping?.final_anchor || !body.includes(mapping.final_anchor)) {
        fail(`table conversion ${index + 1} is missing image mapping for ${token}`);
      }
    }
  }
  const resourceMappings = Array.isArray(bodyManifest.resource_mappings)
    ? bodyManifest.resource_mappings
    : [];
  for (const [type, tokens] of [
    ["image", sourceImages],
    ["file", sourceFiles],
    ["whiteboard", sourceWhiteboards],
  ]) {
    for (const token of tokens) {
      const mapping = resourceMappings.find((item) => item.type === type && item.token === token);
      if (!mapping?.final_anchor || !body.includes(mapping.final_anchor)) {
        fail(`body reconstruction manifest is missing ${type} mapping for ${token}`);
      }
    }
  }
}

const markdownFiles = [{ path: reportPath, text: report }, ...analysisFiles];
const commentLocations = new Map(manifestComments.map((comment) => [comment.comment_id, comment]));
for (const comment of comments) {
  if (!comment.comment_id) continue;
  const occurrences = markdownFiles.flatMap((file) => {
    const count = file.text.split(comment.comment_id).length - 1;
    return Array.from({ length: count }, () => file);
  });
  if (occurrences.length !== 1) {
    fail(`comment ${comment.comment_id} must appear exactly once; found ${occurrences.length}`);
    continue;
  }
  const location = commentLocations.get(comment.comment_id);
  if (!location) {
    fail(`comment ${comment.comment_id} is missing from comments manifest`);
    continue;
  }
  if (location.parent_type === "WHITEBOARD_BLOCK") {
    const expected = analysisFiles.find((item) => item.token === location.parent_token)?.path;
    if (!expected || occurrences[0].path !== expected) {
      fail(`whiteboard comment ${comment.comment_id} is not in analysis for ${location.parent_token}`);
    }
  }
  if (!location.method) fail(`comment ${comment.comment_id} is missing an anchoring method`);
  if (location.target_type !== "unlocated") {
    const anchor = location.final_anchor || location.anchor || location.quote;
    if (!anchor || !occurrences[0].text.includes(anchor)) {
      fail(`located comment ${comment.comment_id} is missing a valid final anchor`);
    }
  } else if (!location.failure_reason) {
    fail(`unlocated comment ${comment.comment_id} is missing a specific failure_reason`);
  }
}

for (const [label, pattern, expected] of [
  ["正文图片", /正文图片[^\d\n]{0,12}(\d+)/, sourceImages.length],
  ["附件", /附件[^\d\n]{0,12}(\d+)/, sourceFiles.length],
  ["白板", /白板(?!节点)[^\d\n]{0,12}(\d+)/, sourceWhiteboards.length],
  ["白板节点图片", /白板节点图片[^\d\n]{0,12}(\d+)/, boardNodeImages.length],
  ["评论", /评论[^\d\n]{0,12}(\d+)/, comments.length],
]) {
  const match = pattern.exec(report);
  if (!match) fail(`report is missing computed count for ${label}`);
  else if (Number(match[1]) !== expected) fail(`report ${label} count ${match[1]} != evidence count ${expected}`);
}

if (errors.length > 0) {
  console.error("Artifact validation failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Artifact validation passed: ${boards.length} whiteboards, ${comments.length} comments, ${analysisFiles.length + 1} Markdown files.`,
);

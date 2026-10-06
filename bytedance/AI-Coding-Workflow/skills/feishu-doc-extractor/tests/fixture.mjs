import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export function createFixture({ parserSuccess = true } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "feishu-doc-extractor-"));
  const reportPath = path.join(root, "sample.md");
  const resources = path.join(root, "sample");
  const raw = path.join(resources, "raw");
  const media = path.join(resources, "media");
  const whiteboards = path.join(resources, "whiteboards");
  const comments = path.join(resources, "comments");
  const logs = path.join(resources, "logs");
  for (const directory of [raw, media, whiteboards, comments, logs]) {
    fs.mkdirSync(directory, { recursive: true });
  }

  const paragraph1 = "需求正文第一段用于验证报告正文的脚本化改写。".repeat(24);
  const paragraph2 = "需求正文第二段继续描述产品规则、交互变化和验收标准。".repeat(24);
  const source = [
    "# 原始标题",
    "",
    paragraph1,
    "",
    "<callout>这是需要转换为引用的提示。</callout>",
    "[编码外链](https%3A%2F%2Fexample.com%2Fspec)",
    "",
    "<image token=\"img1\"/>",
    "",
    "<file token=\"file1\" name=\"spec.txt\"/>",
    "",
    "<lark-table>",
    "<lark-tr><lark-td>字段</lark-td><lark-td>资源</lark-td></lark-tr>",
    "<lark-tr><lark-td>截图</lark-td><lark-td><image token=\"img1\"/></lark-td></lark-tr>",
    "<lark-tr><lark-td>方案</lark-td><lark-td><whiteboard token=\"wb1\"/></lark-td></lark-tr>",
    "</lark-table>",
    "",
    paragraph2,
    "",
  ].join("\n");

  fs.writeFileSync(path.join(raw, "fetch_doc_content.md"), source);
  writeJson(path.join(raw, "preflight.json"), {
    selected_transport: "mcp",
    auth: { checked: true, passed: true },
    write_probe: { checked: true, passed: true },
    source: {
      url: "https://example.feishu.cn/wiki/wiki1",
      obj_type: "docx",
      obj_token: "doc1",
    },
  });
  writeJson(path.join(raw, "wiki_node.json"), {
    node: { obj_type: "docx", obj_token: "doc1", title: "校验样例" },
  });
  writeJson(path.join(raw, "fetch_doc_response.json"), { title: "校验样例", markdown: source });
  writeJson(path.join(raw, "media_tokens.json"), {
    images: ["img1"],
    files: ["file1"],
    whiteboards: ["wb1"],
  });
  writeJson(path.join(raw, "comments_manifest.json"), {
    total: 0,
    located: 0,
    unlocated: 0,
    comments: [],
  });
  writeJson(path.join(comments, "comments_page_1.json"), { items: [], has_more: false });
  if (parserSuccess) fs.writeFileSync(path.join(raw, "lark_parser_strict.md"), "# Parser 辅助材料\n");
  else writeJson(path.join(raw, "lark_parser_error.json"), { error: "parser unavailable" });

  fs.writeFileSync(path.join(media, "img1.png"), png);
  fs.writeFileSync(path.join(media, "file1.txt"), "real attachment\n");
  writeJson(path.join(raw, "downloaded_media_manifest.json"), {
    items: [
      {
        token: "img1",
        type: "image",
        status: "success",
        actual_file: "sample/media/img1.png",
      },
      {
        token: "file1",
        type: "file",
        status: "success",
        actual_file: "sample/media/file1.txt",
      },
    ],
  });

  const nodeFile = path.join(whiteboards, "whiteboard_01_wb1_nodes.json");
  const thumbnailFile = path.join(whiteboards, "whiteboard_01_wb1_thumbnail.png");
  const analysisFile = path.join(whiteboards, "whiteboard_01_wb1_analysis.md");
  const nodeImageFile = path.join(whiteboards, "whiteboard_01_wb1_node_image.png");
  writeJson(nodeFile, {
    token: "wb1",
    nodes: [
      { id: "node1", type: "shape", text: "真实节点" },
      { id: "image-node-1", type: "image", image_token: "node-img1" },
    ],
  });
  fs.writeFileSync(thumbnailFile, png);
  fs.writeFileSync(nodeImageFile, png);
  fs.writeFileSync(analysisFile, [
    "# 白板分析：wb1",
    "",
    "## 上下文",
    "白板对应需求正文中的方案单元格。",
    "",
    "## 结论摘要",
    "- **业务结论**：该白板表达当前段落中的方案页面需要新增治理提示，并约束后续发奖动作。",
    "- **重点标注**：图片节点突出页面中活动参与资格配置区域，用于说明提示文案的出现位置。",
    "- **需求映射**：对应方案单元格中的治理提示需求和发奖动作约束验收点。",
    "",
    "## 节点证据",
    "- **节点 JSON**：[whiteboard_01_wb1_nodes.json](whiteboard_01_wb1_nodes.json)",
    "- **节点范围**：1 个图片节点，覆盖配置页面截图区域。",
    "- **节点关系**：图片节点为主要证据节点，未发现额外父子或连接线关系。",
    "",
    "## 图片节点",
    "image-node-1 是真实图片节点。",
    "",
    "![节点图片](whiteboard_01_wb1_node_image.png)",
    "",
    "## 填充 / 高亮 / 标注分析",
    "该节点用于标识方案中的页面重点区域。",
    "",
    "## 关联评论",
    "无关联评论。",
    "",
    "## 需确认点",
    "无。",
    "",
  ].join("\n"));
  writeJson(path.join(raw, "whiteboard_manifest.json"), {
    whiteboards: [{
      index: 1,
      token: "wb1",
      occurrences: 1,
      thumbnail_file: "sample/whiteboards/whiteboard_01_wb1_thumbnail.png",
      node_json_file: "sample/whiteboards/whiteboard_01_wb1_nodes.json",
      analysis_file: "sample/whiteboards/whiteboard_01_wb1_analysis.md",
      node_json_bytes: fs.statSync(nodeFile).size,
      node_images: [{
        node_id: "image-node-1",
        image_token: "node-img1",
        actual_file: "sample/whiteboards/whiteboard_01_wb1_node_image.png",
        status: "success",
      }],
    }],
  });

  return {
    root,
    reportPath,
    resources,
    raw,
    media,
    whiteboards,
    comments,
    source,
    paragraph1,
    paragraph2,
    analysisFile,
    nodeImageFile,
  };
}

export { writeJson };

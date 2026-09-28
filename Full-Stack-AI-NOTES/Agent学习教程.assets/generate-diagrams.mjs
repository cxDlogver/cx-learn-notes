import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = dirname(fileURLToPath(import.meta.url));

const C = {
  bg: "#F8FAFC",
  panel: "#FFFFFF",
  ink: "#172033",
  muted: "#5F6B7A",
  line: "#CBD5E1",
  blue: "#2563EB",
  blueSoft: "#EAF2FF",
  green: "#15803D",
  greenSoft: "#EAF8EF",
  orange: "#C05A12",
  orangeSoft: "#FFF2E2",
  purple: "#6D3FC0",
  purpleSoft: "#F3ECFF",
  red: "#B93838",
  redSoft: "#FFF0F0",
  graySoft: "#EEF2F6",
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

function text(x, y, value, size = 24, weight = 400, fill = C.ink, anchor = "start") {
  return `<text x="${x}" y="${y}" font-size="${size}" font-weight="${weight}" fill="${fill}" text-anchor="${anchor}">${esc(value)}</text>`;
}

function lines(x, y, values, { size = 21, gap = 34, weight = 400, fill = C.ink, anchor = "start" } = {}) {
  return values.map((value, index) => text(x, y + index * gap, value, size, weight, fill, anchor)).join("\n");
}

function box(x, y, width, height, { fill = C.panel, stroke = C.line, radius = 18, strokeWidth = 2 } = {}) {
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`;
}

function tag(x, y, width, label, fill, color) {
  return `${box(x, y, width, 40, { fill, stroke: fill, radius: 20, strokeWidth: 0 })}\n${text(x + width / 2, y + 27, label, 18, 500, color, "middle")}`;
}

function arrow(x1, y1, x2, y2, { color = C.muted, width = 2.5, dashed = false, marker = true } = {}) {
  return `<path d="M ${x1} ${y1} L ${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="9 8"' : ""}${marker ? ' marker-end="url(#arrow)"' : ""}/>`;
}

function polyArrow(points, { color = C.muted, width = 2.5, dashed = false } = {}) {
  const d = points.map(([x, y], index) => `${index === 0 ? "M" : "L"} ${x} ${y}`).join(" ");
  return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}"${dashed ? ' stroke-dasharray="9 8"' : ""} marker-end="url(#arrow)"/>`;
}

function circle(x, y, radius, fill, label, color = C.panel) {
  return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${fill}"/>\n${text(x, y + 8, label, 22, 500, color, "middle")}`;
}

function doc(titleValue, description, width, height, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="title desc">
  <title id="title">${esc(titleValue)}</title>
  <desc id="desc">${esc(description)}</desc>
  <defs>
    <marker id="arrow" viewBox="0 0 12 12" refX="10" refY="6" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
      <path d="M 1 1 L 11 6 L 1 11 z" fill="context-stroke"/>
    </marker>
  </defs>
  <rect width="${width}" height="${height}" fill="${C.bg}"/>
  <g font-family="-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif">
    ${text(72, 76, titleValue, 36, 500)}
    ${text(72, 116, description, 20, 400, C.muted)}
    ${body}
  </g>
</svg>\n`.replace(/[ \t]+$/gm, "");
}

function save(name, contents) {
  writeFileSync(join(outDir, name), contents, "utf8");
}

// 01 三层架构
{
  const body = `
    ${box(120, 170, 1070, 180, { fill: C.orangeSoft, stroke: C.orange })}
    ${tag(155, 196, 166, "Application", C.orange, C.panel)}
    ${text(350, 230, "把业务目标写成可交付、可审计的流程", 26, 500)}
    ${lines(350, 274, ["Business Workflow 管住主干：Stage、Gate、分支、人工责任", "Agentic Workflow 处理开放任务：检索、分析、编码、综合判断"], { size: 20, gap: 34, fill: C.muted })}

    ${box(120, 390, 1070, 180, { fill: C.greenSoft, stroke: C.green })}
    ${tag(155, 416, 166, "Capability", C.green, C.panel)}
    ${text(350, 450, "沉淀多个 Agent 和流程都能调用的能力", 26, 500)}
    ${lines(350, 494, ["Skill · Tool · CLI / API / Service · 数据与知识检索", "MCP 是复用接入方式；共享长期记忆按真实需求建设"], { size: 20, gap: 34, fill: C.muted })}

    ${box(120, 610, 1070, 180, { fill: C.blueSoft, stroke: C.blue })}
    ${tag(155, 636, 166, "Foundation", C.blue, C.panel)}
    ${text(350, 670, "提供与具体业务无关的通用机制", 26, 500)}
    ${lines(350, 714, ["构建 Agent · 可靠执行一次 Run · 运营多个 Agent", "状态、隔离、权限、恢复、观测、发布与治理"], { size: 20, gap: 34, fill: C.muted })}

    ${arrow(1240, 700, 1240, 500, { color: C.blue })}
    ${arrow(1240, 480, 1240, 280, { color: C.green })}
    ${text(1360, 500, "提供机制与复用能力", 19, 500, C.muted, "middle")}
    ${text(1360, 528, "由业务层组合", 19, 400, C.muted, "middle")}
  `;
  save("01-three-layers.svg", doc("企业 Agent 三层架构", "三层按责任和复用范围划分，不按产品名划分", 1480, 870, body));
}

// 02 Foundation 生命周期
{
  const body = `
    ${arrow(445, 310, 560, 310, { color: C.blue, width: 3 })}
    ${arrow(900, 310, 1015, 310, { color: C.blue, width: 3 })}

    ${box(85, 175, 360, 280, { fill: C.panel, stroke: C.line })}
    ${circle(135, 220, 25, C.blue, "1")}
    ${text(175, 229, "构建 Agent", 28, 500)}
    ${lines(125, 285, ["模型访问与 Agent loop", "上下文与工具调用", "工作区、沙箱与审批", "产物和结构化输出"], { size: 21, gap: 41, fill: C.muted })}

    ${box(560, 175, 340, 280, { fill: C.blueSoft, stroke: C.blue })}
    ${circle(610, 220, 25, C.blue, "2")}
    ${text(650, 229, "执行一次 Run", 28, 500)}
    ${lines(600, 285, ["Identity 与状态", "Checkpoint 与调度", "超时、取消、重试", "隔离、产物与事件"], { size: 21, gap: 41, fill: C.muted })}

    ${box(1015, 175, 360, 280, { fill: C.panel, stroke: C.line })}
    ${circle(1065, 220, 25, C.blue, "3")}
    ${text(1105, 229, "运营多个 Agent", 28, 500)}
    ${lines(1055, 285, ["注册、版本与发布", "身份、密钥与网络", "观测、评测与预算", "审计、灰度与回滚"], { size: 21, gap: 41, fill: C.muted })}

    ${text(85, 535, "贯穿生命周期的基础能力", 24, 500)}
    ${box(85, 570, 1290, 72, { fill: C.graySoft, stroke: C.line, radius: 12 })}
    ${text(730, 616, "身份与权限   ·   状态与产物   ·   观测与审计   ·   配置与版本", 22, 500, C.ink, "middle")}

    ${text(85, 715, "Foundation 中常见的工程称呼，职责范围会交叉", 22, 500)}
    ${tag(85, 750, 250, "Runtime：可靠执行", C.blueSoft, C.blue)}
    ${tag(365, 750, 310, "Harness：Agent 工作外壳", C.greenSoft, C.green)}
    ${tag(705, 750, 390, "Platform：统一运营多个 Agent", C.orangeSoft, C.orange)}
    ${text(1125, 778, "三者可重叠", 20, 500, C.muted)}
  `;
  save("02-foundation-lifecycle.svg", doc("Foundation 按生命周期梳理", "构建、执行和运营覆盖 Foundation 的完整职责", 1460, 850, body));
}

// 03 策略与执行
{
  const body = `
    ${box(90, 170, 530, 500, { fill: C.orangeSoft, stroke: C.orange })}
    ${tag(125, 200, 190, "Application", C.orange, C.panel)}
    ${text(125, 282, "定义业务策略", 28, 500)}
    ${lines(125, 330, ["哪些错误可以重试", "最多多少次、间隔多久", "继续会话还是新开执行", "耗尽后转人工还是错误分支", "质量失败回到哪个业务阶段"], { size: 22, gap: 49 })}

    ${box(840, 170, 530, 500, { fill: C.blueSoft, stroke: C.blue })}
    ${tag(875, 200, 176, "Foundation", C.blue, C.panel)}
    ${text(875, 282, "提供执行机制", 28, 500)}
    ${lines(875, 330, ["记录 attempt 与错误码", "设置计时器并调度重试", "读取 checkpoint 并恢复", "保证状态一致和调用幂等", "发出成功、失败或耗尽事件"], { size: 22, gap: 49 })}

    ${arrow(620, 320, 840, 320, { color: C.orange, width: 3 })}
    ${text(730, 292, "策略参数", 20, 500, C.orange, "middle")}
    ${arrow(840, 530, 620, 530, { color: C.blue, width: 3 })}
    ${text(730, 574, "执行事件", 20, 500, C.blue, "middle")}

    ${box(250, 720, 960, 92, { fill: C.panel, stroke: C.line, radius: 14 })}
    ${text(730, 758, "例：第三次超时后，Foundation 发出 STAGE_RETRY_EXHAUSTED", 21, 500, C.ink, "middle")}
    ${text(730, 790, "Application 再把 BUG-42 转入人工排查", 21, 400, C.muted, "middle")}
  `;
  save("03-policy-mechanism.svg", doc("重试策略与执行机制如何分工", "Application 定义策略，Runtime 执行并报告结果", 1460, 870, body));
}

// 04 Capability reuse
{
  const body = `
    ${box(505, 170, 450, 450, { fill: C.greenSoft, stroke: C.green })}
    ${tag(625, 198, 210, "Capability", C.green, C.panel)}
    ${text(730, 286, "稳定、受控、可评测", 27, 500, C.ink, "middle")}
    ${box(555, 325, 160, 70, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(635, 369, "Skill", 22, 500, C.ink, "middle")}
    ${box(745, 325, 160, 70, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(825, 369, "Tool", 22, 500, C.ink, "middle")}
    ${box(555, 420, 350, 70, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(730, 464, "数据 · 知识 · 检索", 22, 500, C.ink, "middle")}
    ${box(555, 515, 350, 70, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(730, 559, "可选：共享长期记忆", 22, 500, C.ink, "middle")}

    ${box(80, 225, 290, 120, { fill: C.panel, stroke: C.line })}
    ${text(225, 274, "缺陷诊断 Agent", 24, 500, C.ink, "middle")}
    ${text(225, 310, "代码 · 日志 · CRI 查询", 19, 400, C.muted, "middle")}
    ${box(80, 455, 290, 120, { fill: C.panel, stroke: C.line })}
    ${text(225, 504, "风险审查 Agent", 24, 500, C.ink, "middle")}
    ${text(225, 540, "规则 · 补丁 · 测试证据", 19, 400, C.muted, "middle")}

    ${box(1090, 225, 290, 120, { fill: C.panel, stroke: C.line })}
    ${text(1235, 274, "另一个业务流程", 24, 500, C.ink, "middle")}
    ${text(1235, 310, "复用同一能力契约", 19, 400, C.muted, "middle")}
    ${box(1090, 455, 290, 120, { fill: C.panel, stroke: C.line })}
    ${text(1235, 504, "不同 Agent 客户端", 24, 500, C.ink, "middle")}
    ${text(1235, 540, "API、CLI 或 MCP 接入", 19, 400, C.muted, "middle")}

    ${arrow(370, 285, 505, 335, { color: C.green })}
    ${arrow(370, 515, 505, 455, { color: C.green })}
    ${arrow(1090, 285, 955, 335, { color: C.green })}
    ${arrow(1090, 515, 955, 455, { color: C.green })}

    ${box(260, 700, 940, 92, { fill: C.panel, stroke: C.line, radius: 14 })}
    ${text(730, 739, "进入 Capability 的门槛：有真实复用方 + 稳定契约 + 负责人 + 版本 + 权限 + 评测", 21, 500, C.ink, "middle")}
    ${text(730, 773, "只有一个调用方的内部实现，先留在 Application", 20, 400, C.muted, "middle")}
  `;
  save("04-capability-reuse.svg", doc("Capability 的核心是复用", "实现方式不是分层依据，稳定的能力契约才是", 1460, 850, body));
}

// 05 两种 Workflow 的完整推进方式
{
  const body = `
    ${box(60, 160, 1480, 570, { fill: C.purpleSoft, stroke: C.purple })}
    ${tag(95, 185, 170, "目标导向", C.purple, C.panel)}
    ${text(300, 214, "Agentic Workflow：模型根据执行反馈决定下一步", 27, 500)}

    ${box(95, 260, 300, 395, { fill: C.panel, stroke: C.line, radius: 14 })}
    ${text(120, 295, "输入与上下文来源", 21, 500)}
    ${box(120, 320, 250, 60, { fill: C.graySoft, stroke: C.line, radius: 10 })}
    ${text(245, 357, "目标 · 上下文 · 约束", 18, 500, C.ink, "middle")}
    ${box(120, 400, 250, 60, { fill: C.greenSoft, stroke: C.green, radius: 10 })}
    ${text(245, 437, "系统指令 · 已加载 Skill", 18, 500, C.ink, "middle")}
    ${box(120, 480, 250, 60, { fill: C.graySoft, stroke: C.line, radius: 10 })}
    ${text(245, 517, "Run state", 18, 500, C.ink, "middle")}
    ${box(120, 560, 250, 60, { fill: C.graySoft, stroke: C.line, radius: 10 })}
    ${text(245, 587, "Tool · MCP · API · Agent", 17, 500, C.ink, "middle")}
    ${text(245, 610, "能力描述", 16, 400, C.muted, "middle")}
    ${text(245, 642, "Skill 提供方法与约束，不负责调用 Tool", 15, 400, C.muted, "middle")}

    ${arrow(395, 355, 455, 355, { color: C.purple, width: 3 })}
    ${box(455, 305, 230, 100, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${text(570, 345, "Context Assembly", 20, 500, C.ink, "middle")}
    ${text(570, 376, "组装本轮模型上下文", 17, 400, C.muted, "middle")}
    ${arrow(685, 355, 755, 355, { color: C.purple, width: 3 })}
    ${box(755, 305, 220, 100, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${text(865, 345, "模型判断下一步", 21, 500, C.ink, "middle")}
    ${text(865, 376, "Action 或 Final Candidate", 16, 400, C.muted, "middle")}

    ${arrow(975, 345, 1040, 345, { color: C.purple, width: 3 })}
    ${text(1007, 325, "Final", 15, 500, C.purple, "middle")}
    ${box(1040, 285, 190, 140, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${text(1135, 330, "Exit Check", 21, 500, C.ink, "middle")}
    ${lines(1135, 362, ["完成条件", "Schema · 预算 · 策略"], { size: 16, gap: 27, fill: C.muted, anchor: "middle" })}
    ${arrow(1230, 345, 1275, 345, { color: C.purple, width: 3 })}
    ${box(1275, 250, 225, 235, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(1388, 283, "退出结果", 19, 500, C.ink, "middle")}
    ${box(1295, 300, 185, 38, { fill: C.greenSoft, stroke: C.green, radius: 8 })}
    ${text(1388, 325, "Final Result", 16, 500, C.green, "middle")}
    ${box(1295, 348, 185, 38, { fill: C.orangeSoft, stroke: C.orange, radius: 8 })}
    ${text(1388, 373, "Human / Blocked", 16, 500, C.orange, "middle")}
    ${box(1295, 396, 185, 38, { fill: C.redSoft, stroke: C.red, radius: 8 })}
    ${text(1388, 421, "Failed / Cancelled", 16, 500, C.red, "middle")}
    ${box(1295, 444, 185, 28, { fill: C.purpleSoft, stroke: C.purple, radius: 8 })}
    ${text(1388, 464, "反馈后继续", 14, 500, C.purple, "middle")}

    ${polyArrow([[865, 405], [865, 500]], { color: C.purple, width: 3 })}
    ${text(895, 462, "Action", 15, 500, C.purple)}
    ${box(755, 500, 220, 80, { fill: C.purpleSoft, stroke: C.purple, radius: 12 })}
    ${text(865, 534, "产生结构化 Action", 18, 500, C.ink, "middle")}
    ${text(865, 560, "选择可调用对象与参数", 15, 400, C.muted, "middle")}
    ${arrow(975, 540, 1040, 540, { color: C.purple, width: 3 })}
    ${box(1040, 500, 440, 100, { fill: C.greenSoft, stroke: C.green, radius: 12 })}
    ${text(1260, 540, "执行 Tool · MCP · API · 其他 Agent", 20, 500, C.ink, "middle")}
    ${text(1260, 572, "Harness 执行动作并返回 Observation", 16, 400, C.muted, "middle")}

    ${box(455, 610, 230, 90, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${text(570, 646, "更新上下文与 Run state", 18, 500, C.ink, "middle")}
    ${text(570, 675, "保存结果、证据和错误", 15, 400, C.muted, "middle")}
    ${polyArrow([[1260, 600], [1260, 655], [685, 655]], { color: C.green, width: 2.5 })}
    ${polyArrow([[570, 610], [570, 455], [805, 455], [805, 405]], { color: C.purple, width: 2.5, dashed: true })}
    ${text(685, 445, "下一轮", 15, 500, C.purple, "middle")}
    ${polyArrow([[1295, 458], [1245, 458], [1245, 445], [925, 445], [925, 405]], { color: C.purple, width: 2, dashed: true })}

    ${box(190, 765, 1220, 105, { fill: C.panel, stroke: C.line, radius: 14 })}
    ${tag(220, 797, 130, "组合关系", C.graySoft, C.ink)}
    ${text(385, 824, "Business Stage → Agentic Executor → 使用上方执行闭环", 18, 500)}
    ${text(930, 824, "Agentic Workflow → Tool / API → 发起或查询下方 Workflow", 18, 500)}
    ${text(800, 855, "可以相互调用，但不存在固定的外层、内层关系", 16, 400, C.muted, "middle")}

    ${box(60, 905, 1480, 600, { fill: C.orangeSoft, stroke: C.orange })}
    ${tag(95, 930, 170, "流程导向", C.orange, C.panel)}
    ${text(300, 959, "Business Workflow：流程定义与 Instance state 决定下一步", 27, 500)}

    ${box(95, 1015, 150, 85, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(170, 1050, "Trigger", 20, 500, C.ink, "middle")}
    ${text(170, 1078, "事件或业务输入", 15, 400, C.muted, "middle")}
    ${arrow(245, 1058, 300, 1058, { color: C.orange, width: 3 })}
    ${box(300, 1005, 230, 105, { fill: C.panel, stroke: C.orange, radius: 12 })}
    ${text(415, 1044, "创建或恢复", 20, 500, C.ink, "middle")}
    ${text(415, 1074, "Workflow Instance", 17, 400, C.muted, "middle")}
    ${arrow(530, 1058, 590, 1058, { color: C.orange, width: 3 })}
    ${box(590, 1005, 220, 105, { fill: C.panel, stroke: C.orange, radius: 12 })}
    ${text(700, 1044, "计算 Ready Stage(s)", 19, 500, C.ink, "middle")}
    ${text(700, 1074, "可顺序，也可并行", 16, 400, C.muted, "middle")}
    ${arrow(810, 1058, 870, 1058, { color: C.orange, width: 3 })}

    ${box(870, 985, 580, 170, { fill: C.panel, stroke: C.orange, radius: 14 })}
    ${text(900, 1022, "调用当前 Stage 的 Executor", 20, 500)}
    ${box(900, 1045, 100, 44, { fill: C.graySoft, stroke: C.line, radius: 8 })}
    ${text(950, 1074, "Code", 16, 500, C.ink, "middle")}
    ${box(1020, 1045, 150, 44, { fill: C.graySoft, stroke: C.line, radius: 8 })}
    ${text(1095, 1074, "Tool / Service", 16, 500, C.ink, "middle")}
    ${box(900, 1100, 190, 42, { fill: C.purpleSoft, stroke: C.purple, radius: 8 })}
    ${text(995, 1128, "Agentic Executor", 16, 500, C.purple, "middle")}
    ${box(1110, 1100, 150, 42, { fill: C.orangeSoft, stroke: C.orange, radius: 8 })}
    ${text(1185, 1128, "Human Task", 16, 500, C.orange, "middle")}
    ${text(1355, 1075, "同一 Stage 契约", 15, 400, C.muted, "middle")}

    ${polyArrow([[1315, 1155], [1315, 1195]], { color: C.orange, width: 3 })}
    ${box(1195, 1195, 255, 110, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(1323, 1234, "统一 StageResult", 20, 500, C.ink, "middle")}
    ${text(1323, 1264, "status · output · evidence", 15, 400, C.muted, "middle")}
    ${text(1323, 1287, "artifacts · error", 15, 400, C.muted, "middle")}
    ${arrow(1195, 1250, 1135, 1250, { color: C.orange, width: 3 })}
    ${box(905, 1195, 230, 110, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(1020, 1234, "持久化 Instance state", 19, 500, C.ink, "middle")}
    ${text(1020, 1264, "当前 Stage · 等待 · 结果", 15, 400, C.muted, "middle")}
    ${text(1020, 1287, "分支与完成状态", 15, 400, C.muted, "middle")}
    ${arrow(905, 1250, 845, 1250, { color: C.orange, width: 3 })}
    ${box(615, 1195, 230, 110, { fill: C.panel, stroke: C.red, radius: 12 })}
    ${text(730, 1234, "Gate / Transition", 20, 500, C.red, "middle")}
    ${text(730, 1264, "校验结果并解析状态迁移", 15, 400, C.muted, "middle")}
    ${text(730, 1287, "由流程定义决定去向", 15, 400, C.muted, "middle")}
    ${arrow(615, 1250, 565, 1250, { color: C.orange, width: 3 })}

    ${box(95, 1175, 470, 245, { fill: C.panel, stroke: C.orange, radius: 14 })}
    ${text(125, 1212, "Transition 结果", 19, 500)}
    ${tag(125, 1235, 125, "Next", C.graySoft, C.ink)}
    ${tag(265, 1235, 125, "Branch", C.graySoft, C.ink)}
    ${tag(405, 1235, 125, "Parallel / Join", C.graySoft, C.ink)}
    ${tag(125, 1290, 125, "Wait / Resume", C.graySoft, C.ink)}
    ${tag(265, 1290, 125, "Loop / Comp.", C.graySoft, C.ink)}
    ${tag(405, 1290, 125, "Complete", C.greenSoft, C.green)}
    ${text(330, 1372, "Next · Branch · Parallel / Join · Wait / Resume", 15, 400, C.muted, "middle")}
    ${text(330, 1396, "Loop / Compensation · Complete / Terminate", 15, 400, C.muted, "middle")}

    ${polyArrow([[330, 1175], [330, 1145], [700, 1145], [700, 1110]], { color: C.orange, width: 2.5, dashed: true })}
    ${text(500, 1135, "未结束：重新计算 Ready Stage(s)", 15, 500, C.orange, "middle")}
    ${box(610, 1445, 760, 38, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(990, 1471, "Orchestrator 按流程定义和 Instance state 持续推进，直到完成、终止或等待", 17, 500, C.ink, "middle")}
  `;
  save("05-two-workflow-modes.svg", doc("两种 Workflow 的完整推进方式", "Agentic Workflow 由模型结合反馈推进，Business Workflow 由流程定义和状态迁移推进", 1600, 1560, body));
}


// 05b Orchestrator、Gate 与 Supervisor 控制权
{
  const body = `
    ${box(60, 165, 760, 750, { fill: C.orangeSoft, stroke: C.orange })}
    ${tag(95, 190, 210, "Business Orchestrator", C.orange, C.panel)}
    ${text(95, 258, "规则控制：Gate 负责判断，Orchestrator 决定去向", 25, 500)}

    ${box(100, 295, 260, 90, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(230, 330, "当前 Stage 的执行者", 20, 500, C.ink, "middle")}
    ${text(230, 360, "完成任务并提交产物", 16, 400, C.muted, "middle")}
    ${arrow(360, 340, 435, 340, { color: C.orange, width: 3 })}
    ${box(435, 295, 300, 90, { fill: C.panel, stroke: C.orange, radius: 12 })}
    ${text(585, 330, "阶段产物", 21, 500, C.ink, "middle")}
    ${text(585, 360, "报告 · 补丁 · 测试结果 · 证据", 16, 400, C.muted, "middle")}

    ${text(95, 432, "Orchestrator 调用当前 Stage 配置的门禁", 18, 500, C.orange)}
    ${polyArrow([[585, 385], [585, 455], [240, 455], [240, 485]], { color: C.orange, width: 2.5 })}
    ${polyArrow([[585, 385], [585, 485]], { color: C.orange, width: 2.5 })}
    ${box(100, 485, 280, 125, { fill: C.panel, stroke: C.blue, radius: 12 })}
    ${tag(125, 505, 130, "确定性 Gate", C.blue, C.panel)}
    ${text(125, 565, "用规则检查数值、状态和审批", 17, 500)}
    ${text(125, 592, "返回：通过 / 不通过 + 原因", 16, 400, C.muted)}
    ${box(435, 485, 300, 125, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${tag(460, 505, 110, "AI Gate", C.purple, C.panel)}
    ${text(460, 565, "模型审查方案、代码或报告", 17, 500)}
    ${text(460, 592, "返回：建议 + 评分 + 引用证据", 16, 400, C.muted)}

    ${polyArrow([[240, 610], [240, 650], [420, 650], [420, 675]], { color: C.blue, width: 2.5 })}
    ${polyArrow([[585, 610], [585, 650], [420, 650], [420, 675]], { color: C.purple, width: 2.5 })}
    ${box(265, 675, 310, 82, { fill: C.panel, stroke: C.red, radius: 12 })}
    ${text(420, 708, "统一门禁结果", 20, 500, C.red, "middle")}
    ${text(420, 737, "通过 · 不通过 · 人工复核，并说明依据", 16, 400, C.muted, "middle")}
    ${arrow(420, 757, 420, 790, { color: C.orange, width: 3 })}
    ${box(265, 790, 310, 72, { fill: C.panel, stroke: C.orange, radius: 12 })}
    ${text(420, 820, "Orchestrator 查固定规则映射", 19, 500, C.ink, "middle")}
    ${text(420, 846, "门禁结果 → 对应的下一阶段", 16, 400, C.muted, "middle")}
    ${polyArrow([[265, 826], [205, 826], [205, 875]], { color: C.orange, width: 2.5 })}
    ${polyArrow([[420, 862], [420, 875]], { color: C.orange, width: 2.5 })}
    ${polyArrow([[575, 826], [635, 826], [635, 875]], { color: C.orange, width: 2.5 })}
    ${tag(115, 872, 180, "继续下一阶段", C.greenSoft, C.green)}
    ${tag(330, 872, 180, "回到修改阶段", C.redSoft, C.red)}
    ${tag(545, 872, 180, "转人工复核", C.orangeSoft, C.orange)}

    ${box(850, 165, 690, 750, { fill: C.purpleSoft, stroke: C.purple })}
    ${tag(885, 190, 160, "Supervisor", C.purple, C.panel)}
    ${text(885, 258, "模型控制：模型反复选择下一执行者或下一动作", 25, 500)}

    ${box(890, 295, 250, 105, { fill: C.panel, stroke: C.line, radius: 12 })}
    ${text(1015, 330, "任务目标与当前证据", 19, 500, C.ink, "middle")}
    ${text(1015, 360, "已完成工作 · 可用 Agent · 允许动作", 15, 400, C.muted, "middle")}
    ${arrow(1140, 348, 1210, 348, { color: C.purple, width: 3 })}
    ${box(1210, 295, 280, 105, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${text(1350, 330, "Supervisor 模型", 21, 500, C.ink, "middle")}
    ${text(1350, 360, "根据上下文决定下一步", 16, 400, C.muted, "middle")}

    ${polyArrow([[1350, 400], [1350, 455], [1190, 455], [1190, 485]], { color: C.purple, width: 3 })}
    ${box(1035, 485, 310, 90, { fill: C.panel, stroke: C.purple, radius: 12 })}
    ${text(1190, 520, "选择下一项动作", 20, 500, C.ink, "middle")}
    ${text(1190, 550, "调用 Agent / Tool · 选择阶段 · 结束", 16, 400, C.muted, "middle")}

    ${polyArrow([[1190, 575], [1190, 610], [975, 610], [975, 635]], { color: C.purple, width: 2.5 })}
    ${polyArrow([[1190, 575], [1190, 635]], { color: C.purple, width: 2.5 })}
    ${polyArrow([[1190, 575], [1190, 610], [1405, 610], [1405, 635]], { color: C.purple, width: 2.5 })}
    ${box(885, 635, 180, 70, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(975, 677, "专业 Agent A", 18, 500, C.ink, "middle")}
    ${box(1100, 635, 180, 70, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(1190, 677, "专业 Agent B", 18, 500, C.ink, "middle")}
    ${box(1315, 635, 180, 70, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(1405, 677, "专业 Agent C", 18, 500, C.ink, "middle")}

    ${polyArrow([[1190, 705], [1190, 750]], { color: C.green, width: 3 })}
    ${box(1065, 750, 250, 80, { fill: C.panel, stroke: C.green, radius: 12 })}
    ${text(1190, 782, "读取执行结果并更新上下文", 18, 500, C.ink, "middle")}
    ${text(1190, 808, "继续判断，或者结束并汇总", 15, 400, C.muted, "middle")}
    ${polyArrow([[1065, 790], [870, 790], [870, 430], [1350, 430], [1350, 400]], { color: C.purple, width: 2.5, dashed: true })}
    ${text(915, 775, "下一轮", 15, 500, C.purple, "middle")}
    ${polyArrow([[1345, 530], [1510, 530], [1510, 790], [1495, 790]], { color: C.green, width: 2.5 })}
    ${tag(1325, 770, 170, "结束并汇总", C.greenSoft, C.green)}
    ${text(885, 890, "具体调用顺序运行时生成；权限边界和高风险 Gate 仍由系统限制", 16, 400, C.muted)}

    ${box(60, 955, 1480, 180, { fill: C.panel, stroke: C.line, radius: 14 })}
    ${tag(90, 980, 145, "不要混淆", C.graySoft, C.ink)}
    ${box(265, 980, 500, 120, { fill: C.blueSoft, stroke: C.blue, radius: 12 })}
    ${text(515, 1015, "Model Router：只做一次分类和分发", 20, 500, C.blue, "middle")}
    ${text(515, 1048, "请求 → 模型判断类别 → 代码映射预设目标", 17, 500, C.ink, "middle")}
    ${text(515, 1078, "任务交出后，Router 不再持续调度", 16, 400, C.muted, "middle")}
    ${box(795, 980, 715, 120, { fill: C.graySoft, stroke: C.line, radius: 12 })}
    ${text(825, 1017, "AI Gate", 18, 500, C.purple)}
    ${text(955, 1017, "模型判断当前产物 → 规则映射下一阶段 → Orchestrator 控制", 17, 500)}
    ${text(825, 1062, "Supervisor", 18, 500, C.purple)}
    ${text(955, 1062, "模型选择下一动作 → 读取结果 → 再选择 → 模型持续控制", 17, 500)}
    ${text(1150, 1120, "有分支、有循环，不代表必须使用 Supervisor", 18, 500, C.ink, "middle")}
  `;
  save("05-control-patterns.svg", doc("Orchestrator、Gate 与 Supervisor：谁决定下一步", "AI Gate 可以使用模型，但只要下一阶段由规则映射，控制权仍在 Orchestrator", 1600, 1180, body));
}


// 06 Stage Adapter 接入
{
  const body = `
    ${box(55, 195, 300, 350, { fill: C.orangeSoft, stroke: C.orange })}
    ${tag(85, 222, 170, "Business Workflow", C.orange, C.panel)}
    ${text(85, 300, "当前 Agent Stage", 26, 500)}
    ${lines(85, 350, ["StageSpec", "任务目标与输入", "指定 provider", "Skill / Tool / MCP", "工作区、权限、超时"], { size: 19, gap: 42 })}

    ${arrow(355, 360, 425, 360, { color: C.orange, width: 3 })}
    ${box(425, 195, 355, 170, { fill: C.blueSoft, stroke: C.blue })}
    ${tag(460, 222, 280, "AgentStageExecutor", C.blue, C.panel)}
    ${text(602, 300, "Workflow 的唯一调用入口", 21, 500, C.ink, "middle")}
    ${text(602, 334, "run(stage, signal)", 18, 400, C.muted, "middle")}

    ${arrow(602, 365, 602, 420, { color: C.blue })}
    ${box(425, 420, 355, 230, { fill: C.panel, stroke: C.blue })}
    ${text(602, 464, "Adapter 注册表", 23, 500, C.blue, "middle")}
    ${box(458, 492, 289, 42, { fill: C.blueSoft, stroke: C.line, radius: 8 })}
    ${text(602, 519, "codex → CodexStageAdapter", 16, 500, C.ink, "middle")}
    ${box(458, 544, 289, 42, { fill: C.blueSoft, stroke: C.line, radius: 8 })}
    ${text(602, 571, "claude-code → ClaudeCodeStageAdapter", 15, 500, C.ink, "middle")}
    ${box(458, 596, 289, 42, { fill: C.blueSoft, stroke: C.line, radius: 8 })}
    ${text(602, 623, "trae-agent → TraeAgentStageAdapter", 15, 500, C.ink, "middle")}

    ${box(425, 685, 355, 120, { fill: C.greenSoft, stroke: C.green })}
    ${text(602, 726, "StageAgentAdapter", 22, 500, C.green, "middle")}
    ${text(602, 761, "接口契约：规定 run 的输入和返回", 18, 400, C.ink, "middle")}
    ${text(602, 788, "它本身不调用任何 Agent", 17, 500, C.green, "middle")}

    ${text(845, 173, "具体 Adapter：实现接口、执行调用、转换结果", 20, 500, C.muted)}
    ${arrow(780, 505, 845, 280, { color: C.blue })}
    ${arrow(780, 525, 845, 500, { color: C.blue })}
    ${arrow(780, 545, 845, 720, { color: C.blue })}

    ${box(845, 195, 315, 170, { fill: C.blueSoft, stroke: C.blue })}
    ${text(1002, 238, "CodexStageAdapter", 22, 500, C.ink, "middle")}
    ${text(1002, 276, "implements StageAgentAdapter", 16, 400, C.blue, "middle")}
    ${text(1002, 314, "调用 SDK → 转成 StageResult", 17, 500, C.ink, "middle")}
    ${arrow(1160, 280, 1225, 280, { color: C.blue })}
    ${box(1225, 215, 310, 130, { fill: C.panel, stroke: C.line })}
    ${text(1380, 264, "Codex SDK", 23, 500, C.ink, "middle")}
    ${text(1380, 303, "thread.run(stagePrompt)", 17, 400, C.muted, "middle")}

    ${box(845, 415, 315, 170, { fill: C.blueSoft, stroke: C.blue })}
    ${text(1002, 458, "ClaudeCodeStageAdapter", 21, 500, C.ink, "middle")}
    ${text(1002, 496, "implements StageAgentAdapter", 16, 400, C.blue, "middle")}
    ${text(1002, 534, "启动 CLI → 转成 StageResult", 17, 500, C.ink, "middle")}
    ${arrow(1160, 500, 1225, 500, { color: C.blue })}
    ${box(1225, 435, 310, 130, { fill: C.panel, stroke: C.line })}
    ${text(1380, 484, "Claude Code CLI", 23, 500, C.ink, "middle")}
    ${text(1380, 523, "claude -p ... --output-format json", 15, 400, C.muted, "middle")}

    ${box(845, 635, 315, 170, { fill: C.blueSoft, stroke: C.blue })}
    ${text(1002, 678, "TraeAgentStageAdapter", 21, 500, C.ink, "middle")}
    ${text(1002, 716, "implements StageAgentAdapter", 16, 400, C.blue, "middle")}
    ${text(1002, 754, "启动 CLI → 转成 StageResult", 17, 500, C.ink, "middle")}
    ${arrow(1160, 720, 1225, 720, { color: C.blue })}
    ${box(1225, 655, 310, 130, { fill: C.panel, stroke: C.line })}
    ${text(1380, 704, "Trae Agent CLI", 23, 500, C.ink, "middle")}
    ${text(1380, 743, "trae-cli run ...", 17, 400, C.muted, "middle")}

    ${text(1002, 838, "任一具体 Adapter 的 run 都统一返回", 17, 500, C.green, "middle")}
    ${arrow(1002, 848, 1002, 875, { color: C.green, width: 2 })}
    ${box(790, 875, 425, 110, { fill: C.greenSoft, stroke: C.green })}
    ${text(1002, 919, "统一 StageResult", 23, 500, C.green, "middle")}
    ${text(1002, 955, "状态、产物、证据、统一错误", 18, 400, C.ink, "middle")}

    ${arrow(1215, 930, 1270, 930, { color: C.green })}
    ${box(1270, 875, 130, 110, { fill: C.redSoft, stroke: C.red })}
    ${text(1335, 919, "Gate", 23, 500, C.red, "middle")}
    ${text(1335, 955, "检查结果", 17, 400, C.ink, "middle")}
    ${arrow(1400, 930, 1440, 930, { color: C.red })}
    ${box(1440, 875, 115, 110, { fill: C.orangeSoft, stroke: C.orange })}
    ${text(1497, 919, "编排器", 21, 500, C.orange, "middle")}
    ${text(1497, 955, "映射下一阶段", 15, 400, C.ink, "middle")}
  `;
  save("06-stage-agent-adapter.svg", doc("一次 Agent Stage 的真实调用链", "接口只定义契约；执行器通过注册表找到具体 Adapter，具体 Adapter 才调用 Agent 产品", 1600, 1030, body));
}

// 07 BUG-42 完整执行
{
  const body = `
    ${tag(65, 165, 170, "Application", C.orange, C.panel)}
    ${text(255, 193, "Business Workflow：Stage、分支、回流和人工责任", 23, 500, C.orange)}
    ${box(60, 220, 1360, 245, { fill: C.orangeSoft, stroke: C.orange })}

    ${box(85, 285, 150, 90, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(160, 322, "收集上下文", 18, 500, C.ink, "middle")}
    ${text(160, 351, "普通代码", 16, 400, C.muted, "middle")}
    ${arrow(235, 330, 265, 330, { color: C.orange })}
    ${box(265, 285, 150, 90, { fill: C.greenSoft, stroke: C.green, radius: 10 })}
    ${text(340, 322, "定位根因", 18, 500, C.ink, "middle")}
    ${text(340, 351, "Agent + Skill A", 16, 400, C.muted, "middle")}
    ${arrow(415, 330, 445, 330, { color: C.orange })}
    ${box(445, 285, 150, 90, { fill: C.greenSoft, stroke: C.green, radius: 10 })}
    ${text(520, 322, "修改代码", 18, 500, C.ink, "middle")}
    ${text(520, 351, "同一 Agent + Skill B", 15, 400, C.muted, "middle")}
    ${arrow(595, 330, 625, 330, { color: C.orange })}
    ${box(625, 285, 150, 90, { fill: C.panel, stroke: C.red, radius: 10 })}
    ${text(700, 322, "独立测试", 18, 500, C.ink, "middle")}
    ${text(700, 351, "Test Gate", 16, 400, C.red, "middle")}
    ${arrow(775, 330, 805, 330, { color: C.orange })}
    ${box(805, 285, 150, 90, { fill: C.greenSoft, stroke: C.green, radius: 10 })}
    ${text(880, 322, "风险审查", 18, 500, C.ink, "middle")}
    ${text(880, 351, "独立只读 Agent", 16, 400, C.muted, "middle")}
    ${arrow(955, 330, 985, 330, { color: C.orange })}
    ${box(985, 285, 150, 90, { fill: C.redSoft, stroke: C.red, radius: 10 })}
    ${text(1060, 322, "人工审批", 18, 500, C.ink, "middle")}
    ${text(1060, 351, "Human Gate", 16, 400, C.red, "middle")}
    ${arrow(1135, 330, 1165, 330, { color: C.orange })}
    ${box(1165, 285, 150, 90, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(1240, 322, "发布", 18, 500, C.ink, "middle")}
    ${text(1240, 351, "Release Tool", 16, 400, C.muted, "middle")}

    ${polyArrow([[700, 375], [700, 425], [520, 425], [520, 375]], { color: C.red, width: 2.5, dashed: true })}
    ${text(610, 450, "测试失败：repairRound + 1，回到修改", 17, 500, C.red, "middle")}

    ${tag(65, 515, 160, "Capability", C.green, C.panel)}
    ${text(245, 543, "各 Stage 读取本阶段需要的可复用能力", 23, 500, C.green)}
    ${box(60, 570, 1360, 135, { fill: C.greenSoft, stroke: C.green })}
    ${box(100, 608, 245, 60, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(223, 646, "根因分析 Skill", 18, 500, C.ink, "middle")}
    ${box(380, 608, 245, 60, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(503, 646, "安全改码 Skill", 18, 500, C.ink, "middle")}
    ${box(660, 608, 245, 60, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(783, 646, "代码 / 日志 / CRI Tool", 18, 500, C.ink, "middle")}
    ${box(940, 608, 245, 60, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(1063, 646, "风险审查 Skill", 18, 500, C.ink, "middle")}
    ${tag(1220, 618, 150, "MCP 可接入", C.panel, C.green)}

    ${tag(65, 755, 170, "Foundation", C.blue, C.panel)}
    ${text(255, 783, "Runtime 执行每次 Run；Harness 提供 Agent 工作外壳", 23, 500, C.blue)}
    ${box(60, 810, 1360, 155, { fill: C.blueSoft, stroke: C.blue })}
    ${box(100, 850, 260, 74, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(230, 882, "Run identity 与状态", 18, 500, C.ink, "middle")}
    ${text(230, 907, "instance / stage / attempt", 16, 400, C.muted, "middle")}
    ${box(395, 850, 260, 74, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(525, 882, "隔离工作区与权限", 18, 500, C.ink, "middle")}
    ${text(525, 907, "read-only / workspace-write", 15, 400, C.muted, "middle")}
    ${box(690, 850, 260, 74, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(820, 882, "Checkpoint 与产物", 18, 500, C.ink, "middle")}
    ${text(820, 907, "报告 / 补丁 / 测试证据", 16, 400, C.muted, "middle")}
    ${box(985, 850, 355, 74, { fill: C.panel, stroke: C.line, radius: 10 })}
    ${text(1163, 882, "超时、取消与技术重试", 18, 500, C.ink, "middle")}
    ${text(1163, 907, "PROVIDER_TIMEOUT → attempt + 1", 16, 400, C.muted, "middle")}

    ${polyArrow([[340, 375], [340, 500], [1370, 500], [1370, 887], [1340, 887]], { color: C.blue, dashed: true })}
    ${text(1125, 490, "模型超时：Runtime 按策略重新调度当前 Stage", 17, 500, C.blue, "middle")}
  `;
  save("07-bug42-execution.svg", doc("BUG-42：Application、Capability 与 Foundation 怎样配合", "业务流程决定去向，能力层提供复用能力，Foundation 负责可靠执行", 1480, 1010, body));
}

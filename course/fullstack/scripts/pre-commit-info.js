const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PROJECT_AREAS = [
  { pattern: /apps\/react-demo/, label: "React 前端" },
  { pattern: /apps\/vue-demo/, label: "Vue 前端" },
  { pattern: /servers\/fastapi-server/, label: "FastAPI 后端" },
  { pattern: /servers\/nest-server/, label: "NestJS 后端" },
  { pattern: /servers\/spring-server/, label: "Spring Boot 后端" },
  { pattern: /docker/, label: "Docker 部署" },
  { pattern: /scripts/, label: "工程脚本" },
];

const INTENT_RULES = [
  {
    pattern: /package\.json|pnpm-lock\.yaml|pom\.xml|pyproject\.toml|uv\.lock|requirements\.txt/,
    intent: "依赖变更",
  },
  { pattern: /\.css$|\.scss$|\.less$|\.style\.ts$/, intent: "样式调整" },
  { pattern: /\.test\.|\.spec\.|__tests__/, intent: "测试用例" },
  { pattern: /\.md$|README/, intent: "文档更新" },
  { pattern: /Dockerfile|docker-compose|\.yml$|\.yaml$/, intent: "部署配置" },
  { pattern: /\.env|\.config\.|tsconfig|vite\.config|eslint|prettier/, intent: "工程配置" },
  { pattern: /\.sql$|migration|schema/, intent: "数据库变更" },
  { pattern: /route|controller|api|endpoint/, intent: "接口变更" },
  { pattern: /component|page|view|widget/, intent: "UI 组件" },
  { pattern: /service|repository|model|entity|store|hook/, intent: "业务逻辑" },
  { pattern: /util|helper|common|shared|lib/, intent: "工具/公共模块" },
];

const CHANGE_TYPE_LABELS = {
  A: "新增",
  M: "修改",
  D: "删除",
  R: "重命名",
  C: "复制",
  T: "类型变更",
};

function runGit(cmd) {
  try {
    return execSync(`git ${cmd}`, { encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }).trim();
  } catch {
    return "";
  }
}

function getRepoRoot() {
  return runGit("rev-parse --show-toplevel");
}

function gitignorePatternToRegex(pattern, baseDir) {
  let p = pattern;

  const isNegation = p.startsWith("!");
  if (isNegation) p = p.substring(1);

  const isDirOnly = p.endsWith("/");
  if (isDirOnly) p = p.slice(0, -1);

  if (p.startsWith("/")) {
    p = p.substring(1);
  } else {
    p = "(?:.+/)?" + p;
  }

  p = p.replace(/\*\*/g, "§§DOUBLESTAR§§");
  p = p.replace(/\*/g, "[^/]*");
  p = p.replace(/§§DOUBLESTAR§§/g, ".*");
  p = p.replace(/\?/g, "[^/]");

  if (isDirOnly) {
    p = p + "/.*";
  } else {
    p = p + "(?:/.*)?";
  }

  const prefix = baseDir ? baseDir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "/" : "";
  const regexStr = "^" + prefix + p + "$";
  try {
    return { regex: new RegExp(regexStr), negation: isNegation };
  } catch {
    return null;
  }
}

function loadGitignoreRules(repoRoot) {
  const rules = [];
  const gitignoreFiles = [];

  function walkDir(dir) {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name === ".git") continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.name === ".gitignore") {
        gitignoreFiles.push(fullPath);
      } else if (entry.isDirectory()) {
        const rel = path.relative(repoRoot, fullPath);
        if (isIgnoredByRules(rel + "/", rules)) continue;
        walkDir(fullPath);
      }
    }
  }

  walkDir(repoRoot);

  for (const gitignorePath of gitignoreFiles) {
    const baseDir = path.relative(repoRoot, path.dirname(gitignorePath));
    let content;
    try {
      content = fs.readFileSync(gitignorePath, "utf-8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    for (let line of lines) {
      line = line.trim();
      if (!line || line.startsWith("#")) continue;
      const rule = gitignorePatternToRegex(line, baseDir);
      if (rule) rules.push(rule);
    }
  }

  return rules;
}

function isIgnoredByRules(filePath, rules) {
  let ignored = false;
  for (const rule of rules) {
    if (rule.regex.test(filePath)) {
      ignored = !rule.negation;
    }
  }
  return ignored;
}

function filterIgnoredFiles(files, rules) {
  return files.filter((f) => !isIgnoredByRules(f.file, rules));
}

const BUILTIN_IGNORE_PATTERNS = [
  { regex: /^(?:.*\/)?node_modules(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?\.DS_Store(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?dist(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?build(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?target(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?\.venv(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?__pycache__(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?\.idea(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?\.vscode(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?\.mvn(?:\/.*)?$/, negation: false },
  { regex: /^(?:.*\/)?\.mvn-home(?:\/.*)?$/, negation: false },
];

function getStashList() {
  const output = runGit("stash list");
  if (!output) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(stash@\{\d+\}):\s*(.+)/);
      if (!match) return null;
      return { ref: match[1], message: match[2] };
    })
    .filter(Boolean);
}

function getStashDiff(stashRef) {
  const output = runGit(`stash show --stat --name-status ${stashRef}`);
  if (!output) return [];
  const lines = output.split("\n").filter(Boolean);
  const files = [];
  for (const line of lines) {
    const match = line.match(/^([ACDMRT])\s+(.+)$/);
    if (match) {
      files.push({ status: match[1], file: match[2] });
    }
  }
  return files;
}

function getStashDiffStat(stashRef, totalFiles, totalInsertions, totalDeletions) {
  const parts = [];
  if (totalFiles > 0) parts.push(`${totalFiles} file${totalFiles > 1 ? "s" : ""} changed`);
  if (totalInsertions > 0) parts.push(`${totalInsertions} insertion(+)`);
  if (totalDeletions > 0) parts.push(`${totalDeletions} deletion(-)`);
  return parts.join(", ") || "无统计";
}

function getStashDiffStats(stashRef) {
  const output = runGit(`stash show --numstat ${stashRef}`);
  if (!output) return { totalFiles: 0, totalInsertions: 0, totalDeletions: 0 };
  let totalFiles = 0;
  let totalInsertions = 0;
  let totalDeletions = 0;
  const lines = output.split("\n").filter(Boolean);
  for (const line of lines) {
    const parts = line.split(/\s+/);
    if (parts.length >= 3) {
      totalFiles++;
      const add = parts[0] === "-" ? 0 : parseInt(parts[0], 10) || 0;
      const del = parts[1] === "-" ? 0 : parseInt(parts[1], 10) || 0;
      totalInsertions += add;
      totalDeletions += del;
    }
  }
  return { totalFiles, totalInsertions, totalDeletions };
}

function inferArea(filePath) {
  for (const area of PROJECT_AREAS) {
    if (area.pattern.test(filePath)) return area.label;
  }
  return "项目根目录";
}

function inferIntent(file, status) {
  for (const rule of INTENT_RULES) {
    if (rule.pattern.test(file)) return rule.intent;
  }
  if (status === "A") return "新增文件";
  if (status === "D") return "移除文件";
  return "功能迭代";
}

function groupBy(files, keyFn) {
  const map = new Map();
  for (const f of files) {
    const key = keyFn(f);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(f);
  }
  return map;
}

function formatStashSummary(stash, index, ignoreRules) {
  const allFiles = getStashDiff(stash.ref);
  const stats = getStashDiffStats(stash.ref);
  const files = filterIgnoredFiles(allFiles, ignoreRules);
  const filteredCount = allFiles.length - files.length;

  if (files.length === 0) {
    let msg = `\n── Stash #${index + 1} ──────────────────────────\n`;
    msg += `  引用: ${stash.ref}\n`;
    msg += `  消息: ${stash.message}\n`;
    if (filteredCount > 0) {
      msg += `  ⚠ 所有变更文件均被 .gitignore 过滤 (${filteredCount} 个文件)\n`;
    } else {
      msg += `  ⚠ 无法解析变更文件\n`;
    }
    return msg;
  }

  const statLine = getStashDiffStat(stash.ref, files.length, stats.totalInsertions, stats.totalDeletions);
  const byArea = groupBy(files, (f) => inferArea(f.file));
  let output = "";
  output += `\n── Stash #${index + 1} ──────────────────────────\n`;
  output += `  引用: ${stash.ref}\n`;
  output += `  消息: ${stash.message}\n`;
  output += `  统计: ${statLine}\n`;
  if (filteredCount > 0) {
    output += `  🚫 已过滤 ${filteredCount} 个被 .gitignore 忽略的文件\n`;
  }

  const allIntents = new Set();
  for (const [area, areaFiles] of byArea) {
    output += `\n  📁 ${area}\n`;
    for (const f of areaFiles) {
      const typeLabel = CHANGE_TYPE_LABELS[f.status] || f.status;
      const intent = inferIntent(f.file, f.status);
      allIntents.add(intent);
      output += `    [${typeLabel}] ${f.file}  → ${intent}\n`;
    }
  }

  output += `\n  🏷 修改意图: ${[...allIntents].join("、")}\n`;

  return output;
}

function getWorkingTreeChanges() {
  const output = runGit("status --porcelain");
  if (!output) return [];
  return output
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const status = line.substring(0, 2).trim();
      const file = line.substring(3);
      return { status: status.charAt(0) || "M", file };
    });
}

function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║       Pre-Commit Stash 变更梳理报告          ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  const repoRoot = getRepoRoot();
  let ignoreRules = [...BUILTIN_IGNORE_PATTERNS];

  if (repoRoot) {
    const gitignoreRules = loadGitignoreRules(repoRoot);
    ignoreRules = [...ignoreRules, ...gitignoreRules];
    console.log(`  📂 仓库根目录: ${repoRoot}`);
    console.log(`  🔧 已加载 ${gitignoreRules.length} 条 .gitignore 规则 + ${BUILTIN_IGNORE_PATTERNS.length} 条内置规则\n`);
  } else {
    console.log(`  ⚠️  未检测到 Git 仓库，仅使用内置忽略规则\n`);
  }

  const stashList = getStashList();

  if (stashList.length === 0) {
    console.log("  ℹ️  当前没有 stash 记录\n");
  } else {
    console.log(`  📦 共发现 ${stashList.length} 条 stash 记录\n`);
    for (let i = 0; i < stashList.length; i++) {
      console.log(formatStashSummary(stashList[i], i, ignoreRules));
    }
  }

  console.log("── 工作区未暂存变更 ──────────────────────────\n");
  const allWorkingChanges = getWorkingTreeChanges();
  const workingChanges = filterIgnoredFiles(allWorkingChanges, ignoreRules);
  const filteredWorkingCount = allWorkingChanges.length - workingChanges.length;

  if (allWorkingChanges.length === 0) {
    console.log("  ✅ 工作区干净，无未暂存变更\n");
  } else if (workingChanges.length === 0) {
    console.log(`  ✅ 工作区有 ${allWorkingChanges.length} 个变更，但全部被 .gitignore 过滤\n`);
  } else {
    if (filteredWorkingCount > 0) {
      console.log(`  🚫 已过滤 ${filteredWorkingCount} 个被 .gitignore 忽略的文件\n`);
    }
    const byArea = groupBy(workingChanges, (f) => inferArea(f.file));
    const allIntents = new Set();
    for (const [area, areaFiles] of byArea) {
      console.log(`  📁 ${area}`);
      for (const f of areaFiles) {
        const typeLabel = CHANGE_TYPE_LABELS[f.status] || f.status;
        const intent = inferIntent(f.file, f.status);
        allIntents.add(intent);
        console.log(`    [${typeLabel}] ${f.file}  → ${intent}`);
      }
      console.log("");
    }
    console.log(`  🏷 修改意图: ${[...allIntents].join("、")}\n`);
  }

  console.log("── 提交建议 ──────────────────────────────────\n");
  if (stashList.length > 0 && workingChanges.length > 0) {
    console.log("  ⚠️  存在 stash 记录且工作区有变更，建议：");
    console.log("     1. 先检查 stash 内容是否需要合并到当前分支");
    console.log("     2. 使用 git stash pop 恢复或 git stash drop 丢弃");
    console.log("     3. 确认后再执行 git commit\n");
  } else if (stashList.length > 0) {
    console.log("  ⚠️  存在 stash 记录，确认是否需要先恢复再提交\n");
  } else if (workingChanges.length > 0) {
    console.log("  📝 工作区有变更，建议 git add 后再提交\n");
  } else {
    console.log("  ✅ 没有需要处理的变更\n");
  }
}

main();

#!/usr/bin/env node

const fs = require('node:fs');
const crypto = require('node:crypto');
const http = require('node:http');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HUATUO_BRANCH_UPDATE_API_URL = 'https://huatuo.bytedance.net/api/jsCoverage/branch';
const HUATUO_BRANCH_FILES_API_URL = 'https://huatuo.bytedance.net/api/jsCoverage/branch/files';
const HUATUO_BRANCH_CODE_API_URL = 'https://huatuo.bytedance.net/api/jsCoverage/branch/code';

const DEFAULT_OUT_DIR = path.resolve(process.cwd(), 'coverage');
const DEFAULT_QUERY = {
  gitRepo: 'ecom/alliance-operation-mono',
  fromBranch: 'master',
  toBranch: 'feat/meego-7306602080-incentive-control',
};

const usage = () => {
  console.log(`
Usage:
  node collect-huatuo-branch-coverage.js [options] [path ...]

Options:
  --repoRoot <dir>      Real source repository root, used for report links
  --gitRepo <repo>      Huatuo gitRepo, default ${DEFAULT_QUERY.gitRepo}
  --fromBranch <name>   Huatuo fromBranch, default ${DEFAULT_QUERY.fromBranch}
  --toBranch <name>     Huatuo toBranch, default ${DEFAULT_QUERY.toBranch}
  --outDir <dir>        Output directory, default ${DEFAULT_OUT_DIR}
  --timeout <ms>        Request timeout, default 30000
  --limit <n>           Limit branch/code requests after filtering
  --cookie <value>      Huatuo Cookie header value; falls back to HUATUO_COOKIE
  --printBrowserScript  Print browser-side fetch script and exit
  --fromBrowserPayload <file|->
                        Persist a browser-side fetch payload from file or stdin
  --browserCaptureServer
                        Start a local receiver for browser-side chunked capture
  --browserCaptureHost <host>
                        Host for --browserCaptureServer, default 127.0.0.1
  --browserCapturePort <port>
                        Port for --browserCaptureServer, default 0
  --browserCaptureToken <value>
                        Token for browser capture requests, default random
  --dryRun              Print URLs and options without requesting Huatuo
  --help                Show this help
`);
};

const parseArgs = (argv) => {
  const args = {
    repoRoot: '',
    gitRepo: DEFAULT_QUERY.gitRepo,
    fromBranch: DEFAULT_QUERY.fromBranch,
    toBranch: DEFAULT_QUERY.toBranch,
    outDir: DEFAULT_OUT_DIR,
    timeout: 30000,
    limit: 0,
    cookie: '',
    printBrowserScript: false,
    fromBrowserPayload: '',
    browserCaptureServer: false,
    browserCaptureHost: '127.0.0.1',
    browserCapturePort: 0,
    browserCaptureToken: '',
    dryRun: false,
    devicePlatform: '',
    deviceModel: '',
    appId: '',
    appVersion: '',
    paths: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg === '--repoRoot') {
      args.repoRoot = path.resolve(argv[++index] || '');
    } else if (arg === '--gitRepo') {
      args.gitRepo = argv[++index] || args.gitRepo;
    } else if (arg === '--fromBranch') {
      args.fromBranch = argv[++index] || args.fromBranch;
    } else if (arg === '--toBranch') {
      args.toBranch = argv[++index] || args.toBranch;
    } else if (arg === '--outDir') {
      args.outDir = path.resolve(argv[++index] || DEFAULT_OUT_DIR);
    } else if (arg === '--timeout') {
      args.timeout = Number(argv[++index] || args.timeout);
    } else if (arg === '--limit') {
      args.limit = Number(argv[++index] || 0);
    } else if (arg === '--cookie') {
      args.cookie = argv[++index] || '';
    } else if (arg === '--printBrowserScript') {
      args.printBrowserScript = true;
    } else if (arg === '--fromBrowserPayload') {
      args.fromBrowserPayload = argv[++index] || '';
    } else if (arg === '--browserCaptureServer') {
      args.browserCaptureServer = true;
    } else if (arg === '--browserCaptureHost') {
      args.browserCaptureHost = argv[++index] || args.browserCaptureHost;
    } else if (arg === '--browserCapturePort') {
      args.browserCapturePort = Number(argv[++index] || 0);
    } else if (arg === '--browserCaptureToken') {
      args.browserCaptureToken = argv[++index] || '';
    } else if (arg === '--dryRun') {
      args.dryRun = true;
    } else if (arg === '--devicePlatform') {
      args.devicePlatform = argv[++index] || '';
    } else if (arg === '--deviceModel') {
      args.deviceModel = argv[++index] || '';
    } else if (arg === '--appId') {
      args.appId = argv[++index] || '';
    } else if (arg === '--appVersion') {
      args.appVersion = argv[++index] || '';
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      args.paths.push(arg);
    }
  }

  return args;
};

const appendQuery = (url, entries) => {
  const query = new URLSearchParams();
  entries.forEach(([key, value]) => query.set(key, value ?? ''));
  return `${url}?${query.toString()}`;
};

const buildBranchUpdateRequest = ({ gitRepo, fromBranch, toBranch }) => ({
  url: HUATUO_BRANCH_UPDATE_API_URL,
  method: 'POST',
  body: { fromBranch, toBranch, gitRepo },
});

const buildBranchFilesUrl = (query) =>
  appendQuery(HUATUO_BRANCH_FILES_API_URL, [
    ['gitRepo', query.gitRepo],
    ['fromBranch', query.fromBranch],
    ['toBranch', query.toBranch],
    ['devicePlatform', query.devicePlatform || ''],
    ['deviceModel', query.deviceModel || ''],
    ['appId', query.appId || ''],
    ['appVersion', query.appVersion || ''],
  ]);

const buildBranchCodeUrl = (query) =>
  appendQuery(HUATUO_BRANCH_CODE_API_URL, [
    ['gitRepo', query.gitRepo],
    ['fromBranch', query.fromBranch],
    ['toBranch', query.toBranch],
    ['filePath', query.filePath],
    ['devicePlatform', query.devicePlatform || ''],
    ['deviceModel', query.deviceModel || ''],
    ['appId', query.appId || ''],
    ['appVersion', query.appVersion || ''],
  ]);

const parseCoverRatio = (coverRatio) => {
  if (typeof coverRatio === 'number') {
    return coverRatio;
  }
  const value = Number(String(coverRatio ?? '').trim().replace(/%$/, ''));
  return Number.isFinite(value) ? value : 0;
};

const estimateUncoveredLines = (file) => {
  const insertLines = Number(file.insertLines || 0);
  const uncoveredLines = Number(file.uncoveredLines);
  if (Number.isFinite(uncoveredLines)) {
    return uncoveredLines;
  }
  const coverLines = Number(file.coverLines || 0);
  return Math.max(insertLines - coverLines, 0);
};

const sortFilesByUncoveredEstimate = (files) =>
  [...files].sort(
    (left, right) =>
      estimateUncoveredLines(right) - estimateUncoveredLines(left) ||
      Number(right.insertLines || 0) - Number(left.insertLines || 0) ||
      String(left.path || '').localeCompare(String(right.path || '')),
  );

const matchesPathFilters = (filePath, pathFilters = []) =>
  pathFilters.length === 0 || pathFilters.some((filter) => String(filePath || '').includes(filter));

const isBamFilePath = (filePath) =>
  String(filePath || '')
    .split(/[\\/]+/)
    .some((segment) => segment.toLowerCase() === 'bam');

const getScriptFileExclusion = (file, pathFilters = []) => {
  if (!matchesPathFilters(file.path, pathFilters)) {
    return null;
  }
  if (Number(file.insertLines || 0) <= 0) {
    return {
      reason: 'ZERO_INSERT_LINES',
      selectionEffect: 'SCRIPT_FILTER_ONLY',
      notes: 'Filtered before branch/code detail requests and not written to coverage-exclusion-log.json.',
    };
  }
  if (isBamFilePath(file.path)) {
    return {
      reason: 'BAM_FILE',
      selectionEffect: 'EXCLUDE',
      notes: 'BAM files are excluded by script default before branch/code detail requests.',
    };
  }
  return null;
};

const collectScriptFilteredFiles = (files, pathFilters = []) =>
  files
    .filter((file) => parseCoverRatio(file.coverRatio) < 100)
    .map((file) => {
      const exclusion = getScriptFileExclusion(file, pathFilters);
      return exclusion
        ? {
            filePath: file.path,
            coverRatio: file.coverRatio,
            insertLines: Number(file.insertLines || 0),
            ...exclusion,
          }
        : null;
    })
    .filter(Boolean);

const extractCoverageFiles = (parsed) => {
  const roots = parsed?.data?.packageList || parsed?.data?.list || parsed?.packageList || [];
  const files = [];

  const visit = (node, labels = []) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    const nextLabels = node.label ? [...labels, node.label] : labels;
    if (node.path && Object.prototype.hasOwnProperty.call(node, 'coverRatio')) {
      files.push({
        label: node.label || path.basename(node.path),
        path: node.path,
        packageLabel: labels.join('/'),
        labels: nextLabels,
        addLines: Number(node.addLines || 0),
        insertLines: Number(node.insertLines || 0),
        coverLines: Number(node.coverLines || 0),
        uncoveredLines: estimateUncoveredLines(node),
        coverRatio: node.coverRatio,
        ignoreLines: node.ignoreLines || [],
        ignoreReason: node.ignoreReason || '',
        effectFiles: node.effectFiles || [],
      });
    }
    (node.children || node.packageList || node.files || []).forEach((child) => visit(child, nextLabels));
  };

  roots.forEach((root) => visit(root));
  return files;
};

const filterNonFullCoverageFiles = (files, pathFilters = []) =>
  sortFilesByUncoveredEstimate(
    files
      .filter((file) => parseCoverRatio(file.coverRatio) < 100)
      .filter((file) => !getScriptFileExclusion(file, pathFilters))
      .filter((file) => matchesPathFilters(file.path, pathFilters)),
  );

const selectRequestFiles = (files, limit = 0) => {
  const count = Number(limit || 0);
  return count > 0 ? files.slice(0, count) : files;
};

const extractCodeRows = (parsed) => {
  if (Array.isArray(parsed?.data)) {
    return parsed.data;
  }
  return parsed?.data?.codeList || parsed?.data?.rows || parsed?.data?.list || [];
};

const summarizeCodeRows = (rows) => {
  const summary = {
    totalRows: rows.length,
    insertedRows: 0,
    coveredInsertedRows: 0,
    uncoveredInsertedRows: 0,
    ignoredUncoveredInsertedRows: 0,
    effectiveUncoveredInsertedRows: 0,
  };
  rows.forEach((row) => {
    if (!row.isInsertLine) {
      return;
    }
    summary.insertedRows += 1;
    if (row.isCoverageLine) {
      summary.coveredInsertedRows += 1;
      return;
    }
    summary.uncoveredInsertedRows += 1;
    if (row.isIgnoreLine) {
      summary.ignoredUncoveredInsertedRows += 1;
      return;
    }
    summary.effectiveUncoveredInsertedRows += 1;
  });
  return summary;
};

const computeFileCoverageVersion = ({ coverageFile, rows }) => {
  const versionPayload = {
    path: coverageFile.path,
    addLines: Number(coverageFile.addLines || 0),
    insertLines: Number(coverageFile.insertLines || 0),
    coverLines: Number(coverageFile.coverLines || 0),
    coverRatio: coverageFile.coverRatio,
    rows: rows.map((row) => ({
      lineNum: row.lineNum ?? '',
      code: row.code ?? '',
      isInsertLine: Boolean(row.isInsertLine),
      isCoverageLine: Boolean(row.isCoverageLine),
      isIgnoreLine: Boolean(row.isIgnoreLine),
    })),
  };
  return `huatuo:${crypto.createHash('sha256').update(JSON.stringify(versionPayload)).digest('hex').slice(0, 16)}`;
};

const safePathSegments = (filePath) =>
  path
    .normalize(String(filePath || ''))
    .split(path.sep)
    .flatMap((segment) => segment.split('/'))
    .filter((segment) => segment && segment !== '.' && segment !== '..');

const createOutputPaths = (outDir, filePath) => {
  const resultDir = path.join(outDir, 'results', ...safePathSegments(filePath));
  return {
    resultDir,
    rawResponse: path.join(resultDir, 'raw-response.json'),
    uncovered: path.join(resultDir, 'uncovered-inserted-lines.json'),
    summary: path.join(resultDir, 'summary.json'),
    report: path.join(resultDir, 'report.md'),
  };
};

const escapeMarkdownCell = (value) => String(value ?? '').replace(/\|/g, '\\|').replace(/\n/g, '<br>');

const sourceLink = (repoRoot, filePath) => {
  if (!repoRoot) {
    return `\`${escapeMarkdownCell(filePath)}\``;
  }
  return `[${escapeMarkdownCell(filePath)}](file://${path.join(repoRoot, filePath)})`;
};

const writeJson = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const writeText = (filePath, value) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, value);
};

const writeFileResult = ({ outDir, repoRoot, query, coverageFile, codeResponse }) => {
  const rows = extractCodeRows(codeResponse.parsed);
  const summary = summarizeCodeRows(rows);
  const fileCoverageVersion = computeFileCoverageVersion({ coverageFile, rows });
  const output = createOutputPaths(outDir, coverageFile.path);
  const uncoveredRows = rows.filter((row) => row.isInsertLine && !row.isCoverageLine && !row.isIgnoreLine);
  const result = {
    filePath: coverageFile.path,
    fileCoverageVersion,
    coverageUrl: buildBranchCodeUrl(query),
    coverageFile,
    summary,
    output,
  };

  writeJson(output.rawResponse, codeResponse);
  writeJson(output.uncovered, uncoveredRows);
  writeJson(output.summary, result);
  writeText(
    output.report,
    [
      `# ${coverageFile.path}`,
      '',
      `- coverageUrl: \`${buildBranchCodeUrl(query)}\``,
      `- coverRatio: \`${coverageFile.coverRatio}\``,
      `- effectiveUncoveredInsertedRows: \`${summary.effectiveUncoveredInsertedRows}\``,
      `- fileCoverageVersion: \`${fileCoverageVersion}\``,
      '',
      '| line | code |',
      '| --- | --- |',
      ...uncoveredRows.map((row) => `| ${row.lineNum ?? ''} | \`${escapeMarkdownCell(row.code ?? '')}\` |`),
      '',
    ].join('\n'),
  );

  return result;
};

const createOutputFiles = (outDir) => ({
  latestJson: path.join(outDir, 'latest.json'),
  report: path.join(outDir, 'report.md'),
  updateResponse: path.join(outDir, 'update-response.json'),
  filesResponse: path.join(outDir, 'files-response.json'),
  uncoveredListJson: path.join(outDir, 'uncovered-list.json'),
  uncoveredListMarkdown: path.join(outDir, 'uncovered-list.md'),
});

const normalizeUpdateApi = (response) =>
  response
    ? {
        url: response.url,
        method: response.method || 'POST',
        responseStatus: response.status,
        responseOk: response.ok,
        finalUrl: response.finalUrl,
        coverRatio: response.parsed?.data?.coverRatio,
      }
    : null;

const buildLatestRecord = ({
  args,
  repoRoot,
  gitRoot,
  currentBranch,
  updateResponse,
  filesResponse,
  coverageFiles,
  nonFullFiles,
  requestFiles,
  results,
  skipped,
}) => {
  const outputFiles = createOutputFiles(args.outDir);
  const scriptFilteredFiles = collectScriptFilteredFiles(coverageFiles, args.paths);
  const uncoveredFiles = results
    .filter((item) => item.summary.effectiveUncoveredInsertedRows > 0)
    .sort((left, right) => right.summary.effectiveUncoveredInsertedRows - left.summary.effectiveUncoveredInsertedRows)
    .map((item, index) => ({
      rank: index + 1,
      filePath: item.filePath,
      fileCoverageVersion: item.fileCoverageVersion,
      report: item.output.report,
      coverRatio: item.coverageFile.coverRatio,
      insertLines: item.coverageFile.insertLines,
      estimatedUncoveredLines: estimateUncoveredLines(item.coverageFile),
      effectiveUncoveredInsertedRows: item.summary.effectiveUncoveredInsertedRows,
    }));
  const totals = results.reduce(
    (acc, item) => ({
      effectiveUncoveredInsertedRows:
        acc.effectiveUncoveredInsertedRows + item.summary.effectiveUncoveredInsertedRows,
      uncoveredInsertedRows: acc.uncoveredInsertedRows + item.summary.uncoveredInsertedRows,
      ignoredUncoveredInsertedRows: acc.ignoredUncoveredInsertedRows + item.summary.ignoredUncoveredInsertedRows,
    }),
    { effectiveUncoveredInsertedRows: 0, uncoveredInsertedRows: 0, ignoredUncoveredInsertedRows: 0 },
  );

  return {
    generatedAt: new Date().toISOString(),
    repoRoot,
    gitRoot,
    currentBranch,
    query: { gitRepo: args.gitRepo, fromBranch: args.fromBranch, toBranch: args.toBranch },
    updateApi: normalizeUpdateApi(updateResponse),
    filesApi: {
      url: filesResponse?.url,
      responseStatus: filesResponse?.status,
      responseOk: filesResponse?.ok,
      finalUrl: filesResponse?.finalUrl,
      totalFiles: coverageFiles.length,
      nonFullCoverageFiles: nonFullFiles.length,
      scriptFilteredFiles: scriptFilteredFiles.length,
      codeRequestFiles: requestFiles.length,
    },
    filters: {
      paths: args.paths,
      limit: args.limit,
      scriptDefaultExclusions: ['ZERO_INSERT_LINES', 'BAM_FILE'],
    },
    coverageFiles,
    scriptFilteredFiles,
    nonFullCoverageFiles: nonFullFiles,
    requestFiles,
    results,
    uncoveredFiles,
    skipped,
    totals,
    outputFiles,
  };
};

const writeCoverageArtifacts = ({ latest, updateResponse, filesResponse }) => {
  fs.mkdirSync(latest.outputFiles.latestJson && path.dirname(latest.outputFiles.latestJson), { recursive: true });
  writeJson(latest.outputFiles.latestJson, latest);
  writeJson(latest.outputFiles.updateResponse, updateResponse || {});
  writeJson(latest.outputFiles.filesResponse, filesResponse || {});
  writeJson(latest.outputFiles.uncoveredListJson, { files: latest.uncoveredFiles });
  writeText(
    latest.outputFiles.uncoveredListMarkdown,
    [
      '# Uncovered Files',
      '',
      '| Rank | Effective uncovered | Files estimate | coverRatio | Version | File | Report |',
      '| --- | ---: | ---: | --- | --- | --- | --- |',
      ...latest.uncoveredFiles.map(
        (item) =>
          `| ${item.rank} | ${item.effectiveUncoveredInsertedRows} | ${item.estimatedUncoveredLines} | ${escapeMarkdownCell(item.coverRatio)} | \`${escapeMarkdownCell(item.fileCoverageVersion || '')}\` | ${sourceLink(latest.repoRoot, item.filePath)} | \`${escapeMarkdownCell(item.report)}\` |`,
      ),
      '',
    ].join('\n'),
  );
  writeText(
    latest.outputFiles.report,
    [
      '# Huatuo Branch Coverage Report',
      '',
      `- generatedAt: \`${latest.generatedAt}\``,
      `- gitRepo: \`${latest.query.gitRepo}\``,
      `- fromBranch: \`${latest.query.fromBranch}\``,
      `- toBranch: \`${latest.query.toBranch}\``,
      `- overallCoverRatio: \`${latest.updateApi?.coverRatio || '-'}\``,
      '',
      '| Metric | Value |',
      '| --- | ---: |',
      `| filesApiFiles | ${latest.filesApi.totalFiles} |`,
      `| nonFullCoverageFiles | ${latest.filesApi.nonFullCoverageFiles} |`,
      `| scriptFilteredFiles | ${latest.filesApi.scriptFilteredFiles} |`,
      `| codeRequestFiles | ${latest.filesApi.codeRequestFiles} |`,
      `| resultFiles | ${latest.results.length} |`,
      `| skippedFiles | ${latest.skipped.length} |`,
      `| effectiveUncoveredInsertedRows | ${latest.totals.effectiveUncoveredInsertedRows} |`,
      '',
      '| Rank | Effective uncovered | Files estimate | coverRatio | Version | File | Report |',
      '| --- | ---: | ---: | --- | --- | --- | --- |',
      ...latest.uncoveredFiles.map(
        (item) =>
          `| ${item.rank} | ${item.effectiveUncoveredInsertedRows} | ${item.estimatedUncoveredLines} | ${escapeMarkdownCell(item.coverRatio)} | \`${escapeMarkdownCell(item.fileCoverageVersion || '')}\` | ${sourceLink(latest.repoRoot, item.filePath)} | \`${escapeMarkdownCell(item.report)}\` |`,
      ),
      '',
    ].join('\n'),
  );
};

const resolveAuthCookie = (args) => args.cookie || process.env.HUATUO_COOKIE || '';

const assertAuthCookie = (args) => {
  if (!resolveAuthCookie(args)) {
    throw new Error(
      [
        'Missing Huatuo cookie for real API requests.',
        'Visit https://ehome.bytedance.net/huatuo/development/coverage-list first, then pass the Cookie header with --cookie or HUATUO_COOKIE.',
      ].join(' '),
    );
  }
};

const requestJson = async (url, { method = 'GET', body, timeout = 30000, cookie = '' } = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const headers = {};
  if (body) {
    headers['content-type'] = 'application/json';
  }
  if (cookie) {
    headers.cookie = cookie;
  }
  try {
    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      parsed = { rawText: text };
    }
    return {
      requestedAt: new Date().toISOString(),
      url,
      method,
      status: response.status,
      ok: response.ok,
      finalUrl: response.url,
      parsed,
    };
  } finally {
    clearTimeout(timer);
  }
};

const buildBrowserPayloadScript = (args) => {
  const config = {
    query: {
      gitRepo: args.gitRepo,
      fromBranch: args.fromBranch,
      toBranch: args.toBranch,
      devicePlatform: args.devicePlatform || '',
      deviceModel: args.deviceModel || '',
      appId: args.appId || '',
      appVersion: args.appVersion || '',
    },
    pathFilters: args.paths || [],
    limit: args.limit || 0,
    timeout: args.timeout || 30000,
    endpoints: {
      update: HUATUO_BRANCH_UPDATE_API_URL,
      files: HUATUO_BRANCH_FILES_API_URL,
      code: HUATUO_BRANCH_CODE_API_URL,
    },
  };

  return `(async () => {
  const config = ${JSON.stringify(config)};
  const appendQuery = (url, entries) => {
    const query = new URLSearchParams();
    entries.forEach(([key, value]) => query.set(key, value ?? ''));
    return url + '?' + query.toString();
  };
  const buildFilesUrl = () => appendQuery(config.endpoints.files, [
    ['gitRepo', config.query.gitRepo],
    ['fromBranch', config.query.fromBranch],
    ['toBranch', config.query.toBranch],
    ['devicePlatform', config.query.devicePlatform || ''],
    ['deviceModel', config.query.deviceModel || ''],
    ['appId', config.query.appId || ''],
    ['appVersion', config.query.appVersion || ''],
  ]);
  const buildCodeUrl = (filePath) => appendQuery(config.endpoints.code, [
    ['gitRepo', config.query.gitRepo],
    ['fromBranch', config.query.fromBranch],
    ['toBranch', config.query.toBranch],
    ['filePath', filePath],
    ['devicePlatform', config.query.devicePlatform || ''],
    ['deviceModel', config.query.deviceModel || ''],
    ['appId', config.query.appId || ''],
    ['appVersion', config.query.appVersion || ''],
  ]);
  const requestJson = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout);
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        credentials: 'include',
        headers: options.body ? { 'content-type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { rawText: text };
      }
      return {
        requestedAt: new Date().toISOString(),
        url,
        method: options.method || 'GET',
        status: response.status,
        ok: response.ok,
        finalUrl: response.url,
        parsed,
      };
    } finally {
      clearTimeout(timer);
    }
  };
  const parseCoverRatio = (coverRatio) => {
    const value = Number(String(coverRatio ?? '').trim().replace(/%$/, ''));
    return Number.isFinite(value) ? value : 0;
  };
  const estimateUncoveredLines = (file) => {
    const uncoveredLines = Number(file.uncoveredLines);
    if (Number.isFinite(uncoveredLines)) return uncoveredLines;
    return Math.max(Number(file.insertLines || 0) - Number(file.coverLines || 0), 0);
  };
  const extractCoverageFiles = (parsed) => {
    const roots = parsed?.data?.packageList || parsed?.data?.list || parsed?.packageList || [];
    const files = [];
    const visit = (node, labels = []) => {
      if (!node || typeof node !== 'object') return;
      const nextLabels = node.label ? [...labels, node.label] : labels;
      if (node.path && Object.prototype.hasOwnProperty.call(node, 'coverRatio')) {
        files.push({
          label: node.label || String(node.path).split('/').pop(),
          path: node.path,
          packageLabel: labels.join('/'),
          labels: nextLabels,
          addLines: Number(node.addLines || 0),
          insertLines: Number(node.insertLines || 0),
          coverLines: Number(node.coverLines || 0),
          uncoveredLines: estimateUncoveredLines(node),
          coverRatio: node.coverRatio,
          ignoreLines: node.ignoreLines || [],
          ignoreReason: node.ignoreReason || '',
          effectFiles: node.effectFiles || [],
        });
      }
      (node.children || node.packageList || node.files || []).forEach((child) => visit(child, nextLabels));
    };
    roots.forEach((root) => visit(root));
    return files;
  };
  const matchesPathFilters = (filePath) =>
    config.pathFilters.length === 0 || config.pathFilters.some((filter) => String(filePath || '').includes(filter));
  const isBamFilePath = (filePath) =>
    String(filePath || '').split(/[\\\\/]+/).some((segment) => segment.toLowerCase() === 'bam');
  const selectRequestFiles = (files) =>
    files
      .filter((file) => parseCoverRatio(file.coverRatio) < 100)
      .filter((file) => Number(file.insertLines || 0) > 0)
      .filter((file) => !isBamFilePath(file.path))
      .filter((file) => matchesPathFilters(file.path))
      .sort(
        (left, right) =>
          estimateUncoveredLines(right) - estimateUncoveredLines(left) ||
          Number(right.insertLines || 0) - Number(left.insertLines || 0) ||
          String(left.path || '').localeCompare(String(right.path || '')),
      )
      .slice(0, config.limit > 0 ? config.limit : undefined);

  const updateBody = {
    fromBranch: config.query.fromBranch,
    toBranch: config.query.toBranch,
    gitRepo: config.query.gitRepo,
  };
  const updateResponse = await requestJson(config.endpoints.update, { method: 'POST', body: updateBody });
  const filesResponse = await requestJson(buildFilesUrl());
  const requestFiles = selectRequestFiles(extractCoverageFiles(filesResponse.parsed));
  const codeResponses = [];
  const skipped = [];
  for (let index = 0; index < requestFiles.length; index += 1) {
    const file = requestFiles[index];
    const coverageUrl = buildCodeUrl(file.path);
    try {
      const response = await requestJson(coverageUrl);
      codeResponses.push({ filePath: file.path, coverageFile: file, response });
    } catch (error) {
      skipped.push({ filePath: file.path, coverageFile: file, coverageUrl, reason: error.message });
    }
  }
  return JSON.stringify(
    {
      source: 'huatuo-browser-fetch',
      generatedAt: new Date().toISOString(),
      query: config.query,
      pathFilters: config.pathFilters,
      limit: config.limit,
      updateResponse,
      filesResponse,
      codeResponses,
      skipped,
    },
    null,
    2,
  );
})()`;
};

const buildBrowserCaptureScript = ({ args, captureBaseUrl, token }) => {
  const config = {
    query: {
      gitRepo: args.gitRepo,
      fromBranch: args.fromBranch,
      toBranch: args.toBranch,
      devicePlatform: args.devicePlatform || '',
      deviceModel: args.deviceModel || '',
      appId: args.appId || '',
      appVersion: args.appVersion || '',
    },
    pathFilters: args.paths || [],
    limit: args.limit || 0,
    timeout: args.timeout || 30000,
    captureBaseUrl,
    token,
    endpoints: {
      update: HUATUO_BRANCH_UPDATE_API_URL,
      files: HUATUO_BRANCH_FILES_API_URL,
      code: HUATUO_BRANCH_CODE_API_URL,
    },
  };

  return `(async () => {
  const config = ${JSON.stringify(config)};
  const appendQuery = (url, entries) => {
    const query = new URLSearchParams();
    entries.forEach(([key, value]) => query.set(key, value ?? ''));
    return url + '?' + query.toString();
  };
  const buildFilesUrl = () => appendQuery(config.endpoints.files, [
    ['gitRepo', config.query.gitRepo],
    ['fromBranch', config.query.fromBranch],
    ['toBranch', config.query.toBranch],
    ['devicePlatform', config.query.devicePlatform || ''],
    ['deviceModel', config.query.deviceModel || ''],
    ['appId', config.query.appId || ''],
    ['appVersion', config.query.appVersion || ''],
  ]);
  const buildCodeUrl = (filePath) => appendQuery(config.endpoints.code, [
    ['gitRepo', config.query.gitRepo],
    ['fromBranch', config.query.fromBranch],
    ['toBranch', config.query.toBranch],
    ['filePath', filePath],
    ['devicePlatform', config.query.devicePlatform || ''],
    ['deviceModel', config.query.deviceModel || ''],
    ['appId', config.query.appId || ''],
    ['appVersion', config.query.appVersion || ''],
  ]);
  const requestJson = async (url, options = {}) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), config.timeout);
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        credentials: 'include',
        headers: options.body ? { 'content-type': 'application/json' } : undefined,
        body: options.body ? JSON.stringify(options.body) : undefined,
        signal: controller.signal,
      });
      const text = await response.text();
      let parsed = null;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = { rawText: text };
      }
      return {
        requestedAt: new Date().toISOString(),
        url,
        method: options.method || 'GET',
        status: response.status,
        ok: response.ok,
        finalUrl: response.url,
        parsed,
      };
    } finally {
      clearTimeout(timer);
    }
  };
  const postChunk = async (type, payload) => {
    const response = await fetch(config.captureBaseUrl + '/chunk?token=' + encodeURIComponent(config.token), {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ type, payload }),
    });
    if (!response.ok) {
      throw new Error('capture chunk failed: ' + response.status + ' ' + await response.text());
    }
    return response.json();
  };
  const parseCoverRatio = (coverRatio) => {
    const value = Number(String(coverRatio ?? '').trim().replace(/%$/, ''));
    return Number.isFinite(value) ? value : 0;
  };
  const estimateUncoveredLines = (file) => {
    const uncoveredLines = Number(file.uncoveredLines);
    if (Number.isFinite(uncoveredLines)) return uncoveredLines;
    return Math.max(Number(file.insertLines || 0) - Number(file.coverLines || 0), 0);
  };
  const extractCoverageFiles = (parsed) => {
    const roots = parsed?.data?.packageList || parsed?.data?.list || parsed?.packageList || [];
    const files = [];
    const visit = (node, labels = []) => {
      if (!node || typeof node !== 'object') return;
      const nextLabels = node.label ? [...labels, node.label] : labels;
      if (node.path && Object.prototype.hasOwnProperty.call(node, 'coverRatio')) {
        files.push({
          label: node.label || String(node.path).split('/').pop(),
          path: node.path,
          packageLabel: labels.join('/'),
          labels: nextLabels,
          addLines: Number(node.addLines || 0),
          insertLines: Number(node.insertLines || 0),
          coverLines: Number(node.coverLines || 0),
          uncoveredLines: estimateUncoveredLines(node),
          coverRatio: node.coverRatio,
          ignoreLines: node.ignoreLines || [],
          ignoreReason: node.ignoreReason || '',
          effectFiles: node.effectFiles || [],
        });
      }
      (node.children || node.packageList || node.files || []).forEach((child) => visit(child, nextLabels));
    };
    roots.forEach((root) => visit(root));
    return files;
  };
  const matchesPathFilters = (filePath) =>
    config.pathFilters.length === 0 || config.pathFilters.some((filter) => String(filePath || '').includes(filter));
  const isBamFilePath = (filePath) =>
    String(filePath || '').split(/[\\\\/]+/).some((segment) => segment.toLowerCase() === 'bam');
  const selectRequestFiles = (files) =>
    files
      .filter((file) => parseCoverRatio(file.coverRatio) < 100)
      .filter((file) => Number(file.insertLines || 0) > 0)
      .filter((file) => !isBamFilePath(file.path))
      .filter((file) => matchesPathFilters(file.path))
      .sort(
        (left, right) =>
          estimateUncoveredLines(right) - estimateUncoveredLines(left) ||
          Number(right.insertLines || 0) - Number(left.insertLines || 0) ||
          String(left.path || '').localeCompare(String(right.path || '')),
      )
      .slice(0, config.limit > 0 ? config.limit : undefined);

  try {
    await postChunk('meta', {
      source: 'huatuo-browser-capture',
      generatedAt: new Date().toISOString(),
      query: config.query,
      pathFilters: config.pathFilters,
      limit: config.limit,
    });
    const updateBody = {
      fromBranch: config.query.fromBranch,
      toBranch: config.query.toBranch,
      gitRepo: config.query.gitRepo,
    };
    const updateResponse = await requestJson(config.endpoints.update, { method: 'POST', body: updateBody });
    await postChunk('update', updateResponse);
    const filesResponse = await requestJson(buildFilesUrl());
    await postChunk('files', filesResponse);
    const requestFiles = selectRequestFiles(extractCoverageFiles(filesResponse.parsed));
    await postChunk('requestFiles', requestFiles);
    const skipped = [];
    for (let index = 0; index < requestFiles.length; index += 1) {
      const file = requestFiles[index];
      const coverageUrl = buildCodeUrl(file.path);
      try {
        const response = await requestJson(coverageUrl);
        await postChunk('code', { index, filePath: file.path, coverageFile: file, response });
      } catch (error) {
        const skippedItem = { index, filePath: file.path, coverageFile: file, coverageUrl, reason: error.message };
        skipped.push(skippedItem);
        await postChunk('skipped', skippedItem);
      }
    }
    await postChunk('finalize', { generatedAt: new Date().toISOString() });
  } catch (error) {
    try {
      await postChunk('fatal', { message: error.message, stack: error.stack || '' });
    } catch {}
    throw error;
  }
})()`;
};

const readBrowserPayload = (payloadPath) => {
  if (!payloadPath) {
    throw new Error('Missing --fromBrowserPayload value. Pass a JSON file path or "-".');
  }
  const text = payloadPath === '-' ? fs.readFileSync(0, 'utf8') : fs.readFileSync(path.resolve(payloadPath), 'utf8');
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid browser payload JSON: ${error.message}`);
  }
};

const persistBrowserCoveragePayload = ({ args, repoRoot, gitRoot, currentBranch, payload }) => {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid browser payload: expected an object.');
  }
  if (!payload.updateResponse || !payload.filesResponse) {
    throw new Error('Invalid browser payload: missing updateResponse or filesResponse.');
  }
  const payloadArgs = {
    ...args,
    ...(payload.query || {}),
    paths: args.paths.length > 0 ? args.paths : payload.pathFilters || [],
    limit: args.limit || payload.limit || 0,
  };
  const coverageFiles = sortFilesByUncoveredEstimate(extractCoverageFiles(payload.filesResponse?.parsed));
  const nonFullFiles = filterNonFullCoverageFiles(coverageFiles, payloadArgs.paths || []);
  const requestFiles = selectRequestFiles(nonFullFiles, payloadArgs.limit || 0);
  const eligibleRequestPaths = new Set(requestFiles.map((file) => file.path));
  const results = (payload.codeResponses || [])
    .filter(({ filePath, coverageFile }) => eligibleRequestPaths.has(filePath || coverageFile?.path))
    .map(({ filePath, coverageFile, response }) => {
      const resolvedFilePath = filePath || coverageFile?.path;
      return writeFileResult({
        outDir: payloadArgs.outDir,
        repoRoot: gitRoot,
        query: { ...payloadArgs, filePath: resolvedFilePath },
        coverageFile: coverageFile || nonFullFiles.find((file) => file.path === resolvedFilePath) || { path: resolvedFilePath },
        codeResponse: response,
      });
    });
  const latest = buildLatestRecord({
    args: payloadArgs,
    repoRoot,
    gitRoot,
    currentBranch,
    updateResponse: payload.updateResponse,
    filesResponse: payload.filesResponse,
    coverageFiles,
    nonFullFiles,
    requestFiles,
    results,
    skipped: payload.skipped || [],
  });
  writeCoverageArtifacts({ latest, updateResponse: payload.updateResponse, filesResponse: payload.filesResponse });
  return latest;
};

const createBrowserCaptureState = ({ args, repoRoot, gitRoot, currentBranch, token }) => {
  const captureDir = path.join(args.outDir, 'browser-capture');
  const chunksDir = path.join(captureDir, 'chunks');
  fs.mkdirSync(chunksDir, { recursive: true });
  return {
    args,
    repoRoot,
    gitRoot,
    currentBranch,
    token,
    captureDir,
    chunksDir,
    status: 'WAITING',
    meta: null,
    updateResponse: null,
    filesResponse: null,
    requestFiles: [],
    codeResponses: [],
    skipped: [],
    fatal: null,
    latest: null,
    receivedCounts: {
      code: 0,
      skipped: 0,
    },
  };
};

const writeBrowserCaptureStatus = (state) => {
  writeJson(path.join(state.captureDir, 'status.json'), {
    status: state.status,
    updatedAt: new Date().toISOString(),
    query: state.meta?.query || {
      gitRepo: state.args.gitRepo,
      fromBranch: state.args.fromBranch,
      toBranch: state.args.toBranch,
    },
    requestFiles: state.requestFiles.length,
    codeResponses: state.codeResponses.length,
    skipped: state.skipped.length,
    latestJson: state.latest?.outputFiles?.latestJson || '',
    report: state.latest?.outputFiles?.report || '',
    fatal: state.fatal,
  });
};

const receiveBrowserCaptureChunk = (state, message) => {
  if (!message || typeof message !== 'object') {
    throw new Error('Invalid capture chunk: expected object body.');
  }
  const { type, payload } = message;
  if (!type) {
    throw new Error('Invalid capture chunk: missing type.');
  }

  if (type === 'meta') {
    state.status = 'CAPTURING';
    state.meta = payload || {};
    writeJson(path.join(state.chunksDir, '0000-meta.json'), payload || {});
  } else if (type === 'update') {
    state.updateResponse = payload;
    writeJson(path.join(state.chunksDir, '0001-update-response.json'), payload || {});
  } else if (type === 'files') {
    state.filesResponse = payload;
    writeJson(path.join(state.chunksDir, '0002-files-response.json'), payload || {});
  } else if (type === 'requestFiles') {
    state.requestFiles = Array.isArray(payload) ? payload : [];
    writeJson(path.join(state.chunksDir, '0003-request-files.json'), state.requestFiles);
  } else if (type === 'code') {
    const index = Number.isFinite(Number(payload?.index)) ? Number(payload.index) : state.codeResponses.length;
    state.codeResponses[index] = payload;
    state.receivedCounts.code = state.codeResponses.filter(Boolean).length;
    writeJson(path.join(state.chunksDir, `code-${String(index + 1).padStart(4, '0')}.json`), payload || {});
  } else if (type === 'skipped') {
    state.skipped.push(payload || {});
    state.receivedCounts.skipped += 1;
    writeJson(path.join(state.chunksDir, `skipped-${String(state.receivedCounts.skipped).padStart(4, '0')}.json`), payload || {});
  } else if (type === 'fatal') {
    state.status = 'FAILED';
    state.fatal = payload || {};
    writeJson(path.join(state.chunksDir, 'fatal.json'), payload || {});
  } else if (type === 'finalize') {
    if (!state.updateResponse || !state.filesResponse) {
      throw new Error('Cannot finalize browser capture before update and files responses are received.');
    }
    const payloadSkipped = Array.isArray(payload?.skipped) ? payload.skipped : [];
    const skipped = [...state.skipped, ...payloadSkipped].filter(Boolean);
    const browserPayload = {
      source: 'huatuo-browser-capture',
      generatedAt: payload?.generatedAt || state.meta?.generatedAt || new Date().toISOString(),
      query: state.meta?.query || {
        gitRepo: state.args.gitRepo,
        fromBranch: state.args.fromBranch,
        toBranch: state.args.toBranch,
        devicePlatform: state.args.devicePlatform || '',
        deviceModel: state.args.deviceModel || '',
        appId: state.args.appId || '',
        appVersion: state.args.appVersion || '',
      },
      pathFilters: state.meta?.pathFilters || state.args.paths || [],
      limit: state.meta?.limit || state.args.limit || 0,
      updateResponse: state.updateResponse,
      filesResponse: state.filesResponse,
      codeResponses: state.codeResponses.filter(Boolean),
      skipped,
    };
    writeJson(path.join(state.captureDir, 'browser-payload.json'), browserPayload);
    writeJson(path.join(state.args.outDir, 'browser-payload.json'), browserPayload);
    state.latest = persistBrowserCoveragePayload({
      args: state.args,
      repoRoot: state.repoRoot,
      gitRoot: state.gitRoot,
      currentBranch: state.currentBranch,
      payload: browserPayload,
    });
    state.status = 'DONE';
  } else {
    throw new Error(`Unknown browser capture chunk type: ${type}`);
  }

  writeBrowserCaptureStatus(state);
  return {
    status: state.status,
    received: {
      requestFiles: state.requestFiles.length,
      codeResponses: state.codeResponses.filter(Boolean).length,
      skipped: state.skipped.length,
    },
    latestJson: state.latest?.outputFiles?.latestJson || '',
    report: state.latest?.outputFiles?.report || '',
  };
};

const readRequestBody = (request, limitBytes = 100 * 1024 * 1024) =>
  new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    request.on('data', (chunk) => {
      size += chunk.length;
      if (size > limitBytes) {
        reject(new Error(`Request body exceeds ${limitBytes} bytes.`));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    request.on('error', reject);
  });

const sendJsonResponse = (response, statusCode, value, origin = '*') => {
  response.writeHead(statusCode, {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': 'application/json; charset=utf-8',
  });
  response.end(`${JSON.stringify(value, null, 2)}\n`);
};

const sendTextResponse = (response, statusCode, value, origin = '*', contentType = 'text/plain; charset=utf-8') => {
  response.writeHead(statusCode, {
    'access-control-allow-origin': origin || '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
    'content-type': contentType,
  });
  response.end(value);
};

const startBrowserCaptureServer = ({ args, repoRoot, gitRoot, currentBranch }) =>
  new Promise((resolve, reject) => {
    const token = args.browserCaptureToken || crypto.randomBytes(16).toString('hex');
    const host = args.browserCaptureHost || '127.0.0.1';
    const state = createBrowserCaptureState({ args, repoRoot, gitRoot, currentBranch, token });
    let settled = false;
    const closeAndResolve = () => {
      if (settled) {
        return;
      }
      settled = true;
      server.close(() => resolve(state.latest || { browserCapture: true, status: state.status, captureDir: state.captureDir }));
    };
    const closeAndReject = (error) => {
      if (settled) {
        return;
      }
      settled = true;
      state.status = 'FAILED';
      state.fatal = { message: error.message, stack: error.stack || '' };
      writeBrowserCaptureStatus(state);
      server.close(() => reject(error));
    };

    const server = http.createServer(async (request, response) => {
      const origin = request.headers.origin || '*';
      if (request.method === 'OPTIONS') {
        sendTextResponse(response, 204, '', origin);
        return;
      }
      try {
        const url = new URL(request.url, `http://${host}`);
        if (url.searchParams.get('token') !== token) {
          sendJsonResponse(response, 403, { error: 'Invalid browser capture token.' }, origin);
          return;
        }
        if (request.method === 'GET' && url.pathname === '/browser-script.js') {
          sendTextResponse(
            response,
            200,
            buildBrowserCaptureScript({ args, captureBaseUrl: `http://${host}:${server.address().port}`, token }),
            origin,
            'application/javascript; charset=utf-8',
          );
          return;
        }
        if (request.method === 'GET' && url.pathname === '/status') {
          sendJsonResponse(response, 200, {
            status: state.status,
            requestFiles: state.requestFiles.length,
            codeResponses: state.codeResponses.filter(Boolean).length,
            skipped: state.skipped.length,
            latestJson: state.latest?.outputFiles?.latestJson || '',
            report: state.latest?.outputFiles?.report || '',
            fatal: state.fatal,
          }, origin);
          return;
        }
        if (request.method === 'POST' && url.pathname === '/chunk') {
          const body = await readRequestBody(request);
          const result = receiveBrowserCaptureChunk(state, JSON.parse(body || '{}'));
          sendJsonResponse(response, 200, result, origin);
          if (state.status === 'DONE') {
            setTimeout(closeAndResolve, 100);
          } else if (state.status === 'FAILED') {
            setTimeout(() => closeAndReject(new Error(state.fatal?.message || 'Browser capture failed.')), 100);
          }
          return;
        }
        sendJsonResponse(response, 404, { error: 'Not found.' }, origin);
      } catch (error) {
        sendJsonResponse(response, 500, { error: error.message, stack: error.stack || '' }, origin);
        closeAndReject(error);
      }
    });

    server.on('error', closeAndReject);
    server.listen(args.browserCapturePort || 0, host, () => {
      const { port } = server.address();
      const baseUrl = `http://${host}:${port}`;
      const scriptUrl = `${baseUrl}/browser-script.js?token=${encodeURIComponent(token)}`;
      const loader = [
        'return await (async () => {',
        `  const scriptText = await fetch(${JSON.stringify(scriptUrl)}).then((response) => response.text());`,
        '  setTimeout(() => { window.__huatuoBrowserCapturePromise = (0, eval)(scriptText); }, 0);',
        "  return { started: true, mode: 'huatuo-browser-capture', scriptBytes: scriptText.length };",
        '})()',
      ].join('\n');
      writeBrowserCaptureStatus(state);
      console.log(
        JSON.stringify(
          {
            browserCaptureReady: true,
            baseUrl,
            scriptUrl,
            statusUrl: `${baseUrl}/status?token=${encodeURIComponent(token)}`,
            outDir: args.outDir,
            loader,
          },
          null,
          2,
        ),
      );
    });
  });

const resolveRepoRoot = (args) => {
  if (args.repoRoot) {
    return args.repoRoot;
  }
  const git = spawnSync('git', ['rev-parse', '--show-toplevel'], { cwd: process.cwd(), encoding: 'utf8' });
  return git.status === 0 ? git.stdout.trim() : process.cwd();
};

const collectCoverage = async (args) => {
  const gitRoot = resolveRepoRoot(args);
  const currentBranchResult = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
    cwd: gitRoot,
    encoding: 'utf8',
  });
  const currentBranch = currentBranchResult.status === 0 ? currentBranchResult.stdout.trim() : '';
  const updateRequest = buildBranchUpdateRequest(args);
  const filesUrl = buildBranchFilesUrl(args);

  if (args.fromBrowserPayload) {
    const payload = readBrowserPayload(args.fromBrowserPayload);
    return persistBrowserCoveragePayload({ args, repoRoot: gitRoot, gitRoot, currentBranch, payload });
  }

  if (args.browserCaptureServer) {
    return startBrowserCaptureServer({ args, repoRoot: gitRoot, gitRoot, currentBranch });
  }

  if (args.dryRun) {
    return { dryRun: true, updateRequest, filesUrl, pathFilters: args.paths, limit: args.limit, outDir: args.outDir };
  }

  assertAuthCookie(args);
  const cookie = resolveAuthCookie(args);
  fs.mkdirSync(args.outDir, { recursive: true });
  const updateResponse = await requestJson(updateRequest.url, {
    method: updateRequest.method,
    body: updateRequest.body,
    timeout: args.timeout,
    cookie,
  });
  const filesResponse = await requestJson(filesUrl, { timeout: args.timeout, cookie });
  const coverageFiles = sortFilesByUncoveredEstimate(extractCoverageFiles(filesResponse.parsed));
  const nonFullFiles = filterNonFullCoverageFiles(coverageFiles, args.paths);
  const requestFiles = selectRequestFiles(nonFullFiles, args.limit);
  const results = [];
  const skipped = [];

  for (let index = 0; index < requestFiles.length; index += 1) {
    const file = requestFiles[index];
    const query = { ...args, filePath: file.path };
    const coverageUrl = buildBranchCodeUrl(query);
    console.log(`[${index + 1}/${requestFiles.length}] ${file.coverRatio} ${file.path}`);
    try {
      const codeResponse = await requestJson(coverageUrl, { timeout: args.timeout, cookie });
      results.push(writeFileResult({ outDir: args.outDir, repoRoot: gitRoot, query, coverageFile: file, codeResponse }));
    } catch (error) {
      skipped.push({ filePath: file.path, coverageFile: file, coverageUrl, reason: error.message });
    }
  }

  const latest = buildLatestRecord({
    args,
    repoRoot: gitRoot,
    gitRoot,
    currentBranch,
    updateResponse,
    filesResponse,
    coverageFiles,
    nonFullFiles,
    requestFiles,
    results,
    skipped,
  });
  writeCoverageArtifacts({ latest, updateResponse, filesResponse });
  return latest;
};

const main = async () => {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    usage();
    return;
  }
  if (args.printBrowserScript) {
    console.log(buildBrowserPayloadScript(args));
    return;
  }
  const result = await collectCoverage(args);
  console.log(
    JSON.stringify(
      result.dryRun
        ? result
        : {
            latestJson: result.outputFiles.latestJson,
            report: result.outputFiles.report,
            filesApiFiles: result.filesApi.totalFiles,
            nonFullCoverageFiles: result.filesApi.nonFullCoverageFiles,
            scriptFilteredFiles: result.filesApi.scriptFilteredFiles,
            codeRequestFiles: result.filesApi.codeRequestFiles,
            resultFiles: result.results.length,
            skippedFiles: result.skipped.length,
            effectiveUncoveredInsertedRows: result.totals.effectiveUncoveredInsertedRows,
          },
      null,
      2,
    ),
  );
};

if (require.main === module) {
  main().catch((error) => {
    console.error(error.stack || error.message || String(error));
    process.exit(1);
  });
}

module.exports = {
  buildBranchUpdateRequest,
  buildBranchCodeUrl,
  buildBranchFilesUrl,
  buildBrowserCaptureScript,
  buildBrowserPayloadScript,
  collectScriptFilteredFiles,
  collectCoverage,
  computeFileCoverageVersion,
  createBrowserCaptureState,
  createOutputPaths,
  extractCodeRows,
  extractCoverageFiles,
  filterNonFullCoverageFiles,
  getScriptFileExclusion,
  isBamFilePath,
  parseArgs,
  parseCoverRatio,
  persistBrowserCoveragePayload,
  readBrowserPayload,
  receiveBrowserCaptureChunk,
  startBrowserCaptureServer,
  summarizeCodeRows,
};

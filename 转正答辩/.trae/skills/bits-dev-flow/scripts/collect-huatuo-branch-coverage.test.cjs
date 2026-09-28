const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const {
  buildBranchCodeUrl,
  buildBranchFilesUrl,
  buildBranchUpdateRequest,
  buildBrowserCaptureScript,
  buildBrowserPayloadScript,
  collectScriptFilteredFiles,
  collectCoverage,
  computeFileCoverageVersion,
  createBrowserCaptureState,
  createOutputPaths,
  extractCoverageFiles,
  filterNonFullCoverageFiles,
  parseArgs,
  persistBrowserCoveragePayload,
  receiveBrowserCaptureChunk,
  summarizeCodeRows,
} = require('./collect-huatuo-branch-coverage.js');

test('defaults output directory to workspace coverage directory', () => {
  const args = parseArgs([]);

  assert.equal(args.outDir, path.resolve(process.cwd(), 'coverage'));
});

test('accepts explicit Huatuo cookie for real API requests', () => {
  const args = parseArgs(['--cookie', 'session=abc', '--limit', '2', 'apps/a']);

  assert.equal(args.cookie, 'session=abc');
  assert.equal(args.limit, 2);
  assert.deepEqual(args.paths, ['apps/a']);
});

test('accepts browser payload two-stage options', () => {
  const args = parseArgs(['--printBrowserScript', '--fromBrowserPayload', '/tmp/payload.json', '--limit', '3']);

  assert.equal(args.printBrowserScript, true);
  assert.equal(args.fromBrowserPayload, '/tmp/payload.json');
  assert.equal(args.limit, 3);
});

test('accepts chunked browser capture server options', () => {
  const args = parseArgs([
    '--browserCaptureServer',
    '--browserCaptureHost',
    '127.0.0.1',
    '--browserCapturePort',
    '43177',
    '--browserCaptureToken',
    'token-1',
  ]);

  assert.equal(args.browserCaptureServer, true);
  assert.equal(args.browserCaptureHost, '127.0.0.1');
  assert.equal(args.browserCapturePort, 43177);
  assert.equal(args.browserCaptureToken, 'token-1');
});

test('rejects removed browser bridge options', () => {
  assert.throws(() => parseArgs(['--browserBridge']), /Unknown option: --browserBridge/);
});

test('builds Huatuo branch/files and branch/code URLs from the required branch tuple', () => {
  const query = {
    gitRepo: 'ecom/alliance-operation-mono',
    fromBranch: 'master',
    toBranch: 'feat/meego-7306602080-incentive-control',
  };

  assert.equal(
    buildBranchFilesUrl(query),
    'https://huatuo.bytedance.net/api/jsCoverage/branch/files?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=feat%2Fmeego-7306602080-incentive-control&devicePlatform=&deviceModel=&appId=&appVersion=',
  );
  assert.equal(
    buildBranchCodeUrl({ ...query, filePath: 'apps/alliance-operation-daren/src/index.tsx' }),
    'https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=feat%2Fmeego-7306602080-incentive-control&filePath=apps%2Falliance-operation-daren%2Fsrc%2Findex.tsx&devicePlatform=&deviceModel=&appId=&appVersion=',
  );
});

test('builds update coverage POST request with branch tuple only', () => {
  const request = buildBranchUpdateRequest({
    gitRepo: 'ecom/alliance-operation-mono',
    fromBranch: 'master',
    toBranch: 'feat/meego-7306602080-incentive-control',
  });

  assert.deepEqual(request, {
    url: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
    method: 'POST',
    body: {
      fromBranch: 'master',
      toBranch: 'feat/meego-7306602080-incentive-control',
      gitRepo: 'ecom/alliance-operation-mono',
    },
  });
});

test('browser payload script sends real Huatuo requests with browser credentials', () => {
  const script = buildBrowserPayloadScript(
    parseArgs(['--gitRepo', 'ecom/alliance-operation-mono', '--fromBranch', 'master', '--toBranch', 'feature', '--limit', '1']),
  );

  assert.match(script, /credentials: 'include'/);
  assert.match(script, /api\/jsCoverage\/branch/);
  assert.match(script, /method: 'POST'/);
  assert.match(script, /branch\/files/);
  assert.match(script, /branch\/code/);
  assert.match(script, /huatuo-browser-fetch/);
  assert(script.indexOf('const updateResponse') < script.indexOf('const filesResponse'));
});

test('browser capture script posts chunked responses instead of returning full payload', () => {
  const script = buildBrowserCaptureScript({
    args: parseArgs(['--gitRepo', 'ecom/alliance-operation-mono', '--fromBranch', 'master', '--toBranch', 'feature', '--limit', '1']),
    captureBaseUrl: 'http://127.0.0.1:43177',
    token: 'token-1',
  });

  assert.match(script, /credentials: 'include'/);
  assert.match(script, /postChunk\('update'/);
  assert.match(script, /postChunk\('files'/);
  assert.match(script, /postChunk\('code'/);
  assert.match(script, /postChunk\('finalize'/);
  assert.doesNotMatch(script, /return JSON\.stringify/);
});

test('real API mode requires Huatuo cookie before requesting coverage', async () => {
  const previousCookie = process.env.HUATUO_COOKIE;
  delete process.env.HUATUO_COOKIE;
  try {
    await assert.rejects(
      collectCoverage(parseArgs(['--outDir', path.join('/tmp', 'huatuo-no-cookie')])),
      /Missing Huatuo cookie for real API requests/,
    );
  } finally {
    if (previousCookie === undefined) {
      delete process.env.HUATUO_COOKIE;
    } else {
      process.env.HUATUO_COOKIE = previousCookie;
    }
  }
});

test('extracts nested packageList files and filters non-100-percent coverage files', () => {
  const parsed = {
    data: {
      packageList: [
        {
          label: 'apps',
          children: [
            {
              label: 'covered.ts',
              path: 'apps/a/covered.ts',
              insertLines: 2,
              coverLines: 2,
              coverRatio: '100%',
            },
            {
              label: 'generated.ts',
              path: 'apps/a/generated.ts',
              insertLines: 0,
              coverLines: 0,
              coverRatio: '0%',
            },
            {
              label: 'bam-generated.ts',
              path: 'apps/a/src/bam/generated.ts',
              insertLines: 10,
              coverLines: 0,
              coverRatio: '0%',
            },
            {
              label: 'partial.ts',
              path: 'apps/a/partial.ts',
              insertLines: 8,
              coverLines: 5,
              coverRatio: '62.5%',
            },
          ],
        },
      ],
    },
  };

  const files = extractCoverageFiles(parsed);
  assert.equal(files.length, 4);
  assert.deepEqual(
    filterNonFullCoverageFiles(files, ['apps/a']).map((file) => file.path),
    ['apps/a/partial.ts'],
  );
});

test('records script-default filtered files without requesting branch code detail', () => {
  const files = [
    { path: 'apps/a/src/bam/generated.ts', insertLines: 10, coverLines: 0, coverRatio: '0%' },
    { path: 'apps/a/zero.ts', insertLines: 0, coverLines: 0, coverRatio: '0%' },
    { path: 'apps/a/partial.ts', insertLines: 8, coverLines: 5, coverRatio: '62.5%' },
  ];

  assert.deepEqual(
    filterNonFullCoverageFiles(files).map((file) => file.path),
    ['apps/a/partial.ts'],
  );
  assert.deepEqual(
    collectScriptFilteredFiles(files).map(({ filePath, reason, selectionEffect }) => ({
      filePath,
      reason,
      selectionEffect,
    })),
    [
      {
        filePath: 'apps/a/src/bam/generated.ts',
        reason: 'BAM_FILE',
        selectionEffect: 'EXCLUDE',
      },
      {
        filePath: 'apps/a/zero.ts',
        reason: 'ZERO_INSERT_LINES',
        selectionEffect: 'SCRIPT_FILTER_ONLY',
      },
    ],
  );
});

test('summarizes effective uncovered inserted lines excluding ignored lines', () => {
  const summary = summarizeCodeRows([
    { isInsertLine: true, isCoverageLine: true },
    { isInsertLine: true, isCoverageLine: false },
    { isInsertLine: true, isCoverageLine: false, isIgnoreLine: true },
    { isInsertLine: false, isCoverageLine: false },
  ]);

  assert.deepEqual(summary, {
    totalRows: 4,
    insertedRows: 3,
    coveredInsertedRows: 1,
    uncoveredInsertedRows: 2,
    ignoredUncoveredInsertedRows: 1,
    effectiveUncoveredInsertedRows: 1,
  });
});

test('computes file coverage version from Huatuo code rows and coverage state', () => {
  const coverageFile = {
    path: 'apps/a/index.ts',
    addLines: 2,
    insertLines: 2,
    coverLines: 1,
    coverRatio: '50%',
  };
  const missedVersion = computeFileCoverageVersion({
    coverageFile,
    rows: [
      { lineNum: 1, code: 'covered();', isInsertLine: true, isCoverageLine: true },
      { lineNum: 2, code: 'missed();', isInsertLine: true, isCoverageLine: false },
    ],
  });
  const coveredVersion = computeFileCoverageVersion({
    coverageFile: { ...coverageFile, coverLines: 2, coverRatio: '100%' },
    rows: [
      { lineNum: 1, code: 'covered();', isInsertLine: true, isCoverageLine: true },
      { lineNum: 2, code: 'missed();', isInsertLine: true, isCoverageLine: true },
    ],
  });

  assert.match(missedVersion, /^huatuo:[0-9a-f]{16}$/);
  assert.notEqual(missedVersion, coveredVersion);
});

test('keeps per-file output inside outDir/results using safe path segments', () => {
  const output = createOutputPaths('/tmp/huatuo-output', '../apps/a/index.tsx');
  assert.equal(output.resultDir, path.join('/tmp/huatuo-output', 'results', 'apps', 'a', 'index.tsx'));
  assert.equal(output.report, path.join(output.resultDir, 'report.md'));
});

test('persists browser fetch payload including update, files and code artifacts', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huatuo-browser-payload-'));
  const args = {
    outDir,
    gitRepo: 'ecom/alliance-operation-mono',
    fromBranch: 'master',
    toBranch: 'feat/meego-7306602080-incentive-control',
    paths: [],
    limit: 0,
  };
  const payload = {
    source: 'huatuo-browser-fetch',
    generatedAt: '2026-06-26T00:00:00.000Z',
    query: {
      gitRepo: args.gitRepo,
      fromBranch: args.fromBranch,
      toBranch: args.toBranch,
      devicePlatform: '',
      deviceModel: '',
      appId: '',
      appVersion: '',
    },
    pathFilters: [],
    limit: 0,
    updateResponse: {
      requestedAt: '2026-06-26T00:00:00.000Z',
      url: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
      method: 'POST',
      status: 200,
      ok: true,
      finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
      parsed: { status: 0, message: 'ok', data: { coverRatio: '50%' } },
    },
    filesResponse: {
      requestedAt: '2026-06-26T00:00:01.000Z',
      url: 'https://huatuo.bytedance.net/api/jsCoverage/branch/files',
      method: 'GET',
      status: 200,
      ok: true,
      finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch/files',
      parsed: {
        status: 0,
        message: 'ok',
        data: {
          packageList: [
            {
              label: 'apps/a',
              children: [
                {
                  label: 'index.ts',
                  path: 'apps/a/index.ts',
                  insertLines: 2,
                  coverLines: 1,
                  coverRatio: '50%',
                },
              ],
            },
          ],
        },
      },
    },
    codeResponses: [
      {
        filePath: 'apps/a/index.ts',
        response: {
          requestedAt: '2026-06-26T00:00:02.000Z',
          url: 'https://huatuo.bytedance.net/api/jsCoverage/branch/code',
          method: 'GET',
          status: 200,
          ok: true,
          finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch/code',
          parsed: {
            status: 0,
            message: 'ok',
            data: [
              { lineNum: 1, code: 'covered();', isInsertLine: true, isCoverageLine: true },
              { lineNum: 2, code: 'missed();', isInsertLine: true, isCoverageLine: false },
            ],
          },
        },
      },
    ],
    skipped: [],
  };

  const latest = persistBrowserCoveragePayload({
    args,
    repoRoot: '/repo',
    gitRoot: '/repo',
    currentBranch: 'feature',
    payload,
  });

  assert.equal(latest.updateApi.responseStatus, 200);
  assert.equal(latest.results.length, 1);
  assert.match(latest.results[0].fileCoverageVersion, /^huatuo:[0-9a-f]{16}$/);
  assert.equal(latest.uncoveredFiles[0].fileCoverageVersion, latest.results[0].fileCoverageVersion);
  assert.equal(latest.totals.effectiveUncoveredInsertedRows, 1);
  assert(fs.existsSync(path.join(outDir, 'update-response.json')));
  assert(fs.existsSync(path.join(outDir, 'files-response.json')));
  assert(fs.existsSync(path.join(outDir, 'latest.json')));
  assert(fs.existsSync(path.join(outDir, 'report.md')));
  assert(fs.existsSync(path.join(outDir, 'results', 'apps', 'a', 'index.ts', 'report.md')));
});

test('persists chunked browser capture into the standard coverage report', () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huatuo-browser-capture-'));
  const args = parseArgs([
    '--outDir',
    outDir,
    '--gitRepo',
    'ecom/alliance-operation-mono',
    '--fromBranch',
    'master',
    '--toBranch',
    'feat/meego-7306602080-incentive-control',
  ]);
  const state = createBrowserCaptureState({
    args,
    repoRoot: '/repo',
    gitRoot: '/repo',
    currentBranch: 'feature',
    token: 'token-1',
  });

  receiveBrowserCaptureChunk(state, {
    type: 'meta',
    payload: {
      source: 'huatuo-browser-capture',
      generatedAt: '2026-06-26T00:00:00.000Z',
      query: {
        gitRepo: args.gitRepo,
        fromBranch: args.fromBranch,
        toBranch: args.toBranch,
        devicePlatform: '',
        deviceModel: '',
        appId: '',
        appVersion: '',
      },
      pathFilters: [],
      limit: 0,
    },
  });
  receiveBrowserCaptureChunk(state, {
    type: 'update',
    payload: {
      url: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
      method: 'POST',
      status: 200,
      ok: true,
      finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
      parsed: { data: { coverRatio: '50%' } },
    },
  });
  receiveBrowserCaptureChunk(state, {
    type: 'files',
    payload: {
      url: 'https://huatuo.bytedance.net/api/jsCoverage/branch/files',
      status: 200,
      ok: true,
      finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch/files',
      parsed: {
        data: {
          packageList: [
            {
              label: 'apps/a',
              children: [
                {
                  label: 'index.ts',
                  path: 'apps/a/index.ts',
                  insertLines: 2,
                  coverLines: 1,
                  coverRatio: '50%',
                },
              ],
            },
          ],
        },
      },
    },
  });
  receiveBrowserCaptureChunk(state, {
    type: 'requestFiles',
    payload: [
      {
        label: 'index.ts',
        path: 'apps/a/index.ts',
        insertLines: 2,
        coverLines: 1,
        coverRatio: '50%',
      },
    ],
  });
  receiveBrowserCaptureChunk(state, {
    type: 'code',
    payload: {
      index: 0,
      filePath: 'apps/a/index.ts',
      coverageFile: {
        label: 'index.ts',
        path: 'apps/a/index.ts',
        insertLines: 2,
        coverLines: 1,
        coverRatio: '50%',
      },
      response: {
        url: 'https://huatuo.bytedance.net/api/jsCoverage/branch/code',
        method: 'GET',
        status: 200,
        ok: true,
        finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch/code',
        parsed: {
          data: [
            { lineNum: 1, code: 'covered();', isInsertLine: true, isCoverageLine: true },
            { lineNum: 2, code: 'missed();', isInsertLine: true, isCoverageLine: false },
          ],
        },
      },
    },
  });
  const result = receiveBrowserCaptureChunk(state, {
    type: 'finalize',
    payload: { generatedAt: '2026-06-26T00:00:01.000Z' },
  });

  assert.equal(result.status, 'DONE');
  assert.equal(state.latest.updateApi.coverRatio, '50%');
  assert.equal(state.latest.totals.effectiveUncoveredInsertedRows, 1);
  assert(fs.existsSync(path.join(outDir, 'browser-payload.json')));
  assert(fs.existsSync(path.join(outDir, 'browser-capture', 'chunks', 'code-0001.json')));
  assert(fs.existsSync(path.join(outDir, 'latest.json')));
  assert(fs.existsSync(path.join(outDir, 'report.md')));
});

test('persists browser payload through collectCoverage without cookie', async () => {
  const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'huatuo-browser-collect-'));
  const payloadPath = path.join(outDir, 'payload.json');
  fs.writeFileSync(
    payloadPath,
    JSON.stringify({
      updateResponse: {
        url: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
        method: 'POST',
        status: 200,
        ok: true,
        finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch',
        parsed: { data: { coverRatio: '100%' } },
      },
      filesResponse: {
        url: 'https://huatuo.bytedance.net/api/jsCoverage/branch/files',
        status: 200,
        ok: true,
        finalUrl: 'https://huatuo.bytedance.net/api/jsCoverage/branch/files',
        parsed: { data: { packageList: [] } },
      },
      codeResponses: [],
      skipped: [],
    }),
  );
  const previousCookie = process.env.HUATUO_COOKIE;
  delete process.env.HUATUO_COOKIE;
  try {
    const latest = await collectCoverage(parseArgs(['--fromBrowserPayload', payloadPath, '--outDir', outDir]));

    assert.equal(latest.updateApi.coverRatio, '100%');
    assert(fs.existsSync(path.join(outDir, 'latest.json')));
  } finally {
    if (previousCookie === undefined) {
      delete process.env.HUATUO_COOKIE;
    } else {
      process.env.HUATUO_COOKIE = previousCookie;
    }
  }
});

test('dry run prints real Huatuo request metadata without cookie', async () => {
  const previousCookie = process.env.HUATUO_COOKIE;
  delete process.env.HUATUO_COOKIE;
  try {
    const result = await collectCoverage(parseArgs(['--dryRun', '--limit', '1']));

    assert.equal(result.dryRun, true);
    assert.equal(result.updateRequest.url, 'https://huatuo.bytedance.net/api/jsCoverage/branch');
    assert.match(result.filesUrl, /branch\/files/);
  } finally {
    if (previousCookie === undefined) {
      delete process.env.HUATUO_COOKIE;
    } else {
      process.env.HUATUO_COOKIE = previousCookie;
    }
  }
});

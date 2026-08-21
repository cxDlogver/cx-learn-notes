const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoRoot =
  '/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono';
const appRoot = path.join(repoRoot, 'apps/alliance-operation-content');
const ts = require(path.join(appRoot, 'node_modules/typescript'));

function loadTsModule(relativeSourcePath) {
  const sourcePath = path.join(appRoot, relativeSourcePath);
  const source = fs.readFileSync(sourcePath, 'utf8');
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2019,
    },
  }).outputText;
  const moduleObject = { exports: {} };
  new Function('exports', 'module', output)(moduleObject.exports, moduleObject);
  return moduleObject.exports;
}

const { getOptionalCodeResponseResultCode } = loadTsModule(
  'src/routes/content-activity/award/response-code.ts',
);
assert.equal(typeof getOptionalCodeResponseResultCode, 'function');

assert.equal(getOptionalCodeResponseResultCode({ st: 0 }), 0);
assert.equal(getOptionalCodeResponseResultCode({ code: 0 }), 0);
assert.equal(getOptionalCodeResponseResultCode({ st: 0, code: 0 }), 0);
assert.equal(getOptionalCodeResponseResultCode({ st: 0, code: 123 }), 123);
assert.equal(getOptionalCodeResponseResultCode({ st: 456, code: 0 }), 456);
assert.equal(getOptionalCodeResponseResultCode({ st: 456 }), 456);
assert.equal(getOptionalCodeResponseResultCode(undefined), -1);

const { normalizeCandidateIdsFilter } = loadTsModule(
  'src/routes/content-activity/award/remove-record-filter.ts',
);
assert.equal(typeof normalizeCandidateIdsFilter, 'function');
assert.equal(normalizeCandidateIdsFilter('123, 456，789  000'), '123,456,789,000');
assert.equal(normalizeCandidateIdsFilter(['123', ' ', '456']), '123,456');
assert.equal(normalizeCandidateIdsFilter('  '), undefined);
assert.equal(normalizeCandidateIdsFilter(undefined), undefined);

const utilsSource = fs.readFileSync(
  path.join(appRoot, 'src/routes/content-activity/award/utils.ts'),
  'utf8',
);
assert.match(utilsSource, /isAwardDeliverySuccessResponse[\s\S]*getOptionalCodeResponseResultCode\(res\) === 0/);
assert.match(utilsSource, /getAwardDeliveryResultCode[\s\S]*return getOptionalCodeResponseResultCode\(res\);/);

const batchSubmitModalSource = fs.readFileSync(
  path.join(
    appRoot,
    'src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx',
  ),
  'utf8',
);
assert.ok(
  batchSubmitModalSource.indexOf('await uploadNoAwardRemoveCandidates({') <
    batchSubmitModalSource.indexOf('submitResult = await submitSendAwardAuthors({'),
);
assert.ok(
  batchSubmitModalSource.lastIndexOf('await uploadNoAwardRemoveCandidates({') <
    batchSubmitModalSource.indexOf('submitResult = await submitSendAwardVideos({'),
);
assert.doesNotMatch(batchSubmitModalSource, /奖励已提交，请勿重复点击/);

const batchOperationBarSource = fs.readFileSync(
  path.join(
    appRoot,
    'src/routes/content-activity/award/components/send-award/batch-operation-bar/index.tsx',
  ),
  'utf8',
);
assert.match(batchOperationBarSource, /submitDeliveryVideoInfos = submitAwardVideoInfos\.filter/);
assert.match(batchOperationBarSource, /submitDeliveryAuthorInfos = submitAwardAuthorInfos\.filter/);
assert.match(batchOperationBarSource, /getVideoMissingRequiredIndexes\(submitDeliveryVideoInfos\)/);
assert.match(batchOperationBarSource, /getAuthorMissingRequiredIndexes\(submitDeliveryAuthorInfos\)/);
assert.match(batchOperationBarSource, /checkAuthorValidityConsistency\(submitDeliveryAuthorInfos\)/);

const manuallySubmitVideoStoreSource = fs.readFileSync(
  path.join(appRoot, 'src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts'),
  'utf8',
);
assert.match(manuallySubmitVideoStoreSource, /sendAOTCustomLog\(\{/);
assert.match(manuallySubmitVideoStoreSource, /custom_event_type: 'export_submit_hit_records_failed'/);
assert.match(manuallySubmitVideoStoreSource, /stage: 'api_fail'/);
assert.match(manuallySubmitVideoStoreSource, /stage: 'missing_lark_url'/);
assert.match(manuallySubmitVideoStoreSource, /stage: 'exception'/);
assert.match(manuallySubmitVideoStoreSource, /recordsCount: records\.length/);
assert.match(manuallySubmitVideoStoreSource, /error instanceof Error \? error\.message/);

const manuallySubmitVideosDrawerSource = fs.readFileSync(
  path.join(
    appRoot,
    'src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/index.tsx',
  ),
  'utf8',
);
assert.match(
  manuallySubmitVideosDrawerSource,
  /videoItems\.some\(\(video\) => manuallySubmitVideoStore\.isHitVideoItem\(video\)\)/,
);
assert.doesNotMatch(manuallySubmitVideosDrawerSource, /hasSubmitHitItems/);

const coinRemoveRecordTableSource = fs.readFileSync(
  path.join(appRoot, 'src/routes/content-activity/award/components/dou-coin-remove-record-table/index.tsx'),
  'utf8',
);
const couponRemoveRecordTableSource = fs.readFileSync(
  path.join(appRoot, 'src/routes/content-activity/award/components/dou-coupon-remove-record-table/index.tsx'),
  'utf8',
);
assert.match(coinRemoveRecordTableSource, /IDL uses `page` as page index and `page_num` as page size/);
assert.match(couponRemoveRecordTableSource, /IDL uses `page` as page index and `page_num` as page size/);

console.log('optional-code-response-check passed');

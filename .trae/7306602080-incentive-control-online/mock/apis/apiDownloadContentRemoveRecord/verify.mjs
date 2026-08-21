#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiDownloadContentRemoveRecord';
const DOWNLOAD_RULE_ID = 'R-BAM-DOWNLOAD-REMOVE-RECORD';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const MANIFEST_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'manifest.json');
const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const REPO_ROOT = path.resolve(WORKSPACE_ROOT, 'meego-7306602080/repos/alliance-operation-mono');
const BAM_FILE = path.join(REPO_ROOT, 'apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function ruleById(manifest, ruleId) {
  return manifest.rules.find((item) => item.ruleId === ruleId);
}

function verifyManifestBusinessContract(manifest, failures) {
  const rule = ruleById(manifest, DOWNLOAD_RULE_ID);
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);

  assert(Boolean(rule), `Missing rule ${DOWNLOAD_RULE_ID}`, failures);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.syntheticContract === true, `${DOWNLOAD_RULE_ID} must be marked syntheticContract.`, failures);
  assert(rule.caseIds.includes('TC-INT-MANUAL-EXPORT'), `${DOWNLOAD_RULE_ID} must cover manual export case.`, failures);
  assert(rule.caseIds.includes('TC-INT-BATCH-EXPORT'), `${DOWNLOAD_RULE_ID} must remain reusable for batch export case.`, failures);
  assert(rule.requestFields['records.0.remove_reason'] === '手动移除', 'First export record remove_reason must be 手动移除.', failures);
  assert(rule.requestFields['records.1.remove_reason'] === '命中【不激励】规则', 'Second export record remove_reason must be 命中【不激励】规则.', failures);
  assert(rule.responseContract?.source === 'synthetic_contract', `${DOWNLOAD_RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(rule.responseContract?.uiNaturalAttemptCount >= 2, `${DOWNLOAD_RULE_ID} must record two external-resource safety UI attempts.`, failures);
  assert(rule.realConnectArtifact?.status === 'synthetic_contract', `${DOWNLOAD_RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);

  const requestRecords = rule.realRequest?.body?.records ?? [];
  assert(Array.isArray(requestRecords) && requestRecords.length === 2, 'Synthetic export request must contain exactly two hit records.', failures);
  assert(requestRecords[0]?.author_id === '900001', 'First export record must carry author_id 900001.', failures);
  assert(requestRecords[0]?.item_id === '100001', 'First export record must carry item_id 100001.', failures);
  assert(requestRecords[0]?.item_name === '人工提报准入失败作品', 'First export record must carry item_name.', failures);
  assert(requestRecords[0]?.remove_reason === '手动移除', 'First export record must carry manual remove reason.', failures);
  assert(requestRecords[1]?.author_id === '900002', 'Second export record must carry author_id 900002.', failures);
  assert(requestRecords[1]?.item_id === '100002', 'Second export record must carry item_id 100002.', failures);
  assert(requestRecords[1]?.item_name === '人工提报不激励命中作品', 'Second export record must carry item_name.', failures);
  assert(requestRecords[1]?.remove_reason === '命中【不激励】规则', 'Second export record must carry not-incentive remove reason.', failures);
  assert(requestRecords[1]?.penalty_reason === '历史违规命中不激励规则', 'Second export record must carry latest penalty_reason.', failures);
  assert(!requestRecords.some((record) => record?.item_id === '100003' || record?.author_id === '900003'), 'Valid record 100003/900003 must not be exported.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  assert(mockedResponse.st === 0, 'Synthetic export response st must be 0.', failures);
  assert(mockedResponse.code === 0, 'Synthetic export response code must be 0.', failures);
  assert(typeof mockedResponse.data?.lark_url === 'string' && mockedResponse.data.lark_url.startsWith('https://'), 'Synthetic export response must contain an https lark_url.', failures);
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(DOWNLOAD_RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === DOWNLOAD_RULE_ID, 'Synthetic export request must match R-BAM-DOWNLOAD-REMOVE-RECORD.', failures);
  assert(fixture.syntheticContract === true, 'Runtime fixture must be synthetic.', failures);
  assert(fixture.mockedResponse?.st === 0 && fixture.mockedResponse?.code === 0, 'Runtime fixture must return success.', failures);
  assert(Boolean(fixture.mockedResponse?.data?.lark_url), 'Runtime fixture must return data.lark_url.', failures);

  const singleRecord = matchRule({
    records: [
      { author_id: '900001', item_id: '100001', remove_reason: '手动移除' },
    ],
  }, manifest);
  assert(singleRecord.ruleId === DEFAULT_RULE_ID, 'Single-record export request must fall back to DEFAULT_NOOP.', failures);

  const wrongSecondReason = matchRule({
    records: [
      { author_id: '900001', item_id: '100001', remove_reason: '手动移除' },
      { author_id: '900002', item_id: '100002', remove_reason: '手动移除' },
    ],
  }, manifest);
  assert(wrongSecondReason.ruleId === DEFAULT_RULE_ID, 'Wrong second remove_reason must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain apiDownloadContentRemoveRecord patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain apiDownloadContentRemoveRecord patch end marker.', failures);
  assert(content.includes(DOWNLOAD_RULE_ID), `BAM patch must include ${DOWNLOAD_RULE_ID}.`, failures);
  assert(content.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'BAM patch must emit [BAM_MOCK_SYNTHETIC_CONTRACT].', failures);
  assert(content.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(content.includes('return Promise.resolve(__bamMockSyntheticContract'), 'Synthetic download rule must not call original backend request on match.', failures);
  assert(content.includes("const data = { records: _req['records'] };"), 'BAM wrapper must keep forwarding records from request to POST data.', failures);
}

function main() {
  const failures = [];
  const manifest = readJson(MANIFEST_PATH);
  verifyManifestBusinessContract(manifest, failures);
  verifyDerivedRuntime(manifest, failures);
  verifyBamPatch(failures);

  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('apiDownloadContentRemoveRecord supplemental mock verification passed.');
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperations,
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiGetDouPlusCoinRemoveRecord';
const DEFAULT_LIST_RULE_ID = 'R-BAM-COIN-REMOVE-DEFAULT';
const FILTER_RULE_ID = 'R-BAM-COIN-REMOVE-FILTER';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const ABSENT_MATCHER_VALUE = '__BAM_MOCK_ABSENT__';
const MANIFEST_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'manifest.json');
const WORKSPACE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../..');
const REPO_ROOT = path.resolve(WORKSPACE_ROOT, 'meego-7306602080/repos/alliance-operation-mono');
const BAM_FILE = path.join(REPO_ROOT, 'apps/alliance-operation-content/src/bam/ecom.buyin.admin_api/index.ts');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (left && right && typeof left === 'object' && typeof right === 'object') {
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => key === rightKeys[index] && deepEqual(left[key], right[key]));
  }
  return false;
}

function assert(condition, message, failures) {
  if (!condition) failures.push(message);
}

function ruleById(manifest, ruleId) {
  return manifest.rules.find((item) => item.ruleId === ruleId);
}

function verifyDefaultListRule(manifest, failures) {
  const rule = ruleById(manifest, DEFAULT_LIST_RULE_ID);
  assert(Boolean(rule), `Missing rule ${DEFAULT_LIST_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Default list rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.caseIds.includes('TC-UI-COIN-REMOVE-PAGE'), 'Default list rule must cover TC-UI-COIN-REMOVE-PAGE.', failures);
  assert(rule.requestFields.page === 1 && rule.requestFields.page_num === 20, 'Default list rule must match page=1,page_num=20.', failures);
  assert(rule.requestFields.candidate_ids === ABSENT_MATCHER_VALUE, 'Default list rule must require absent candidate_ids.', failures);
  assert(rule.requestFields.operator_id === ABSENT_MATCHER_VALUE, 'Default list rule must require absent operator_id.', failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 3, 'Default list rule must use three mockOperations.', failures);
  assert(rule.mockOperations.some((operation) => operation.path === 'data.records'), 'Default list rule must set data.records.', failures);
  assert(rule.mockOperations.some((operation) => operation.path === 'data.total'), 'Default list rule must set data.total.', failures);
  assert(rule.mockOperations.some((operation) => operation.path === 'data.has_more'), 'Default list rule must set data.has_more.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const firstRecord = mockedResponse.data?.records?.[0];
  assert(Boolean(firstRecord?.record_id), 'Default list mocked first record must have record_id.', failures);
  assert(Boolean(firstRecord?.item_card?.item_model?.item_id), 'Default list mocked first record must have item_card.item_model.item_id.', failures);
  assert(Boolean(firstRecord?.item_card?.item_model?.base_model?.item_info?.base_info?.title), 'Default list mocked first record must have title.', failures);
  assert(Boolean(firstRecord?.remove_reason), 'Default list mocked first record must have remove_reason.', failures);
  assert(Boolean(firstRecord?.operator_id), 'Default list mocked first record must have operator_id.', failures);
  assert(typeof firstRecord?.remove_time === 'number', 'Default list mocked first record must have numeric remove_time.', failures);
  assert(mockedResponse.data?.total === 40, 'Default list mocked response total must be 40.', failures);
  assert(mockedResponse.data?.has_more === true, 'Default list mocked response has_more must be true.', failures);
}

function verifyFilterRule(manifest, failures) {
  const rule = ruleById(manifest, FILTER_RULE_ID);
  assert(Boolean(rule), `Missing rule ${FILTER_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes(FILTER_RULE_ID), 'Filter rule verifyAssertion must name R-BAM-COIN-REMOVE-FILTER.', failures);
  assert(rule.caseIds.includes('TC-DATA-COIN-FILTER-SCHEMA'), 'Filter rule must cover TC-DATA-COIN-FILTER-SCHEMA.', failures);
  assert(rule.requestFields.candidate_ids === '100001,100002', 'Filter rule candidate_ids must match 100001,100002.', failures);
  assert(rule.requestFields.operator_id === '6068830', 'Filter rule operator_id must match 6068830.', failures);
  assert(rule.requestFields.page === 1 && rule.requestFields.page_num === 20, 'Filter rule must match page=1,page_num=20.', failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 3, 'Filter rule must use three mockOperations.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const firstRecord = mockedResponse.data?.records?.[0];
  assert(mockedResponse.data?.records?.length === 1, 'Filter mocked response must contain exactly one record.', failures);
  assert(firstRecord?.item_card?.item_model?.item_id === '100001', 'Filter mocked first record must target item_id 100001.', failures);
  assert(firstRecord?.operator_id === '6068830', 'Filter mocked first record operator_id must be 6068830.', failures);
  assert(firstRecord?.remove_reason === '筛选命中【不激励】规则', 'Filter mocked first record must use filtered remove_reason.', failures);
  assert(mockedResponse.data?.total === 1, 'Filter mocked response total must be 1.', failures);
  assert(mockedResponse.data?.has_more === false, 'Filter mocked response has_more must be false.', failures);
}

function verifyManifestBusinessContract(manifest, failures) {
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === DEFAULT_LIST_RULE_ID), 'ruleMatchKeys must include default list rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === FILTER_RULE_ID), 'ruleMatchKeys must include filter rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === DEFAULT_RULE_ID && row.isDefault === true), 'ruleMatchKeys must include DEFAULT_NOOP as default.', failures);
  for (const key of ['page', 'page_num', 'candidate_ids', 'operator_id']) {
    assert(manifest.requestFieldsAffectingRules.includes(key), `requestFieldsAffectingRules must include ${key}.`, failures);
  }
  verifyDefaultListRule(manifest, failures);
  verifyFilterRule(manifest, failures);
}

function verifyFixture(ruleId, failures) {
  const manifest = readJson(MANIFEST_PATH);
  const fixture = loadRuntimeFixture(ruleId, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === ruleId, `${ruleId} UI request must match ${ruleId}.`, failures);
  const actualMocked = applyOperations(fixture.realResponse, fixture.operations);
  assert(deepEqual(actualMocked, fixture.expectedMockedResponse), `${ruleId} mockOperations applied to real response must equal response.mocked.json.`, failures);
}

function verifyDerivedRuntime(failures) {
  const manifest = readJson(MANIFEST_PATH);
  verifyFixture(DEFAULT_LIST_RULE_ID, failures);
  verifyFixture(FILTER_RULE_ID, failures);

  const filteredRequest = {
    page: 1,
    page_num: 20,
    candidate_ids: '100001,100002',
    operator_id: '6068830',
  };
  const filterMatch = matchRule(filteredRequest, manifest);
  assert(filterMatch.ruleId === FILTER_RULE_ID, 'Filtered request must match R-BAM-COIN-REMOVE-FILTER, not default list rule.', failures);

  const defaultMatch = matchRule({ page: 1, page_num: 20 }, manifest);
  assert(defaultMatch.ruleId === DEFAULT_LIST_RULE_ID, 'Unfiltered first page request must match narrowed default list rule.', failures);

  const noHit = matchRule({ page: 2, page_num: 20 }, manifest);
  assert(noHit.ruleId === DEFAULT_RULE_ID, 'page=2,page_num=20 must fall back to default noop.', failures);

  const partialFilter = matchRule({ page: 1, page_num: 20, operator_id: '6068830' }, manifest);
  assert(partialFilter.ruleId === DEFAULT_RULE_ID, 'Requests with only operator_id must not match narrowed default list rule.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain patch end marker.', failures);
  assert(content.includes(DEFAULT_LIST_RULE_ID), `BAM patch must include ${DEFAULT_LIST_RULE_ID}.`, failures);
  assert(content.includes(FILTER_RULE_ID), `BAM patch must include ${FILTER_RULE_ID}.`, failures);
  assert(content.includes(ABSENT_MATCHER_VALUE), 'BAM patch must include absent matcher sentinel.', failures);
  assert(content.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(content.includes('return EcomBuyinAdminApiOptions.request({ url, method, params }, options).then'), 'BAM patch must call original request before applying operations.', failures);
  assert(!/Promise\.resolve\s*\(\s*__bamMock(?:Match|Default)?(?:Response|\.response)\s*\)/.test(content), 'BAM patch must not directly resolve a static mocked response.', failures);
}

function main() {
  const failures = [];
  const manifest = readJson(MANIFEST_PATH);
  verifyManifestBusinessContract(manifest, failures);
  verifyDerivedRuntime(failures);
  verifyBamPatch(failures);

  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('apiGetDouPlusCoinRemoveRecord supplemental mock verification passed.');
}

main();

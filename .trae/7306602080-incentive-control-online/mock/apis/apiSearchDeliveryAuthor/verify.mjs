#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperations,
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiSearchDeliveryAuthor';
const SEARCH_CANDIDATE_RULE_ID = 'R-BAM-SEARCH-CANDIDATE-COUPON-PENALTY';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const PENALTY_AUTHOR_ID = '800001';
const RELIEVED_AUTHOR_ID = '800002';
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

function verifySearchCandidateRule(manifest, failures) {
  const rule = ruleById(manifest, SEARCH_CANDIDATE_RULE_ID);
  assert(Boolean(rule), `Missing rule ${SEARCH_CANDIDATE_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'SearchCandidate rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes(SEARCH_CANDIDATE_RULE_ID), `SearchCandidate rule verifyAssertion must name ${SEARCH_CANDIDATE_RULE_ID}.`, failures);
  assert(
    rule.caseIds.includes('TC-INT-AWARD-COUPON-PENALTY__search_candidate_restore'),
    'SearchCandidate rule must cover TC-INT-AWARD-COUPON-PENALTY__search_candidate_restore.',
    failures,
  );
  assert(
    rule.caseIds.includes('TC-INT-AWARD-COUPON-RELIEVED__search_candidate_restore'),
    'SearchCandidate rule must cover TC-INT-AWARD-COUPON-RELIEVED__search_candidate_restore.',
    failures,
  );
  assert(rule.requestFields.activity_id === '7655304206886322458', 'SearchCandidate rule activity_id must match current activity.', failures);
  assert(rule.requestFields.config_id === '7655304206886355226', 'SearchCandidate rule config_id must match DOU+ coupon config two.', failures);
  assert(rule.requestFields.candidate_pool_type === 1, 'SearchCandidate rule candidate_pool_type must be 1.', failures);
  assert(rule.requestFields.award_period === 1, 'SearchCandidate rule award_period must be 1.', failures);
  assert(rule.requestFields.page_no === 1, 'SearchCandidate rule page_no must be 1.', failures);
  assert(rule.requestFields.page_size === 50, 'SearchCandidate rule page_size must be 50.', failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 7, 'SearchCandidate rule must use seven mockOperations.', failures);
  for (const expectedPath of ['st', 'code', 'msg', 'data.total_num', 'data.candidate_num', 'data.delivery_author_info', 'data.has_more']) {
    assert(rule.mockOperations.some((operation) => operation.path === expectedPath), `SearchCandidate rule must set ${expectedPath}.`, failures);
  }

  const realResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.realResponsePath));
  assert(realResponse.st === 0, 'SearchCandidate real response baseline st must be 0.', failures);
  assert(realResponse.code === 0, 'SearchCandidate real response baseline code must be 0.', failures);
  assert(realResponse.msg === '', 'SearchCandidate real response baseline msg must be empty.', failures);
  assert(realResponse.data?.total_num === 0, 'SearchCandidate real response baseline total_num must be 0.', failures);
  assert(realResponse.data?.candidate_num === 0, 'SearchCandidate real response baseline candidate_num must be 0.', failures);
  assert(realResponse.data?.has_more === false, 'SearchCandidate real response baseline has_more must be false.', failures);
  assert(!Array.isArray(realResponse.data?.delivery_author_info), 'SearchCandidate real response baseline must not already contain delivery_author_info.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const rows = mockedResponse.data?.delivery_author_info ?? [];
  const firstRow = rows[0];
  const relievedRow = rows.find((row) => row?.author_info?.author_id === RELIEVED_AUTHOR_ID);
  const config = firstRow?.delivery_config ?? {};
  const relievedConfig = relievedRow?.delivery_config ?? {};

  assert(mockedResponse.st === 0, 'SearchCandidate mocked response st must be 0.', failures);
  assert(mockedResponse.code === 0, 'SearchCandidate mocked response code must be 0.', failures);
  assert(mockedResponse.msg === '', 'SearchCandidate mocked response msg must be empty.', failures);
  assert(rows.length === 2, 'SearchCandidate mocked response must contain exactly two delivery_author_info rows.', failures);
  assert(mockedResponse.data?.total_num === 2, 'SearchCandidate mocked response total_num must be 2.', failures);
  assert(mockedResponse.data?.candidate_num === 2, 'SearchCandidate mocked response candidate_num must be 2.', failures);
  assert(mockedResponse.data?.has_more === false, 'SearchCandidate mocked response has_more must be false.', failures);
  assert(firstRow?.author_info?.author_id === PENALTY_AUTHOR_ID, `SearchCandidate first mocked row must restore author ${PENALTY_AUTHOR_ID}.`, failures);
  assert(firstRow?.if_delivery === true, 'SearchCandidate mocked row must be deliverable so checkbox is enabled.', failures);
  assert(firstRow?.if_delivered === false, 'SearchCandidate mocked row must not be marked as already delivered.', failures);
  assert(firstRow?.rank === 1, 'SearchCandidate mocked row rank must be 1 for final request mapping.', failures);
  assert(config.coupon_type === 1, 'SearchCandidate mocked author coupon_type must be Amount=1.', failures);
  assert(config.coupon_config?.threshold === 0, 'SearchCandidate mocked author coupon threshold must be 0 fen.', failures);
  assert(config.coupon_config?.freeAmount === 5000, 'SearchCandidate mocked author freeAmount must be 5000 fen.', failures);
  assert(config.num === 1, 'SearchCandidate mocked author coupon num must be 1.', failures);
  assert(config.reiceve_start_time === 1783440000, 'SearchCandidate mocked author receive start must be filled.', failures);
  assert(config.reiceve_end_time === 1783526399, 'SearchCandidate mocked author receive end must be filled.', failures);
  assert(config.use_time_type === 1, 'SearchCandidate mocked author use_time_type must be TimeRange=1.', failures);
  assert(config.use_start_time === 1783440000, 'SearchCandidate mocked author use start must be filled.', failures);
  assert(config.use_end_time === 1784131199, 'SearchCandidate mocked author use end must be filled.', failures);
  assert(Boolean(relievedRow), `SearchCandidate mocked response must include relieved author ${RELIEVED_AUTHOR_ID}.`, failures);
  assert(relievedRow?.if_delivery === true, 'SearchCandidate relieved row must be deliverable so checkbox is enabled.', failures);
  assert(relievedRow?.if_delivered === false, 'SearchCandidate relieved row must not be marked as already delivered.', failures);
  assert(relievedRow?.rank === 2, 'SearchCandidate relieved row rank must be 2 for final request mapping.', failures);
  assert(relievedConfig.coupon_type === 1, 'SearchCandidate relieved author coupon_type must be Amount=1.', failures);
  assert(relievedConfig.coupon_config?.threshold === 0, 'SearchCandidate relieved author coupon threshold must be 0 fen.', failures);
  assert(relievedConfig.coupon_config?.freeAmount === 5000, 'SearchCandidate relieved author freeAmount must be 5000 fen.', failures);
  assert(relievedConfig.num === 1, 'SearchCandidate relieved author coupon num must be 1.', failures);
  assert(relievedConfig.reiceve_start_time === 1783440000, 'SearchCandidate relieved author receive start must be filled.', failures);
  assert(relievedConfig.reiceve_end_time === 1783526399, 'SearchCandidate relieved author receive end must be filled.', failures);
  assert(relievedConfig.use_time_type === 1, 'SearchCandidate relieved author use_time_type must be TimeRange=1.', failures);
  assert(relievedConfig.use_start_time === 1783440000, 'SearchCandidate relieved author use start must be filled.', failures);
  assert(relievedConfig.use_end_time === 1784131199, 'SearchCandidate relieved author use end must be filled.', failures);
}

function verifyManifestBusinessContract(manifest, failures) {
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === SEARCH_CANDIDATE_RULE_ID), 'ruleMatchKeys must include coupon SearchCandidate restore rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === DEFAULT_RULE_ID && row.isDefault === true), 'ruleMatchKeys must include DEFAULT_NOOP as default.', failures);
  for (const key of ['activity_id', 'config_id', 'candidate_pool_type', 'award_period', 'page_no', 'page_size']) {
    assert(manifest.requestFieldsAffectingRules.includes(key), `requestFieldsAffectingRules must include ${key}.`, failures);
  }
  verifySearchCandidateRule(manifest, failures);
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
  verifyFixture(SEARCH_CANDIDATE_RULE_ID, failures);

  const exact = matchRule({
    activity_id: '7655304206886322458',
    config_id: '7655304206886355226',
    candidate_pool_type: 1,
    award_period: 1,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(exact.ruleId === SEARCH_CANDIDATE_RULE_ID, 'Exact DOU+ coupon SearchCandidate request must match restore rule.', failures);

  const wrongConfig = matchRule({
    activity_id: '7655304206886322458',
    config_id: '7655304206886338842',
    candidate_pool_type: 1,
    award_period: 1,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(wrongConfig.ruleId === DEFAULT_RULE_ID, 'Different config_id must fall back to DEFAULT_NOOP.', failures);

  const wrongAwardPeriod = matchRule({
    activity_id: '7655304206886322458',
    config_id: '7655304206886355226',
    candidate_pool_type: 1,
    award_period: 2,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(wrongAwardPeriod.ruleId === DEFAULT_RULE_ID, 'Different award_period must fall back to DEFAULT_NOOP.', failures);

  const wrongPage = matchRule({
    activity_id: '7655304206886322458',
    config_id: '7655304206886355226',
    candidate_pool_type: 1,
    award_period: 1,
    page_no: 2,
    page_size: 50,
  }, manifest);
  assert(wrongPage.ruleId === DEFAULT_RULE_ID, 'Different page_no must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain apiSearchDeliveryAuthor patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain apiSearchDeliveryAuthor patch end marker.', failures);
  assert(content.includes(SEARCH_CANDIDATE_RULE_ID), `BAM patch must include ${SEARCH_CANDIDATE_RULE_ID}.`, failures);
  assert(content.includes(PENALTY_AUTHOR_ID), `BAM patch must include coupon penalty author ${PENALTY_AUTHOR_ID}.`, failures);
  assert(content.includes(RELIEVED_AUTHOR_ID), `BAM patch must include coupon relieved author ${RELIEVED_AUTHOR_ID}.`, failures);
  assert(content.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(content.includes("return EcomBuyinAdminApiOptions.request({ url, method, params }, options).then"), 'Read-only author search rule must call the original backend request before applying operations.', failures);
  assert(content.includes("award_period: _req['award_period']"), 'BAM wrapper must keep forwarding award_period from request params.', failures);
  assert(content.includes("candidate_pool_type: _req['candidate_pool_type']"), 'BAM wrapper must keep forwarding candidate_pool_type from request params.', failures);
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
  console.log('apiSearchDeliveryAuthor supplemental mock verification passed.');
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperations,
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiSearchDeliveryItems';
const MANUAL_HIT_RULE_ID = 'R-BAM-MANUAL-SEARCH-HIT';
const SEARCH_CANDIDATE_RULE_ID = 'R-BAM-SEARCH-CANDIDATE-COIN-PENALTY';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
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

function itemIdOf(row) {
  return row?.item_card?.item_model?.item_id;
}

function rowsByItemId(rows) {
  return new Map((rows ?? []).map((row) => [itemIdOf(row), row]));
}

function verifyManualHitRule(manifest, failures) {
  const rule = ruleById(manifest, MANUAL_HIT_RULE_ID);
  assert(Boolean(rule), `Missing rule ${MANUAL_HIT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Manual hit rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes(MANUAL_HIT_RULE_ID), `Manual hit rule verifyAssertion must name ${MANUAL_HIT_RULE_ID}.`, failures);
  assert(rule.caseIds.includes('TC-UI-MANUAL-HIT-PAGE'), 'Manual hit rule must cover TC-UI-MANUAL-HIT-PAGE.', failures);
  assert(rule.caseIds.includes('TC-CELL-MANUAL-HIT-STATUS'), 'Manual hit rule must cover TC-CELL-MANUAL-HIT-STATUS.', failures);
  assert(rule.caseIds.includes('TC-INT-MANUAL-SUBMIT-GUARD'), 'Manual hit rule must cover TC-INT-MANUAL-SUBMIT-GUARD.', failures);
  assert(rule.caseIds.includes('TC-TRACK-MANUAL-HIT-EXPOSE'), 'Manual hit rule must cover TC-TRACK-MANUAL-HIT-EXPOSE.', failures);
  assert(rule.requestFields.item_ids === '100001,100002,100003', 'Manual hit rule item_ids must match 100001,100002,100003.', failures);
  assert(rule.requestFields.candidate_pool_type === 2, 'Manual hit rule candidate_pool_type must be 2.', failures);
  assert(rule.requestFields.page_no === 1, 'Manual hit rule page_no must be 1.', failures);
  assert(rule.requestFields.page_size === 50, 'Manual hit rule page_size must be 50.', failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 4, 'Manual hit rule must use four mockOperations.', failures);
  for (const expectedPath of ['data.item_info', 'data.total_num', 'data.candidate_num', 'data.has_more']) {
    assert(rule.mockOperations.some((operation) => operation.path === expectedPath), `Manual hit rule must set ${expectedPath}.`, failures);
  }

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const rows = mockedResponse.data?.item_info ?? [];
  const byItemId = rowsByItemId(rows);
  const invalidRow = byItemId.get('100001');
  const notIncentiveRow = byItemId.get('100002');
  const validRow = byItemId.get('100003');

  assert(rows.length === 3, 'Manual hit mocked response must contain exactly three item_info rows.', failures);
  assert(mockedResponse.data?.total_num === 3, 'Manual hit mocked response total_num must be 3.', failures);
  assert(mockedResponse.data?.candidate_num === 1, 'Manual hit mocked response candidate_num must be 1.', failures);
  assert(mockedResponse.data?.has_more === false, 'Manual hit mocked response has_more must be false.', failures);
  assert(invalidRow?.if_satisfy_delivery_rules === false, 'Item 100001 must be an invalid hit row.', failures);
  assert(invalidRow?.if_not_incentive === false, 'Item 100001 must not be marked as not-incentive.', failures);
  assert(invalidRow?.item_card?.item_author_info?.author_id === '900001', 'Item 100001 must carry author_id 900001 for export records.', failures);
  assert(notIncentiveRow?.if_satisfy_delivery_rules === true, 'Item 100002 must satisfy delivery rules before not-incentive evaluation.', failures);
  assert(notIncentiveRow?.if_not_incentive === true, 'Item 100002 must be marked as not-incentive.', failures);
  assert(notIncentiveRow?.item_card?.item_author_info?.author_id === '900002', 'Item 100002 must carry author_id 900002 for export records.', failures);
  assert(
    Array.isArray(notIncentiveRow?.not_incentive_reason)
      && notIncentiveRow.not_incentive_reason.includes('历史违规命中不激励规则'),
    'Item 100002 must carry not_incentive_reason.',
    failures,
  );
  assert(validRow?.if_delivery === true, 'Item 100003 must be retained as deliverable.', failures);
  assert(validRow?.if_satisfy_delivery_rules === true, 'Item 100003 must satisfy delivery rules.', failures);
  assert(validRow?.if_not_incentive === false, 'Item 100003 must not be not-incentive.', failures);
  assert(validRow?.item_card?.item_author_info?.author_id === '900003', 'Item 100003 must carry author_id 900003 so negative export checks can distinguish the valid row.', failures);
}

function verifySearchCandidateRule(manifest, failures) {
  const rule = ruleById(manifest, SEARCH_CANDIDATE_RULE_ID);
  assert(Boolean(rule), `Missing rule ${SEARCH_CANDIDATE_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'SearchCandidate rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes(SEARCH_CANDIDATE_RULE_ID), `SearchCandidate rule verifyAssertion must name ${SEARCH_CANDIDATE_RULE_ID}.`, failures);
  assert(rule.verifyAssertion.includes('effective_time'), 'SearchCandidate rule verifyAssertion must preserve the no-effective_time setup boundary.', failures);
  assert(
    rule.caseIds.includes('TC-INT-AWARD-COIN-PENALTY__search_candidate_restore'),
    'SearchCandidate rule must cover TC-INT-AWARD-COIN-PENALTY__search_candidate_restore.',
    failures,
  );
  assert(
    rule.caseIds.includes('TC-INT-AWARD-COIN-RELIEVED__search_candidate_restore'),
    'SearchCandidate rule must cover TC-INT-AWARD-COIN-RELIEVED__search_candidate_restore.',
    failures,
  );
  assert(rule.requestFields.activity_id === '7655304206886322458', 'SearchCandidate rule activity_id must match current DOU+ coin activity.', failures);
  assert(rule.requestFields.config_id === '7655304206886338842', 'SearchCandidate rule config_id must match current DOU+ coin config.', failures);
  assert(rule.requestFields.candidate_pool_type === 1, 'SearchCandidate rule candidate_pool_type must be 1.', failures);
  assert(rule.requestFields.page_no === 1, 'SearchCandidate rule page_no must be 1.', failures);
  assert(rule.requestFields.page_size === 50, 'SearchCandidate rule page_size must be 50.', failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 7, 'SearchCandidate rule must use seven mockOperations.', failures);
  for (const expectedPath of ['st', 'code', 'msg', 'data.total_num', 'data.candidate_num', 'data.item_info', 'data.has_more']) {
    assert(rule.mockOperations.some((operation) => operation.path === expectedPath), `SearchCandidate rule must set ${expectedPath}.`, failures);
  }

  const realResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.realResponsePath));
  assert(realResponse.code === 10001602, 'SearchCandidate real response baseline must remain the natural query failure.', failures);
  assert(realResponse.msg === '查询发放奖励失败', 'SearchCandidate real response baseline message must remain query failure.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const rows = mockedResponse.data?.item_info ?? [];
  const firstRow = rows[0];
  const firstDeliveryConfig = firstRow?.delivery_config ?? {};
  const relievedRow = rows.find((row) => itemIdOf(row) === '700002');
  const relievedDeliveryConfig = relievedRow?.delivery_config ?? {};

  assert(mockedResponse.code === 0, 'SearchCandidate mocked response code must be 0.', failures);
  assert(mockedResponse.st === 0, 'SearchCandidate mocked response st must be 0.', failures);
  assert(mockedResponse.msg === '', 'SearchCandidate mocked response msg must be empty.', failures);
  assert(rows.length === 2, 'SearchCandidate mocked response must contain exactly two item_info rows.', failures);
  assert(mockedResponse.data?.total_num === 2, 'SearchCandidate mocked response total_num must be 2.', failures);
  assert(mockedResponse.data?.candidate_num === 2, 'SearchCandidate mocked response candidate_num must be 2.', failures);
  assert(mockedResponse.data?.has_more === false, 'SearchCandidate mocked response has_more must be false.', failures);
  assert(itemIdOf(firstRow) === '7655364163166869874', 'SearchCandidate row must restore candidate item 7655364163166869874.', failures);
  assert(firstRow?.if_delivery === true, 'SearchCandidate row must be deliverable so the UI can open modify-config.', failures);
  assert(firstRow?.rank === 1, 'SearchCandidate row rank must remain 1 for setup and final award assertions.', failures);
  assert(firstRow?.if_satisfy_delivery_rules === true, 'SearchCandidate row must satisfy delivery rules.', failures);
  assert(firstRow?.if_not_incentive === false, 'SearchCandidate row must not be a not-incentive row.', failures);
  assert(firstDeliveryConfig.delivery_amount === 5000, 'SearchCandidate penalty delivery_amount must be 5000.', failures);
  assert(firstDeliveryConfig.delivery_duration === 7200, 'SearchCandidate penalty delivery_duration must be 7200.', failures);
  assert(firstDeliveryConfig.target_likes === 44, 'SearchCandidate penalty target_likes must be 44.', failures);
  assert(firstDeliveryConfig.target_audience === 1, 'SearchCandidate penalty target_audience must be 1.', failures);
  assert(!Object.hasOwn(firstDeliveryConfig, 'effective_time'), 'SearchCandidate penalty row must not prefill delivery_config.effective_time.', failures);
  assert(Boolean(relievedRow), 'SearchCandidate mocked response must include relieved candidate item 700002.', failures);
  assert(relievedRow?.if_delivery === true, 'SearchCandidate relieved row must be deliverable.', failures);
  assert(relievedRow?.rank === 2, 'SearchCandidate relieved row rank must be 2.', failures);
  assert(relievedDeliveryConfig.delivery_amount === 5000, 'SearchCandidate relieved delivery_amount must be 5000.', failures);
  assert(relievedDeliveryConfig.delivery_duration === 7200, 'SearchCandidate relieved delivery_duration must be 7200.', failures);
  assert(relievedDeliveryConfig.target_likes === 44, 'SearchCandidate relieved target_likes must be 44.', failures);
  assert(relievedDeliveryConfig.target_audience === 1, 'SearchCandidate relieved target_audience must be 1.', failures);
  assert(relievedDeliveryConfig.effective_time === 1783656000, 'SearchCandidate relieved row must prefill effective_time for batch submit.', failures);
}

function verifyManifestBusinessContract(manifest, failures) {
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === MANUAL_HIT_RULE_ID), 'ruleMatchKeys must include manual hit rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === SEARCH_CANDIDATE_RULE_ID), 'ruleMatchKeys must include SearchCandidate restore rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === DEFAULT_RULE_ID && row.isDefault === true), 'ruleMatchKeys must include DEFAULT_NOOP as default.', failures);
  for (const key of ['activity_id', 'config_id', 'item_ids', 'candidate_pool_type', 'page_no', 'page_size']) {
    assert(manifest.requestFieldsAffectingRules.includes(key), `requestFieldsAffectingRules must include ${key}.`, failures);
  }
  verifyManualHitRule(manifest, failures);
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
  verifyFixture(MANUAL_HIT_RULE_ID, failures);
  verifyFixture(SEARCH_CANDIDATE_RULE_ID, failures);

  const matched = matchRule({
    item_ids: '100001,100002,100003',
    candidate_pool_type: 2,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(matched.ruleId === MANUAL_HIT_RULE_ID, 'Exact manual submit request must match R-BAM-MANUAL-SEARCH-HIT.', failures);

  const wrongItems = matchRule({
    item_ids: '100001,100002',
    candidate_pool_type: 2,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(wrongItems.ruleId === DEFAULT_RULE_ID, 'Different item_ids must fall back to DEFAULT_NOOP.', failures);

  const wrongCandidatePool = matchRule({
    item_ids: '100001,100002,100003',
    candidate_pool_type: 1,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(wrongCandidatePool.ruleId === DEFAULT_RULE_ID, 'Different candidate_pool_type must fall back to DEFAULT_NOOP.', failures);

  const wrongPage = matchRule({
    item_ids: '100001,100002,100003',
    candidate_pool_type: 2,
    page_no: 2,
    page_size: 50,
  }, manifest);
  assert(wrongPage.ruleId === DEFAULT_RULE_ID, 'Different page_no must fall back to DEFAULT_NOOP.', failures);

  const searchCandidate = matchRule({
    activity_id: '7655304206886322458',
    config_id: '7655304206886338842',
    candidate_pool_type: 1,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(searchCandidate.ruleId === SEARCH_CANDIDATE_RULE_ID, 'Exact DOU+ coin SearchCandidate request must match R-BAM-SEARCH-CANDIDATE-COIN-PENALTY.', failures);

  const wrongConfig = matchRule({
    activity_id: '7655304206886322458',
    config_id: 'different-config',
    candidate_pool_type: 1,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(wrongConfig.ruleId === DEFAULT_RULE_ID, 'Different config_id must fall back to DEFAULT_NOOP.', failures);

  const broadCandidatePool = matchRule({
    candidate_pool_type: 1,
    page_no: 1,
    page_size: 50,
  }, manifest);
  assert(broadCandidatePool.ruleId === DEFAULT_RULE_ID, 'Candidate pool request without activity/config must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain patch end marker.', failures);
  assert(content.includes(MANUAL_HIT_RULE_ID), `BAM patch must include ${MANUAL_HIT_RULE_ID}.`, failures);
  assert(content.includes(SEARCH_CANDIDATE_RULE_ID), `BAM patch must include ${SEARCH_CANDIDATE_RULE_ID}.`, failures);
  for (const key of ['activity_id', 'config_id', 'item_ids', 'candidate_pool_type', 'page_no', 'page_size']) {
    assert(content.includes(key), `BAM patch must include request key ${key}.`, failures);
  }
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
  console.log('apiSearchDeliveryItems supplemental mock verification passed.');
}

main();

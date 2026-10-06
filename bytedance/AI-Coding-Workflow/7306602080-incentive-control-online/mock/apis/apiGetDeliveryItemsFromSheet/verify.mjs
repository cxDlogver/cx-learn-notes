#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperations,
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiGetDeliveryItemsFromSheet';
const BATCH_HIT_RULE_ID = 'R-BAM-BATCH-SHEET-HIT';
const AWARD_TIMEOUT_RULE_ID = 'R-BAM-BATCH-SHEET-AWARD-TIMEOUT';
const AWARD_EMPTY_LIST_RULE_ID = 'R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const TARGET_SHEET_URL = 'https://bytedance.larkoffice.com/sheets/batch-hit-7306602080';
const AWARD_TIMEOUT_SHEET_URL = 'https://bytedance.larkoffice.com/sheets/award-timeout-7306602080';
const AWARD_EMPTY_LIST_SHEET_URL = 'https://bytedance.larkoffice.com/sheets/award-empty-list-7306602080';
const AWARD_TIMEOUT_ITEM_ID = '700003';
const AWARD_EMPTY_LIST_ITEM_ID = '700004';
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

function verifyBatchHitRule(manifest, failures) {
  const rule = ruleById(manifest, BATCH_HIT_RULE_ID);
  assert(Boolean(rule), `Missing rule ${BATCH_HIT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Batch hit rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes(BATCH_HIT_RULE_ID), `Batch hit rule verifyAssertion must name ${BATCH_HIT_RULE_ID}.`, failures);
  assert(rule.caseIds.length === 1 && rule.caseIds.includes('TC-UI-BATCH-HIT-REUSE'), 'Batch hit rule must cover only TC-UI-BATCH-HIT-REUSE; later batch cases must remain independent.', failures);
  assert(rule.requestFields.sheet_url === TARGET_SHEET_URL, `Batch hit rule sheet_url must match ${TARGET_SHEET_URL}.`, failures);
  assert(!rule.requestFields.sheet_url.includes('mock_'), 'Batch hit matcher must not use mock_ placeholder sheet URL.', failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 4, 'Batch hit rule must use four mockOperations.', failures);
  for (const expectedPath of ['st', 'code', 'msg', 'data']) {
    assert(rule.mockOperations.some((operation) => operation.path === expectedPath), `Batch hit rule must set ${expectedPath}.`, failures);
  }

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const rows = mockedResponse.data?.item_info ?? [];
  const byItemId = rowsByItemId(rows);
  const invalidRow = byItemId.get('200001');
  const notIncentiveRow = byItemId.get('200002');
  const validRow = byItemId.get('200003');

  assert(mockedResponse.st === 0 && mockedResponse.code === 0, 'Batch hit mocked response must be a success shell.', failures);
  assert(rows.length === 3, 'Batch hit mocked response must contain exactly three item_info rows.', failures);
  assert(mockedResponse.data?.total_num === 3, 'Batch hit mocked response total_num must be 3.', failures);
  assert(mockedResponse.data?.candidate_num === 1, 'Batch hit mocked response candidate_num must be 1.', failures);
  assert(mockedResponse.data?.has_more === false, 'Batch hit mocked response has_more must be false.', failures);
  assert(invalidRow?.if_satisfy_delivery_rules === false, 'Item 200001 must be an invalid hit row.', failures);
  assert(invalidRow?.if_not_incentive === false, 'Item 200001 must not be marked as not-incentive.', failures);
  assert(invalidRow?.item_card?.item_author_info?.author_id === '920001', 'Item 200001 must carry author_id 920001 for export records.', failures);
  assert(notIncentiveRow?.if_satisfy_delivery_rules === true, 'Item 200002 must satisfy delivery rules before not-incentive evaluation.', failures);
  assert(notIncentiveRow?.if_not_incentive === true, 'Item 200002 must be marked as not-incentive.', failures);
  assert(notIncentiveRow?.item_card?.item_author_info?.author_id === '920002', 'Item 200002 must carry author_id 920002 for export records.', failures);
  assert(
    Array.isArray(notIncentiveRow?.not_incentive_reason)
      && notIncentiveRow.not_incentive_reason.includes('历史违规命中不激励规则'),
    'Item 200002 must carry not_incentive_reason.',
    failures,
  );
  assert(validRow?.if_delivery === true, 'Item 200003 must be retained as deliverable.', failures);
  assert(validRow?.if_satisfy_delivery_rules === true, 'Item 200003 must satisfy delivery rules.', failures);
  assert(validRow?.if_not_incentive === false, 'Item 200003 must not be not-incentive.', failures);
  assert(validRow?.item_card?.item_author_info?.author_id === '920003', 'Item 200003 must carry author_id 920003 so later export checks can distinguish the valid row.', failures);
}

function verifyAwardTimeoutRule(manifest, failures) {
  const rule = ruleById(manifest, AWARD_TIMEOUT_RULE_ID);
  assert(Boolean(rule), `Missing rule ${AWARD_TIMEOUT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Award timeout setup rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes(AWARD_TIMEOUT_RULE_ID), `Award timeout setup rule verifyAssertion must name ${AWARD_TIMEOUT_RULE_ID}.`, failures);
  assert(rule.caseIds.length === 1 && rule.caseIds.includes('TC-INT-AWARD-TIMEOUT__batch_sheet_setup'), 'Award timeout setup rule must only cover TC-INT-AWARD-TIMEOUT setup.', failures);
  assert(rule.requestFields.sheet_url === AWARD_TIMEOUT_SHEET_URL, `Award timeout setup rule sheet_url must match ${AWARD_TIMEOUT_SHEET_URL}.`, failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 4, 'Award timeout setup rule must use four mockOperations.', failures);
  for (const expectedPath of ['st', 'code', 'msg', 'data']) {
    assert(rule.mockOperations.some((operation) => operation.path === expectedPath), `Award timeout setup rule must set ${expectedPath}.`, failures);
  }

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const rows = mockedResponse.data?.item_info ?? [];
  const row = rows[0];
  assert(mockedResponse.st === 0 && mockedResponse.code === 0, 'Award timeout setup mocked response must be a success shell.', failures);
  assert(rows.length === 1, 'Award timeout setup mocked response must contain exactly one item_info row.', failures);
  assert(mockedResponse.data?.total_num === 1, 'Award timeout setup mocked response total_num must be 1.', failures);
  assert(mockedResponse.data?.candidate_num === 1, 'Award timeout setup mocked response candidate_num must be 1.', failures);
  assert(mockedResponse.data?.has_more === false, 'Award timeout setup mocked response has_more must be false.', failures);
  assert(itemIdOf(row) === AWARD_TIMEOUT_ITEM_ID, `Award timeout setup row must use item_id ${AWARD_TIMEOUT_ITEM_ID}.`, failures);
  assert(row?.if_delivery === true, 'Award timeout setup row must be deliverable.', failures);
  assert(row?.if_satisfy_delivery_rules === true, 'Award timeout setup row must satisfy delivery rules.', failures);
  assert(row?.if_not_incentive === false, 'Award timeout setup row must not be not-incentive.', failures);
  assert(row?.item_card?.item_author_info?.author_id === '970003', 'Award timeout setup row must carry author_id 970003.', failures);
  assert(row?.delivery_config?.delivery_amount === 30000, 'Award timeout setup row must carry DOU+ coin delivery_config.', failures);
}

function verifyAwardEmptyListRule(manifest, failures) {
  const rule = ruleById(manifest, AWARD_EMPTY_LIST_RULE_ID);
  assert(Boolean(rule), `Missing rule ${AWARD_EMPTY_LIST_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Award empty-list setup rule verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes(AWARD_EMPTY_LIST_RULE_ID), `Award empty-list setup rule verifyAssertion must name ${AWARD_EMPTY_LIST_RULE_ID}.`, failures);
  assert(rule.verifyAssertion.includes('apiDeliveryDouPlusCoin'), 'Award empty-list setup rule verifyAssertion must preserve final no-call assertion for apiDeliveryDouPlusCoin.', failures);
  assert(rule.caseIds.length === 1 && rule.caseIds.includes('TC-INT-AWARD-EMPTY-LIST__batch_sheet_setup'), 'Award empty-list setup rule must only cover TC-INT-AWARD-EMPTY-LIST setup.', failures);
  assert(rule.requestFields.sheet_url === AWARD_EMPTY_LIST_SHEET_URL, `Award empty-list setup rule sheet_url must match ${AWARD_EMPTY_LIST_SHEET_URL}.`, failures);
  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 4, 'Award empty-list setup rule must use four mockOperations.', failures);
  for (const expectedPath of ['st', 'code', 'msg', 'data']) {
    assert(rule.mockOperations.some((operation) => operation.path === expectedPath), `Award empty-list setup rule must set ${expectedPath}.`, failures);
  }

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  const rows = mockedResponse.data?.item_info ?? [];
  const row = rows[0];
  assert(mockedResponse.st === 0 && mockedResponse.code === 0, 'Award empty-list setup mocked response must be a success shell.', failures);
  assert(rows.length === 1, 'Award empty-list setup mocked response must contain exactly one item_info row.', failures);
  assert(mockedResponse.data?.total_num === 1, 'Award empty-list setup mocked response total_num must be 1.', failures);
  assert(mockedResponse.data?.candidate_num === 0, 'Award empty-list setup mocked response candidate_num must be 0.', failures);
  assert(mockedResponse.data?.has_more === false, 'Award empty-list setup mocked response has_more must be false.', failures);
  assert(itemIdOf(row) === AWARD_EMPTY_LIST_ITEM_ID, `Award empty-list setup row must use item_id ${AWARD_EMPTY_LIST_ITEM_ID}.`, failures);
  assert(row?.if_delivery === false, 'Award empty-list setup row must be non-deliverable so BatchSubmitModal filters it out.', failures);
  assert(row?.if_satisfy_delivery_rules === true, 'Award empty-list setup row must satisfy delivery rules so Drawer submit guard does not block it.', failures);
  assert(row?.if_not_incentive === false, 'Award empty-list setup row must not be a not-incentive hit so Drawer submit guard does not block it.', failures);
  assert(row?.item_card?.item_author_info?.author_id === '970004', 'Award empty-list setup row must carry author_id 970004.', failures);
  assert(row?.delivery_config?.delivery_amount === 30000, 'Award empty-list setup row must carry DOU+ coin delivery_config.', failures);
}

function verifyManifestBusinessContract(manifest, failures) {
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === BATCH_HIT_RULE_ID), 'ruleMatchKeys must include batch hit rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === AWARD_TIMEOUT_RULE_ID), 'ruleMatchKeys must include award timeout setup rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === AWARD_EMPTY_LIST_RULE_ID), 'ruleMatchKeys must include award empty-list setup rule.', failures);
  assert(manifest.ruleMatchKeys.some((row) => row.ruleId === DEFAULT_RULE_ID && row.isDefault === true), 'ruleMatchKeys must include DEFAULT_NOOP as default.', failures);
  assert(manifest.requestFieldsAffectingRules.length === 1 && manifest.requestFieldsAffectingRules[0] === 'sheet_url', 'requestFieldsAffectingRules must only include sheet_url.', failures);
  verifyBatchHitRule(manifest, failures);
  verifyAwardTimeoutRule(manifest, failures);
  verifyAwardEmptyListRule(manifest, failures);
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
  verifyFixture(BATCH_HIT_RULE_ID, failures);
  verifyFixture(AWARD_TIMEOUT_RULE_ID, failures);
  verifyFixture(AWARD_EMPTY_LIST_RULE_ID, failures);

  const matched = matchRule({
    sheet_url: TARGET_SHEET_URL,
    activity_id: '7653282555822653742',
    config_id: '7653282555822735662',
  }, manifest);
  assert(matched.ruleId === BATCH_HIT_RULE_ID, 'Exact batch sheet request must match R-BAM-BATCH-SHEET-HIT.', failures);

  const timeoutMatched = matchRule({
    sheet_url: AWARD_TIMEOUT_SHEET_URL,
    activity_id: '7653282555822653742',
    config_id: '7653282555822735662',
  }, manifest);
  assert(timeoutMatched.ruleId === AWARD_TIMEOUT_RULE_ID, 'Exact award timeout sheet request must match R-BAM-BATCH-SHEET-AWARD-TIMEOUT.', failures);

  const emptyListMatched = matchRule({
    sheet_url: AWARD_EMPTY_LIST_SHEET_URL,
    activity_id: '7653282555822653742',
    config_id: '7653282555822735662',
  }, manifest);
  assert(emptyListMatched.ruleId === AWARD_EMPTY_LIST_RULE_ID, 'Exact award empty-list sheet request must match R-BAM-BATCH-SHEET-AWARD-EMPTY-LIST.', failures);

  const wrongSheet = matchRule({
    sheet_url: 'https://bytedance.larkoffice.com/sheets/other-batch-hit-7306602080',
    activity_id: '7653282555822653742',
    config_id: '7653282555822735662',
  }, manifest);
  assert(wrongSheet.ruleId === DEFAULT_RULE_ID, 'Different sheet_url must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain patch end marker.', failures);
  assert(content.includes(BATCH_HIT_RULE_ID), `BAM patch must include ${BATCH_HIT_RULE_ID}.`, failures);
  assert(content.includes(AWARD_TIMEOUT_RULE_ID), `BAM patch must include ${AWARD_TIMEOUT_RULE_ID}.`, failures);
  assert(content.includes(AWARD_EMPTY_LIST_RULE_ID), `BAM patch must include ${AWARD_EMPTY_LIST_RULE_ID}.`, failures);
  assert(content.includes('sheet_url'), 'BAM patch must include request key sheet_url.', failures);
  assert(content.includes('batch-hit-7306602080'), 'BAM patch must include stable batch sheet matcher.', failures);
  assert(content.includes('award-timeout-7306602080'), 'BAM patch must include stable award timeout sheet matcher.', failures);
  assert(content.includes('award-empty-list-7306602080'), 'BAM patch must include stable award empty-list sheet matcher.', failures);
  assert(content.includes(AWARD_TIMEOUT_ITEM_ID), `BAM patch must include timeout setup item ${AWARD_TIMEOUT_ITEM_ID}.`, failures);
  assert(content.includes(AWARD_EMPTY_LIST_ITEM_ID), `BAM patch must include empty-list setup item ${AWARD_EMPTY_LIST_ITEM_ID}.`, failures);
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
  console.log('apiGetDeliveryItemsFromSheet supplemental mock verification passed.');
}

main();

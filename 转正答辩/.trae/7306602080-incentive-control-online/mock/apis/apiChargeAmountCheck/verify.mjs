#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperations,
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiChargeAmountCheck';
const RULE_ID = 'R-BAM-CHARGE-AMOUNT-CHECK-AWARD-TIMEOUT';
const CASE_ID = 'TC-INT-AWARD-TIMEOUT__charge_amount_check';
const EMPTY_LIST_RULE_ID = 'R-BAM-CHARGE-AMOUNT-CHECK-AWARD-EMPTY-LIST';
const EMPTY_LIST_CASE_ID = 'TC-INT-AWARD-EMPTY-LIST__charge_amount_check';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const ACTIVITY_ID = '7653282555822653742';
const CONFIG_ID = '7653282555822735662';
const DELIVERY_AMOUNT = 30000;
const RESOURCE_TYPE = 5;
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

function resolveFromManifest(relativePath) {
  return path.resolve(path.dirname(MANIFEST_PATH), relativePath);
}

function verifyRawResponseIntegrity(rule, failures) {
  const rawPath = resolveFromManifest(rule.realConnectArtifact.rawResponse);
  const responsePath = resolveFromManifest(rule.realConnectArtifact.response);
  const raw = fs.readFileSync(rawPath, 'utf8');
  const parsedRaw = JSON.parse(raw);
  const responseJson = readJson(responsePath);
  assert(deepEqual(parsedRaw, responseJson), 'response.json must be parsed from response.raw.txt without field changes.', failures);
}

function verifyManifestBusinessContract(manifest, failures) {
  const rule = ruleById(manifest, RULE_ID);
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);

  assert(Boolean(rule), `Missing rule ${RULE_ID}`, failures);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.caseIds.includes(CASE_ID), `${RULE_ID} must cover ${CASE_ID}.`, failures);
  assert(rule.requestFields.activity_id === ACTIVITY_ID, `Rule must match activity_id=${ACTIVITY_ID}.`, failures);
  assert(rule.requestFields.config_id === CONFIG_ID, `Rule must match config_id=${CONFIG_ID}.`, failures);
  assert(rule.requestFields.delivery_from === 2, 'Rule must match UploadCandidate delivery_from=2.', failures);
  assert(rule.requestFields.resource_type === RESOURCE_TYPE, `Rule must match resource_type=${RESOURCE_TYPE}.`, failures);
  assert(rule.requestFields['delivery_list.0.amount'] === DELIVERY_AMOUNT, `Rule must match delivery_list.0.amount=${DELIVERY_AMOUNT}.`, failures);
  assert(rule.responseContract?.source === 'real_browser_request', `${RULE_ID} responseContract source must be real_browser_request.`, failures);
  assert(rule.realConnectArtifact?.status === 'passed', `${RULE_ID} realConnectArtifact must be passed.`, failures);
  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes('data.can_delivery=true'), 'verifyAssertion must require can_delivery=true.', failures);

  const requestBody = rule.realRequest?.body ?? {};
  assert(requestBody.activity_id === ACTIVITY_ID, 'Real request must carry timeout activity_id.', failures);
  assert(requestBody.config_id === CONFIG_ID, 'Real request must carry timeout config_id.', failures);
  assert(requestBody.delivery_from === 2, 'Real request must carry delivery_from=2.', failures);
  assert(requestBody.resource_type === RESOURCE_TYPE, 'Real request must carry resource_type=5.', failures);
  assert(Array.isArray(requestBody.delivery_list) && requestBody.delivery_list.length === 1, 'Real request must contain one delivery_list amount row.', failures);
  assert(requestBody.delivery_list?.[0]?.amount === DELIVERY_AMOUNT, 'Real request must carry delivery_list[0].amount=30000.', failures);
  assert(!requestBody.delivery_list?.[0]?.item_id, 'apiChargeAmountCheck request must not invent delivery_list[0].item_id.', failures);

  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 2, 'Rule must use exactly two mockOperations.', failures);
  assert(rule.mockOperations.some((operation) => operation.path === 'data.can_delivery' && operation.value === true), 'Rule must set data.can_delivery=true.', failures);
  assert(rule.mockOperations.some((operation) => operation.path === 'data.left_amount' && operation.value === 1900000), 'Rule must set data.left_amount=1900000.', failures);

  const realResponse = readJson(resolveFromManifest(rule.realResponsePath));
  const mockedResponse = readJson(resolveFromManifest(rule.mockedResponsePath));
  assert(realResponse.data?.can_delivery === false, 'Real baseline must preserve can_delivery=false.', failures);
  assert(realResponse.data?.left_amount === 0, 'Real baseline must preserve left_amount=0.', failures);
  assert(mockedResponse.data?.can_delivery === true, 'Mocked response must set can_delivery=true.', failures);
  assert(mockedResponse.data?.left_amount === 1900000, 'Mocked response must set left_amount=1900000.', failures);
  assert(mockedResponse.data?.current_use_amount === DELIVERY_AMOUNT, 'Mocked response must preserve current_use_amount=30000.', failures);
  assert(mockedResponse.st === 0 && mockedResponse.code === 0, 'Mocked response must keep validation API success shell.', failures);

  verifyRawResponseIntegrity(rule, failures);

  const emptyRule = ruleById(manifest, EMPTY_LIST_RULE_ID);
  assert(Boolean(emptyRule), `Missing rule ${EMPTY_LIST_RULE_ID}`, failures);
  if (emptyRule) {
    assert(emptyRule.caseIds.includes(EMPTY_LIST_CASE_ID), `${EMPTY_LIST_RULE_ID} must cover ${EMPTY_LIST_CASE_ID}.`, failures);
    assert(emptyRule.requestFields.activity_id === ACTIVITY_ID, `Empty-list rule must match activity_id=${ACTIVITY_ID}.`, failures);
    assert(emptyRule.requestFields.config_id === CONFIG_ID, `Empty-list rule must match config_id=${CONFIG_ID}.`, failures);
    assert(emptyRule.requestFields.delivery_from === 2, 'Empty-list rule must match UploadCandidate delivery_from=2.', failures);
    assert(emptyRule.requestFields.resource_type === RESOURCE_TYPE, `Empty-list rule must match resource_type=${RESOURCE_TYPE}.`, failures);
    assert(Array.isArray(emptyRule.requestFields.delivery_list) && emptyRule.requestFields.delivery_list.length === 0, 'Empty-list rule must match delivery_list=[].', failures);
    assert(emptyRule.responseContract?.source === 'real_browser_request', `${EMPTY_LIST_RULE_ID} responseContract source must be real_browser_request.`, failures);
    assert(emptyRule.realConnectArtifact?.status === 'passed', `${EMPTY_LIST_RULE_ID} realConnectArtifact must be passed.`, failures);
    assert(emptyRule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Empty-list verifyAssertion must require [BAM_MOCK_HIT].', failures);
    assert(emptyRule.verifyAssertion.includes('delivery_list=[]'), 'Empty-list verifyAssertion must require delivery_list=[].', failures);
    assert(emptyRule.verifyAssertion.includes('apiDeliveryDouPlusCoin'), 'Empty-list verifyAssertion must forbid replacing final apiDeliveryDouPlusCoin evidence.', failures);

    const emptyRequestBody = emptyRule.realRequest?.body ?? {};
    assert(emptyRequestBody.activity_id === ACTIVITY_ID, 'Empty-list real request must carry activity_id.', failures);
    assert(emptyRequestBody.config_id === CONFIG_ID, 'Empty-list real request must carry config_id.', failures);
    assert(emptyRequestBody.delivery_from === 2, 'Empty-list real request must carry delivery_from=2.', failures);
    assert(emptyRequestBody.resource_type === RESOURCE_TYPE, 'Empty-list real request must carry resource_type=5.', failures);
    assert(Array.isArray(emptyRequestBody.delivery_list) && emptyRequestBody.delivery_list.length === 0, 'Empty-list real request must carry delivery_list=[].', failures);
    assert(!emptyRequestBody.delivery_candidates, 'Empty-list UploadCandidate request must not carry delivery_candidates.', failures);

    assert(Array.isArray(emptyRule.mockOperations) && emptyRule.mockOperations.length === 6, 'Empty-list rule must use exactly six mockOperations.', failures);
    assert(emptyRule.mockOperations.some((operation) => operation.path === 'st' && operation.value === 0), 'Empty-list rule must set st=0.', failures);
    assert(emptyRule.mockOperations.some((operation) => operation.path === 'code' && operation.value === 0), 'Empty-list rule must set code=0.', failures);
    assert(emptyRule.mockOperations.some((operation) => operation.path === 'msg' && operation.value === ''), 'Empty-list rule must clear msg.', failures);
    assert(emptyRule.mockOperations.some((operation) => operation.path === 'data.can_delivery' && operation.value === true), 'Empty-list rule must set data.can_delivery=true.', failures);
    assert(emptyRule.mockOperations.some((operation) => operation.path === 'data.left_amount' && operation.value === 1900000), 'Empty-list rule must set data.left_amount=1900000.', failures);
    assert(emptyRule.mockOperations.some((operation) => operation.path === 'data.current_use_amount' && operation.value === 0), 'Empty-list rule must set data.current_use_amount=0.', failures);

    const emptyRealResponse = readJson(resolveFromManifest(emptyRule.realResponsePath));
    const emptyMockedResponse = readJson(resolveFromManifest(emptyRule.mockedResponsePath));
    assert(emptyRealResponse.st === 10000000 && emptyRealResponse.code === 10000000, 'Empty-list real baseline must preserve parameter error shell.', failures);
    assert(emptyRealResponse.msg === '参数错误', 'Empty-list real baseline must preserve 参数错误 msg.', failures);
    assert(Object.keys(emptyRealResponse.data ?? {}).length === 0, 'Empty-list real baseline must preserve empty data object.', failures);
    assert(emptyMockedResponse.st === 0 && emptyMockedResponse.code === 0, 'Empty-list mocked response must restore success shell.', failures);
    assert(emptyMockedResponse.data?.can_delivery === true, 'Empty-list mocked response must set can_delivery=true.', failures);
    assert(emptyMockedResponse.data?.left_amount === 1900000, 'Empty-list mocked response must set left_amount=1900000.', failures);
    assert(emptyMockedResponse.data?.current_use_amount === 0, 'Empty-list mocked response must preserve current_use_amount=0.', failures);

    verifyRawResponseIntegrity(emptyRule, failures);
  }
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === RULE_ID, `Timeout amount-check request must match ${RULE_ID}.`, failures);
  const actualMocked = applyOperations(fixture.realResponse, fixture.operations);
  assert(deepEqual(actualMocked, fixture.expectedMockedResponse), 'mockOperations applied to real response must equal response.mocked.json.', failures);

  const emptyFixture = loadRuntimeFixture(EMPTY_LIST_RULE_ID, manifest);
  const emptyMatched = matchRule(emptyFixture.request, manifest);
  assert(emptyMatched.ruleId === EMPTY_LIST_RULE_ID, `Empty-list amount-check request must match ${EMPTY_LIST_RULE_ID}.`, failures);
  const emptyActualMocked = applyOperations(emptyFixture.realResponse, emptyFixture.operations);
  assert(deepEqual(emptyActualMocked, emptyFixture.expectedMockedResponse), 'Empty-list mockOperations applied to real response must equal response.mocked.json.', failures);

  const wrongAmount = matchRule({
    activity_id: ACTIVITY_ID,
    config_id: CONFIG_ID,
    delivery_from: 2,
    resource_type: RESOURCE_TYPE,
    delivery_list: [
      { amount: 5000 },
    ],
  }, manifest);
  assert(wrongAmount.ruleId === DEFAULT_RULE_ID, 'Different amount must fall back to DEFAULT_NOOP.', failures);

  const emptyOtherActivity = matchRule({
    activity_id: '7655304206886322458',
    config_id: CONFIG_ID,
    delivery_from: 2,
    resource_type: RESOURCE_TYPE,
    delivery_list: [],
  }, manifest);
  assert(emptyOtherActivity.ruleId === DEFAULT_RULE_ID, 'Empty-list request for other activity must fall back to DEFAULT_NOOP.', failures);

  const searchCandidate = matchRule({
    activity_id: ACTIVITY_ID,
    config_id: CONFIG_ID,
    delivery_from: 1,
    resource_type: RESOURCE_TYPE,
    delivery_candidates: [
      { candidate_id: '700003', rank: 1 },
    ],
  }, manifest);
  assert(searchCandidate.ruleId === DEFAULT_RULE_ID, 'SearchCandidate amount check must fall back to DEFAULT_NOOP.', failures);

  const otherActivity = matchRule({
    activity_id: '7655304206886322458',
    config_id: CONFIG_ID,
    delivery_from: 2,
    resource_type: RESOURCE_TYPE,
    delivery_list: [
      { amount: DELIVERY_AMOUNT },
    ],
  }, manifest);
  assert(otherActivity.ruleId === DEFAULT_RULE_ID, 'Other activity must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  const markerStart = `/* BAM_MOCK_PATCH_START ${API_NAME} */`;
  const markerEnd = `/* BAM_MOCK_PATCH_END ${API_NAME} */`;
  const markerStartIndex = content.indexOf(markerStart);
  const markerEndIndex = content.indexOf(markerEnd, markerStartIndex + markerStart.length);
  const marker = markerStartIndex >= 0 && markerEndIndex >= 0
    ? content.slice(markerStartIndex, markerEndIndex + markerEnd.length)
    : '';
  assert(marker.includes(markerStart), 'BAM file must contain apiChargeAmountCheck patch start marker.', failures);
  assert(marker.includes(markerEnd), 'BAM file must contain apiChargeAmountCheck patch end marker.', failures);
  assert(marker.includes(RULE_ID), `BAM patch must include ${RULE_ID}.`, failures);
  assert(marker.includes(EMPTY_LIST_RULE_ID), `BAM patch must include ${EMPTY_LIST_RULE_ID}.`, failures);
  assert(marker.includes('delivery_list') && marker.includes('amount'), 'BAM patch must include delivery_list amount matcher.', failures);
  assert(marker.includes('JSON.stringify') && marker.includes('delivery_list'), 'BAM patch must include stable delivery_list=[] matcher.', failures);
  assert(marker.includes('data.can_delivery'), 'BAM patch must set data.can_delivery.', failures);
  assert(marker.includes('data.left_amount'), 'BAM patch must set data.left_amount.', failures);
  assert(marker.includes('data.current_use_amount'), 'BAM patch must set data.current_use_amount for empty-list amount check.', failures);
  assert(marker.includes('参数错误'), 'BAM patch verification context must preserve empty-list real parameter-error baseline via artifact-driven operations.', failures);
  assert(marker.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(marker.includes('return EcomBuyinAdminApiOptions.request({ url, method, data }, options).then'), 'BAM patch must call original validation request before applying operations.', failures);
  assert(!marker.includes('syntheticContract: true'), 'Amount check matcher must not mark the rule as synthetic_contract.', failures);
  assert(content.includes("delivery_list: _req['delivery_list']"), 'BAM wrapper must keep forwarding delivery_list.', failures);
  assert(content.includes("delivery_from: _req['delivery_from']"), 'BAM wrapper must keep forwarding delivery_from.', failures);
  assert(content.includes("resource_type: _req['resource_type']"), 'BAM wrapper must keep forwarding resource_type.', failures);
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
  console.log('apiChargeAmountCheck supplemental mock verification passed.');
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyOperations,
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiGetDouPlusCouponMakeFailRecord';
const RULE_ID = 'R-BAM-COUPON-MAKE-FAIL-EXCEPTION';
const CASE_ID = 'TC-INT-AWARD-EXCEPTION__make_fail_setup';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const ACTIVITY_ID = '7655304206886322458';
const CONFIG_ID = '7655304206886355226';
const DELIVERY_TASK_ID = 'fail_coupon_exception_800003';
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
  assert(rule.responseContract?.source === 'real_browser_request', `${RULE_ID} responseContract source must be real_browser_request.`, failures);
  assert(rule.realConnectArtifact?.status === 'passed', `${RULE_ID} realConnectArtifact must be passed.`, failures);
  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'verifyAssertion must require [BAM_MOCK_HIT].', failures);
  assert(rule.verifyAssertion.includes('点此查看并重新提交'), 'verifyAssertion must require the resubmit entry copy.', failures);

  const requestQuery = rule.realRequest?.query ?? {};
  assert(requestQuery.activity_id === ACTIVITY_ID, 'Real request must carry target activity_id.', failures);
  assert(requestQuery.config_id === CONFIG_ID, 'Real request must carry target config_id.', failures);

  assert(Array.isArray(rule.mockOperations) && rule.mockOperations.length === 1, 'Rule must use exactly one mockOperation.', failures);
  assert(rule.mockOperations[0]?.path === 'data.task_list', 'Rule must set data.task_list.', failures);

  const realResponse = readJson(resolveFromManifest(rule.realResponsePath));
  const mockedResponse = readJson(resolveFromManifest(rule.mockedResponsePath));
  const task = mockedResponse.data?.task_list?.[0];
  assert(realResponse.data?.task_list === null, 'Real baseline must preserve task_list=null.', failures);
  assert(mockedResponse.st === 0 && mockedResponse.code === 0, 'Mocked response must keep success shell.', failures);
  assert(Array.isArray(mockedResponse.data?.task_list) && mockedResponse.data.task_list.length === 1, 'Mocked response must contain exactly one task.', failures);
  assert(task?.delivery_task_id === DELIVERY_TASK_ID, `Mocked task must use ${DELIVERY_TASK_ID}.`, failures);
  assert(task?.num === 1, 'Mocked task must use one coupon.', failures);
  assert(task?.coupon_type === 1, 'Mocked task must be amount coupon type.', failures);
  assert(task?.coupon_config?.freeAmount === 5000, 'Mocked task must carry coupon_config.freeAmount=5000.', failures);

  verifyRawResponseIntegrity(rule, failures);
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === RULE_ID, `Target make-fail request must match ${RULE_ID}.`, failures);
  const actualMocked = applyOperations(fixture.realResponse, fixture.operations);
  assert(deepEqual(actualMocked, fixture.expectedMockedResponse), 'mockOperations applied to real response must equal response.mocked.json.', failures);

  const otherConfig = matchRule({
    activity_id: ACTIVITY_ID,
    config_id: '7655304206886338842',
  }, manifest);
  assert(otherConfig.ruleId === DEFAULT_RULE_ID, 'Other config must fall back to DEFAULT_NOOP.', failures);

  const otherActivity = matchRule({
    activity_id: '7653282555822653742',
    config_id: CONFIG_ID,
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
  assert(marker.includes(markerStart), 'BAM file must contain apiGetDouPlusCouponMakeFailRecord patch start marker.', failures);
  assert(marker.includes(markerEnd), 'BAM file must contain apiGetDouPlusCouponMakeFailRecord patch end marker.', failures);
  assert(marker.includes(RULE_ID), `BAM patch must include ${RULE_ID}.`, failures);
  assert(marker.includes('activity_id') && marker.includes('config_id'), 'BAM patch must include activity/config matchers.', failures);
  assert(marker.includes(DELIVERY_TASK_ID), `BAM patch must include delivery task ${DELIVERY_TASK_ID}.`, failures);
  assert(marker.includes('data.task_list'), 'BAM patch must set data.task_list.', failures);
  assert(marker.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(marker.includes('return EcomBuyinAdminApiOptions.request({ url, method, params }, options).then'), 'BAM patch must call original make-fail request before applying operations.', failures);
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
  console.log('apiGetDouPlusCouponMakeFailRecord supplemental mock verification passed.');
}

main();

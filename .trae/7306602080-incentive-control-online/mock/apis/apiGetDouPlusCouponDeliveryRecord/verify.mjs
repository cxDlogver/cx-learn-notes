#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiGetDouPlusCouponDeliveryRecord';
const RULE_ID = 'R-BAM-COUPON-DELIVERY-RECORD-EXCEPTION';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const ACTIVITY_ID = '7655304206886322458';
const CONFIG_ID = '7655304206886355226';
const DELIVERY_TASK_ID = 'fail_coupon_exception_800003';
const AUTHOR_ID = '800003';
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

function verifyManifest(manifest, failures) {
  const rule = ruleById(manifest, RULE_ID);
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);
  assert(Boolean(rule), `Missing rule ${RULE_ID}`, failures);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.syntheticContract === true, `${RULE_ID} must be marked syntheticContract.`, failures);
  assert(rule.caseIds.includes('TC-INT-AWARD-EXCEPTION__delivery_record_setup'), `${RULE_ID} must cover delivery record setup case.`, failures);
  assert(rule.requestFields.activity_id === ACTIVITY_ID, `${RULE_ID} must match activity_id ${ACTIVITY_ID}.`, failures);
  assert(rule.requestFields.config_id === CONFIG_ID, `${RULE_ID} must match config_id ${CONFIG_ID}.`, failures);
  assert(rule.requestFields.delivery_task_id === DELIVERY_TASK_ID, `${RULE_ID} must match delivery_task_id ${DELIVERY_TASK_ID}.`, failures);
  assert(rule.requestFields.page === 1, `${RULE_ID} must match page=1.`, failures);
  assert(rule.requestFields.page_num === 20, `${RULE_ID} must match page_num=20.`, failures);
  assert(rule.responseContract?.source === 'synthetic_contract', `${RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(rule.responseContract?.uiNaturalAttemptCount >= 2, `${RULE_ID} must record two natural UI attempts.`, failures);
  assert(rule.realConnectArtifact?.status === 'synthetic_contract', `${RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);
  assert(rule.verifyAssertion.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'verifyAssertion must require synthetic marker.', failures);
  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'verifyAssertion must require mock hit marker.', failures);

  const requestQuery = rule.realRequest?.query ?? {};
  assert(requestQuery.activity_id === ACTIVITY_ID, 'Synthetic request query must carry target activity_id.', failures);
  assert(requestQuery.config_id === CONFIG_ID, 'Synthetic request query must carry target config_id.', failures);
  assert(requestQuery.delivery_task_id === DELIVERY_TASK_ID, 'Synthetic request query must carry target delivery_task_id.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  assert(mockedResponse.st === 0, 'Synthetic delivery record response st must be 0.', failures);
  assert(mockedResponse.code === 0, 'Synthetic delivery record response code must be 0.', failures);
  assert(Array.isArray(mockedResponse.data?.records) && mockedResponse.data.records.length === 1, 'Synthetic delivery record response must contain one record.', failures);
  assert(mockedResponse.data.records[0]?.author_info?.author_id === AUTHOR_ID, `Synthetic record author_id must be ${AUTHOR_ID}.`, failures);
  assert(mockedResponse.data.records[0]?.delivery_config?.coupon_type === 1, 'Synthetic record must carry coupon_type=1.', failures);
  assert(mockedResponse.data.records[0]?.delivery_config?.coupon_config?.freeAmount === 5000, 'Synthetic record must carry coupon freeAmount=5000.', failures);
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === RULE_ID, `${RULE_ID} request must match target rule.`, failures);
  assert(fixture.syntheticContract === true, 'Runtime fixture must be synthetic.', failures);
  assert(fixture.mockedResponse?.data?.records?.[0]?.author_info?.author_id === AUTHOR_ID, `Runtime fixture must expose author_id ${AUTHOR_ID}.`, failures);

  const otherTask = matchRule({
    activity_id: ACTIVITY_ID,
    config_id: CONFIG_ID,
    delivery_task_id: 'other_task',
    page: 1,
    page_num: 20,
  }, manifest);
  assert(otherTask.ruleId === DEFAULT_RULE_ID, 'Other delivery_task_id must fall back to DEFAULT_NOOP.', failures);

  const otherPage = matchRule({
    activity_id: ACTIVITY_ID,
    config_id: CONFIG_ID,
    delivery_task_id: DELIVERY_TASK_ID,
    page: 2,
    page_num: 20,
  }, manifest);
  assert(otherPage.ruleId === DEFAULT_RULE_ID, 'Other page must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain apiGetDouPlusCouponDeliveryRecord patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain apiGetDouPlusCouponDeliveryRecord patch end marker.', failures);
  assert(content.includes(RULE_ID), `BAM patch must include ${RULE_ID}.`, failures);
  assert(content.includes(DELIVERY_TASK_ID), `BAM patch must include delivery_task_id ${DELIVERY_TASK_ID}.`, failures);
  assert(content.includes(AUTHOR_ID), `BAM patch must include author_id ${AUTHOR_ID}.`, failures);
  assert(content.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'BAM patch must emit [BAM_MOCK_SYNTHETIC_CONTRACT].', failures);
  assert(content.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(content.includes('return Promise.resolve(__bamMockSyntheticContract'), 'Synthetic delivery record rule must not call original backend request on match.', failures);
  assert(content.includes("delivery_task_id: _req['delivery_task_id']"), 'BAM wrapper must keep forwarding delivery_task_id from request to GET params.', failures);
}

function main() {
  const failures = [];
  const manifest = readJson(MANIFEST_PATH);
  verifyManifest(manifest, failures);
  verifyDerivedRuntime(manifest, failures);
  verifyBamPatch(failures);

  if (failures.length > 0) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('apiGetDouPlusCouponDeliveryRecord supplemental mock verification passed.');
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiDeliveryDouPlusCoupon';
const PENALTY_RULE_ID = 'R-BAM-AWARD-COUPON-PENALTY';
const RELIEVED_RULE_ID = 'R-BAM-AWARD-COUPON-RELIEVED';
const EXCEPTION_RULE_ID = 'R-BAM-AWARD-COUPON-EXCEPTION';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const PENALTY_CANDIDATE_ID = '800001';
const RELIEVED_CANDIDATE_ID = '800002';
const EXCEPTION_ITEM_ID = '800003';
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
  const rule = ruleById(manifest, PENALTY_RULE_ID);
  const relievedRule = ruleById(manifest, RELIEVED_RULE_ID);
  const exceptionRule = ruleById(manifest, EXCEPTION_RULE_ID);
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);

  assert(Boolean(rule), `Missing rule ${PENALTY_RULE_ID}`, failures);
  assert(Boolean(relievedRule), `Missing rule ${RELIEVED_RULE_ID}`, failures);
  assert(Boolean(exceptionRule), `Missing rule ${EXCEPTION_RULE_ID}`, failures);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  if (!rule || !relievedRule || !exceptionRule) return;

  assert(rule.syntheticContract === true, `${PENALTY_RULE_ID} must be marked syntheticContract.`, failures);
  assert(rule.caseIds.includes('TC-INT-AWARD-COUPON-PENALTY'), `${PENALTY_RULE_ID} must cover TC-INT-AWARD-COUPON-PENALTY.`, failures);
  assert(rule.requestFields.delivery_from === 1, 'Penalty rule must match DeliveryFrom.SearchCandidate=1.', failures);
  assert(rule.requestFields['delivery_authors.0.candidate_id'] === PENALTY_CANDIDATE_ID, `Penalty rule must match candidate_id ${PENALTY_CANDIDATE_ID}.`, failures);
  assert(rule.responseContract?.source === 'synthetic_contract', `${PENALTY_RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(rule.responseContract?.uiNaturalAttemptCount >= 2, `${PENALTY_RULE_ID} must record two write-safety UI attempts.`, failures);
  assert(rule.realConnectArtifact?.status === 'synthetic_contract', `${PENALTY_RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);
  assert(rule.verifyAssertion.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'Penalty verifyAssertion must require synthetic marker.', failures);
  assert(rule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Penalty verifyAssertion must require mock hit marker.', failures);

  const requestBody = rule.realRequest?.body ?? {};
  assert(requestBody.delivery_from === 1, 'Synthetic request must use delivery_from=1.', failures);
  assert(Array.isArray(requestBody.delivery_authors) && requestBody.delivery_authors.length === 1, 'Synthetic request must contain one delivery author.', failures);
  assert(requestBody.delivery_authors?.[0]?.candidate_id === PENALTY_CANDIDATE_ID, `Synthetic request must carry candidate_id ${PENALTY_CANDIDATE_ID}.`, failures);
  assert(requestBody.delivery_authors?.[0]?.rank === 1, 'Synthetic request must carry rank=1.', failures);
  assert(!Array.isArray(requestBody.delivery_list), 'SearchCandidate coupon penalty request must not use delivery_list.', failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  assert(mockedResponse.st === 1, 'Penalty response st must be non-zero.', failures);
  assert(mockedResponse.code === 10017001, 'Penalty response code must be 10017001.', failures);
  assert(mockedResponse.msg === '命中自然处罚，无法发奖', 'Penalty response msg must describe natural penalty.', failures);

  assert(relievedRule.syntheticContract === true, `${RELIEVED_RULE_ID} must be marked syntheticContract.`, failures);
  assert(relievedRule.caseIds.includes('TC-INT-AWARD-COUPON-RELIEVED'), `${RELIEVED_RULE_ID} must cover TC-INT-AWARD-COUPON-RELIEVED.`, failures);
  assert(relievedRule.requestFields.delivery_from === 1, 'Relieved rule must match DeliveryFrom.SearchCandidate=1.', failures);
  assert(relievedRule.requestFields['delivery_authors.0.candidate_id'] === RELIEVED_CANDIDATE_ID, `Relieved rule must match candidate_id ${RELIEVED_CANDIDATE_ID}.`, failures);
  assert(relievedRule.responseContract?.source === 'synthetic_contract', `${RELIEVED_RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(relievedRule.responseContract?.uiNaturalAttemptCount >= 2, `${RELIEVED_RULE_ID} must record two write-safety UI attempts.`, failures);
  assert(relievedRule.realConnectArtifact?.status === 'synthetic_contract', `${RELIEVED_RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);
  assert(relievedRule.verifyAssertion.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'Relieved verifyAssertion must require synthetic marker.', failures);
  assert(relievedRule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Relieved verifyAssertion must require mock hit marker.', failures);

  const relievedRequestBody = relievedRule.realRequest?.body ?? {};
  assert(relievedRequestBody.delivery_from === 1, 'Relieved synthetic request must use delivery_from=1.', failures);
  assert(Array.isArray(relievedRequestBody.delivery_authors) && relievedRequestBody.delivery_authors.length === 1, 'Relieved synthetic request must contain one delivery author.', failures);
  assert(relievedRequestBody.delivery_authors?.[0]?.candidate_id === RELIEVED_CANDIDATE_ID, `Relieved synthetic request must carry candidate_id ${RELIEVED_CANDIDATE_ID}.`, failures);
  assert(relievedRequestBody.delivery_authors?.[0]?.rank === 2, 'Relieved synthetic request must carry rank=2.', failures);
  assert(!Array.isArray(relievedRequestBody.delivery_list), 'SearchCandidate coupon relieved request must not use delivery_list.', failures);

  const relievedMockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), relievedRule.mockedResponsePath));
  assert(relievedMockedResponse.st === 0, 'Relieved response st must be 0.', failures);
  assert(relievedMockedResponse.code === 0, 'Relieved response code must be 0.', failures);
  assert(relievedMockedResponse.msg === 'success', 'Relieved response msg must be success.', failures);

  assert(exceptionRule.syntheticContract === true, `${EXCEPTION_RULE_ID} must be marked syntheticContract.`, failures);
  assert(exceptionRule.caseIds.includes('TC-INT-AWARD-EXCEPTION'), `${EXCEPTION_RULE_ID} must cover TC-INT-AWARD-EXCEPTION.`, failures);
  assert(exceptionRule.requestFields.delivery_from === 2, 'Exception rule must match DeliveryFrom.UploadCandidate=2.', failures);
  assert(exceptionRule.requestFields['delivery_list.0.item_id'] === EXCEPTION_ITEM_ID, `Exception rule must match item_id ${EXCEPTION_ITEM_ID}.`, failures);
  assert(exceptionRule.responseContract?.source === 'synthetic_contract', `${EXCEPTION_RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(exceptionRule.responseContract?.uiNaturalAttemptCount >= 2, `${EXCEPTION_RULE_ID} must record two write-safety UI attempts.`, failures);
  assert(exceptionRule.realConnectArtifact?.status === 'synthetic_contract', `${EXCEPTION_RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);
  assert(exceptionRule.verifyAssertion.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'Exception verifyAssertion must require synthetic marker.', failures);
  assert(exceptionRule.verifyAssertion.includes('[BAM_MOCK_HIT]'), 'Exception verifyAssertion must require mock hit marker.', failures);
  assert(exceptionRule.verifyAssertion.includes('治理校验异常，请联系管理员'), 'Exception verifyAssertion must require fixed exception copy.', failures);

  const exceptionRequestBody = exceptionRule.realRequest?.body ?? {};
  assert(exceptionRequestBody.delivery_from === 2, 'Exception synthetic request must use delivery_from=2.', failures);
  assert(Array.isArray(exceptionRequestBody.delivery_list) && exceptionRequestBody.delivery_list.length === 1, 'Exception synthetic request must contain one delivery_list item.', failures);
  assert(exceptionRequestBody.delivery_list?.[0]?.item_id === EXCEPTION_ITEM_ID, `Exception synthetic request must carry item_id ${EXCEPTION_ITEM_ID}.`, failures);
  assert(exceptionRequestBody.delivery_list?.[0]?.delivery_config?.coupon_type === 1, 'Exception synthetic request must carry coupon_type=1.', failures);
  assert(!Array.isArray(exceptionRequestBody.delivery_authors), 'UploadCandidate exception request must not use delivery_authors.', failures);

  const exceptionMockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), exceptionRule.mockedResponsePath));
  assert(exceptionMockedResponse.st === 1, 'Exception response st must be non-zero.', failures);
  assert(exceptionMockedResponse.code === 500, 'Exception response code must be 500.', failures);
  assert(exceptionMockedResponse.msg === 'exception', 'Exception response msg must be exception.', failures);
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(PENALTY_RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === PENALTY_RULE_ID, 'Penalty request must match R-BAM-AWARD-COUPON-PENALTY.', failures);
  assert(fixture.syntheticContract === true, 'Runtime fixture must be synthetic.', failures);
  assert(fixture.mockedResponse?.st !== 0, 'Runtime fixture must return non-success st.', failures);
  assert(fixture.mockedResponse?.code !== 0, 'Runtime fixture must return non-success code.', failures);

  const relievedFixture = loadRuntimeFixture(RELIEVED_RULE_ID, manifest);
  const relievedMatched = matchRule(relievedFixture.request, manifest);
  assert(relievedMatched.ruleId === RELIEVED_RULE_ID, 'Relieved request must match R-BAM-AWARD-COUPON-RELIEVED.', failures);
  assert(relievedFixture.syntheticContract === true, 'Relieved runtime fixture must be synthetic.', failures);
  assert(relievedFixture.mockedResponse?.st === 0, 'Relieved runtime fixture must return success st.', failures);
  assert(relievedFixture.mockedResponse?.code === 0, 'Relieved runtime fixture must return success code.', failures);

  const exceptionFixture = loadRuntimeFixture(EXCEPTION_RULE_ID, manifest);
  const exceptionMatched = matchRule(exceptionFixture.request, manifest);
  assert(exceptionMatched.ruleId === EXCEPTION_RULE_ID, 'Exception request must match R-BAM-AWARD-COUPON-EXCEPTION.', failures);
  assert(exceptionFixture.syntheticContract === true, 'Exception runtime fixture must be synthetic.', failures);
  assert(exceptionFixture.mockedResponse?.st === 1, 'Exception runtime fixture must return non-success st.', failures);
  assert(exceptionFixture.mockedResponse?.code === 500, 'Exception runtime fixture must return 500 code.', failures);
  assert(exceptionFixture.mockedResponse?.msg === 'exception', 'Exception runtime fixture must return exception msg.', failures);

  const uploadCandidate = matchRule({
    delivery_from: 2,
    delivery_list: [
      { item_id: PENALTY_CANDIDATE_ID },
    ],
  }, manifest);
  assert(uploadCandidate.ruleId === DEFAULT_RULE_ID, 'UploadCandidate branch must fall back to DEFAULT_NOOP.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain apiDeliveryDouPlusCoupon patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain apiDeliveryDouPlusCoupon patch end marker.', failures);
  assert(content.includes(PENALTY_RULE_ID), `BAM patch must include ${PENALTY_RULE_ID}.`, failures);
  assert(content.includes(RELIEVED_RULE_ID), `BAM patch must include ${RELIEVED_RULE_ID}.`, failures);
  assert(content.includes(EXCEPTION_RULE_ID), `BAM patch must include ${EXCEPTION_RULE_ID}.`, failures);
  assert(content.includes(PENALTY_CANDIDATE_ID), `BAM patch must include coupon penalty candidate ${PENALTY_CANDIDATE_ID}.`, failures);
  assert(content.includes(RELIEVED_CANDIDATE_ID), `BAM patch must include coupon relieved candidate ${RELIEVED_CANDIDATE_ID}.`, failures);
  assert(content.includes(EXCEPTION_ITEM_ID), `BAM patch must include exception item ${EXCEPTION_ITEM_ID}.`, failures);
  assert(content.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'BAM patch must emit [BAM_MOCK_SYNTHETIC_CONTRACT].', failures);
  assert(content.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(content.includes('return Promise.resolve(__bamMockSyntheticContract'), 'Synthetic award rule must not call original backend request on match.', failures);
  assert(content.includes("delivery_authors: _req['delivery_authors']"), 'BAM wrapper must keep forwarding delivery_authors from request to POST data.', failures);
  assert(content.includes("delivery_list: _req['delivery_list']"), 'BAM wrapper must keep forwarding delivery_list from request to POST data.', failures);
  assert(content.includes("delivery_from: _req['delivery_from']"), 'BAM wrapper must keep forwarding delivery_from from request to POST data.', failures);
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
  console.log('apiDeliveryDouPlusCoupon supplemental mock verification passed.');
}

main();

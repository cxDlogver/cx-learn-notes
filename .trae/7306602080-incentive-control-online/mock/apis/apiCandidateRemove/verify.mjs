#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiCandidateRemove';
const SUCCESS_RULE_ID = 'R-BAM-CANDIDATE-REMOVE-SUCCESS';
const FAILURE_RULE_ID = 'R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT';
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
  const rule = ruleById(manifest, SUCCESS_RULE_ID);
  const failureRule = ruleById(manifest, FAILURE_RULE_ID);
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);

  assert(Boolean(rule), `Missing rule ${SUCCESS_RULE_ID}`, failures);
  assert(Boolean(failureRule), `Missing rule ${FAILURE_RULE_ID}`, failures);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.syntheticContract === true, `${SUCCESS_RULE_ID} must be marked syntheticContract.`, failures);
  assert(rule.caseIds.includes('TC-INT-MANUAL-ONE-CLICK-REMOVE'), `${SUCCESS_RULE_ID} must cover manual one-click remove case.`, failures);
  assert(rule.caseIds.includes('TC-INT-BATCH-ONE-CLICK-REMOVE'), `${SUCCESS_RULE_ID} must remain reusable for batch one-click remove case.`, failures);
  assert(rule.requestFields['remove_candidates.0.remove_reason'] === '手动移除', 'First hit row remove_reason must be 手动移除.', failures);
  assert(rule.requestFields['remove_candidates.1.remove_reason'] === '命中【不激励】规则', 'Second hit row remove_reason must be 命中【不激励】规则.', failures);
  assert(rule.responseContract?.source === 'synthetic_contract', `${SUCCESS_RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(rule.responseContract?.uiNaturalAttemptCount >= 2, `${SUCCESS_RULE_ID} must record two write-safety UI attempts.`, failures);
  assert(rule.realConnectArtifact?.status === 'synthetic_contract', `${SUCCESS_RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  assert(mockedResponse.st === 0, 'Synthetic success response st must be 0.', failures);
  assert(mockedResponse.code === 0, 'Synthetic success response code must be 0.', failures);
  assert(typeof mockedResponse.msg === 'string', 'Synthetic success response msg must be present.', failures);

  if (!failureRule) return;
  assert(failureRule.syntheticContract === true, `${FAILURE_RULE_ID} must be marked syntheticContract.`, failures);
  assert(failureRule.caseIds.includes('TC-INT-MANUAL-ONE-CLICK-REMOVE__negative_assertion'), `${FAILURE_RULE_ID} must cover the manual one-click remove negative assertion subcase.`, failures);
  assert(failureRule.requestFields['remove_candidates.0.remove_reason'] === '手动移除', 'Failure branch first remove_reason must be 手动移除.', failures);
  assert(failureRule.requestFields['remove_candidates.1.remove_reason'] === '__BAM_MOCK_ABSENT__', 'Failure branch must require absent second remove_reason.', failures);
  assert(failureRule.responseContract?.source === 'synthetic_contract', `${FAILURE_RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(failureRule.responseContract?.uiNaturalAttemptCount >= 2, `${FAILURE_RULE_ID} must record two write-safety UI attempts.`, failures);
  assert(failureRule.realConnectArtifact?.status === 'synthetic_contract', `${FAILURE_RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);

  const failureResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), failureRule.mockedResponsePath));
  assert(failureResponse.st !== 0, 'Synthetic failure response st must be non-zero.', failures);
  assert(failureResponse.code !== 0, 'Synthetic failure response code must be non-zero.', failures);
  assert(typeof failureResponse.msg === 'string' && failureResponse.msg.includes('失败'), 'Synthetic failure response msg must describe failure.', failures);
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(SUCCESS_RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === SUCCESS_RULE_ID, 'Synthetic candidate_remove success request must match R-BAM-CANDIDATE-REMOVE-SUCCESS.', failures);
  assert(fixture.syntheticContract === true, 'Runtime fixture must be synthetic.', failures);
  assert(fixture.mockedResponse?.st === 0 && fixture.mockedResponse?.code === 0, 'Runtime fixture must return success.', failures);

  const failureFixture = loadRuntimeFixture(FAILURE_RULE_ID, manifest);
  const failureMatched = matchRule(failureFixture.request, manifest);
  assert(failureMatched.ruleId === FAILURE_RULE_ID, 'Synthetic candidate_remove failure request must match R-BAM-CANDIDATE-REMOVE-FAILURE-SINGLE-HIT.', failures);
  assert(failureFixture.syntheticContract === true, 'Failure runtime fixture must be synthetic.', failures);
  assert(failureFixture.mockedResponse?.st !== 0 && failureFixture.mockedResponse?.code !== 0, 'Failure runtime fixture must return non-zero response.', failures);

  const wrongReason = matchRule({
    remove_candidates: [
      { candidate_id: '100001', remove_reason: '手动移除' },
      { candidate_id: '100002', remove_reason: '手动移除' }
    ]
  }, manifest);
  assert(wrongReason.ruleId === DEFAULT_RULE_ID, 'Wrong second remove_reason must fall back to DEFAULT_NOOP.', failures);

  const singleHitWithSecondUndefined = matchRule({
    remove_candidates: [
      { candidate_id: '100001', remove_reason: '手动移除' },
    ]
  }, manifest);
  assert(singleHitWithSecondUndefined.ruleId === FAILURE_RULE_ID, 'Single-hit request with absent second remove_reason must match failure branch.', failures);
}

function verifyBamPatch(failures) {
  const content = fs.readFileSync(BAM_FILE, 'utf8');
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain apiCandidateRemove patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain apiCandidateRemove patch end marker.', failures);
  assert(content.includes(SUCCESS_RULE_ID), `BAM patch must include ${SUCCESS_RULE_ID}.`, failures);
  assert(content.includes(FAILURE_RULE_ID), `BAM patch must include ${FAILURE_RULE_ID}.`, failures);
  assert(content.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'BAM patch must emit [BAM_MOCK_SYNTHETIC_CONTRACT].', failures);
  assert(content.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(content.includes('return Promise.resolve(__bamMockSyntheticContract'), 'Synthetic write rule must not call original backend request on match.', failures);
  assert(!content.includes(`BAM_MOCK_NO_RESPONSE_DATA]') && content.includes('${SUCCESS_RULE_ID}`), 'Synthetic success rule must not be downgraded to no-response-data failure.', failures);
  assert(!content.includes(`BAM_MOCK_NO_RESPONSE_DATA]') && content.includes('${FAILURE_RULE_ID}`), 'Synthetic failure rule must not be downgraded to no-response-data failure.', failures);
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
  console.log('apiCandidateRemove supplemental mock verification passed.');
}

main();

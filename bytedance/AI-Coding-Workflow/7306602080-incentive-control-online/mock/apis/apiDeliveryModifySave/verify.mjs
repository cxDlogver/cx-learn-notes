#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  loadRuntimeFixture,
  matchRule,
} from './script.mjs';

const API_NAME = 'apiDeliveryModifySave';
const RULE_ID = 'R-BAM-DELIVERY-MODIFY-SAVE-FIRST-CANDIDATE';
const CASE_ID = 'TC-INT-AWARD-COIN-PENALTY__setup_effective_time';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const CANDIDATE_ID = '7655364163166869874';
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
  const rule = ruleById(manifest, RULE_ID);
  const defaultRule = ruleById(manifest, DEFAULT_RULE_ID);

  assert(Boolean(rule), `Missing rule ${RULE_ID}`, failures);
  assert(Boolean(defaultRule?.isDefault), `Missing default noop rule ${DEFAULT_RULE_ID}`, failures);
  if (!rule) return;

  assert(rule.syntheticContract === true, `${RULE_ID} must be marked syntheticContract.`, failures);
  assert(rule.caseIds.includes(CASE_ID), `${RULE_ID} must cover ${CASE_ID}.`, failures);
  assert(rule.requestFields['candidate_ids.0'] === CANDIDATE_ID, `Rule must match candidate_ids.0=${CANDIDATE_ID}.`, failures);
  assert(rule.requestFields.if_delivery === true, 'Rule must match if_delivery=true.', failures);
  assert(rule.responseContract?.source === 'synthetic_contract', `${RULE_ID} responseContract source must be synthetic_contract.`, failures);
  assert(rule.responseContract?.uiNaturalAttemptCount >= 2, `${RULE_ID} must record two write-safety UI attempts.`, failures);
  assert(rule.realConnectArtifact?.status === 'synthetic_contract', `${RULE_ID} realConnectArtifact must be synthetic_contract.`, failures);

  const requestBody = rule.realRequest?.body ?? {};
  assert(requestBody.candidate_ids?.[0] === CANDIDATE_ID, `Synthetic request must carry candidate ${CANDIDATE_ID}.`, failures);
  assert(requestBody.if_delivery === true, 'Synthetic request must keep if_delivery=true.', failures);
  assert(
    typeof requestBody.item_modify_config?.effective_time === 'number' && requestBody.item_modify_config.effective_time > 0,
    'Synthetic request must include item_modify_config.effective_time.',
    failures,
  );

  const mockedResponse = readJson(path.resolve(path.dirname(MANIFEST_PATH), rule.mockedResponsePath));
  assert(mockedResponse.st === 0, 'Synthetic save response st must be 0.', failures);
  assert(mockedResponse.code === 0, 'Synthetic save response code must be 0.', failures);
  assert(typeof mockedResponse.msg === 'string', 'Synthetic save response msg must be present.', failures);
}

function verifyDerivedRuntime(manifest, failures) {
  const fixture = loadRuntimeFixture(RULE_ID, manifest);
  const matched = matchRule(fixture.request, manifest);
  assert(matched.ruleId === RULE_ID, `Synthetic delivery_modify_save request must match ${RULE_ID}.`, failures);
  assert(fixture.syntheticContract === true, 'Runtime fixture must be synthetic.', failures);
  assert(fixture.mockedResponse?.st === 0 && fixture.mockedResponse?.code === 0, 'Runtime fixture must return success.', failures);

  const wrongCandidate = matchRule({
    candidate_ids: ['7655371612561344881'],
    if_delivery: true,
    item_modify_config: { effective_time: 1783648800 },
  }, manifest);
  assert(wrongCandidate.ruleId === DEFAULT_RULE_ID, 'Wrong candidate must fall back to DEFAULT_NOOP.', failures);

  const notAwardUpdate = matchRule({
    candidate_ids: [CANDIDATE_ID],
    if_delivery: false,
    not_delivery_reason: { reason_type: 1 },
  }, manifest);
  assert(notAwardUpdate.ruleId === DEFAULT_RULE_ID, 'if_delivery=false update must fall back to DEFAULT_NOOP.', failures);
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
  assert(content.includes(`BAM_MOCK_PATCH_START ${API_NAME}`), 'BAM file must contain apiDeliveryModifySave patch start marker.', failures);
  assert(content.includes(`BAM_MOCK_PATCH_END ${API_NAME}`), 'BAM file must contain apiDeliveryModifySave patch end marker.', failures);
  assert(marker.includes(RULE_ID), `BAM patch must include ${RULE_ID}.`, failures);
  assert(marker.includes(CANDIDATE_ID), `BAM patch must include candidate ${CANDIDATE_ID}.`, failures);
  assert(marker.includes('[BAM_MOCK_SYNTHETIC_CONTRACT]'), 'BAM patch must emit [BAM_MOCK_SYNTHETIC_CONTRACT].', failures);
  assert(marker.includes("console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));"), 'BAM patch must emit single-string [BAM_MOCK_HIT].', failures);
  assert(marker.includes('return Promise.resolve(__bamMockSyntheticContract'), 'Synthetic write rule must not call original backend request on match.', failures);
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
  console.log('apiDeliveryModifySave supplemental mock verification passed.');
}

main();

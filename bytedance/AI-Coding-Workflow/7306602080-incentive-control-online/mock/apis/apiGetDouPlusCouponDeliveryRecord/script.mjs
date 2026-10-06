#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_NAME = 'apiGetDouPlusCouponDeliveryRecord';
const DEFAULT_RULE_ID = 'DEFAULT_NOOP';
const ABSENT_MATCHER_VALUE = '__BAM_MOCK_ABSENT__';
const MANIFEST_PATH = path.join(path.dirname(fileURLToPath(import.meta.url)), 'manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveFromManifest(manifestPath, relativePath) {
  return path.resolve(path.dirname(manifestPath), relativePath);
}

function getPathSegments(fieldPath) {
  return fieldPath.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
}

export function getByPath(value, fieldPath) {
  return getPathSegments(fieldPath).reduce((current, segment) => current?.[segment], value);
}

function requestFieldMatches(request, key, expected) {
  const actual = getByPath(request, key);
  if (expected === ABSENT_MATCHER_VALUE) return actual === undefined || actual === null || actual === '';
  if (expected === null || ['string', 'number', 'boolean'].includes(typeof expected)) return actual === expected;
  return JSON.stringify(actual) === JSON.stringify(expected);
}

export function matchRule(request, manifest = readJson(MANIFEST_PATH)) {
  const concreteRules = manifest.ruleMatchKeys.filter((row) => row.isDefault !== true);
  const matched = concreteRules.filter((row) => Object.entries(row.requestFields ?? {}).every(
    ([key, expected]) => requestFieldMatches(request, key, expected),
  ));
  if (matched.length > 1) {
    return {
      event: 'BAM_MOCK_MATCH_ERROR',
      matchedRuleIds: matched.map((row) => row.ruleId),
    };
  }
  if (matched.length === 1) return { event: 'BAM_MOCK_SYNTHETIC_CONTRACT_CANDIDATE', ruleId: matched[0].ruleId };
  return { event: 'BAM_MOCK_DEFAULT_NOOP', ruleId: DEFAULT_RULE_ID };
}

export function loadRuntimeFixture(ruleId, manifest = readJson(MANIFEST_PATH)) {
  const rule = manifest.rules.find((item) => item.ruleId === ruleId);
  if (!rule) throw new Error(`Missing rule ${ruleId}`);
  const request = rule.realRequest?.query
    ?? rule.realRequest?.body
    ?? rule.realRequest?.requestFieldsForMatching
    ?? rule.requestFields
    ?? {};
  const mockedResponse = rule.mockedResponsePath
    ? readJson(resolveFromManifest(MANIFEST_PATH, rule.mockedResponsePath))
    : undefined;
  return {
    apiName: API_NAME,
    ruleId,
    defaultRuleId: DEFAULT_RULE_ID,
    request,
    matchFields: rule.requestFields ?? {},
    syntheticContract: rule.syntheticContract === true,
    mockedResponse,
  };
}

export function loadAllConcreteFixtures(manifest = readJson(MANIFEST_PATH)) {
  return manifest.rules
    .filter((rule) => rule.enabled !== false && rule.changeType !== '删除' && rule.isDefault !== true)
    .map((rule) => loadRuntimeFixture(rule.ruleId, manifest));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = readJson(MANIFEST_PATH);
  const results = loadAllConcreteFixtures(manifest).map((fixture) => ({
    apiName: API_NAME,
    ruleId: fixture.ruleId,
    matcher: matchRule(fixture.request, manifest),
    syntheticContract: fixture.syntheticContract,
    mockedRecordAuthorId: fixture.mockedResponse?.data?.records?.[0]?.author_info?.author_id,
  }));
  console.log(JSON.stringify(results, null, 2));
}

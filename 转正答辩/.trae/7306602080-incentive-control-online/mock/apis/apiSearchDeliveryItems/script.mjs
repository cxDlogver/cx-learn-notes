#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const API_NAME = 'apiSearchDeliveryItems';
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

export function clone(value) {
  if (value === undefined || value === null) return value;
  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
}

export function getByPath(value, fieldPath) {
  return getPathSegments(fieldPath).reduce((current, segment) => current?.[segment], value);
}

export function setByPath(target, fieldPath, value) {
  const segments = getPathSegments(fieldPath);
  let current = target;
  for (let index = 0; index < segments.length - 1; index += 1) {
    const segment = segments[index];
    const nextSegment = segments[index + 1];
    if (current[segment] === undefined || current[segment] === null) {
      current[segment] = /^\d+$/.test(nextSegment) ? [] : {};
    }
    current = current[segment];
  }
  current[segments[segments.length - 1]] = value;
}

export function applyOperations(baseResponse, operations) {
  const nextResponse = clone(baseResponse);
  for (const operation of operations) {
    if (operation.op === 'set') setByPath(nextResponse, operation.path, operation.value);
    else if (operation.op === 'merge_object') Object.assign(getByPath(nextResponse, operation.path), operation.value);
    else if (operation.op === 'delete') {
      const segments = getPathSegments(operation.path);
      const parent = segments.slice(0, -1).reduce((current, segment) => current?.[segment], nextResponse);
      if (parent) delete parent[segments[segments.length - 1]];
    } else {
      throw new Error(`Unsupported operation: ${operation.op}`);
    }
  }
  return nextResponse;
}

function isAbsentMatch(request, key) {
  return request?.[key] === undefined || request?.[key] === null || request?.[key] === '';
}

function requestFieldMatches(request, key, expected) {
  if (expected === ABSENT_MATCHER_VALUE) return isAbsentMatch(request, key);
  return request?.[key] === expected;
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
  if (matched.length === 1) return { event: 'BAM_MOCK_HIT_CANDIDATE', ruleId: matched[0].ruleId };
  return { event: 'BAM_MOCK_DEFAULT_NOOP', ruleId: DEFAULT_RULE_ID };
}

export function loadRuntimeFixture(ruleId, manifest = readJson(MANIFEST_PATH)) {
  const rule = manifest.rules.find((item) => item.ruleId === ruleId);
  if (!rule) throw new Error(`Missing rule ${ruleId}`);
  const realResponse = rule.realResponsePath
    ? readJson(resolveFromManifest(MANIFEST_PATH, rule.realResponsePath))
    : undefined;
  const expectedMockedResponse = rule.mockedResponsePath
    ? readJson(resolveFromManifest(MANIFEST_PATH, rule.mockedResponsePath))
    : undefined;
  return {
    apiName: API_NAME,
    ruleId,
    defaultRuleId: DEFAULT_RULE_ID,
    request: rule.realRequest?.query ?? rule.realRequest?.requestFieldsForMatching ?? rule.requestFields ?? {},
    matchFields: rule.requestFields ?? {},
    operations: rule.mockOperations ?? [],
    realResponse,
    expectedMockedResponse,
  };
}

export function loadAllConcreteFixtures(manifest = readJson(MANIFEST_PATH)) {
  return manifest.rules
    .filter((rule) => rule.enabled !== false && rule.changeType !== '删除' && rule.isDefault !== true)
    .map((rule) => loadRuntimeFixture(rule.ruleId, manifest));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const manifest = readJson(MANIFEST_PATH);
  const results = loadAllConcreteFixtures(manifest).map((fixture) => {
    const matched = matchRule(fixture.request, manifest);
    const mockedResponse = applyOperations(fixture.realResponse, fixture.operations);
    return {
      apiName: API_NAME,
      ruleId: fixture.ruleId,
      matcher: matched,
      operationPaths: fixture.operations.map((operation) => operation.path),
      mockedItemInfoLength: mockedResponse?.data?.item_info?.length ?? 0,
      mockedTotalNum: mockedResponse?.data?.total_num,
      mockedCandidateNum: mockedResponse?.data?.candidate_num,
      mockedHitCount: (mockedResponse?.data?.item_info ?? []).filter(
        (item) => item?.if_satisfy_delivery_rules === false || item?.if_not_incentive === true,
      ).length,
      mockedNotIncentiveCount: (mockedResponse?.data?.item_info ?? []).filter(
        (item) => item?.if_not_incentive === true,
      ).length,
    };
  });
  console.log(JSON.stringify(results, null, 2));
}

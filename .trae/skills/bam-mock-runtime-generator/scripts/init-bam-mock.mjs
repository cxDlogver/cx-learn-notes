#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertManifestLocation,
  resolveManifestArtifact,
} from './artifact-root.mjs';
import {
  validateInterfaceManifest,
  validateRuleMap,
} from './manifest-gates.mjs';

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--bam-root') args.bamRoot = argv[++i];
    else if (arg === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolveManifestFile(manifestPath, filePath) {
  return resolveManifestArtifact(manifestPath, filePath);
}

function readLinkedRuleMap(manifestPath, manifest) {
  if (!manifest.sourceRuleMap) return undefined;
  const ruleMapPath = resolveManifestFile(manifestPath, manifest.sourceRuleMap);
  if (!fs.existsSync(ruleMapPath)) throw new Error(`Missing sourceRuleMap: ${manifest.sourceRuleMap}`);
  return readJson(ruleMapPath);
}

function readRealConnectArtifacts(manifestPath, manifest) {
  const realConnectByRuleId = {};
  for (const rule of manifest.rules ?? []) {
    if (rule.changeType === '删除' || rule.enabled === false || !rule.realConnectArtifact) continue;
    const request = readJson(resolveManifestFile(manifestPath, rule.realConnectArtifact.request));
    const response = readJson(resolveManifestFile(manifestPath, rule.realConnectArtifact.response));
    readJson(resolveManifestFile(manifestPath, rule.realConnectArtifact.evidence));
    realConnectByRuleId[rule.ruleId] = {
      request,
      rawResponse: rule.realConnectArtifact.rawResponse
        ? fs.readFileSync(resolveManifestFile(manifestPath, rule.realConnectArtifact.rawResponse), 'utf8')
        : undefined,
      response,
    };
  }
  return { realConnectByRuleId };
}

function readManifest(manifestPath) {
  const manifest = readJson(manifestPath);
  const ruleMap = readLinkedRuleMap(manifestPath, manifest);
  const artifacts = readRealConnectArtifacts(manifestPath, manifest);
  const errors = validateInterfaceManifest(manifest, ruleMap, artifacts);
  if (errors.length) throw new Error(errors.join('\n'));
  return manifest;
}

function findFiles(root, pred) {
  const out = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const full = path.join(root, entry.name);
    if (entry.isDirectory()) out.push(...findFiles(full, pred));
    else if (entry.isFile() && pred(full)) out.push(full);
  }
  return out;
}

function findMatchingBrace(content, openIndex) {
  let depth = 0;
  for (let index = openIndex; index < content.length; index += 1) {
    const char = content[index];
    if (char === '{') depth += 1;
    else if (char === '}') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  return -1;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function propertyName(name) {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
}

function fieldTypeToTs(type) {
  if (type === 'array') return 'unknown[]';
  if (type === 'object') return 'Record<string, unknown>';
  if (['string', 'number', 'boolean'].includes(type)) return type;
  return 'unknown';
}

function patchInterface(content, field) {
  const typeName = field.typeName || field.targetInterface;
  const fieldPath = field.path || field.fieldPath;
  const label = `${typeName}.${fieldPath}`;
  const start = `/* BAM_MOCK_FIELD_START ${label} */`;
  if (content.includes(start)) return { content, changed: false, message: `SKIP marker exists ${label}` };

  const interfaceRe = new RegExp(`export\\s+interface\\s+${escapeRegExp(typeName)}\\s*\\{([\\s\\S]*?)\\n\\}`, 'm');
  const match = content.match(interfaceRe);
  if (!match) return { content, changed: false, message: `MISS interface ${typeName}` };

  const body = match[1];
  const key = escapeRegExp(fieldPath);
  const existingRe = new RegExp(`(?:\\b${key}\\??\\s*:|['"]${key}['"]\\??\\s*:)`);
  if (existingRe.test(body)) return { content, changed: false, message: `SKIP real field exists ${label}` };

  const optional = field.optional === false ? '' : '?';
  const declaredType = field.declaredType || fieldTypeToTs(field.type);
  const insertion = [
    '',
    `  ${start}`,
    `  ${propertyName(fieldPath)}${optional}: ${declaredType};`,
    `  /* BAM_MOCK_FIELD_END ${label} */`,
  ].join('\n');
  return {
    content: content.replace(interfaceRe, (full) => full.replace(/\n\}$/, `${insertion}\n}`)),
    changed: true,
    message: `ADD field ${label}`,
  };
}

function removeMarkerBlock(content, startMarker, endMarker, regionStart, regionEnd) {
  const startIndex = content.indexOf(startMarker, regionStart);
  if (startIndex === -1 || startIndex >= regionEnd) return content;
  const endIndex = content.indexOf(endMarker, startIndex + startMarker.length);
  if (endIndex === -1 || endIndex >= regionEnd) throw new Error(`Damaged marker: ${startMarker}`);
  const lineStart = content.lastIndexOf('\n', startIndex);
  const lineEnd = content.indexOf('\n', endIndex + endMarker.length);
  return `${content.slice(0, lineStart === -1 ? 0 : lineStart + 1)}${content.slice(lineEnd === -1 ? content.length : lineEnd + 1)}`;
}

function patchWrapperRequestMapping(content, apiName, field) {
  const fieldPath = field.fieldPath;
  const targetObject = field.targetObject;
  const targetKey = field.targetKey || fieldPath.split('.').filter(Boolean).pop();
  const label = `${apiName}.${fieldPath}`;
  const startMarker = `/* BAM_MOCK_WRAPPER_FIELD_START ${label} */`;
  const endMarker = `/* BAM_MOCK_WRAPPER_FIELD_END ${label} */`;
  const functionRe = new RegExp(`export\\s+function\\s+${escapeRegExp(apiName)}\\s*\\(`);
  const functionMatch = content.match(functionRe);
  if (!functionMatch || functionMatch.index === undefined) {
    return { content, changed: false, message: `MISS wrapper api function ${apiName}` };
  }
  const bodyStart = content.indexOf('{', functionMatch.index);
  const bodyEnd = findMatchingBrace(content, bodyStart);
  if (bodyStart === -1 || bodyEnd === -1) {
    return { content, changed: false, message: `MISS wrapper function body ${apiName}` };
  }
  const cleaned = removeMarkerBlock(content, startMarker, endMarker, bodyStart, bodyEnd);
  const cleanedFunctionMatch = cleaned.match(functionRe);
  const cleanedBodyStart = cleaned.indexOf('{', cleanedFunctionMatch.index);
  const cleanedBodyEnd = findMatchingBrace(cleaned, cleanedBodyStart);
  const declarationRe = new RegExp(`\\b(?:const|let)\\s+${escapeRegExp(targetObject)}\\s*=\\s*\\{`, 'g');
  declarationRe.lastIndex = cleanedBodyStart;
  const declarationMatch = declarationRe.exec(cleaned);
  if (!declarationMatch || declarationMatch.index >= cleanedBodyEnd) {
    return { content: cleaned, changed: cleaned !== content, message: `MISS wrapper target object ${apiName}.${targetObject}` };
  }
  const objectStart = cleaned.indexOf('{', declarationMatch.index);
  const objectEnd = findMatchingBrace(cleaned, objectStart);
  if (objectEnd === -1 || objectEnd > cleanedBodyEnd) {
    return { content: cleaned, changed: cleaned !== content, message: `MISS wrapper target object end ${apiName}.${targetObject}` };
  }
  const objectBody = cleaned.slice(objectStart + 1, objectEnd);
  const existingFieldRe = new RegExp(`(?:\\b${escapeRegExp(targetKey)}\\s*:|['"]${escapeRegExp(targetKey)}['"]\\s*:)`);
  if (existingFieldRe.test(objectBody)) {
    return { content: cleaned, changed: cleaned !== content, message: `SKIP real wrapper field exists ${label}` };
  }
  const declarationLineStart = cleaned.lastIndexOf('\n', declarationMatch.index) + 1;
  const declarationIndent = cleaned.slice(declarationLineStart, declarationMatch.index).match(/^\s*/)?.[0] ?? '';
  const fieldIndent = `${declarationIndent}  `;
  const insertion = [
    `${fieldIndent}${startMarker}`,
    `${fieldIndent}${propertyName(targetKey)}: ${field.expression},`,
    `${fieldIndent}${endMarker}`,
  ].join('\n');
  const beforeClose = cleaned.slice(0, objectEnd).replace(/\s*$/, '');
  const previousFieldSeparator = objectBody.trim() !== ''
    && !objectBody.trimEnd().endsWith(',')
    && !/BAM_MOCK_WRAPPER_FIELD_END\s+[^*]+\*\/$/.test(objectBody.trimEnd())
    ? ','
    : '';
  return {
    content: `${beforeClose}${previousFieldSeparator}\n${insertion}\n${declarationIndent}${cleaned.slice(objectEnd)}`,
    changed: true,
    message: `ADD wrapper field ${label}`,
  };
}

function indentBlock(text, prefix) {
  return text.split('\n').map((line) => (line ? `${prefix}${line}` : '')).join('\n');
}

const ABSENT_MATCHER_VALUE = '__BAM_MOCK_ABSENT__';

function buildAccessExpression(rootExpression, fieldPath) {
  return fieldPath
    .split('.')
    .reduce((current, segment) => `${current}?.[${JSON.stringify(segment)}]`, `(${rootExpression})`);
}

function buildValueMatcher(accessExpression, value) {
  if (value === ABSENT_MATCHER_VALUE) {
    return `(${accessExpression} === undefined || ${accessExpression} === null || ${accessExpression} === '')`;
  }
  if (value === null || ['string', 'number', 'boolean'].includes(typeof value)) {
    return `${accessExpression} === ${JSON.stringify(value)}`;
  }
  return `JSON.stringify(${accessExpression}) === ${JSON.stringify(JSON.stringify(value))}`;
}

function buildRequestFieldsMatcher(requestFields, reqExpression) {
  const matcherParts = [];
  for (const [fieldPath, expectedValue] of Object.entries(requestFields ?? {})) {
    matcherParts.push(buildValueMatcher(buildAccessExpression(reqExpression, fieldPath), expectedValue));
  }
  return matcherParts.length ? matcherParts.join(' && ') : undefined;
}

function activeRules(manifest) {
  return (manifest.rules ?? []).filter((rule) => rule.changeType !== '删除' && rule.enabled !== false);
}

function loadRuleOperations(rule) {
  if (Array.isArray(rule.mockOperations)) return rule.mockOperations;
  if (Array.isArray(rule.runtimePatch?.operations)) return rule.runtimePatch.operations;
  return [];
}

function ruleHasNoResponseData(rule) {
  return rule.noResponseData === true
    || rule.responseContract?.source === 'no_response_data'
    || rule.realConnectArtifact?.status === 'no_response_data'
    || rule.verify?.status === 'no_response_data';
}

function ruleHasSyntheticContract(rule) {
  return rule.syntheticContract === true
    || rule.responseContract?.source === 'synthetic_contract'
    || rule.realConnectArtifact?.status === 'synthetic_contract'
    || rule.verify?.status === 'synthetic_contract';
}

function loadMockedResponse(rule, manifestPath) {
  if (Object.hasOwn(rule, 'mockedResponseBody') && rule.mockedResponseBody !== undefined) {
    return rule.mockedResponseBody;
  }
  if (typeof rule.mockedResponsePath === 'string' && rule.mockedResponsePath.trim() !== '') {
    return readJson(resolveManifestFile(manifestPath, rule.mockedResponsePath));
  }
  return undefined;
}

function loadRuntimeBranches(manifest, manifestPath, reqExpression) {
  const rulesById = new Map(activeRules(manifest).map((rule) => [rule.ruleId, rule]));
  const matchRowsByRuleId = new Map();
  for (const matchKey of manifest.ruleMatchKeys ?? []) {
    const rows = matchRowsByRuleId.get(matchKey.ruleId) ?? [];
    rows.push(matchKey);
    matchRowsByRuleId.set(matchKey.ruleId, rows);
  }

  return [...rulesById.values()].map((rule) => {
    const rows = matchRowsByRuleId.get(rule.ruleId) ?? [];
    const concreteMatchers = rows
      .filter((row) => row.isDefault !== true)
      .map((row) => buildRequestFieldsMatcher(row.requestFields, reqExpression))
      .filter(Boolean);
    const operations = loadRuleOperations(rule);
    return {
      ruleId: rule.ruleId,
      isDefault: rows.some((row) => row.isDefault === true) || rule.isDefault === true,
      matcher: concreteMatchers.length ? concreteMatchers.map((matcher) => `(${matcher})`).join(' || ') : undefined,
        requestFields: rule.requestFields || rows.find((row) => row.isDefault !== true)?.requestFields || {},
      hasOperations: operations.length > 0,
      noResponseData: ruleHasNoResponseData(rule),
      syntheticContract: ruleHasSyntheticContract(rule),
      warningMessage: rule.runtimeWarning?.message || rule.responseContract?.noResponseDataReason || 'BAM mock matched but no backend response data was collected.',
      syntheticReason: rule.responseContract?.syntheticContractReason || rule.realConnectArtifact?.syntheticContractReason || 'BAM mock uses a marked synthetic request/response contract after UI natural attempts could not locate the required interface.',
      syntheticResponseLiteral: ruleHasSyntheticContract(rule) ? JSON.stringify(loadMockedResponse(rule, manifestPath), null, 2) : undefined,
      operationsLiteral: operations.length ? JSON.stringify(operations, null, 2) : undefined,
    };
  });
}

function buildRuntimeConsoleHelperLines(manifest, indent) {
  const apiLiteral = JSON.stringify({
    apiName: manifest.apiName,
    method: manifest.method,
    path: manifest.path,
  });
  return [
    `${indent}const __bamMockRedact = (value: any, key = ''): any => {`,
    `${indent}  if (/authorization|cookie|token|ticket|secret|password/i.test(key)) return '[REDACTED]';`,
    `${indent}  if (Array.isArray(value)) return value.map((item) => __bamMockRedact(item, key));`,
    `${indent}  if (value && typeof value === 'object') {`,
    `${indent}    return Object.fromEntries(Object.entries(value).map(([innerKey, item]) => [innerKey, __bamMockRedact(item, innerKey)]));`,
    `${indent}  }`,
    `${indent}  return value;`,
    `${indent}};`,
    `${indent}const __bamMockOnHit = (ruleId: string, mockedResponse: unknown, requestBody: unknown) => {`,
    `${indent}  const __bamMockPayload = {`,
    `${indent}    event: 'BAM_MOCK_HIT',`,
    `${indent}    api: ${apiLiteral},`,
    `${indent}    ruleId,`,
    `${indent}    requestBody: __bamMockRedact(requestBody),`,
    `${indent}    mockedResponse: __bamMockRedact(mockedResponse),`,
    `${indent}  };`,
    `${indent}  console.info('[BAM_MOCK_HIT] ' + JSON.stringify(__bamMockPayload));`,
    `${indent}};`,
    `${indent}const __bamMockOnMatchError = (matchedRuleIds: string[], matchedRequestFields: Array<{ ruleId: string; requestFields: Record<string, unknown> }>, requestBody: unknown) => {`,
    `${indent}  const __bamMockPayload = {`,
    `${indent}    event: 'BAM_MOCK_MATCH_ERROR',`,
    `${indent}    apiName: ${JSON.stringify(manifest.apiName)},`,
    `${indent}    api: ${apiLiteral},`,
    `${indent}    matchedRuleIds,`,
    `${indent}    matchedRequestFields: __bamMockRedact(matchedRequestFields),`,
    `${indent}    requestBody: __bamMockRedact(requestBody),`,
    `${indent}    suggestedRuleId: 'ADD_COMBINED_RULE_FOR_' + matchedRuleIds.join('__'),`,
    `${indent}    message: 'Multiple BAM mock rules matched. Add a more specific combined ruleId using the matched request fields; do not treat this request as a successful mock hit.',`,
    `${indent}  };`,
    `${indent}  console.warn('[BAM_MOCK_MATCH_ERROR] ' + JSON.stringify(__bamMockPayload));`,
    `${indent}  return {`,
    `${indent}    code: 'BAM_MOCK_MATCH_ERROR',`,
    `${indent}    success: false,`,
    `${indent}    message: __bamMockPayload.message,`,
    `${indent}    matchedRuleIds,`,
    `${indent}    suggestedRuleId: __bamMockPayload.suggestedRuleId,`,
    `${indent}  };`,
    `${indent}};`,
    `${indent}const __bamMockOnPatchError = (ruleId: string, error: unknown, originalResponse: unknown, requestBody: unknown) => {`,
    `${indent}  const __bamMockPayload = {`,
    `${indent}    event: 'BAM_MOCK_PATCH_ERROR',`,
    `${indent}    apiName: ${JSON.stringify(manifest.apiName)},`,
    `${indent}    api: ${apiLiteral},`,
    `${indent}    ruleId,`,
    `${indent}    requestBody: __bamMockRedact(requestBody),`,
    `${indent}    originalResponse: __bamMockRedact(originalResponse),`,
    `${indent}    message: error instanceof Error ? error.message : String(error),`,
    `${indent}  };`,
    `${indent}  console.warn('[BAM_MOCK_PATCH_ERROR] ' + JSON.stringify(__bamMockPayload));`,
    `${indent}};`,
    `${indent}const __bamMockNoResponseData = (ruleId: string, requestBody: unknown, message: string) => {`,
    `${indent}  const __bamMockPayload = {`,
    `${indent}    event: 'BAM_MOCK_NO_RESPONSE_DATA',`,
    `${indent}    apiName: ${JSON.stringify(manifest.apiName)},`,
    `${indent}    api: ${apiLiteral},`,
    `${indent}    ruleId,`,
    `${indent}    requestBody: __bamMockRedact(requestBody),`,
    `${indent}    message,`,
    `${indent}    reminder: message,`,
    `${indent}  };`,
    `${indent}  console.warn('[BAM_MOCK_NO_RESPONSE_DATA] ' + JSON.stringify(__bamMockPayload));`,
    `${indent}  return {`,
    `${indent}    code: 'BAM_MOCK_NO_RESPONSE_DATA',`,
    `${indent}    success: false,`,
    `${indent}    message,`,
    `${indent}  };`,
    `${indent}};`,
    `${indent}const __bamMockSyntheticContract = (ruleId: string, requestBody: unknown, mockedResponse: unknown, reason: string) => {`,
    `${indent}  const __bamMockPayload = {`,
    `${indent}    event: 'BAM_MOCK_SYNTHETIC_CONTRACT',`,
    `${indent}    apiName: ${JSON.stringify(manifest.apiName)},`,
    `${indent}    api: ${apiLiteral},`,
    `${indent}    ruleId,`,
    `${indent}    requestBody: __bamMockRedact(requestBody),`,
    `${indent}    mockedResponse: __bamMockRedact(mockedResponse),`,
    `${indent}    reason,`,
    `${indent}    reminder: 'This BAM mock response is synthetic because two UI natural-click attempts could not locate the required interface. Real integration verification is still required.',`,
    `${indent}  };`,
    `${indent}  console.warn('[BAM_MOCK_SYNTHETIC_CONTRACT] ' + JSON.stringify(__bamMockPayload));`,
    `${indent}  __bamMockOnHit(ruleId, mockedResponse, requestBody);`,
    `${indent}  return mockedResponse;`,
    `${indent}};`,
    `${indent}const __bamMockClone = (value: any): any => {`,
    `${indent}  if (value === undefined || value === null) return value;`,
    `${indent}  return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));`,
    `${indent}};`,
    `${indent}const __bamMockPathSegments = (fieldPath: string): string[] => fieldPath.replace(/\\[(\\d+)\\]/g, '.$1').split('.').filter(Boolean);`,
    `${indent}const __bamMockSetByPath = (target: any, fieldPath: string, value: unknown) => {`,
    `${indent}  const segments = __bamMockPathSegments(fieldPath);`,
    `${indent}  let current = target;`,
    `${indent}  for (let index = 0; index < segments.length - 1; index += 1) {`,
    `${indent}    const segment = segments[index];`,
    `${indent}    const nextSegment = segments[index + 1];`,
    `${indent}    if (current[segment] === undefined || current[segment] === null) current[segment] = /^\\d+$/.test(nextSegment) ? [] : {};`,
    `${indent}    current = current[segment];`,
    `${indent}  }`,
    `${indent}  current[segments[segments.length - 1]] = value;`,
    `${indent}};`,
    `${indent}const __bamMockMergeObjectByPath = (target: any, fieldPath: string, value: unknown) => {`,
    `${indent}  const segments = __bamMockPathSegments(fieldPath);`,
    `${indent}  let current = target;`,
    `${indent}  for (const segment of segments) {`,
    `${indent}    if (current[segment] === undefined || current[segment] === null) current[segment] = {};`,
    `${indent}    current = current[segment];`,
    `${indent}  }`,
    `${indent}  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('merge_object value must be an object');`,
    `${indent}  Object.assign(current, value);`,
    `${indent}};`,
    `${indent}const __bamMockDeleteByPath = (target: any, fieldPath: string) => {`,
    `${indent}  const segments = __bamMockPathSegments(fieldPath);`,
    `${indent}  let current = target;`,
    `${indent}  for (let index = 0; index < segments.length - 1; index += 1) {`,
    `${indent}    current = current?.[segments[index]];`,
    `${indent}    if (current === undefined || current === null) return;`,
    `${indent}  }`,
    `${indent}  delete current[segments[segments.length - 1]];`,
    `${indent}};`,
    `${indent}const __bamMockApplyOperations = (baseResponse: any, operations: Array<{ op: string; path: string; value?: unknown }>) => {`,
    `${indent}  const nextResponse = __bamMockClone(baseResponse);`,
    `${indent}  for (const operation of operations) {`,
    `${indent}    if (!operation || typeof operation.path !== 'string') throw new Error('mock operation requires path');`,
    `${indent}    if (operation.op === 'set') __bamMockSetByPath(nextResponse, operation.path, operation.value);`,
    `${indent}    else if (operation.op === 'merge_object') __bamMockMergeObjectByPath(nextResponse, operation.path, operation.value);`,
    `${indent}    else if (operation.op === 'delete') __bamMockDeleteByPath(nextResponse, operation.path);`,
    `${indent}    else throw new Error('unsupported mock operation: ' + operation.op);`,
    `${indent}  }`,
    `${indent}  return nextResponse;`,
    `${indent}};`,
  ];
}

function buildRuntimePatchLines(branches, reqExpression, originalRequestExpression, indent) {
  const lines = [];
  const concreteBranches = branches.filter((branch) => branch.matcher && (branch.hasOperations || branch.noResponseData || branch.syntheticContract));
  const defaultBranch = branches.find((branch) => branch.isDefault);

  if (concreteBranches.length) {
      lines.push(`${indent}const __bamMockMatches: Array<{ ruleId: string; requestFields: Record<string, unknown>; operations: Array<{ op: string; path: string; value?: unknown }>; noResponseData?: boolean; syntheticContract?: boolean; warningMessage?: string; syntheticReason?: string; syntheticResponse?: unknown }> = [];`);
    for (const branch of concreteBranches) {
      lines.push(`${indent}if (${branch.matcher}) {`);
      lines.push(`${indent}  __bamMockMatches.push({`);
      lines.push(`${indent}    ruleId: ${JSON.stringify(branch.ruleId)},`);
        lines.push(`${indent}    requestFields: ${JSON.stringify(branch.requestFields ?? {})},`);
      lines.push(`${indent}    operations:`);
      lines.push(indentBlock(branch.operationsLiteral || '[]', `${indent}      `) + ',');
      if (branch.noResponseData) {
        lines.push(`${indent}    noResponseData: true,`);
        lines.push(`${indent}    warningMessage: ${JSON.stringify(branch.warningMessage)},`);
      }
      if (branch.syntheticContract) {
        lines.push(`${indent}    syntheticContract: true,`);
        lines.push(`${indent}    syntheticReason: ${JSON.stringify(branch.syntheticReason)},`);
        lines.push(`${indent}    syntheticResponse:`);
        lines.push(indentBlock(branch.syntheticResponseLiteral || 'undefined', `${indent}      `) + ',');
      }
      lines.push(`${indent}  });`);
      lines.push(`${indent}}`);
    }
    lines.push(`${indent}if (__bamMockMatches.length === 1) {`);
    lines.push(`${indent}  const __bamMockMatch = __bamMockMatches[0];`);
    lines.push(`${indent}  if (__bamMockMatch.noResponseData) {`);
    lines.push(`${indent}    return Promise.resolve(__bamMockNoResponseData(__bamMockMatch.ruleId, ${reqExpression}, __bamMockMatch.warningMessage || 'BAM mock matched but no backend response data was collected.'));`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  if (__bamMockMatch.syntheticContract) {`);
    lines.push(`${indent}    return Promise.resolve(__bamMockSyntheticContract(__bamMockMatch.ruleId, ${reqExpression}, __bamMockMatch.syntheticResponse, __bamMockMatch.syntheticReason || 'BAM mock uses a marked synthetic contract.'));`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  return ${originalRequestExpression}.then((__bamMockOriginalResponse) => {`);
    lines.push(`${indent}    try {`);
    lines.push(`${indent}      const __bamMockResponse = __bamMockApplyOperations(__bamMockOriginalResponse, __bamMockMatch.operations);`);
    lines.push(`${indent}      __bamMockOnHit(__bamMockMatch.ruleId, __bamMockResponse, ${reqExpression});`);
    lines.push(`${indent}      return __bamMockResponse;`);
    lines.push(`${indent}    } catch (__bamMockError) {`);
    lines.push(`${indent}      __bamMockOnPatchError(__bamMockMatch.ruleId, __bamMockError, __bamMockOriginalResponse, ${reqExpression});`);
    lines.push(`${indent}      return __bamMockOriginalResponse;`);
    lines.push(`${indent}    }`);
    lines.push(`${indent}  });`);
    lines.push(`${indent}}`);
    lines.push(`${indent}if (__bamMockMatches.length > 1) {`);
      lines.push(`${indent}  const __bamMockMatchError = __bamMockOnMatchError(__bamMockMatches.map((match) => match.ruleId), __bamMockMatches.map((match) => ({ ruleId: match.ruleId, requestFields: match.requestFields })), ${reqExpression});`);
    lines.push(`${indent}  if (__bamMockMatches.some((match) => match.noResponseData || match.syntheticContract)) {`);
      lines.push(`${indent}    return Promise.resolve(__bamMockMatchError);`);
    lines.push(`${indent}  }`);
    lines.push(`${indent}  return ${originalRequestExpression}.then((__bamMockOriginalResponse) => {`);
    lines.push(`${indent}    return __bamMockOriginalResponse;`);
    lines.push(`${indent}  });`);
    lines.push(`${indent}}`);
  }

  if (defaultBranch?.hasOperations) {
    if (lines.length) lines.push('');
    const condition = concreteBranches.length ? '!__bamMockMatches.length' : 'true';
    lines.push(`${indent}if (${condition}) {`);
    lines.push(`${indent}  const __bamMockDefaultOperations =`);
    lines.push(indentBlock(defaultBranch.operationsLiteral, `${indent}    `) + ';');
    lines.push(`${indent}  return ${originalRequestExpression}.then((__bamMockOriginalResponse) => {`);
    lines.push(`${indent}    try {`);
    lines.push(`${indent}      const __bamMockResponse = __bamMockApplyOperations(__bamMockOriginalResponse, __bamMockDefaultOperations);`);
    lines.push(`${indent}      __bamMockOnHit(${JSON.stringify(defaultBranch.ruleId)}, __bamMockResponse, ${reqExpression});`);
    lines.push(`${indent}      return __bamMockResponse;`);
    lines.push(`${indent}    } catch (__bamMockError) {`);
    lines.push(`${indent}      __bamMockOnPatchError(${JSON.stringify(defaultBranch.ruleId)}, __bamMockError, __bamMockOriginalResponse, ${reqExpression});`);
    lines.push(`${indent}      return __bamMockOriginalResponse;`);
    lines.push(`${indent}    }`);
    lines.push(`${indent}  });`);
    lines.push(`${indent}}`);
  }
  return lines;
}

function inferRequestExpression(functionSignature, bodyBeforeReturn) {
  if (/\bconst\s+_req\s*=/.test(bodyBeforeReturn)) return '_req';
  if (/\bconst\s+data\s*=/.test(bodyBeforeReturn) || /\blet\s+data\s*=/.test(bodyBeforeReturn)) return 'data || {}';
  if (/\breq\b/.test(functionSignature)) return 'req || {}';
  return '{}';
}

function removeExistingPatchFromFunctionRegion(content, apiName, bodyStart) {
  const startMarker = `/* BAM_MOCK_PATCH_START ${apiName} */`;
  const endMarker = `/* BAM_MOCK_PATCH_END ${apiName} */`;
  const nextDocIndex = content.indexOf('\n/**', bodyStart + 1);
  const regionEnd = nextDocIndex === -1 ? content.length : nextDocIndex;
  const startIndex = content.indexOf(startMarker, bodyStart);
  if (startIndex === -1 || startIndex >= regionEnd) return { content, removed: false };

  let endIndex = -1;
  let searchIndex = startIndex;
  while (true) {
    const nextEndIndex = content.indexOf(endMarker, searchIndex);
    if (nextEndIndex === -1 || nextEndIndex >= regionEnd) break;
    endIndex = nextEndIndex;
    searchIndex = nextEndIndex + endMarker.length;
  }
  if (endIndex === -1) throw new Error(`Existing patch marker for ${apiName} is damaged. Missing end marker.`);

  const lineStart = content.lastIndexOf('\n', startIndex);
  const spanStart = lineStart === -1 ? 0 : lineStart + 1;
  const lineEnd = content.indexOf('\n', endIndex + endMarker.length);
  const spanEnd = lineEnd === -1 ? content.length : lineEnd + 1;
  return {
    content: `${content.slice(0, spanStart)}${content.slice(spanEnd)}`,
    removed: true,
  };
}

function patchApiFunction(content, manifest, manifestPath, replacingExistingPatch = false) {
  const start = `/* BAM_MOCK_PATCH_START ${manifest.apiName} */`;
  const functionRe = new RegExp(`export\\s+function\\s+${escapeRegExp(manifest.apiName)}\\s*\\(`);
  const functionMatch = content.match(functionRe);
  if (!functionMatch || functionMatch.index === undefined) return { content, changed: false, message: `MISS api function ${manifest.apiName}` };

  const bodyStart = content.indexOf('{', functionMatch.index);
  if (bodyStart === -1) return { content, changed: false, message: `MISS function body ${manifest.apiName}` };
  const cleanup = removeExistingPatchFromFunctionRegion(content, manifest.apiName, bodyStart);
  if (cleanup.removed) {
    const result = patchApiFunction(cleanup.content, manifest, manifestPath, true);
    return { ...result, message: `REPLACE inline patch ${manifest.apiName}` };
  }

  const bodyEnd = findMatchingBrace(content, bodyStart);
  if (bodyEnd === -1) return { content, changed: false, message: `MISS function end ${manifest.apiName}` };

  const before = content.slice(0, bodyStart + 1);
  const signature = content.slice(functionMatch.index, bodyStart);
  const body = content.slice(bodyStart + 1, bodyEnd);
  const after = content.slice(bodyEnd);
  const returnRe = /^(\s*)return\s+([\s\S]*?Options\.request\([\s\S]*?\));/m;
  const returnMatch = body.match(returnRe);
  if (!returnMatch || returnMatch.index === undefined) return { content, changed: false, message: `MISS request return ${manifest.apiName}` };

  const indent = returnMatch[1];
  const bodyBeforeReturn = body.slice(0, returnMatch.index);
  const reqExpression = inferRequestExpression(signature, bodyBeforeReturn);
  const branches = loadRuntimeBranches(manifest, manifestPath, reqExpression);
  const hasMockBranch = branches.some((branch) => branch.hasOperations || branch.noResponseData || branch.syntheticContract);
  const patchLines = [
    `${indent}${start}`,
    ...(hasMockBranch ? buildRuntimeConsoleHelperLines(manifest, indent) : []),
    ...(hasMockBranch ? [''] : []),
    ...buildRuntimePatchLines(branches, reqExpression, returnMatch[2], indent),
    `${indent}/* BAM_MOCK_PATCH_END ${manifest.apiName} */`,
  ];
  const patchBlock = patchLines.join('\n');

  const patchedBody = `${body.slice(0, returnMatch.index)}${patchBlock}\n${body.slice(returnMatch.index)}`;
  return {
    content: `${before}${patchedBody}${after}`,
    changed: true,
    message: `${replacingExistingPatch ? 'REPLACE' : 'ADD'} inline patch ${manifest.apiName}`,
  };
}

function findInterfaceFiles(root) {
  return findFiles(root, (file) => file.endsWith('.ts') && file.includes(`${path.sep}namespaces${path.sep}`));
}

function findApiFiles(root, manifest) {
  const explicit = manifest.targetBamFile || manifest.patch?.targetBamFile;
  if (explicit) {
    const resolved = path.isAbsolute(explicit) ? explicit : path.resolve(root, explicit);
    return fs.existsSync(resolved) ? [resolved] : [];
  }
  return findFiles(root, (file) => file.endsWith('.ts') && !file.includes(`${path.sep}namespaces${path.sep}`));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest || !args.bamRoot) {
    throw new Error('Usage: init-bam-mock.mjs --manifest <mock/apis/<apiName>/manifest.json> --bam-root <src/bam/service> [--apply]');
  }

  assertManifestLocation(args.manifest);
  const manifest = readManifest(args.manifest);
  const namespaceFiles = findInterfaceFiles(args.bamRoot);
  const apiFiles = findApiFiles(args.bamRoot, manifest);
  const report = [];

  const fields = [...(manifest.requestFields ?? []), ...(manifest.responseFields ?? [])]
    .filter((field) => field.kind !== 'wrapper_request_mapping');
  for (const field of fields) {
    const typeName = field.typeName || field.targetInterface;
    let handled = false;
    for (const file of namespaceFiles) {
      const content = fs.readFileSync(file, 'utf8');
      if (!content.includes(`interface ${typeName}`)) continue;
      const result = patchInterface(content, field);
      report.push(`${result.message} in ${path.relative(process.cwd(), file)}`);
      if (result.changed && args.apply) fs.writeFileSync(file, result.content);
      handled = true;
      break;
    }
    if (!handled) report.push(`MISS file for interface ${typeName}`);
  }

  const wrapperFields = (manifest.requestFields ?? []).filter((field) => field.kind === 'wrapper_request_mapping');
  for (const field of wrapperFields) {
    let handled = false;
    for (const file of apiFiles) {
      const original = fs.readFileSync(file, 'utf8');
      if (!original.includes(`function ${manifest.apiName}`)) continue;
      const result = patchWrapperRequestMapping(original, manifest.apiName, field);
      report.push(`${result.message} in ${path.relative(process.cwd(), file)}`);
      if (result.changed && args.apply) fs.writeFileSync(file, result.content);
      handled = !result.message.startsWith('MISS');
      break;
    }
    if (!handled) report.push(`MISS wrapper field ${manifest.apiName}.${field.fieldPath}`);
  }

  let apiHandled = false;
  for (const file of apiFiles) {
    const original = fs.readFileSync(file, 'utf8');
    if (!original.includes(`function ${manifest.apiName}`)) continue;
    const result = patchApiFunction(original, manifest, args.manifest);
    report.push(`${result.message} in ${path.relative(process.cwd(), file)}`);
    if (result.changed && args.apply) fs.writeFileSync(file, result.content);
    apiHandled = true;
    break;
  }
  if (!apiHandled) report.push(`MISS file for api function ${manifest.apiName}`);

  console.log(report.join('\n'));
  if (!args.apply) console.log('DRY RUN only. Re-run with --apply to write files.');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

export {
  patchApiFunction,
  patchInterface,
  patchWrapperRequestMapping,
};

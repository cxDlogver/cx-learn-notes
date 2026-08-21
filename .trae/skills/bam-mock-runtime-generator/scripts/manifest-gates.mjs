function unique(values) {
  return new Set(values).size === values.length;
}

function canonicalMatchKey(values) {
  return JSON.stringify(Object.fromEntries(
    Object.entries(values ?? {}).sort(([left], [right]) => left.localeCompare(right)),
  ));
}

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function hasPresentOwn(object, key) {
  return Object.hasOwn(object ?? {}, key) && object[key] !== undefined;
}

function parseFieldPath(fieldPath) {
  return String(fieldPath)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
}

function getByPath(value, fieldPath) {
  return parseFieldPath(fieldPath).reduce((current, segment) => current?.[segment], value);
}

function deepEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) || Array.isArray(right)) {
    return Array.isArray(left)
      && Array.isArray(right)
      && left.length === right.length
      && left.every((item, index) => deepEqual(item, right[index]));
  }
  if (isObject(left) || isObject(right)) {
    if (!isObject(left) || !isObject(right)) return false;
    const leftKeys = Object.keys(left).sort();
    const rightKeys = Object.keys(right).sort();
    return leftKeys.length === rightKeys.length
      && leftKeys.every((key, index) => key === rightKeys[index] && deepEqual(left[key], right[key]));
  }
  return false;
}

function activeRules(rules) {
  return (rules ?? []).filter((rule) => rule.changeType !== '删除' && rule.enabled !== false);
}

function normalizeCaseIds(rule) {
  if (!Array.isArray(rule?.caseIds)) return [];
  return rule.caseIds.filter((caseId) => typeof caseId === 'string' && caseId.trim() !== '').map((caseId) => caseId.trim());
}

function ruleHasResponse(rule) {
  return hasPresentOwn(rule, 'mockedResponseBody')
    || (typeof rule.mockedResponsePath === 'string' && rule.mockedResponsePath.trim() !== '');
}

function ruleHasRealResponse(rule) {
  return hasPresentOwn(rule, 'realResponseBody')
    || (typeof rule.realResponsePath === 'string' && rule.realResponsePath.trim() !== '');
}

function ruleHasMockOperations(rule) {
  return Array.isArray(rule.mockOperations) && rule.mockOperations.length > 0
    || Array.isArray(rule.runtimePatch?.operations) && rule.runtimePatch.operations.length > 0;
}

function ruleIsBlocked(rule) {
  return rule.verify?.status === 'blocked'
    || rule.verifyStatus === 'blocked'
    || rule.blocked === true;
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

function containsPlaceholderValue(value) {
  if (typeof value === 'string') return /\b(mock|sample|fallback)[_-]/i.test(value);
  if (Array.isArray(value)) return value.some((item) => containsPlaceholderValue(item));
  if (isObject(value)) return Object.values(value).some((item) => containsPlaceholderValue(item));
  return false;
}

function artifactForRule(artifacts, ruleId) {
  if (!artifacts) return undefined;
  const source = artifacts.realConnectByRuleId ?? artifacts;
  const artifact = source instanceof Map ? source.get(ruleId) : source?.[ruleId];
  if (!artifact) return undefined;
  return hasPresentOwn(artifact, 'request') || hasPresentOwn(artifact, 'response')
    ? artifact
    : { response: artifact };
}

function findNumericField(value, names) {
  if (!isObject(value)) return undefined;
  for (const [key, item] of Object.entries(value)) {
    if (names.has(key) && (typeof item === 'number' || typeof item === 'string') && item !== '') {
      const numeric = Number(item);
      if (Number.isFinite(numeric)) return numeric;
    }
  }
  for (const item of Object.values(value)) {
    if (isObject(item)) {
      const nested = findNumericField(item, names);
      if (nested !== undefined) return nested;
    }
  }
  return undefined;
}

function collectArrayPaths(value, path = [], parent = undefined, out = []) {
  if (Array.isArray(value)) {
    out.push({ path: path.join('.'), value, parent });
    return out;
  }
  if (!isObject(value)) return out;
  for (const [key, item] of Object.entries(value)) {
    collectArrayPaths(item, [...path, key], value, out);
  }
  return out;
}

function isPrimaryListArray(arrayInfo) {
  const lastSegment = arrayInfo.path.split('.').pop() ?? '';
  return /(list|items|records|rows|results|data)$/i.test(lastSegment)
    || arrayInfo.value.some((item) => isObject(item));
}

function findSiblingTotal(parent) {
  if (!isObject(parent)) return undefined;
  const totalKeys = new Set(['total', 'total_cnt', 'total_count', 'totalCount', 'total_num', 'totalNum', 'count']);
  const totals = Object.entries(parent)
    .filter(([key]) => totalKeys.has(key))
    .map(([, value]) => Number(value))
    .filter((value) => Number.isFinite(value) && value >= 0);
  return totals.length ? Math.max(...totals) : undefined;
}

function validatePaginatedArtifactCompleteness(rule, label, artifact) {
  const errors = [];
  const artifactResponse = artifact?.response;
  if (!artifactResponse) return errors;

  const pageSizeNames = new Set(['page_size', 'pageSize', 'limit', 'size']);
  const pageNumberNames = new Set(['page_num', 'pageNum', 'page_no', 'pageNo', 'page', 'current']);
  const requestSources = [
    artifact.request,
    rule.realRequest,
    rule.responseContract?.request,
    { body: rule.requestFields, query: rule.requestFields },
  ];
  const pageSize = requestSources.map((source) => findNumericField(source, pageSizeNames)).find((value) => value > 0);
  if (!pageSize) return errors;
  const pageNumber = requestSources.map((source) => findNumericField(source, pageNumberNames)).find((value) => value !== undefined);
  const pageIndex = Math.max(Number(pageNumber ?? 1) - 1, 0);

  for (const arrayInfo of collectArrayPaths(artifactResponse).filter(isPrimaryListArray)) {
    const total = findSiblingTotal(arrayInfo.parent);
    if (total === undefined || total <= arrayInfo.value.length) continue;
    const expectedLength = Math.min(pageSize, Math.max(total - pageIndex * pageSize, 0));
    if (arrayInfo.value.length < expectedLength) {
      errors.push(`${label} realConnectArtifact.response ${arrayInfo.path} has ${arrayInfo.value.length} rows, expected at least ${expectedLength} from request page_size=${pageSize} and total=${total}; recapture the raw full response, and only mark the rule blocked when the UI request point is unreachable`);
    }
  }
  return errors;
}

function validateRealResponseIntegrity(rule, label, artifact) {
  const errors = [];
  if (!artifact?.response) return errors;

  if (typeof artifact.rawResponse === 'string') {
    if (artifact.rawResponse.trim() === '') {
      errors.push(`${label} realConnectArtifact.rawResponse file must not be empty`);
    } else {
      try {
        const parsedRawResponse = JSON.parse(artifact.rawResponse);
        if (!deepEqual(parsedRawResponse, artifact.response)) {
          errors.push(`${label} realConnectArtifact.response must be parsed from rawResponse; parsed response.raw.txt differs from response.json`);
        }
      } catch (error) {
        errors.push(`${label} realConnectArtifact.rawResponse must contain parseable JSON before converting to response.json`);
      }
    }
  }

  if (hasPresentOwn(rule, 'realResponseBody') && !deepEqual(rule.realResponseBody, artifact.response)) {
    errors.push(`${label} realResponseBody must match realConnectArtifact.response exactly; do not summarize, sample, or truncate the true response`);
  }
  if (typeof rule.realResponsePath === 'string') {
    if (rule.realResponsePath.trim() === '') {
      errors.push(`${label} realResponsePath must be non-empty when present`);
    } else if (rule.realConnectArtifact?.response && rule.realResponsePath !== rule.realConnectArtifact.response) {
      errors.push(`${label} realResponsePath must point to realConnectArtifact.response; do not reference derived response snapshots`);
    }
  }
  errors.push(...validatePaginatedArtifactCompleteness(rule, label, artifact));
  return errors;
}

function validateArtifactRef(artifact, label, blocked, noResponseData = false, syntheticContract = false) {
  const errors = [];
  if (!isObject(artifact)) return [`${label} realConnectArtifact is required for every active rule`];
  if (!['passed', 'blocked', 'no_response_data', 'synthetic_contract'].includes(artifact.status)) {
    errors.push(`${label} realConnectArtifact.status is invalid`);
  }
  for (const key of ['request', 'response', 'evidence']) {
    if (typeof artifact[key] !== 'string' || artifact[key].trim() === '') {
      errors.push(`${label} realConnectArtifact.${key} is required`);
    }
  }
  if (blocked && artifact.status !== 'blocked') {
    errors.push(`${label} blocked rule requires blocked realConnectArtifact`);
  }
  if (noResponseData && artifact.status !== 'no_response_data') {
    errors.push(`${label} no-response-data rule requires no_response_data realConnectArtifact`);
  }
  if (syntheticContract && artifact.status !== 'synthetic_contract') {
    errors.push(`${label} synthetic contract rule requires synthetic_contract realConnectArtifact`);
  }
  if (!blocked && !noResponseData && !syntheticContract && artifact.status !== 'passed') {
    errors.push(`${label} passed/non-blocked rule requires passed realConnectArtifact`);
  }
  if (!blocked && !noResponseData && !syntheticContract && artifact.status === 'passed'
    && (typeof artifact.rawResponse !== 'string' || artifact.rawResponse.trim() === '')) {
    errors.push(`${label} passed realConnectArtifact requires rawResponse pointing to response.raw.txt`);
  }
  if (artifact.status === 'blocked' && (typeof artifact.blockedReason !== 'string' || artifact.blockedReason.trim() === '')) {
    errors.push(`${label} blocked realConnectArtifact requires blockedReason`);
  }
  if (artifact.status === 'no_response_data' && (typeof artifact.noResponseDataReason !== 'string' || artifact.noResponseDataReason.trim() === '')) {
    errors.push(`${label} no_response_data realConnectArtifact requires noResponseDataReason`);
  }
  if (artifact.status === 'synthetic_contract') {
    if (typeof artifact.syntheticContractReason !== 'string' || artifact.syntheticContractReason.trim() === '') {
      errors.push(`${label} synthetic_contract realConnectArtifact requires syntheticContractReason`);
    }
    if (typeof artifact.interfaceNecessity !== 'string' || artifact.interfaceNecessity.trim() === '') {
      errors.push(`${label} synthetic_contract realConnectArtifact requires interfaceNecessity`);
    }
    if (typeof artifact.uiNaturalAttemptCount !== 'number' || artifact.uiNaturalAttemptCount < 2) {
      errors.push(`${label} synthetic_contract realConnectArtifact requires uiNaturalAttemptCount >= 2`);
    }
  }
  return errors;
}

function validateMockOperations(rule, label) {
  const errors = [];
  const operations = Array.isArray(rule.mockOperations)
    ? rule.mockOperations
    : Array.isArray(rule.runtimePatch?.operations)
      ? rule.runtimePatch.operations
      : [];
  const supportedOps = new Set(['set', 'merge_object', 'delete']);

  for (const [index, operation] of operations.entries()) {
    const operationLabel = `${label}.mockOperations[${index}]`;
    if (!isObject(operation)) {
      errors.push(`${operationLabel} must be an object`);
      continue;
    }
    if (!supportedOps.has(operation.op)) errors.push(`${operationLabel}.op is invalid`);
    if (typeof operation.path !== 'string' || operation.path.trim() === '') {
      errors.push(`${operationLabel}.path is required`);
    }
    if (operation.op !== 'delete' && !Object.hasOwn(operation, 'value')) {
      errors.push(`${operationLabel}.value is required for ${operation.op}`);
    }
  }

  return errors;
}

function validateRuleCaseAndRequestFields(rule, label, manifest) {
  const errors = [];
  if (rule.changeType === '删除' || rule.enabled === false || rule.isDefault === true) return errors;

  const caseIds = normalizeCaseIds(rule);
  if (!Array.isArray(rule.caseIds) || caseIds.length === 0 || caseIds.length !== rule.caseIds.length) {
    errors.push(`${label} caseIds must be a non-empty array of non-empty strings`);
  } else if (!unique(caseIds)) {
    errors.push(`${label} caseIds contains duplicate values`);
  }

  const requestFields = rule.requestFields ?? {};
  const affectingFields = new Set(manifest?.requestFieldsAffectingRules ?? Object.keys(requestFields));
  for (const key of Object.keys(requestFields)) {
    if (!affectingFields.has(key)) {
      errors.push(`${label}.requestFields.${key} must appear in requestFieldsAffectingRules`);
    }
  }

  if (!ruleIsBlocked(rule)) {
    if (!hasPresentOwn(rule, 'realRequest')) errors.push(`${label} realRequest is required`);
    if (!ruleHasNoResponseData(rule) && !ruleHasSyntheticContract(rule)) {
      if (!ruleHasRealResponse(rule)) errors.push(`${label} realResponseBody or realResponsePath is required`);
      if (!ruleHasResponse(rule)) errors.push(`${label} mockedResponseBody or mockedResponsePath is required`);
    } else if (ruleHasSyntheticContract(rule) && !ruleHasResponse(rule)) {
      errors.push(`${label} synthetic_contract rule requires mockedResponseBody or mockedResponsePath`);
    }
  }
  if (typeof rule.mockedResponsePath === 'string') {
    if (rule.mockedResponsePath.trim() === '') {
      errors.push(`${label} mockedResponsePath must be non-empty when present`);
    } else if (ruleHasSyntheticContract(rule)
      && rule.realConnectArtifact?.response
      && rule.mockedResponsePath !== rule.realConnectArtifact.response) {
      errors.push(`${label} synthetic_contract mockedResponsePath must point to realConnectArtifact.response`);
    }
  }

  return errors;
}

function validateRehydration(manifest) {
  const rehydration = manifest.rehydration;
  if (rehydration === undefined) return [];
  if (!isObject(rehydration)) return ['rehydration must be an object when present'];
  const errors = [];
  if (rehydration.strategy !== 'manifest_reapply') {
    errors.push('rehydration.strategy must be manifest_reapply');
  }
  if (!['pending', 'passed', 'failed'].includes(rehydration.status)) {
    errors.push('rehydration.status must be pending, passed, or failed');
  }
  if (typeof rehydration.script !== 'string' || !rehydration.script.endsWith('reapply-bam-mocks.mjs')) {
    errors.push('rehydration.script must reference reapply-bam-mocks.mjs');
  }
  if (typeof rehydration.command !== 'string'
    || !rehydration.command.includes('reapply-bam-mocks.mjs')
    || !rehydration.command.includes('--mock-root')
    || !rehydration.command.includes('--bam-root')) {
    errors.push('rehydration.command must invoke reapply-bam-mocks.mjs with --mock-root and --bam-root');
  }
  if (rehydration.status === 'passed' && (typeof rehydration.evidence !== 'string' || rehydration.evidence.trim() === '')) {
    errors.push('rehydration.evidence is required when rehydration.status is passed');
  }
  return errors;
}

function validateCollectionOnlyFields(manifest, rule, label) {
  const errors = [];
  const affectingFields = new Set(manifest.requestFieldsAffectingRules ?? []);
  const requestFields = rule.requestFields ?? {};
  const collectionOnlyFields = rule.realRequest?.collectionOnlyFields ?? [];
  const allowedSources = new Set([
    'network_request',
    'selected_record',
    'list_row',
    'route_context',
    'upstream_response',
    'user_provided',
    'unknown',
  ]);

  if (!Array.isArray(collectionOnlyFields)) {
    return [`${label} realRequest.collectionOnlyFields must be an array when present`];
  }

  for (const [index, field] of collectionOnlyFields.entries()) {
    const fieldLabel = `${label}.realRequest.collectionOnlyFields[${index}]`;
    if (!isObject(field)) {
      errors.push(`${fieldLabel} must be an object`);
      continue;
    }
    if (typeof field.fieldPath !== 'string' || field.fieldPath.trim() === '') {
      errors.push(`${fieldLabel}.fieldPath is required`);
      continue;
    }
    if (affectingFields.has(field.fieldPath)) {
      errors.push(`${fieldLabel}.fieldPath must not be in requestFieldsAffectingRules`);
    }
    if (Object.hasOwn(requestFields, field.fieldPath)) {
      errors.push(`${fieldLabel}.fieldPath must not also appear in rule.requestFields`);
    }
    if (ruleHasSyntheticContract(rule)) allowedSources.add('synthetic_contract');
    if (!allowedSources.has(field.source)) {
      errors.push(`${fieldLabel}.source is invalid`);
    }
    if (typeof field.reason !== 'string' || field.reason.trim() === '') {
      errors.push(`${fieldLabel}.reason is required`);
    }
    if (!Object.hasOwn(field, 'value')) {
      errors.push(`${fieldLabel}.value is required`);
    }
  }

  return errors;
}

function validateResponseContract(rule, label) {
  const errors = [];
  const requiresContract = rule.changeType !== '删除' && (rule.isDefault !== true || ruleHasResponse(rule));
  if (!requiresContract) return errors;
  if (ruleIsBlocked(rule)) return errors;
  const contract = rule.responseContract;
  if (!isObject(contract)) return [`${label} responseContract is required`];
  if (!['real_browser_request', 'no_response_data', 'synthetic_contract'].includes(contract.source)) {
    errors.push(`${label} responseContract.source must be real_browser_request, no_response_data, or synthetic_contract`);
  }
  if (typeof contract.evidence !== 'string' || contract.evidence.trim() === '') {
    errors.push(`${label} responseContract.evidence is required`);
  }
  if (!hasPresentOwn(contract, 'request')) errors.push(`${label} real response contract requires request`);
  if (contract.source === 'no_response_data' && (typeof contract.noResponseDataReason !== 'string' || contract.noResponseDataReason.trim() === '')) {
    errors.push(`${label} no_response_data responseContract requires noResponseDataReason`);
  }
  if (contract.source === 'synthetic_contract') {
    if (typeof contract.syntheticContractReason !== 'string' || contract.syntheticContractReason.trim() === '') {
      errors.push(`${label} synthetic_contract responseContract requires syntheticContractReason`);
    }
    if (typeof contract.interfaceNecessity !== 'string' || contract.interfaceNecessity.trim() === '') {
      errors.push(`${label} synthetic_contract responseContract requires interfaceNecessity`);
    }
    if (typeof contract.uiNaturalAttemptCount !== 'number' || contract.uiNaturalAttemptCount < 2) {
      errors.push(`${label} synthetic_contract responseContract requires uiNaturalAttemptCount >= 2`);
    }
  }
  if (hasPresentOwn(contract, 'body')) {
    errors.push(`${label} responseContract.body is deprecated; use realResponseBody`);
  }
  return errors;
}

function validateRuntimeWarning(rule, label) {
  if (!ruleHasNoResponseData(rule)) return [];
  const warning = rule.runtimeWarning;
  const errors = [];
  if (!isObject(warning)) return [`${label} no-response-data rule requires runtimeWarning`];
  if (warning.enabled !== true) errors.push(`${label} runtimeWarning.enabled must be true`);
  if (typeof warning.message !== 'string' || warning.message.trim() === '') {
    errors.push(`${label} runtimeWarning.message is required`);
  }
  return errors;
}

function validateRequestFieldImpact(manifest) {
  const errors = [];
  const affectingFields = manifest.requestFieldsAffectingRules ?? [];
  if (!Array.isArray(manifest.requestFieldImpact)) {
    return ['requestFieldImpact must be an array'];
  }
  const impactTypes = new Set(['rule_branch', 'record_identity', 'pagination', 'submit_assertion', 'filter_result']);
  const impacts = manifest.requestFieldImpact;
  const impactFields = impacts.map((impact) => impact.fieldPath);
  if (!unique(impactFields)) errors.push('requestFieldImpact contains duplicate fieldPath values');
  const impactByField = new Map();
  for (const impact of impacts) {
    const fieldPath = impact?.fieldPath;
    if (typeof fieldPath !== 'string' || fieldPath.trim() === '') {
      errors.push('every requestFieldImpact row requires fieldPath');
      continue;
    }
    impactByField.set(fieldPath, impact);
    if (!affectingFields.includes(fieldPath)) {
      errors.push(`requestFieldImpact documents non-impact field ${fieldPath}`);
    }
    if (!impactTypes.has(impact.impactType)) {
      errors.push(`requestFieldImpact for ${fieldPath} has invalid impactType`);
    }
    if (typeof impact.reason !== 'string' || impact.reason.trim() === '') {
      errors.push(`requestFieldImpact for ${fieldPath} requires reason`);
    }
    if (typeof impact.uiTarget !== 'string' || impact.uiTarget.trim() === '') {
      errors.push(`requestFieldImpact for ${fieldPath} requires uiTarget`);
    }
  }
  for (const fieldPath of affectingFields) {
    if (!impactByField.has(fieldPath)) {
      errors.push(`requestFieldsAffectingRules missing impact reason for ${fieldPath}`);
    }
  }
  return errors;
}

function validateFieldPatches(manifest) {
  const errors = [];
  const fields = manifest.requestFields;
  if (fields === undefined) return errors;
  if (!Array.isArray(fields)) return ['requestFields must be an array when present'];
  for (const [index, field] of fields.entries()) {
    const label = `requestFields[${index}]`;
    if (!isObject(field)) {
      errors.push(`${label} must be an object`);
      continue;
    }
    if (field.kind !== undefined && !['type_field', 'wrapper_request_mapping'].includes(field.kind)) {
      errors.push(`${label}.kind is invalid`);
    }
    for (const key of ['fieldPath', 'evidence', 'reason', 'realVerify']) {
      if (typeof field[key] !== 'string' || field[key].trim() === '') {
        errors.push(`${label}.${key} is required`);
      }
    }
    if (field.kind === 'wrapper_request_mapping') {
      if (typeof field.expression !== 'string' || field.expression.trim() === '') {
        errors.push(`${label}.expression is required for wrapper_request_mapping`);
      }
      if (typeof field.targetObject !== 'string' || field.targetObject.trim() === '') {
        errors.push(`${label}.targetObject is required for wrapper_request_mapping`);
      }
      if (typeof field.marker !== 'string' || !field.marker.includes('BAM_MOCK_WRAPPER_FIELD')) {
        errors.push(`${label}.marker must reference BAM_MOCK_WRAPPER_FIELD`);
      }
    }
  }
  return errors;
}

function normalizeIndexRule(rule) {
  const caseIds = normalizeCaseIds(rule);
  return {
    ruleId: rule?.ruleId,
    caseIds: caseIds.length > 0 ? caseIds : undefined,
    isDefault: rule?.isDefault === true,
    changeType: rule?.changeType,
    requestFields: rule?.requestFields ?? {},
  };
}

function validateRuleMapIndexRule(rule, label) {
  const errors = [];
  const allowedKeys = new Set(['ruleId', 'caseIds', 'isDefault', 'changeType', 'requestFields']);
  const extraKeys = Object.keys(rule ?? {}).filter((key) => !allowedKeys.has(key));
  if (extraKeys.length > 0) {
    errors.push(`${label}: rule-map rule must only contain index fields: ${extraKeys.join(', ')}`);
  }
  if (typeof rule?.ruleId !== 'string' || rule.ruleId.trim() === '') {
    errors.push(`${label}: ruleId is required`);
  }
  if (typeof rule?.changeType !== 'string' || rule.changeType.trim() === '') {
    errors.push(`${label}: changeType is required`);
  }
  if (rule?.caseIds !== undefined) {
    const caseIds = normalizeCaseIds(rule);
    if (!Array.isArray(rule.caseIds) || caseIds.length === 0 || caseIds.length !== rule.caseIds.length) {
      errors.push(`${label}: caseIds must be a non-empty array of non-empty strings when present`);
    } else if (!unique(caseIds)) {
      errors.push(`${label}: caseIds contains duplicate values`);
    }
  }
  if (rule?.isDefault !== undefined && typeof rule.isDefault !== 'boolean') {
    errors.push(`${label}: isDefault must be boolean when present`);
  }
  if (!isObject(rule?.requestFields)) {
    errors.push(`${label}: requestFields must be an object`);
  }
  return errors;
}

export function validateInterfaceManifest(manifest, ruleMap, artifacts) {
  const errors = [];
  if (manifest?.version !== 2) errors.push('manifest.version must be 2');
  if (manifest?.mode !== 'BAM_MOCK_INTERFACE_MANIFEST') errors.push('manifest.mode must be BAM_MOCK_INTERFACE_MANIFEST');
  for (const key of ['apiName', 'method', 'path']) {
    if (typeof manifest?.[key] !== 'string' || manifest[key].trim() === '') errors.push(`${key} is required`);
  }
  if (!Array.isArray(manifest?.rules)) errors.push('rules must be an array');
  if (!Array.isArray(manifest?.ruleMatchKeys)) errors.push('ruleMatchKeys must be an array');
  if (!Array.isArray(manifest?.requestFieldsAffectingRules)) errors.push('requestFieldsAffectingRules must be an array');
  if (!Array.isArray(manifest?.requestFieldImpact)) errors.push('requestFieldImpact must be an array');
  if (errors.length) return errors.map((error) => `${manifest?.apiName || '<unknown-api>'}: ${error}`);

  const rules = manifest.rules;
  const active = activeRules(rules);
  const ruleIds = rules.map((rule) => rule.ruleId);
  if (!unique(ruleIds)) errors.push('rules contains duplicate ruleId values');
  const activeRuleIds = new Set(active.map((rule) => rule.ruleId));
  const allRuleIds = new Set(ruleIds);
  const affectingFields = manifest.requestFieldsAffectingRules;
  if (!unique(affectingFields)) errors.push('requestFieldsAffectingRules contains duplicates');
  errors.push(...validateRequestFieldImpact(manifest));
  errors.push(...validateFieldPatches(manifest));
  errors.push(...validateRehydration(manifest));

  if ((manifest.finalVerification?.status === 'blocked' || manifest.realConnect?.status === 'blocked')
    && manifest.patch?.status === 'patched') {
    errors.push('blocked manifest must not keep patch.status=patched; use blocked_noop or remove runtime patch until realConnect passes');
  }

  const realConnectArtifacts = new Map();
  if (manifest.realConnect) {
    if (!['pending', 'passed', 'blocked', 'no_response_data', 'synthetic_contract'].includes(manifest.realConnect.status)) {
      errors.push('realConnect.status is invalid');
    }
    if (manifest.realConnect.status === 'passed' && !Array.isArray(manifest.realConnect.artifacts)) {
      errors.push('realConnect.artifacts is required when realConnect.status is passed');
    }
    if (manifest.realConnect.status === 'blocked' && typeof manifest.realConnect.reason !== 'string') {
      errors.push('realConnect.reason is required when realConnect.status is blocked');
    }
    for (const artifact of manifest.realConnect.artifacts ?? []) {
      if (artifact?.ruleId) realConnectArtifacts.set(artifact.ruleId, artifact);
    }
  }

  let defaultCount = 0;
  const seenMatchKeys = new Map();
  const matchRowsByRuleId = new Map();
  for (const matchKey of manifest.ruleMatchKeys) {
    const requestFields = matchKey.requestFields ?? {};
    const entries = Object.entries(requestFields);
    if (!matchKey.ruleId) {
      errors.push('every ruleMatchKeys row requires ruleId');
      continue;
    }
    const rowsForRule = matchRowsByRuleId.get(matchKey.ruleId) ?? [];
    rowsForRule.push(matchKey);
    matchRowsByRuleId.set(matchKey.ruleId, rowsForRule);
    if (!activeRuleIds.has(matchKey.ruleId)) errors.push(`ruleMatchKeys maps to inactive or unknown ruleId ${matchKey.ruleId}`);
    if (matchKey.isDefault === true) defaultCount += 1;
    if (matchKey.isDefault === true && entries.length !== 0) errors.push(`default ruleMatchKeys row for ${matchKey.ruleId} must use empty requestFields`);
    if (matchKey.isDefault !== true && entries.length === 0) errors.push(`non-default ruleMatchKeys row for ${matchKey.ruleId} requires requestFields`);
    for (const [fieldPath, value] of entries) {
      if (!affectingFields.includes(fieldPath)) errors.push(`ruleMatchKeys for ${matchKey.ruleId} uses non-impact field ${fieldPath}`);
      if (value === undefined) errors.push(`ruleMatchKeys for ${matchKey.ruleId} has undefined value for ${fieldPath}`);
    }
    const key = canonicalMatchKey(requestFields);
    const previous = seenMatchKeys.get(key);
    if (previous && previous !== matchKey.ruleId) errors.push(`request field key/value maps to multiple ruleIds: ${previous}, ${matchKey.ruleId}`);
    if (previous === matchKey.ruleId) errors.push(`duplicate ruleMatchKeys row for ${matchKey.ruleId}: ${key}`);
    seenMatchKeys.set(key, matchKey.ruleId);
  }
  if (defaultCount !== 1) errors.push(`ruleMatchKeys must contain exactly one default row, found ${defaultCount}`);

  const seenCaseIds = new Map();
  for (const rule of rules) {
    const label = rule.ruleId || '<empty-ruleId>';
    if (!rule.ruleId) errors.push('every rule requires ruleId');
    if (!['保留', '新增', '修改', '删除'].includes(rule.changeType)) errors.push(`${label} changeType is invalid`);
    if (!isObject(rule.requestFields)) errors.push(`${label} requestFields must be an object`);
    if (rule.isDefault === true && Object.keys(rule.requestFields ?? {}).length > 0) {
      errors.push(`${label} default rule must not contain requestFields; use a non-default rule for any impact field`);
    }
    if (rule.changeType !== '删除' && rule.enabled !== false && rule.isDefault !== true && !ruleIsBlocked(rule)) {
      const matchRows = matchRowsByRuleId.get(rule.ruleId) ?? [];
      const hasConcreteMatch = matchRows.some((row) => row.isDefault !== true && Object.keys(row.requestFields ?? {}).length > 0);
      if (!hasConcreteMatch) errors.push(`${label} active non-default rule requires a concrete ruleMatchKeys row so runtime can hit the mock rule`);
    }
    if (ruleHasNoResponseData(rule) && rule.isDefault === true) {
      errors.push(`${label} no_response_data rule must not be default; create a concrete matcher so the warning is intentional`);
    }
    if (ruleHasSyntheticContract(rule) && rule.isDefault === true) {
      errors.push(`${label} synthetic_contract rule must not be default; create a concrete matcher so the marker is intentional`);
    }
    if (rule.changeType !== '删除' && !rule.isDefault && !ruleIsBlocked(rule) && containsPlaceholderValue(rule.requestFields)) {
      errors.push(`${label} non-blocked ruleMatch fields must not use mock/sample/fallback placeholder values`);
    }
    if (typeof rule.mockRule !== 'string' || rule.mockRule.trim() === '') errors.push(`${label} mockRule is required`);
    if (typeof rule.verifyAssertion !== 'string' || rule.verifyAssertion.trim() === '') errors.push(`${label} verifyAssertion is required`);
    if (Object.hasOwn(rule, 'responseBody') || typeof rule.responsePath === 'string') {
      errors.push(`${label} responseBody/responsePath is deprecated for runtime output; use realResponseBody, mockedResponseBody, and mockOperations`);
    }
    if (rule.changeType !== '删除' && rule.isDefault !== true && !ruleIsBlocked(rule) && !ruleHasNoResponseData(rule) && !ruleHasSyntheticContract(rule) && !ruleHasMockOperations(rule)) {
      errors.push(`${label} active non-default rule requires mockOperations`);
    }
    if (rule.changeType !== '删除' && ruleHasResponse(rule) && !ruleIsBlocked(rule) && !ruleHasNoResponseData(rule) && !ruleHasSyntheticContract(rule) && !ruleHasMockOperations(rule)) {
      errors.push(`${label} mocked response is audit-only and requires mockOperations for BAM runtime`);
    }
    if (rule.changeType !== '删除' && rule.enabled !== false) {
      errors.push(...validateArtifactRef(
        rule.realConnectArtifact,
        label,
        ruleIsBlocked(rule),
        ruleHasNoResponseData(rule),
        ruleHasSyntheticContract(rule),
      ));
      if (!realConnectArtifacts.has(rule.ruleId)) {
        errors.push(`${label} missing manifest.realConnect.artifacts entry for ruleId`);
      }
    }
    errors.push(...validateCollectionOnlyFields(manifest, rule, label));
    errors.push(...validateMockOperations(rule, label));
    errors.push(...validateRuntimeWarning(rule, label));
    errors.push(...validateResponseContract(rule, label));
    errors.push(...validateRuleCaseAndRequestFields(rule, label, manifest));
    if (rule.changeType !== '删除'
      && rule.enabled !== false
      && rule.isDefault !== true
      && !ruleIsBlocked(rule)
      && !ruleHasNoResponseData(rule)
      && !ruleHasSyntheticContract(rule)) {
      errors.push(...validateRealResponseIntegrity(rule, label, artifactForRule(artifacts, rule.ruleId)));
    }
    if (rule.changeType !== '删除' && rule.enabled !== false && rule.isDefault !== true) {
      for (const caseId of normalizeCaseIds(rule)) {
        const previous = seenCaseIds.get(caseId);
        if (previous && previous !== rule.ruleId) errors.push(`case_id ${caseId} maps to multiple ruleIds: ${previous}, ${rule.ruleId}`);
        seenCaseIds.set(caseId, rule.ruleId);
      }
    }
  }

  const activeDefaultRules = active.filter((rule) => rule.isDefault === true);
  if (activeDefaultRules.length !== 1) errors.push(`active rules must contain exactly one default rule, found ${activeDefaultRules.length}`);
  for (const rule of active) {
    if (!allRuleIds.has(rule.ruleId)) errors.push(`unknown active rule ${rule.ruleId}`);
  }

  if (ruleMap) errors.push(...validateRuleMapInterfaceConsistency(ruleMap, manifest));
  return errors.map((error) => `${manifest.apiName || '<unknown-api>'}: ${error}`);
}

export function validateRuleMap(ruleMap) {
  const errors = [];
  if (ruleMap?.version !== 2) errors.push('rule-map.version must be 2');
  if (ruleMap?.mode !== 'BAM_MOCK_RULE_MAP') errors.push('rule-map.mode must be BAM_MOCK_RULE_MAP');
  if (!Array.isArray(ruleMap?.interfaces)) errors.push('rule-map.interfaces must be an array');
  if (errors.length) return errors;

  const apiNames = ruleMap.interfaces.map((api) => api.apiName);
  if (!unique(apiNames)) errors.push('rule-map.interfaces contains duplicate apiName values');
  for (const api of ruleMap.interfaces) {
    const label = api.apiName || '<unknown-api>';
    for (const key of ['apiName', 'method', 'path', 'manifest']) {
      if (typeof api[key] !== 'string' || api[key].trim() === '') errors.push(`${label}: ${key} is required`);
    }
    if (!Array.isArray(api.rules)) {
      errors.push(`${label}: rules must be an array`);
      continue;
    }
    const ruleIds = api.rules.map((rule) => rule.ruleId);
    if (!unique(ruleIds)) errors.push(`${label}: rules contains duplicate ruleId values`);
    const active = activeRules(api.rules);
    const seen = new Map();
    const seenCases = new Map();
    for (const rule of active) {
      errors.push(...validateRuleMapIndexRule(rule, `${label}.${rule.ruleId || '<empty-ruleId>'}`));
      const requestFields = rule.requestFields ?? {};
      for (const caseId of normalizeCaseIds(rule)) {
        const previousCaseRule = seenCases.get(caseId);
        if (previousCaseRule && previousCaseRule !== rule.ruleId) {
          errors.push(`${label}: case_id ${caseId} maps to multiple ruleIds: ${previousCaseRule}, ${rule.ruleId}`);
        }
        seenCases.set(caseId, rule.ruleId);
      }
      if (isObject(requestFields)) {
        const key = canonicalMatchKey(requestFields);
        const previous = seen.get(key);
        if (previous && previous !== rule.ruleId) errors.push(`${label}: request field key/value maps to multiple ruleIds: ${previous}, ${rule.ruleId}`);
        if (previous === rule.ruleId) errors.push(`${label}: duplicate request field key/value for ${rule.ruleId}: ${key}`);
        seen.set(key, rule.ruleId);
      }
    }
  }
  const globalCases = new Map();
  for (const api of ruleMap.interfaces) {
    for (const rule of activeRules(api.rules)) {
      if (rule.isDefault === true || rule.changeType === '删除' || rule.enabled === false) continue;
      const current = `${api.apiName}.${rule.ruleId}`;
      for (const caseId of normalizeCaseIds(rule)) {
        const previous = globalCases.get(caseId);
        if (previous && previous !== current) errors.push(`case_id ${caseId} maps to multiple interface rules: ${previous}, ${current}`);
        globalCases.set(caseId, current);
      }
    }
  }
  return errors;
}

export function validateRuleMapInterfaceConsistency(ruleMap, manifest) {
  const errors = [];
  const api = (ruleMap.interfaces ?? []).find((item) => item.apiName === manifest.apiName);
  if (!api) return [`rule-map missing interface ${manifest.apiName}`];
  if (api.method !== manifest.method || api.path !== manifest.path) {
    errors.push(`rule-map method/path differs for ${manifest.apiName}`);
  }
  const mapRules = new Map((api.rules ?? []).map((rule) => [rule.ruleId, rule]));
  const manifestRules = new Map((manifest.rules ?? []).map((rule) => [rule.ruleId, rule]));
  for (const rule of manifest.rules ?? []) {
    const mapRule = mapRules.get(rule.ruleId);
    if (!mapRule) {
      errors.push(`rule-map missing rule ${manifest.apiName}.${rule.ruleId}`);
      continue;
    }
    const mapIndex = normalizeIndexRule(mapRule);
    const manifestIndex = normalizeIndexRule(rule);
    for (const key of ['caseIds', 'isDefault', 'changeType']) {
      if (JSON.stringify(mapIndex[key]) !== JSON.stringify(manifestIndex[key])) {
        errors.push(`rule-map and manifest disagree on ${key} for ${manifest.apiName}.${rule.ruleId}`);
      }
    }
    if (canonicalMatchKey(mapIndex.requestFields) !== canonicalMatchKey(manifestIndex.requestFields)) {
      errors.push(`rule-map and manifest disagree on requestFields for ${manifest.apiName}.${rule.ruleId}`);
    }
  }
  for (const rule of api.rules ?? []) {
    if (!manifestRules.has(rule.ruleId)) errors.push(`rule-map contains stale rule ${manifest.apiName}.${rule.ruleId}`);
  }
  return errors;
}

export function validateApiDefinition(api) {
  return validateInterfaceManifest(api);
}

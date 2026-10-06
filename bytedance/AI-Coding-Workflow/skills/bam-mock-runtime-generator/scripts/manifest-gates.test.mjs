#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  validateInterfaceManifest,
  validateRuleMap,
} from './manifest-gates.mjs';

function baseManifest(overrides = {}) {
  return {
    version: 2,
    mode: 'BAM_MOCK_INTERFACE_MANIFEST',
    apiName: 'apiGetExample',
    method: 'POST',
    path: '/example/list',
    sourceRuleMap: '../../rule-map.json',
    rehydration: {
      strategy: 'manifest_reapply',
      status: 'pending',
      script: '.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs',
      command: 'node .trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs --mock-root artifacts/example/mock --bam-root src/bam/example --apply',
    },
    realConnect: {
      status: 'passed',
      artifactDir: '../../real-connect/apiGetExample',
      artifacts: [
        {
          ruleId: 'default',
          status: 'passed',
          request: '../../real-connect/apiGetExample/default/request.json',
          rawResponse: '../../real-connect/apiGetExample/default/response.raw.txt',
          response: '../../real-connect/apiGetExample/default/response.json',
          evidence: '../../real-connect/apiGetExample/default/evidence.json',
        },
        {
          ruleId: 'with_image',
          status: 'passed',
          request: '../../real-connect/apiGetExample/with_image/request.json',
          rawResponse: '../../real-connect/apiGetExample/with_image/response.raw.txt',
          response: '../../real-connect/apiGetExample/with_image/response.json',
          evidence: '../../real-connect/apiGetExample/with_image/evidence.json',
        },
      ],
      reason: 'unit test fixture',
    },
    requestFieldsAffectingRules: ['scene'],
    requestFieldImpact: [
      {
        fieldPath: 'scene',
        impactType: 'rule_branch',
        reason: 'scene=image selects the image-list mock branch',
        uiTarget: 'example list image column',
      },
    ],
    ruleMatchKeys: [
      { ruleId: 'default', requestFields: {}, isDefault: true },
      { ruleId: 'with_image', requestFields: { scene: 'image' } },
    ],
    rules: [
      {
        ruleId: 'default',
        changeType: '保留',
        isDefault: true,
        requestFields: {},
        mockRule: '返回原响应',
        verifyAssertion: '默认规则不产生 mock',
        realConnectArtifact: {
          ruleId: 'default',
          status: 'passed',
          request: '../../real-connect/apiGetExample/default/request.json',
          rawResponse: '../../real-connect/apiGetExample/default/response.raw.txt',
          response: '../../real-connect/apiGetExample/default/response.json',
          evidence: '../../real-connect/apiGetExample/default/evidence.json',
        },
      },
      {
        ruleId: 'with_image',
        caseIds: ['TC-001'],
        changeType: '新增',
        requestFields: { scene: 'image' },
        mockRule: '基于真实响应设置首行 image_urls',
        responseContract: {
          source: 'real_browser_request',
          evidence: 'browser network: /example/list',
          request: { scene: 'image' },
        },
        realRequest: {
          method: 'POST',
          path: '/example/list',
          requestFieldsForMatching: { scene: 'image' },
          collectionOnlyFields: [
            {
              fieldPath: 'id',
              value: '1',
              source: 'list_row',
              reason: '真实列表首行 id 仅用于采集详情基线，不参与 rule 匹配',
            },
          ],
        },
        realResponseBody: { code: 0, data: { items: [{ id: '1' }] } },
        mockedResponseBody: { code: 0, data: { items: [{ id: '1', image_urls: ['x'] }] } },
        mockOperations: [
          { op: 'set', path: 'data.items[0].image_urls', value: ['x'] },
        ],
        verifyAssertion: '首行图片可见',
        realConnectArtifact: {
          ruleId: 'with_image',
          status: 'passed',
          request: '../../real-connect/apiGetExample/with_image/request.json',
          rawResponse: '../../real-connect/apiGetExample/with_image/response.raw.txt',
          response: '../../real-connect/apiGetExample/with_image/response.json',
          evidence: '../../real-connect/apiGetExample/with_image/evidence.json',
        },
      },
    ],
    finalVerification: { status: 'pending' },
    ...overrides,
  };
}

function ruleIndex(rule, overrides = {}) {
  const index = {
    ruleId: rule.ruleId,
    changeType: rule.changeType,
    requestFields: rule.requestFields ?? {},
  };
  if (Array.isArray(rule.caseIds) && rule.caseIds.length > 0) index.caseIds = rule.caseIds;
  if (rule.isDefault === true) index.isDefault = true;
  return { ...index, ...overrides };
}

function baseRuleMap(overrides = {}) {
  return {
    version: 2,
    mode: 'BAM_MOCK_RULE_MAP',
    interfaces: [
      {
        apiName: 'apiGetExample',
        method: 'POST',
        path: '/example/list',
        manifest: 'apis/apiGetExample/manifest.json',
        rules: baseManifest().rules.map((rule) => ruleIndex(rule)),
      },
    ],
    ...overrides,
  };
}

assert.deepEqual(validateInterfaceManifest(baseManifest()), []);
assert.deepEqual(validateRuleMap(baseRuleMap()), []);
assert.deepEqual(validateInterfaceManifest(baseManifest(), baseRuleMap()), []);

assert.deepEqual(validateInterfaceManifest(baseManifest({
  rehydration: undefined,
})), []);

assert.match(validateInterfaceManifest(baseManifest({
  rehydration: 'passed',
})).join('\n'), /rehydration must be an object when present/);

assert.match(validateInterfaceManifest(baseManifest({
  rehydration: {
    ...baseManifest().rehydration,
    script: 'inline-patch-only.mjs',
  },
})).join('\n'), /reapply-bam-mocks\.mjs/);

assert.match(validateInterfaceManifest(baseManifest({
  rehydration: {
    ...baseManifest().rehydration,
    status: 'passed',
  },
})).join('\n'), /rehydration\.evidence is required/);

assert.deepEqual(validateInterfaceManifest(baseManifest({
  requestFields: [
    {
      kind: 'wrapper_request_mapping',
      fieldPath: 'has_author_subject',
      targetObject: 'data',
      expression: "_req['has_author_subject']",
      marker: 'BAM_MOCK_WRAPPER_FIELD_START apiGetExample.has_author_subject',
      evidence: '04-tech-plan confirms has_author_subject as request contract; page/store/service sends it but generated BAM wrapper omitted it from data',
      reason: 'required by rule matcher for no-author-subject case',
      realVerify: 'Remove after BAM wrapper generation includes has_author_subject',
    },
  ],
})), []);

assert.match(validateInterfaceManifest(baseManifest({
  requestFields: [
    {
      kind: 'wrapper_request_mapping',
      fieldPath: 'has_author_subject',
      targetObject: 'data',
      expression: "_req['has_author_subject']",
      marker: 'MISSING_MARKER',
      evidence: '04-tech-plan confirms has_author_subject as request contract; page/store/service sends it but generated BAM wrapper omitted it from data',
      reason: 'required by rule matcher for no-author-subject case',
      realVerify: 'Remove after BAM wrapper generation includes has_author_subject',
    },
  ],
})).join('\n'), /BAM_MOCK_WRAPPER_FIELD/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    ...baseManifest().rules,
    { ...baseManifest().rules[1] },
  ],
})).join('\n'), /duplicate ruleId/);

assert.match(validateInterfaceManifest(baseManifest({
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
    { ruleId: 'with_image', requestFields: { scene: 'image' } },
    { ruleId: 'with_other', requestFields: { scene: 'image' } },
  ],
  rules: [
    ...baseManifest().rules,
    {
      ...baseManifest().rules[1],
      ruleId: 'with_other',
      caseIds: ['TC-002'],
      verify: { status: 'blocked' },
      realConnectArtifact: {
        ruleId: 'with_other',
        status: 'blocked',
        request: '../../real-connect/apiGetExample/with_other/request.json',
        response: '../../real-connect/apiGetExample/with_other/response.json',
        evidence: '../../real-connect/apiGetExample/with_other/evidence.json',
        blockedReason: 'unit test duplicate matcher branch',
      },
    },
  ],
})).join('\n'), /maps to multiple ruleIds/);

assert.match(validateInterfaceManifest(baseManifest({
  ruleMatchKeys: [
    { ruleId: 'with_image', requestFields: { scene: 'image' } },
  ],
  rules: [
    { ...baseManifest().rules[1], isDefault: false },
  ],
})).join('\n'), /exactly one default/);

assert.match(validateInterfaceManifest(baseManifest({
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
    { ruleId: 'with_image', requestFields: {}, isDefault: true },
  ],
})).join('\n'), /exactly one default/);

assert.match(validateInterfaceManifest(baseManifest({
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
    { ruleId: 'with_image', requestFields: { nonImpact: 'x' } },
  ],
})).join('\n'), /non-impact field/);

assert.match(validateInterfaceManifest(baseManifest({
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: { scene: 'image' }, isDefault: true },
    { ruleId: 'with_image', requestFields: { scene: 'image' } },
  ],
  rules: [
    { ...baseManifest().rules[0], requestFields: { scene: 'image' } },
    baseManifest().rules[1],
  ],
})).join('\n'), /default rule must not contain requestFields|default ruleMatchKeys row/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      requestFields: { scene: 'mock_image' },
    },
  ],
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
    { ruleId: 'with_image', requestFields: { scene: 'mock_image' } },
  ],
})).join('\n'), /placeholder values/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realRequest: {
        collectionOnlyFields: [
          {
            fieldPath: 'scene',
            value: 'image',
            source: 'list_row',
            reason: 'incorrectly marked impact field as collection-only',
          },
        ],
      },
    },
  ],
})).join('\n'), /collectionOnlyFields\[0\]\.fieldPath must not be in requestFieldsAffectingRules/);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    ...baseManifest().realConnect,
    status: 'blocked',
    reason: 'unit test blocked real-connect',
  },
  finalVerification: { status: 'blocked' },
  patch: { status: 'patched' },
})).join('\n'), /blocked manifest must not keep patch\.status=patched/);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    status: 'passed',
    artifactDir: '../../real-connect/apiGetExample',
    artifacts: [
      baseManifest().realConnect.artifacts[0],
    ],
    reason: 'missing with_image artifact',
  },
})).join('\n'), /missing manifest\.realConnect\.artifacts entry/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realConnectArtifact: {
        ...baseManifest().rules[1].realConnectArtifact,
        rawResponse: undefined,
      },
    },
  ],
})).join('\n'), /requires rawResponse/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      caseIds: undefined,
    },
  ],
})).join('\n'), /caseIds must be a non-empty array/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      requestFields: { missing_field: 'value' },
    },
  ],
})).join('\n'), /requestFields\.missing_field must appear in requestFieldsAffectingRules/);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    ...baseManifest().realConnect,
    artifacts: [
      ...baseManifest().realConnect.artifacts,
      {
        ruleId: 'with_other',
        status: 'passed',
        request: '../../real-connect/apiGetExample/with_other/request.json',
        rawResponse: '../../real-connect/apiGetExample/with_other/response.raw.txt',
        response: '../../real-connect/apiGetExample/with_other/response.json',
        evidence: '../../real-connect/apiGetExample/with_other/evidence.json',
      },
    ],
  },
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
    { ruleId: 'with_image', requestFields: { scene: 'image' } },
    { ruleId: 'with_other', requestFields: { scene: 'other' } },
  ],
  rules: [
    ...baseManifest().rules,
    {
      ...baseManifest().rules[1],
      ruleId: 'with_other',
      requestFields: { scene: 'other' },
      responseContract: {
        ...baseManifest().rules[1].responseContract,
        request: { scene: 'other' },
      },
      realRequest: {
        ...baseManifest().rules[1].realRequest,
        requestFieldsForMatching: { scene: 'other' },
      },
      realConnectArtifact: {
        ruleId: 'with_other',
        status: 'passed',
        request: '../../real-connect/apiGetExample/with_other/request.json',
        rawResponse: '../../real-connect/apiGetExample/with_other/response.raw.txt',
        response: '../../real-connect/apiGetExample/with_other/response.json',
        evidence: '../../real-connect/apiGetExample/with_other/evidence.json',
      },
    },
  ],
})).join('\n'), /case_id TC-001 maps to multiple ruleIds/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realResponseBody: undefined,
    },
  ],
})).join('\n'), /realResponseBody or realResponsePath is required/);

assert.deepEqual(validateInterfaceManifest(baseManifest(), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 1 } },
      rawResponse: JSON.stringify(baseManifest().rules[1].realResponseBody),
      response: baseManifest().rules[1].realResponseBody,
    },
  },
}), []);

assert.match(validateInterfaceManifest(baseManifest(), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 1 } },
      rawResponse: JSON.stringify({ code: 0, data: { items: [{ id: 'different' }] } }),
      response: baseManifest().rules[1].realResponseBody,
    },
  },
}).join('\n'), /parsed response\.raw\.txt differs from response\.json/);

assert.match(validateInterfaceManifest(baseManifest(), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 1 } },
      rawResponse: 'not json',
      response: baseManifest().rules[1].realResponseBody,
    },
  },
}).join('\n'), /rawResponse must contain parseable JSON/);

assert.deepEqual(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realResponseBody: undefined,
      realResponsePath: '../../real-connect/apiGetExample/with_image/response.json',
    },
  ],
}), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 1 } },
      rawResponse: JSON.stringify(baseManifest().rules[1].realResponseBody),
      response: baseManifest().rules[1].realResponseBody,
    },
  },
}), []);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realResponseBody: { code: 0, data: { items: [{ id: '1' }] } },
    },
  ],
}), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 2 } },
      response: { code: 0, data: { items: [{ id: '1' }, { id: '2' }], total: 2 } },
    },
  },
}).join('\n'), /realResponseBody must match realConnectArtifact\.response exactly/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realResponseBody: { code: 0, data: { items: [{ id: '1' }], total: 2 } },
    },
  ],
}), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 2 } },
      response: { code: 0, data: { items: [{ id: '1' }], total: 2 } },
    },
  },
}).join('\n'), /has 1 rows, expected at least 2/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      realResponseBody: undefined,
      realResponsePath: '../../derived/response.json',
    },
  ],
}), undefined, {
  realConnectByRuleId: {
    with_image: {
      request: { body: { page_num: 1, page_size: 1 } },
      response: baseManifest().rules[1].realResponseBody,
    },
  },
}).join('\n'), /realResponsePath must point to realConnectArtifact\.response/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      responseContract: {
        ...baseManifest().rules[1].responseContract,
        body: { code: 0 },
      },
    },
  ],
})).join('\n'), /responseContract\.body is deprecated; use realResponseBody/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      mockedResponseBody: undefined,
    },
  ],
})).join('\n'), /mockedResponseBody or mockedResponsePath is required/);

assert.match(validateInterfaceManifest(baseManifest({
  requestFieldImpact: [],
})).join('\n'), /missing impact reason/);

assert.match(validateInterfaceManifest(baseManifest({
  requestFieldImpact: [
    {
      fieldPath: 'page_size',
      impactType: 'pagination',
      reason: 'default page size is not a rule branch',
      uiTarget: 'example list',
    },
  ],
})).join('\n'), /documents non-impact field/);

assert.match(validateInterfaceManifest(
  baseManifest(),
  baseRuleMap({
    interfaces: [{
      apiName: 'apiGetExample',
      method: 'POST',
      path: '/example/list',
      manifest: 'apis/apiGetExample/manifest.json',
      rules: [
        ruleIndex(baseManifest().rules[0]),
        ruleIndex(baseManifest().rules[1], { requestFields: { scene: 'other' } }),
      ],
    }],
  }),
).join('\n'), /disagree on requestFields/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    { ...baseManifest().rules[1], responseContract: undefined },
  ],
})).join('\n'), /responseContract is required/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      responseBody: { code: 0 },
      mockedResponseBody: undefined,
    },
  ],
})).join('\n'), /responseBody\/responsePath is deprecated/);

assert.match(validateInterfaceManifest(baseManifest({
  rules: [
    baseManifest().rules[0],
    {
      ...baseManifest().rules[1],
      mockOperations: undefined,
    },
  ],
})).join('\n'), /requires mockOperations/);

const noResponseDataRule = {
  ...baseManifest().rules[1],
  responseContract: {
    source: 'no_response_data',
    evidence: 'browser reached submit checkpoint but did not send unsafe write request',
    request: { scene: 'image' },
    noResponseDataReason: 'write API cannot be sent to backend in mock preview',
  },
  realRequest: {
    method: 'POST',
    path: '/example/list',
    requestFieldsForMatching: { scene: 'image' },
    collectionOnlyFields: [],
  },
  realResponseBody: undefined,
  mockedResponseBody: undefined,
  mockOperations: undefined,
  noResponseData: true,
  runtimeWarning: {
    enabled: true,
    message: 'No backend response data collected; request is intentionally not sent.',
  },
  realConnectArtifact: {
    ruleId: 'with_image',
    status: 'no_response_data',
    request: '../../real-connect/apiGetExample/with_image/request.json',
    response: '../../real-connect/apiGetExample/with_image/response.json',
    evidence: '../../real-connect/apiGetExample/with_image/evidence.json',
    noResponseDataReason: 'write API cannot be sent to backend in mock preview',
  },
  verify: {
    status: 'passed',
    method: 'browser',
    evidence: '[BAM_MOCK_NO_RESPONSE_DATA] console warning observed',
  },
};

assert.deepEqual(validateInterfaceManifest(baseManifest({
  realConnect: {
    ...baseManifest().realConnect,
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      noResponseDataRule.realConnectArtifact,
    ],
  },
  rules: [
    baseManifest().rules[0],
    noResponseDataRule,
  ],
})), []);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    ...baseManifest().realConnect,
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      noResponseDataRule.realConnectArtifact,
    ],
  },
  rules: [
    baseManifest().rules[0],
    {
      ...noResponseDataRule,
      runtimeWarning: undefined,
    },
  ],
})).join('\n'), /requires runtimeWarning/);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    ...baseManifest().realConnect,
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      noResponseDataRule.realConnectArtifact,
    ],
  },
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
  ],
  rules: [
    baseManifest().rules[0],
    noResponseDataRule,
  ],
})).join('\n'), /requires a concrete ruleMatchKeys row/);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    ...baseManifest().realConnect,
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      noResponseDataRule.realConnectArtifact,
    ],
  },
  rules: [
    baseManifest().rules[0],
    {
      ...noResponseDataRule,
      isDefault: true,
    },
  ],
})).join('\n'), /no_response_data rule must not be default/);

const syntheticContractRule = {
  ...baseManifest().rules[1],
  responseContract: {
    source: 'synthetic_contract',
    evidence: 'two UI natural-click attempts reached the target state but no matching Network request was observed',
    request: {
      method: 'POST',
      path: '/example/list',
      body: { scene: 'image', page_size: 10 },
    },
    syntheticContractReason: 'required interface could not be located after two natural UI attempts',
    interfaceNecessity: 'TC-001 requires list rows with image_urls to verify UI rendering',
    uiNaturalAttemptCount: 2,
  },
  realRequest: {
    method: 'POST',
    path: '/example/list',
    requestFieldsForMatching: { scene: 'image' },
    collectionOnlyFields: [
      {
        fieldPath: 'page_size',
        value: 10,
        source: 'synthetic_contract',
        reason: 'synthetic request keeps the interface paging shape but does not affect rule matching',
      },
    ],
  },
  realResponseBody: undefined,
  realResponsePath: undefined,
  mockedResponseBody: { code: 0, data: { items: [{ id: 'synthetic-row-1', image_urls: ['x'] }], total: 1 } },
  mockOperations: undefined,
  syntheticContract: true,
  realConnectArtifact: {
    ruleId: 'with_image',
    status: 'synthetic_contract',
    request: '../../real-connect/apiGetExample/with_image/request.json',
    response: '../../real-connect/apiGetExample/with_image/response.json',
    evidence: '../../real-connect/apiGetExample/with_image/evidence.json',
    syntheticContractReason: 'required interface could not be located after two natural UI attempts',
    interfaceNecessity: 'TC-001 requires list rows with image_urls to verify UI rendering',
    uiNaturalAttemptCount: 2,
  },
  verify: {
    status: 'passed',
    method: 'bam-test',
    evidence: '[BAM_MOCK_SYNTHETIC_CONTRACT] console warning observed',
  },
};

assert.deepEqual(validateInterfaceManifest(baseManifest({
  realConnect: {
    status: 'synthetic_contract',
    artifactDir: '../../real-connect/apiGetExample',
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      syntheticContractRule.realConnectArtifact,
    ],
  },
  rules: [
    baseManifest().rules[0],
    syntheticContractRule,
  ],
})), []);

assert.deepEqual(validateInterfaceManifest(baseManifest({
  realConnect: {
    status: 'synthetic_contract',
    artifactDir: '../../real-connect/apiGetExample',
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      syntheticContractRule.realConnectArtifact,
    ],
  },
  rules: [
    baseManifest().rules[0],
    {
      ...syntheticContractRule,
      mockedResponseBody: undefined,
      mockedResponsePath: '../../real-connect/apiGetExample/with_image/response.json',
    },
  ],
})), []);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    status: 'synthetic_contract',
    artifactDir: '../../real-connect/apiGetExample',
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      syntheticContractRule.realConnectArtifact,
    ],
  },
  rules: [
    baseManifest().rules[0],
    {
      ...syntheticContractRule,
      mockedResponseBody: undefined,
      mockedResponsePath: '../../real-connect/apiGetExample/other/response.json',
    },
  ],
})).join('\n'), /mockedResponsePath must point to realConnectArtifact\.response/);

assert.match(validateInterfaceManifest(baseManifest({
  realConnect: {
    status: 'synthetic_contract',
    artifactDir: '../../real-connect/apiGetExample',
    artifacts: [
      baseManifest().realConnect.artifacts[0],
      {
        ...syntheticContractRule.realConnectArtifact,
        uiNaturalAttemptCount: 1,
      },
    ],
  },
  rules: [
    baseManifest().rules[0],
    {
      ...syntheticContractRule,
      responseContract: {
        ...syntheticContractRule.responseContract,
        uiNaturalAttemptCount: 1,
      },
      realConnectArtifact: {
        ...syntheticContractRule.realConnectArtifact,
        uiNaturalAttemptCount: 1,
      },
    },
  ],
})).join('\n'), /uiNaturalAttemptCount >= 2/);

assert.match(validateRuleMap(baseRuleMap({
  interfaces: [{
    apiName: 'apiGetExample',
    method: 'POST',
    path: '/example/list',
    manifest: 'apis/apiGetExample/manifest.json',
    rules: [
      ruleIndex(baseManifest().rules[0]),
      ruleIndex(baseManifest().rules[1], { mockOperations: [] }),
    ],
  }],
})).join('\n'), /must only contain index fields/);

assert.match(validateRuleMap(baseRuleMap({
  interfaces: [
    baseRuleMap().interfaces[0],
    baseRuleMap().interfaces[0],
  ],
})).join('\n'), /duplicate apiName/);

assert.match(validateRuleMap(baseRuleMap({
  interfaces: [{
    apiName: 'apiGetExample',
    method: 'POST',
    path: '/example/list',
    manifest: 'apis/apiGetExample/manifest.json',
    rules: [
      ruleIndex(baseManifest().rules[0]),
      ruleIndex(baseManifest().rules[1]),
      ruleIndex(baseManifest().rules[1]),
    ],
  }],
})).join('\n'), /duplicate ruleId/);

assert.match(validateRuleMap(baseRuleMap({
  interfaces: [{
    apiName: 'apiGetExample',
    method: 'POST',
    path: '/example/list',
    manifest: 'apis/apiGetExample/manifest.json',
    rules: [
      ruleIndex(baseManifest().rules[0]),
      ruleIndex(baseManifest().rules[1]),
      ruleIndex(baseManifest().rules[1], {
        ruleId: 'with_other',
        requestFields: { scene: 'other' },
      }),
    ],
  }],
})).join('\n'), /case_id TC-001 maps to multiple ruleIds/);

assert.match(validateRuleMap(baseRuleMap({
  interfaces: [{
    apiName: 'apiGetExample',
    method: 'POST',
    path: '/example/list',
    manifest: 'apis/apiGetExample/manifest.json',
    rules: [
      ruleIndex(baseManifest().rules[0]),
      ruleIndex(baseManifest().rules[1]),
      ruleIndex(baseManifest().rules[1], {
        ruleId: 'with_other',
        caseIds: ['TC-002'],
      }),
    ],
  }],
})).join('\n'), /request field key\/value maps to multiple ruleIds/);

assert.match(validateInterfaceManifest(
  baseManifest(),
  baseRuleMap({
    interfaces: [{
      apiName: 'apiGetExample',
      method: 'GET',
      path: '/example/list',
      manifest: 'apis/apiGetExample/manifest.json',
      rules: baseManifest().rules.map((rule) => ruleIndex(rule)),
    }],
  }),
).join('\n'), /method\/path differs/);

assert.match(validateInterfaceManifest(
  baseManifest(),
  baseRuleMap({
    interfaces: [{
      apiName: 'apiGetExample',
      method: 'POST',
      path: '/example/list',
      manifest: 'apis/apiGetExample/manifest.json',
      rules: [
        ruleIndex(baseManifest().rules[0]),
      ],
    }],
  }),
).join('\n'), /rule-map missing rule/);

assert.match(validateInterfaceManifest(
  baseManifest(),
  baseRuleMap({
    interfaces: [{
      apiName: 'apiGetExample',
      method: 'POST',
      path: '/example/list',
      manifest: 'apis/apiGetExample/manifest.json',
      rules: [
        ...baseManifest().rules.map((rule) => ruleIndex(rule)),
        ruleIndex(baseManifest().rules[1], {
          ruleId: 'stale_rule',
          caseIds: ['TC-002'],
          requestFields: { scene: 'stale' },
        }),
      ],
    }],
  }),
).join('\n'), /stale rule/);

assert.match(validateRuleMap(baseRuleMap({
  interfaces: [
    baseRuleMap().interfaces[0],
    {
      apiName: 'apiGetOther',
      method: 'POST',
      path: '/example/other',
      manifest: 'apis/apiGetOther/manifest.json',
      rules: [
        ruleIndex(baseManifest().rules[0]),
        ruleIndex(baseManifest().rules[1], {
          ruleId: 'with_other',
          requestFields: { scene: 'other' },
        }),
      ],
    },
  ],
})).join('\n'), /case_id TC-001 maps to multiple interface rules/);

console.log('manifest gate tests passed.');

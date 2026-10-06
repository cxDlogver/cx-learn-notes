#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  patchApiFunction,
  patchWrapperRequestMapping,
} from './init-bam-mock.mjs';

const bamSource = `
export function apiGetExample(req: Record<string, unknown>) {
  const _req = req;
  const data = {
    existing: _req['existing']
  };
  return ClientOptions.request({ data });
}
`;

const wrapperField = {
  kind: 'wrapper_request_mapping',
  fieldPath: 'scene',
  targetObject: 'data',
  expression: "_req['scene']",
};

const wrapperPatched = patchWrapperRequestMapping(bamSource, 'apiGetExample', wrapperField);
assert.equal(wrapperPatched.changed, true);
assert.match(wrapperPatched.content, /BAM_MOCK_WRAPPER_FIELD_START apiGetExample\.scene/);
assert.match(wrapperPatched.content, /existing: _req\['existing'\],/);
assert.match(wrapperPatched.content, /scene: _req\['scene'\],/);

const wrapperReapplied = patchWrapperRequestMapping(wrapperPatched.content, 'apiGetExample', wrapperField);
assert.equal((wrapperReapplied.content.match(/BAM_MOCK_WRAPPER_FIELD_START apiGetExample\.scene/g) ?? []).length, 1);

const realFieldSource = bamSource.replace("existing: _req['existing']", "existing: _req['existing'],\n    scene: _req['scene']");
const realFieldResult = patchWrapperRequestMapping(realFieldSource, 'apiGetExample', wrapperField);
assert.match(realFieldResult.message, /SKIP real wrapper field exists/);

const syntheticManifest = {
  apiName: 'apiGetExample',
  method: 'POST',
  path: '/example',
  ruleMatchKeys: [
    { ruleId: 'default', requestFields: {}, isDefault: true },
    { ruleId: 'synthetic', requestFields: { scene: 'synthetic' } },
    { ruleId: 'empty_scene', requestFields: { scene: '__BAM_MOCK_ABSENT__' } },
  ],
  rules: [
    {
      ruleId: 'default',
      changeType: '保留',
      isDefault: true,
      requestFields: {},
    },
    {
      ruleId: 'synthetic',
      changeType: '新增',
      requestFields: { scene: 'synthetic' },
      responseContract: {
        source: 'synthetic_contract',
        syntheticContractReason: 'unit test',
      },
      mockedResponseBody: { code: 0, data: { id: 'synthetic-1' } },
    },
    {
      ruleId: 'empty_scene',
      changeType: '新增',
      requestFields: { scene: '__BAM_MOCK_ABSENT__' },
      responseContract: {
        source: 'synthetic_contract',
        syntheticContractReason: 'unit test absent matcher',
      },
      mockedResponseBody: { code: 0, data: { id: 'empty-scene' } },
    },
  ],
};

const apiPatched = patchApiFunction(wrapperPatched.content, syntheticManifest, '/unused/manifest.json');
assert.equal(apiPatched.changed, true);
assert.match(apiPatched.content, /BAM_MOCK_PATCH_START apiGetExample/);
assert.match(apiPatched.content, /BAM_MOCK_SYNTHETIC_CONTRACT/);
assert.match(apiPatched.content, /synthetic-1/);
assert.match(apiPatched.content, /\(\(_req\)\?\.\["scene"\] === undefined \|\| \(_req\)\?\.\["scene"\] === null \|\| \(_req\)\?\.\["scene"\] === ''\)/);

console.log('init BAM mock tests passed.');

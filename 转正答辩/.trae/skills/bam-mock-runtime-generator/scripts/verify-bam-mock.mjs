#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {
  assertManifestLocation,
  resolveManifestArtifact,
} from './artifact-root.mjs';
import {
  validateInterfaceManifest,
  validateRuleMap,
} from './manifest-gates.mjs';

function parseArgs(argv) {
  const args = { expectClean: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--manifest') args.manifest = argv[++i];
    else if (arg === '--rule-map') args.ruleMap = argv[++i];
    else if (arg === '--bam-root') args.bamRoot = argv[++i];
    else if (arg === '--expect-clean') args.expectClean = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return args;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

function resolveManifestFile(manifestPath, filePath) {
  return resolveManifestArtifact(manifestPath, filePath);
}

function readLinkedRuleMap(manifestPath, manifest, explicitRuleMapPath) {
  const ruleMapRef = explicitRuleMapPath || manifest.sourceRuleMap;
  if (!ruleMapRef) return undefined;
  const ruleMapPath = explicitRuleMapPath
    ? path.resolve(explicitRuleMapPath)
    : resolveManifestFile(manifestPath, ruleMapRef);
  if (!fs.existsSync(ruleMapPath)) throw new Error(`Missing rule-map: ${ruleMapRef}`);
  return readJson(ruleMapPath);
}

function activeRules(rules) {
  return (rules ?? []).filter((rule) => rule.changeType !== '删除' && rule.enabled !== false);
}

function readRealConnectArtifacts(manifestPath, manifest, failures) {
  const realConnectByRuleId = {};
  for (const rule of manifest.rules ?? []) {
    if (rule.changeType === '删除' || rule.enabled === false || rule.realConnectArtifact?.status !== 'passed') continue;
    try {
      realConnectByRuleId[rule.ruleId] = {
        request: readJson(resolveManifestFile(manifestPath, rule.realConnectArtifact.request)),
        rawResponse: rule.realConnectArtifact.rawResponse
          ? fs.readFileSync(resolveManifestFile(manifestPath, rule.realConnectArtifact.rawResponse), 'utf8')
          : undefined,
        response: readJson(resolveManifestFile(manifestPath, rule.realConnectArtifact.response)),
      };
    } catch (error) {
      failures.push(`${manifest.apiName}.${rule.ruleId} cannot read realConnectArtifact request/rawResponse/response: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { realConnectByRuleId };
}

function markerExists(content, apiName) {
  return content.includes(`BAM_MOCK_PATCH_START ${apiName}`)
    && content.includes(`BAM_MOCK_PATCH_END ${apiName}`);
}

function extractMarker(content, apiName) {
  const start = `/* BAM_MOCK_PATCH_START ${apiName} */`;
  const end = `/* BAM_MOCK_PATCH_END ${apiName} */`;
  const startIndex = content.indexOf(start);
  const endIndex = content.indexOf(end, startIndex + start.length);
  if (startIndex === -1 || endIndex === -1) return '';
  return content.slice(startIndex, endIndex + end.length);
}

function findPatchedApiFile(bamRoot, manifest) {
  const explicit = manifest.targetBamFile || manifest.patch?.targetBamFile;
  const candidates = explicit
    ? [path.isAbsolute(explicit) ? explicit : path.resolve(bamRoot, explicit)]
    : findFiles(bamRoot, (file) => file.endsWith('.ts') && !file.includes(`${path.sep}namespaces${path.sep}`));
  return candidates.find((file) => fs.existsSync(file) && markerExists(fs.readFileSync(file, 'utf8'), manifest.apiName));
}

function verifyRuleStatus(manifest, failures) {
  for (const rule of activeRules(manifest.rules)) {
    const verify = rule.verify ?? {};
    const status = verify.status ?? rule.verifyStatus;
    const method = verify.method ?? rule.verifyMethod;
    const evidence = verify.evidence ?? rule.verifyEvidence;
    const reason = verify.reason ?? rule.fallbackReason;
    const uiTarget = rule.uiTarget;

    if (status !== 'passed') {
      failures.push(`${manifest.apiName}.${rule.ruleId} mock runtime verifyStatus must be passed`);
    }
    if (typeof evidence !== 'string' || evidence.trim() === '') {
      failures.push(`${manifest.apiName}.${rule.ruleId} final verification evidence is required`);
    }
    if (uiTarget && method !== 'browser' && (typeof reason !== 'string' || reason.trim() === '')) {
      failures.push(`${manifest.apiName}.${rule.ruleId} UI rule must use browser verification or record fallback reason`);
    }
  }
}

function verifyMockLog(manifestPath, manifest, failures) {
  const mockLogPath = path.resolve(path.dirname(manifestPath), '..', '..', 'mock-log.md');
  if (!fs.existsSync(mockLogPath)) {
    failures.push(`Missing mock change log: ${mockLogPath}`);
    return;
  }

  const content = fs.readFileSync(mockLogPath, 'utf8');
  if (!content.includes(manifest.apiName)) {
    failures.push(`mock-log.md must record affected api ${manifest.apiName}`);
  }

  for (const rule of manifest.rules ?? []) {
    if (rule.changeType === '保留') continue;
    if (!content.includes(rule.ruleId)) {
      failures.push(`mock-log.md must record ${manifest.apiName}.${rule.ruleId} before modifying mock rules`);
    }
  }
}

function verifyManifest(manifestPath, bamRoot, explicitRuleMapPath, expectClean) {
  assertManifestLocation(manifestPath);
  const manifest = readJson(manifestPath);
  const ruleMap = readLinkedRuleMap(manifestPath, manifest, explicitRuleMapPath);
  const failures = [];
  const artifacts = readRealConnectArtifacts(manifestPath, manifest, failures);

  if (ruleMap) failures.push(...validateRuleMap(ruleMap));
  failures.push(...validateInterfaceManifest(manifest, ruleMap, artifacts));

  const patchedFile = findPatchedApiFile(bamRoot, manifest);
  if (expectClean) {
    if (patchedFile) failures.push(`Expected clean BAM but found mock marker for ${manifest.apiName} in ${patchedFile}`);
  } else {
    if (!patchedFile && activeRules(manifest.rules).length > 0) {
      failures.push(`Missing patched BAM marker for ${manifest.apiName}`);
    }
    if (patchedFile) {
      const marker = extractMarker(fs.readFileSync(patchedFile, 'utf8'), manifest.apiName);
      if (/Promise\.resolve\s*\(\s*__bamMock(?:Match|Default)?(?:Response|\.response)\s*\)/.test(marker)) {
        failures.push(`${manifest.apiName} patched BAM marker directly resolves a static mock response; runtime must call the original request and apply mockOperations`);
      }
      if (marker.includes('response:') && marker.includes('__bamMockMatches')) {
        failures.push(`${manifest.apiName} patched BAM marker stores static response branches; use operations branches instead`);
      }
    }
  }

  if (!expectClean) {
    verifyMockLog(manifestPath, manifest, failures);
    if (manifest.finalVerification?.status !== 'passed') {
      failures.push(`${manifest.apiName} finalVerification.status must be passed for mock runtime verification`);
    }
    if (
      manifest.finalVerification?.method
      && !['browser', 'api', 'bam-test', 'mixed'].includes(manifest.finalVerification.method)
    ) {
      failures.push(`${manifest.apiName} finalVerification.method is invalid`);
    }
    verifyRuleStatus(manifest, failures);
  }

  return failures;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.manifest || !args.bamRoot) {
    throw new Error('Usage: verify-bam-mock.mjs --manifest <mock/apis/<apiName>/manifest.json> --bam-root <src/bam/service> [--rule-map <mock/rule-map.json>] [--expect-clean]');
  }

  const failures = verifyManifest(path.resolve(args.manifest), path.resolve(args.bamRoot), args.ruleMap, args.expectClean);
  if (failures.length) {
    console.error(failures.map((failure) => `- ${failure}`).join('\n'));
    process.exitCode = 1;
    return;
  }
  console.log('BAM mock final verification audit passed.');
}

main();

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  assertManifestLocation,
  resolveManifestArtifact,
} from './artifact-root.mjs';
import {
  validateInterfaceManifest,
  validateRuleMap,
} from './manifest-gates.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const INIT_SCRIPT = path.join(SCRIPT_DIR, 'init-bam-mock.mjs');

function parseArgs(argv) {
  const args = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--mock-root') args.mockRoot = argv[++index];
    else if (arg === '--bam-root') args.bamRoot = argv[++index];
    else if (arg === '--apply') args.apply = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.mockRoot || !args.bamRoot) {
    throw new Error('Usage: reapply-bam-mocks.mjs --mock-root <artifact/mock> --bam-root <src/bam/service> [--apply]');
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function activeRules(manifest) {
  return (manifest.rules ?? []).filter((rule) => rule.changeType !== '删除' && rule.enabled !== false);
}

function listManifestPaths(mockRoot) {
  const apisRoot = path.join(mockRoot, 'apis');
  if (!fs.existsSync(apisRoot)) throw new Error(`Missing mock APIs directory: ${apisRoot}`);
  return fs.readdirSync(apisRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(apisRoot, entry.name, 'manifest.json'))
    .filter((filePath) => fs.existsSync(filePath))
    .sort();
}

function readRuleArtifacts(manifestPath, manifest) {
  const realConnectByRuleId = {};
  const failures = [];
  for (const rule of activeRules(manifest)) {
    const artifact = rule.realConnectArtifact;
    if (!artifact) continue;
    try {
      const request = readJson(resolveManifestArtifact(manifestPath, artifact.request));
      const response = readJson(resolveManifestArtifact(manifestPath, artifact.response));
      readJson(resolveManifestArtifact(manifestPath, artifact.evidence));
      const rawResponse = artifact.rawResponse
        ? fs.readFileSync(resolveManifestArtifact(manifestPath, artifact.rawResponse), 'utf8')
        : undefined;
      if (typeof rule.mockedResponsePath === 'string' && rule.mockedResponsePath.trim() !== '') {
        readJson(resolveManifestArtifact(manifestPath, rule.mockedResponsePath));
      }
      if (typeof rule.realResponsePath === 'string' && rule.realResponsePath.trim() !== '') {
        readJson(resolveManifestArtifact(manifestPath, rule.realResponsePath));
      }
      realConnectByRuleId[rule.ruleId] = { request, response, rawResponse };
    } catch (error) {
      failures.push(`${manifest.apiName}.${rule.ruleId} artifact is not reconstructable: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  return { artifacts: { realConnectByRuleId }, failures };
}

function preflight(mockRoot, manifestPaths) {
  const ruleMapPath = path.join(mockRoot, 'rule-map.json');
  if (!fs.existsSync(ruleMapPath)) throw new Error(`Missing rule-map: ${ruleMapPath}`);
  const ruleMap = readJson(ruleMapPath);
  const failures = validateRuleMap(ruleMap);
  const entries = [];

  for (const manifestPath of manifestPaths) {
    assertManifestLocation(manifestPath);
    const manifest = readJson(manifestPath);
    const loaded = readRuleArtifacts(manifestPath, manifest);
    failures.push(...loaded.failures);
    failures.push(...validateInterfaceManifest(manifest, ruleMap, loaded.artifacts));
    entries.push({ manifestPath, manifest });
  }
  if (failures.length > 0) throw new Error(failures.map((failure) => `- ${failure}`).join('\n'));
  return entries;
}

function runInit(manifestPath, bamRoot, apply) {
  const args = [INIT_SCRIPT, '--manifest', manifestPath, '--bam-root', bamRoot];
  if (apply) args.push('--apply');
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  const output = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
  if (result.status !== 0 || /MISS (?:api function|file for interface|wrapper)/.test(output)) {
    throw new Error(`Failed to reapply ${manifestPath}:\n${output}`);
  }
  return output;
}

function writeRehydrationResult(entries, args, outputs) {
  const command = `node ${path.relative(process.cwd(), fileURLToPath(import.meta.url))} --mock-root ${path.relative(process.cwd(), args.mockRoot)} --bam-root ${path.relative(process.cwd(), args.bamRoot)} --apply`;
  const verifiedAt = new Date().toISOString();
  for (const [index, entry] of entries.entries()) {
    const manifest = readJson(entry.manifestPath);
    manifest.rehydration = {
      strategy: 'manifest_reapply',
      status: 'passed',
      script: '.trae/skills/bam-mock-runtime-generator/scripts/reapply-bam-mocks.mjs',
      command,
      evidence: outputs[index],
      verifiedAt,
    };
    fs.writeFileSync(entry.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  args.mockRoot = path.resolve(args.mockRoot);
  args.bamRoot = path.resolve(args.bamRoot);
  const manifestPaths = listManifestPaths(args.mockRoot);
  if (manifestPaths.length === 0) throw new Error(`No interface manifests found under ${args.mockRoot}`);
  const entries = preflight(args.mockRoot, manifestPaths);
  const outputs = entries.map((entry) => runInit(entry.manifestPath, args.bamRoot, args.apply));
  if (args.apply) writeRehydrationResult(entries, args, outputs);
  console.log(`${args.apply ? 'Reapplied' : 'Validated'} ${entries.length} BAM mock manifest(s).`);
  for (const output of outputs) console.log(output);
}

main();

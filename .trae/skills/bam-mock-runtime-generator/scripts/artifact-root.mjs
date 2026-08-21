import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ARTIFACTS_ROOT = path.resolve(SCRIPT_DIR, '../../../../artifacts');

function isPathInsideOrEqual(parent, target) {
  const relative = path.relative(parent, target);
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function getTaskMockRoot(manifestPath) {
  const relative = path.relative(ARTIFACTS_ROOT, path.resolve(manifestPath));
  if (relative.startsWith('..') || path.isAbsolute(relative)) return undefined;
  const parts = relative.split(path.sep);
  if (parts.length < 3 || !parts[0] || parts[1] !== 'mock') return undefined;
  return path.join(ARTIFACTS_ROOT, parts[0], 'mock');
}

export function isManifestLocation(manifestPath) {
  const absoluteManifest = path.resolve(manifestPath);
  const taskMockRoot = getTaskMockRoot(manifestPath);
  if (!taskMockRoot || path.basename(absoluteManifest) !== 'manifest.json') return false;
  const relative = path.relative(taskMockRoot, absoluteManifest).split(path.sep);
  return relative.length === 3 && relative[0] === 'apis' && Boolean(relative[1]) && relative[2] === 'manifest.json';
}

export function assertManifestLocation(manifestPath) {
  if (!isManifestLocation(manifestPath)) {
    throw new Error('manifest must be stored at artifacts/<task-workspace>/mock/apis/<apiName>/manifest.json');
  }
}

export function isRuleMapLocation(ruleMapPath) {
  const absoluteRuleMap = path.resolve(ruleMapPath);
  const taskMockRoot = getTaskMockRoot(ruleMapPath);
  return Boolean(taskMockRoot)
    && path.dirname(absoluteRuleMap) === taskMockRoot
    && ['rule-map.json', 'rule-map.md'].includes(path.basename(absoluteRuleMap));
}

export function isUnderTaskMock(filePath, manifestPath) {
  const taskMockRoot = getTaskMockRoot(manifestPath);
  return Boolean(taskMockRoot) && isPathInsideOrEqual(taskMockRoot, path.resolve(filePath));
}

export function resolveManifestArtifact(manifestPath, filePath) {
  if (!filePath) return undefined;
  const resolved = path.isAbsolute(filePath)
    ? path.resolve(filePath)
    : path.resolve(path.dirname(manifestPath), filePath);
  if (!isUnderTaskMock(resolved, manifestPath)) {
    throw new Error(`manifest artifact must stay under its task mock directory: ${filePath}`);
  }
  return resolved;
}

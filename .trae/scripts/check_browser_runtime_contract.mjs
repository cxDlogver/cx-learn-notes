#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

const requireIncludes = (file, needles) => {
  const text = read(file);
  for (const needle of needles) {
    if (!text.includes(needle)) {
      failures.push(`${file}: missing ${needle}`);
    }
  }
  return text;
};

const verify = read('skills/06-debug-verification/SKILL.md');
const envBlock = verify.includes('## Environment / Baseline Checks')
  ? verify.split('## Environment / Baseline Checks', 2)[1].split('## Verify Case Ledger', 1)[0]
  : '';
for (const field of [
  'browser_runtime_mode:',
  'browser_tool:',
  'headless:',
  'browser_profile_or_state:',
  'network_evidence_level:',
  'sso_result:',
  'vmok_url:',
]) {
  if (!envBlock.includes(`- ${field}`)) {
    failures.push(`skills/06-debug-verification/SKILL.md report template missing - ${field}`);
  }
}

const projectContext = read('PROJECT_CONTEXT.md');
if (projectContext.includes('只用于人工登录，登录后回到内置浏览器重试')) {
  failures.push('PROJECT_CONTEXT.md: desktop fallback still loops back to integrated browser only');
}

requireIncludes('PROJECT_CONTEXT.md', [
  'Browser Runtime Mode 登录态与验证流程',
  'TRAE_DESKTOP',
  'COCO_CLI_HEADLESS',
  'browser_runtime_mode=TRAE_DESKTOP',
  'browser_runtime_mode=COCO_CLI_HEADLESS',
]);

requireIncludes('commands/delivery:design.md', [
  'Browser Runtime Mode',
  'profile / storage state',
  'console',
  'Network',
]);

requireIncludes('skills/bam-mock-runtime-generator/references/manifest-schema.md', [
  'browserRuntimeMode',
  'headless?: boolean',
  'playwright_chromium_headless',
  'headless_browser',
]);

const mcpDocs = read('docs/mcp-config-export.md');
if (mcpDocs.includes('Preferred for verify/design runtime checks.')) {
  failures.push('docs/mcp-config-export.md: integrated_browser is still unqualified preferred');
}
requireIncludes('docs/mcp-config-export.md', [
  'TRAE_DESKTOP',
  'COCO_CLI_HEADLESS',
  'Desktop browser evidence source',
  'Headless browser evidence source',
]);

if (failures.length > 0) {
  console.error(failures.map((f) => `FAIL: ${f}`).join('\n'));
  process.exit(1);
}

console.log('Browser runtime contract check passed');

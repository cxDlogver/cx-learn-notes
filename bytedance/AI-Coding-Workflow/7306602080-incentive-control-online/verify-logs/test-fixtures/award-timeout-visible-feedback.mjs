import fs from 'node:fs';
import path from 'node:path';

const workspaceRoot = path.resolve(new URL('../../../..', import.meta.url).pathname);
const repoRoot = path.join(workspaceRoot, 'meego-7306602080/repos/alliance-operation-mono');
const modalPath = path.join(
  repoRoot,
  'apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx',
);
const stylePath = path.join(
  repoRoot,
  'apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.module.scss',
);
const constantsPath = path.join(
  repoRoot,
  'apps/alliance-operation-content/src/routes/content-activity/award/constants.ts',
);

const modalSource = fs.readFileSync(modalPath, 'utf8');
const styleSource = fs.readFileSync(stylePath, 'utf8');
const constantsSource = fs.readFileSync(constantsPath, 'utf8');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  constantsSource.includes("SEND_AWARD_GOVERNANCE_TIMEOUT: '治理校验失败，请稍后重试'"),
  'timeout copy constant must stay unchanged',
);
assert(
  /type\s+SubmitAwardResult\s*=/.test(modalSource),
  'batch submit modal should return structured submit results so UI can persist failure text',
);
assert(
  /submitErrorMessage\s*,\s*setSubmitErrorMessage/.test(modalSource),
  'batch submit modal should keep a local submitErrorMessage state',
);
assert(
  /errorMessage\s*=\s*getAwardDeliveryResponseErrorMessage\(\s*res,\s*MESSAGES\.SEND_AWARD_VIDEOS_FAILED\s*\)/.test(
    modalSource,
  ),
  'video award non-success response should capture the mapped error message before showing it',
);
assert(
  /setSubmitErrorMessage\(\s*submitResult\.errorMessage\s*\)/.test(modalSource),
  'final non-success result should persist the submit error message into modal state',
);
assert(
  /role="alert"/.test(modalSource) && /styles\.submitErrorMessage/.test(modalSource),
  'modal should render persistent submit error text with an alert DOM anchor',
);
assert(
  /\.submitErrorMessage\b/.test(styleSource),
  'persistent submit error text should have a dedicated style',
);

console.log('award-timeout-visible-feedback fixture PASS');

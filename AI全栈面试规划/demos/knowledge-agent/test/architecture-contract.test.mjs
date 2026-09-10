import assert from 'node:assert/strict';
import test from 'node:test';

import { verifyContract } from '../scripts/verify-contract.mjs';

test('架构契约和 SQL 骨架满足当前安全与状态边界', async () => {
  assert.deepEqual(await verifyContract(), []);
});

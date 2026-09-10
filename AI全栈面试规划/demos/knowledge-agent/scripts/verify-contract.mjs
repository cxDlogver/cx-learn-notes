import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const contractUrl = new URL('../contracts/architecture-contract.json', import.meta.url);
const migrationUrl = new URL('../db/migrations/001_app_schema.sql', import.meta.url);

const requiredDataClasses = [
  'business-records',
  'graph-state',
  'checkpoint',
  'cross-thread-memory',
  'document-content',
  'filesystem-projection',
  'embeddings',
  'queue-delivery',
];

const requiredTables = [
  'principals',
  'knowledge_bases',
  'knowledge_base_members',
  'knowledge_roots',
  'knowledge_documents',
  'document_versions',
  'document_chunks',
  'agent_threads',
  'agent_runs',
  'change_proposals',
  'approval_decisions',
  'idempotency_records',
  'outbox_events',
  'audit_events',
];

function expect(condition, message, issues) {
  if (!condition) issues.push(message);
}

export async function verifyContract() {
  const issues = [];
  const contract = JSON.parse(await readFile(contractUrl, 'utf8'));
  const sql = await readFile(migrationUrl, 'utf8');
  const dataById = new Map(contract.dataClasses.map((item) => [item.id, item]));

  expect(
    dataById.size === contract.dataClasses.length,
    'dataClasses 中存在重复 id',
    issues,
  );

  for (const id of requiredDataClasses) {
    expect(dataById.has(id), `缺少数据类别：${id}`, issues);
  }

  expect(
    dataById.get('graph-state')?.canonicalStore !==
      dataById.get('business-records')?.canonicalStore,
    'Graph State 与业务记录不能共用同一个逻辑归属',
    issues,
  );
  expect(
    dataById.get('checkpoint')?.canonicalStore !==
      dataById.get('cross-thread-memory')?.canonicalStore,
    'Checkpoint 与跨线程 Store 必须是不同的逻辑存储',
    issues,
  );
  expect(
    dataById.get('document-content')?.canonicalStore !==
      dataById.get('embeddings')?.canonicalStore,
    '原始文档版本与向量检索索引不能被视为同一事实来源',
    issues,
  );
  expect(
    dataById
      .get('queue-delivery')
      ?.mustNotBeAuthoritativeFor.includes('business-intent'),
    'Redis/BullMQ 必须明确不承载业务意图的事实来源',
    issues,
  );

  for (const effect of contract.sideEffects) {
    expect(effect.authority !== 'model', `${effect.id} 不能由模型直接授权`, issues);
    expect(Boolean(effect.idempotencyKey), `${effect.id} 缺少幂等键`, issues);
    expect(Boolean(effect.precondition), `${effect.id} 缺少执行前置条件`, issues);
    expect(Boolean(effect.recovery), `${effect.id} 缺少恢复策略`, issues);
  }

  const fileWrite = contract.sideEffects.find(
    (effect) => effect.id === 'materialize-approved-file',
  );
  expect(fileWrite?.approvalRequired === true, '文件写入必须要求人工审批', issues);
  expect(
    contract.modelPolicy.mustNot.includes('write-files-directly'),
    '模型策略必须禁止直接写文件',
    issues,
  );
  expect(
    contract.trustBoundaries.some(
      (boundary) =>
        boundary.id === 'model-to-tools' && boundary.inputTrust === 'untrusted',
    ),
    '模型到工具的输出必须仍按不可信输入处理',
    issues,
  );

  expect(/^begin;/im.test(sql), '迁移必须显式开启事务', issues);
  expect(/commit;\s*$/im.test(sql), '迁移必须显式提交事务', issues);
  expect(
    /create\s+extension\s+if\s+not\s+exists\s+vector/im.test(sql),
    '迁移缺少 pgvector 扩展',
    issues,
  );

  for (const table of requiredTables) {
    expect(
      new RegExp(`create\\s+table\\s+knowledge_agent\\.${table}\\b`, 'i').test(sql),
      `迁移缺少表：${table}`,
      issues,
    );
  }

  expect(
    /primary\s+key\s*\(principal_id,\s*route,\s*idempotency_key\)/im.test(sql),
    '幂等记录缺少 principal + route + key 复合主键',
    issues,
  );
  expect(
    /foreign\s+key\s*\(id,\s*current_version_id\)/im.test(sql),
    '当前版本指针必须约束为同一文档的版本',
    issues,
  );
  expect(
    /using\s+hnsw\s*\(embedding\s+vector_cosine_ops\)/im.test(sql),
    '向量列缺少余弦距离 HNSW 索引',
    issues,
  );
  expect(
    /unique\s*\(proposal_id\)/im.test(sql),
    '审批决策必须保证每个提案只有一个最终结果',
    issues,
  );
  expect(!/\bdrop\s+(table|schema)\b/im.test(sql), '初始迁移不应包含破坏性 DROP', issues);

  return issues;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const issues = await verifyContract();
  if (issues.length > 0) {
    for (const issue of issues) console.error(`- ${issue}`);
    process.exitCode = 1;
  } else {
    console.log('Architecture contract verification passed.');
  }
}

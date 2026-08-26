# Coverage Optimization Log

- Run ID: `20260716-225251-coverage-cx-3`
- Mode: `/delivery:bits --coverage`
- Status: `PASS`
- Threshold: `90%`
- Rounds used: `1 / 3`
- Workspace: `artifacts/7306602080-incentive-control-online`
- Repo: `meego-7306602080/repos/alliance-operation-mono`
- Branch: `cx-3`
- Submit authorized: `false`

## 1. 覆盖率拉取

初始拉取产物位于本 run 的 `coverage/` 目录。初始整体覆盖率为 `89.56%`，有效未覆盖插入行 `104`。同版本排除日志生效后，本轮选择 `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts`。

刷新命令:

```bash
/Users/bytedance/.nvm/versions/node/v18.20.8/bin/node .trae/skills/bits-dev-flow/scripts/collect-huatuo-branch-coverage.js --browserCaptureServer --repoRoot /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono --gitRepo ecom/alliance-operation-mono --fromBranch master --toBranch cx-3 --outDir /Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online/bits-flow/cov/20260716-225251-coverage-cx-3/coverage
```

Huatuo capture server 输出 loader 后，在已登录 Huatuo 页面内执行浏览器脚本。刷新结果:

- `coverage/latest.json`
- `coverage/report.md`
- `coverage/uncovered-list.json`
- `coverage/uncovered-list.md`
- `coverage/results/**`

刷新后整体覆盖率为 `91.28%`，达到阈值。

## 2. Round 1

| 字段 | 值 |
|---|---|
| 目标文件 | `apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts` |
| 初始目标文件版本 | `huatuo:1863460942dab643` |
| 刷新后目标文件版本 | `huatuo:9b2e17f6cdac59ab` |
| 初始目标文件覆盖率 | `88.67%` |
| 刷新后目标文件覆盖率 | `95.33%` |
| 初始有效未覆盖行 | `17` |
| 刷新后有效未覆盖行 | `7` |
| 处理方式 | 真实线上 UI 覆盖 + 写接口浏览器拦截 |
| 代码修改 | 无 |
| 结果 | `PASS` |

同版本跳过候选:

- `sendAwardToAuthorStore.ts`：`huatuo:a8063018ce0bb551`
- `batch-submit-modal/index.tsx`：`huatuo:91cb2311c8682c4e`
- `utils.ts`：`huatuo:fd505ef218d83512`

## 3. 真实线上 UI 覆盖

入口:

```text
https://ecop.bytedance.net/alliance-operation-content/content-activity/award?activity_id=7629288371705643310&cjSiteCode=St12502250000001
```

执行路径:

1. 进入 `配置一（人工提报）`。
2. 点击 `新增提报`。
3. 手动输入真实样本 `1279271921656,28083207347,7634842254674947950` 并提交。
4. 真实命中 `GET /api/buyin/admin/content_activity/search_delivery_items`。
5. 行级移除第一条命中作品。
6. 浏览器内拦截 `POST /api/buyin/admin/content_activity/download_content_remove_record`，返回缺少 `lark_url` 的 mock response，覆盖导出缺链接错误分支。
7. 切换 `批量上传`，输入无效飞书表格链接并提交。
8. 真实命中 `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet`，最终表格为空态。

证据:

- `evidence/round-1-ui-evidence.json`
- `evidence/round-1-network.log`
- `evidence/round-1-export-missing-link.png`
- `evidence/round-1-batch-upload-final.png`

## 4. 写接口拦截

`download_content_remove_record` 是写/外部副作用接口，本轮只允许浏览器内拦截。拦截记录:

```json
{
  "transport": "xhr",
  "method": "POST",
  "path": "/api/buyin/admin/content_activity/download_content_remove_record",
  "body": "{\"records\":[{\"item_id\":\"1279271921656\",\"remove_reason\":\"手动移除\"}]}",
  "mock_response": {
    "st": 0,
    "code": 0,
    "msg": "success",
    "data": {}
  },
  "backend_write": "not_sent"
}
```

完整 Network log 中没有 `download_content_remove_record` 请求，证明写请求未真实发往后端。

## 5. 验证

| 命令 / 检查 | 结果 | 说明 |
|---|---|---|
| `git -C meego-7306602080/repos/alliance-operation-mono diff --check` | `PASS` | 无输出 |
| `git -C meego-7306602080/repos/alliance-operation-mono status --short` | `PASS` | 无输出，业务仓库干净 |
| `jq -e` 检查 `coverage/latest.json` | `PASS` | `91.28%` 且有效未覆盖插入行 `79` |
| `jq -e` 检查 `evidence/round-1-ui-evidence.json` | `PASS` | 写接口记录 `backend_write = not_sent` |

## 6. Gate 结论

- `coverage/latest.json`、`report.md`、`uncovered-list.json`、`uncovered-list.md` 均存在并来自本轮刷新。
- `coverage-optimization-state.json` 已记录本轮候选、目标文件、UI 证据、写接口拦截和刷新结果。
- `coverage-exclusion-log.json` 已登记本轮目标文件，用刷新后的 `fileCoverageVersion` 作为未来同版本跳过依据。
- 未传 `--submit`，未 commit、push 或发布远端覆盖率评审表达。

最终结论: `PASS`，整体覆盖率 `91.28% >= 90%`。

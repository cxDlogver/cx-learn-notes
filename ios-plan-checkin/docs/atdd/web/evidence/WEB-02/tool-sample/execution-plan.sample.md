# Synthetic recorder fixture; no business acceptance

### 2026-09-28T17:12:49.776350Z｜WEB-DATA-09｜api-fixture｜FAIL

- 运行：`synthetic-tool`；构建 `abcdef0`；数据 `synthetic-tool-fixture`；评审 `WEB-02-tool-fixture`。
- 环境：`{"businessDate": "2026-09-28", "kind": "api", "network": "online", "osName": "synthetic", "osVersion": "synthetic", "planTimezone": "Asia/Shanghai", "serverNowUtc": "2026-09-28T00:00:00Z"}`。
- F `FAIL`：预期 业务数据、照片与关系按规则清除；实际 Synthetic failure to test recorder propagation；证据 a.txt。
- V `N_A`：预期 N/A；实际 API-only synthetic fixture；证据 无。
- N `PASS`：预期 不保留可读取的私有对象或有效会话；实际 Synthetic rejection observed；证据 a.txt。
- 原始证据：[A a.txt](../evidence/synthetic-tool/WEB-DATA-09/api-fixture/a.txt)。
- 结果：[evidence/synthetic-tool/WEB-DATA-09/api-fixture/result.json](../evidence/synthetic-tool/WEB-DATA-09/api-fixture/result.json)。

## 7. 决策与偏差记录

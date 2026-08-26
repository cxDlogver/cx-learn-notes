# apps/alliance-operation-content/src/routes/content-activity/award/utils.ts

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Futils.ts&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `61.54%`
- effectiveUncoveredInsertedRows: `20`
- fileCoverageVersion: `huatuo:fd505ef218d83512`

| line | code |
| --- | --- |
| 60 | `  const response = toPlainRecord(record.response);` |
| 61 | `  const data = toPlainRecord(response?.data);` |
| 62 | `  return [` |
| 63 | `    record.code,` |
| 64 | `    record.name,` |
| 65 | `    record.message,` |
| 66 | `    record.msg,` |
| 67 | `    response?.statusText,` |
| 68 | `    data?.code,` |
| 69 | `    data?.message,` |
| 70 | `    data?.msg,` |
| 71 | `  ]` |
| 72 | `    .map(stringifyToken)` |
| 73 | `    .filter(Boolean)` |
| 74 | `    .join(' ');` |
| 86 | `    return res.code;` |
| 89 | `    return res.st;` |
| 115 | `  return isAwardDeliveryTimeoutLike(error)` |
| 116 | `    ? MESSAGES.SEND_AWARD_GOVERNANCE_TIMEOUT` |
| 117 | `    : MESSAGES.SEND_AWARD_GOVERNANCE_EXCEPTION;` |

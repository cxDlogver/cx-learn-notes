# apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToVideoStore.ts

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fstores%2FsendAwardToVideoStore.ts&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `83.87%`
- effectiveUncoveredInsertedRows: `5`
- fileCoverageVersion: `huatuo:f0083d66d467dd00`

| line | code |
| --- | --- |
| 440 | `        .map((item) => [this.getCandidateId(item), item] as const)` |
| 441 | `        .filter((entry): entry is readonly [string, delivery_item_info] => Boolean(entry[0])),` |
| 447 | `        return;` |
| 450 | `        pendingById.set(candidateId, { ...item, if_delivery: false });` |
| 451 | `        return;` |

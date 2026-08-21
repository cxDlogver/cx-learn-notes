# apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fcomponents%2Fmanually-submit-videos%2Fmanually-submit-videos-drawer%2Fmanually-submit-videos-form%2Findex.tsx&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `92.68%`
- effectiveUncoveredInsertedRows: `9`
- fileCoverageVersion: `huatuo:0990ffb244f2627f`

| line | code |
| --- | --- |
| 594 | `      const mergedData = getMergedDraftData();` |
| 649 | `    const mergedDraftData = getMergedDraftData();` |
| 650 | `    const rowKey = getItemKey(row);` |
| 651 | `    const removedItem = mergedDraftData.find((item) => getItemKey(item) === rowKey) ?? row;` |
| 652 | `    if (isHitVideoItem(removedItem)) {` |
| 653 | `      preserveRemovedSubmitHitItems([removedItem]);` |
| 654 | `    }` |
| 656 | `    const newData = mergedDraftData.filter((item) => getItemKey(item) !== rowKey);` |
| 658 | `    delete rowFormsRef.current[rowKey];` |

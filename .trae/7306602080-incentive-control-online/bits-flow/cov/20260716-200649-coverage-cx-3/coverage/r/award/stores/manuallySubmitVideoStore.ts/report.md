# apps/alliance-operation-content/src/routes/content-activity/award/stores/manuallySubmitVideoStore.ts

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fstores%2FmanuallySubmitVideoStore.ts&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `88.67%`
- effectiveUncoveredInsertedRows: `17`
- fileCoverageVersion: `huatuo:1863460942dab643`

| line | code |
| --- | --- |
| 97 | `      nextRemovedItems.map((item) => this.getCandidateId(item)).filter(Boolean),` |
| 103 | `        return;` |
| 142 | `    if (!this.isReusableHitSubmitMode) {` |
| 143 | `      return;` |
| 144 | `    }` |
| 145 | `    const hitItems = this.getHitItems(this.fillIfDeliveryTrue(items));` |
| 146 | `    if (hitItems.length === 0) {` |
| 147 | `      return;` |
| 148 | `    }` |
| 149 | `    runInAction(() => {` |
| 150 | `      this.removedSubmitHitItems = this.mergeRemovedSubmitHitItems(this.removedSubmitHitItems, hitItems);` |
| 151 | `    });` |
| 213 | `        this.resetRemovedSubmitHitItems();` |
| 242 | `        this.resetRemovedSubmitHitItems();` |
| 249 | `        this.resetRemovedSubmitHitItems();` |
| 325 | `      return false;` |
| 352 | `        message.error('导出剔除明细失败，未获取到明细链接');` |

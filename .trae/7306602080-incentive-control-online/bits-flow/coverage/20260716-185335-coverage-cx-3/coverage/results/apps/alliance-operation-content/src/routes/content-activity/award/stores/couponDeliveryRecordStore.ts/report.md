# apps/alliance-operation-content/src/routes/content-activity/award/stores/couponDeliveryRecordStore.ts

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fstores%2FcouponDeliveryRecordStore.ts&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `0.00%`
- effectiveUncoveredInsertedRows: `11`
- fileCoverageVersion: `huatuo:cfc02a49f01cbfeb`

| line | code |
| --- | --- |
| 188 | `    const deliveryList = this.deliveryList;` |
| 189 | `    if (deliveryList.length === 0) {` |
| 190 | `      return undefined;` |
| 191 | `    }` |
| 199 | `        delivery_list: deliveryList,` |
| 202 | `      if (isAwardDeliverySuccessResponse(res)) {` |
| 204 | `        return res;` |
| 206 | `        message.error(getAwardDeliveryResponseErrorMessage(res, MESSAGES.SEND_AWARD_AUTHORS_FAILED));` |
| 207 | `        return undefined;` |
| 209 | `    } catch (error) {` |
| 210 | `      message.error(getAwardDeliveryExceptionMessage(error));` |

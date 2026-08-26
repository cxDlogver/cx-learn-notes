# apps/alliance-operation-content/src/routes/content-activity/award/components/send-award/batch-submit-modal/index.tsx

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fcomponents%2Fsend-award%2Fbatch-submit-modal%2Findex.tsx&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `76.19%`
- effectiveUncoveredInsertedRows: `25`
- fileCoverageVersion: `huatuo:91cb2311c8682c4e`

| line | code |
| --- | --- |
| 46 | `    return 0;` |
| 69 | `    .filter((item) => item.if_delivery === false)` |
| 70 | `    .map((item) => ({` |
| 71 | `      candidate_id: item.author_info?.author_id,` |
| 72 | `      remove_reason: MANUAL_SUBMIT_REMOVE_REASONS.manual,` |
| 73 | `    }))` |
| 89 | `    message.warning('不发奖名单上传失败');` |
| 90 | `    return;` |
| 99 | `      message.warning(response?.msg \|\| '不发奖名单上传失败');` |
| 102 | `    message.warning('不发奖名单上传失败');` |
| 126 | `    return { resultCode: 0 };` |
| 150 | `    errorMessage = getAwardDeliveryExceptionMessage(error);` |
| 151 | `    message.error(errorMessage);` |
| 180 | `    delivery_from === DeliveryFrom.UploadCandidate ? delivery_list ?? [] : delivery_authors ?? [];` |
| 181 | `  if (submitList.length === 0) {` |
| 182 | `    return { resultCode: 0 };` |
| 183 | `  }` |
| 204 | `      errorMessage = getAwardDeliveryResponseErrorMessage(res, MESSAGES.SEND_AWARD_AUTHORS_FAILED);` |
| 205 | `      message.error(errorMessage);` |
| 207 | `  } catch (error) {` |
| 209 | `    errorMessage = getAwardDeliveryExceptionMessage(error);` |
| 210 | `    message.error(errorMessage);` |
| 212 | `  return { resultCode, errorMessage };` |
| 517 | `          noAwardRemoveCandidates = buildAuthorNoAwardRemoveCandidates(selectedAwardAuthors);` |
| 518 | `          submitResult = await submitSendAwardAuthors({` |

# apps/alliance-operation-content/src/routes/content-activity/award/stores/sendAwardToAuthorStore.ts

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fstores%2FsendAwardToAuthorStore.ts&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `21.21%`
- effectiveUncoveredInsertedRows: `26`
- fileCoverageVersion: `huatuo:a8063018ce0bb551`

| line | code |
| --- | --- |
| 134 | `    runInAction(() => {` |
| 135 | `      this.pendingNoAwardAuthorItems = [];` |
| 136 | `    });` |
| 219 | `          this.pendingNoAwardAuthorItems = [];` |
| 265 | `      this.pendingNoAwardAuthorItems = [];` |
| 415 | `        this.syncPendingNoAwardAuthorItems([newAuthor]);` |
| 473 | `        this.syncPendingNoAwardAuthorItems(updateAuthors);` |
| 498 | `    const pendingById = new Map(` |
| 499 | `      this.pendingNoAwardAuthorItems` |
| 500 | `        .map((author) => [this.getAuthorId(author), author] as const)` |
| 501 | `        .filter((entry): entry is readonly [string, delivery_author_info] => Boolean(entry[0])),` |
| 502 | `    );` |
| 504 | `    authors.forEach((author) => {` |
| 505 | `      const authorId = this.getAuthorId(author);` |
| 506 | `      if (!authorId) {` |
| 507 | `        return;` |
| 508 | `      }` |
| 509 | `      if (author.if_delivery === false) {` |
| 510 | `        pendingById.set(authorId, { ...author, if_delivery: false });` |
| 511 | `        return;` |
| 512 | `      }` |
| 513 | `      if (author.if_delivery === true) {` |
| 514 | `        pendingById.delete(authorId);` |
| 515 | `      }` |
| 516 | `    });` |
| 518 | `    this.pendingNoAwardAuthorItems = Array.from(pendingById.values());` |

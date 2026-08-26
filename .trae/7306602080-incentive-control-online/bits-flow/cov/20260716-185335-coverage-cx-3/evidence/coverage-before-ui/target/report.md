# apps/alliance-operation-content/src/routes/content-activity/award/components/manually-submit-videos/manually-submit-videos-drawer/manually-submit-videos-form/index.tsx

- coverageUrl: `https://huatuo.bytedance.net/api/jsCoverage/branch/code?gitRepo=ecom%2Falliance-operation-mono&fromBranch=master&toBranch=cx-3&filePath=apps%2Falliance-operation-content%2Fsrc%2Froutes%2Fcontent-activity%2Faward%2Fcomponents%2Fmanually-submit-videos%2Fmanually-submit-videos-drawer%2Fmanually-submit-videos-form%2Findex.tsx&devicePlatform=&deviceModel=&appId=&appVersion=`
- coverRatio: `0.81%`
- effectiveUncoveredInsertedRows: `122`
- fileCoverageVersion: `huatuo:c699f0478ea58c88`

| line | code |
| --- | --- |
| 113 | `  const hitStatusLabels = showSubmitHitStatus` |
| 114 | `    ? [` |
| 115 | `        record?.if_satisfy_delivery_rules === false ? MANUAL_SUBMIT_HIT_LABELS.invalid : undefined,` |
| 116 | `        record?.if_not_incentive === true ? MANUAL_SUBMIT_HIT_LABELS.notIncentive : undefined,` |
| 117 | `      ].filter(Boolean)` |
| 118 | `    : [];` |
| 119 | `  const shouldShowLegacyInvalidStatus = !showSubmitHitStatus && record?.if_satisfy_delivery_rules === false;` |
| 259 | `                {hitStatusLabels.length > 0 ? (` |
| 260 | `                  <div className={styles.hitStatusLabels}>{hitStatusLabels.join('  ')}</div>` |
| 261 | `                ) : null}` |
| 264 | `            {(shouldShowLegacyInvalidStatus \|\| record?.if_delivered === true) && (` |
| 273 | `                {shouldShowLegacyInvalidStatus && (` |
| 497 | `  } = manuallySubmitVideoStore;` |
| 499 | `  const exposedHitSummaryKeysRef = useRef<Set<string>>(new Set());` |
| 567 | `  const getMergedDraftData = useCallback(` |
| 568 | `    () =>` |
| 569 | `      dataSource.map((item) => {` |
| 570 | `        const itemKey = getItemKey(item);` |
| 571 | `        const rowForm = rowFormsRef.current[itemKey];` |
| 572 | `        if (!rowForm) {` |
| 573 | `          return item;` |
| 574 | `        }` |
| 575 | `        const rowValues = rowForm.getFieldsValue(true);` |
| 576 | `        const normalizedValues = normalizeRowValues(rowValues);` |
| 577 | `        return mergeItemWithFormValues(item, normalizedValues);` |
| 578 | `      }),` |
| 579 | `    [dataSource, getItemKey, mergeItemWithFormValues, normalizeRowValues],` |
| 580 | `  );` |
| 594 | `      const mergedData = getMergedDraftData();` |
| 600 | `  }, [getMergedDraftData, setVideoItems]);` |
| 606 | `  useEffect(() => {` |
| 607 | `    if (!hasSubmitHitItems) {` |
| 608 | `      return;` |
| 609 | `    }` |
| 610 | `    const exposeKey = [` |
| 611 | `      activity_id \|\| '-',` |
| 612 | `      config_id \|\| '-',` |
| 613 | `      session_unix_time \|\| '-',` |
| 614 | `      submitMethod \|\| '-',` |
| 615 | `    ].join('\|');` |
| 616 | `    if (exposedHitSummaryKeysRef.current.has(exposeKey)) {` |
| 617 | `      return;` |
| 618 | `    }` |
| 619 | `    sendModuleExposeLog(` |
| 620 | `      {` |
| 621 | `        page_id: 'activity_reward_distribution',` |
| 622 | `        module_id: 'manual_submit_hit_summary',` |
| 623 | `        module_name: '人工提报命中提示',` |
| 624 | `        module_type: 'block',` |
| 625 | `        parent_block_id: 'activity_reward_distribution',` |
| 626 | `        parent_block_name: '奖励投放页',` |
| 627 | `        parent_block_type: 'page',` |
| 628 | `        activity_id,` |
| 629 | `        config_id,` |
| 630 | `        submitHitCount: String(submitHitCount),` |
| 631 | `        submitHitTotalCount: String(submitHitTotalCount),` |
| 632 | `        submit_method: submitMethod,` |
| 633 | `        session_unix_time: session_unix_time !== undefined ? String(session_unix_time) : undefined,` |
| 634 | `      },` |
| 635 | `      {},` |
| 636 | `    );` |
| 637 | `    exposedHitSummaryKeysRef.current.add(exposeKey);` |
| 638 | `  }, [` |
| 639 | `    activity_id,` |
| 640 | `    config_id,` |
| 641 | `    hasSubmitHitItems,` |
| 642 | `    session_unix_time,` |
| 643 | `    submitHitCount,` |
| 644 | `    submitHitTotalCount,` |
| 645 | `    submitMethod,` |
| 646 | `  ]);` |
| 649 | `    const mergedDraftData = getMergedDraftData();` |
| 650 | `    const rowKey = getItemKey(row);` |
| 651 | `    const removedItem = mergedDraftData.find((item) => getItemKey(item) === rowKey) ?? row;` |
| 652 | `    if (isHitVideoItem(removedItem)) {` |
| 653 | `      preserveRemovedSubmitHitItems([removedItem]);` |
| 654 | `    }` |
| 656 | `    const newData = mergedDraftData.filter((item) => getItemKey(item) !== rowKey);` |
| 658 | `    delete rowFormsRef.current[rowKey];` |
| 659 | `  };` |
| 661 | `  const handleRemoveSubmitHitItems = async () => {` |
| 662 | `    const mergedDraftData = getMergedDraftData();` |
| 663 | `    const hitItemKeys = mergedDraftData.filter((item) => isHitVideoItem(item)).map(getItemKey);` |
| 664 | `    const success = await removeSubmitHitItems(mergedDraftData);` |
| 665 | `    if (success) {` |
| 666 | `      hitItemKeys.forEach((itemKey) => {` |
| 667 | `        delete rowFormsRef.current[itemKey];` |
| 668 | `      });` |
| 669 | `    }` |
| 670 | `  };` |
| 672 | `  const handleExportSubmitHitRecords = () => {` |
| 673 | `    void exportSubmitHitRecords();` |
| 710 | `    {` |
| 711 | `      title: kVideoAwardConfigKeyDescriptions.target_audience,` |
| 712 | `      dataIndex: ['delivery_config', 'target_audience'],` |
| 713 | `      cellType: CellType.target_audience,` |
| 714 | `    },` |
| 733 | `    const mergedDraftData = getMergedDraftData();` |
| 756 | `        showSubmitHitStatus: hasSubmitHitItems,` |
| 774 | `      {shouldShowSubmitHitToolbar && (` |
| 775 | `        <div className={styles.manualHitToolbar}>` |
| 776 | `          <div className={styles.manualHitSummary}>` |
| 777 | `            <span className={styles.manualHitSummaryIcon}>i</span>` |
| 778 | `            <span>` |
| 779 | `              {`共${submitHitTotalCount}个作品，其中不满足准入门槛或命中【不激励】规则的作品数为：${submitHitCount}个`}` |
| 780 | `            </span>` |
| 781 | `          </div>` |
| 782 | `          <Space>` |
| 783 | `            <Button` |
| 784 | `              type="primary"` |
| 785 | `              loading={removingHitItems}` |
| 786 | `              disabled={!hasSubmitHitItems}` |
| 787 | `              onClick={handleRemoveSubmitHitItems}` |
| 788 | `            >` |
| 789 | `              一键移除` |
| 790 | `            </Button>` |
| 791 | `            <Button loading={exportingRemoveRecords} onClick={handleExportSubmitHitRecords}>` |
| 792 | `              导出剔除明细` |
| 793 | `            </Button>` |
| 794 | `          </Space>` |
| 795 | `        </div>` |
| 796 | `      )}` |

# BAM Sync Report

- status: PASSED
- mode: `apply-config-write`
- execution_mode: `mutation`
- execution_repo_root: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- target_app_or_package: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content`
- execution_branch: `cx-3`
- next_step: `/delivery:plan`
- workspace: `/Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online`
- repo_root: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono`
- target_dir: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content`

## Branch Preflight
- `branch_preflight.status`: `PASSED`
- `branch_preflight.checker_kind`: `probe_chain`
- `branch_preflight.verification_level`: `branch_exists`
- `branch_preflight.summary`: All target branches passed the configured branch-existence probe chain.

```json
{
  "status": "PASSED",
  "mode": "preflight",
  "checker_kind": "probe_chain",
  "verification_level": "branch_exists",
  "summary": "All target branches passed the configured branch-existence probe chain.",
  "reason": "",
  "execution_repo_root": "/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono",
  "target_app_or_package": "/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content",
  "workspace": "/Users/bytedance/cx/spec-2/meego-11/artifacts/7306602080-incentive-control-online",
  "next_step": "/delivery:bam:plan-methods",
  "available_probe_kinds": [
    "command_template",
    "bits_cli_bam_psm_list_version"
  ],
  "notes": [
    "Probe chain order: `command_template` -> `bits_cli_bam_psm_list_version`."
  ],
  "items": [
    {
      "psm": "ecom.buyin.admin_api",
      "branch": "feat_bujili",
      "checker_kind": "probe_chain",
      "verification_level": "branch_exists",
      "selected_probe_kind": "command_template",
      "selected_verification_level": "branch_exists",
      "command": "source ~/.nvm/nvm.sh && nvm use 18 >/dev/null && cd /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content && npm exec -- bam ls | grep -F \"ecom.buyin.admin_api\" | grep -F \"feat_bujili\"",
      "exit_code": 0,
      "auth_status": "AUTH_OK",
      "result": "PASSED",
      "matched_signal": "BRANCH_CHECK_PASSED",
      "summary": "Checker confirmed ecom.buyin.admin_api@feat_bujili.",
      "stdout_summary": "│ * ecom.buyin.admin_api │ ecom.buyin.admin_api │ master │ 1.0.1937@feat_bujili │ 1.0.1951@master │",
      "stderr_summary": "",
      "probe_attempts": [
        {
          "probe_kind": "command_template",
          "verification_level": "branch_exists",
          "command": "source ~/.nvm/nvm.sh && nvm use 18 >/dev/null && cd /Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content && npm exec -- bam ls | grep -F \"ecom.buyin.admin_api\" | grep -F \"feat_bujili\"",
          "exit_code": 0,
          "auth_status": "AUTH_OK",
          "result": "PASSED",
          "matched_signal": "BRANCH_CHECK_PASSED",
          "summary": "Checker confirmed ecom.buyin.admin_api@feat_bujili.",
          "stdout_summary": "│ * ecom.buyin.admin_api │ ecom.buyin.admin_api │ master │ 1.0.1937@feat_bujili │ 1.0.1951@master │",
          "stderr_summary": ""
        }
      ],
      "fallback_used": false
    }
  ]
}
```

## PSM Branch Evidence
| PSM | branch | source | evidence |
|---|---|---|---|
| `ecom.buyin.admin_api` | `feat_bujili` | tech_doc_explicit | 技术文档 API 改动均归属 ecom.buyin.admin_api；用户在 /delivery:bam 阶段补充目标分支为 feat_bujili。 |

## Interface Change Evidence
| PSM | endpoint_id | method | path | change_type | changed_fields |
|---|---|---|---|---|---|
| `ecom.buyin.admin_api` | `3930788` | `GET` | `/api/buyin/admin/content_activity/get_delivery_items_from_sheet` | existing_interface_field_update | if_not_incentive, not_incentive_reason |
| `ecom.buyin.admin_api` | `4238483` | `POST` | `/api/buyin/admin/content_activity/download_content_remove_record` | new_interface | records, author_id, item_id, item_name, remove_reason, penalty_reason, lark_url |
| `ecom.buyin.admin_api` | `4238485` | `POST` | `/api/buyin/admin/content_activity/candidate_remove` | new_interface | activity_id, config_id, remove_candidates, candidate_id, remove_reason |
| `ecom.buyin.admin_api` | `4238486` | `GET` | `/api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` | new_interface | activity_id, config_id, page, page_num, candidate_ids, operator_id, records, total, has_more |
| `ecom.buyin.admin_api` | `4238484` | `GET` | `/api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` | new_interface | activity_id, config_id, page, page_num, candidate_ids, operator_id, records, total, has_more |

## Method Lookup Plan
- none

## Method Metadata
- file: `bam-method-metadata.json`
- items: `[]`
- result: lookup plan is empty; no `bytedcli --json bam method get` command required.

## Required Include Entries
| API | source | endpoint_id |
|---|---|---|
| `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet` | interface_evidence | `3930788` |
| `POST /api/buyin/admin/content_activity/download_content_remove_record` | interface_evidence | `4238483` |
| `POST /api/buyin/admin/content_activity/candidate_remove` | interface_evidence | `4238485` |
| `GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record` | interface_evidence | `4238486` |
| `GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` | interface_evidence | `4238484` |

## Missing Include Entries
- none after `apply-config --write`.

## Config Changes
| config | PSM | before | after | action | include_missing |
|---|---|---|---|---|---|
| `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/bam.config.js` | `ecom.buyin.admin_api` | `ecom.buyin.admin_api@master` | `ecom.buyin.admin_api@feat_bujili` | psm_branch_update+include_add_entries | `POST /api/buyin/admin/content_activity/download_content_remove_record, POST /api/buyin/admin/content_activity/candidate_remove, GET /api/buyin/admin/content_activity/get_dou_plus_coin_remove_record, GET /api/buyin/admin/content_activity/get_dou_plus_coupon_remove_record` |

## Modified bam.config.js
- `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content/bam.config.js`
- summary: `ecom.buyin.admin_api@master` -> `ecom.buyin.admin_api@feat_bujili`; added 4 missing include entries; existing `GET /api/buyin/admin/content_activity/get_delivery_items_from_sheet` already present.

## Blockers
- none

## BAM Update Execution
- command: `source ~/.nvm/nvm.sh && nvm use 18 >/dev/null && npm run bam`
- cwd: `/Users/bytedance/cx/spec-2/meego-11/meego-7306602080/repos/alliance-operation-mono/apps/alliance-operation-content`
- result: `PASSED`, exit_code `0`
- summary: `npx bam update --remove-folder` loaded `ecom.buyin.admin_api@feat_bujili` version `1.0.1937`, generated 80 files, and finished in `4.979s`.
- post_check: `npm exec -- bam ls --throw-unmatched` passed; `ecom.buyin.admin_api` Strategy / Log Version / Next Version all resolved to `feat_bujili`.

## Dependency Recovery / Retry
- none.

## Repo Fallback Cleanup
- repo_fallback_used: `false`
- non_target_app_or_package_src_bam_changes: `none`
- cleanup_result: `PASSED`; removed same-target, non-evidence PSM generated doc-link noise in `apps/alliance-operation-content/src/bam/ecom.buyin.content_operate_api/index.ts`.

## Final Diff Summary
- target files changed: 9 files under `apps/alliance-operation-content`.
- changed scope: target `bam.config.js` plus `src/bam/ecom.buyin.admin_api/**` generated output.
- no non-target app/package `src/bam/**` diff remains.

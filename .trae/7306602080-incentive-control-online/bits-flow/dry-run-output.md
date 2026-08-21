# BITS develop create dry-run output

> generated_at: `2026-07-16 11:42:31 +0800`  
> mode: `/delivery:bits --init`  
> result: `PASSED`

## CLI

```bash
source ~/.nvm/nvm.sh && nvm use 18 && command -v bytedcli
```

Exit code: `0`

```text
/Users/bytedance/.nvm/versions/node/v18.20.8/bin/bytedcli
```

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli --version
```

Exit code: `0`

```text
0.102.0
```

## Remote Branch Check

```bash
git -C meego-7306602080/repos/alliance-operation-mono ls-remote --heads origin cx-3
```

Exit code: `0`

```text
<empty>
```

Conclusion: remote branch `cx-3` does not exist. This dry-run did not push. `--execute` must push `cx-3` first.

## Existing BITS Tasks

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli --json bits develop list --space-id 139033499138 --work-items "meego 7306602080" --page 1 --page-size 10
```

Exit code: `0`

Summary:

| dev_id | status | source_branch | MR |
| --- | --- | --- | --- |
| `2528976` | `finished` | `feat/meego-7306602080-incentive-control` | `https://bits.bytedance.net/code/ecom/alliance-operation-mono/merge_requests/682` |
| `2527368` | `finished` | `feat/meego-7306602080-incentive-control` | `https://bits.bytedance.net/code/ecom/alliance-operation-mono/merge_requests/681` |
| `2510992` | `finished` | `feat/meego-7306602080-incentive-control` | `https://bits.bytedance.net/code/ecom/alliance-operation-mono/merge_requests/659` |

These tasks are finished and are not reused as the active dev task. The latest task `2528976` is used as `from_dev_id` to inherit project/team-flow configuration.

## Template Task Detail

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli --json bits develop get --dev-id 2528976
```

Exit code: `0`

Relevant fields:

```json
{
  "id": 2528976,
  "status": "finished",
  "title": "运营平台_内容活动_激励管控线上化",
  "space_id": 139033499138,
  "branch": {
    "repo": "ecom/alliance-operation-mono",
    "source": "feat/meego-7306602080-incentive-control",
    "target": "release_2026-06-30_1173917339394",
    "mr_url": "https://bits.bytedance.net/code/ecom/alliance-operation-mono/merge_requests/682"
  },
  "projectInfo": {
    "type": "PROJECT_TYPE_WEB",
    "name": "联盟运营后台-内容运营",
    "psm": "121525",
    "projectUniqueId": "121525"
  },
  "mainScmDependency": {
    "name": "ecom/alliance_operation_mono/mono",
    "gitRepoName": "ecom/alliance-operation-mono"
  },
  "lanes": {
    "ppe": "ppe_bujili",
    "boe": "boe_bujili"
  },
  "teamFlowId": "582473440514"
}
```

## Failed Candidate: SCM Dependency As Service

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli bits develop create \
  --title "运营平台_内容活动_激励管控线上化" \
  --change "service=ecom/alliance_operation_mono/mono,branch=cx-3" \
  --lane "ppe_bujili" \
  --space-id 139033499138 \
  --meego "7306602080" \
  --dry-run
```

Exit code: `1`

```text
✗ No matching projects found for services: ecom/alliance_operation_mono/mono.
  Hint: Ensure the service names are correct and belong to the same Bits space.
```

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli bits develop create \
  --title "运营平台_内容活动_激励管控线上化" \
  --change "service=ecom/alliance_operation_mono/mono,branch=cx-3" \
  --lane "ppe_bujili" \
  --space-id 139033499138 \
  --from-dev-id 2528976 \
  --meego "7306602080" \
  --dry-run
```

Exit code: `1`

```text
✗ No matching projects found for services: ecom/alliance_operation_mono/mono.
  Hint: Ensure the service names are correct and belong to the same Bits space.
```

Conclusion: for current bytedcli, `--change service=` must use the BITS Web project identifier `121525`; `ecom/alliance_operation_mono/mono` is the main SCM dependency name inside that project.

## Passing Dry-run: `--change`

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli bits develop create \
  --title "运营平台_内容活动_激励管控线上化" \
  --change "service=121525,branch=cx-3" \
  --lane "ppe_bujili" \
  --space-id 139033499138 \
  --from-dev-id 2528976 \
  --meego "7306602080" \
  --dry-run
```

Exit code: `0`

Relevant payload:

```json
{
  "task": {
    "title": "运营平台_内容活动_激励管控线上化",
    "spaceId": 139033499138,
    "devTaskTemplateId": 1486,
    "teamFlowId": "582473440514",
    "type": "feature"
  },
  "changes": [
    {
      "changeType": "CHANGE_TYPE_CODE",
      "manifest": {
        "codeElement": {
          "sourceBranch": "cx-3",
          "targetBranch": "master",
          "repoPath": "ecom/alliance-operation-mono",
          "iid": 0,
          "isCodebaseDraft": false
        }
      }
    }
  ],
  "projects": [
    {
      "projectInfo": {
        "type": "PROJECT_TYPE_WEB",
        "name": "联盟运营后台-内容运营",
        "psm": "121525",
        "projectUniqueId": "121525"
      },
      "buildConfigs": [
        {
          "scmDependencies": [
            {
              "name": "ecom/alliance_operation_mono/mono",
              "isMain": true,
              "revision": "cx-3",
              "gitRepoName": "ecom/alliance-operation-mono",
              "gitRepoId": 765920
            }
          ],
          "controlPanel": "CONTROL_PLANE_CN"
        }
      ]
    }
  ],
  "workItems": [
    {
      "platform": "meego",
      "id": "7306602080",
      "value": "7306602080"
    }
  ]
}
```

## Passing Alternative: `--services`

```bash
source ~/.nvm/nvm.sh && nvm use 18 && bytedcli bits develop create \
  --title "运营平台_内容活动_激励管控线上化" \
  --services "121525" \
  --service-type PROJECT_TYPE_WEB \
  --scm-mode branch \
  --scm-branch cx-3 \
  --lane "ppe_bujili" \
  --space-id 139033499138 \
  --from-dev-id 2528976 \
  --meego "7306602080" \
  --dry-run
```

Exit code: `0`

Result matches the accepted project and SCM payload above. The canonical command recorded in `bits-task-info.json` uses the `--change "service=121525,branch=cx-3"` form.

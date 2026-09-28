# Safe Predict

Safe Predict platform commands for scene/ability/DAG lookup, draft management, test execution, operator lookup, and publish ticket workflow. These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
# Scene / ability / DAG / operator lookup
bytedcli safe predict scene list --page 1 --page-size 10 --query-by-self
bytedcli safe predict ability list --scene-id 1000
bytedcli safe predict dag get --scene-id 1000 --data-type 0
bytedcli safe predict operator list --scene-id 1000

# Draft lifecycle
bytedcli safe predict draft list --scene-id 1000 --page 1 --page-size 10
bytedcli safe predict draft create --scene-id 1000 --dag-list ./sample-dag-list.json --yes
bytedcli safe predict draft update --draft-id 2000 --dag-list ./sample-dag-list.json --yes
bytedcli safe predict draft diff --draft-id 2000

# Test flow
bytedcli safe predict test init --scene-id 1000 --draft-id 2000
bytedcli safe predict test execute --scene-id 1000 --draft-id 2000 --object-id demo-object-id
bytedcli safe predict test-node list --scene-id 1000
bytedcli safe predict test-result get --scene-id 1000 --test-id demo-test-id

# Publish checks / limits / history / tickets
bytedcli safe predict draft-save-check get --scene-id 1000 --draft-id 2000
bytedcli safe predict publish-check get --scene-id 1000 --draft-id 2000
bytedcli safe predict publish-limit get --scene-id 1000
bytedcli safe predict publish-history list --scene-id 1000 --page 1 --page-size 10
bytedcli safe predict publish-ticket create --scene-id 1000 --draft-id 2000 --yes
bytedcli safe predict publish-ticket get --ticket-id demo-ticket-id
bytedcli safe predict publish-ticket withdraw --ticket-id demo-ticket-id --yes
```

## JSON mode

```bash
bytedcli --json safe predict scene list --page 1 --page-size 20
bytedcli --json safe predict ability list --scene-id 1000 --page-size 9999
bytedcli --json safe predict dag get --scene-id 1000 --data-type 0
bytedcli --json safe predict publish-ticket get --ticket-id demo-ticket-id
```

## Write command note

Draft and publish write commands may require `--yes` in automation / JSON mode to skip interactive confirmation. Prefer inspecting with list/get/check commands before writing.

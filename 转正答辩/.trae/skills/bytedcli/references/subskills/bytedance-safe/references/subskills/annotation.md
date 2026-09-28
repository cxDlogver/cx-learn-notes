# Safe Annotation

Safe annotation dataset group、dataset batch、task 与 result 查询/写入命令。These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
# Dataset groups
bytedcli safe annotation dataset-group get --biz-line-key demo-biz --id demo-group-id
bytedcli safe annotation dataset-group get --biz-line-key demo-biz --name demo-group
bytedcli safe annotation dataset-group create --biz-line-key demo-biz --name demo-group --case-type image --annotation-plan plan-demo --standard-label-id label-demo --owner demo.user

# Dataset batches
bytedcli safe annotation dataset list --dataset-group-id demo-group-id --page 1 --page-size 20
bytedcli safe annotation dataset create --case-type safe_live_video --name demo-dataset --creator demo-open-id --dataset-group-id demo-group-id --data-scene sample-scene
bytedcli safe annotation dataset upload --dataset-id demo-dataset-id --object-id demo-object-id --object-data '{"object_id":"demo-object-id","object_type":"sample"}'
bytedcli safe annotation dataset finalize --dataset-id demo-dataset-id

# Tasks and results
bytedcli safe annotation task create --name demo-task --dataset-group-id demo-group-id --workflow-id demo-workflow-id --dataset-id demo-dataset-id
bytedcli safe annotation task get --task-id demo-task-id
bytedcli safe annotation task update-status --task-id demo-task-id --to-status completed
bytedcli safe annotation result get --task-id demo-task-id --page 1 --page-size 20
```

## JSON mode

```bash
bytedcli --json safe annotation dataset-group get --biz-line-key demo-biz --id demo-group-id
bytedcli --json safe annotation dataset list --dataset-group-id demo-group-id --page 1 --page-size 20
bytedcli --json safe annotation task get --task-id demo-task-id
bytedcli --json safe annotation result get --task-id demo-task-id --page 1 --page-size 20
```

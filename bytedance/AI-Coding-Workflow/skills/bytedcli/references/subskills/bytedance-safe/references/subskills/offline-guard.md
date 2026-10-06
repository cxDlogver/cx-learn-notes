# Safe Offline Guard

Offline Guard / RIP recall-task and process-task lookup commands. These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
# Search retrace recall tasks and recalled articles
bytedcli safe offline-guard recall-task list
bytedcli safe offline-guard recall-task list --task-type 1 --page 1 --page-size 20
bytedcli safe offline-guard recall-task list --creator demo-user@example.com
bytedcli safe offline-guard recall-task get --task-id demo-task-id
bytedcli safe offline-guard recall-task get --task-id demo-task-id --stage 2 --page 1

# SendTCS / disposal process tasks
bytedcli safe offline-guard process-task list
bytedcli safe offline-guard process-task list --task-type 2 --page 1
bytedcli safe offline-guard process-task list --offline-task-id demo-task-id
bytedcli safe offline-guard process-task get --process-task-id 156
bytedcli safe offline-guard process-task get --process-task-id 156 --stage 3 --page 1
```

## JSON mode

```bash
bytedcli --json safe offline-guard recall-task list --task-name demo-task
bytedcli --json safe offline-guard recall-task get --task-id demo-task-id --page-size 100
bytedcli --json safe offline-guard process-task list --creator demo-user@example.com
bytedcli --json safe offline-guard process-task get --process-task-id 156 --page-size 100
```

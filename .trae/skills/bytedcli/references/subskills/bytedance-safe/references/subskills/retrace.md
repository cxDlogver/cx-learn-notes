# Safe Retrace

Safe Retrace task lifecycle commands. These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
# Create / get / copy
bytedcli safe retrace task create --payload-file /private/tmp/demo-retrace-payload.json
bytedcli safe retrace task get --task-id 12345
bytedcli safe retrace task copy --task-id 12345 --qps 10

# Lifecycle controls
bytedcli safe retrace task pause --task-id 12345
bytedcli safe retrace task resume --task-id 12345
bytedcli safe retrace task terminate --task-id 12345

# Flow control
bytedcli safe retrace task flow-control update --task-id 12345 --qps 10
```

## JSON mode

```bash
bytedcli --json safe retrace task create --payload-file /private/tmp/demo-retrace-payload.json
bytedcli --json safe retrace task get --task-id 12345
bytedcli --json safe retrace task flow-control update --task-id 12345 --qps 10
```

## Write command note

Create/copy/pause/resume/terminate/update commands are write operations. In non-interactive automation, pass the command-specific confirmation flags when available and inspect the JSON result.

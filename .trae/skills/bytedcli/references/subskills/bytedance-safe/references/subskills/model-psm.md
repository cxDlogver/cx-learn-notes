# Safe Model PSM

Safe model PSM metadata commands. This command is provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If the command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
bytedcli safe model-psm meta list --page 1 --page-size 20
bytedcli safe model-psm meta list --model-pattern demo-model --tree-direction risk_control --scope sample-scope
bytedcli safe model-psm meta list --creator demo-user@example.com --start '2026-06-25 00:00:00' --end '2026-06-26 00:00:00'
bytedcli --json safe model-psm meta list --platform-type ark --order-by-create-time 1 --page-size 5
```

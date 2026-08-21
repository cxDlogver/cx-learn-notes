# Safe Report

Safe Prism report list and detail lookup. This command is provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If the command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
bytedcli safe report list --report-id sample-report-id
bytedcli safe report list --reported-user-id sample-user-id --object-type user --reason 色情低俗 --start '2026-05-28 00:00:00' --end '2026-05-29 00:00:00'
bytedcli safe report list --reporter-id sample-reporter-id --object-type user --status 处理中 --page-size 5
bytedcli --json safe report list --reporter-id sample-reporter-id --object-type user --status 处理中 --page-size 5
```

# Safe KBS

Safe KBS base detail lookup. This command is provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If the command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

Provide exactly one of `--kb-key` or `--kb-id`.

```bash
bytedcli safe kbs base get --platform tcs --bizline tcs --kb-key sample-kb-key
bytedcli safe kbs base get --platform tcs --bizline tcs --kb-id sample-kb-id --operator demo-user
bytedcli safe kbs base get --platform tcs --bizline tcs --kb-key sample-kb-key --timeout-ms 30000
bytedcli --json safe kbs base get --platform tcs --bizline tcs --kb-key sample-kb-key
```

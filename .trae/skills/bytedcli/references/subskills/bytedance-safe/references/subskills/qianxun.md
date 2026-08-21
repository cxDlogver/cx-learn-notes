# Safe Qianxun

Qianxun aggregated item/user detail commands. These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
bytedcli safe qianxun item get --id demo-item-id
bytedcli safe qianxun item get --id demo-item-id --business-key demo-business
bytedcli safe qianxun item get --id demo-item-id --business-key demo-business --need-frames

bytedcli safe qianxun user get --id demo-user-id
bytedcli safe qianxun user get --id demo-user-id --business-key demo-business
```

## JSON mode

```bash
bytedcli --json safe qianxun item get --id demo-item-id --business-key demo-business
bytedcli --json safe qianxun user get --id demo-user-id --business-key demo-business
```

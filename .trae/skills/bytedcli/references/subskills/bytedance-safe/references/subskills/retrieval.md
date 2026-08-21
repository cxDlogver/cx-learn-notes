# Safe Retrieval

Safe retrieval commands for text/item/image based retrieval and risk event search. These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

## Commands

```bash
# Text query -> item retrieval
bytedcli safe retrieval search-by-query --query "demo text" --start 2026-03-26 --end 2026-06-23
bytedcli safe retrieval search-by-query --query "demo text" --topk 50 --start 2026-03-26 --end 2026-06-23 --business-key demo-business

# Source item -> related items
bytedcli safe retrieval search-by-item --id sample-item-id --start 2026-03-26 --end 2026-06-23
bytedcli safe retrieval search-by-item --id sample-item-id --topk 50 --start 2026-03-26 --end 2026-06-23 --business-key demo-business

# Image -> related videos
bytedcli safe retrieval search-by-image --image https://example.com/demo-image.png
bytedcli safe retrieval search-by-image --image https://example.com/demo-image.png --topk 50 --business-key demo-business

# Risk event search
bytedcli safe retrieval search-event --query "demo text"
bytedcli safe retrieval search-event --query "demo text" --topk 50 --business-key demo-business
```

## JSON mode

```bash
bytedcli --json safe retrieval search-by-query --query "demo text" --start 2026-03-26 --end 2026-06-23
bytedcli --json safe retrieval search-by-item --id sample-item-id --start 2026-03-26 --end 2026-06-23
bytedcli --json safe retrieval search-by-image --image https://example.com/demo-image.png
bytedcli --json safe retrieval search-event --query "demo text"
```

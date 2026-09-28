# Safe TCR

Query TCR (Toutiao Content Recognition) matching results on the BES Associated Service (`bes.bytedance.net/api/associated/...`). Use this to look up whether a short video item already maps to a long-video Compass entity (剧集/合集).

## Prerequisite: safecli plugin

`safe tcr` commands are provided by the safecli plugin. Install it once:

```bash
bytedcli self plugin install --repo ies_safety/safecli
```

If `bytedcli safe tcr` reports an unknown command, run the install above, then verify with `bytedcli self plugin doctor --name safecli`.

The TCR client also requires bytedcli **>=0.87.0** for the BES session helper. Running on an older host surfaces a structured `SAFE_TCR_HOST_UNSUPPORTED` error — upgrade with `npm i -g @bytedance-dev/bytedcli@latest` and retry.

## Authentication

TCR uses the ByteDance SSO web session, not `safe login` (门神/MPSSO). Authenticate once with:

```bash
bytedcli auth login --session
```

The CLI mints the BES 服务端会话 cookie from that BDSSO session automatically and caches it for ~5 minutes. If a cached cookie is evicted server-side, the next call auto-refreshes it once. If a command reports `SAFE_AUTH_REQUIRED`, re-run `bytedcli auth login --session`.

## Commands

```bash
bytedcli safe tcr get --item-id <id> --app-id <id>
```

`--item-id` accepts a digit-only string (短视频 item id, typically 18 位). `--app-id` is a positive integer (e.g. `9999`).

## Get

`safe tcr get` calls `GetShortRelatedCompass` and returns the matched Compass album plus per-segment TCR matches. Results are surfaced in two tables:

- **Match Compasses** — `AUDIT`, `COMPASS_ID`, `NAME`, `RELEASE_YEAR`, `MATCH_COUNT`, `TOP_SIMILARITY`.
- **Match Segments** — `COMPASS#`, `COMPASS_ID`, `SEQ`, `SHORT_VID`, `RAW_VID`, `SEG_COUNT`, `SIMILARITY`, `RANGE_MS`.

When the item has no Compass match (either an empty match list or HTTP 404 with an empty envelope), text mode prints `未查询到 TCR 匹配结果` and JSON mode returns `matchCompasses: []`.

```bash
bytedcli safe tcr get --item-id 123456789012345678 --app-id 9999
bytedcli --json safe tcr get --item-id 123456789012345678 --app-id 9999
```

JSON output fields (`data`):

| Field | Type | Description |
|-------|------|-------------|
| `labVersion` | string | Backend lab version tag |
| `intentScore` | number | TCR intent score (0~1) |
| `matchCompasses` | array | Per-Compass matches; `[]` means no result |
| `matchCompasses[].album` | object \| null | Matched Compass album metadata |
| `matchCompasses[].matches` | array | Per-segment matches with similarity and duration |
| `optionalData.tcrIntent` | string | TCR intent label |
| `optionalData.bind` | string | TCR bind label |

## Troubleshooting

- `SAFE_TCR_HOST_UNSUPPORTED` — your bytedcli host is older than v0.87.0 or built without the BES session helper. Upgrade and retry.
- `SAFE_AUTH_REQUIRED` — the BES session cannot be minted. Run `bytedcli auth login --session` again and retry.
- `SAFE_TCR_API_ERROR` — upstream returned a non-zero envelope code; check `details.upstream_code` and `details.message` for context.

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)

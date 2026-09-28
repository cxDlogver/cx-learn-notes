# Safe EFP

Search, inspect, create, and update features on the Eco Feature Platform (EFP, hosted on `imis.bytedance.net`).

## Prerequisite: safecli plugin

`safe efp` commands are provided by the safecli plugin. Install it once:

```bash
bytedcli self plugin install --repo ies_safety/safecli
```

If `bytedcli safe efp` reports an unknown command, run the install above, then verify with `bytedcli self plugin doctor --name safecli`.

## Authentication

EFP uses the ByteDance SSO web session, not `safe login` (门神/MPSSO). Authenticate once with:

```bash
bytedcli auth login --session
```

The CLI mints the imis `mis2_sid` session from that BDSSO session automatically. If a command reports `SAFE_AUTH_REQUIRED`, re-run `bytedcli auth login --session`.

## Commands

`--object-type` is one of `item` (内容/视频), `user` (账号), or `mix` (合集) — these are the dimensions the EFP fetch pipeline serves.

```bash
bytedcli safe efp feature search --object-type <type> [--keyword <kw>] [--fetcher <name>]
bytedcli safe efp feature get --feature <name> --object-type <type>
bytedcli safe efp feature create --name <name> --object-type <type> --data-type <type> --fetcher <name> (--dry-run | --yes)
bytedcli safe efp feature update --feature <name> --object-type <type> [--add-ark-feature <keys>] [--add-tcs-packer <packers>] [--set-ark-packer <name>] [--set-collector <name>] (--dry-run | --yes)
```

## Search & Get

Search surfaces the basics for each matching leaf feature: name, object type, data type, fetcher, owner, description. `--keyword` is optional — omit it to browse all features under the object type. `--fetcher <name>` filters the returned features to that fetcher (client-side, exact match) — use it to list the features a fetcher serves. Because the filter only sees the rows `search` returned, a very large object type whose results are server-capped may under-report a fetcher's features; cross-check on the EFP platform if completeness matters. `get` returns one feature's full detail (text mode prints every backend field).

```bash
bytedcli safe efp feature search --keyword sample-feature --object-type item
bytedcli safe efp feature search --object-type item
bytedcli safe efp feature search --object-type item --fetcher sample_fetcher
bytedcli safe efp feature get --feature sample-feature --object-type item
```

## Create

Provide the feature via the structured field options: `--name`, `--object-type` (`item|user|mix`), `--data-type`, `--fetcher` (all required) and the optional `--description`. The creator is recorded from the logged-in bytedcli user. Make sure you have run `bytedcli auth userinfo` at least once so the creator field is populated; otherwise it will be recorded as empty (`auth login --session` alone does not persist the username). Always `--dry-run` first; pass `--yes` to execute. `--env <ppe>` targets a PPE.

```bash
bytedcli safe efp feature create --name sample_feature --object-type item --data-type string --fetcher sample_fetcher --description "sample" --dry-run
bytedcli safe efp feature create --name sample_feature --object-type item --data-type string --fetcher sample_fetcher --yes
```

## Update

Update an existing feature's ark/tcs-packer mappings and collector/ark-packer. Semantics are read-merge-write (only adds, never destroys): `--add-ark-feature` / `--add-tcs-packer` take comma-separated values and append them (existing entries kept; the CLI reads the current lists and resends the full merged list, since the backend replaces lists wholesale). `--set-ark-packer` / `--set-collector` set a single value only when it is currently empty — they refuse to overwrite a different existing value. At least one change flag is required. Update is additive only — there is no flag to remove an ark feature / packer or to clear a collector / ark-packer; do those edits on the EFP platform. Ark feature keys are stored in colon form — EFP normalizes `.` to `:` on write (`a.b.c` is stored as `a:b:c`); pass keys in either form, the CLI canonicalizes before dedup so re-adding an existing key is a no-op. The modifier is recorded from the logged-in bytedcli user. Always `--dry-run` first; pass `--yes` to execute.

```bash
bytedcli safe efp feature update --feature sample-feature --object-type item --add-ark-feature sample.ark.key --dry-run
bytedcli safe efp feature update --feature sample-feature --object-type item --add-ark-feature sample.ark.key --set-collector sample_collector --yes
```

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)

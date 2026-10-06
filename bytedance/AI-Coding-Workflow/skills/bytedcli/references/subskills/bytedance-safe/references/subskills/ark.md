# Safe Ark

Search and create features on the Ark Send Review Platform (`send_review_platform`).

## Prerequisite: safecli plugin

`safe ark` commands are provided by the safecli plugin. Install it once:

```bash
bytedcli self plugin install --repo ies_safety/safecli
```

If `bytedcli safe ark` reports an unknown command, run the install above, then verify with `bytedcli self plugin doctor --name safecli`.

## Authentication

Ark uses the ByteDance SSO web session, not `safe login` (门神/MPSSO). Authenticate once with:

```bash
bytedcli auth login --session
```

The CLI mints the `send_review_platform_sid` session from that BDSSO session automatically. If a command reports `SAFE_AUTH_REQUIRED`, re-run `bytedcli auth login --session`.

## Commands

```bash
bytedcli safe ark feature search [--keyword <kw>] [--content-type <type>] [--feature-scene <scene>] [--parent-id <id>]
bytedcli safe ark feature create --name <key> --chinese-name <name> --feature-type <type> --content-type <type> --parent-id <id> [--description <text>] [--tmp-var] (--dry-run | --yes)
```

## Search

- `--keyword` — match feature key/name; omit to browse the whole subtree.
- `--content-type` — `video|user|comment|mix|bullet-comment` (default `video`).
- `--feature-scene` — `normal|label-strategy` (default `normal`).
- `--parent-id` — browse the subtree under a node.

Results are flattened to leaf features. Text mode shows key, name, type, description, status, creator, create/update time. Status is semanticized from the `rule_manager` IDL (e.g. `online`, `init`, `approve-wait`).

```bash
bytedcli safe ark feature search --keyword sample-feature
bytedcli safe ark feature search --parent-id 25 --content-type video
bytedcli --json safe ark feature search --keyword sample-feature
```

## Create

`create` only supports `--content-type video|user`. `--feature-type` is one of `object|string|number|bool|string_array|number_array`. `--parent-id` is required — a feature is always created under a specific parent node, so first locate the target-level feature with `safe ark feature search` (browse the subtree) and use its ID. `--description <text>` sets the feature description; `--tmp-var` creates it as a temporary variable (default off). The feature creator (`Base.Extra.UserName`) is recorded from the logged-in bytedcli user — run `bytedcli auth userinfo` at least once so it is populated; otherwise it is recorded as empty (`auth login --session` alone does not persist the username). Always preview with `--dry-run` first; pass `--yes` to execute. Add `--env <ppe>` to target a PPE.

```bash
bytedcli safe ark feature search --parent-id 0 --content-type video
bytedcli safe ark feature create --name sample_feature --chinese-name 示例特征 --feature-type string --content-type video --parent-id 25 --dry-run
bytedcli safe ark feature create --name sample_feature --chinese-name 示例特征 --feature-type string --content-type video --parent-id 25 --yes
```

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)

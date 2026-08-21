# Safe Spider

Subcommands under `bytedcli safe spider`:

- `node search` — fuzzy search node `code`/`name` to confirm the exact `node_code` before querying lineage.
- `node get` — query a Spider lineage subtree by center node, rendering upstream (`in`) and downstream (`out`) trees.
- `biz list` — list all Spider business platforms (`code` / `name` / `id`).
- `biz get` — get one business platform's tenants and node types.

## Authentication

Requires Safe authentication. Use the parent `bytedance-safe` login workflow:

```bash
bytedcli auth login --session
bytedcli safe login
```

For agent or non-interactive login flows, see `bytedance-safe` for `safe login --begin` / `--complete`.

## Commands

```bash
# 1) Fuzzy search to confirm the exact node code
bytedcli safe spider node search --biz-code <biz> --tenant-code <tenant> --node-type <type> --keyword <kw>

# 2) Query lineage with the resolved node code
bytedcli safe spider node get --biz-code <biz> --tenant-code <tenant> --node-type <type> --node-code <code> [--in-level <1-8>] [--out-level <1-8>] [--filter-biz-code <code[,code...]>] [--filter-node-type <type[,type...]>]

# Discover business platforms, then drill into one for its tenants and node types
bytedcli safe spider biz list
bytedcli safe spider biz get --biz-code <biz>
```

## Workflow

### Lineage workflow (`node search` → `node get`)

Always run `safe spider node search` before `safe spider node get`, even when the user looks like they already gave a full node code — backend codes often carry hidden prefixes (e.g. real code is `user.name` while the user only said `name`), and querying lineage with a slightly wrong code returns empty results without an error.

1. Run `safe spider node search` with the user-provided keyword (treat it as a fuzzy hint, not as the final node code).
2. Inspect the search result:
   - **0 matches** — surface the result to the user, suggest a different keyword or `--node-type`. Do not call `node get`.
   - **Exactly 1 match** — directly call `safe spider node get` with that match's `code` as `--node-code`. No confirmation needed.
   - **Multiple matches** — list the matches (`type_code/code (name)`) and ask the user which one to query. Wait for confirmation before calling `node get`.
3. Add `--in-level` and/or `--out-level` when the default tree is too large or when you only need a bounded neighborhood.
4. Add `--filter-biz-code` or `--filter-node-type` when only specific returned node businesses or node types should be included.
5. Use text output for human inspection; use `--json` when another tool needs the standard envelope (`data.node` recursive tree for `node get`, or `data.items` array for `node search`).

### Metadata workflow (`biz list` → `biz get`)

Use the `biz` commands when you do not yet know the exact `--biz-code`, `--tenant-code`, or `--node-type` to feed into the lineage workflow — they are the metadata directory behind Spider.

1. Run `safe spider biz list` when the platform itself is unknown (the user describes a platform by name, or you need to confirm the exact `--biz-code` casing). It takes no arguments and returns every platform as `code (name) [id]`.
2. Run `safe spider biz get --biz-code <biz>` to list one platform's tenants and node types. Use it to resolve the right `--tenant-code` or to confirm which `--node-type` values that platform actually supports before calling `node search` / `node get`.
3. `node_types` from `biz get` are node TYPES (e.g. `Feature`, `Rule`), not node instances; to find a concrete node code, switch to `node search`.

## Common Business And Node Codes

Frequent business platform codes:

| Platform | `--biz-code` / `--filter-biz-code` | Typical node types |
| --- | --- | --- |
| Feature platform | `Puzzle` | `Feature`, `ProdUnit`, `DataSource` |
| Machine review | `Hawkpro` | `Workflow`, `Rule` |
| Model platform | `Predict` | `Ability` |
| SafeMind graph platform | `safe_mind` | `Graph` |
| Ark platform | `ark_platform` | `ep_id` |
| Model management | `bernard` | `model_psm` |

Frequent node type meanings:

| Meaning | `--node-type` / `--filter-node-type` | Usually belongs to |
| --- | --- | --- |
| Feature | `Feature` | `Puzzle` |
| Production unit | `ProdUnit` | `Puzzle` |
| Data source | `DataSource` | `Puzzle` |
| Workflow ticket | `Workflow` | `Hawkpro` |
| Machine-review rule | `Rule` | `Hawkpro` |
| Model ability | `Ability` | `Predict` |
| SafeMind graph instance | `Graph` | `safe_mind` |
| EP / model | `ep_id` | `ark_platform` |
| Model PSM | `model_psm` | `bernard` |

When the user asks about model-related lineage but the platform is ambiguous, include the common model businesses in the returned-node filter first: `Predict,safe_mind,ark_platform,bernard`. Narrow the node type with `Ability`, `Graph`, `ep_id`, or `model_psm` only when the intent is clear.

## Examples

```bash
# Fuzzy search by partial code or name
bytedcli safe spider node search \
  --biz-code demo-biz \
  --tenant-code sample-tenant \
  --node-type sample_node_type \
  --keyword name

# Machine-readable search results (flat array)
bytedcli --json safe spider node search \
  --biz-code demo-biz \
  --tenant-code sample-tenant \
  --node-type sample_node_type \
  --keyword name

# Query the default lineage tree for one center node
bytedcli safe spider node get \
  --biz-code demo-biz \
  --tenant-code sample-tenant \
  --node-type sample_node_type \
  --node-code sample_node_code

# Limit both upstream and downstream depth
bytedcli safe spider node get \
  --biz-code demo-biz \
  --tenant-code sample-tenant \
  --node-type sample_node_type \
  --node-code sample_node_code \
  --in-level 2 \
  --out-level 2

# Keep only selected returned node businesses and node types
bytedcli safe spider node get \
  --biz-code demo-biz \
  --tenant-code sample-tenant \
  --node-type sample_node_type \
  --node-code sample_node_code \
  --filter-biz-code demo-filter-biz \
  --filter-node-type sample-node-type

# Find machine-review rules related to a Puzzle feature
bytedcli safe spider node get \
  --biz-code Puzzle \
  --tenant-code sample-tenant \
  --node-type Feature \
  --node-code example.pkg_feat.safe_mind_sample_feature_outputs \
  --filter-biz-code Hawkpro \
  --filter-node-type Rule

# Find model-related downstream nodes when the model platform is ambiguous
bytedcli safe spider node get \
  --biz-code Puzzle \
  --tenant-code sample-tenant \
  --node-type Feature \
  --node-code example.pkg_feat.sample_feature \
  --filter-biz-code Predict,safe_mind,ark_platform,bernard

# Machine-readable recursive tree
bytedcli --json safe spider node get \
  --biz-code demo-biz \
  --tenant-code sample-tenant \
  --node-type sample_node_type \
  --node-code sample_node_code

# List all business platforms to confirm the exact --biz-code
bytedcli safe spider biz list

# Machine-readable platform list
bytedcli --json safe spider biz list

# Inspect one platform's tenants and node types
bytedcli safe spider biz get --biz-code demo-biz

# Machine-readable platform detail
bytedcli --json safe spider biz get --biz-code demo-biz
```

## Options

### `safe spider node search`

- `--biz-code <code>` — Business platform code. Resolved through Spider business tree metadata.
- `--tenant-code <code>` — Tenant code under the business platform. Resolved through Spider business tree metadata or tenant list metadata.
- `--node-type <type>` — Node type code. Resolved to a Spider type ID via `GetNodeList` (`scope=1`) before calling `SearchLineageNode`.
- `--keyword <keyword>` — Fuzzy keyword. The backend matches it against both node `code` and `name`.

### `safe spider node get`

- `--biz-code <code>` — Business platform code. The CLI resolves it through Spider business tree metadata before querying lineage.
- `--tenant-code <code>` — Tenant code under the business platform. The CLI resolves it through Spider business tree metadata or tenant list metadata.
- `--node-type <type>` — Center node type code.
- `--node-code <code>` — Center node code.
- `--in-level <n>` — Maximum upstream levels to traverse. Optional; when provided, it must be an integer from `1` to `8`.
- `--out-level <n>` — Maximum downstream levels to traverse. Optional; when provided, it must be an integer from `1` to `8`.
- `--filter-biz-code <code[,code...]>` — Filter returned lineage nodes by business platform code. Comma-separated values and repeated flags are both accepted. Matching is case-insensitive, and the CLI resolves codes to Spider business IDs before calling GetLineage.
- `--filter-node-type <type[,type...]>` — Filter returned lineage nodes by node type code. Comma-separated values and repeated flags are both accepted. Matching is case-insensitive against `GetNodeList` item `type`, and the CLI resolves type codes to Spider node type IDs through `GetNodeList` with `scope=1` before calling GetLineage. When `--filter-biz-code` is also provided, node type lookup is scoped to those filtered businesses; otherwise it scans all Spider businesses.

### `safe spider biz list`

No options. Lists every Spider business platform.

### `safe spider biz get`

- `--biz-code <code>` — Business platform code. Resolved through Spider business tree metadata to fetch its full tenant list and node type list.

## Output

### `safe spider node search`

Text mode prints:

- `Search:` — node type, keyword, and resolved business / tenant IDs
- `Matches:` — count of returned items
- One line per match formatted as `type_code/code (name)`

JSON mode returns the standard envelope; the matched node list is at `data.items` as `[{ code, name, type_code }, ...]` and `data.total` is the count of returned items.

### `safe spider node get`

Text mode prints:

- `Node:` — selected center node and resolved business / tenant IDs
- `Lineage:` — compact node/edge counts and observed upstream/downstream depth
- A recursive tree using `in` for upstream dependencies and `out` for downstream dependents

JSON mode returns the standard envelope:

- `data.node` — recursive center-node tree
- Each tree node may include `code`, `name`, `type_code`, `depth`, `attributes`, `in`, and `out`
- `data.summary` — `{ node_count, edge_count, in_depth, out_depth }`, mirroring the `Lineage:` line in text mode

### `safe spider biz list`

Text mode prints `Business platforms: N` followed by one line per platform formatted as `code (name) [id]`.

JSON mode returns the standard envelope; the platform list is at `data.items` as `[{ code, name, id }, ...]` and `data.total` is the count.

### `safe spider biz get`

Text mode prints:

- `Biz:` — `code (name) [id]` for the selected platform
- `Tenants (N):` — one line per tenant formatted as `code (name) [id]`
- `Node types (N):` — one line per node TYPE formatted as `type (type_name) [id]`

JSON mode returns the standard envelope under `data`:

- `data.biz` — `{ id, code, name }`
- `data.tenants` — `[{ id, code, name, creator, operator, create_time, update_time }, ...]` (from the dedicated tenant endpoint, more complete than the biz tree children)
- `data.node_types` — `[{ id, type, type_name }, ...]` — node TYPES (e.g. Feature, Rule), not node instances
- `data.summary` — `{ tenant_count, node_type_count }`

## Agent Guidance

- **Always search before get.** Run `safe spider node search` first even if the user appears to give a full node code — backend codes commonly carry hidden prefixes (e.g. real code `user.name` vs user-said `name`) and a slightly wrong `--node-code` returns an empty lineage without raising an error.
- After `node search`, branch on result count:
  - 1 match → call `node get` directly with that `code`, no confirmation.
  - >1 match → present the candidates (`type_code/code (name)`) and ask the user which one to query before calling `node get`.
  - 0 match → stop and ask the user to refine the keyword or `--node-type`.
- The four selectors `--biz-code`, `--tenant-code`, `--node-type` are still required for `node search`; only `--node-code` is replaced by `--keyword`.
- Keep `--in-level` and `--out-level` small when the user is doing exploratory troubleshooting. The CLI enforces `[1, 8]` for both flags.
- Use `--filter-biz-code` and `--filter-node-type` for returned-node filters, not for selecting the center node. The center node is still controlled by `--biz-code`, `--tenant-code`, `--node-type`, and `--node-code`.
- For "feature related rules" intent, prefer center `--biz-code Puzzle --node-type Feature` and returned-node filters `--filter-biz-code Hawkpro --filter-node-type Rule`.
- For vague model lineage intent, load model-related businesses together with `--filter-biz-code Predict,safe_mind,ark_platform,bernard`; add `--filter-node-type Ability`, `Graph`, `ep_id`, or `model_psm` only when the user specified the platform or node class.
- If any filter code or node type is unknown, the CLI raises `SAFE_SPIDER_INPUT_ERROR` instead of silently dropping the filter.
- Prefer `--json` when you need to summarize or post-process the tree; text mode is intended for direct reading.
- **Use `biz list` / `biz get` as the metadata directory, not for lineage.** When the user names a platform but you are unsure of the exact `--biz-code`, run `biz list` first; when you need the right `--tenant-code` or to confirm a platform's supported `--node-type` values, run `biz get --biz-code <biz>` before `node search` / `node get`.
- `biz list` takes no arguments; do not invent filters for it. `biz get` requires only `--biz-code`.
- Remember `biz get`'s `node_types` are node TYPES (e.g. `Feature`, `Rule`), not concrete nodes — to resolve a specific node code, fall through to `node search`.
- Authentication errors should be handled with `bytedcli safe login`, not a separate Spider login command.

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)

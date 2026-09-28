# Safe EVA

EVA (Evaluation) platform commands for model management, feature queries, prompt queries, and evaluation workflows.

## Prerequisites

Requires Safe authentication. If not already logged in:

```bash
bytedcli safe login
```

## Commands

### Model Management

```bash
# Create a new EVA model (time range is auto-fetched from server)
bytedcli safe eva model create --name <name> --config-key <key> --training-positive-samples <csv> --test-positive-samples <csv> [--training-negative-samples <csv>] [--prompt-type <type>] [--model-type <type>] [--input-type <type>] [--admin-list <users...>]

# List EVA models (use --ids for permission details)
bytedcli safe eva model list --config-key <key> [--ids <ids...>] [--keyword <keyword>] [--only-myself] [--page <n>] [--page-size <n>]
```

### Feature & Prompt Queries

```bash
# List features for a model
bytedcli safe eva feature list --model-id <id> --config-key <key> [--status <status...>] [--page <n>] [--page-size <n>]

# List prompts for a model (default page_size: 10000)
bytedcli safe eva prompt list --model-id <id> --config-key <key> [--prompt-type <type>] [--page <n>] [--page-size <n>] [--cursor <n>]

# Test a prompt with inline object IDs or a CSV file (max 10000 IDs)
bytedcli safe eva prompt test --config-key <key> --id <prompt-id> (--object-ids <ids...> | --object-ids-file <csv>) [--prompt-type <type>] [--input-type <type>]
```

### Feature Management

```bash
# Create an EVA feature from evaluation results
bytedcli safe eva feature create --config-key <key> --evaluation-id <id> --prompt-id <id> --feature-code <code> --feature-name <name> --threshold <value> [--prompt-type <type>]

# Update an existing EVA feature threshold and name
bytedcli safe eva feature update --config-key <key> --id <id> --model-id <id> --threshold <value> [--new-name <name>] [--prompt-id <id> --evaluation-id <id>]
```

### Prompt Re-training

```bash
# Create a new prompt version for re-training
bytedcli safe eva prompt create --config-key <key> --model-id <id> --training-positive-samples <csv> --test-positive-samples <csv> [--training-negative-samples <csv>] [--model-type <type>] [--input-type <type>] [--training-method <method>]
```

### Evaluations

```bash
# Search evaluations by prompt
bytedcli safe eva evaluation list --prompt-id <id> --config-key <key> [--prompt-type <type>]

# Query evaluation details
bytedcli safe eva evaluation get --id <id> --config-key <key> [--prompt-type <type>]

# Get evaluation parameters by threshold, TPR, or hit rate
bytedcli safe eva evaluation get-params --id <id> --config-key <key> (--threshold <value> | --tpr <value> | --hit-rate <value>)

# Create a new evaluation (re-evaluate)
bytedcli safe eva evaluation create --config-key <key> --prompt-id <id> [--prompt-type <type>] [--input-type <type>] --test-positive-samples <csv>
```

### Scene (Config Key) Queries

```bash
# List available EVA scenes (config keys)
bytedcli safe eva scene list [--keyword <keyword>]
```

## Options

- `--config-key <key>` — Config key. Commands marked with `--config-key <key>` require an explicit value; commands marked with `[--config-key <key>]` default to `live_review_general`.
- `--prompt-type <type>` — Prompt type: `zeroshot` or `fewshot` (default: `fewshot`)
- `--model-type <type>` — Model type: `uniclip-beta`, `uniclip`, `audit-clip-with-user-seq`, `lltrmk1`, `live-audio-bge`, `live-embedding-mm` (default: `uniclip`). See ID mapping table below.
- `--input-type <type>` — Input type: `object-id`, `webcast-object-id`, `live-review-general-object-id`, `text-object-id`, `aigc-object-id` (default: `object-id`). See ID mapping table below.
- `--training-method <method>` — Training method: `LR`, `XGBoost`, or `MLP` (default: `LR`)
- `--keyword <keyword>` — Fuzzy search by name (model list, scene list)
- `--only-myself` — Only show models managed by the current user (model list)
- `--prompt-id <id>` / `--evaluation-id <id>` — Must be provided together in `feature update` to use a specific prompt/evaluation instead of the feature's current one
- `--object-ids <ids...>` / `--object-ids-file <csv>` — Exactly one is required for `prompt test`
- `--page <n>` / `--page-size <n>` — Pagination parameters
- `--cursor <n>` — Pagination cursor (prompt list only)
- `--threshold <value>` / `--tpr <value>` / `--hit-rate <value>` — Exactly one is required for `evaluation get-params`
- `-j` / `--json` — JSON output mode

## Notes

- All commands support JSON output mode with `--json`
- Authentication uses the same cookie/session as other safe commands
- `--prompt-type` defaults to `fewshot`
- Commands marked with `--config-key <key>` require an explicit config key; commands marked with `[--config-key <key>]` default to `live_review_general` when omitted
- `prompt list` uses a default `--page-size` of 10000 (vs. the standard 20) to return all prompts by default
- `model create` automatically fetches the evaluation time range from the server before creating the model; the time range is determined by `--config-key`, `--prompt-type`, and `--model-type`
- `prompt create` creates a new prompt version for re-training; sample files are CSV with one objectID per line; `prompt_type` is automatically inherited from the target model (no `--prompt-type` option — the service queries the model list to resolve it)
- `evaluation create` triggers a re-evaluation with new test samples
- `feature update` with `--prompt-id` and `--evaluation-id` uses the specified prompt/evaluation for metrics instead of the feature's current values; both options must be provided together
- `scene list` returns all scenes in a single response (no pagination); keyword filtering is performed client-side; each scene entry includes available model types and input types; input types are available at the scene level and not tied to specific model types

## ID Mapping

`--model-type` and `--input-type` accept semantic names only (not numeric IDs). The mapping below is for reference.

| `--model-type` name | Backend ID |
|---|---|
| `uniclip-beta` | 11 |
| `uniclip` | 13 |
| `audit-clip-with-user-seq` | 32 |
| `lltrmk1` | 53 |
| `live-audio-bge` | 67 |
| `live-embedding-mm` | 68 |

| `--input-type` name | Backend ID |
|---|---|
| `object-id` | 1 |
| `webcast-object-id` | 6 |
| `live-review-general-object-id` | 8 |
| `text-object-id` | 12 |
| `aigc-object-id` | 14 |

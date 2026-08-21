# Safe Hawk

Query Hawk platform metadata and ops records: list services, scopes, and scenes; list ops entries for an object; get ops detail for a specific log entry.

## Plugin source

The `safe hawk ...` commands are provided by the **safecli** plugin (repo `ies_safety/safecli`), not the bytedcli core binary. The plugin manifest requires bytedcli `>=0.88.0`. Install the plugin when you need Hawk commands:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

If `safe hawk` reports "unknown command", the safecli plugin is not installed or is disabled.

## Authentication

Requires Safe authentication. A single `safe login` covers `safe.bytedance.net` and `hawk.bytedance.net` via shared MPSSO cookies — no separate hawk login is needed.

```bash
bytedcli auth login --session
bytedcli safe login
```

## Commands

### service list

List all available Hawk service names.

```bash
bytedcli safe hawk service list
bytedcli --json safe hawk service list
```

### scope list

List Hawk scopes for a specific service.

```bash
bytedcli safe hawk scope list --service demo-service
bytedcli --json safe hawk scope list --service demo-service
```

### scene list

List Hawk scenes with optional filters.

```bash
# List all scenes
bytedcli safe hawk scene list

# Filter by service
bytedcli safe hawk scene list --service demo-service

# Filter by scope
bytedcli safe hawk scene list --scope demo-scope

# Filter by keyword (matches scene key or name)
bytedcli safe hawk scene list --keyword demo-scene

# Combine filters
bytedcli safe hawk scene list --service demo-service --scope demo-scope --keyword demo

# JSON output
bytedcli --json safe hawk scene list --service demo-service
```

### ops list

List Hawk ops entries for an object. Requires `--object-id` and `--scene`.

```bash
# Basic query (default: last 1 day)
bytedcli safe hawk ops list --object-id 12345 --scene demo-scene

# With time range (relative)
bytedcli safe hawk ops list --object-id 12345 --scene demo-scene --start "1h ago"

# With time range (absolute)
bytedcli safe hawk ops list --object-id 12345 --scene demo-scene --start "2026-06-01" --end "2026-06-08"

# Filter by scope and services
bytedcli safe hawk ops list --object-id 12345 --scene demo-scene --scope demo-scope --services svc-a,svc-b

# JSON output
bytedcli --json safe hawk ops list --object-id 12345 --scene demo-scene
```

### ops get

Get Hawk ops detail info for a specific log entry. Requires `--object-id`, `--scene`, `--log-id`, `--unique-id`, and `--service`.

```bash
bytedcli safe hawk ops get --object-id 12345 --scene demo-scene --log-id log-001 --unique-id rand-001 --service demo-service

# JSON output
bytedcli --json safe hawk ops get --object-id 12345 --scene demo-scene --log-id log-001 --unique-id rand-001 --service demo-service
```

## Options

### scene list

| Option                | Default | Description                                      |
| --------------------- | ------- | ------------------------------------------------ |
| `--service <name>`    | —       | Filter by service name                           |
| `--scope <scope>`     | —       | Filter by scope                                  |
| `--keyword <keyword>` | —       | Filter scenes whose key or name contains keyword |

### scope list

| Option             | Default    | Description  |
| ------------------ | ---------- | ------------ |
| `--service <name>` | (required) | Service name |

### ops list

| Option                  | Default    | Description                                                                |
| ----------------------- | ---------- | -------------------------------------------------------------------------- |
| `--object-id <id>`      | (required) | Object ID                                                                  |
| `--scene <scene>`       | (required) | Business scene                                                             |
| `--scope <scope>`       | —          | Business scope (tenant)                                                    |
| `--services <services>` | —          | Comma-separated service names (plural; multi-value for filtering ops list) |
| `--start <start>`       | —          | Start time (Unix seconds, date string, or relative like `1h ago`)          |
| `--end <end>`           | —          | End time (same format as `--start`)                                        |

> **Note:** `ops list` uses `--services` (plural, comma-separated multi-value) for filtering by multiple service names. Other commands (`scope list`, `ops get`) use `--service` (singular, single-value). This reflects the different API semantics: ops list accepts multiple services, while other endpoints expect a single service name.

### ops get

| Option             | Default    | Description         |
| ------------------ | ---------- | ------------------- |
| `--object-id <id>` | (required) | Object ID           |
| `--scene <scene>`  | (required) | Business scene name |
| `--log-id <id>`    | (required) | Log ID              |
| `--unique-id <id>` | (required) | Unique ID (rand_id) |
| `--service <name>` | (required) | Service name        |

## Output

### service list / scope list

Text mode shows a table with service/scope names and total count. JSON mode returns `{ services: [...], total: N }` or `{ scopes: [...], total: N }`.

### scene list

Text mode shows a table with SERVICE, SCOPE, SCENE_KEY, SCENE_NAME columns. JSON mode returns `{ scenes: [...], total: N }`.

### ops list

Text mode shows a table with TIME, LOG_ID, SERVICE, SCENE, OBJECT_ID, UNIQUE_ID, PSM, SUCCESS, FAIL_RETRY, TIMEOUT_RETRY columns. JSON mode returns `{ items: [...], total: N, page: 1, page_size: N }`.

**Note:** `ops list` does not support pagination. The API returns all matching entries within the specified time window. Use `--start` and `--end` to narrow the time range if the result set is too large.

### ops get

Text mode outputs the deserialized JSON data as formatted text. JSON mode returns the data object directly.

## Common Patterns

**Discovering available services and scenes:**

```bash
# Step 1: List services
bytedcli safe hawk service list
# Step 2: List scopes for a service
bytedcli safe hawk scope list --service demo-service
# Step 3: List scenes with filters
bytedcli safe hawk scene list --service demo-service --scope demo-scope
```

**Investigating ops records for an object:**

```bash
# Step 1: List recent ops entries
bytedcli safe hawk ops list --object-id 12345 --scene demo-scene
# Step 2: Get detail for a specific log entry
bytedcli safe hawk ops get --object-id 12345 --scene demo-scene --log-id log-001 --unique-id rand-001 --service demo-service
```

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)

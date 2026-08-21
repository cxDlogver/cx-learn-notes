---
id: bytedance-pontus
name: bytedance-pontus
description: "Query and manage DataLeap Pontus cost and asset storage data via bytedcli. Use this skill when the user mentions Pontus, Dataleap cost, storage growth, asset management, data storage, or when asking to list/query tables and their physical sizes/growth in specific databases."
version: 0.1.0
type: plugin
---
# bytedance-pontus

Query and manage DataLeap Pontus cost and asset storage data.

## Description
Search, explore, and analyze Pontus cost and asset management data via `bytedcli pontus`.

## Agent Guidance
- The main command for listing data storages is `bytedcli pontus data-storage list`.
- Users might specify a database by its name (e.g., `videoarch_mde`). The command automatically resolves the database name to its internal database ID, so the agent can pass the string name directly to `--database`.
- When users ask to sort by storage growth over a specific period (7, 14, 60, or 365 days), use the `--sort-growth <days>` option.
- Default sort order is descending (`desc`), but can be overridden with `--sort-order asc`.
- By default, `Physical Size` and `Growth` metrics are formatted in PB (Petabytes) in the terminal output. If JSON mode (`-j`) is used, the metrics will remain in bytes for automated processing.

## Examples

### List Data Storages
```bash
# Query the first 20 Hive tables in the 'videoarch_mde' database
bytedcli pontus data-storage list --database videoarch_mde --storage-type Hive --page 1 --page-size 20

# Query tables sorted by 7-day storage growth in descending order
bytedcli pontus data-storage list --database videoarch_mde --storage-type Hive --sort-growth 7 --page 1 --page-size 20

# Query tables belonging to a specific owner and sort by 365-day storage growth
bytedcli pontus data-storage list --database videoarch_mde --owner zengyuxing --sort-growth 365
```

## References

- `../../invocation.md`


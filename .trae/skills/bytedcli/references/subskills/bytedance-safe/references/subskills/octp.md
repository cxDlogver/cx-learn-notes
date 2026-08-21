# Safe OCTP

Query OCTP trace events for one Safe entity.

## Command

```bash
bytedcli safe octp event list --entity-id <entity-id> [--conditions <json>]
```

## Workflow

1. Ensure Safe authentication exists: `bytedcli safe login`
2. Run `bytedcli safe octp event list --entity-id <entity-id>`
3. Use text output for a compact event timeline
4. Use `--json` when another tool needs the full `info_list`, `tags`, `assembly_events`, or `conclusion` payload

## Examples

```bash
bytedcli safe octp event list --entity-id <entity-id>

bytedcli --json safe octp event list --entity-id <entity-id>

bytedcli safe octp event list --entity-id <entity-id> --conditions "[]"
```

## Output

Text mode shows a compact table with:

- event time
- event title
- reported event key
- path ID
- PSM
- log ID

JSON mode returns the complete OCTP aggregation:

- `entity_info`
- `event_count`
- `events[*].info_list`
- `events[*].tags`
- `events[*].assembly_events`
- `events[*].conclusion`

## References

- [invocation.md](../invocation.md)
- [troubleshooting.md](../troubleshooting.md)

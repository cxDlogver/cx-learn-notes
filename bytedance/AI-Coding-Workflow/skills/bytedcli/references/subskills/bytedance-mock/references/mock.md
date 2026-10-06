# ByteMock CLI Quick Reference

## Rule Management

```bash
# List rules
bytedcli mock rule list --namespace <ns> [--psm <psm>] [--path <path> --http-method GET] [--method <rpcMethod>] [--status all|on|off|1|0]

# Get rule detail
bytedcli mock rule get --id <ruleId>

# Create rule
bytedcli mock rule create \
  --namespace <ns> \
  --callee-psm <psm> \
  --method <method> \
  --name <name> \
  --mock-data '<json>' \        # or --mock-data-file <path>
  [--caller-psm <psm>] \       # default: * (all callers)
  [--protocol thrift|http] \    # default: thrift
  [--status 1|0] \              # default: 1 (enabled)
  [--priority <n>] \            # default: 0
  [--delay <ms>] \              # default: 0
  [--path <path>] \             # HTTP interface path when --protocol http
  [--filter '<json>'] \         # request filter
  [--description '<text>'] \
  [--expire-time '<iso8601>']

# Update rule (覆盖式, 仅传需要更新的字段)
bytedcli mock rule update --id <ruleId> [--mock-data '<json>'] [--name <name>] [--status 1|0]

# Enable / Disable / Delete
bytedcli mock rule enable --id <ruleId>
bytedcli mock rule disable --id <ruleId>
bytedcli mock rule delete --id <ruleId>
```

Notes:

- `mock rule list --psm` is the canonical callee PSM filter. `--callee-psm` remains a compatibility alias.
- For HTTP interface rules, pass `--path` together with `--http-method` when listing so the server filters the exact endpoint.
- Creating HTTP rules through `--protocol http --method GET --path <path>` also writes the HTTP routing fields needed by ByteMock (`http_method`, JSON encoding, and status code 200). When `--status 0` is requested, the CLI creates then disables the rule so it does not become effective.

## Namespace Management

```bash
bytedcli mock namespace list [--namespace <name>] [--keyword <kw>]
bytedcli mock namespace create --name <name> [--description '<text>']
```

## Service Management

```bash
bytedcli mock service list [--namespace <ns>] [--psm <psm>] [--keyword <kw>]
bytedcli mock service create --psm <psm> --namespace <ns> [--protocol thrift|http]
bytedcli mock service sync --psm <psm>
bytedcli mock service prepare --psm <psm1> [--psm <psm2>] [--expired-at '<datetime>']
```

## Dyeing (Traffic Routing)

```bash
# List dyeing rules
bytedcli mock dyeing list --namespace <ns> [--callee <psm>]

# Create/Update dyeing rule
bytedcli mock dyeing update \
  --callee <psm> \
  --caller <psm> \
  --method <method> \           # * for all methods
  --dyeing "ENV:<lane_name>" \
  [--type thrift|http] \        # default: thrift
  [--expired-at '<iso8601>'] \  # default: 7 days
  [--callee-cluster <cluster>] \
  [--caller-cluster <cluster>]

# Enable / Disable
bytedcli mock dyeing enable --id <dyeingId>
bytedcli mock dyeing disable --id <dyeingId>
```

## Domain Mapping

| `--site`  | Mock Platform Domain           |
| --------- | ------------------------------ |
| `prod`    | bytemock.bytedance.net         |
| `boe`     | bytemock-boe.bytedance.net     |
| `boei18n` | bytemock-boei18n.bytedance.net |
| `i18n-tt` | bytemock-i18n.bytedance.net    |
| `i18n-bd` | bytemock-i18n.bytedance.net    |

## Mock Setup Workflow

```bash
# 1. Create namespace (name = BOE lane name for env-mode routing)
bytedcli mock namespace create --name boe_my_lane

# 2. Relate downstream service
bytedcli mock service create --psm downstream.service --namespace boe_my_lane --protocol thrift

# 3. Create mock rule
bytedcli mock rule create --namespace boe_my_lane --callee-psm downstream.service \
  --method TargetMethod --name "my-mock" --mock-data '{"field":"value"}'

# 4. Create dyeing rule (traffic routing)
bytedcli mock dyeing update --callee downstream.service --caller my.service \
  --method TargetMethod --dyeing "ENV:boe_my_lane" --type thrift

# 5. Preload service IDL
bytedcli mock service prepare --psm downstream.service
```

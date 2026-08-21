# DECC (Data Exchange & Cross-region Compute) CLI Reference

DECC provides cross-region data exchange capabilities. The CLI supports create/update OG tagging, creating HDFS channels, registering data (tables), and applying for permissions.
It also supports inspecting DECC/OG ticket list, detail, and comments.

Authentication: all DECC commands use ByteCloud JWT via `--site i18n-tt`.

## Commands

### gateway service list

List or search DECC Gateway services(psm), typically to find the service entity ID for the psm that owns the api you want to tag.

```bash
bytedcli --site i18n-tt decc gateway service list [options]
```

**Options:**

- `--name <name>` — Filter by psm
- `--region <regions>` — Comma-separated compliance regions: `EU`, `US`, `EU,US`, or `US,EU`
- `--owners <owners>` — Comma-separated owner usernames; values are OR filters
- `--source-type <sourceType>` — Source type: `Web`, `Log`, `Metric`, or `CommonHeader`
- `--page <n>` — Page number, 1-based (default: `1`)
- `--page-size <n>` — Page size (default: `20`)

**Examples:**

```bash
# List services
bytedcli --site i18n-tt decc gateway service list

# Search by name
bytedcli --site i18n-tt decc gateway service list \
  --name demo.api_service

# Filter by region, owners, and source type
bytedcli --site i18n-tt decc gateway service list \
  --region EU,US \
  --owners demo.user,sample.user \
  --source-type CommonHeader
```

### gateway endpoint list

List the API endpoints under a DECC Gateway service entity (PSM).

```bash
bytedcli --site i18n-tt decc gateway endpoint list [options]
```

**Options:**

- `--entity-id <entityId>` (required) — DECC Gateway service entity ID
- `--stage <stage>` (required) — Endpoint stage: `approved` or `draft`
- `--path <path>` — Filter by HTTP path
- `--page <n>` — Page number, 1-based (default: `1`)
- `--page-size <n>` — Page size (default: `20`)

**Examples:**

```bash
# List draft endpoints for a service entity by HTTP path
bytedcli --site i18n-tt decc gateway endpoint list \
  --entity-id demo-service-entity-id \
  --stage draft \
  --path /demo/api \
  --page 1 \
  --page-size 15
```

### gateway endpoint get

Get a DECC Gateway API endpoint, including its ID, description, and tagged fields.

```bash
bytedcli --site i18n-tt decc gateway endpoint get [options]
```

**Options:**

- `--id <id>` (required) — DECC Gateway endpoint ID
- `--stage <stage>` (required) — Endpoint stage: `approved` or `draft`

**Examples:**

```bash
# Get a draft endpoint
bytedcli --site i18n-tt decc gateway endpoint get \
  --id demo-endpoint-id \
  --stage draft
```

### gateway endpoint create

Create a DECC Gateway endpoint draft. When `--owners` is omitted, the operator is used as the owner.

```bash
bytedcli --site i18n-tt decc gateway endpoint create [options]
```

**Options:**

- `--entity-id <entityId>` (required) — DECC Gateway service entity ID
- `--path <path>` (required) — HTTP path
- `--method <method>` (required) — HTTP method
- `--description <description>` (required) — Endpoint description
- `--owners <owners>` — Comma-separated owner usernames; defaults to the operator

**Examples:**

```bash
# Create a draft endpoint owned by the current operator
bytedcli --site i18n-tt decc gateway endpoint create \
  --entity-id demo-service-entity-id \
  --path /demo/api \
  --method GET \
  --description "demo endpoint"

# Create a draft endpoint with explicit owners
bytedcli --site i18n-tt decc gateway endpoint create \
  --entity-id demo-service-entity-id \
  --path /demo/api \
  --method POST \
  --description "demo endpoint" \
  --owners demo.user,sample.user
```

### gateway endpoint update

Update the details of a DECC Gateway API endpoint draft, including tagging its fields.

```bash
bytedcli --site i18n-tt decc gateway endpoint update [options]
```

**Options:**

- `--draft-id <draftId>` (required) — DECC Gateway endpoint draft ID
- `--description <description>` — Endpoint description; defaults to the current draft detail description when omitted
- `--query-file <path>` — Query params field array file
- `--path-file <path>` — Path params field array file
- `--req-headers-file <path>` — Request headers field array file
- `--req-body-file <path>` — Request body field array file
- `--resp-headers-file <path>` — Response headers field array file
- `--resp-body-file <path>` — Response body field array file

The field-array files contain JSON arrays whose entries use `fieldName`, `type`, optional `description`, optional `compliance_tag`, and optional nested `children`. The CLI converts arrays to the map shape expected by DECC Gateway.

**Examples:**

```bash
# Update draft description and request schema from local JSON files
bytedcli --site i18n-tt decc gateway endpoint update \
  --draft-id demo-endpoint-id \
  --description "updated demo endpoint" \
  --req-headers-file req_headers.json \
  --req-body-file req_body.json

# Update response schema from local JSON files
bytedcli --site i18n-tt decc gateway endpoint update \
  --draft-id demo-endpoint-id \
  --resp-headers-file resp_headers.json \
  --resp-body-file resp_body.json
```

### hdfs-channel create

Create a new DECC HDFS channel (endpoint).

```bash
bytedcli --site i18n-tt decc hdfs-channel create [options]
```

**Options:**

- `--name <name>` (required) — Channel name (database name)
- `--description <description>` (required) — Channel description
- `--owners <owners>` (required) — Comma-separated owner usernames
- `--vgeo-list <vgeoList>` (required) — Comma-separated vGeo regions: `ROW-TT`, `NonTT`, `US`, `EU`, `CN`
- `--scenario <scenario>` — Comma-separated scenario types (default: `4` = CN_CROSS_BORDER)

**Examples:**

```bash
# Create a channel with CN vGeo
bytedcli --site i18n-tt decc hdfs-channel create \
  --name demo-database \
  --description "demo channel for cross-region exchange" \
  --owners demo.user \
  --vgeo-list CN \
  --scenario 4

# Create a channel with multiple vGeos
bytedcli --site i18n-tt decc hdfs-channel create \
  --name demo-multi-region \
  --description "multi-region channel" \
  --owners demo.user1,demo.user2 \
  --vgeo-list CN,US,EU \
  --scenario 3
```

### hdfs-data create

Register a new DECC HDFS data (table) under a channel.

```bash
bytedcli --site i18n-tt decc hdfs-data create [options]
```

**Options:**

- `--channel-id <channelId>` (required) — DECC channel/endpoint ID
- `--name <name>` (required) — Data name (table name)
- `--owners <owners>` (required) — Comma-separated owner usernames
- `--region <region>` (required) — Source DECC region
- `--scenario <scenario>` — Comma-separated scenario types (default: `3` = CLOVER)

**Supported regions:** `China-North`, `Singapore-Central`, `EU-TTP2`, `US-EastRed`, `EU-Compliance2`, `US-TTP`, `Asia-SouthEastBD`, `Asia_Saas`, `Singapore_Saas`, `Asia_CIS`

**Examples:**

```bash
# Register a table under a channel
bytedcli --site i18n-tt decc hdfs-data create \
  --channel-id demo-channel-id \
  --name demo_table_name \
  --owners demo.user \
  --region EU-TTP2

# Register with explicit scenario
bytedcli --site i18n-tt decc hdfs-data create \
  --channel-id demo-channel-id \
  --name demo_another_table \
  --owners demo.user1,demo.user2 \
  --region US-TTP \
  --scenario 2
```

### des-rpc annotation-plan get

Check BAM latest RPC IDL for a service and print the DECC Data Version requests needed to refresh DES-RPC annotations. This command does not write DECC by itself.

```bash
bytedcli --site i18n-tt decc des-rpc annotation-plan get [options]
```

**Options:**

- `--psm <psm>` (required) — BAM/PSM service name, e.g. `example.demo.service`
- `--rpc-method <rpcMethod>` — RPC method name to filter
- `--bam-version <version>` — BAM version to load, or `latest` (default: `latest`)
- `--cluster <cluster>` — BAM cluster (default: `default`)
- `--data-id <dataId>` — DECC Method/Data ID, if already known
- `--version <version>` — DECC Data Version number, if already known
- `--endpoint-limit <n>` — Maximum BAM RPC methods to show (default: `20`)

**Examples:**

```bash
# Verify example.demo.service is on the latest BAM IDL and inspect candidate RPC methods
bytedcli --site i18n-tt decc des-rpc annotation-plan get \
  --psm example.demo.service \
  --bam-version latest

# Print DECC load-idl / parse-idl requests for an existing draft Data Version
bytedcli --site i18n-tt decc des-rpc annotation-plan get \
  --psm example.demo.service \
  --rpc-method DemoMethod \
  --bam-version latest \
  --data-id demo-data-id \
  --version 12
```

### des-rpc direct call

Call DECC frontend/direct APIs with ByteCloud JWT. This is useful when DES-RPC data has been migrated to DECCv3 and the OpenAPI path is unavailable, or when validating IDL load/parse requests.

```bash
bytedcli --site i18n-tt decc des-rpc direct call [options]
```

**Options:**

- `--method <method>` — `GET` or `POST` (default: `GET`)
- `--path <path>` — DECC direct API path, for example `/api/v2/schema/idl/load`
- `--query <json>` / `--query-file <path>` — query params for GET-style APIs
- `--body <json>` / `--body-file <path>` — JSON request body for POST APIs
- `--timeout-ms <n>` — HTTP timeout in milliseconds
- `--dry-run` — print the direct API request without sending it

**Examples:**

```bash
bytedcli --site i18n-tt decc des-rpc direct call \
  --path /api/v2/schema/idl/load \
  --query '{"gateway":"RPC","endpoint_id":"demo-endpoint-id","data_name":"DemoMethod","is_serialized_data":false}'

bytedcli --site i18n-tt decc des-rpc direct call \
  --method POST \
  --path /api/v2/schema/idl/parse \
  --body-file ./decc-parse-body.json
```

### des-rpc channel create

Create a DECC DES-RPC Channel for a callee service. DES-RPC uses `gateway=2`.

```bash
bytedcli --site i18n-tt decc des-rpc channel create [options]
```

**Options:**

- `--name <name>` (required) — Callee service/channel name
- `--owners <owners>` (required) — Comma-separated owner usernames
- `--description <description>` — Channel description
- `--domain-psm-list <psmList>` — Comma-separated `domain_psm_list` values; defaults to `--name`
- `--scenario <scenario>` — Comma-separated DECC scenario list (default: `4`)
- `--dry-run` — Print the OpenAPI request without sending it

### des-rpc data create

Create a DECC DES-RPC Data object for an RPC method under a DES-RPC Channel. Per DECC DES-RPC OpenAPI requirements, this command does not send `need_submit_data_version` or `data_version`.

```bash
bytedcli --site i18n-tt decc des-rpc data create [options]
```

**Options:**

- `--channel-id <channelId>` (required) — DECC DES-RPC Channel ID
- `--name <name>` (required) — RPC method name
- `--owners <owners>` (required) — Comma-separated owner usernames
- `--scenario <scenario>` — Comma-separated DECC scenario list (default: `4`)
- `--dry-run` — Print the OpenAPI request without sending it

### des-rpc data-version

Operate DES-RPC Data Version drafts. `create` resolves the latest Data Version whose state contains `applied` via OpenAPI detail first, falling back to DECC direct `id_list`, and uses that version as `upstream_version`. Pass `--applied-region US` or `--applied-region EU` when the base version must be selected from a specific region's applied state. Use `load-idl` to load BAM IDL, `parse-idl` to derive `json_schema`, `update` to write field annotations, and `submit` to send the version for approval.

```bash
bytedcli --site i18n-tt decc des-rpc data-version list --data-id demo-data-id
bytedcli --site i18n-tt decc des-rpc data-version get --data-id demo-data-id --version 12
bytedcli --site i18n-tt decc des-rpc data-version create --data-id demo-data-id --applied-region US
bytedcli --site i18n-tt decc des-rpc data-version load-idl --data-id demo-data-id
bytedcli --site i18n-tt decc des-rpc data-version parse-idl --data-id demo-data-id --upstream-version 12 --idl-file ./decc-idl.json
bytedcli --site i18n-tt decc des-rpc data-version update --data-id demo-data-id --version 12 --body-file ./decc-des-rpc-annotation.json
bytedcli --site i18n-tt decc des-rpc data-version update --data-id demo-data-id --version 12 --field-path _request.DemoOptions.SkipDemoField --tag demo-tag --entity demo-entity --sync YES --non-us-user-data-proof-field NO --description "Skip demo field" --reason "Refresh demo annotation"
bytedcli --site i18n-tt decc des-rpc data-version submit --data-id demo-data-id --version 12 --reason "update IDL annotation"
```

Common options on Data Version operations:

- `--endpoint-path <path>` — Override the DECC OpenAPI path if the environment uses a different route
- `--timeout-ms <timeoutMs>` — HTTP timeout in milliseconds
- `--dry-run` — Print the OpenAPI request without sending it

`update --body-file` should contain the DECC Data Version fields for annotation updates, typically including `json_schema` and/or `field_infos`. The body may be either the data object itself or a full request object with a `data` object; the CLI sends a single `data-version update` request.

Use `data-version update --field-path _request.<field>` or `--field-path _response.<field>` for targeted `json_schema` annotation patches. It reads the current Data Version with `GET /openapi/data_version/detail`, patches one schema field locally, then writes back with `POST /openapi/data_version/update`. For fields newly added by IDL parse but absent from the old schema, pass `--schema-node-file` with the DECC parse field node and `--field-path` where it should be inserted.

### des-rpc openapi call

Low-level fallback for DES-RPC OpenAPI operations that are not yet wrapped or whose path differs in the current environment.

```bash
bytedcli --site i18n-tt decc des-rpc openapi call \
  --method GET \
  --path /openapi/schema/idl/load \
  --query '{"gateway":2,"data_id":"demo-data-id"}' \
  --dry-run
```

### data-transfer-config create

Create a cross-region HDFS data transfer configuration (registers the transfer job metadata in DECC).

```bash
bytedcli --site i18n-tt decc data-transfer-config create [options]
```

**Options:**

- `--name <name>` (required) — Transfer configuration name
- `--owners <owners>` (required) — Comma-separated owner usernames
- `--data-id <dataId>` (required) — Source DECC data ID (from `dorado decc datas` or the DECC console)
- `--source-region <region>` (required) — Source DECC region
- `--source-data-name <name>` (required) — Source table name
- `--target-region <region>` (required) — Target DECC region
- `--target-channel-name <name>` (required) — Target DECC channel (database) name
- `--target-data-name <name>` (required) — Target table name
- `--dorado-project-id <id>` (required) — Dorado project ID for the transfer task
- `--dorado-project-name <name>` (required) — Dorado project display name
- `--dorado-folder-id <id>` (required) — Dorado folder ID for the transfer task
- `--dorado-folder-name <name>` (required) — Dorado folder display name
- `--partition-key <key>` — Partition key when `--partition-list` is omitted (default: `date`)
- `--partition-value <value>` — Partition value when `--partition-list` is omitted (default literal `${date}` Dorado schedule placeholder; pass as-is, not shell-expanded)
- `--partition-list <json>` — JSON array override for `partition_list`
- `--partition-list-file <path>` — JSON file with `partition_list` array
- `--task-type <taskType>` — `hdfs_extra.task_info.type` (default: `1`)
- `--gateway <gateway>` — DECC gateway type (default: `6` for HDFS)
- `--timeout-ms <timeoutMs>` — HTTP timeout in milliseconds (default: `120000`)
- `--dry-run` — Probe schema APIs and print readiness without creating the transfer config
- `--skip-hsql-column-sync` — Skip post-create patch of the target `global_hsql` task SQL
- `--source-channel-name <name>` — Source Hive database for schema comparison (defaults to DECC data channel name)
- `--channel-id <channelId>` — DECC channel/endpoint ID for schema lookup (defaults from DECC data detail)

**Regions (two lists):**

- **Dorado-mapped (required for `--source-region` / `--target-region` on this command):** `China-North`, `EU-Compliance2`, `EU-TTP2`, `Singapore-Central`, `US-East`, `US-EastRed`, `US-TTP` — used for HSQL tasks and Hive `fetch-columns`. Unmapped regions fail fast with `DECC_INPUT_ERROR`.
- **DECC registration only (`hdfs-data create`, etc.):** also includes `Asia-SouthEastBD`, `Asia_Saas`, `Singapore_Saas`, `Asia_CIS` — valid on the DECC console but not yet mapped to Dorado for transfer config.

**Examples:**

```bash
bytedcli --site i18n-tt decc data-transfer-config create \
  --name demo-transfer \
  --owners demo.user \
  --data-id 100001234 \
  --source-region EU-Compliance2 \
  --source-data-name demo_source_table \
  --target-region Singapore-Central \
  --target-channel-name demo_channel \
  --target-data-name demo_target_table \
  --dorado-project-id 12345001 \
  --dorado-project-name demo-project \
  --dorado-folder-id 12345678 \
  --dorado-folder-name demo-folder

bytedcli --site i18n-tt decc data-transfer-config create \
  --dry-run \
  --data-id 100001234 \
  --source-region EU-Compliance2 \
  --source-data-name demo_source_table \
  --target-region Singapore-Central

bytedcli --site i18n-tt --json decc data-transfer-config create \
  --name demo-transfer \
  --owners demo.user \
  --data-id 100001234 \
  --source-region EU-Compliance2 \
  --source-data-name demo_source_table \
  --target-region Singapore-Central \
  --target-channel-name demo_channel \
  --target-data-name demo_target_table \
  --dorado-project-id 12345001 \
  --dorado-project-name demo-project \
  --dorado-folder-id 12345678 \
  --dorado-folder-name demo-folder \
  --partition-list '[{"key":"date","value":"${date}"},{"key":"hour","value":"${hour}"}]'
```

**Output:** On success, JSON mode returns `id`, `data_transfer_config_id`, `transmission_task_id`, `hsql_task_id`, and `hsql_column_sync` when present. If create succeeds but post-create HSQL sync fails, the command still returns the created `id` / `hsql_task_id` with `hsql_column_sync.patched: false` and `hsql_column_sync.error` (avoid re-running create with the same `--name`). Text mode prints a warning in that case. With `--dry-run`, JSON mode returns `dry_run`, `ready`, `schema_source`, `column_count`, `steps`, and `verdict`; text mode prints the same probe summary.

**Agent Guidance:** Run `--dry-run` before create when validating a new table. It checks DECC data detail, OpenAPI field/list, Dorado DECC schema, and source Hive columns without calling `POST /openapi/data_transfer_config/create`. `--dry-run` only requires `--data-id`, `--source-region`, `--source-data-name`, and `--target-region` (plus optional partition and schema override flags); **both** `--source-region` and `--target-region` must be Dorado-mapped (see above) — unmapped values fail with `DECC_INPUT_ERROR` before create or probe. After create, the CLI patches the target `global_hsql` task `SELECT` list from the DECC-registered schema (`POST /openapi/data/field/list`). Partition keys from `--partition-list` are excluded from the `SELECT`. When the source Hive schema differs from the DECC schema, the CLI sets `bytequery.sql.global.query.direct.transfer.enabled = false`. If OpenAPI field/list is unauthorized, the CLI falls back to Dorado DECC schema and then source Hive columns; apply DECC OpenAPI permission for `/openapi/data/field/list` for the registered schema path.

**Note:** Uses the DECC OpenAPI gateway (`bc-maliva-gw.tiktok-row.net`), not the browser `decc-next-api` direct endpoint.

### apply

Apply for channel or data Owner permission. The role is inferred from `--object-type`: 1 → Channel Owner, 2 → Data Owner.

```bash
bytedcli --site i18n-tt decc apply [options]
```

**Options:**

- `--object-type <objectType>` (required) — Object type: `1` = channel, `2` = data
- `--object-key <objectKey>` (required) — Channel ID or Data ID
- `--users <users>` (required) — Comma-separated usernames to grant permission
- `--reason <reason>` (required) — Reason for the permission request

**Examples:**

```bash
# Apply for channel Owner
bytedcli --site i18n-tt decc apply \
  --object-type 1 \
  --object-key demo-channel-id \
  --users demo.user \
  --reason "Need channel access for data exchange"

# Apply for data Owner
bytedcli --site i18n-tt decc apply \
  --object-type 2 \
  --object-key demo-data-id \
  --users demo.user \
  --reason "Need data access for pipeline"

# Apply for multiple users
bytedcli --site i18n-tt decc apply \
  --object-type 1 \
  --object-key demo-channel-id \
  --users demo.user1,demo.user2 \
  --reason "Team needs channel access"
```

**Output:** On success, returns a permission ticket URL for tracking the approval process.

### ticket list

List historical DECC/OG tickets. Filters are optional; use narrow filters such as
ticket id, entity id, schema id, status, applicant, or region when available.

```bash
bytedcli --site i18n-tt decc ticket list [options]
```

**Options:**

- `--surface <surface>` — API surface: `unified-v2`, `unified-v1`, or `portal` (default: `unified-v2`)
- `--id <id>` — Ticket/object id filter
- `--entity-id <id>` — Entity id filter
- `--schema-id <id>` — Schema id filter
- `--type <type>` — Ticket type filter
- `--page <n>` — Page number, 1-based (default: `1`)
- `--page-size <n>` — Page size (default: `20`)
- `--status <status>` — Filter by ticket status
- `--applicant <applicant>` — Filter by applicant username
- `--region <region>` — Filter by ticket region

**Examples:**

```bash
bytedcli --site i18n-tt decc ticket list \
  --surface unified-v2 \
  --entity-id demo-entity-id \
  --page 1 \
  --page-size 20

bytedcli --site i18n-tt --json decc ticket list \
  --surface unified-v2 \
  --status pending \
  --region EU \
  --applicant demo.user
```

**Output:** Text mode prints a compact ticket table. JSON mode returns the parsed ticket list, pagination, surface, and raw response payload.

### ticket get

Get DECC/OG ticket detail by ticket ID and optional version.

```bash
bytedcli --site i18n-tt decc ticket get [options]
```

**Options:**

- `--surface <surface>` — API surface: `unified-v2`, `unified-v1`, or `portal` (default: `unified-v2`)
- `--ticket-id <ticketId>` (required) — DECC ticket ID
- `--version <version>` — Ticket version

**Examples:**

```bash
bytedcli --site i18n-tt decc ticket get \
  --surface unified-v2 \
  --ticket-id demo-ticket-id \
  --version 3

bytedcli --site i18n-tt --json decc ticket get \
  --surface unified-v2 \
  --ticket-id demo-ticket-id \
  --version 3
```

**Output:** Text mode prints a compact ticket summary. JSON mode returns the parsed ticket detail and raw response payload.

### ticket comment

List comments for a DECC ticket.

```bash
bytedcli --site i18n-tt decc ticket comment [options]
```

**Options:**

- `--ticket-id <ticketId>` (required) — DECC ticket ID

**Examples:**

```bash
bytedcli --site i18n-tt decc ticket comment \
  --ticket-id demo-ticket-id

bytedcli --site i18n-tt --json decc ticket comment \
  --ticket-id demo-ticket-id
```

**Output:** Text mode prints a compact comment table. JSON mode returns the parsed comments and raw response payload.

## API Endpoints

| Command                   | Gateway                                 | Endpoint                                             |
| ------------------------- | --------------------------------------- | ---------------------------------------------------- |
| `gateway service list`    | Direct unified API                      | `GET /unified_api/v2/services/list`                  |
| `gateway endpoint list`   | Direct unified API                      | `GET /unified_api/v2/endpoints/list`                 |
| `gateway endpoint get`    | Direct unified API                      | `GET /unified_api/v2/endpoints/detail`               |
| `gateway endpoint create` | Direct unified API                      | `POST /unified_api/v2/endpoint/draft/create`         |
| `gateway endpoint update` | Direct unified API                      | `POST /unified_api/v2/endpoint/draft/update`         |
| `hdfs-channel create`     | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | `POST /openapi/channel/create`                       |
| `hdfs-data create`        | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | `POST /openapi/data/create`                          |
| `des-rpc channel create`  | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | `POST /openapi/channel/create`                       |
| `des-rpc data create`     | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | `POST /openapi/data/create`                          |
| `des-rpc data-version list/get/create/load-idl/parse-idl/update/submit` | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | `GET /openapi/data_version/detail`, `GET /openapi/schema/idl/load`, `POST /openapi/schema/idl/parse`, `POST /openapi/data_version/*` |
| `des-rpc direct call`     | Direct (`decc.tiktok-row.net`)          | Caller-provided `GET`/`POST` path                    |
| `des-rpc openapi call`    | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | Caller-provided `GET`/`POST` path                    |
| `data-transfer-config create` | OpenAPI (`bc-maliva-gw.tiktok-row.net`) | `POST /openapi/data_transfer_config/create`, `POST /openapi/data/field/list` (schema sync) |
| `apply`                   | Direct (`decc.tiktok-row.net`)          | `POST /decc-next-api/v3/auth/object_user_role/apply` |
| `ticket list`             | Direct unified/portal API               | `GET /unified_api/v2/tickets/list`                   |
| `ticket list --region`    | Direct unified API                      | `GET /unified_api/v2/tickets/list_by_region`         |
| `ticket get`              | Direct unified/portal API               | `GET /unified_api/v2/tickets/detail`                 |
| `ticket comment`          | Direct (`decc.tiktok-row.net`)          | `GET /api/v2/comment/list`                           |

## Scenario Reference

| Value | Name                    | Description               |
| ----- | ----------------------- | ------------------------- |
| 0     | UNKNOWN_SCENARIO        | Unknown                   |
| 1     | ALL_SCENARIO            | All scenarios             |
| 2     | TEXAS                   | Texas data sovereignty    |
| 3     | CLOVER                  | Clover data sovereignty   |
| 4     | CN_CROSS_BORDER         | CN cross-border transfer  |
| 5     | TT_NONTT                | TT & NonTT data isolation |
| 6     | EU_US_DIRECT_CONNECTION | EU-US direct connection   |
| 7     | ROW_HDFS_BOE            | row-hdfs/boe gateway      |
| 8     | ROW_HDFS_PRODUCTION     | row-hdfs/prod gateway     |
| 9     | RPC_TEXAS_CLOVER_MIXED  | RPC Texas/Clover mixed    |
| 10    | HDFS_TEXAS_CLOVER_MIXED | HDFS Texas/Clover mixed   |

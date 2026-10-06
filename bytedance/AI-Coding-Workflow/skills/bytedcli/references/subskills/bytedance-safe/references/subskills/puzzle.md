# Safe Puzzle — Feature Platform

Query feature metadata, entities, datasources, tenants, packages, collections, scripts, and tickets on the puzzle feature platform.

## Commands

### Feature

```bash
# List features (paginated, default 20 per page)
bytedcli safe puzzle feature list [--page N] [--page-size N]
bytedcli safe puzzle feature list --keyword <name-or-code>
bytedcli safe puzzle feature list --entity-ids 123 456
bytedcli safe puzzle feature list --collection-code <collection-code>
bytedcli safe puzzle feature list --production-type stats model

# Get feature by ID
bytedcli safe puzzle feature get --id <feature-id>

# List feature dependencies
bytedcli safe puzzle feature list-dependencies --id <feature-id>

# Runtime and QPS history
bytedcli safe puzzle feature get-runtime-info --id <feature-id>
bytedcli safe puzzle feature list-history-qps --id <feature-id>

# Get feature rule configuration
bytedcli safe puzzle feature get-rule-conf --id <feature-id>

# Update feature rule configuration
bytedcli safe puzzle feature update-rule-conf --id <feature-id> --content data.json

# Create feature draft
bytedcli safe puzzle feature create-draft --type ds --content data.json
bytedcli safe puzzle feature create-draft --type script --content '{"key":"value"}'
bytedcli safe puzzle feature create-draft --type spi --content data.json
bytedcli safe puzzle feature create-draft --type spi --content '{"key":"value"}'

# Test feature calculation
bytedcli safe puzzle feature test --id <feature-id> --entity-params <json>

# Search similar features
bytedcli safe puzzle feature similar-search --keyword <meaning>
```

### Entity

```bash
# List all entities
bytedcli safe puzzle entity list

# Get entity detail
bytedcli safe puzzle entity get --id <entity-id>
```

### Datasource

```bash
# List datasources (default type: rpc)
bytedcli safe puzzle datasource list
bytedcli safe puzzle datasource list --type redis
bytedcli safe puzzle datasource list --keyword <search-text>

# Get datasource detail
bytedcli safe puzzle datasource get --id <datasource-id>

# Create a datasource
bytedcli safe puzzle datasource create --type rpc --psm <psm> --method <method> --name <name>
bytedcli safe puzzle datasource create --type spi --psm <psm> --name <name>
bytedcli safe puzzle datasource create --type redis --psm <psm> --name <name>
bytedcli safe puzzle datasource create --type abase --psm <psm> --name <name>

# Search similar data sources
bytedcli safe puzzle datasource similar-search --keyword <meaning>

# Get datasource schema
bytedcli safe puzzle datasource get-schema --psm <psm> --method <method>

# Get datasource schema with semantic meaning to recall related knowledge
bytedcli safe puzzle datasource get-schema --psm <psm> --method <method> --meaning "<feature semantics>"

# Short alias
bytedcli safe puzzle ds list
```

### Tenant

```bash
# List tenants
bytedcli safe puzzle tenant list

# Include test tenants
bytedcli safe puzzle tenant list --all
```

### Package

```bash
# List packages (paginated, default 10 per page)
bytedcli safe puzzle package list
bytedcli safe puzzle pkg list --keyword <name-or-code> --page 2
bytedcli safe puzzle pkg list --keyword my-pkg --exact-match

# Get package detail
bytedcli safe puzzle package get --id <package-id>
bytedcli safe puzzle pkg get --id <package-id>

# List binded features of a package
bytedcli safe puzzle package list-features --id <package-id>
bytedcli safe puzzle pkg list-features --id <package-id>

# Add features to a package (圈选特征)
bytedcli safe puzzle package add-features --id <package-id> --collection-id <collection-id> --feature <entity-inst-code>.<feature-code>
bytedcli safe puzzle pkg add-features --id <pkg-id> --collection-id <col-id> --feature <inst-code>.<feat-code> --tenant <tenant>

# Set package feature ignore-error flag
bytedcli safe puzzle package set-feature-ignore-error --id <package-id> --feature <entity-inst-code>.<feature-code> --ignore-error true
```

### Collection

```bash
# List feature collections (default: related to me)
bytedcli safe puzzle collection list
bytedcli safe puzzle collection list --keyword <name-or-code>
bytedcli safe puzzle collection list --related-to-me false

# Get collection detail
bytedcli safe puzzle collection get --id <collection-id>

# List collection features
bytedcli safe puzzle collection list-features --id <collection-id>

# Add a parameter to a collection
bytedcli safe puzzle collection add-param --id <collection-id> --key <key> --name <name> --value-type <type>
bytedcli safe puzzle collection add-param --id <collection-id> --key my_param --name 我的参数 --value-type string
bytedcli safe puzzle collection add-param --id <collection-id> --key my_param --name 我的参数 --value-type int --desc "my description"

# Initialize template-based parameterized features and create a Puzzle ticket
bytedcli safe puzzle collection initialize-features --id <collection-id> --instance-code demo_instance --template-product-unit-code demo_template_unit --product-unit-code inst_demo_unit --product-unit-name 示例单元 --params-mapping '[{"key":"user_id","from_type":1,"from":"user_id"}]' --features '[{"template_feature_code":"demo_feature","code":"inst_demo_feature","name":"示例特征"}]'
```

### Script

```bash
# Generate script template
bytedcli safe puzzle script generate-template --type req --ds-type rpc

# Compile and analyze script content
bytedcli safe puzzle script compile --content ./script.go --entity-id 123
bytedcli safe puzzle script compile --content "package main\n..." --collection-id 456
```

### Ticket

```bash
# Create release ticket
bytedcli safe puzzle ticket create --feature-id <feature-id>
bytedcli safe puzzle ticket create --feature-id <feature-id> --type urgent --reviewer user@example.com
bytedcli safe puzzle ticket create --feature-id <feature-id> --type create-with-review --reviewer user@example.com
bytedcli safe puzzle ticket create --feature-id <feature-id> --desc "my deploy description"
bytedcli safe puzzle ticket create --pkg-id <pkg-id>
bytedcli safe puzzle ticket create --collection-id <collection-id> --reviewer user@example.com

# List puzzle tickets
bytedcli safe puzzle ticket list
bytedcli safe puzzle ticket list --keyword demo --page 2
```

### Quality Check Task

```bash
# List quality check tasks (paginated, default 20 per page)
bytedcli safe puzzle quality-check-task list
bytedcli safe puzzle quality-check-task list --keyword demo
bytedcli safe puzzle quality-check-task list --status ongoing
bytedcli safe puzzle quality-check-task list --status finished
bytedcli safe puzzle quality-check-task list --start '2026-06-16' --end '2026-06-17'
bytedcli safe puzzle quality-check-task list --start '1h ago'
bytedcli safe puzzle quality-check-task list --page 2 --page-size 20

# Get quality check task detail (includes results when task is finished)
bytedcli safe puzzle quality-check-task get --id sample-task-id
bytedcli --json safe puzzle quality-check-task get --id sample-task-id

# Create a quality check task
bytedcli safe puzzle quality-check-task create --feature-id sample-feature-id
bytedcli --json safe puzzle quality-check-task create --feature-id sample-feature-id
```

### UT

```bash
# Manage Puzzle UT cases
bytedcli safe puzzle ut list --feature-id <feature-id>
bytedcli safe puzzle ut create --feature-id <feature-id> --content '{"name":"demo-ut"}'
bytedcli safe puzzle ut update --id <ut-id> --content '{"name":"demo-ut"}'
bytedcli safe puzzle ut run --id <ut-id>
bytedcli safe puzzle ut delete --id <ut-id>
```

## Common Options

All puzzle sub-commands support `--tenant <tenant>` to specify the tenant for API requests. Priority: `--tenant` > `SAFE_TENANT` env > config (`bytedcli safe config set --key tenant --value <tenant>`) > default `ecology`.

## References

- [puzzle-api.md](references/puzzle-api.md) — API reference
- [puzzle-guide.md](references/puzzle-guide.md) — Usage guide

## Reference: puzzle-api

## Puzzle API Reference

## Base URL

`https://safe.bytedance.net/`

## Authentication

Cookie-based. Headers: `cookie`, `tenant`, `business`, `Agw-Js-Conv: str`.

## Endpoints

| Method                  | HTTP | Path                                        |
| ----------------------- | ---- | ------------------------------------------- |
| GetFeatureList          | POST | /api/puzzle/v1/features                     |
| GetFeatureDetail        | GET  | /api/puzzle/v1/features/{id}/detail         |
| GetFeatureDetailByCode  | POST | /api/puzzle/v1/get_feature_by_code          |
| GetEntities             | GET  | /api/puzzle/v1/entities                     |
| GetEntityDetail         | GET  | /api/puzzle/v1/entities/{id}                |
| GetDSBaseInfoList       | GET  | /api/puzzle/v1/ds_base_infos                |
| GetDataSource           | GET  | /api/puzzle/v1/data_sources/{id}            |
| GetTenantList           | GET  | /api/puzzle/v1/tenants/                     |
| GetPackageList          | POST | /api/puzzle/v1/package_list                 |
| GetPackageDetail        | GET  | /api/puzzle/v2/packages/{id}                |
| GetCollectionList       | POST | /api/puzzle/v2/collection_list              |
| GetCollectionDetail     | GET  | /api/puzzle/v2/collections/{id}             |
| CreateDataSource        | POST | /api/puzzle/v1/data_sources                 |
| GetServiceClusterInfo   | GET  | /api/puzzle/v1/service_infos/{psm}/clusters |
| FeatureListDependencies | GET  | /api/puzzle/v1/case_test/feature/{id}       |
| FeatureTest             | POST | /api/puzzle/v1/case_test                    |
| FeatureCreateDraft(ds)  | POST | /api/puzzle/v1/ds_features                  |
| FeatureCreateDraft(scr) | POST | /api/puzzle/v1/script_production_unit       |
| GenerateScriptTemplate  | POST | /api/puzzle/v1/scripts/content/generate     |
| AnalyseScriptRelations  | POST | /api/puzzle/v1/scripts/content/analyse      |
| CreateTicket            | POST | /api/puzzle/v1/tickets                      |
| GetAdvancedConfig       | GET  | /api/puzzle/v2/advanced_config/{objectId}   |
| SaveAdvancedConfig      | PUT  | /api/puzzle/v2/advanced_config/{objectId}   |
| QueryQualityCheckTasks  | POST | /api/puzzle/v1/quality_check/task_list      |
| GetQualityCheckTask     | GET  | /api/puzzle/v1/quality_check/task/{id}       |
| GetQualityCheckTaskDetail | GET | /api/puzzle/v1/quality_check/task/{id}/detail |
| CreateQualityCheckTask    | POST | /api/puzzle/v1/quality_check/task             |

## Response Format

```json
{ "code": 0, "message": "success", "data": { ... } }
```

## Reference: puzzle-guide

## Puzzle Usage Guide

## Quick Start

1. Login: `bytedcli safe login`
2. List features: `bytedcli safe puzzle feature list`
3. Get detail: `bytedcli safe puzzle feature get --id <id>`
4. Search features: `bytedcli safe puzzle feature list --keyword <name-or-code>`
5. List tenants: `bytedcli safe puzzle tenant list`
6. List packages: `bytedcli safe puzzle pkg list`
7. List collections: `bytedcli safe puzzle collection list`

## Tips

- Use `-j` flag for JSON output: `bytedcli -j safe puzzle feature list`
- Use `--page` and `--page-size` for pagination
- Use `--keyword` to filter features, packages, or collections by name or code
- Use `--entity-ids` to filter features by entity IDs (e.g., `--entity-ids 123 456`)
- Use `--pkg-code` to filter features by package code
- Use `--production-type` to filter features by production type (e.g., `data_source`, `script`, `spi`)
- Use `--type` to filter datasources by type (e.g., `rpc`, `redis`, `hive`)
- Use `--query` to search datasources by text
- Use `--all` to include test tenants in tenant list
- Use `--exact-match` for exact keyword match in package list
- Use `--related-to-me false` to list all collections, not just yours
- `ds` is a short alias for `datasource`
- `pkg` is a short alias for `package`
- `feature list-dependencies` helps trace downstream definitions and parameters
- `feature get-rule-conf` allows checking production unit rule configuration (supports `data_source`, `script`, and `spi` types)
- `feature test` can simulate features directly, e.g. `bytedcli safe puzzle feature test --id <id> --entity-params '{"param1": {"type": 4, "val": "foo"}}'`
- `feature create-draft` allows creating draft configurations for data source (`ds`), `script`, and `spi` features by parsing JSON files or text inputs.
- `script generate-template` generates common/req/resp templates for script development
- `script compile` allows analyzing Yaegi scripts offline by passing content and linking to entity or collection IDs
- `ticket create` creates a release/urgent/rollback/create-with-review ticket for MM features; `--reviewer` is required for all types except `create`; `--desc` sets the deploy description (default: from safe cli)
- `collection add-param` adds a parameter to a puzzle feature collection; requires `--id`, `--key` (lowercase letters/digits/underscores), `--name` (must contain Chinese characters), and `--value-type` (one of: bool, int, float, string, list, bool_list, int_list, float_list, string_list, map, bool_map, int_map, float_map, string_map)
- `quality-check-task list` queries quality check tasks; supports `--keyword` (feature collection/entity), `--status` (new|ongoing|finished|failed|canceled), `--start`/`--end` (Unix seconds, date string, or relative time like `1h ago`); defaults to last 1 day if no time range provided
- `quality-check-task get` retrieves a single quality check task by `--id`; when the task status is `finished`, it automatically fetches and displays the per-feature quality check results with error details
- `quality-check-task create` creates a quality check task for a feature by `--feature-id`; returns the created task ID

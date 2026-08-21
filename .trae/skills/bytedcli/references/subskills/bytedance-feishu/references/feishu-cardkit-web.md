# Feishu CardKit Template Web API

This note documents the temporary Web-backed implementation behind
`bytedcli feishu cardkit template ...`.

Official docs:

- Feishu cards overview: https://open.larkoffice.com/document/feishu-cards/feishu-card-overview
- CardKit overview: https://open.larkoffice.com/document/feishu-cards/feishu-card-cardkit/feishu-cardkit-overview
- Card builder UI: https://open.feishu.cn/cardkit?from=open_docs_tutorial

## Why Web-backed

Official CardKit OpenAPI covers card consumption/runtime card entities, but does
not expose builder template asset lifecycle APIs for create, save, publish,
rollback, import/export, or delete. Lark CLI currently has no template lifecycle
surface either.

`cardkit template` therefore uses the Feishu CardKit builder Web API. Keep this
implementation isolated so it can be removed when official OpenAPI or lark-cli
adds template lifecycle support.

## Auth

The Web API uses the user's Feishu browser session, not bot `tenant_access_token`.

```bash
bytedcli auth login --session --feishu
bytedcli --json feishu cardkit template list --page-size 5
```

Runtime behavior:

- Load a valid Feishu Web session cookie jar.
- Fetch `https://www.feishu.cn/lgw/csrf_token`.
- Read `lgw_csrf_token` from cookies.
- Send `X-Lgw-Csrf-Token: <token>` on CardKit Web requests.

If CSRF is missing or wrong, the Web API returns `code=9499`.

## Endpoint Matrix

All paths are under `https://open.feishu.cn/cardkit`.

| Command                   | Method | Path                                 | Request body                                                                          | Response data            |
| ------------------------- | ------ | ------------------------------------ | ------------------------------------------------------------------------------------- | ------------------------ |
| `template list`           | `POST` | `/api/card/list/v2`                  | `pageno`, `pagenum`, `card_select_type`, `group_filter`, `card_sort`, `card_status`   | `count`, `card_list`     |
| `template get`            | `GET`  | `/api/smart/card/:card_id`           | none                                                                                  | `card`                   |
| `template create`         | `POST` | `/api/smart/card/create`             | `name`, `schema_version`, `card_group_id`, `dsl_entity`, `template_card_id`, `locale` | `card_id`, `version_id`  |
| `template update` content | `POST` | `/api/card/save/content`             | `card_id`, `saved_version_id`, `dsl_entity`                                           | Web envelope data        |
| `template update` meta    | `POST` | `/api/update/card/meta`              | `card_id`, `name`                                                                     | Web envelope data        |
| `template publish`        | `POST` | `/api/card/release`                  | `card_id`, `version_id`, `version_name`                                               | Web envelope data        |
| `template rollback`       | `POST` | `/api/card/update/draft/content`     | `card_id`, `release_id`                                                               | Web envelope data        |
| `template version list`   | `GET`  | `/api/card/release/version/:card_id` | none                                                                                  | `release_version_info[]` |
| `template delete`         | `POST` | `/api/card/delete`                   | `card_id`                                                                             | Web envelope data        |

No dedicated Web endpoint was found for archive. Import/export is implemented
as a local `.card` JSON file format: export reads template detail and writes a
file; import reads a file and calls create.

Permissions are not implemented in the CLI. Treat permissions as UI-owned until
the Web app exposes stable, testable endpoints for that surface.

## Field Mapping

`dsl_entity`:

```json
{
  "user_dsl": "{\"schema\":\"2.0\",\"config\":{\"update_multi\":true},\"body\":{\"direction\":\"vertical\",\"elements\":[]}}",
  "variable": "[]",
  "variable_constraint": "[]"
}
```

List filters:

| CLI value              | Web field                          | Web value |
| ---------------------- | ---------------------------------- | --------- |
| `--source mine`        | `card_select_type`                 | `1`       |
| `--source cooperator`  | `card_select_type`                 | `2`       |
| `--source all`         | `card_select_type`                 | `3`       |
| `--status all`         | `card_status`                      | `1`       |
| `--status unpublished` | `card_status`                      | `2`       |
| `--status published`   | `card_status`                      | `3`       |
| `--sort updated`       | `card_sort`                        | `1`       |
| `--sort created`       | `card_sort`                        | `2`       |
| `--sort name`          | `card_sort`                        | `3`       |
| `--group all`          | `group_filter.group_type`          | `1`       |
| `--group ungrouped`    | `group_filter.group_type`          | `2`       |
| `--group <id>`         | `group_filter.group_type/group_id` | `3/<id>`  |

Detail fields used by CLI:

- `card_id`: builder template asset id; exposed as `template_id`
- `draft_version_id`: used as `saved_version_id` for update and `version_id` for publish
- `release_version_id`: presence means published
- `user_dsl`: JSON string for card DSL
- `variables`: JSON string for template variables
- `variable_constraint`: JSON string for constraints; use `[]` when there are no constraints

## Side Effects

Ordinary writes:

- `create`
- `update`
- `import`

These support `--dry-run` and do not require `--yes`.

Strong side effects:

- `publish`: requires `--yes`; `--version-name` follows the builder UI format
  `major.minor.patch`, for example `1.0.0`, and `0.0.0` is rejected
- `rollback`: requires `--yes`
- `delete`: requires `--yes --confirm-template-id <same id>`

Dry-run bypasses confirmation and only prints the planned Web request.

## Live Test Checklist

Use `mktemp` for temporary files. Do not clean up the main test template; create
a separate unpublished template to test delete.

```bash
CARD_FILE="$(mktemp -t cardkit-template.XXXXXX.json)"
EXPORT_FILE="$(mktemp -t cardkit-template.XXXXXX.card)"
cat >"$CARD_FILE" <<'JSON'
{
  "schema": "2.0",
  "config": {
    "update_multi": true
  },
  "header": {
    "title": { "tag": "plain_text", "content": "bytedcli live test" },
    "subtitle": { "tag": "plain_text", "content": "" },
    "template": "blue"
  },
  "body": {
    "direction": "vertical",
    "elements": [
      { "tag": "markdown", "content": "created by bytedcli live test" }
    ]
  }
}
JSON

bytedcli --json feishu cardkit template list --page-size 3
bytedcli --json feishu cardkit template create --name "bytedcli live test" --card-file "$CARD_FILE" --dry-run
bytedcli --json feishu cardkit template create --name "bytedcli live test" --card-file "$CARD_FILE"
bytedcli --json feishu cardkit template get --template-id "$TEMPLATE_ID"
bytedcli --json feishu cardkit template update --template-id "$TEMPLATE_ID" --name "bytedcli live test updated" --card-file "$CARD_FILE"
bytedcli --json feishu cardkit template publish --template-id "$TEMPLATE_ID" --version-name "1.0.0" --dry-run
bytedcli --json feishu cardkit template publish --template-id "$TEMPLATE_ID" --version-name "1.0.0" --yes
bytedcli --json feishu cardkit template version list --template-id "$TEMPLATE_ID"
bytedcli --json feishu cardkit template export --template-id "$TEMPLATE_ID" --output "$EXPORT_FILE"
bytedcli --json feishu cardkit template import --file "$EXPORT_FILE" --name "bytedcli imported live test" --dry-run
bytedcli --json feishu cardkit template import --file "$EXPORT_FILE" --name "bytedcli imported live test"
bytedcli --json feishu cardkit template rollback --template-id "$TEMPLATE_ID" --version-id "$RELEASE_ID" --dry-run
bytedcli --json feishu cardkit template rollback --template-id "$TEMPLATE_ID" --version-id "$RELEASE_ID" --yes

# Cleanup ability test on a separate unpublished template.
bytedcli --json feishu cardkit template create --name "bytedcli delete live test" --card-file "$CARD_FILE"
bytedcli --json feishu cardkit template delete --template-id "$DELETE_TEMPLATE_ID" --dry-run
bytedcli --json feishu cardkit template delete --template-id "$DELETE_TEMPLATE_ID" --yes --confirm-template-id "$DELETE_TEMPLATE_ID"
bytedcli --json feishu cardkit template get --template-id "$DELETE_TEMPLATE_ID"
```

Expected cleanup verification: the final `get` should fail with the Web API's
not-found response. Keep created non-cleanup templates for later manual
inspection unless the test specifically targets delete.

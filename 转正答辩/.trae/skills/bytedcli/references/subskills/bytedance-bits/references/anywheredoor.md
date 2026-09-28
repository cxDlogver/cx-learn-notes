# Anywheredoor / 任意门

Use `bytedcli bits anywhere` for Anywheredoor proxy debugging. The original capture flow remains `listen` / `status` / `watch` / `get` / `stop`; newer commands add share-link resolution, device selection, mock inspection/mutation, filters, and black paths.

## Safety

- Prefer `--json` for agent workflows.
- Use `device list` first and pass a real device id to state-changing commands. `did=0` is useful for some readonly list/config checks, but mock create/enable/delete requires a real device id.
- Treat these commands as state-changing: `listen`, `stop`, `mock create-local`, `mock enable`, `mock disable`, `mock delete`.
- Mock write commands require `--yes`. For probes, create a disabled local mock first, then delete it after validation.
- Do not put real app ids, device ids, mock ids, PSMs, or internal URLs in public examples. Use placeholders like `1234`, `1234567890123456`, and `/api/demo`.

## Device Selection

```bash
bytedcli --json bits anywhere device list --app-id 1234
```

Pick a real `did` from this list before starting capture or changing mocks.

## Original Capture Flow

```bash

bytedcli --json bits anywhere listen \
  --app-id 1234 --did 1234567890123456

bytedcli --json bits anywhere status \
  --app-id 1234 --did 1234567890123456

bytedcli bits anywhere watch \
  --app-id 1234 --did 1234567890123456 \
  --url-path /api/demo \
  --show-curl

bytedcli bits anywhere watch \
  --app-id 1234 --did 1234567890123456 \
  --window-sec 1800 \
  --include-snapshot \
  --url-path /api/demo

bytedcli bits anywhere get \
  --app-id 1234 --did 1234567890123456 \
  --history-id 1447858190 --env 8 --curl

bytedcli --json bits anywhere stop \
  --app-id 1234 --did 1234567890123456
```

`watch` defaults to HTTP polling mode and prints `id`, `path`, `log_id`, and `env`. Use `--window-sec` with `--include-snapshot` to dump recent captures; use `--show-curl` to render each matched capture as a curl command. `get --history-id <id> --env <env> --curl` converts one captured record into curl.

Advanced compatibility options from the original flow are still available:

- `--skip-listen`: watch without calling `listen` first.
- `--mode ws`: Arena WebSocket research escape hatch. It is usually silent for non-browser clients, so prefer default poll mode for real debugging.
- `--interval-ms`: polling interval, default `1500`.
- `--url-path`: client-side substring filter plus backend path hint.

The curl renderer removes headers that curl manages itself, such as `Host`, `Content-Length`, and `Accept-Encoding`.

## Share Links

Use `share get --url <url>` when the user only has an Anywheredoor share link. Single-item links contain `_proxy_share_item_id` and `appId`; bulk links contain `_proxy_share_items_id`. Add `--curl` only for single-item links.

```bash
bytedcli --json bits anywhere share get \
  --url 'https://example.com/anywheredoor/proxy/share?appId=1234&_proxy_share_item_id=1447858190&env=8'

bytedcli bits anywhere share get \
  --url 'https://example.com/anywheredoor/proxy/share?appId=1234&_proxy_share_item_id=1447858190&env=8' \
  --curl

bytedcli --json bits anywhere share get \
  --url 'https://example.com/anywheredoor/proxy/share?appId=1234&_proxy_share_items_id=sample-share-id'
```

`share` is readonly. It calls the backend share APIs directly and returns the captured request/response envelope; it does not open a browser or scrape the share page.

## Mock

```bash
bytedcli --json bits anywhere mock list \
  --app-id 1234 --did 1234567890123456 \
  --type local --page-size 20

bytedcli --json bits anywhere mock get \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --type local

bytedcli --json bits anywhere mock create-local \
  --app-id 1234 --did 1234567890123456 \
  --name sample-local-mock \
  --method GET \
  --url-path /api/demo \
  --query-filter app=1 \
  --query-filter version_code=123456 \
  --body '{"ok":true}' \
  --serializer json \
  --yes

bytedcli --json bits anywhere mock enable \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --yes

bytedcli --json bits anywhere mock disable \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --yes

bytedcli --json bits anywhere mock delete \
  --app-id 1234 --did 1234567890123456 \
  --mock-id 987654321 --yes
```

Supported mock type names: `local`, `remote`, `status-code`, `throttling`, `idl`, `rewrite`.

Supported serializer names for `create-local`: `json`, `text`, `html`, `javascript`, `protobuf`, `webcast-packer`, `webcast-im`, `stream-forecast`, `script`.

`mock create-local` can narrow matching beyond path/method with Anywheredoor `extra_filter`. Prefer repeatable `--query-filter key=value` for query equality checks; the CLI writes the backend `content[0].extra_filter` JSON string. For advanced backend-supported shapes, pass raw JSON with `--extra-filter '<json-object>'`. Do not combine `--query-filter` and `--extra-filter`.

## Filter And Black Path

```bash
bytedcli --json bits anywhere filter get \
  --app-id 1234 --did 1234567890123456

bytedcli --json bits anywhere black-path get --app-id 1234
```

These are readonly inspection commands.

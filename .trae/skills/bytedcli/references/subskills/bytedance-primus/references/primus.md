# Primus API Notes

## Host Routing

- Primus data APIs use `primushistory` / `primus-history` hosts. Do not use human `primus-ui` hosts for API requests unless the command is explicitly generating a UI URL.
- CN VDCs such as `GL`, `HL`, `LF`, `YG`, `DY`, `YX`, and `LQ` use `*.byted.org` History hosts by default.
- I18N ROW VDCs such as `USWest2`, `Maliva`, `MY2`, and `SG1` use ROW History hosts with `--row`, for example `primushistoryuw2-k8s.tiktok-row.org`. Copied ROW UI URLs such as `primus-ui-maliva.tiktok-row.org/<cluster>/<app>/webapps/primus/` are routed by the cluster path suffix (`maliva`, `useast1b`, `my2`, `uswest2`, and similar). Older copied ROW History URLs such as `primushistoryuw2.tiktok-row.org` are normalized to the matching `-k8s` History host.
- US-TTP / `useast5` reads `newStatus.json` and role pod rows from `primushistoryuseast5-k8s.tiktok-us.net`; if a copied History URL contains `primushistoryuseast5-k8s.tiktok-usts.net`, bytedcli normalizes it to the `tiktok-us.net` History host. Copied UI URLs on `primus-ui.tiktok-usts.org` or `primus-ui.tiktokd.org` are also routed from the `useast5` cluster path. AM env, log-resolution, cluster, CRD, and DevOps pod diagnostic requests use `primus-history-usttp.tiktok-row.org`.
- EU-TTP / `useast2a` reads `newStatus.json`, role pod rows, and task rows from `primushistoryuseast2a-k8s.tiktok-eu.org`; AM env, cluster, CRD, and DevOps pod diagnostic requests use `primus-history-euttp.byted.org`. TTP/EU-TTP log rows with a known mljob origin should resolve through `redirect_log.html` first, not `kubernetesLog?check=true`. Older `primus-history-euttp.byted.org` status links and copied `primus-ui-useast2a` UI links are normalized to the `primushistoryuseast2a-k8s` History host.
- Yarn `application_...` ids do not map cleanly from VDC. Pass `--url` or an explicit `--host` with the matching History host.
- `--url` and `--host` are intentionally limited to known Primus History/UI host forms. For Primus log rows, do not hand-build log paths; use `primus log list --fetch` or `primus log get` so bytedcli can resolve the row's `logUrl`.

## App IDs

- CloudNative Primus app ids usually look like `nj-demo-pj`.
- If the user gives `CLOUDNATIVE_APPLICATION_ID` without `-pj`, bytedcli appends `-pj` automatically for History paths.
- Yarn app ids beginning with `application_` are preserved as-is.

## Data Endpoints

- `primus summary get` fetches AM env, UI overview, raw status, and role names.
- `primus job get --kind env` fetches `env/environment.json`.
- `primus job get --kind overview` fetches `newStatus.json?from=page`.
- `primus job get --kind status` fetches raw `newStatus.json`.
- `primus pod list`, `primus log list`, and `primus log get` fetch `newStatus.json?from=page&role=<role>`.
- `primus task list` fetches the task table via `role=task`.
- `primus task build` fetches `doctor/taskbuild.json`.
- `primus devops crd list` fetches CRDs from `doctor/status.json?onlyCr=true`.
- `primus devops pod list`, `primus devops lifecycle get`, and `primus devops pod-status get` fetch pod diagnostics from the DevOps / UI status endpoints.
- `primus raw get --kind <kind>` is for exact endpoint checks when a task explicitly needs the raw JSON shape.

## Logs

- Role rows contain `logUrl`; do not guess `/log/<pod>.log` or a synthetic `logs-index.json` path.
- Use `primus log list --fetch` to resolve `logUrl` through the Primus frontend log route and parse the resulting page into concrete file links. CN/standard and ROW rows follow `log.html -> kubernetesLog -> mljob`; TTP/EU-TTP rows with a known mljob origin follow `redirect_log.html -> PROXY_URL redirect -> concrete files`. If a legacy fallback result is an Argos/streamlog tenant-query URL, bytedcli asks the Primus redirect log list for concrete `/var/log/tiger` files instead of guessing a fixed file set.
- Use `primus log get` to fetch concrete files such as `stderr.log`, `syslog.log`, `stdout.log`, or role-specific logs under `/var/log/tiger`. It picks a role row, matches `--file-pattern`, and fetches matched file content from the resolved Primus/mljob URL for CN/standard and ROW rows, or through the built-in Footprint download path for TTP/EU-TTP concrete URLs. `--start <range>` controls byte ranges for both direct mljob and Footprint-backed concrete files; direct mljob reads support `-N` and `A-B`, while Footprint-backed reads also accept `0` and `A-`. Without `--start`, direct mljob tail-preview links are expanded to the full file only when the parsed file size fits within `--log-limit-bytes`; larger files keep the tail preview and return a hint to use `--start '<offset>-<offset+limit>'`.
- If the result has `logSource: "primus-redirect"` and `logResolutionStatus: "no-files"`, the redirect list returned no concrete log files. Do not treat the Argos/streamlog URL as raw Primus executor log content.
- If the result has `logResolutionStatus: "landing-only"`, bytedcli could not resolve concrete file links for the selected row. Try a more specific `--pod-name`, a different `--row-index`, or a narrower `--file-pattern` before reporting that logs are unavailable.

## Response Handling

- Primus History JSON endpoints may return gzip bytes even when response headers are incomplete. The Primus client handles gzip magic bytes before JSON parsing.
- EU-TTP gateways may report gzip in headers while returning plain JSON; do not add extra manual decompression around bytedcli output.
- Share summarized env findings instead of raw `environment.json`; env output can contain sensitive runtime values.

## Exit Diagnostics

- `0` and `-1000` are usually normal exits.
- `137`, `-137`, `9`, and `-9` usually mean OOM or kill unless `diag` gives a more specific cause.
- For HDFS permission or host allowlist issues, inspect AM env fields such as pod name, host IP, IPv6, resource group, and hostname.

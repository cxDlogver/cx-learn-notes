---
name: bytedance-primus
description: "Use bytedcli to inspect Primus History applications. Covers Primus app id / History URL parsing, AM environment, newStatus overview/status, role pod rows, Primus role log indexes and concrete log files, CRDs, DevOps pod lifecycle, TaskBuild rows, and local read-only exports."
---

# Primus

Use this skill when the task mentions Primus History, `newStatus.json`, `environment.json`, role pods, pod lifecycle, CRDs, executor logs, or a Primus application id ending in `-pj`. For Primus logs, start from the History URL or app id, then let `bytedcli primus log list --fetch` / `bytedcli primus log get` resolve role-row `logUrl` values into log pages, file lists, and matched file content.

All commands are read-only. Prefer `--url` when the user gives a full History/UI URL; otherwise pass `--vdc` and `--app-id`. CloudNative app ids are normalized with `-pj` automatically. Yarn `application_...` ids require `--host` or `--url`.

For host-specific routing, gzip handling, and log-resolution notes, read `references/primus.md`.

## Quick Start

```bash
bytedcli primus summary get --vdc GL --app-id demo-app-pj
bytedcli --json primus summary get --url 'https://primushistory.example/jobhistory/app/demo-app-pj/'

bytedcli primus job get --kind env --vdc GL --app-id demo-app-pj
bytedcli primus job get --kind overview --vdc GL --app-id demo-app-pj
bytedcli primus job get --kind status --vdc GL --app-id demo-app-pj
bytedcli primus job get --kind cluster --vdc GL --app-id demo-app-pj

bytedcli primus pod list --vdc GL --app-id demo-app-pj --role dispatcher --state ALL
bytedcli primus log list --vdc GL --app-id demo-app-pj --role dispatcher --state ALL --fetch
bytedcli primus log get --vdc GL --app-id demo-app-pj --role dispatcher --state ALL --file-pattern '_dispatcher\.log|stderr\.log|syslog\.log'
bytedcli primus log get --vdc GL --app-id demo-app-pj --role NorbertDriver --state ALL --file-pattern 'stdout\.log'
bytedcli primus log get --vdc GL --app-id demo-app-pj --role stream --state ALL --file-pattern 'dataio.*\.log\.INFO' --start '0-200000'

bytedcli primus task list --vdc GL --app-id demo-app-pj
bytedcli primus task build --vdc GL --app-id demo-app-pj --page-size 100
bytedcli primus devops crd list --vdc GL --app-id demo-app-pj
bytedcli primus devops pod list --vdc GL --app-id demo-app-pj
bytedcli primus devops lifecycle get --vdc GL --app-id demo-app-pj --pod-name demo-pod
bytedcli primus devops pod-status get --vdc GL --app-id demo-app-pj --pod-name demo-pod

bytedcli primus export --vdc GL --app-id demo-app-pj --output-dir /tmp/primus-dump
bytedcli primus export --vdc GL --app-id demo-app-pj --output-dir /tmp/primus-dump --fetch-logs

bytedcli primus url get --kind overview --vdc GL --app-id demo-app-pj
bytedcli primus url get --kind pods --vdc GL --app-id demo-app-pj --role dispatcher --state ALL
bytedcli primus raw get --kind pod-status --vdc GL --app-id demo-app-pj --pod-name demo-pod
```

## Command Selection

- Use `summary get` first for broad task inspection. It fetches AM env, UI overview, raw status, and role names.
- Use `export` for handoff or wider debugging. It writes `env.json`, `overview.json`, `status.json`, role row files, `tasks.json`, `crds.json`, `cluster.json`, and `logs-index.json`.
- Use `job get --kind env|status|overview|cluster` for job-level History metadata.
- Use `task list/build` for task table rows and TaskBuild timeline rows.
- Use `devops pod list`, `devops crd list`, `devops lifecycle get`, and `devops pod-status get` for DevOps-side diagnostics.
- Use `pod list` for one role page and `log list` when you need normalized log records. Add `--fetch` to resolve `logUrl` through the Primus frontend log route and parse the resulting page into `logFiles`: CN/standard and ROW rows follow `log.html -> kubernetesLog -> mljob`; TTP/EU-TTP rows with a known mljob origin follow `redirect_log.html -> PROXY_URL redirect -> concrete files`.
- Use `log get` when you need actual file content such as `stderr.log`, `syslog.log`, `stdout.log`, dataio logs, or role-specific logs under `/var/log/tiger`. It defaults to the first abnormal row, then falls back to the first matching row. CN/standard and ROW rows fetch content from the resolved Primus/mljob URL; TTP/EU-TTP rows resolve through `redirect_log.html` and use the built-in Footprint download path for concrete file URLs. Use `--start <range>` when fetching the beginning or middle of a concrete file: direct mljob reads support `-N` and `A-B`, while Footprint-backed reads also accept `0` and `A-`. Without `--start`, direct mljob tail previews are expanded to the full file only when the parsed file size fits within `--log-limit-bytes`; larger files keep the tail preview and return a hint with the recommended `--start '<offset>-<offset+limit>'` range form. If JSON shows `logSource: "primus-redirect"` with `logResolutionStatus: "no-files"`, the redirect list returned no concrete files; do not treat the Argos/streamlog URL as raw Primus log content. If JSON shows `logResolutionStatus: "landing-only"`, try a more specific `--pod-name`, `--row-index`, or `--file-pattern` before concluding the logs are unavailable.
- Use `raw get --kind <kind>` only as an escape hatch for an exact History JSON endpoint.
- Use `url get --kind <kind>` to generate the exact History or UI URL without fetching it.

## Important Options

- Common selectors: `--url`, `--vdc`, `--app-id`, `--host`, `--row`.
- HTTP controls: `--header 'Name: value'`, `--timeout-ms <ms>`.
- Role rows: `--role`, `--state`, `--page-size`, `--page`, `--search`, `--sort-order`.
- Collection commands: `--max-pages`, `--log-limit-bytes`.
- Log files: `--pod-name`, `--row-index`, `--file-pattern`, `--max-files`, `--start`.
- DevOps endpoints: `--devops-app-id`, `--no-include-doctor`.

## Notes

- `job get --kind env` uses the AM `environment.json` endpoint and may contain sensitive values. Share summarized findings rather than raw env dumps.
- `job get --kind overview` is `newStatus.json?from=page`; `job get --kind status` is raw `newStatus.json`.
- `pod list`, `log list`, and `log get` use `newStatus.json?from=page&role=<role>`.
- `--url` and `--host` accept only known Primus History/UI host forms; use `--vdc` and `--app-id` for generated hosts.
- `0` and `-1000` exit codes are usually normal. `137`, `-137`, `9`, and `-9` usually indicate OOM or kill unless the diagnosis field says otherwise.
- Do not guess raw paths like `/log/<pod>.log` or `logs-index.json` on History. Use `log list --fetch` or `log get`; if Primus returns `logResolutionStatus: "landing-only"` or `logSource: "primus-redirect"` with `logResolutionStatus: "no-files"`, state that bytedcli could not resolve concrete file links for that selected row. Argos/streamlog tenant-query URLs are not raw Primus executor log sources.

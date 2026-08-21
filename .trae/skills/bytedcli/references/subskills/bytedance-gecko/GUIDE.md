---
name: bytedance-gecko
description: "Use bytedcli gecko commands to query Gecko CN read-only resources, including diagnostics, apps, projects, deployments, channels, channel overview enrichments, offline rule trees, offline packages, workflows, tags, scans, stats, files, logs, and patches."
---

# bytedcli Gecko CN

## Invocation

```bash
bytedcli --site cn gecko <resource> <action> [options]
```

## Quick start

```bash
bytedcli --site cn gecko diagnostics get --include-root-users --include-dependency
bytedcli --site cn gecko app list --query demo-app
bytedcli --site cn gecko project list --query demo-project --include-subscription
bytedcli --site cn gecko project get --project-id sample-project-id --include-deployments
bytedcli --site cn gecko project admins --project-id sample-project-id
bytedcli --site cn gecko project apps --project-id sample-project-id
bytedcli --site cn gecko channel list --query demo-channel --include-projects
bytedcli --site cn gecko channel get --channel-id sample-channel-id --include-config --include-groups --include-admins
bytedcli --site cn gecko channel get --channel-id sample-channel-id --include-optional-config
bytedcli --site cn gecko channel resolve --access-key redacted-access-key --channel-name demo-channel
bytedcli --site cn gecko channel groups --channel-id sample-channel-id
bytedcli --site cn gecko channel admins --channel-id sample-channel-id
bytedcli --site cn gecko channel patrol --channel-id sample-channel-id --status TO_BE_FIX
bytedcli --site cn gecko channel traffic-switch --channel-id sample-channel-id
bytedcli --site cn gecko deployment get --access-key redacted-access-key
bytedcli --site cn gecko offline tree --channel-id sample-channel-id --include-packages --include-package-details
bytedcli --site cn gecko offline tree --access-key redacted-access-key --channel-name demo-channel --include-workflows
bytedcli --site cn gecko offline package list --channel-id sample-channel-id --page 1 --page-size 10
bytedcli --site cn gecko offline package list --access-key redacted-access-key --channel-name demo-channel --status 6 --include-rule-path
bytedcli --site cn gecko offline package get --package-id sample-package-id --include-files --include-logs --include-patches
bytedcli --site cn gecko offline package files --package-id sample-package-id
bytedcli --site cn gecko offline package logs --package-id sample-package-id
bytedcli --site cn gecko offline package patches --package-id sample-package-id
bytedcli --site cn gecko offline package scan --package-id sample-package-id
bytedcli --site cn gecko offline package tags --package-id sample-package-id
bytedcli --site cn gecko offline package rule-path --package-id sample-package-id
bytedcli --site cn gecko offline package workflows --package-id sample-package-id
bytedcli --site cn gecko offline package tickets --package-id sample-package-id
bytedcli --site cn gecko offline package stats --package-id sample-package-id --access-key redacted-access-key
```

## Notes

- This command set is read-only.
- Auth uses ByteCloud JWT with `x-jwt-token`; run `bytedcli --site cn auth login` if auth is missing or expired.
- Commands that mirror URL-style Gecko pages generally accept either `--channel-id` or `--access-key` + `--channel-name`.
- Expensive page enrichments are explicit: use project `--include-subscription` / `--include-deployments`, channel list `--include-subscription` / `--include-projects`, and channel get `--include-config` / `--include-deployment` / `--include-groups` / `--include-admins` only when those fields are needed.
- Offline package `--status` accepts comma-separated numeric codes or Chinese labels: `1=处理中`, `2=处理失败`, `3=待发布`, `4=实验中`, `5=灰度中`, `6=全量`, `7=已关闭`, `8=部分清理`, `9=全量清理`.
- `offline package stats` calls the monitor usage-stats endpoint and can be slow; keep it explicit instead of using it in default package detail reads.
- Text output avoids access keys, TOS URLs, package schemas, and patch download URLs by default. Use `--json` when raw fields are required for automation.

# Examples & best practices

## Query tips

- Keep queries short and specific (`< 3` features), e.g. `"form validation usage"`.
- Avoid long compound queries; split complex questions into several simple searches.

## Tool selection

- **Default**: `deepwiki search` (summary) — fast answer + referenced files.
- **Need raw doc text**: `deepwiki search --format snippets`, then `deepwiki get-content --doc-id <id>`.
- **Need source-located depth**: `deepwiki analyze` (slower; needs a pre-built index).
- **Unknown collection**: check [collections.md](collections.md), else `deepwiki get-collection`.

## Scenario 1 — company infra docs (Semi Design)

```bash
bytedcli --json deepwiki search --query "Form Checkbox usage" --collection-name DouyinFE_semi_design --limit 15
```

## Scenario 2 — understand a module in a repo

```bash
bytedcli --json deepwiki analyze --query "topic module location and features" \
  --repo-name owner/repo --repo-url https://code.byted.org/owner/repo.git
```

## Scenario 3 — find where a feature lives across repos

```bash
bytedcli --json deepwiki business-graph search --query "user authentication module" --no-repo
```

## Scenario 4 — changes for a specific requirement / MR

```bash
bytedcli --json deepwiki business-graph search --query "checkout changes" \
  --repo-name owner/repo --meego-id 12345 --mr-number 456
```

## Scenario 5 — repo not indexed yet

`deepwiki analyze` auto-triggers a build and returns immediately when the repo has no index. To trigger explicitly and watch progress:

```bash
bytedcli --json deepwiki index create --repo-url https://code.byted.org/owner/repo.git --repo-path owner/repo
bytedcli --json deepwiki index list --status running
```

## Source verification

DeepWiki indexes can lag. After `search` / `business-graph` return file paths, verify with local `Read` / `Grep` before relying on them. `analyze` reads source live and is more reliable, but still spot-check critical code.

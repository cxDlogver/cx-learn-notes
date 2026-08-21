# Fornax via bytedcli

`bytedcli fornax` proxies to `fornax-cli`. Use the Fornax CLI command surface as the default.

## Recommended commands

- Auth: uses `bytedcli auth login|logout|status` (unified authentication)
- Config: `fornax config set|show|select-workspace`
- Workspace: `fornax workspace list`
- Prompt: `fornax prompt list|get-by-key|get-by-id|create|delete|draft|commit|release`
- Trace/span: `fornax trace get|list`, `fornax span ...`
- Experiment: `fornax experiment submit|detail|results|agg-results|retry`
- Other resources: `dataset`, `eval-set`, `evaluator`, `experiment-template`, `model`, `skill`, `synthesis`, `training-dataset`
- Help/completion: `fornax <command> --help`, `fornax completion bash|zsh|fish|powershell`

## Common setup

```bash
bytedcli auth login
bytedcli fornax config set workspace-id <workspace-id>
bytedcli auth status
```

AK/SK setup:

```bash
bytedcli fornax config set ak <ak>
bytedcli fornax config set sk <sk>
```

Help and completion:

```bash
bytedcli fornax prompt --help
bytedcli fornax completion zsh
```

## Prompt examples

```bash
bytedcli --json fornax prompt list --keyword demo --page-no 1 --page-size 20
bytedcli --json fornax prompt get-by-key --key demo_key
bytedcli --json fornax prompt get-by-id --prompt-id <prompt-id> --with-draft --with-commit
bytedcli --json fornax prompt draft save --prompt-id <prompt-id> --draft-file ./draft.json
bytedcli --json fornax prompt draft commit --prompt-id <prompt-id> --version 1.0.0
bytedcli --json fornax prompt release create --prompt-id <prompt-id> --commit-version 1.0.0 --env online --release-config @./release.json
```

## Trace examples

```bash
bytedcli --json fornax trace get --trace-id <trace-id> --last-n-minutes 30
bytedcli --json fornax trace get --log-id <log-id>
bytedcli --json fornax trace list --last-n-minutes 60 --page-size 10
```

## Experiment examples

```bash
bytedcli --json fornax experiment submit --name demo --eval-set-id <eval-set-id> --eval-set-version 1.0.0 --evaluator <evaluator-id>:<version> --target-type coze_loop_prompt --target-id <target-id>
bytedcli --json fornax experiment detail --experiment-id <experiment-id>
bytedcli --json fornax experiment results --experiment-id <experiment-id> --page-no 1 --page-size 20
bytedcli --json fornax experiment agg-results --experiment-id <experiment-id>
bytedcli --json fornax experiment retry --experiment-id <experiment-id> --retry-mode retry_all
```

## Skill examples

```bash
bytedcli --json fornax skill list --page-size 20
bytedcli --json fornax skill get --skill-id <skill-id>
bytedcli fornax skill install demo-skill --dir ~/.codex/skills
```

## Migration aliases

These aliases still run during migration and print deprecation guidance to stderr:

```bash
bytedcli fornax list-workspace
bytedcli fornax list-prompt --space-id <workspace-id>
bytedcli fornax get-prompt --space-id <workspace-id> --prompt-id <prompt-id>
bytedcli fornax create-prompt --space-id <workspace-id> --prompt-key team.demo.prompt --display-name "Demo Prompt"
bytedcli fornax update-prompt --space-id <workspace-id> --prompt-id <prompt-id> --message-list-file ./messages.json
bytedcli fornax publish-prompt --space-id <workspace-id> --prompt-id <prompt-id> --target online --version 1.0.1
bytedcli fornax experiment create --request-file ./experiment.json
bytedcli fornax experiment get --workspace-id <workspace-id> --experiment-id <experiment-id>
bytedcli fornax experiment aggr-results --workspace-id <workspace-id> --experiment-id <experiment-id>
bytedcli fornax trace --logid <logid>
bytedcli fornax trace-chain-diagnosis --trace-id <trace-id>
```

## Output contract

- Text mode appends `--format pretty` unless `--format` is already present.
- `bytedcli --json fornax ...` appends `--format raw`.
- Deprecation notices and installer logs use stderr.
- Missing `fornax-cli` triggers the official installer, then bytedcli resolves the binary again.

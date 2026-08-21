---
name: emo-scm-noninteractive
description: Use when an Eden/EMO monorepo build command blocks on the prompt `Please choose a scm name to build locally` and the repo exposes a stable scm entry that can be selected non-interactively.
---

# EMO SCM Non-Interactive

## Overview

Use the repo's declared SCM key to bypass the local `emo scm` interactive selector without editing business scripts.

This skill is only for deterministic cases. If the repo has multiple SCM entries or the target entry is unclear, stop and ask instead of guessing.

## When To Use

- `emo scm` or an equivalent EMO pipeline command blocks on `Please choose a scm name to build locally`
- The repo is an Eden/EMO monorepo with `eden.mono.pipeline.json`
- `scene.scm` contains exactly one stable key, or the required key is explicitly known
- The goal is to run the original build command in automation, verify, or CI-like local shells

Do not use this when:

- The build tool is not `emo` / Eden monorepo
- `scene.scm` has multiple possible keys and no project-approved default exists
- The only way forward would be modifying repo scripts just to skip the prompt

## Quick Method

1. Inspect `eden.mono.pipeline.json` and confirm the scm key.
2. Keep the original command name unchanged for reporting purposes.
3. Run the command with `BUILD_REPO_NAME=<scm-key>` in the same shell.

Example:

```bash
source ~/.nvm/nvm.sh && nvm use 18 && BUILD_REPO_NAME=ecom/alliance_operation_mono/mono emo scm
```

## Recording Rule

When used inside `/delivery:verify` or `/delivery:code`, record both:

- `command`: the original protocol command, for example `emo scm`
- `execution_ref`: the non-interactive wrapper actually executed, for example `BUILD_REPO_NAME=ecom/alliance_operation_mono/mono emo scm`

## Safety Checks

- Prefer `BUILD_REPO_NAME` over sending blind keystrokes.
- Only fall back to newline / enter confirmation when the selector has a single visible default and the env-var path is unavailable.
- Never hardcode a guessed scm key without evidence from repo config or project context.

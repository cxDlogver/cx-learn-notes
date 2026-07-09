---
name: git-commit-proposal
description: Prepare reviewed git commit proposals without committing automatically. Use when Codex needs git 提交建议, commit message generation, staged-change review, test summary, or confirmation-gated git commit preparation.
---

# Git Commit Proposal

## Workflow

1. Inspect git status and the relevant diff before proposing a commit.
2. Summarize changed behavior, changed files, test results, and residual risks.
3. Generate one concise commit message that matches the repository's style when discoverable.
4. Do not run `git add`, `git commit`, `git push`, `git reset`, or destructive git commands unless the user explicitly confirms.
5. If the user confirms committing, stage only the intended files and commit with the proposed or user-approved message.

## Mandatory Gate

Before any actual commit command, show:

```text
⚠️ 危险操作检测！
操作类型：git commit
影响范围：将当前确认范围内的变更写入本地 Git 历史
风险评估：提交内容或提交信息错误会污染历史，需要后续修正

请确认是否继续？[需要明确的"是"、"确认"、"继续"]
```

Proceed only after explicit confirmation.

## Output Contract

Return:

- `stage_result`: Commit proposal with summary, intended files, test status, and recommended commit message.
- `open_questions`: Ambiguous staging, untracked files, unrelated changes, or missing test confirmation.
- `risks`: Dirty worktree risks, unrelated changes, failed checks, or commit scope concerns.
- `next_stage_input`: Confirmation request or final commit result if explicitly approved.

Never auto-commit just because tests passed.

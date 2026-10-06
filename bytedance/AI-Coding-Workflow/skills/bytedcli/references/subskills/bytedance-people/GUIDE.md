---
name: bytedance-people
description: "Use bytedcli people commands for ByteDance People self-service leave workflows, including querying self leave records and applying for a single full-day or half-day leave with explicit --yes confirmation."
---

# bytedance-people

Use this skill when a task mentions People leave, 请假, 年假, 病假, 半天假, 全天假, leave records, or applying for leave in `people.bytedance.net`.

## Commands

```bash
# Query self leave records
bytedcli people leave list --start-date 2026-06-03 --end-date 2026-06-03
bytedcli --json people leave list --start-date 2026-06-03 --page-size 100

# Preflight a single full-day leave application. This does not submit.
bytedcli people leave apply \
  --date 2026-06-03 \
  --full-day \
  --leave-type "Annual Leave"

# Submit a full-day leave only after the user explicitly confirms the live action.
bytedcli people leave apply \
  --date 2026-06-03 \
  --full-day \
  --leave-type "Annual Leave" \
  --yes

# Preflight a single half-day leave application. This does not submit.
bytedcli people leave apply \
  --date 2026-06-03 \
  --half-day pm \
  --leave-type fully-paid-sick \
  --comment "身体不适"

# Submit a half-day leave only after the user explicitly confirms the live action.
bytedcli people leave apply \
  --date 2026-06-03 \
  --half-day pm \
  --leave-type fully-paid-sick \
  --comment "身体不适" \
  --yes
```

## Guidance

- `people leave list` reads the current account's leave records for a date range.
- `people leave apply` supports one same-day leave request at a time. Pass exactly one of:
  - `--full-day` for one full-day record from AM to PM.
  - `--half-day am` or `--half-day pm` for one half-day record.
- Write behavior is guarded: without `--yes`, the command validates the leave type/time, prints the planned request, and shows the exact confirmation command.
- Use `--leave-type "Annual Leave"`, `fully-paid-sick`, `sick`, `病假`, the People leave type ID, or the exact display name.
- The applicant user id is normally inferred from existing self leave records. If the account has no readable records, pass `--applicant-user-id <id>`.
- Authentication reuses the Feishu Web session saved by `bytedcli auth login --session --feishu`.
- If People reports a time conflict, the command blocks submission by default. Use `--allow-conflict` only when the user explicitly wants to submit despite that validation warning.

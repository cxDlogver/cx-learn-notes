# People Commands

People commands are grouped under `people` and backed by People web APIs on `people.bytedance.net`.
Authentication reuses the Feishu Web session saved by `bytedcli auth login --session --feishu`.

## people leave list

Query self leave records for a date range.

```bash
bytedcli people leave list --start-date 2026-06-03 --end-date 2026-06-03
bytedcli --json people leave list --start-date 2026-06-03 --page-size 100
```

Options:

- `--start-date <YYYY-MM-DD>`: required start date.
- `--end-date <YYYY-MM-DD>`: optional end date, defaults to `--start-date`.
- `--page <n>`: 1-based page number.
- `--page-size <n>`: page size.

Text output shows record ID, leave type, time, duration, status, and notes. JSON output returns `records`, `page`, `page_size`, and backend `total` when present.

## people leave apply

Apply for a single same-day leave record. The default mode is preflight only.

```bash
bytedcli people leave apply \
  --date 2026-06-03 \
  --full-day \
  --leave-type "Annual Leave"

bytedcli people leave apply \
  --date 2026-06-03 \
  --full-day \
  --leave-type "Annual Leave" \
  --yes

bytedcli people leave apply \
  --date 2026-06-03 \
  --half-day pm \
  --leave-type fully-paid-sick \
  --comment "身体不适"

bytedcli people leave apply \
  --date 2026-06-03 \
  --half-day pm \
  --leave-type fully-paid-sick \
  --comment "身体不适" \
  --yes
```

Options:

- `--date <YYYY-MM-DD>`: leave date.
- `--full-day`: one full-day record from AM to PM.
- `--half-day <am|pm>`: one half-day record, morning or afternoon.
- `--leave-type <type>`: People leave type ID, display name, or alias such as `Annual Leave`, `fully-paid-sick`, `sick`, or `病假`.
- `--comment <text>`: leave application comment.
- `--applicant-user-id <id>`: People applicant user id; inferred from self leave records when omitted.
- `--yes`: submit the live People leave application.
- `--allow-conflict`: submit despite People time validation warnings; use only after explicit user confirmation.

Pass exactly one of `--full-day` or `--half-day <am|pm>`. Without `--yes`, the command validates the request and prints `next_command`. With `--yes`, the command submits and then refreshes the day's records to show matching leave records.

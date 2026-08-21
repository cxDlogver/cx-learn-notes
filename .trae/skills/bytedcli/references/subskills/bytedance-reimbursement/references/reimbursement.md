# Reimbursement Commands

Reimbursement commands are grouped under `reimbursement` and backed by Hi Travel APIs.
Authentication uses the Travel session cached by bytedcli first. If that cache is missing or expired, run `bytedcli auth login --session`; reimbursement commands exchange that stored SSO browser session for `travel.bytedance.com` cookies.

```bash
bytedcli auth login --session
bytedcli reimbursement auth logout
bytedcli --json reimbursement list --page 1 --page-size 10
bytedcli --json reimbursement get --id <reimbursement_union_id>
bytedcli --json reimbursement detect --id <reimbursement_union_id>
bytedcli --json reimbursement delete --id <reimbursement_union_id> --yes
bytedcli --json reimbursement submit --id <reimbursement_union_id> --yes
```

AI subscription reimbursement draft:

```bash
bytedcli --json reimbursement ai-subscription create \
  --receipt ./sample-receipt.pdf \
  --attachment ./sample-payment-proof.png \
  --attachment ./sample-subscription-detail.pdf \
  --date 2026-05-07 \
  --invoice-amount 200 \
  --claim-ratio 0.5
```

Key options:

- `--receipt <path>`: exactly one primary receipt/invoice used to create the manual invoice snapshot.
- `--attachment <path>`: supplemental expense attachment such as payment proof. Repeat the flag for multiple files; files remain in CLI input order and are not registered as extra invoices.
- `--product <chatgpt|claude>`: AI product on the expense row (default `chatgpt`). Also drives the default title.
- `--currency <code>`: receipt/consumption currency (default `USD`).
- `--claim-currency <code>`: settlement currency the claim is paid in (default `CNY`). When it equals `--currency`, no FX conversion is applied (rate = 1).
- `--claim-ratio <ratio>`: reimbursed share, e.g. `0.5`.

Non-CN-settled employees (e.g. SGD-settled TikTok/i18n) should pass `--claim-currency` matching their settlement currency and usually run with `--site i18n-tt`:

```bash
bytedcli --site i18n-tt --json reimbursement ai-subscription create \
  --receipt ./sample-receipt.png \
  --date 2026-05-25 \
  --invoice-amount 300 \
  --currency SGD \
  --claim-currency SGD \
  --product claude \
  --claim-ratio 0.5
```

---
name: bytedance-reimbursement
description: "Use bytedcli reimbursement commands for reimbursement workflows backed by Hi Travel, including listing reimbursement forms, reading details, running pre-submit detection, deleting drafts, explicit submit, and preparing AI subscription reimbursement drafts from receipt files."
---

# bytedance-reimbursement

Use this skill when a task mentions Hi Travel, 报销, reimbursement, invoice/receipt attachment, or AI subscription reimbursement.

## Commands

```bash
# List and inspect reimbursement forms
bytedcli --json reimbursement list --page 1 --page-size 10
bytedcli --json reimbursement get --id <reimbursement_union_id>

# Run pre-submit detection
bytedcli --json reimbursement detect --id <reimbursement_union_id>

# Delete or close a draft after the user explicitly confirms the live action
bytedcli --json reimbursement delete --id <reimbursement_union_id> --yes

# Prepare an AI subscription reimbursement draft from a receipt plus payment proof
# (defaults: --product chatgpt, --claim-currency CNY)
bytedcli --json reimbursement ai-subscription create \
  --receipt ./sample-receipt.pdf \
  --attachment ./sample-payment-proof.png \
  --date 2026-05-07 \
  --invoice-amount 200 \
  --claim-ratio 0.5

# Non-CN-settled employee paying in a local currency (e.g. SGD-settled, Claude): pick the product
# and set --claim-currency to the settlement currency so no CNY conversion is applied.
bytedcli --site i18n-tt --json reimbursement ai-subscription create \
  --receipt ./sample-receipt.png \
  --date 2026-05-25 \
  --invoice-amount 300 \
  --currency SGD \
  --claim-currency SGD \
  --product claude \
  --claim-ratio 0.5

# Submit only after the user explicitly confirms the live action
bytedcli --json reimbursement ai-subscription create \
  --receipt ./sample-receipt.png \
  --date 2026-05-07 \
  --invoice-amount 200 \
  --claim-ratio 0.5 \
  --submit \
  --yes
```

## Guidance

- Authentication resolves the Travel session in this order:
  1. bytedcli's local cache (refreshed within the past 6 hours).
  2. Chrome's persistent cookie store. When stdin/stdout are a TTY, bytedcli reads `TRAVEL_SESSION` for `travel.bytedance.com` from Chrome's local cookie SQLite store, decrypting via macOS Keychain `Chrome Safe Storage`. On first use the OS shows one Keychain prompt — click "Always Allow" once and the cookie is reused thereafter. Set `BYTEDCLI_DISABLE_CHROME_COOKIE_STORE=1` to skip this path.
  3. Chrome CDP. If a Chromium-based browser is running with `--remote-debugging-port` open (defaults probed: `9222`, `19825`; override via `BYTEDCLI_REIMBURSEMENT_CDP_PORT`), bytedcli reads the existing `TRAVEL_SESSION` over CDP without launching Chrome or touching Keychain. This path is the recommended primary in agent / CI / non-TTY environments and runs automatically when the cookie-store path is skipped.
  4. SSO redirect chain backed by `bytedcli auth login --session`. Kept as a last resort; the upstream Travel site is now a single-page app, so this path is rarely able to mint a fresh `TRAVEL_SESSION` by itself.
- Onboarding: open `https://bytedance.feishu.cn` → Workspace → Reimbursement in Chrome once a year so the mini-program login refreshes `TRAVEL_SESSION` in Chrome's cookie store. bytedcli reads it from there on subsequent runs.
- `ai-subscription create` defaults to preparing a draft/update and running detection; it does not submit unless both `--submit` and `--yes` are present.
- `--receipt` accepts exactly one primary receipt or invoice. Repeat `--attachment <path>` for payment proof, subscription details, or other supplemental files. The receipt alone creates the manual invoice snapshot; the expense attachment list contains the receipt followed by all supplemental files in CLI input order. Do not merge these materials into one file.
- `reimbursement delete` also has the `close` alias and requires `--yes`; use it only for drafts that should be removed.
- Use `--template-reimbursement-id` when you want to clone stable AI expense fields from a prior successful form.
- Use `--reimbursement-id` when the draft already exists and only the receipt, invoice, amount, or expense row should be updated.
- `--invoice-amount` is the full receipt amount. The expense claim uses `--claim-ratio` and is expressed in `--claim-currency`.
- `--product` selects the AI product on the expense row (`chatgpt` default, or `claude`). The default title is derived from the product (e.g. `Claude 订阅报销`); pass `--title` to override. Reporting the wrong product (e.g. a Claude receipt left as the default ChatGPT) is a common cause of `单据校验失败` on detect.
- `--claim-currency` is the settlement currency the claim is paid in (`CNY` default). When it equals `--currency`, no FX conversion is applied (rate = 1) and the claim stays in that currency; otherwise the Travel exchange-rate API converts the consumption currency into `--claim-currency`. Employees settled outside CNY (e.g. an SGD-settled TikTok/i18n employee) should pass `--claim-currency` matching their settlement currency, and usually run with `--site i18n-tt` so the command authenticates against the right SSO environment.

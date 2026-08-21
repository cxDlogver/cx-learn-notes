---
name: ask-first-service-runtime
metadata:
  version: "1.0"
description: Use when an Ask First decision package or card must be delivered through Feishu, including runtime config, local secret bootstrap, receiver resolution, long-connection startup, card sending, callback handling, text fallback, feedback persistence, resume markers, or recovering submitted Ask First data.
---

# Ask First Service Runtime

This skill runs the Ask First service loop after `ask-first` has produced `ask-first-request.md` and `ask-first-card.json`. It handles configuration, startup, Feishu delivery, callback receipt, fallback parsing, data persistence, and resume signaling. It does not create or rewrite the decision questions; use `ask-first` for question refinement and card layout.

## Required Inputs

Before touching runtime, confirm the artifact workspace contains:

- `ask-first-request.md`
- `ask-first-card.json`
- `prd-notes.md`
- `decision-log.md`
- `uncertainty-register.md`
- `.trae/DELIVERY_STATE.md`

If `ask-first-request.md` or `ask-first-card.json` is missing, stop and use `ask-first` first.

## Runtime Files And Scripts

Use the repository-provided runner:

- `.trae/scripts/ask_first_runner/README.md`
- `.trae/scripts/ask_first_runner/ask_first_long_connection.py`
- `.trae/scripts/ask_first_runner/bootstrap_runtime_config.py`
- `.trae/scripts/ask_first_runner/requirements.txt`
- `.trae/config/ask-first-runtime.example.json`
- `.trae/config/ask-first-runtime.local.json`

Use [reference/ask-first-callback-plan-template.md](reference/ask-first-callback-plan-template.md) when creating or updating `<workspace>/ask-first-callback-plan.md`.
Use [reference/runtime-callback-examples.md](reference/runtime-callback-examples.md) only when validating callback payloads or frozen-card responses.

## Security Contract

- Never ask the user to paste `APP_SECRET` into chat.
- Never write `APP_SECRET`, tokens, cookies, or credentials into Markdown, runtime config, card JSON, logs, PRD artifacts, or command history.
- Runtime config may store non-sensitive values, environment variable names, or macOS Keychain references.
- If a secret was pasted into chat or logs, tell the user to rotate it before continuing.

Preferred local bootstrap:

```bash
python3 .trae/scripts/ask_first_runner/bootstrap_runtime_config.py \
  --app-id <app_id> \
  --receiver-query "<name-or-email>"
```

The bootstrap command prompts locally for the secret, stores it in Keychain, and writes `.trae/config/ask-first-runtime.local.json`, which must stay ignored by git.

## Runtime Workflow

1. **Preflight artifacts**
   - Parse `request_id`, `decision_ids`, `artifact_workspace`, `resume_command`, and `next_command_after_pass` from `ask-first-request.md` / `ask-first-card.json`.
   - Fail closed if `next_command_after_pass` is missing. Do not let the runner fall back to `/delivery:plan`; repair the Ask First package or routing evidence first.
   - Check that card fields match the request: `af_001_choice`, matching custom input fields, and stable `ask_first_submit` callback value.
   - Respect the current `ask-first` card contract for input capacity. Runtime must not assume older shorter limits; multiline custom input fields with `max_length: 1000` are valid.
   - Check that the submit callback value carries the same `request_id` and `next_command_after_pass` as the local request file. Local artifacts remain authoritative if the client value differs.
   - Write or update `ask-first-callback-plan.md`.

2. **Resolve runtime config**
   - Confirm `.trae/config/ask-first-runtime.local.json` exists and contains only allowed secret references.
   - If missing, guide the user through `bootstrap_runtime_config.py`; do not retry sending until the user confirms config is ready.
   - Install runner dependencies only if missing:

     ```bash
     python3 -m pip install -r .trae/scripts/ask_first_runner/requirements.txt
     ```

3. **Resolve receiver**
   - Prefer runtime config receiver settings.
   - If a query is provided, the runner resolves it with the equivalent of `lark-cli contact +search-user --as user --format json`.
   - If multiple users match, stop and ask for an exact `open_id` or more precise query. Do not guess.

4. **Start callback path and send**
   - Normal mode must start the long-connection receiver before sending the card:

     ```bash
     python3 .trae/scripts/ask_first_runner/ask_first_long_connection.py \
       --workspace <workspace> \
       --runtime-config .trae/config/ask-first-runtime.local.json
     ```

   - `--send-only` is for debugging send capability only and does not satisfy the Ask First closure.
   - `--no-send` is for waiting on an already-sent compatible card.
   - Record message id, receiver, request id, selected mode, send result, and render fallback status in `prd-notes.md` and `ask-first-callback-plan.md`.
   - Keep the long-connection process alive until one of these terminal states is true:
     - matching callback was processed and `ask-first-feedback.json` plus `ask-first-resume-request.json` were written; once written, the current runner should disconnect and exit so it does not remain as a stale listener for the finished `request_id`;
     - text fallback answers were persisted through the runner;
     - the user explicitly asks to stop the listener.
   - Silence while the user is reading or considering answers is normal. Do not ask whether they want to switch to current-chat confirmation, text fallback, or another answer channel merely because a short time passed without callback activity.
   - Do not stop the listener only because the send response body or message preview says `请升级至最新版本客户端`. That preview is not proof that interactive submission is impossible.
   - If resending a card, make the new card visibly distinct, such as adding `（重发 HH:MM）` to the title or instruction text, and record the new `open_message_id`. Tell the user to submit only the marked latest card.

5. **Pause and wake up**
   - Mark `.trae/DELIVERY_STATE.md` paused while waiting for the user.
   - If Codex automation tools are available, create a heartbeat that watches:
     - `<workspace>/ask-first-resume-request.json`
     - `<workspace>/ask-first-feedback.json`
     - `.trae/DELIVERY_STATE.md`
   - Wake only when `ask-first-resume-request.json.status = READY` and `request_id` matches. If automation is unavailable, record `WAKEUP_AUTOMATION_UNAVAILABLE` and require the user to re-run the resume command.

6. **Process callback or fallback**
   - Accept only `card.action.trigger` callbacks with matching `request_id`.
   - Use `event.header.event_id + request_id` for idempotency.
   - Validate required fields and non-empty custom input for `D`, downgrade, skip, wait-for-info, or custom choices.
   - On success, the runner writes:
     - `ask-first-feedback.json`
     - `ask-first-resume-request.json`
     - `ask-first-events.jsonl`
     - `decision-log.md`
     - `prd-notes.md`
     - `uncertainty-register.md`
     - `.trae/DELIVERY_STATE.md`
   - On validation failure, return an error toast and keep the card editable.

7. **Triage stale-card and listener errors**
   - User sees `忽略其他 Ask First 请求`: treat it as a stale card / stale runner / request-id mismatch until proven otherwise. Inspect the active runner request id, latest sent `open_message_id`, and `ask-first-events.jsonl`; then resend a visibly marked fresh card with the listener alive.
   - User sees `目标回调服务未在线`: the card was submitted while its callback listener was offline or unavailable. Restart the long connection and resend a fresh marked card; keep the listener alive through submission.
   - Before resending, check for residual Ask First runner processes. Stop stale runners that are waiting on older request ids or obsolete cards, but do not stop the current live runner while the user may still submit its card.
   - If multiple cards exist, never ask the user to “try any card”. Always identify the latest marked card and record its `open_message_id`.

8. **Resume routing**
   - Read `ask-first-resume-request.json` and `.trae/DELIVERY_STATE.md`.
   - Continue only if there is no unanswered P0.
   - Route to the target command from local state, usually `/delivery:bam` when BAM links are present or `/delivery:plan` otherwise.
   - Do not trust client-submitted `resume_command` over local artifacts.

## Text Fallback

Text fallback is allowed only when:

- The user explicitly requests current-chat confirmation, or
- A live listener is online, the user submits the latest marked card, and submit still fails with no matching callback event recorded, or
- Long connection and developer-server callback paths are unavailable with evidence.

Before fallback:

- Record whether the listener was online, which `open_message_id` was tested, and what the user saw.
- Stop the old runner only after choosing text fallback as the terminal recovery path. Do not stop a listener for a card the user may still submit.
- Record failure evidence in `ask-first-callback-plan.md` and `prd-notes.md`.
- Do not proactively re-ask the user “continue with card or switch to chat” while they may still be considering answers. Only ask that question after the user explicitly reports submit trouble, requests text mode, or the runtime has evidence that callback delivery is unavailable.
- Ask the user to answer in a runner-compatible shape:

```text
AF-001=A; AF-002=C; AF-003=D; AF-003_custom_input=真实接口接入，数据统计后置
```

Persist fallback through the runner, not by hand:

```bash
python3 .trae/scripts/ask_first_runner/ask_first_long_connection.py \
  --workspace <workspace> \
  --fallback-form-value 'AF-001=A; AF-002=C; AF-003=D; AF-003_custom_input=真实接口接入，数据统计后置'
```

## Callback Plan Fields

`ask-first-callback-plan.md` must cover:

| Field | Requirement |
| --- | --- |
| selected_mode | `LONG_CONNECTION` / `DEVELOPER_SERVER` / `TEXT_FALLBACK` |
| card_send_capability | command/API used, interactive support, dry-run or send result |
| long_connection_probe | app type, app id source, secret source, SDK availability, callback subscription, ready log |
| developer_server_probe | public URL, challenge response, security strategy, response SLA |
| fallback_reason | filled only for text fallback |
| live_listener_lifecycle | latest runner pid / request id / open_message_id, whether listener stayed online until callback or fallback |
| stale_card_triage | old message ids, stale runner actions, latest marked card instruction |
| recovery_condition | what must be fixed to return to Feishu card closure |
| thread_wakeup | heartbeat availability, marker path, target command, fallback if unavailable |

## Service Completion Gate

Before reporting runtime completion:

- `ask-first-feedback.json` exists for submitted answers.
- `ask-first-resume-request.json` exists and matches `request_id`.
- `decision-log.md` contains `## Ask First Decisions` entries for all answered decisions.
- `prd-notes.md` contains feedback source, final decisions, impact on plan, and runtime dispatch notes.
- `uncertainty-register.md` reflects deferred or still-blocked items.
- `.trae/DELIVERY_STATE.md` is unpaused only when the Ask First result permits continuation.
- The card is frozen after successful submission, or text fallback evidence is recorded.

If any item fails, keep the workflow paused and fix through the runner or callback path. Do not hand-edit success markers to bypass runner validation.

## Final Output

Report only:

```md
## Ask First Service
- Result: SENT / PASS / BLOCKED / TEXT_FALLBACK
- Request: <request_id>
- Workspace: <workspace>
- Feedback: <ask-first-feedback.json or pending>
- Resume Marker: <ask-first-resume-request.json or pending>
- Next: <target command or waiting reason>
```

Do not include secrets, tokens, or raw callback payloads in the final response.

# Ask First Callback Plan Template

Use this shape for `<workspace>/ask-first-callback-plan.md`.

```md
# Ask First Callback Plan

- request_id:
- generated_at:
- selected_mode: `LONG_CONNECTION` / `DEVELOPER_SERVER` / `TEXT_FALLBACK`
- receiver:
- resume_command:

## Card Send Capability

| item | value |
|---|---|
| tool |  |
| supports_interactive | yes/no |
| send_command_or_api |  |
| dry_run_result |  |
| message_id_after_send |  |
| render_fallback_detected | yes/no/unknown |
| latest_open_message_id |  |

## Long Connection Probe

| item | value |
|---|---|
| applicable | yes/no |
| app_type | enterprise self-built / unknown / not-supported |
| app_id_source | env / runtime-config-env / user-provided / missing |
| app_secret_source | keychain / env / secret-manager-env / missing |
| runtime_config_path | `.trae/config/ask-first-runtime.local.json` / none |
| secret_storage | `APP_SECRET` not stored in repo/artifacts yes/no |
| sdk_or_cli |  |
| subscribed_callback | `card.action.trigger` yes/no/unknown |
| ready_log |  |
| blocker |  |

## Developer Server Probe

| item | value |
|---|---|
| applicable | yes/no |
| public_callback_url |  |
| url_verification | pass/fail/not-run |
| challenge_response_sla | within 1s yes/no |
| security_strategy | signature / verification_token / encrypted |
| callback_response_sla | within 3s yes/no |
| blocker |  |

## Fallback Judgment

| item | value |
|---|---|
| fallback_allowed | yes/no |
| fallback_reason | long_connection_failed / developer_server_failed / card_render_fallback_detected / user_submit_failed / user_requested_text / none |
| failed_message_id |  |
| events_file_status | missing / no_matching_event / failed_event / processed |
| text_fallback_command | `.trae/scripts/ask_first_runner/ask_first_long_connection.py --workspace <workspace> --fallback-form-value '<answers>'` |
| recovery_condition |  |

## Thread Wakeup

| item | value |
|---|---|
| heartbeat_available | yes/no |
| heartbeat_name | Ask First Resume <request_id> |
| resume_marker | `<workspace>/ask-first-resume-request.json` |
| wake_condition | `status=READY` and `request_id` matches |
| target_command_after_wakeup |  |
| fallback_if_unavailable | 人工重新输入 `/delivery:prd` |

## Runtime Contract

- Accepted callback type: `card.action.trigger`
- Idempotency key: `event.header.event_id + request_id`
- Local source of truth: `ask-first-request.md` and `.trae/DELIVERY_STATE.md`
- Required successful writes before unpausing: `ask-first-feedback.json`, `ask-first-resume-request.json`, `decision-log.md`, `prd-notes.md`, `uncertainty-register.md`, `.trae/DELIVERY_STATE.md`
```

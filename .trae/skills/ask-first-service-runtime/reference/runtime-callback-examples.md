# Ask First Runtime Callback Examples

Use these examples only while validating the service runtime. Question wording and card layout belong to `ask-first`.

## Submit Callback Shape

Parse only callbacks whose `event_type` is `card.action.trigger` and whose `request_id` matches the active `ask-first-request.md`.

```json
{
  "schema": "2.0",
  "header": {
    "event_id": "f7984f25108f8137722bb63c",
    "event_type": "card.action.trigger",
    "create_time": "1781772411000000"
  },
  "event": {
    "operator": {
      "open_id": "ou_xxx"
    },
    "token": "c-xxx",
    "action": {
      "tag": "button",
      "name": "ask_first_submit",
      "value": {
        "request_id": "ask_first_20260618_001",
        "stage": "/delivery:prd",
        "resume_command": "/delivery:bam",
        "decision_ids": ["AF-001", "AF-002"]
      },
      "form_value": {
        "af_001_choice": "B",
        "af_001_custom_input": "",
        "af_002_choice": "D",
        "af_002_custom_input": "补充 Figma node 后继续"
      }
    },
    "host": "im_message",
    "context": {
      "open_message_id": "om_xxx",
      "open_chat_id": "oc_xxx"
    }
  }
}
```

## Callback Responses

Success response: show toast and replace the card with a submitted state.
The replacement card is deliberately raw and non-interactive. It should display the submitted choices and any custom input, but must not include `form`, `select_static`, `input`, `button`, or `form_action_type`.

```json
{
  "toast": {
    "type": "success",
    "content": "已提交，正在推进 PRD 后续阶段"
  },
  "card": {
    "type": "raw",
    "data": {
      "schema": "2.0",
      "header": {
        "title": {
          "tag": "plain_text",
          "content": "PRD 决策已提交"
        },
        "template": "green"
      },
      "body": {
        "elements": [
          {
            "tag": "markdown",
            "content": "你的选择已记录。我会按这些选择继续整理后续方案。"
          }
        ]
      }
    }
  }
}
```

Validation error response: keep the card editable and tell the user what to fix.

```json
{
  "toast": {
    "type": "error",
    "content": "你选择了补充说明，请先填写输入框再提交"
  }
}
```

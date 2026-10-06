# Ask First 飞书长连接运行器

`.trae/scripts/ask_first_runner/ask_first_long_connection.py` 用于把当前 `.trae/artifacts/<task>/ask-first-card.json` 发送为飞书交互卡片，并通过飞书长连接接收 `card.action.trigger` 提交回调。用户提交后，运行器会把决策写回当前 PRD 阶段产物。

## 安装依赖

```bash
python3 -m pip install -r .trae/scripts/ask_first_runner/requirements.txt
```

## 前置条件

- 飞书应用是企业自建应用。
- 开放平台已选择“使用长连接接收回调”。
- 应用已订阅“卡片回传交互”回调并发布生效。
- 应用具备给目标用户发送消息的权限。
- 不要把 `APP_SECRET` 写入 Markdown、产物文件、runtime config 或命令历史；标准流程从 macOS Keychain 或环境变量读取。
- 如果曾把 `APP_SECRET` 发到聊天、日志或文档里，请在飞书开放平台旋转密钥后再接入自动流程。

## 安全配置

可提交的模板放在 `.trae/config/ask-first-runtime.example.json`。实际运行时复制为 `.trae/config/ask-first-runtime.local.json`，该本地文件已被 `.trae/.gitignore` 忽略。

`example.json` 不参与运行，只是给新环境复制/生成配置时参考。runner 真正读取的是 `--runtime-config` 指向的文件，标准路径是 `.trae/config/ask-first-runtime.local.json`。

runtime config 只能保存环境变量名、Keychain 引用和非敏感接收人配置。例如 env 模式：

```json
{
  "app_id_env": "ASK_FIRST_APP_ID",
  "app_secret_env": "ASK_FIRST_APP_SECRET",
  "receiver": {
    "type": "email",
    "email": "your.email@bytedance.com"
  }
}
```

macOS 本地推荐使用 Keychain 模式，local config 类似：

```json
{
  "app_id": "cli_xxx",
  "app_secret_keychain": {
    "service": "trae.ask-first.ask-first-runner",
    "account": "cli_xxx"
  },
  "receiver": {
    "type": "email",
    "email": "your.email@bytedance.com"
  }
}
```

这里也不保存 `APP_SECRET` 明文，只保存 Keychain 的 service/account 引用。

推荐优先使用 `receiver.type = email`，尤其是“给自己发卡片”的场景。这样会直接以 `receive_id_type=email` 发消息，避免把别的 app 视角下的 `open_id` 拿来给当前 Ask First app 发消息。

`receiver.type = contact_query` 只适合按姓名等信息查询联系人。运行器会在发送前执行等价于下面的查询，并从结果中提取唯一 `open_id`：

```bash
lark-cli contact +search-user --query "测试同事" --as user --format json
```

如果匹配到多个用户，运行器会失败并要求改用 `receiver.type = open_id` 或 `--receiver-open-id` 精确指定。

## 启动

### macOS Keychain 初始化

新环境推荐先运行 bootstrap。它会提示你隐藏输入 `APP_SECRET`，把 secret 写入本机 Keychain，并生成 `.trae/config/ask-first-runtime.local.json`：

```bash
python3 .trae/scripts/ask_first_runner/bootstrap_runtime_config.py \
  --app-id <app_id> \
  --receiver-query "your.email@bytedance.com"
```

生成后可直接启动 runner，不需要再 `export ASK_FIRST_APP_SECRET`：

```bash
python3 .trae/scripts/ask_first_runner/ask_first_long_connection.py \
  --workspace .trae/artifacts/7283871565-daren-public-opinion-iteration \
  --runtime-config .trae/config/ask-first-runtime.local.json
```

### 环境变量模式

在 CI 或其他 secret manager 已经注入环境变量的环境中，也可以使用 env 模式：

```bash
env | grep '^ASK_FIRST_APP_ID='
test -n "$ASK_FIRST_APP_SECRET" && echo "ASK_FIRST_APP_SECRET is set"
```

```bash
python3 .trae/scripts/ask_first_runner/ask_first_long_connection.py \
  --workspace .trae/artifacts/7283871565-daren-public-opinion-iteration \
  --runtime-config .trae/config/ask-first-runtime.local.json
```

正常启动后会先在后台启动长连接接收器，确认接收器进程仍在运行后再发送卡片，然后主线程持续等待 `card.action.trigger` 回调。请保持终端不要关闭，直到用户在飞书卡片里完成选择并点击提交。

发送响应或消息预览里出现“请升级至最新版本客户端”不等于交互回调一定不可用。只要长连接仍在线，应继续等待用户提交，并以是否收到匹配 `request_id` 的 `card.action.trigger` 作为真实判断依据。不要因为该预览文案提前停止监听。

## 常用参数

- `--workspace`：必填，Ask First 产物目录。
- `--delivery-state`：可选，默认使用当前根目录 `.trae/DELIVERY_STATE.md`。
- `--runtime-config`：可选，推荐使用 `.trae/config/ask-first-runtime.local.json`；文件内不得出现 `app_secret` 明文。
- `bootstrap_runtime_config.py`：macOS 本地初始化脚本，用 Keychain 保存 secret，并写入被忽略的 local config。
- `--no-send`：只启动长连接，不重复发送卡片。
- `--send-only`：只发送卡片，不启动长连接，仅用于调试发送能力；PRD 闭环不要使用。
- `--simulate-callback <json>`：离线处理一个回调 JSON，用于本地验证。
- `--fallback-form-value <json|@file|shorthand>`：当飞书卡片无法渲染、无法提交或回调通道不可用，并且 `ask-first-callback-plan.md` 已记录降级原因时，使用当前对话文本答案走同一套校验和落盘逻辑。例如 `--fallback-form-value 'AF-001=A; AF-002=C; AF-003=A'`。
- `--fallback-source`：文本降级来源标识，默认 `TEXT_FALLBACK_CURRENT_CHAT`。
- `--receive-id-type`：默认 `open_id`，也可发送给 `email`、`chat_id` 等目标类型。
- `--receiver-id`：覆盖接收人；未传时使用 `ASK_FIRST_RECEIVER_OPEN_ID`。
- `--receiver-query`：兼容输入。若值看起来像邮箱，运行器会直接按 `receive_id_type=email` 发送；否则按姓名等信息查询联系人并解析唯一 `open_id`，底层使用 `lark-cli contact +search-user --as user --format json`。
- `--app-id` / `--app-secret`：仅保留给临时调试；正式流程使用 Keychain、本机 secret manager，或 `ASK_FIRST_APP_ID` / `ASK_FIRST_APP_SECRET` env 名。
- `--receiver-startup-grace-seconds`：正常模式下发送卡片前等待接收器启动的秒数，默认 `2.0`。

## 提交后的卡片状态

回调校验成功后，运行器会返回 `card.type = raw` 的新卡片，用“已提交 / 下一步 / 已提交内容”替换原表单卡片。新卡片会展示每项选择、最终策略、补充说明和状态，但不包含 `form`、`select_static`、`input`、`button` 或 `form_action_type`，用户不能再次编辑或提交。

## 文本降级

文本降级只能作为终端恢复路径使用。以下情况才允许降级：

- 用户明确要求在当前对话确认；
- 长连接保持在线，用户提交最新标记卡片后仍显示“提交失败”，且没有收到匹配 `request_id` 的 `card.action.trigger`；
- 长连接和开发者服务器回调路径都有明确不可用证据。

仅看到“请升级至最新版本客户端”的发送响应或消息预览时，不要降级，不要停止监听。

如果需要重发，先确认旧 runner / 旧卡状态，停止等待旧 request 的残留 runner，再发送带可见标记的新卡（例如标题加 `重发 HH:MM`），并记录新的 `open_message_id`。如果用户看到“忽略其他 Ask First 请求”，优先按旧卡或 request_id 不匹配排查；如果用户看到“目标回调服务未在线”，优先按监听未在线排查。

确认进入文本降级后，不要继续反复重发同一张卡片。先在 `ask-first-callback-plan.md` 和 `prd-notes.md` 记录失败证据，再让用户在当前对话中用短格式回答：

```text
AF-001=A; AF-002=C; AF-003=A
```

然后执行：

```bash
python3 .trae/scripts/ask_first_runner/ask_first_long_connection.py \
  --workspace <workspace> \
  --fallback-form-value 'AF-001=A; AF-002=C; AF-003=A'
```

文本降级仍会调用 `parse_form_value`、`persist_feedback`、`update_delivery_state`，并写入 `ask-first-feedback.json`、`ask-first-resume-request.json`、`decision-log.md`、`prd-notes.md` 和 `ask-first-events.jsonl`。选择 `D` 时仍必须提供 `AF-001_custom_input=...`。

## 唤醒主智能体

Python 运行器不能直接调用 Codex App 的线程唤醒工具。成功处理回调后，它会写入 `ask-first-resume-request.json`，作为主智能体 heartbeat 的通用唤醒 marker。

PRD 工作流发送卡片后，应由主 Agent 创建或更新附着当前线程的 heartbeat。heartbeat 只需要轮询当前 workspace：

- `ask-first-resume-request.json`
- `ask-first-feedback.json`
- `.trae/DELIVERY_STATE.md`

当 `ask-first-resume-request.json.status = READY` 且 `request_id` 匹配时，heartbeat 恢复当前线程并继续执行 marker 中的 `target_command`。成功写入该 marker 后，当前 long-connection runner 应主动断开并退出，避免同一个 `request_id` 的旧 listener 残留在本机继续拦截后续回调。如果当前运行环境不支持 heartbeat/automation，才降级为人工重新输入 `/delivery:prd`。

## 写回文件

成功提交后会写入或更新：

- `ask-first-feedback.json`
- `ask-first-resume-request.json`
- `ask-first-events.jsonl`
- `decision-log.md`
- `prd-notes.md`
- `uncertainty-register.md`
- `.trae/DELIVERY_STATE.md`

如果校验失败，运行器会返回 error toast，卡片保持可编辑。

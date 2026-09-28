---
name: bytedance-auth
description: "Operate bytedcli authentication flows. Use when user asks to login/logout, check auth status, fetch user info, or prepare ByteCloud Auth for ByteDance internal APIs."
---

# bytedcli 认证/SSO

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- 登录/登出
- 查看登录状态或用户信息
- 获取 SSO/Bytecloud token

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Before login: 先复用，不要直接 login

`bytedcli auth login` 不是无害命令——它按当前 `--site` 触发一轮新的 OAuth/扫码/浏览器交互，**默认 `--site` 是 `cn`**。下面三种情况非常常见，直接 `auth login` 会引发不必要的重新认证：

- 用户实际工作在 i18n（`i18n-tt`、`eu-ttp` 等）站点，但没设 `BYTEDCLI_CLOUD_SITE`，也没传 `--site`。直接 `bytedcli auth login` 会把凭证写到 `cn` 那一份，下次操作 i18n 仍然提示「未认证」。
- 默认 `auth login`（不带 `--session`）其实是幂等的：本地凭证有效时直接打印 `Already authenticated as ...` 并 return。如果没意识到这一点，会把它当成「会重新弹码」的命令而提前回避或反复执行。
- 同一 SSO 群组下 `cn` 与 `i18n-bd` 共享登录态、`i18n-tt` 与 `eu-ttp` 共享登录态。已登 `cn` 的用户访问 `i18n-bd` 通常不需要重新登。

执行 login **之前**先按下面顺序排查：

```bash
# 1. 当前默认 site 是否已认证（不会触发登录）
bytedcli --json auth status

# 2. 若 status=need_login，再分别按候选 site 查一遍，找出能复用的
BYTEDCLI_CLOUD_SITE=cn bytedcli --json auth status
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli --json auth status
BYTEDCLI_CLOUD_SITE=i18n-bd bytedcli --json auth status

# 3. 确认目标 site 真的不可用后，才执行 login，并显式带上 --site
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login
```

i18n 员工建议把 `export BYTEDCLI_CLOUD_SITE=i18n-tt` 写进 shell rc，避免每条命令都漏带 `--site`。

## Quick start

```bash
bytedcli auth login
bytedcli auth login --session
bytedcli auth login --session --feishu
bytedcli auth login --session --auto
bytedcli auth login --session --session-method browser-cookie --browser vivaldi --yes
bytedcli auth login --session --session-method interactive-browser --yes
bytedcli auth login --session --session-method password --username demo.user
bytedcli auth export
bytedcli auth export --out ~/sample-bytedcli-backup.json.gz
bytedcli auth import --from ~/sample-bytedcli-backup.json.gz
bytedcli auth import --from ~/sample-bytedcli-backup.json.gz --dry-run
bytedcli --json auth login --begin
bytedcli --json auth login --complete <token>
bytedcli auth login --no-terminal-qr
bytedcli auth login --qr-image
bytedcli --json auth login
bytedcli auth status
bytedcli auth userinfo
bytedcli auth logout
bytedcli auth get-bytecloud-jwt-token
bytedcli auth get-codebase-jwt-token
```

## Notes

- 未登录会提示 `Not authenticated`
- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json auth status`）
- `auth login --session` 会优先复用本地已有且仍有效的浏览器态 SSO session；若不存在或已失效，再按当前站点的默认 session method 获取新的浏览器态 session，并保存到本地，供 `tce webshell` 等依赖网页登录态的能力复用
- `auth login --session --feishu` 只在 `cn` 站点可用，会切到飞书二维码 / OAuth 路径；阻塞式二维码路径会复用同一次飞书扫码，同时准备 SSO browser session 和额外的 Feishu web session
- 二维码 session 登录命中 ByteDance SSO 或 Feishu OAuth 时，文本输出、`--json auth login --begin --session` 结果和 `qr_image_ready` 事件都会包含 `lark_applink_url`，可在 PC 飞书侧边栏直接打开同一个登录页
- 默认执行 `auth login --session` 时，CLI 会直接走 `qr`（保留老行为）；如果当前站点不支持 QR，交互终端下会弹出 `qr`/`browser-cookie`/`interactive-browser`/`password` 菜单让用户临时选一个，并提示下次加 `--auto` 让 CLI 自动挑一条可用路径；`qr` 在所有 site 上都可以显式尝试，但它是否可用取决于具体账号/环境，部分用户可能失败
- 显式加上 `--auto` 后，CLI 才会自动选择一条 session 登录路径：若检测到本机浏览器 cookie store，会优先尝试 `browser-cookie`；否则回退到 `qr`。在 `cn` 站点，browser-cookie miss 后会直接回退到普通 SSO `qr`；只有显式加 `--feishu` 才会走飞书扫码路径。其他站点的 `--auto` 才会继续回退到 `interactive-browser`。但在 macOS 的 JSON/非交互环境中，如果没有显式 `--yes`，CLI 会避免无提示触发 Keychain 访问，改为回退到 `qr`
- 显式选择 `browser-cookie` 时，CLI 会检测本机支持的浏览器 cookie store；如果发现多个，会继续让用户选择具体浏览器；如果只有一个，则直接使用该浏览器。显式 `browser-cookie` 失败时不会再自动回退到 `interactive-browser`；若需要这种兜底行为，请改用 `--auto`，或显式切到 `--session-method interactive-browser`。显式选择 `browser-cookie` 或 `interactive-browser` 时，CLI 会先说明即将执行的动作，再要求二次确认；在 JSON/非交互环境中，需要显式追加 `--session-method` 或 `--auto`，其中显式 `browser-cookie` / `interactive-browser` 都需要 `--yes`，而 `--browser` 只在可能同时检测到多个支持浏览器时才需要
- 显式选择 `password` 时，仅支持 ByteDance SSO（`cn` / `i18n-bd`）；`--username` 可传邮箱前缀或完整邮箱，密码和 OTP 从终端读取且不会存储，只保存最终 SSO browser session
- 如果当前环境无法直接访问本机浏览器 cookie（例如开发机、OpenClaw），可先在个人电脑导出全量数据：`auth export --out <path>`，再在目标环境导入：`auth import --from <path>`
- `auth export` 导出 bytedcli 数据目录（`~/.local/share/bytedcli/data/`）中的 auth、session、config 类文件为 gzip 压缩归档；cache 与临时文件不包含在内
- `auth export` 不带 `--out` 时自动写入系统临时目录。`--dry-run` 仅预览。`auth import --from <path>` 从归档还原，不做远端验证
- 对 agent/脚本，优先使用 `--json auth login --begin` 启动 ByteCloud Auth 非阻塞登录，再用 `--json auth login --complete <token>` 轮询完成；`--complete` 未授权时会返回 pending 并立即退出
- `--json auth login --begin` 可选加 `--session` 用于 browser session 场景；它不会像阻塞式 `auth login --session` 一样继续等待并自动补完整个登录流程，但这条 session 非阻塞链路只支持二维码方式，不支持 `--session-method browser-cookie|interactive-browser|password`、`--browser` 或 `--feishu`
- `auth login --no-terminal-qr` 会关闭终端二维码，并在未显式传入 `--qr-image` 时自动生成临时 PNG 路径
- `auth login --qr-image [path]` 可额外把二维码保存为 PNG；省略 path 时会自动写入系统临时目录，适合异步扫码登录流程
- 在 macOS 的非 TTY 人类交互场景下，如需自动用 Preview 打开刚生成的二维码 PNG，可显式设置 `BYTEDCLI_OPEN_QR_IMAGE=1`；默认仍只打印保存路径，避免无提示触发本地 GUI 副作用
- `--json auth login` 会自动关闭终端二维码，并默认生成临时二维码图片，便于 agent/脚本消费 `qr_image_ready`
- `auth logout` 默认清理 ByteCloud Auth SDK 登录态并保留本机 service-account 初始化信息；需要同时清理 service-account 时显式追加 `--reset-service-account`
- **SSO Token 按 SSO 环境缓存**（bytedance / tiktok / test 三组独立存储）
- **登录阶段**：`auth login` 默认使用 ByteCloud Auth；`auth login --session` 根据 `--site` 推导默认 SSO（`cn`/`i18n-bd` → ByteDance；`i18n-tt` → TikTok；`boe` → BOE）。可用 `--auth-site bytedance|tiktok|test` 显式覆盖 session 使用的 SSO
- **API 调用阶段**：需要 ByteCloud JWT 的服务优先使用显式 JWT override / 环境变量，其次从 ByteCloud Auth SDK 读取当前 site 的凭据；browser session 能力仍使用 `auth login --session` 保存的 SSO session/cookie
- `auth status` 显示 ByteCloud Auth 登录状态，并保留所有 3 个 SSO 环境的 session/token 状态
- 跨 site 调用时，CLI 会按目标 site 向 ByteCloud Auth SDK 请求对应凭据；某个 site 不可用时，先按 [Before login](#before-login-先复用不要直接-login) 流程在候选 site 上 `auth status` 排查可复用凭据，再决定是否对该 site 执行 `auth login`
- 若显式 JWT override 不可用，`auth get-bytecloud-jwt-token` 会按 `BYTEDCLI_USER_CLOUD_JWT -> AIME_USER_CLOUD_JWT` 自动回退读取环境变量，再尝试 ByteCloud Auth 凭据
- 操作目标站点前，按 [Before login](#before-login-先复用不要直接-login) 流程先用 `auth status` 排查再决定是否 `auth login`

## References

- `references/auth.md`

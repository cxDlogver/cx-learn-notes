---
name: bytedance-orthrus
description: "Skill for Orthrus 主机权限平台。Use when tasks mention Orthrus、host root permission、临时权限申请、owner_grant、_cas_session cookie、给某机器开 root/tiger 权限."
---

# Orthrus 主机权限

## 如何调用

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

- 作为服务树 owner / orthrus_loginer，给指定账号下发 root、tiger 等主机权限
- 想把"每 24 小时手动点 owner_grant"换成可脚本化的命令（再配合 cronjob/launchd 续期）
- 第一次接入：通过 `bytedcli orthrus auth-login --site i18n` 完成一次浏览器扫码，之后命令自动续 session

## 前置条件

- 你必须是目标主机在服务树上的 owner 或 orthrus_loginer，否则 API 会返回 `not_owned_hosts`。
- Orthrus 用 `_cas_sssion` cookie 认证。
- 单次最大授权时长是 24 小时，由 Orthrus 后端强制，无法绕过。要续期请配合 cron 自动重发。

## 认证

推荐路径（i18n）：

```bash
# 一次性，浏览器扫码，约 14 天免重复登录
bytedcli orthrus auth-login --site i18n
```

`auth-login` 会用 puppeteer 打开 Chrome 让你完成 TikTok SSO，之后捕获：

- `_cas_sssion` orthrus session cookie（~7 天 TTL）→ 后续 owner-grant 自动复用
- `bd_sso_*` TikTok SSO cookies（~14 天 TTL）→ 即使 session 过期，CLI 也会用 SSO cookie 走 CAS 自动续 session，期间不再开浏览器

CN / TTP site 目前没有 `auth-login` 集成（不同 SSO realm），仍走显式 `--cookie`。

显式 cookie（任何 site 都可用）：

1. 浏览器登录 Orthrus，DevTools → Application → Cookies → 复制 `_cas_sssion` 的 name+value
2. 任选一种传入：
   - `--cookie '_cas_sssion=demo-token'`
   - env `BYTEDCLI_ORTHRUS_COOKIE_<SITE>='_cas_sssion=demo-token'`
   - 配合 `--save-cookie` 持久化到 `~/.local/share/bytedcli/data/orthrus_session.<site>.json`

## 常用命令

```bash
# 查看帮助
bytedcli orthrus --help
bytedcli orthrus owner-grant --help
bytedcli orthrus auth-login --help

# 一次性浏览器扫码（i18n），约 14 天免重复登录
bytedcli orthrus auth-login --site i18n

# 登录之后直接 grant，不再需要任何 --cookie
bytedcli orthrus owner-grant \
  --site i18n \
  --account demo-user-1,demo-user-2 \
  --host 10.0.0.1 \
  --role root \
  --timeout 24

# 显式传 cookie（任何 site 都可用）
bytedcli orthrus owner-grant \
  --site i18n \
  --account demo-user-1 \
  --host 10.0.0.1 \
  --cookie '_cas_sssion=demo-token'

# 持久化 cookie 到本地，后续运行不再需要 --cookie
bytedcli orthrus owner-grant \
  --site i18n \
  --account demo-user-1 \
  --host 10.0.0.1 \
  --cookie '_cas_sssion=demo-token' \
  --save-cookie

# 在脚本里禁用浏览器自动 fallback（cookie/缓存都没有时，直接报错而不是打开 Chrome）
bytedcli orthrus owner-grant \
  --site i18n \
  --account demo-user-1 \
  --host 10.0.0.1 \
  --no-interactive

# 走环境变量
BYTEDCLI_ORTHRUS_COOKIE_I18N='_cas_sssion=demo-token' \
  bytedcli orthrus owner-grant --site i18n --account demo-user-1 --host 10.0.0.1

# CN / TTP 站点（目前必须显式 cookie，auth-login 尚未支持这两个 site）
bytedcli orthrus owner-grant --site cn  --account demo-user --host demo-host.example.net --cookie '_cas_sssion=demo'
bytedcli orthrus owner-grant --site ttp --account demo-user --host demo-host.example.net --cookie '_cas_sssion=demo'

# 机器可读输出
bytedcli --json orthrus owner-grant --site i18n --account demo-user --host 10.0.0.1
```

## Sites

| --site | Host |
| ------ | ---- |
| `cn`   | `https://orthrus.byted.org` |
| `i18n` | `https://orthrus-i18n.tiktok-row.org` |
| `ttp`  | `https://orthrus-ttp.bytedance.net` |

## Cookie 来源优先级

1. `--cookie` flag
2. `BYTEDCLI_ORTHRUS_COOKIE_<SITE>` 环境变量（site 大写）
3. 已缓存的 session cookie `~/.local/share/bytedcli/data/orthrus_session.<site>.json`
4. 用已缓存的 SSO cookies `~/.local/share/bytedcli/data/orthrus_sso.<site>.json` 走 CAS 自动续 session（i18n only）
5. 打开浏览器扫码登录（i18n only；默认开启，加 `--no-interactive` 可关闭）

## 常见错误

- `Add up to only a maximum of 24 hours`：`--timeout` 超过 24，Orthrus 后端硬性限制。
- `not_owned_hosts` 非空：调用方不是该机器的 owner / orthrus_loginer。要么换 owner 来发，要么让真正的 owner 把你加为 orthrus_loginer。
- `Orthrus login required. Run: bytedcli orthrus auth-login --site i18n`：没有可用 cookie，也没有可用 SSO，被 `--no-interactive` 阻止了浏览器打开。按提示运行 `auth-login`。
- 接口 401 / 重定向到登录页：session 过期。命令会自动用 SSO cookies 走 CAS 续，续不动了再回到浏览器登录。
- `puppeteer is required for browser login`：本机没有 puppeteer。临时方案：手动从 Orthrus 控制台复制 cookie 配 `--cookie`；长期方案：`npm install -g puppeteer`。

## Agent Guidance

- 要续期 24h 权限，搭配本地 cron / launchd 定时跑 `bytedcli orthrus owner-grant ...`；cron 频率建议 12h 一次或更密，避免 mac 睡眠错过窗口。
- 不要把真实 cookie 写进对外文档、commit、issue。示例里只写 `_cas_sssion=demo-token` 这类占位值。
- 如果用户只是登录排查问题、不做破坏性操作，建议 `--role tiger` 而不是 `root`。

---
name: bytedance-cdn
description: "Operate ByteCloud CDN via bytedcli: list CDN domains and get domain detail configuration (origin, HTTPS, cache, compression); upload files (with optional archive extraction), delete, refresh and list files on the CDN upload service; apply for team-space file permissions. Use when tasks mention CDN domain lookup, CDN configuration, CDN CNAME, CDN certificate, CDN origin, fusion-cdn, CDN file upload, CDN upload, uploading static assets to CDN, or CDN team-space permission."
---

# bytedcli CDN

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

- 查询 CDN 域名列表（按域名关键词搜索）
- 查看 CDN 域名的详细配置（源站、HTTPS、缓存、压缩等）
- 确认域名是否被 CDN 系统托管（对比 CNAME 与实际 DNS 解析）
- 检查证书到期时间
- 上传文件到 CDN（单文件、压缩包解压上传）
- 删除、刷新 CDN 文件，列出 CDN 目录内容
- 申请 CDN 团队空间文件权限（管理员或只读）

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- `cdn domain` 命令（fusion-cdn 控制台）：
  - CN 站点需要 ByteDance SSO 登录：`bytedcli auth login`
  - i18n-tt 站点需要 TikTok SSO 登录：`bytedcli --site i18n-tt auth login`
- `cdn file` 命令（CDN 上传服务）：
  - 身份由 `--email` 承载，后端不校验；bytedcli 默认以本地登录用户身份操作，并在客户端侧拦截冒名与误删
  - 不传 `--email` 时回退到本地登录用户名拼 `@bytedance.com`；显式传他人邮箱（local-part 与登录用户不一致）直接报错拒绝（`CDN_IFE_IDENTITY_MISMATCH`），无放行开关，只能改用本人身份
  - `delete` 不可逆且仅限交互终端执行（弹 y/yes 确认）；JSON / 非交互（Agent / 脚本）场景一律抛 `CDN_IFE_CONFIRM_REQUIRED`、不能删除
  - 需在办公网/VPN 环境下执行（`ife.bytedance.net` 等 host 仅办公网可达）
  - 加密团队空间额外需要 `--cdn-token`（明文会进 shell history，建议用 `--cdn-token-file` 或环境变量 `BYTEDCLI_CDN_TOKEN`）
  - 团队空间权限申请走 ByteCloud BPM，需要 `bytedcli auth login`，并会提交审批工单

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# 查询域名列表（CN 站点，默认）
bytedcli cdn domain list --domain example.com

# 查询域名列表（i18n-tt 站点）
bytedcli --site i18n-tt cdn domain list --domain example.com

# 通过域名查看详细配置
bytedcli cdn domain get --domain example.com

# 通过 ID 查看详细配置
bytedcli cdn domain get --id cdn-112997

# JSON 输出
bytedcli --json cdn domain list --domain example.com
bytedcli --json --site i18n-tt cdn domain get --domain example.com

# 上传文件到 CDN（个人空间根目录）
bytedcli cdn file upload --file ./demo-icon.png

# 上传到团队空间指定目录
bytedcli cdn file upload --file ./demo-icon.png --team-space demo-team --dir assets

# 列出 CDN 目录内容
bytedcli cdn file list --dir assets

# 申请团队空间管理员权限
bytedcli cdn file permission apply --team-space demo-team --user demo.user --permission admin --region INTERNAL

# 申请团队空间只读权限
bytedcli cdn file permission apply --team-space demo-team --user demo.user --permission view --region INTERNAL
```

## Commands

### cdn domain list

列出 CDN 域名。

```bash
bytedcli cdn domain list [--domain <keyword>] [--page <n>] [--page-size <n>]
```

| 参数 | 说明 |
|------|------|
| `--domain` | 按域名关键词过滤（模糊匹配） |
| `--page` | 页码，默认 1 |
| `--page-size` | 每页条数，默认 10 |

### cdn domain get

查看 CDN 域名详细配置。支持 `--id` 或 `--domain` 二选一。

```bash
bytedcli cdn domain get --id <domain-id>
bytedcli cdn domain get --domain <domain-name>
```

| 参数 | 说明 |
|------|------|
| `--id` | CDN 域名 ID（如 cdn-112997） |
| `--domain` | 域名（精确匹配，先 list 再取 detail） |

输出包含：基本信息、源站配置、HTTPS/TLS 配置、缓存策略、压缩策略、IPv6/QUIC/WebSocket 状态。

### cdn file

CDN 文件操作，走 CDN 上传服务（与 `cdn domain` 的 fusion-cdn 控制台是不同 host、不同鉴权）。

所有 `cdn file` 子命令共用以下参数：

| 参数 | 说明 |
|------|------|
| `--dir` | 目标目录；个人空间直接填目录名，留空表示空间根目录 |
| `--team-space` | 团队空间名；传入时 `--dir` 解析为团队空间下的目录 |
| `--region` | 上传区域 `INTERNAL\|CN\|SG\|VA2`，默认 `CN` |
| `--email` | 用户邮箱，默认取本地登录用户；以他人身份操作直接报错拒绝 |
| `--cdn-token` | 加密团队空间的 `x-cdn-token`（明文，建议改用 `--cdn-token-file` / 环境变量 `BYTEDCLI_CDN_TOKEN`） |
| `--cdn-token-file` | 从文件读取 `x-cdn-token`，避免明文进 shell history |

```bash
# 上传单个文件
bytedcli cdn file upload --file <path> [--dir <dir>] [--team-space <name>] [--auto-refresh]

# 上传压缩包并解压（加 --unzip；--file 与 --url 二选一）
bytedcli cdn file upload --unzip --file <archive> [--dir <dir>]
bytedcli cdn file upload --unzip --url <archive-url> [--dir <dir>]

# 删除文件
bytedcli cdn file delete --file <name> [--dir <dir>] [--auto-refresh]

# 刷新文件
bytedcli cdn file refresh --file <name> [--dir <dir>]

# 列出目录内容
bytedcli cdn file list [--dir <dir>] [--team-space <name>]

# 申请团队空间权限
bytedcli cdn file permission apply --team-space <name> --user <username-or-email> --permission <admin|view> [--region <region>]
```

`upload` 默认上传单个文件，成功后返回 `cdnUrl`（完整 CDN 加速地址），JSON 模式下还包含 `domain` / `path` / `tosKey`；加 `--unzip` 时把上传内容当压缩包解压，返回解压后的文件 URL 列表。

`permission apply` 会先按 `--user` 做 ByteDance 用户预检，再提交 CDN 团队空间权限 BPM 工单。`--region` 支持 `INTERNAL|CN|SG|VA2`，可重复或逗号分隔，默认 `INTERNAL`；`--permission admin` 表示管理员权限，`--permission view` 表示只读权限。若用户搜索接口临时不可用，可加 `--skip-user-check` 直接提交工单。

## Agent Guidance

### 站点选择

- CN 域名（`*.bytedance.net`、`*.coze.cn` 等）使用默认 `--site cn`
- 海外域名（`*.coze.com`、`*.byteintl.net` 等）使用 `--site i18n-tt`
- i18n-tt 站点需要单独的 TikTok SSO 登录态

### 判断域名是否被 CDN 托管

1. 通过 `cdn domain get --domain <name>` 获取 CDN 系统中的 CNAME
2. 通过 `dig +short <name> CNAME` 获取实际 DNS 解析
3. 若两者一致，说明域名已被 CDN 系统托管，证书可自动续期
4. 若 CDN 中找不到该域名，则未托管

### CDN 文件上传

- `cdn file` 的 `--region` 决定请求 host：`INTERNAL`/`CN` 走 `ife.bytedance.net`，`SG`/`VA2` 走 `ife-cdn.byteintl.net`；与 `cdn domain` 的 `--site` 互不影响。
- 上传服务为弱鉴权：身份由 `--email` 承载且后端不校验。bytedcli 默认以本地登录用户身份操作；显式传他人邮箱（local-part 与登录用户不一致）直接报错拒绝（`CDN_IFE_IDENTITY_MISMATCH`，无放行开关）。**不要为了让命令通过而随手填别人的 `--email`**：以本人身份操作即可，去掉 `--email` 会自动用登录用户。
- `delete` 不可逆且仅限交互终端执行：JSON / 非交互（Agent / 脚本）场景一律抛 `CDN_IFE_CONFIRM_REQUIRED`、无法删除——删除 CDN 文件不开放给自动化，需由人在交互终端确认。
- 上传内容即公网可读（返回 `cdnUrl` 无签名、无过期）：不要上传密钥、token、个人隐私或未脱敏的内部数据。
- 团队空间不要手写固定前缀，统一用 `--team-space <name>` + `--dir <subdir>`，CLI 会自动拼接。
- 报错提示“团队空间已被加密”时，补 `--cdn-token <token>` 重试；`--cdn-token` 是团队级共享凭据，不要写进命令行明文（会进 shell history），改用 `--cdn-token-file <path>` 或环境变量 `BYTEDCLI_CDN_TOKEN`。
- `upload --unzip --url <url>` 会由 CDN 服务端去拉取该 URL，只传可信来源。
- 给团队空间加权限时使用 `cdn file permission apply`。它创建 BPM 工单而不是直接改权限；输出中的 `ticket_url` / `record_id` 用于后续审批跟踪。
- `upload --unzip` 的压缩包应为扁平结构（文件直接在包根目录）；若包内含顶层目录，服务端只解压根层文件，目录内条目不会落地，返回的 URL 列表也会相应为空。
- 上传服务仅面向 QPS ≤ 10 的内部低频场景；对外业务或高 QPS 上传应改用 TOS。

### 常见错误

- `Not authenticated`：需要登录对应站点，提示中包含完整登录命令
- `Domain "xxx" not found`：该域名在指定站点的 CDN 系统中不存在，尝试切换站点
- `cdn file` 请求超时/不可达：确认当前在办公网或 VPN 环境

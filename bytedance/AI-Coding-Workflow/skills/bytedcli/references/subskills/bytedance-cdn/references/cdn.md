# bytedcli CDN 命令参考

## cdn domain list

列出 CDN 域名，支持关键词过滤。

```bash
# 默认查 CN 站点
bytedcli cdn domain list --domain api.coze.cn

# 查 i18n-tt 站点
bytedcli --site i18n-tt cdn domain list --domain api.coze.com

# 分页
bytedcli cdn domain list --domain coze --page 1 --page-size 20

# JSON 输出
bytedcli --json cdn domain list --domain api.coze.cn
```

输出字段：ID, Name, Status, CNAME, Owner

## cdn domain get

查看单个域名的完整 CDN 配置。

```bash
# 通过 ID
bytedcli cdn domain get --id cdn-157402

# 通过域名（精确匹配）
bytedcli cdn domain get --domain api.coze.cn

# i18n-tt 站点
bytedcli --site i18n-tt cdn domain get --domain api.coze.com

# JSON 输出（适合程序消费）
bytedcli --json cdn domain get --domain api.coze.cn
```

输出包含：
- 基本信息：ID, Name, Status, CNAME, Owner, Host, CreatedAt, UpdatedAt
- Origin：源站列表、端口、SNI
- HTTPS：启用状态、HTTP/2、OCSP、TLS 版本、证书 ID 与过期时间
- Compression：Gzip、Brotli
- Cache：FollowOrigin、RemoveQueryParams
- 其他：IPv6、QUIC、WebSocket

## cdn file

CDN 文件操作，走 CDN 上传服务，需在办公网/VPN 环境执行。共用参数：`--dir`、`--team-space`、`--region`（`INTERNAL|CN|SG|VA2`，默认 `CN`）、`--email`、`--cdn-token`、`--cdn-token-file`。

```bash
# 上传单个文件到个人空间根目录
bytedcli cdn file upload --file ./demo-icon.png

# 上传到团队空间指定目录并自动刷新
bytedcli cdn file upload --file ./demo-icon.png --team-space demo-team --dir assets --auto-refresh

# 上传海外区域（host 自动切到 ife-cdn.byteintl.net）
bytedcli cdn file upload --file ./demo-icon.png --region SG

# 上传压缩包并解压（本地包，加 --unzip）
bytedcli cdn file upload --unzip --file ./demo-bundle.zip --dir assets

# 上传压缩包并解压（远端 URL）
bytedcli cdn file upload --unzip --url https://example.com/demo-bundle.zip --dir assets

# 删除文件（不可逆，仅交互终端可执行，会弹 y/yes 确认；脚本 / JSON / 非 TTY 会报错拒绝）
bytedcli cdn file delete --file demo-icon.png --dir assets --auto-refresh

# 刷新文件
bytedcli cdn file refresh --file demo-icon.png --dir assets

# 列出目录内容
bytedcli cdn file list --dir assets

# 申请团队空间管理员权限
bytedcli cdn file permission apply --team-space demo-team --user demo.user --permission admin --region INTERNAL

# 申请团队空间只读权限
bytedcli cdn file permission apply --team-space demo-team --user demo.user --permission view --region INTERNAL

# JSON 输出
bytedcli --json cdn file upload --file ./demo-icon.png
```

`upload` 默认返回 `cdnUrl`（完整 CDN 加速地址），JSON 模式额外包含 `domain` / `path` / `tosKey`；加 `--unzip` 时把上传内容当压缩包解压，返回解压后的文件 URL 列表。

身份与护栏：`--email` 默认取本地登录用户；显式传他人邮箱（local-part 与登录用户不一致）直接报错拒绝（`CDN_IFE_IDENTITY_MISMATCH`，无放行开关），只能改用本人身份。`delete` 不可逆且仅限交互终端执行（弹 y/yes 确认）；JSON / 非交互（Agent / 脚本）场景一律抛 `CDN_IFE_CONFIRM_REQUIRED`、不能删除。`--cdn-token` 明文会进 shell history，建议改用 `--cdn-token-file <path>` 或环境变量 `BYTEDCLI_CDN_TOKEN`。`upload --unzip --url` 由服务端拉取 URL，只传可信来源。上传内容公网可读且无签名，不要上传密钥或未脱敏数据。

`permission apply` 会创建 CDN 团队空间权限 BPM 工单，而不是直接修改权限。`--permission` 支持 `admin`（管理员）和 `view`（只读）；`--region` 支持 `INTERNAL|CN|SG|VA2`，可重复或逗号分隔，默认 `INTERNAL`。命令默认先搜索校验 `--user`，必要时可加 `--skip-user-check` 跳过预检。

---
name: bytedance-kefu
description: "Operate ByteDance kefu (kefu.bytedance.net) — the unified user-feedback console — via bytedcli. Use when tasks mention kefu, 客服反馈, feedback_list_single, 用户反馈附件, 草稿 ZIP, 反馈截图, 反馈录屏, ab_settings_download, 草稿 tos, 录屏 tos, 反馈链接排查, draft_download, video_download, slardar crash log 链接, alog 链接, 或 paste a `https://kefu.bytedance.net/united/feedback/feedback_list_single/<product_type>?ids=<id>` URL."
---

# bytedcli kefu

`kefu.bytedance.net` 是字节统一的用户反馈控制台（剪映、剪映专业版、CapCut 等多款产品在用）。bytedcli 把控制台两条核心私有接口（`get_feedback_list` + `get_full_extra_form`）封装为一条命令，并把所有可消费的远端 URL 都暴露在结构化 JSON 里。下载/解压/OCR 等文件 I/O 不在 CLI 范畴，由本 skill 或上游 skill 自行编排。

## 何时使用

- 收到 kefu 反馈链接（`feedback_list_single/<product_type>?ids=<id>`）需要排查问题。
- 拿到 `feedback_id`、需要补全设备/版本/AB 配置/草稿/录屏/截图/Slardar 诊断链接。
- 需要消费 Slardar crash log、ALog、Vega 草稿、用户录屏、AB 配置 ZIP 等远端附件。

## 命令

```bash
# 单 id 取整套反馈结构化数据（默认 product_type=69 剪映 Android）
bytedcli --json kefu assets get --id 1956513378

# 直接贴控制台 URL，自动从 path 解析 product_type、从 query 解析 ids
bytedcli --json kefu assets get --url "https://kefu.bytedance.net/united/feedback/feedback_list_single/138?ids=2032330537"

# 复制粘贴变形容错：重复 `?` 也能正确解析（去重保留首个 id）
bytedcli --json kefu assets get --url "https://kefu.bytedance.net/united/feedback/feedback_list_single/138?ids=2032330537?ids=2032330537"

# 显式指定 product_type
bytedcli --json kefu assets get --id 1956513378 --product-type 69

# 检查/刷新本地 cookie 缓存
bytedcli kefu auth status
bytedcli --json kefu auth status
```

> 单 id 设计：批量诊断请在外层 shell/Node 里循环调用，CLI 不接受多个 id。

## 输出结构（JSON）

`bytedcli --json kefu assets get` 返回扁平 `KefuAssetsResult`，字段分组：

| 分组 | 字段 |
|------|------|
| 标识 | `feedback_id`、`product_type`、`link`、`uid`、`did`、`install_id` |
| 设备/版本 | `app_version`、`update_version_code`、`channel`、`language`、`device`、`os_version`、`platform`、`network_type`、`ip`、`city`、`create_time` |
| 反馈正文 | `content`、`comment` |
| extra-form | `resolution`、`dpi`、`oaid`、`openudid`、`uuid`、`cdid`、`ab_settings_tos_key`、`image_ocr_text` |
| 截图/录屏 | `images: string[]`（CDN URL）、`videos: { url, duration_ms, size_bytes, raw }[]`（`raw` 保留接口原始 record，给需要额外字段的 skill 兜底） |
| 远端附件 | `links.{draft_download, ab_settings_download, video_download, cloud_database_download, setting_url, data_model_url, alog_url, crash_log_url, monitor_url, action_url, fabric_url, north_star_url, video_history_url}` |
| 多端扩展 | `custom_links: { name, en_name, url }[]`（PC 端常见 `Mac端crashlog`/`Win端crashlog`/`ALog_Mac`/`ALog_Win`） |
| 原始数据 | `extra_form_raw`（key/value map）、`row_raw`（接口原始 row） |

> 字段为空时取 `null`/`[]`；`links` 始终返回固定字段集，缺失链接用 `null` 占位。

## 消费远端附件的推荐流程

CLI 只负责给链接，下面这些远端附件由 skill / Agent 自己 fetch / unzip / 调下游工具消费：

### 1. Slardar crash log（`links.crash_log_url`、`custom_links.Mac端crashlog`、`custom_links.Win端crashlog`）

链接形如 `https://slardar.bytedance.net/node/app_detail/?aid=...&os=Android#/abnormal/...`（或 `pc_detail/logQuery_v2`）。直接转交 `bytedance-slardar`：

```bash
# Android / iOS 客户端 crash issue（复用 kefu assets get 拿到的 crash_log_url）
bytedcli --json slardar app issue log --symbolicate --url "<crash_log_url>"

# PC 端（Mac/Win）crash log：URL 走 pc_detail/logQuery_v2，使用 Web 子命令族
bytedcli --json slardar web data list --url "<custom_links.Mac端crashlog>"
```

> 使用前请先确认你已在 Chrome 登录 `slardar.bytedance.net`，详见 `bytedance-slardar` skill。

### 2. ALog（`links.alog_url`、`custom_links.ALog_Mac`、`custom_links.ALog_Win`）

链接形如 `#/track/logSearch/logs?...`。直接交给 Slardar App 文件搜索/下载/解密：

```bash
# 列出该 device + 时间窗内的 ALog 文件
bytedcli --json slardar app file list --url "<alog_url>"

# 全量下载到本地目录
bytedcli slardar app file download --all --url "<alog_url>" --output ./alogs

# 加密 ALog zip 解密成 txt
bytedcli slardar app log decrypt --aid <aid> --os Android --input ./encrypted.zip --output ./decrypted.txt
```

### 3. Vega/CapCut 草稿 ZIP（`links.draft_download`）

链接形如 `http://p-pc-feedback-draft.bytedance.net/tos-cn-i-m2uu4xaej5/<key>` 或 `https://lf-feedback-draft.byteoversea.com/...`。直接 GET 落盘，再按业务自行解包：

```bash
DRAFT_URL=$(bytedcli --json kefu assets get --id 2032330537 | jq -r '.data.links.draft_download')
curl -fsSL -o /tmp/draft.zip "$DRAFT_URL"
unzip -d /tmp/draft /tmp/draft.zip
# 后续把 draft 解包结果交给客户端工具（Android: faceu-android/vega；iOS: faceu-ios/iMovie；PC: 剪映专业版）继续分析
```

> 注意：草稿 ZIP 仅在用户主动选择"上传草稿"时才存在；很多反馈没有这条链接。

### 4. 用户录屏（`links.video_download`、`videos[]`）

- `videos[]` 是反馈正文里的录屏，每条带 `url`/`duration_ms`/`size_bytes`，`url` 通常是 CDN 直链；
- `links.video_download` 是平台聚合的"诊断视频"链接，跳转到 `cloud.bytedance.net/vod/diagnostic_tools/video_info/...`（需要登录 cloud 控制台后下载）。

```bash
# 用户主动上传的录屏
URL=$(bytedcli --json kefu assets get --id <id> | jq -r '.data.videos[0].url')
curl -fsSL -o /tmp/feedback.mp4 "$URL"
```

### 5. AB 配置 ZIP（`links.ab_settings_download`）

下载并解压后即可获得当前用户在客户端实际命中的全部 AB 配置（剪映 Android 一般 1700+ 项）：

```bash
AB_URL=$(bytedcli --json kefu assets get --id <id> | jq -r '.data.links.ab_settings_download')
curl -fsSL -o /tmp/ab.zip "$AB_URL"
unzip -d /tmp/ab /tmp/ab.zip
# 在解包目录里 grep 你关心的 key，例如：
grep -R "import_live_photo" /tmp/ab
```

> iOS / PC 端反馈通常没有 `ab_settings_download`；这是上游接口本身就为空，不是 CLI 漏抓。

### 6. AppSettings / 数据模型 / 行为日志（其他 `links.*`）

| 字段 | 含义 | 消费方式 |
|------|------|----------|
| `setting_url` | AppSettings 后台 report | 直接在浏览器打开（cloud.bytedance.net 控制台） |
| `data_model_url` | 媒资模型 / 视频解码诊断 | 浏览器打开 |
| `action_url` | Tea 用户行为时间线 | 浏览器打开（data.bytedance.net） |
| `monitor_url` | Slardar Monitor / Track | 见上文 ALog/Slardar |
| `north_star_url` | 北极星营销 / Luckycat 任务 | 浏览器打开 |
| `video_history_url` | VOD 视频历史 | 浏览器打开 |
| `fabric_url` / `cloud_database_download` | 云配置/云数据库导出 | curl 下载或浏览器打开 |

CLI 只输出链接、不打开浏览器；用户/Agent 按需消费。

## 与 VOC 的关系

`bytedance-voc` 走的是抖音 CEM 平台（`voc.bytedance.net`），主要面向"标签 + 情感分析"。`bytedance-kefu` 走的是统一客服平台（`kefu.bytedance.net`），主要面向"客户端调试附件"。两者的反馈 id 经常是同一个，但接口与登录态完全独立：

- 想要 ES doc / issue 标签 / 三级问题分类：用 `bytedance-voc`。
- 想要 AB 配置 ZIP / Slardar crash 链接 / ALog / 草稿 / 录屏：用 `bytedance-kefu`。

## 认证

- 认证查找顺序：① 本地 6h 缓存 `~/.local/share/bytedcli/data/kefu_session.json` → ② 本机 Chromium cookie 库（Chrome / Chrome Beta / Chromium / Vivaldi）的 `kefu.bytedance.net` host-scoped cookie + `.bytedance.net` apex SSO cookie → ③ SSO fallback：headless puppeteer + `sso_session.json` 走一次 SSO 重定向，由 kefu 后端现场颁发 `SHARE_SESSION_ID`。
- 跨机器迁移（`bytedcli auth export` / `auth import`）后无需在新机器再登一次 Chrome：只要 `sso_session.json` 已搬过来 + 本机有系统 Chrome（macOS/Windows/Linux 标准路径之一）+ 全局安装了 `puppeteer` 或 `puppeteer-core`，第一次调用 kefu 命令会自动走 SSO fallback 把 cookie 现场换出来并写入 6h 缓存。
- `bytedcli kefu auth status` 可看缓存路径与剩余有效期；删除缓存文件即强制刷新（不会触发 puppeteer，仅清缓存）。
- 与 `bytedance-voc` 的 cookie/缓存完全独立，不会互相污染。

## 错误与排查

- `KEFU_AUTH_REQUIRED` — 缓存、本地浏览器 cookie、SSO fallback 三条路径都没拿到 `SHARE_SESSION_ID`。打开 `https://kefu.bytedance.net` 在 Chrome 登录一次；或迁移机器场景下确认已跑过 `bytedcli auth import`、SSO 未过期，再重试。
- `KEFU_PUPPETEER_NOT_FOUND` — SSO fallback 需要的 puppeteer 软依赖没装。运行 `npm install -g puppeteer-core`（或 `npm install -g puppeteer`）后重试。
- `KEFU_CHROME_NOT_FOUND` — SSO fallback 找不到系统 Chrome 可执行文件（项目 `.npmrc` 设置了 `PUPPETEER_SKIP_DOWNLOAD=true`，不会下载 bundled Chromium）。先安装 Google Chrome / Chromium 到系统标准路径再重试。
- `KEFU_INPUT_ERROR` — `--id` 必须是纯数字，URL 必须是 `feedback_list_single/<product_type>?ids=<id>` 形态。
- `KEFU_ASSETS_SINGLE_ID_REQUIRED` — `kefu assets get` 仅支持单 id；批量请在外层循环调用。
- `KEFU_NOT_FOUND` — 指定 product_type 下查不到该 feedback id（多半是 product_type 错了，剪映 Android = 69，剪映专业版 PC = 138，CapCut 等其他业务请看控制台 URL path）。

## 调用约定

`bytedcli` 的安装与执行方式参考 `../../invocation.md`。所有示例默认全局安装后直接 `bytedcli ...`；npx 形态请把 `bytedcli` 替换成 `NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest`。

## Out of scope

- 不实现下载、解压、OCR、视频抽帧、AB 配置 grep（这些副作用属于上层 skill / Agent）。
- 不暴露写操作（标签、状态机、回复用户）。
- 不内置 product_type 枚举：剪映 Android = 69、剪映专业版 PC = 138 之外的业务沿用控制台 URL 中的数字。

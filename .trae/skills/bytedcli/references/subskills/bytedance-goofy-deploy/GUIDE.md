---
name: bytedance-goofy-deploy
description: "Operate Goofy Deploy and Goofy Preview via bytedcli: use `goofy preview` to create quick previews from local build output. Use when tasks mention Goofy Deploy, Goofy Preview, quick preview, local web deployment, frontend deployments, or deployment failure diagnosis. Use `goofy deploy` to list projects, view deployments, deploy new versions (with `--wait`/`--wait-timeout-sec`/`--poll-interval-sec`), diagnose failures (with `--show-deployment-log` to fetch the latest pipeline node log), retry, cancel, and rollback;"
---

# bytedcli Goofy Deploy / Preview

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

- Web 应用部署
- 前端项目部署
- 本地构建目录 quick preview
- 查看部署历史
- 诊断部署失败原因
- 取消/重试/回滚部署
- 查看项目/团队/频道信息
- 查看项目构建配置
- 触发新版本部署（支持 --wait 轮询等待）
- 搜索 Goofy Deploy 项目

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

### Quick Preview / 快速预览部署
把本地构建好的目录快速部署，并产生一个可访问的预览链接，可用于日常 Demo 演示，快速部署本地产物等场景。
``` bash
# 部署项目根目录（自动检测 dist/build/out 构建产物）
bytedcli goofy preview deploy . --alias demo-preview
# 列出所有快速预览环境
bytedcli goofy preview list --page 1 --page-size 20
```

> 支持的目录类型与详细说明见 `references/preview-directory.md`。

### Normal Project Deploy / 普通项目部署
对已有的正式 Goofy Deploy 项目进行搜索、查看、部署等。

```bash
# 列出支持的站点和相应 VRegion 信息
bytedcli goofy deploy list-sites

# 搜索
## 根据项目名搜索项目
bytedcli goofy deploy project search --mode by-name --query tiktok
## 根据 SCM 名称搜索项目
bytedcli goofy deploy project search --mode by-scm --query toutiao
## 根据 Git 仓库搜索项目
bytedcli goofy deploy project search --mode by-git --query toutiao
## 根据路由搜索项目
bytedcli goofy deploy project search --mode by-route --query deploy.bytedance.net

# 团队
## 获取团队信息
bytedcli goofy deploy get-team --team-id 4317
# 列出团队下的项目
bytedcli goofy deploy list-projects --team-id 4317

# 项目
## 查询项目信息
bytedcli goofy deploy get-project --app-id 131716
## 列出部署历史
bytedcli goofy deploy list-deployments --app-id 131716

# 部署区域
## 列出项目的部署区域
bytedcli goofy deploy list-regions --app-id 131716
## 通过标准 VRegion 查询对应部署区域的枚举值 （例如：Singapore-Central -> 3001）
bytedcli goofy deploy region-name-to-region --region-name Singapore-Central
## 通过部署区域的枚举值查询对应的标准 VRegion （例如：3001 -> Singapore-Central）
bytedcli goofy deploy region-to-region-name --region 3001

# 流量频道 / Channel
## 创建流量频道 Channel（需要 region-id），默认按 env-name 匹配小流量
bytedcli goofy deploy create-channel --region-id 224335 --name test2 --env-name ppe_test2 --site cn
## 创建流量频道 Channel（按请求 header 匹配小流量；--header-key 与 --header-value 必须成对传入，--header-op 默认 1 = equals；此模式不需要 --env-name）
bytedcli goofy deploy create-channel --region-id 224335 --name demo-header --header-key fe-env --header-value ppe_demo_header
## 通过项目 ID列出项目的流量频道 / Channel
bytedcli goofy deploy list-channels --app-id 131716
## 按 PPE 环境名或 channel 名称模糊过滤 Channel
bytedcli goofy deploy list-channels --app-id <app_id> --env-name <env_name>
bytedcli goofy deploy list-channels --app-id <app_id> --keyword <name_substring>


# 部署工单
## 获取部署工单列表（--app-id 与 --channel-id 二选一；推荐只传 --channel-id）
bytedcli --site cn goofy deploy list-deployments --app-id 21297
bytedcli --site cn goofy deploy list-deployments --channel-id 3520795
## 同时传 --app-id 与 --channel-id（channel-id 优先，app-id 被忽略并在文本输出有 note）
bytedcli --site cn goofy deploy list-deployments --app-id 21297 --channel-id 3520795
## 获取具体工单的信息 （需要 deploy-id)
bytedcli --site cn goofy deploy get-deployment --deploy-id 24913395
## 创建部署工单
### 通过 Git 分支和 Commit Hash 部署新版本（需要 channel-id + git-branch + commit）
bytedcli goofy deploy deploy-new --channel-id 3520795 --git-branch main --commit-hash abc123def
### 通过 Git 分支和 Commit 部署并等待完成（--wait / --wait-timeout-sec / --poll-interval-sec）
bytedcli goofy deploy deploy-new --channel-id 3520795 --git-branch main --commit-hash abc123def --wait --wait-timeout-sec 900 --poll-interval-sec 15
### 通过已有 SCM 版本部署新版本（需要 channel-id + scm-version）
bytedcli goofy deploy deploy-version --channel-id 3520795 --scm-version 1.0.0.47
### 通过已有 SCM 版本部署并等待完成
bytedcli goofy deploy deploy-version --channel-id 3520795 --scm-version 1.0.0.47 --wait
## 取消部署工单（需要 deploy-id）
bytedcli --site cn goofy deploy cancel --deploy-id 24913396
## 重试失败的部署（参数同原工单），可选 --wait
bytedcli --site cn goofy deploy retry --deploy-id 24913396 --wait
## 回滚部署工单，回滚到此 Channel 上一次成功的部署（需要 channel-id），可选 --wait
bytedcli --site cn goofy deploy rollback --channel-id 4682611 --wait

# 诊断
## 诊断部署失败原因（聚合部署详情、项目信息和历史部署，输出诊断建议）
bytedcli --site cn goofy deploy diagnose --deploy-id 24913395
## 同时拉取并展示对应 pipeline 节点日志（最后 300 行，自动剥离 trace envelope 并展开多行栈）
bytedcli --site cn goofy deploy diagnose --deploy-id 24913395 --show-deployment-log
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json goofy deploy list-sites`）
- Goofy Deploy 站点选择用 `--site`（`cn|boe|i18n|i18n-tt|us-ttp|eu-ttp`），默认 `cn`
- `us-ttp` 请求走 `cloud.tiktok-us.net`，JWT 获取走 `cloud-ttp-us.bytedance.net`
- 主入口：`goofy deploy *` / `goofy preview *`
- 可用别名：`goofy-deploy *`、`gd *`
- `goofy preview *` 只有一个环境，无需区分 `cn` / `boe`
- `goofy preview *` 支持自动识别多种目录结构（`deploy.yml` / Next.js / 静态站点 / 自动检测 `dist`/`build`/`out`），详见 `references/preview-directory.md`
- 创建 channel 需要 region-id：先用 `list-regions --app-id <app_id>` 获取 Region ID
- 版本部署流程：先获取 channel-id，再使用 `deploy-new` 或 `deploy-version`
- `diagnose` / `get-deployment` / `cancel` / `retry` 除了 `--deploy-id <id>`，也接受直接粘贴 Goofy Web 页 URL（会自动从 URL 中提取 deployment id）

## Deployment Workflow

### Quick Preview / 快速预览部署

#### 工作流

1. 本地完成构建（如 `npm run build`）
2. 部署构建产物或项目根目录：
   - `goofy preview deploy . --alias <alias>`（项目根目录，自动检测构建产物）
   - `goofy preview deploy dist --alias <alias> --override`（指定构建产物目录）
   - `goofy preview deploy .next --alias <alias>`（Next.js 静态导出）
3. 查看 / 删除 preview：
   - `goofy preview list`
   - `goofy preview remove --preview-id <id>`

#### 支持的目录类型（按识别优先级）

- **带 `deploy.yml` 的项目**：符合 Goofy 部署配置协议，直接按配置部署
- **Next.js 静态导出**：含 `.next/` 目录，自动整理 HTML 与静态资源
- **纯静态站点**：根目录含 `index.html`，自动生成 `deploy.yml` 以 worker 模式部署
- **项目根目录**：含 `package.json` / `src` 等源码标记，自动在 `dist/` / `build/` / `out/` 中查找构建产物

#### 限制与注意事项

- tarball 不超过 50 MB；alias 限字母、数字、连字符（不能以 `-` 开头）
- 默认过期 365 天，可通过 `--expiry-days` 调整

> 完整目录结构、示例与错误排查见 `references/preview-directory.md`。

### Normal Project Deploy / 普通项目部署

1. 获取项目 ID（已知或通过 `project search`、`list-projects` 查询）
2. 列出区域：`list-regions --app-id <app_id>`
3. 按需创建通道：`create-channel --region-id <region_id> --name <name> --env-name <env_name>`
4. 列出通道：`list-channels --app-id <app_id>`
5. 选择通道 ID
6. 部署：
   - 通过 Git 分支和 Commit Hash 部署新版本（需要 branch + commit）：`deploy-new --channel-id <id> --git-branch <branch> --commit-hash <hash>`
   - 通过已有 SCM 版本部署新版本：`deploy-version --channel-id <id> --scm-version <version>`

## References

- `references/goofy-deploy.md`
- `references/preview-directory.md` — Goofy Preview 支持的目录结构与项目类型

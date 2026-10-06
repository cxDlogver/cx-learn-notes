---
name: bytedance-starling
description: "Use bytedcli Starling to manage Starling i18n businesses, projects, workflows, members, imports, namespaces, tasks, target texts, releases, doc projects, doc tasks, and workflows through starling-cli shortcuts and API runner. Trigger when tasks mention Starling, i18n, localization, +list, +create, +info, prompt key, translation key, namespace, release workflow, doc project, doc task, workflow, api-runner, search docs, search knowledge, or Starling AK/SK configuration."
---

# bytedcli Starling

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

需要机器可读输出时，把 `--json` 放在 `starling` 前面：`bytedcli --json starling ...`

## When to use

- 配置 Starling 凭据：`starling auth config`，检查状态：`starling auth status`
- 通过 shortcuts（`+list`、`+info`、`+create` 等）管理项目、空间、翻译 Key、任务、译文、发布
- 管理文档项目、文档任务、工作流
- 通过 API Runner 调用任意 Starling OpenAPI 接口
- 搜索 Starling 文档和业务知识（RAG）
- 升级 starling-cli：`starling upgrade`

## Do not use

- 不要用它处理浏览器登录态才可访问的 Starling 页面接口
- 不要用它代替 Feishu/Lark 文档协作，文档场景使用 `bytedance-feishu`

## 认证与配置

Starling 使用 AK/SK 认证。先到 https://starling.bytedance.net/personal_center#aksk 创建 AK/SK，然后：

```bash
bytedcli starling auth config --access-key <ak> --secret-key <sk>
bytedcli starling auth status
```

starling-cli 首次使用时会自动安装。手动升级：

```bash
bytedcli starling upgrade
```

## 命令模型

`bytedcli starling` 代理 `starling-cli` 的全部命令面，包括 shortcuts 和 API Runner。

## Shortcut 命令

Shortcuts 是带 Zod 校验和写操作确认（`--yes`）的语义化命令：

```bash
# 项目
bytedcli --json starling project +list
bytedcli --json starling project +info --project-id <project-id>
bytedcli --json starling project +search --keyword demo-project

# 空间
bytedcli --json starling namespace +list --project-id <project-id>
bytedcli --json starling namespace +info --namespace-id <namespace-id>

# 翻译 Key
bytedcli --json starling key +list --namespace-id <namespace-id>
bytedcli --json starling key +info --namespace-id <namespace-id> --key demo.title
bytedcli --json starling key +create --namespace-id <namespace-id> --key-name demo.title --default-translation "Hello" --yes
bytedcli --json starling key +update --namespace-id <namespace-id> --key demo.title --default-translation "Hi" --yes
bytedcli --json starling key +export --namespace-id <namespace-id> --locale zh
bytedcli --json starling key +import --namespace-id <namespace-id> --file ./keys.xlsx --yes
bytedcli --json starling key +import-status --namespace-id <namespace-id>

# 任务
bytedcli --json starling task +list --project-id <project-id>
bytedcli --json starling task +info --task-id <task-id>
bytedcli --json starling task +create --project-id <project-id> --name demo-task --namespace-id 101,102 --target-lang zh,ja --yes
bytedcli --json starling task +update --task-id <task-id> --name new-name --yes
bytedcli --json starling task +add-source --task-id <task-id> --yes

# 译文
bytedcli --json starling target +list --namespace-id <namespace-id>
bytedcli --json starling target +update --namespace-id <namespace-id> --yes

# 发布
bytedcli --json starling release +release --namespace-id <namespace-id> --locale zh --yes
bytedcli --json starling release +status --ticket-id <ticket-id>

# 文档项目
bytedcli --json starling doc-project +list
bytedcli --json starling doc-project +info --project-id <project-id>
bytedcli --json starling doc-project +create --name demo-doc-project --yes
bytedcli --json starling doc-project +search --keyword demo

# 文档任务
bytedcli --json starling doc-task +list --project-id <project-id>
bytedcli --json starling doc-task +info --task-id <task-id>
bytedcli --json starling doc-task +create --project-id <project-id> --yes
bytedcli --json starling doc-task +template-list

# 工作流
bytedcli --json starling workflow +list --project-id <project-id>
bytedcli --json starling workflow +create --project-id <project-id> --yes
```

## API Runner

用于调用 shortcuts 未覆盖的任意 Starling OpenAPI 接口：

```bash
# 浏览可用 API
bytedcli --json starling api-list --search "namespace"
bytedcli --json starling api-list --tag "release"

# 查看接口参数
bytedcli --json starling api GET /project/namespaces --dry-run
bytedcli starling api-schema /project/namespace/source/deleteByKeys

# 执行
bytedcli --json starling api GET /project/namespaces --params '{"projectId":123}'
bytedcli --json starling api GET /project/members --params '{"projectId":123}'
bytedcli --json starling api POST /project/distributions/rollback --data '{"projectId":123,"namespaceId":456,"batchVersion":"1.0.0"}'
bytedcli --json starling api POST /project/release/retry --data '{"projectId":123,"namespaceId":456,"batchVersion":"1.0.0"}'
bytedcli --json starling api GET /project/release/versions --params '{"projectId":123,"namespaceId":456}'
bytedcli --json starling api GET /project/release/conflict/check --params '{"projectId":123}'
bytedcli --json starling api GET /businesslines --params '{"offset":0,"limit":25}'
```

## 搜索

RAG 检索 Starling 文档和业务知识：

```bash
bytedcli --json starling search docs --query "how to import translation keys"
bytedcli --json starling search knowledge --query "语种配置"
bytedcli --json starling search docs --query "release workflow"
```

## 工具命令

```bash
bytedcli --json starling version
bytedcli starling doctor
bytedcli starling agent-guide
bytedcli starling schema key +create
bytedcli starling upgrade
```

## 已废弃命令（仍可用，将在后续版本移除）

以下旧命令仍然可用，但会在 stderr 输出废弃提示。请使用上方的 shortcut 等价命令：

```bash
bytedcli starling business list
bytedcli starling project list
bytedcli starling project get --project-id <id>
bytedcli starling project create --business-id <id> --name demo-project ...
bytedcli starling space list --project-id <id>
bytedcli starling task list --project-id <id>
bytedcli starling task get --project-id <id> --task-id <id>
bytedcli starling release publish --project-id <id> --namespace-id <id> ...
```

## 注意事项

- `starling auth config` 将凭据存储在 bytedcli 本地存储中，并作为环境变量注入给 starling-cli
- 默认 base URL：`https://starling.bytedance.net/gateway/openapi`；可通过 `--base-url` 或 `STARLING_BASE_URL` 环境变量覆盖
- 写操作（`+create`、`+update`、`+delete`、`+release` 等）需要 `--yes` 确认
- starling-cli 每 3 天后台自动更新；使用 `bytedcli starling upgrade` 可立即更新
- `--json` 必须放在 `starling` 前面：`bytedcli --json starling ...`

## References

- `references/starling.md`

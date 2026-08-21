---
name: bytedance-volcano
description: "Skill for Volcano Engine (火山引擎) CLI operations. Use when tasks mention Volcano Engine, Ark (火山方舟) foundation models / inference endpoints / API keys, veFaaS, VKE, VPC, TLS, CR, TOS, or DBW (Database Workbench) database instances/databases/tables/SQL execution."
---

# Volcano Engine (火山引擎)

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

- 需要操作 Volcano Engine (火山引擎) 资源
- 需要在 Volcano Ark (火山方舟) 控制台中查询基础模型 (foundation models)、推理接入点 (inference endpoints / 模型接入点) 或 API key（含查看明文）
- 需要查询或管理 veFaaS 函数/实例/日志
- 需要管理 VKE 集群/节点池
- 需要查询 VPC、NAT 网关、子网、安全组等网络资源
- 需要操作 TLS (日志服务) topics
- 需要管理 CR (容器镜像仓库)
- 需要操作 TOS (对象存储)
- 需要操作 DBW (Database Workbench) 数据库实例/数据库/表/SQL

## 前置条件

- 需要鉴权的命令先登录：`bytedcli auth login`
- 火山引擎相关命令需要配置 Babi Session：`bytedcli volcano auth config --volc-account-id <account-id>`

## Babi Session 管理

火山引擎命令使用 Babi Session 进行认证。如果 session 过期或失效，需要重新获取：

```bash
# 1. 查看当前账号列表
bytedcli volcano auth list-accounts

# 2. 如果 session 失效，先登出
bytedcli volcano auth logout

# 3. 重新配置 Babi account ID
bytedcli volcano auth config --volc-account-id <account-id>

# 4. 查看认证状态
bytedcli volcano auth status
```

## 功能分组

- **Ark (火山方舟)**：`bytedcli volcano ark model list`、`endpoint list`、`api-key list`、`api-key get --reveal`。仅支持 Babi SSO session 鉴权，不支持 AK/SK；先 `volcano auth login --volc-account-id <id>`。
- **CtxSearch**：`bytedcli volcano ctxsearch scene list/create/delete`、`api-key list/get`。使用 AK/SK 签名 OpenAPI，默认读取 `VOLC_ACCESSKEY` / `VOLC_SECRETKEY`，默认 `--env qa`；需要 dev 环境时显式传 `--env dev`。
- **DBW (Database Workbench)**：`references/volcano-dbw.md`

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前）
- DBW SQL 执行只支持读取类 SQL（SELECT, SHOW, DESCRIBE, DESC, EXPLAIN）
- 需要排查具体请求链路时，使用 `--http-debug`

## References

- `../../troubleshooting.md`
- `references/volcano-dbw.md`

---
name: bytedance-bytetree
description: "Query ByteTree service-tree nodes, business-tree domains, node resources, child nodes, parent chains, and owner role members via bytedcli. Invoke when tasks mention 服务树、业务树、ByteTree、业务域、节点层级、服务归属、资源挂载、负责人、Owner 或父子链路查询."
---

# bytedcli ByteTree

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

- 搜索服务树节点
- 查询单个节点详情
- 查看某个节点下挂载的资源列表
- 查看某个节点的直接子节点
- 查询某个节点到根节点的父链
- 根据服务树节点定位服务、资源、PSM、文件夹或负责人信息
- 搜索或查询业务树业务域、子业务域、叶子业务域、标签、权限与业务资源
- 从业务树业务域展开关联/排除的服务树节点
- 查看或调整 ByteTree 节点 IAM Owner 角色成员

## Quick start

```bash
# 模糊搜索
bytedcli bytetree search --query "demo-service-tree"

# 查看节点详情
bytedcli bytetree get --node-id 1234567

# 查看节点资源
bytedcli bytetree resources --node-id 1234567 --provider codebase

# 查看子节点
bytedcli bytetree children --node-id 1234567

# 查看父链
bytedcli bytetree parents --node-id 1234567

# 搜索业务树业务域
bytedcli bytetree biz search --query "demo-business"

# 查看业务域详情；get 会并发返回 freshness 信息
bytedcli bytetree biz get --domain-code demo_domain --expand-bytetree

# 查看业务域子节点或叶子节点
bytedcli bytetree biz children --domain-code demo_domain
bytedcli bytetree biz leaf list --domain-code demo_domain

# 查看业务域标签、权限和业务资源
bytedcli bytetree biz tag list --domain-code demo_domain
bytedcli bytetree biz permission check --domain-code demo_domain --permission system_manage
bytedcli bytetree biz resource list --domain-code demo_domain --page-size 20

# 查看 Owner 角色成员
bytedcli bytetree owner list --node-id 1234567

# 预览 Owner 变更，默认只 dry-run
bytedcli bytetree owner add --node-id 1234567 --user demo.user
```

## Notes

- ByteTree API 通过 `x-jwt-token` 鉴权，bytedcli 会自动复用当前登录态获取 token，无需手动复制浏览器请求头。
- 服务树本身是全球一棵树；`--site` 主要影响走哪个控制面鉴权与入口 host。省略时默认走 `cn`。
- 使用全局 `--site` 切换控制面 host，例如 `--site cn`、`--site i18n-bd`、`--site i18n-tt`。
- `resources` 走 `/nodes/{id}/resources_v2`，支持 `--provider`、`--offset`、`--page-size`；适合查询 `codebase` 这类不会直接出现在 `children/get` 返回里的挂载资源。
- `children` 默认查询 `service,resource,psm,employee,top-node,folder` 六类子节点；可以通过重复传 `--type` 或逗号分隔值缩小范围。
- `get` 返回值里的 `resources` 很关键，常见字段包括 `provider`、`resource_type`、`resource_id`、`partition`、`env`、`region`、`link.view`，可用于提前判断节点背后挂了哪些 TCE/TCC/RDS 等资源。
- `bytetree biz ...` 查询业务树，和技术架构服务树不是同一套层级；业务树节点与服务树节点是一对多关系，且可能包含排除节点。
- `bytetree biz get` 会同时请求业务域基础信息与 freshness 信息；不需要单独调用 freshness 命令。
- `--expand-bytetree` 只展开业务域关联的服务树节点与排除节点，不返回 Duty 相关字段。
- `quality`、`deploy` 和 `namespace list` 相关能力当前不在 bytetree 业务树命令范围内。
- `owner list/add/delete/set` 走 IAM Owner 角色接口。默认角色按站点推断：`cn/boe/eu-ttp` 用 `owner`，`i18n-tt/i18n-bd` 用 `owner.i18n`，`us-ttp` 用 `owner.tx`。
- `owner add/delete/set` 默认本地 dry-run；确认 JSON payload 后再加 `--yes` 执行真实变更。`set` 只替换当前 `--user-type`，并保留另一类账号成员。
- IAM 写接口如果返回 403，通常需要走 ByteCloud IAM UI 或申请 `/api/v2/acl/node/role` allowlist。

## References

- [bytetree.md](./references/bytetree.md)
- [invocation.md](./../../invocation.md)
- [troubleshooting.md](./../../troubleshooting.md)

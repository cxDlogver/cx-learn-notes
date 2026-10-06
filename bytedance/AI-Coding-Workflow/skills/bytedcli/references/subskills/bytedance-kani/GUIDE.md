---
name: bytedance-kani
description: "Skill for Kani 权限审批与知识库检索。Use when tasks mention Kani、Protego、kani_* namespace、权限申请/审批、创建Kani权限申请工单、Kani知识库、work order、approval list、kani knowledge search."
---

# Kani 权限审批

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

- 需要查询/跟踪 Kani 权限审批工单（我发起的/待我审批的/已完成的）
- 需要按状态、审批角色（applicant/reviewer）、是否加急等维度筛选
- 需要创建Kani权限申请工单
- 需要检索 Kani 权限系统知识库，回答权限申请、审批、排障类问题

## 前置条件

- 需要鉴权，先登录：`bytedcli auth login --session`

## 常用命令

```bash
# 查看帮助
bytedcli kani --help

# 列出审批工单（默认尽量贴近 Kani request 页语义）
bytedcli kani approval list

# 检索 Kani 知识库
bytedcli kani knowledge search --query "如何申请 Kani 资源权限"

# 带上下文检索并限制返回知识库切片数量
bytedcli kani knowledge search --query "Kani 权限审批失败怎么办" --context "用户正在排查权限申请" --result-limit 10

# 创建单个资源权限申请工单（resource 需要 permission-key，指定资源的某个权限）
bytedcli kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_1688 --object-key demo-resource --permission-key read

# 创建单个角色申请工单
bytedcli kani approval create --applicant alice --reason "need role" --object-type role --object-namespace kani_1688 --object-key demo-role

# 创建单个用户组申请工单
bytedcli kani approval create --applicant alice --reason "need group" --object-type group --object-namespace kani_1688 --object-key demo-group

# 预览创建请求体和 endpoint，不真正提交
bytedcli kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_1688 --object-key demo-resource --permission-key read --dry-run

# 查看待我审批（reviewer 视角）
bytedcli kani approval list --role reviewer

# 查看我发起的、已完成的申请
bytedcli kani approval list --role applicant --view finished

# 过滤：指定申请人 / 审批人
bytedcli kani approval list --applicant alice --reviewer bob

# 过滤：加急 bucket（true/false）
bytedcli kani approval list --urgent true

# 过滤：命名空间 / 安全等级 / VDC
bytedcli kani approval list --ns demo_ns --security-level P0 --vdc demo_vdc

# 过滤：时间范围（ISO,ISO）
bytedcli kani approval list --created-at 2026-05-01T00:00:00Z,2026-05-12T00:00:00Z

# 分页
bytedcli kani approval list --urgent true --limit 50 --offset 0

# 机器可读输出（全局参数，必须放在子命令前）
bytedcli --json kani approval list
bytedcli --json kani approval create --applicant alice --reason "need read access" --object-type resource --object-namespace kani_1688 --object-key demo-resource --permission-key read
bytedcli --json kani knowledge search --query "如何申请 Kani 资源权限"
```

## 参数一览（kani knowledge search）

> 以 `bytedcli kani knowledge search --help` 为准。

- `--query <query>`：用于知识库检索的用户查询语句（必填）
- `--context <context>`：辅助检索的聊天记录或用户上下文信息
- `--result-limit <n>`：返回知识库切片数量，`1..50`，默认 `5`

## 参数一览（kani approval create）

> 以 `bytedcli kani approval create --help` 为准。

- `--applicant <user>`：申请人（必填）
- `--reason <reason>`：申请理由（必填）
- `--object-type <type>`：申请对象类型，`resource|role|group`（必填）
- `--object-namespace <ns>`：申请对象namespace，例如 `kani_1688`（必填）
- `--object-key <key>`：申请对象key（必填）
- `--permission-key <key>`：申请对象的权限key，仅 `--object-type resource` 必填
- `--dry-run`：只打印请求体和 endpoint，不真正创建申请
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## 参数一览（kani approval list）

> 以 `bytedcli kani approval list --help` 为准，这里按当前实现做摘要。

- `--role <role>`：`applicant|reviewer`（默认 `applicant`）
- `--view <view>`：`running|finished`（默认 `running`）
- `--applicant <user>`：申请人过滤
- `--reviewer <user>`：审批人过滤
- `--status <status>`：工单状态过滤
- `--review-status <status>`：审批状态过滤
- `--urgent <boolean>`：加急 bucket 过滤（`true|false`）
- `--vdc <vdc>`：VDC 过滤
- `--limit <n>`：单 bucket page size（默认 `20`）
- `--offset <n>`：单 bucket offset
- `--start-id <id>`：单 bucket pagination start_id
- `--created-at <startISO,endISO>`：创建时间范围
- `--review-created-at <startISO,endISO>`：审批创建时间范围
- `--asc <boolean>`：是否升序
- `--cross-region <boolean>`：跨 region 过滤
- `--ns <ns>`：命名空间过滤
- `--security-level <level>`：安全等级过滤
- `--kani-site <site>`：隐藏参数，`cn|boe`（默认 `cn`）

## Notes

- `--json` 是全局参数，必须放在子命令前，例如：`bytedcli --json kani approval list`
- 若你在 BOE 环境排查，可使用隐藏参数：`--kani-site boe`（默认 `cn`）

## References

- `references/kani.md`
- `../../troubleshooting.md`

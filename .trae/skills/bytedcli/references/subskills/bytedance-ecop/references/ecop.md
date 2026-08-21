# ECOP 命令参考索引

本目录按领域拆分为独立参考文件，按需读取：

| 文件 | 覆盖命令 |
|---|---|
| `zhili-label.md` | `ecop zhili-label tree/list/get`、`ecop std-audit-label list` |
| `autorule.md` | `ecop autorule list/get/create` |
| `invocation.md` | 通用调用方式（npx / 全局安装） |
| `troubleshooting.md` | 常见错误与排查 |

## 认证说明

ECOP 所有接口均走 ByteCloud SSO JWT，CLI 自动通过 `x-jwt-token` header 注入登录态。
ECOP 网关要求所有业务接口带站点上下文（`space=1`、`group_id=417`）；CLI 已硬编码，使用者无需额外传入。

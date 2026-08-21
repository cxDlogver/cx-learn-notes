---
name: bytedance-nac
description: "Use bytedcli for NAC / Network Access Control rule workflows. Trigger this skill whenever the user mentions NAC, network access control, isolation rules, rulePlatform/rulePlat, ticketId, NAC tickets, NAC admin operations, or asks to list their own network isolation rules across cn, i18n-row-tt, i18n-bd, or boe sites."
---

# bytedcli NAC

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

- 查询当前登录用户自己的 NAC 规则列表
- 按 NAC 站点、规则平台、启用状态、规则类型或来源 ticket ID 过滤规则
- 用户提到 NAC、Network Access Control、网络隔离、隔离规则、`rulePlatform`、`rulePlat`、`ticketId`、NAC rule、NAC ticket、NAC admin
- 用户需要跨 `cn`、`i18n-row-tt`、`i18n-bd`、`boe` 站点排查 NAC 规则

## 能力范围

当前 skill 覆盖以下命令：

- 规则列表：`nac rule list`

## 前置条件

- 首次使用前先完成登录：`bytedcli auth login`
- NAC 请求使用 ByteCloud JWT，通过当前登录态自动生成 `X-Jwt-Token`
- 规则列表固定按当前登录用户自查；CLI 不提供 `--creator`，不要尝试替用户构造 creator 过滤

> 下面示例直接写 `bytedcli`。

## 工作流约定

1. 需要机器可读输出时，优先使用全局 `--json`：`bytedcli --json nac rule list ...`。
2. 未明确指定站点时默认查询 `cn`。
3. 站点参数统一使用 `--site`，不要使用 `--site-name` 或 `--sitename`。
4. 只查询 BOE 时仍使用 `--site boe`；不要改写成单独的 `--boe`。
5. 按来源 ticket 过滤时使用 `--ticket-id <id>`，不要改写成 `--ticket`。
6. 规则平台过滤使用 `--rule-plat <platform>`；常见值包括 `nsg`、`hfw`。
7. 分页使用 `--page` 与 `--page-size`，默认分别是 `1` 与 `20`。

## Quick start

```bash
# 查看当前用户在默认 cn 站点的规则
bytedcli --json nac rule list --page 1 --page-size 20

# 查询 BOE 站点规则
bytedcli --json nac rule list --site boe --page 1 --page-size 5

# 按规则平台和启用状态过滤
bytedcli --json nac rule list --rule-plat nsg --enabled

# 按来源 ticket ID 过滤
bytedcli --json nac rule list --ticket-id 100 --site cn

# 按规则类型过滤
bytedcli --json nac rule list --rule-type sample-rule-type --site i18n-row-tt
```

## 参数说明

### `nac rule list`

```bash
bytedcli --json nac rule list \
  --site cn \
  --rule-plat nsg \
  --enabled \
  --rule-type sample-rule-type \
  --ticket-id 100 \
  --page 1 \
  --page-size 20
```

- `--site <site>`：NAC 站点。支持 `cn`、`i18n-row-tt`、`i18n-bd`、`boe`；部分常见别名会被 CLI 归一化。
- `--rule-plat <platform>`：按规则平台过滤，例如 `nsg`、`hfw`。
- `--enabled`：只查询启用规则。
- `--rule-type <type>`：按 NAC 规则属性里的规则类型过滤。
- `--ticket-id <id>`：按来源 ticket ID 过滤，必须是正整数。
- `--page <number>`：页码，默认 `1`。
- `--page-size <number>`：每页条数，默认 `20`。
- `--json`：输出 JSON；推荐作为全局参数放在 `nac` 前面。

## 输出约定

- JSON 输出包含：`rules`、`total`、`page`、`page_size`、`site`。
- `site` 是 CLI 归一化后的站点名，例如输入 `--site test` 时输出 `boe`。
- 空列表时 `rules` 输出为空数组 `[]`。
- 文本模式会展示站点、分页、总数和返回条数，再展示规则摘要表。

## Notes

- NAC 规则列表始终 self-scoped：后端请求的 `creator` 固定来自当前登录用户。
- 如果报 `AUTH_REQUIRED`，先运行 `bytedcli auth login`，再重试原命令。
- 如果服务端返回 NAC envelope 错误，CLI 会显示 NAC 的 `code/msg`，优先保留错误信息给后端排查。
- 如果需要新增 NAC ticket/admin 类能力，保持同一 domain 下的资源分组，例如 `nac ticket list`、`nac admin ...`，并继续使用 `--site` 命名。

---
name: bytedance-cloud-docs
description: "Search and fetch Cloud Docs via bytedcli: search docs, get doc markdown content, list businesses and docs. Use when tasks mention Cloud Docs(字节云文档) or doc search."
---

# bytedcli Cloud Docs

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

- 搜索/获取 Cloud Docs
- 查询业务域与 API 文档

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
bytedcli cloud-docs search "keyword"
bytedcli cloud-docs get "doc_id"
bytedcli cloud-docs list-business
bytedcli cloud-docs list-docs "business_id" --api-doc "tce:v1"
```

## Notes

- 需要结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json cloud-docs search ...`）

## References

- `references/cloud-docs.md`

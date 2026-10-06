---
name: bytedance-codecov
description: "Operate ByteDance codecov via bytedcli: create incremental/full coverage reports, update/get/list full coverage reports via the new coverage-report gateway, print bits coverage-next links, and manage collection-side tags & upload intervals. Use when tasks mention codecov, 代码覆盖率, 覆盖率标签, 覆盖率报告, 全量覆盖率, 增量覆盖率, coverage-next."
---

# Codecov (bytedcli)

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

- Create full coverage reports from PSM + branch
- Create incremental coverage reports from PSM + branch
- List coverage-next incremental files for an MR
- Mark coverage-next incremental files as ignored / no-coverage-required, or reset an existing mark
- Refresh (update) existing coverage reports
- Query a report by rid or by PSM + branch
- List reports for a PSM
- Print the bits coverage-next URL without an HTTP call
- Manage collection-side tags and upload intervals
- Check whether a PSM is integrated into the coverage platform (access status; note that `not_registered` is inferred from an empty response — may also indicate ACL or transient empty)

## 前置条件

- 使用通用调用方式：`../../invocation.md`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## 常用命令

```bash
# Report management (new coverage-report gateway)
bytedcli codecov report create-incr --psm example.service.api --branch feat/demo
bytedcli codecov report create --psm example.service.api --branch master
bytedcli codecov report update --rid 10000001
bytedcli codecov report update --psm example.service.api --branch master --no-wait
bytedcli codecov report get --rid 10000001
bytedcli codecov report get --psm example.service.api --branch master
bytedcli codecov report list --psm example.service.api --limit 10
bytedcli codecov report incr list-files --project-id 100001 --mr-id TE-XXX-demo --psm example.service.api
bytedcli codecov report incr update --project-id 100001 --mr-id TE-XXX-demo --file service/activity/demo.go --comment-tag no-coverage-required --dry-run
bytedcli codecov report link --rid 10000001

# Access status (new gateway)
bytedcli codecov access-status --psm example.service.api
bytedcli -j codecov access-status --psm example.service.api

# Collection-side (collection gateway, unchanged)
bytedcli codecov create-tag --tag demo-tag --service example.service.api:prod --expire 10
bytedcli codecov delete-tag --psm example.service.api --env prod --tag demo-tag
bytedcli codecov set-interval --interval 60 --service example.service.api:prod --expire 30

# Legacy (deprecated wrapper; forwards to `codecov report create`)
bytedcli codecov create-report --psm example.service.api --branch-name master --base-commit 0000000 --os-type server
```

## 报告链接

所有 `report create/update/get/list` 命令都会在响应里附加 `link` 字段，格式为：

```
https://bits.bytedance.net/quality/measure/coverage-next/full?language=1&rId={rid}&region=cn&viewId=1
```

## Notes

- `codecov report *` 走新的覆盖率报告网关，与 bits 覆盖率平台新页面 `coverage-next` 对齐
- `codecov report create-incr` 走增量报告创建接口，当前 `--os-type` 仅支持服务端族：`server/server-cpp/server-java/server-nodejs/python`
- `codecov report incr list-files` 读取 coverage-next 增量文件树；`--psm` 会按子报告查询，并自动带 `is_sub_report=true`
- `codecov report incr update` 对齐 coverage-next 页面批量标记能力，默认 `operation_type=1`；`--reset` 会改为取消标记（`operation_type=2`）
- 常用 `--comment-tag`：`no-coverage-required`、`untestable`、`useless-code`、`uninstrumentable`、`miss-test`、`add-case`、`private-code`
- `codecov create-tag/delete-tag/set-interval` 仍走采集网关
- `--os-type` 默认 `server`；其它取值：`android/ios/javascript/server-cpp/python`
- `--if-send-robot` 会在 CLI 内部映射为后端字段 `if_send_rebot`
- `codecov report update` 默认轮询等待最多 30s；用 `--no-wait` 立即返回
- 无鉴权时 `bytedcli auth login` 后再试

## References

- `references/codecov.md`
- `../../invocation.md`
- `../../troubleshooting.md`

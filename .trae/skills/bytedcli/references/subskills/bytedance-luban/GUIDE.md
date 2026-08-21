---
name: bytedance-luban
description: "Operate Luban package and PyPI artifact workflows via bytedcli. Use when tasks mention Luban, Bytedance or TTP npm packages, bnpm package lookup, checking whether a package exists in Luban, searching package versions by prefix, resolving a Maven package's git repo and commit from its group/artifact/version coordinates, or querying/publishing Luban PyPI artifact versions."
---

# bytedcli Luban

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

- 需要确认某个 Bytedance 或 TTP npm 包是否已进入 Luban 组件库
- 需要在默认 Bytedance Luban 与 TTP Luban 两个环境之间切换查询
- 需要按版本前缀筛某个 bnpm 包的记录
- 需要把 `@scope/name` 形式的包名映射成 Luban 查询里的 `group` 和 `name`
- 需要根据 Maven 包的 group/artifact/version 反查其对应的 git 仓库地址与 commit
- 需要查询 Luban PyPI 制品仓库、版本列表/详情，或创建 PyPI 版本发布任务

## Prerequisites

- `luban search` 与 `luban pypi` 需要先完成 `bytedcli auth login`
- 默认 Luban 查询会复用 ByteCloud 凭据，并从 `https://cloud.bytedance.net` 获取 JWT
- 传入 `--site us-ttp` 时，会改为查询 TTP Luban，并从 `https://cloud-ttp-us.bytedance.net` 获取 TTP JWT
- `luban pypi` 走 Luban 发布页使用的 SCM API，并返回 Luban 版本页 URL
- `luban maven get` 只读取 `maven.byted.org` 上的公开 pom，不需要 `auth login`，也不依赖 ByteCloud JWT

## Quick start

```bash
# 查询某个包的全部结果
bytedcli luban search --npm @demo/uploader

# 查询某个包的指定版本前缀
bytedcli luban search --npm @demo/uploader -v 2.1.5

# 查询 TTP Luban 环境
bytedcli luban search --npm @demo/uploader --site us-ttp

# 使用长参数写法
bytedcli luban search --npm @demo/uploader --package-version 2.1.5

# 根据 Maven 坐标反查 git 仓库地址与 commit
bytedcli luban maven get -g com.example.demo -a demo-sdk --version 1.0.0

# 需要机器可读结果时，优先加 --json
bytedcli --json luban search --npm @demo/uploader --package-version 2.1.5
bytedcli --json luban maven get -g com.example.demo -a demo-sdk --version 1.0.0

# 查询 PyPI 制品仓库和版本
bytedcli --json luban pypi repo get --repo-id 12345
bytedcli --json luban pypi version list --repo-id 12345 --page 1 --page-size 20
bytedcli --json luban pypi version get --version-id 67890

# PyPI 发布 dry-run；会先检查同版本是否已有成功发布
bytedcli --json luban pypi version publish \
  --repo-id 12345 \
  --version 1.2.3 \
  --desc "demo release" \
  --branch master \
  --dry-run

# 基于指定 commit 发布，真实写操作必须显式确认
bytedcli --json luban pypi version publish \
  --repo-id 12345 \
  --version 1.2.3 \
  --desc "demo release" \
  --pub-base commit \
  --commit abcdef123 \
  --yes
```

## Notes

- `--npm` 需要传 `@scope/name` 形式的 npm 包名。
- `-v, --package-version` 为可选参数；传入时会映射为 Luban 请求体里的 `version_prefix`，不传时会搜索该包名的所有结果。
- `--site us-ttp` 为可选参数；传入时切换到 TTP Luban API、JWT host 与 Web origin，不传时走默认 Bytedance Luban 环境。
- `luban maven get` 需要同时传 `-g/--group`、`-a/--artifact`、`--version`；它会读取 `maven.byted.org` 上对应版本的 pom，输出 group/artifact/version 以及 `project.scm.url`（git 仓库）和 `project.scm.tag`（commit）。其中 git 仓库会自动剥离 `scm:<provider>:` 前缀；当 pom 不存在（404）或缺少 scm 信息时，git repo 与 commit 在 JSON 模式返回 `null`、文本模式显示 `N/A`，命令仍按成功返回。若 `maven.byted.org` 异常（5xx、网络故障等），命令会报错而非误报成功。
- 文本模式输出紧凑表格；`--json` 模式返回命令特定的结构化结果（`luban search` 返回包列表，`luban maven get` 返回 `{ group, artifact, version, gitRepo, commit }`，`luban pypi *` 返回对应资源对象）。
- `luban pypi version publish` 默认等待并轮询发布状态；`--no-wait` 只创建任务并返回。
- `--dry-run` 与真实发布都会先检查同版本成功记录；命中时返回 `LUBAN_PYPI_VERSION_EXISTS`，不会继续创建发布任务。
- `--pub-base` 支持 `branch` / `commit` / `tag`；commit 模式必须传 `--commit`，tag 模式必须传 `--tag`。
- 轮询时会在 stderr 打印 URL 与进度动画，不影响 `--json` stdout 的最终 JSON。

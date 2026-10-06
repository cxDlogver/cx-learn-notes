# Luban

## Command map

- `bytedcli luban search`
  - `--npm <packageName>`：必填，传 `@scope/name` 形式的 npm 包名
  - `-v, --package-version <version>`：可选，按版本前缀过滤；不传时搜索该包名的所有结果
  - `--site us-ttp`：可选，切换到 TTP Luban 环境；不传时走默认 Bytedance Luban 环境
- `bytedcli luban maven get`
  - `-g, --group <groupId>`：必填，Maven group id，例如 `com.example.demo`
  - `-a, --artifact <artifactId>`：必填，Maven artifact id，例如 `demo-sdk`
  - `--version <version>`：必填，Maven 版本，例如 `1.0.0`
- `bytedcli luban pypi repo get`
  - `--repo-id <id>`：必填，PyPI 制品仓库 ID
- `bytedcli luban pypi version list`
  - `--repo-id <id>`：必填，PyPI 制品仓库 ID
  - `--keyword <version>`：可选，按版本号关键字过滤
  - `--branch <branch>` / `--status <status>` / `--type <type>` / `--create-user <user>`：可选过滤条件
- `bytedcli luban pypi version get`
  - `--version-id <id>`：必填，PyPI 版本 ID
- `bytedcli luban pypi version publish`
  - `--repo-id <id>` / `--version <version>` / `--desc <desc>`：必填
  - `--pub-base branch|commit|tag`：默认 `branch`
  - `--branch <branch>`：分支发布，默认 `master`
  - `--commit <hash>`：commit 发布必填；分支或 tag 发布时可显式覆盖 commit
  - `--tag <tag>`：tag 发布必填
  - `--dry-run`：只解析并输出最终请求体，不创建版本
  - `--yes`：确认真实发布
  - `--no-wait`：创建发布任务后立即返回，不轮询最终状态

## Inputs

### NPM package name

`--npm` 需要传完整包名，例如 `@demo/uploader`。CLI 会自动把：

- `scope` 映射为请求体里的 `group`
- `name` 映射为请求体里的 `name`

### Version prefix

`--package-version` 为可选参数。传入时会映射为请求体里的 `version_prefix`，适合按 `2.1.5`、`2.1` 这类前缀过滤；不传时返回该包名的全部匹配结果。

### Environment

默认会请求 Bytedance Luban API，并从 `https://cloud.bytedance.net` 获取 JWT。传入 `--site us-ttp` 时，会切换到 TTP Luban API，并从 `https://cloud-ttp-us.bytedance.net` 获取 JWT；请求头里的 `origin` / `referer` 也会同步切换到 TTP Luban Web 域名。

### Maven coordinate lookup

`luban maven get` 用于根据 Maven 坐标反查制品对应的 git 仓库与 commit。它读取 `maven.byted.org` 上对应版本的公开 pom（无需 `auth login`），从 `project.scm.url` 解析 git 仓库（自动剥离 `scm:<provider>:` 前缀），从 `project.scm.tag` 解析 commit。当 pom 不存在（404）或缺少 scm 信息时，git repo 与 commit 在 JSON 模式返回 `null`、文本模式显示 `N/A`，命令仍按成功返回；若 `maven.byted.org` 异常（5xx、网络故障等），命令会报错而非误报成功。

### PyPI artifact publish

`luban pypi` 用于 Luban PyPI 制品仓库与版本发布任务管理。查询和发布会复用 ByteCloud JWT，访问 Luban 发布页对应的 SCM API；发布成功创建后会返回 Luban 版本页 URL。

发布命令默认是等待模式：创建发布任务后轮询版本详情直到成功或失败，stderr 会打印 URL 和轮询进度，stdout 在 `--json` 模式下保持单个最终 JSON。传 `--no-wait` 时只返回创建结果。

发布前会先查询已有版本。如果同一版本号已经存在成功发布记录，命令返回 `LUBAN_PYPI_VERSION_EXISTS`，不会创建新任务。真实发布需要 `--yes`；建议先用 `--dry-run` 检查最终请求体。

## Output

- `luban search`：文本模式输出包名、版本、仓库和创建时间的表格；JSON 模式返回包列表数组
- `luban maven get`：文本模式输出 Group ID / Artifact ID / Version / Git Repo / Commit 的 KV 表格；JSON 模式返回 `{ group, artifact, version, gitRepo, commit }`
- `luban pypi *`：文本模式输出对应资源摘要表格；JSON 模式返回资源对象

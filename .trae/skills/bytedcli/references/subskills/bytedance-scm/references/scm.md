# SCM

```bash
# Repo list — 默认 favor tab；--all 切到 All tab；服务端 filter
bytedcli scm repo list --page 1 --page-size 10                                     # 我的收藏
bytedcli scm repo list --all                                                       # 全部仓库
bytedcli scm repo list --search sort                                               # favor tab + 名称搜索
bytedcli scm repo list --all --search sort                                         # all tab + 名称搜索
bytedcli scm repo list --create-user <username>                                    # favor tab + creator
bytedcli scm repo list --all --create-user <username> --language Go --page-size 20 # all tab + 多过滤
bytedcli scm repo search "byteapi/command/bytedcli"                                # 等价 list --all --search

bytedcli scm repo version list "byteapi/command/bytedcli" --branch master --type online --status build_ok
bytedcli scm repo version list --repo-id 533180 --branch master --type online
# Version compare — 列两个构建版本之间的精确 commit 范围（比 git log --since 准：用 build manifest pin 的 SHA，不受 force-push / merge time 漂移影响）
bytedcli scm repo version compare --repo-id 379649 --base 2.0.4.9494 --target 2.0.4.9656
bytedcli scm repo version compare "byteapi/command/bytedcli" --base 1.0.0.1686 --target 1.0.0.1720 --first-parent --page-size 20
bytedcli scm repo build "byteapi/command/bytedcli" --branch master --type test -e '{"CUSTOM_KEY":"VALUE"}' -m "trigger build reason"
# 指定 build_steps；CLI 传值优先，未传时默认回填 SCM 仓库配置里的 build_steps
bytedcli scm repo build "byteapi/command/bytedcli" --branch master --type test --build-steps '{"pre-build":[8,1]}'
# 指定编译架构（重复或逗号分隔，仅允许 x86_64 / aarch64 / x86_64,aarch64）
bytedcli scm repo build "byteapi/command/bytedcli" --branch master --type test --arch x86_64,aarch64
# 通过 commit hash 直接打包（--commit 和 --branch 互斥，不需要指定分支，产物只在 CN CDN 落地）
bytedcli scm repo build "byteapi/command/bytedcli" --commit abc123def456 --type offline
bytedcli scm repo build --repo-id 533180 --branch master --type offline

# Build log — 三种入口（任选其一）
bytedcli scm repo build-log "byteapi/command/bytedcli" "1.0.0.1686" --step building
bytedcli scm repo build-log "byteapi/command/bytedcli" "1.0.0.1686" --status failed
bytedcli scm repo build-log --repo-id 533180 "1.0.0.1686" --step building
bytedcli scm repo build-log --record-id 9056070 --step building                    # 直接按 ByteBuild record id 取
```

## `scm repo list` 选项

| 选项                   | 默认 | 说明                                              |
| ---------------------- | ---- | ------------------------------------------------- |
| `--starred`            | 默认 | 列出收藏（favor tab，`is_favor=true`）            |
| `--all`                | —    | 列出全部（`is_favor=false`），与 `--starred` 互斥 |
| `--search <kw>`        | —    | 服务端按名称模糊搜索                              |
| `--create-user <user>` | —    | 服务端按 creator 用户名过滤                       |
| `--language <lang>`    | —    | 服务端按语言（如 `Go`、`Python`）过滤             |
| `--page <n>`           | `1`  | 1 起步                                            |
| `--page-size <n>`      | `10` | 每页条数                                          |

## 区域同步 flag

`scm repo build` 支持 3 个同步开关，默认继承仓库配置（SCM 仓库设置页的 `sync_aws` / `sync_oss` / `sync_bvc`），CLI 可覆盖：

| Flag                           | 作用                   | 对应 build stage       |
| ------------------------------ | ---------------------- | ---------------------- |
| `--sync-aws` / `--no-sync-aws` | VA/US 区域上传         | `uploading-va-source`  |
| `--sync-oss` / `--no-sync-oss` | SG/Aliyun 区域上传     | `uploading-sg-source`  |
| `--sync-bvc` / `--no-sync-bvc` | BVC 多 region 发布格式 | `uploading-bvc-source` |

仅 `--branch` 模式会真正触发海外上传；`--commit` 模式产物只在 CN CDN 落地。

## `scm repo build --build-steps` 约定

- 形态必须是 JSON object，例如 `'{"pre-build":[8,1]}'`
- 优先级：`--build-steps` > SCM repo detail 默认 `build_steps`
- 非法输入（空串、非法 JSON、数组等非对象值）会直接报 `SCM_INPUT_ERROR`

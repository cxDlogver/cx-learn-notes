---
name: bytedance-codebase
description: "Operate Codebase: repositories, namespaces, merge requests, diffs, files, snippets, check runs, CI analysis, CI variables/schedules, and dependency permissions."
---

# Codebase（bytedcli）

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

- 仓库查询、MR 详情/评论
- Codebase namespace 列表与搜索
- 创建仓库（默认 validate_only dry-run）
- Diff 列表/内容、文件查看
- Check Runs 与 CI 失败分析
- CI 变量查询与定时任务（variable list、schedule list/create/delete；variable set 目前为 dry-run）
- Codebase/Bits CI Pipeline 手动触发
- 聚合 MR 状态与跨仓库搜索
- Snippet 查询、导出与创建/更新/删除
- 创建分支
- 创建 Merge Request
- MR 关联 Meego 工作项（需求/缺陷）
- 文件 Blame（行级归因查询）
- 依赖权限检查与批量申请

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 认证优先级：`BYTEDCLI_CODEBASE_AUTH_MODE` 默认为 `auto`，顺序为 user JWT/file > App id/secret env/file > OAuth/PAT > SSO；`app` 模式只接受 App id/secret。手动配置使用：`bytedcli codebase auth config-add-pat <pat>`，或 `bytedcli codebase auth config-auth --app-id <app-id> --app-secret <app-secret>`

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# 仓库
bytedcli codebase repo get "example-org/example-repo"
bytedcli codebase namespace list # 只列出可用 namespace；按名称查找用 search
bytedcli codebase namespace search --query "example" # search 必须带 query
bytedcli codebase repo create --namespace example-org --name example-repo --description "Demo repo" --search-bytetree "Example Team"
bytedcli codebase repo create --namespace example-org --name example-repo --groot-node-id 12345
bytedcli codebase repo create --namespace example-org --name example-repo --groot-node-id 12345 --execute --confirm example-org/example-repo

# MR 详情/评论
bytedcli codebase mr get 821 -R "example-org/example-repo"
bytedcli codebase mr comment list 821 -R "example-org/example-repo"

# Diff 文件/内容
bytedcli codebase mr files 821 -R "example-org/example-repo"
bytedcli codebase mr diff 821 -R "example-org/example-repo" --file "path/to/file.ts"

# 文件内容
bytedcli codebase repo file "README.md" -R "example-org/example-repo"
bytedcli codebase repo file "https://code.byted.org/example-org/example-repo/blob/main/path/to/file.ts"

# Blame（行级归因）
bytedcli codebase repo blame "src/main.ts" -R "example-org/example-repo" -r main
bytedcli codebase repo blame "src/main.ts" -R "example-org/example-repo" -r main --start-line 10 --end-line 20
bytedcli codebase repo blame "https://code.byted.org/example-org/example-repo/blob/main/src/main.ts" --start-line 10

# Snippet
bytedcli codebase snippet get <snippet_id>
bytedcli codebase snippet get <snippet_id> --file index.ts
bytedcli codebase snippet get <snippet_id> --save ./snippet-files
bytedcli codebase snippet list --query "demo-query" --page-size 10
bytedcli codebase snippet create --title "demo snippet" --visibility internal --file ./README.md
bytedcli codebase snippet update --id <snippet_id> --add-file ./new.txt --remove-file old.txt
bytedcli codebase snippet delete --id <snippet_id> --yes

# 我在仓库的访问权限 / 分支保护（只读）
bytedcli codebase repo member get -R "example-org/example-repo"   # 当前用户 access level + 能否 push
bytedcli codebase repo protected-branch list -R "example-org/example-repo"   # 保护分支 + push/merge access

# 管理 Branch
bytedcli codebase repo branch list -R "example-org/example-repo" --query "feat/" --query-mode prefix
bytedcli codebase repo branch get -R "example-org/example-repo" --name main
bytedcli codebase repo branch create feat/demo -R "example-org/example-repo" --from master

# 管理 Tag
bytedcli codebase repo tag list -R "example-org/example-repo" --query "v1." --query-mode prefix
bytedcli codebase repo tag get -R "example-org/example-repo" --name v1.0.0
bytedcli codebase repo tag create -R "example-org/example-repo" --name v1.0.1 --revision master --message "Release v1.0.1"
bytedcli codebase repo tag delete -R "example-org/example-repo" --name v1.0.1

# TTP 同步工单
bytedcli codebase repo ttp-sync list -R "example-org/example-repo"
bytedcli codebase repo ttp-sync trigger -R "example-org/example-repo" --branch feature/foo --dry-run
bytedcli codebase repo ttp-sync trigger -R "example-org/example-repo" --tag v1.0.0 --sync-dependencies

# 管理 Label（仓库标签，含 id/name/color/description）
bytedcli codebase repo label list -R "example-org/example-repo"
bytedcli codebase repo label create -R "example-org/example-repo" --name type/bug --color "#D73A4A" --description "Defect"
bytedcli codebase repo label update -R "example-org/example-repo" --id 780113308321420 --name type/defect
bytedcli codebase repo label delete -R "example-org/example-repo" --id 780113308321420

# 管理 Release
bytedcli codebase release list -R "example-org/example-repo" --query "v1." --query-mode prefix
bytedcli codebase release get -R "example-org/example-repo" --tag v1.0.0
bytedcli codebase release create -R "example-org/example-repo" --tag v1.0.1 --description "Release v1.0.1" --revision master --tag-message "Release v1.0.1"
bytedcli codebase release update -R "example-org/example-repo" --tag v1.0.1 --description "Updated release notes"

# 创建 MR
bytedcli codebase mr create -R "example-org/example-repo" --title "feat: demo"
bytedcli codebase mr create -R "example-org/example-repo" --title "feat: demo" --meego 123456

# 更新 MR：关联工作项 / 切 target branch
bytedcli codebase mr update 821 -R "example-org/example-repo" --meego 123456
bytedcli codebase mr update 821 -R "example-org/example-repo" --base develop

# Check Runs / CI
bytedcli codebase checks mr 821 -R "example-org/example-repo"
bytedcli codebase checks list -R "example-org/example-repo"
bytedcli codebase checks list -R "example-org/example-repo" --commit <sha> --mr 821
bytedcli codebase checks mr --commit <sha> -R "example-org/example-repo"
bytedcli codebase checks get -R "example-org/example-repo" --id c1
bytedcli codebase checks log 1234567890 unit_test_and_coverage --run-seq 126 --step-id 3456789012
bytedcli codebase checks log 2345678901 build_lint-step_4 --run-seq 1 --no-limit
bytedcli codebase checks log -R "example-org/example-repo" --check-run-id 4567890123
bytedcli codebase checks log -R "example-org/example-repo" --check-run-id 4567890123 > /tmp/check.log
bytedcli codebase mr artifacts list 821 -R "example-org/example-repo" --artifact example-artifact-filename
bytedcli codebase mr artifacts download 821 -R "example-org/example-repo" --artifact example-artifact-filename --all --output-dir ./ci-artifacts
grep -n 'error\\|fail' /tmp/check.log
bytedcli codebase mr status 821 -R "example-org/example-repo"

# Codebase/Bits Pipeline
bytedcli codebase pipeline list -R "example-org/example-repo" --branch main
bytedcli codebase pipeline status -R "example-org/example-repo" --branch main --pipeline CI
bytedcli codebase pipeline run -R "example-org/example-repo" --branch main --pipeline CI
bytedcli codebase pipeline run -R "example-org/example-repo" --branch main --pipeline CI --inputs '{"target":"demo"}'
bytedcli codebase pipeline runs list -R "example-org/example-repo" --branch main --pipeline CI
bytedcli codebase pipeline runs get -R "example-org/example-repo" --branch main --pipeline CI --run-seq 6

# Issue
bytedcli codebase issue comment 24 -R "example-org/example-repo" --body "ack"
bytedcli codebase issue comment list 24 -R "example-org/example-repo"
bytedcli codebase issue comment list https://code.byted.org/example-org/example-repo/issues/24
bytedcli codebase issue comment list 24 -R "example-org/example-repo" --author alice --status open
bytedcli codebase issue comment reply 24 -R "example-org/example-repo" --thread-id <thread_id> --body "fixed"
bytedcli codebase issue comment resolve -R "example-org/example-repo" --id <thread_id>
bytedcli codebase issue comment unresolve -R "example-org/example-repo" --id <thread_id>
bytedcli codebase issue delete 24 -R "example-org/example-repo"
bytedcli codebase search issue --assignee @me --status todo --page-size 5

# 依赖权限
bytedcli codebase permission check -R "example-org/example-repo"
bytedcli codebase permission check -R "example-org/example-repo" --revision main
bytedcli codebase permission apply -R "example-org/example-repo" --action reporter --reason "need read access" --repos "dep-org/dep-repo"

# MR 列表 / 生命周期
bytedcli codebase mr list -R "example-org/example-repo" --state open -L 20
bytedcli codebase mr count -R "example-org/example-repo"
bytedcli codebase mr close 821 -R "example-org/example-repo"
bytedcli codebase mr status 821 -R "example-org/example-repo"

# review scope
bytedcli codebase mr review 821 -R "example-org/example-repo" --approve --body "LGTM"
bytedcli codebase mr reviewer list 821 -R "example-org/example-repo"
bytedcli codebase mr reviewer update 821 -R "example-org/example-repo" --set 123456 --set 234567
bytedcli codebase mr reviewer update 821 -R "example-org/example-repo" --set alice --add bob   # 支持 username
bytedcli --json codebase mr status 821 -R "example-org/example-repo"   # review bypass 前先取 source_commit_id 和 ReviewRules[].Name
bytedcli codebase mr bypass list 821 -R "example-org/example-repo" --commit-id <source_commit>
bytedcli codebase mr bypass create 821 -R "example-org/example-repo" --commit-id <source_commit> --inputs-json '[{"TargetType":"review","Target":{"ReviewTarget":{"RuleId":"default"}},"Reason":"no_need_for_review"}]'

# merge_queue scope
bytedcli codebase mr queue status -R "example-org/example-repo"
bytedcli codebase mr queue list -R "example-org/example-repo" -L 20
bytedcli codebase mr queue enqueue 821 -R "example-org/example-repo" --merge-method rebase_merge
bytedcli codebase search mr --author @me --status open --page-size 5

# check_run scope
bytedcli codebase checks get -R "example-org/example-repo" --id c1
bytedcli codebase checks create -R "example-org/example-repo" --payload-json '{"Name":"ci/test","CommitId":"<sha>"}'
bytedcli codebase checks update -R "example-org/example-repo" --payload-json '{"Id":"c1","Status":"completed","Conclusion":"success"}'
bytedcli codebase checks operate -R "example-org/example-repo" --payload-json '{"CheckRunId":"c1","OperationId":"<operation_id_from_operations>"}'
bytedcli codebase checks operate -R "example-org/example-repo" --mr 821 --check-name SyncMrToCommon --operation-label 确定合入

# ci variable / schedule scope（Bits git pipeline 后端，复用 Bits SSO 登录）
bytedcli codebase ci variable list -R "example-org/example-repo"
printf %s "$SECRET" | bytedcli codebase ci variable set -R "example-org/example-repo" --key MY_TOKEN   # dry-run only：读 stdin 但不写
bytedcli codebase ci schedule list -R "example-org/example-repo" --branch main
bytedcli codebase ci schedule create -R "example-org/example-repo" --yaml release.yaml --branch main --name daily --cron "0 2 * * *"
bytedcli codebase ci schedule delete --id <triggerId>
bytedcli codebase ci schedule delete --id <id1> --id <id2>   # 批量按 id 删除

# Bits Analysis (Merge Check) — 拉每条规则级 issue 的详情（codebase checks get 只给汇总）
bytedcli codebase analysis project list -R "example-org/example-repo"
bytedcli codebase analysis issue list -R "example-org/example-repo" --severities warning,error
bytedcli codebase analysis issue list -R "example-org/example-repo" --mr 100
bytedcli codebase analysis issue list -R "example-org/example-repo" --project-id 1001 --scenario-id 2001
bytedcli --json codebase analysis issue list -R "example-org/example-repo"
```

## Notes

### 仓库与分支推断

- 在 `code.byted.org` / `code-tx.byted.org` 的 Git 目录内，`-R/--repo` 和 `--branch`/`--commit` 可省略，CLI 自动从 `origin` 推断
- MR selector 支持 `<number> | <url> | <branch>`，未传时回落到当前 Git 分支

### 常用约定

- 结构化输出：`bytedcli --json codebase ...`（`--json` 放子命令之前）
- `mr list` 默认 open；`issue list` 默认未完成态
- 缺少必填参数会输出完整帮助
- MR review bypass：`mr bypass list/create` 都必须带 `--commit-id`，取当前 MR `source_commit_id`（不要从多 commit 列表里任选）。先用 `bytedcli --json codebase mr status` 找 `data.merge_request.source_commit_id`，再从 `data.review.review_rule_groups[].ReviewRules[].Name` 取 review rule id（常见为 `default`）。review bypass 的 `--inputs-json` 使用服务端字段 `TargetType` / `Target` / `Reason`；不要用 `--review` 快捷参数或小写 `kind` / `target` / `reason` 示例来跳过 review，已知会被部分服务端规则拒绝。
- `codebase snippet get --save <dir>` 默认不覆盖本地已有文件；需要覆盖时显式加 `--force`
- `codebase snippet update --add-file/--remove-file` 会先读取现有文件并整组更新；若现有文件内容缺失或被服务端截断，会拒绝执行，避免写空远端文件
- Issue 评论：`bytedcli codebase issue comment <n> --body "..."` 是**写**一条；`bytedcli codebase issue comment list <n>` 是**读**评论列表（与 `mr comment list` 同款 sub-resource 模式，selector 支持 number 或 console URL，过滤参数 `--status open|resolved|closed`（thread 状态，非法值会直接报错；非 issue 自身 lifecycle status）/ `--author <name>`（按评论作者 Username 或 Email 做大小写不敏感的子串匹配））；`reply <n> --thread-id <id> --body "..."` 回复已有 thread；`resolve --id <id>` / `unresolve --id <id>` 更新 thread 状态

### CI 排查

- **优先用 `codebase checks log --check-run-id <id>` 看远端日志**，不要本地跑全量测试
- 日志重定向到文件后用 `grep “not ok\|fail\|error”` 定位失败点
- 排查顺序：`checks list --mr` → 找失败 check-run-id → `checks log --check-run-id` → grep
- 不知道 pipeline 名称时，先用 `codebase pipeline list -R <repo> --branch <branch>` 列出可用 pipeline name 与 YAML file。
- 触发 Codebase/Bits pipeline 前先用 `codebase pipeline status -R <repo> --branch <branch> --pipeline <name>` 查询最新状态；确认目标后用 `codebase pipeline run -R <repo> --branch <branch> --pipeline <name>` 创建真实 run。
- 需要给 manual pipeline 传输入时使用 `--inputs '<json>'` 或 `--inputs-file ./inputs.json`
- **排查 git-backed pipeline（含定时发版）失败时不用开浏览器**：`codebase pipeline status` 会拉取最新 run 详情，给出 failReason、失败 job/step 以及逐 step 的成功/失败状态；完整日志在输出的 Run URL（git pipeline 的 atom 日志在 Orca，不在 step_logs 接口）。
- 想看「连续挂了几晚」用 `codebase pipeline runs list -R <repo> --branch <branch> --pipeline <name>` 列出 run 历史（runSeq + 状态 + 触发人），再用 `codebase pipeline runs get --run-seq <n>`（或 `--run-id <id>`）定位某一次（含历史）失败原因。
- 详见 `../../troubleshooting.md`

### 操作 check run（重跑 / 取消等）

- `checks operate` 触发某个 check run 上声明的操作 —— 这些操作由创建该 check 的 App 定义，用来流转它的状态机（重跑、取消、刷新等）
- 可用操作不固定：每个 check run 的 `Operations` 数组列出它**当前**能执行的操作，会随 check 状态变化
- 用法：先 `bytedcli --json codebase checks list` 拿目标 check run 的 `Id` 和 `Operations`（`Operations` 只在 `--json` 输出里，默认文本表格不展示）；每个 operation 有 `Id`/`Label`/`Description`，按 `Label`/`Description` 判断它做什么
- 再调用 `checks operate --payload-json '{"CheckRunId":"<check run Id>","OperationId":"<选中 operation 的 Id>"}'`
- 如果是 MR 页面上的手动按钮，可让 bytedcli 自动按 MR + check 名 + 按钮文案解析：`bytedcli codebase checks operate -R <repo> --mr <mr> --check-name <check_name> --operation-label <button_label>`。例如 `SyncMrToCommon` 的「确定合入」按钮对应 `--check-name SyncMrToCommon --operation-label 确定合入`，也可显式传 `--operation-id syncMrToCommon`。
- 例：重跑选 `Label` 为 `Rerun`/`Re-run` 的项，取消选 `Cancel`（operation 的 `Id` 各 App 命名不统一，按 `Label` 认）

### CI 变量与定时任务

- `variable list` 返回的是**变量组模型**：解析 `group.varDefinitions[].name`（+ `kind` 区分加密/明文），不是扁平 key/value
- `variable set` 目前是 **dry-run / experimental**：仍从 stdin 或 `--value-file` 读值（绝不走命令行参数、不回显值），但**不会**发起任何写请求。原因是真实写入是对整个变量组的覆盖（含 `version`），其 body 尚未抓包确认，盲发可能清掉已有变量；需要写变量请暂时用 Bits/Codebase UI。`--confirm-write` 也被显式拦截
- `schedule list` 走 `GET /pipelines/git/triggers`（复数），**必须带分支**：未传 `--branch` 时回落到当前 git 分支，支持 `--page-num/--page-size`
- `schedule create` 会先用后端纯函数 `next_schedules` 校验 cron（非法 cron 直接报错，不发起写请求），并给出下次执行时间；`triggeredBy` 默认取当前登录用户，可用 `--triggered-by` 覆盖
- `schedule delete` 是**按 id 批量删**：`DELETE /pipelines/triggers`（注意没有 `git` 段），body `{"triggerIds":[...]}`；命令行可重复 `--id` 或逗号分隔
- `variable` 端点按数字 repoId 寻址（owner/repo 自动解析为 repoId）；`schedule` 端点按 owner/repo 路径寻址，因此 `schedule` 必须能拿到 `-R/--repo`

### MR 关联 Meego 工作项

1. 搜索：`bytedcli --json meego workitem list --project-key <key> --mql “SELECT \`work_item_id\`, \`name\` FROM \`<key>\`.\`story\` WHERE \`name\` LIKE '%关键字%' LIMIT 10”`
2. 呈现 ID + 名称列表让用户选择
3. 执行：`bytedcli codebase mr create/update --meego <work_item_id>`

### 依赖权限

```bash
bytedcli codebase permission check -R <repo>              # 查缺少权限的依赖
bytedcli codebase permission apply -R <repo> --action reporter --reason “...” --repos “dep/repo”
```

## References

- `references/codebase.md`
- `../../troubleshooting.md`

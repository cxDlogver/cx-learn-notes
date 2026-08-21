# Codebase (bytedcli)

```bash
# 在 code.byted.org 或 code-tx.byted.org 的 Git 仓库目录内，支持仓库选择器的命令可省略 -R/--repo 或 --repo-name

# Auth
bytedcli codebase auth config-add-pat <pat>
bytedcli codebase auth config-auth --jwt-token <token>
bytedcli codebase auth config-auth --app-id <app-id> --app-secret <app-secret>

# Repo
bytedcli codebase repo get "example-org/example-repo"
bytedcli codebase repo list --query "demo-query"
bytedcli codebase namespace list # 只列出可用 namespace；按名称查找用 search
bytedcli codebase namespace search --query "example" # search 必须带 query
bytedcli codebase repo create --namespace example-org --name example-repo --description "Demo repo" --search-bytetree "Example Team"
bytedcli codebase repo create --namespace example-org --name example-repo --groot-node-id 12345
bytedcli codebase repo create --namespace example-org --name example-repo --groot-node-id 12345 --execute --confirm example-org/example-repo
bytedcli codebase repo branch list -R "example-org/example-repo" --query "feat/" --query-mode prefix
bytedcli codebase repo branch get -R "example-org/example-repo" --name main
bytedcli codebase repo branch create feat/demo -R "example-org/example-repo" --from master
bytedcli codebase repo file "README.md" -R "example-org/example-repo"
bytedcli codebase repo file "https://code.byted.org/example-org/example-repo/blob/main/path/to/file.ts"
bytedcli codebase repo blame "src/main.ts" -R "example-org/example-repo" -r main
bytedcli codebase repo blame "src/main.ts" -R "example-org/example-repo" -r main --start-line 10 --end-line 20
bytedcli codebase repo blame "https://code.byted.org/example-org/example-repo/blob/main/src/main.ts" --start-line 10
bytedcli codebase repo member get -R "example-org/example-repo"
bytedcli codebase repo protected-branch list -R "example-org/example-repo"
bytedcli codebase commit list -R "example-org/example-repo" --revision master
bytedcli codebase commit get -R "example-org/example-repo" --revision <sha>

# Snippet
bytedcli codebase snippet get <snippet_id>
bytedcli codebase snippet get <snippet_id> --file index.ts
bytedcli codebase snippet get <snippet_id> --save ./snippet-files
bytedcli codebase snippet list --query "demo-query" --page-size 10
bytedcli codebase snippet create --title "demo snippet" --visibility internal --file ./README.md
bytedcli codebase snippet update --id <snippet_id> --add-file ./new.txt --remove-file old.txt
bytedcli codebase snippet delete --id <snippet_id> --yes

# Issue
bytedcli codebase issue list -R "example-org/example-repo" # 默认只看 open
bytedcli codebase issue list -R "example-org/example-repo" --status todo --limit 20
bytedcli codebase issue get 52 -R "example-org/example-repo"
bytedcli codebase issue comment 24 -R "example-org/example-repo" --body "ack"          # 写：发一条评论
bytedcli codebase issue comment list 24 -R "example-org/example-repo"                  # 读：列出某 issue 的所有评论
bytedcli codebase issue comment list https://code.byted.org/example-org/example-repo/issues/24
bytedcli codebase issue comment list 24 -R "example-org/example-repo" --author alice --status open
bytedcli codebase issue comment reply 24 -R "example-org/example-repo" --thread-id <thread_id> --body "fixed"
bytedcli codebase issue comment resolve -R "example-org/example-repo" --id <thread_id>
bytedcli codebase issue comment unresolve -R "example-org/example-repo" --id <thread_id>
bytedcli codebase issue delete 24 -R "example-org/example-repo"

# MR 基础查询
bytedcli codebase mr get 821 -R "example-org/example-repo"
bytedcli codebase mr get
bytedcli codebase mr get 821 -R "example-org/example-repo"
bytedcli codebase mr comment list 821 -R "example-org/example-repo"
bytedcli codebase mr files 821 -R "example-org/example-repo"
bytedcli codebase mr diff 821 -R "example-org/example-repo" --file "path/to/file.ts"
bytedcli codebase repo tag list -R "example-org/example-repo" --query "v1." --query-mode prefix
bytedcli codebase repo tag create -R "example-org/example-repo" --name v1.0.1 --revision master --message "Release v1.0.1"
bytedcli codebase repo label list -R "example-org/example-repo"
bytedcli codebase repo label create -R "example-org/example-repo" --name type/bug --color "#D73A4A" --description "Defect"
bytedcli codebase repo label update -R "example-org/example-repo" --id 780113308321420 --name type/defect
bytedcli codebase repo label delete -R "example-org/example-repo" --id 780113308321420
bytedcli codebase release list -R "example-org/example-repo" --query "v1." --query-mode prefix
bytedcli codebase release get -R "example-org/example-repo" --tag v1.0.0
bytedcli codebase release create -R "example-org/example-repo" --tag v1.0.1 --description "Release v1.0.1" --revision master --tag-message "Release v1.0.1"
bytedcli codebase release update -R "example-org/example-repo" --tag v1.0.1 --description "Updated release notes"

# CI / Check Runs
bytedcli codebase checks mr 821 -R "example-org/example-repo"
bytedcli codebase checks list -R "example-org/example-repo"
bytedcli codebase checks list -R "example-org/example-repo" --commit <sha> --mr 821
bytedcli codebase checks mr --commit <sha> -R "example-org/example-repo"
bytedcli codebase checks get -R "example-org/example-repo" --id <check_run_id>
bytedcli codebase checks log 1234567890 unit_test_and_coverage --run-seq 126 --step-id 3456789012
bytedcli codebase checks log 2345678901 build_lint-step_4 --run-seq 1 --no-limit
bytedcli codebase checks log -R "example-org/example-repo" --check-run-id 4567890123
bytedcli codebase mr artifacts list 821 -R "example-org/example-repo" --artifact example-artifact-filename
bytedcli codebase mr artifacts download 821 -R "example-org/example-repo" --artifact example-artifact-filename --all --output-dir ./ci-artifacts
# Logs can be large; prefer redirecting to a file and searching locally.
bytedcli codebase checks log -R "example-org/example-repo" --check-run-id 4567890123 > /tmp/check.log
grep -n 'error\\|fail' /tmp/check.log
bytedcli codebase mr status 821 -R "example-org/example-repo"

# Codebase/Bits Pipeline
bytedcli codebase pipeline list -R "example-org/example-repo" --branch main
bytedcli codebase pipeline status -R "example-org/example-repo" --branch main --pipeline CI
bytedcli codebase pipeline run -R "example-org/example-repo" --branch main --pipeline CI
bytedcli codebase pipeline run -R "example-org/example-repo" --branch main --pipeline CI --inputs '{"target":"demo"}'
bytedcli codebase pipeline runs list -R "example-org/example-repo" --branch main --pipeline CI
bytedcli codebase pipeline runs get -R "example-org/example-repo" --branch main --pipeline CI --run-seq 6

# Comment
bytedcli codebase mr comment draft 821 -R "example-org/example-repo" --body "draft comment"
bytedcli codebase mr comment publish 821 -R "example-org/example-repo" --body "LGTM"
bytedcli codebase mr comment reply 821 -R "example-org/example-repo" --thread-id <thread_id> --body "fixed"
bytedcli codebase mr comment resolve -R "example-org/example-repo" --id <thread_id>
bytedcli codebase mr comment unresolve -R "example-org/example-repo" --id <thread_id>

# 创建 / 更新 PR
bytedcli codebase mr create -R "example-org/example-repo" \
  --title "feat: demo"
bytedcli codebase mr create -R "example-org/example-repo" \
  --title "feat: demo" --meego 123456
bytedcli codebase mr update 821 -R "example-org/example-repo" --body "first line\nsecond line"
bytedcli codebase mr update 821 -R "example-org/example-repo" --meego 123456
bytedcli codebase mr update 821 -R "example-org/example-repo" --base develop   # 切 MR 的 target branch 到另一条 release/集成分支

# 搜索 Meego 工作项（获取 work_item_id 后填入 MR）
bytedcli --json meego workitem list --project-key <project_key> \
  --mql "SELECT \`work_item_id\`, \`name\` FROM \`<project_key>\`.\`story\` WHERE \`name\` LIKE '%关键字%' LIMIT 10"

# PR 列表 / 生命周期
bytedcli codebase mr list -R "example-org/example-repo" # 默认只看 open
bytedcli codebase mr list -R "example-org/example-repo" --state open -H feature/foo -B master -L 20
bytedcli codebase search mr --author @me --status open --page-size 5
bytedcli codebase mr count -R "example-org/example-repo"
bytedcli codebase mr close 821 -R "example-org/example-repo"
bytedcli codebase mr reopen 821 -R "example-org/example-repo"
bytedcli codebase mr merge 821 -R "example-org/example-repo" --merge-method rebase_merge

# PR Review / Queue
bytedcli codebase mr review 821 -R "example-org/example-repo" --approve --body "LGTM" # 自动附带当前 MR 最新 source commit
bytedcli codebase mr review --comment --body-file ./review.txt
bytedcli codebase mr reviewer list 821 -R "example-org/example-repo"
bytedcli codebase mr reviewer update 821 -R "example-org/example-repo" --add 123456 --add 234567
bytedcli codebase mr reviewer update 821 -R "example-org/example-repo" --add alice --remove bob   # 支持 username
bytedcli --json codebase mr status 821 -R "example-org/example-repo"   # review bypass 前先取 source_commit_id 和 ReviewRules[].Name
bytedcli codebase mr bypass list 821 -R "example-org/example-repo" --commit-id <source_commit>
bytedcli codebase mr bypass create 821 -R "example-org/example-repo" --commit-id <source_commit> --inputs-json '[{"TargetType":"review","Target":{"ReviewTarget":{"RuleId":"default"}},"Reason":"no_need_for_review"}]'
bytedcli codebase mr queue status -R "example-org/example-repo"
bytedcli codebase mr queue list -R "example-org/example-repo" -L 20
bytedcli codebase mr queue entries 821 -R "example-org/example-repo"
bytedcli codebase mr queue enqueue 821 -R "example-org/example-repo" --merge-method rebase_merge
bytedcli codebase mr queue dequeue 821 -R "example-org/example-repo"

# Check Run 读写
bytedcli codebase checks get -R "example-org/example-repo" --id c1
bytedcli codebase checks create -R "example-org/example-repo" --payload-json '{"Name":"ci/test","CommitId":"<sha>"}'
bytedcli codebase checks update -R "example-org/example-repo" --payload-json '{"Id":"c1","Status":"completed","Conclusion":"success"}'
bytedcli codebase checks operate -R "example-org/example-repo" --payload-json '{"CheckRunId":"c1","OperationId":"<operation_id_from_operations>"}'
bytedcli codebase checks operate -R "example-org/example-repo" --mr 821 --check-name SyncMrToCommon --operation-label 确定合入
bytedcli codebase search issue --assignee @me --status todo --page-size 5

# Permission（依赖权限）
bytedcli codebase permission check -R "example-org/example-repo"
bytedcli codebase permission check -R "example-org/example-repo" --revision main
bytedcli --json codebase permission check -R "example-org/example-repo"
bytedcli codebase permission apply -R "example-org/example-repo" --action reporter --reason "need read access" --repos "dep-org/dep-repo"
bytedcli codebase permission apply -R "example-org/example-repo" --action developer --reason "need write access" --repos "dep-org/repo1,dep-org/repo2"
```

## 迁移说明

- 公开命令树已切换为 `codebase auth|repo|commit|mr|issue|checks|search` 的资源分组形式；MR 评论统一走 `codebase mr comment`，reviewer/bypass/queue 相关操作分别走 `codebase mr reviewer|bypass|queue`，跨仓库搜索走 `codebase search mr|issue`，master 上已有的平铺命令仍保留为兼容入口。
- Snippet 入口为 `codebase snippet list|get|create|update|delete`；`get --save <dir>` 默认不覆盖本地已有文件，增量更新 `--add-file/--remove-file` 会拒绝复用内容缺失或被截断的远端文件。
- 当前 Git 仓库 `origin` 可用于自动推断仓库；如果推断失败，CLI 会说明是非 Git 仓库、缺少 `origin`、host 不支持，还是 remote 无法解析。
- 主仓库选择器统一推荐 `-R, --repo`；PR / issue 编号默认使用位置参数；正文统一用 `--body`，PR 创建改用 `--head/--base`。
- `codebase commit list|get` 使用 `--revision` 指定 branch/tag/commit SHA；未显式传入时会优先使用当前 Git 分支，失败后回落到仓库默认分支。
- `codebase release list|get|create|update` 用于查询和维护挂在 tag 上的 release 描述；`release list` 会按 tag 扫描并解析 release，tag 很多时会更慢。
- `codebase checks list` 会保留 branch / commit 级 check runs，并在能解析出对应 MR 或显式传入 `--mr` / `--mr-id` 时，额外分组展示 `MR Check Runs`。
- `codebase pipeline list` 支持用 `-R + --branch/--git-tag` 列出 git-backed pipeline，可配 `--search` 过滤；不知道 pipeline 名称时先用它确认 name 与 YAML file。
- `codebase pipeline run` 支持用 `-R + --branch/--git-tag + --pipeline` 触发 git-backed pipeline，也可用 pipeline detail URL 或 `--file` 定位；manual inputs 用 `--inputs` 或 `--inputs-file` 传入。
- `codebase pipeline status` 支持用同一组 `-R + --branch/--git-tag + --pipeline` 选择器查询最新 run 状态，并自动拉取该 run 的详情：failReason、失败 job/step 以及逐 step 的成功/失败状态。
- `codebase pipeline runs list` 用 `-R + --branch/--git-tag + --pipeline` 列出该 pipeline 的 run 历史（runSeq / 状态 / 触发人 / 提交），支持 `--page/--page-size`，用于判断「连续挂了几晚」。
- `codebase pipeline runs get` 给出某次 run 的失败诊断，需用 `--run-seq <n>`（来自 runs list）或 `--run-id <id>` 指定 run（最新 run 直接用 status）：失败 step、failReason、逐 step 状态，以及指向完整日志的 Run URL（git pipeline 的 atom 日志在 Orca，step_logs 接口对 git pipeline 返回空）。
- `codebase mr artifacts list|download` 会解析 MR check run 正文里的 BITS artifact 链接；下载多个匹配项时需要 `--all`，文件默认按 check run id 分目录保存。
- `codebase mr bypass list/create` 都必须带 `--commit-id`，取当前 MR `source_commit_id`（不要从多 commit 列表里任选）。先用 `bytedcli --json codebase mr status` 找 `data.merge_request.source_commit_id`，再从 `data.review.review_rule_groups[].ReviewRules[].Name` 取 review rule id（常见为 `default`）。review bypass 的 `--inputs-json` 使用服务端字段 `TargetType` / `Target` / `Reason`；不要用 `--review` 快捷参数或小写 `kind` / `target` / `reason` 示例来跳过 review，已知会被部分服务端规则拒绝。
- `codebase repo member get` 读当前登录用户在该仓库的 access level，并派生 `Can Push`（developer/maintainer/master/owner 可推）；走 code.byted.org 前端 REST `/_/api/v1/repos/{path}/members/self`。
- `codebase repo protected-branch list` 列保护分支及其 push/merge access level；走 GitLab v4 `/api/v4/projects/{id}/protected_branches`（仓库的 Codebase 数字 Id 即 GitLab project id），空列表表示没有保护分支。
- 旧的扁平命令如 `get-merge-request`、`create-mr`、`create-branch`、`list-check-runs` 仍保留为隐藏兼容别名，建议新流程切到新命令树。

## CI 排障顺序

1. 先用 `codebase checks mr <mr>` 看 MR 级 checks，总结失败项和运行中项。
2. 再用 `codebase checks get --id <check_run_id>` 看失败 job、step 和 step 链接。
3. 默认用 `codebase checks log --check-run-id <id>` 批量展开整条 check run 的日志。
4. 若 check run 暴露 artifacts，用 `codebase mr artifacts list` 先确认可下载项，再用 `download --artifact <name>` 拉取完整包。
5. 需要手动触发仓库内 pipeline 时，先用 `codebase pipeline list -R <repo> --branch <branch>` 找到 pipeline name，再用 `codebase pipeline status -R <repo> --branch <branch> --pipeline <name>` 看最新状态，随后用 `codebase pipeline run -R <repo> --branch <branch> --pipeline <name>` 创建真实 run。
6. 排查 git-backed pipeline（含定时发版）失败：`codebase pipeline runs list ... --pipeline <name>` 看连续失败的 run 历史，再 `codebase pipeline runs get ... --pipeline <name> --run-seq <n>` 拿到失败 step + failReason；这条链路不依赖 `checks` 接口（git pipeline 原生 run 不进 `codebase checks`）。
7. 日志优先重定向到文件，再用 `rg` / `grep` / `less` 搜索，不要直接把全文贴进上下文。
8. 看到失败后，先判断是业务代码失败、CLI 自己回归，还是外部平台问题，再决定修复方向。

# Code Review / 代码审查

字节 devinfra 官方代码审查能力分两部分：完整评审 skill `bits-code-guard`，以及只读拉取仓库审查配置的 `bytedcli code-review` 命令。

## 完整评审 skill：bits-code-guard

对 Codebase MR/PR、commit、分支、本地文件或未提交 diff 做缺陷审查，输出带严重度与置信度的结构化清单、修复建议与 HTML 报告，并可在 MR 上留行级评论。它是独立安装的 skill，不随本路由内联：

```bash
# 安装到当前 agent
bytedcli self skill install -s bits-code-guard
# 全局安装到 Claude Code
bytedcli self skill install -s bits-code-guard -a claude-code -g
```

安装后用自然语言（“review 这个 MR”“CR 一下我这次改动”“帮我看看这段有没有 bug”）或 `/bits-code-guard` 触发；完整工作流见已安装 skill 的 `SKILL.md`。

## 拉取仓库审查配置：bytedcli code-review

查某个仓库绑定的自定义审查规则 / 工作流（只读，无需安装上面的 skill）：

```bash
bytedcli code-review rule list --repo group/project
bytedcli code-review workflow list --repo group/project
```

`--repo` 也接受 code.byted.org 的 SSH/HTTPS remote URL；在仓库目录内执行时可省略，自动从 git origin 推断。

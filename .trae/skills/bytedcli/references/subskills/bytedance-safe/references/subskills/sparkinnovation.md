# Safe SparkInnovation

SparkInnovation 小改变工作流 skill，覆盖小改变列表、详情、创建、更新、认领，以及业务线、部门和枚举值查询。

## Prerequisites

- Requires unified bytedcli BDSSO authentication. If not already logged in:

```bash
bytedcli auth login --session
```

- 通用调用方式见 `../invocation.md`
- 如果要在创建小改变时自动创建 Meego，还需要先准备 Meego 登录态：

```bash
bytedcli meego login
```

## When to use

- 用户要查询 SparkInnovation 小改变列表
- 用户要查看某个 change 的详情
- 用户要创建、更新或认领小改变
- 用户要创建小改变，并希望自动补建 Meego 需求后绑定到 `meego_link`
- 用户不知道 `category`、`priority`、`status` 的可选值
- 用户只给了业务语义，需要你自动选择 `safe sparkinnovation` 相关命令

## Quick start

```bash
# 列业务线
bytedcli safe sparkinnovation biz-line list

# 列部门
bytedcli safe sparkinnovation department list --biz-line 123

# 查询小改变列表
bytedcli safe sparkinnovation change list --biz-line 123

# 查看详情
bytedcli safe sparkinnovation change get --id 9527 --biz-line 123

# 查看枚举
bytedcli safe sparkinnovation change enum get

# 先创建 Meego，再把返回 URL 绑定到小改变
bytedcli meego create \
  --space demo-project \
  --title "优化 xxx 流程" \
  --description "这里可以复用小改变描述"

# 创建（创建后初始状态通常是“待认领”）
# ⚠️ Markdown 含换行时必须用 $'...' 让 shell 真正解析 \n 为换行；
# 普通双引号 "..." 里的 \n 是字面量两个字符，CLI 会原样收到，
# 富文本里就会渲染成「一坨没有换行」的文本。详见下方 Markdown 多行换行 章节。
bytedcli safe sparkinnovation change create \
  --title "优化 xxx 流程" \
  --category "技术优化" \
  --description $'## 背景\n\n这里写 Markdown' \
  --meego-link "https://meego.larkoffice.com/demo-project/story/detail/123456" \
  --priority P2 \
  --biz-line 123

# 认领（认领后 owner 变成当前用户，状态变成“进行中”）
bytedcli safe sparkinnovation change claim --id 9527 --biz-line 123

# 更新并完成
# ⚠️ 即使 cost-benefit 之前在 create / 上一次 update 已经写过，
#    --completed 必须在同一条命令里再次传入 --cost-benefit；
#    后端在“完成”分支会重新校验该字段，未带或被覆盖为空都会被拒绝。
bytedcli safe sparkinnovation change update \
  --id 9527 \
  --biz-line 123 \
  --solution $'## 实施方案\n\n- step 1\n- step 2' \
  --cost-benefit $'## 成本收益\n\n- 节省人工处理成本' \
  --completed
```

## 富文本字段拆分（必读）

`description` / `solution` / `cost-benefit` 是 **三个独立的富文本字段**，前端详情页会按段渲染：

- `description`：背景、问题描述、改动范围、上下游影响等"为什么要做、做了什么"
- `solution`：实施方案、技术细节、上线节奏、回滚方案等"怎么做"
- `cost-benefit`：成本与收益，例如人力/机器节省、稳定性提升、耗时下降等量化或半量化结论

AI 在拿到用户给的一大段 Markdown 时，**必须按语义把内容拆到这三个字段里**，不要全部塞进 `description` 让另外两个字段空着：

- 用户原文里出现"背景 / 现状 / 问题 / 改动内容"段落 → 进 `description`
- 用户原文里出现"方案 / 步骤 / 实现 / 上线策略 / 配置升级"段落 → 进 `solution`
- 用户原文里出现"成本 / 收益 / 节省 / 提升 / 缩短 / ROI"段落 → 进 `cost-benefit`

如果用户给的信息不足以拆出三段，至少保证 `cost-benefit` 单独写出一条收益（即使是定性描述），否则后续 `--completed` 会被后端拒绝。

## Markdown 多行换行（必读）

`description` / `solution` / `cost-benefit` 等字段接收 Markdown 字符串。CLI 内部用真实换行符 `\n`（0x0A）切行，不会自己把字面量 `\` + `n` 还原成换行。所以：

- ❌ 错误写法：`--description "## 背景\n\n正文"`
  - 双引号里的 `\n` 在 bash/zsh 下不会被解释，CLI 收到的就是 `## 背景\n\n正文` 这一坨字面量，富文本会渲染成单行。
- ✅ 正确写法：`--description $'## 背景\n\n正文'`
  - bash/zsh 的 `$'...'` 会真正把 `\n` 转成换行符。
- ✅ 也可以直接换真实换行（行内嵌入实际换行），或使用 heredoc：

```bash
bytedcli safe sparkinnovation change create \
  --title "优化 xxx 流程" \
  --category "技术优化" \
  --priority P2 \
  --biz-line 123 \
  --description "$(cat <<'EOF'
## 背景

正文第一行
正文第二行
EOF
)"
```

AI 写命令时**默认用 `$'...'`**，不要图省事写 `"...\n..."`。

## Recommended workflow

1. 如果用户没有给 `biz_line`，先执行 `biz-line list`
2. 如果用户没有给枚举值，先执行 `change enum get`，不要猜
3. 查看单个 change 时优先用 `change get --id ... --biz-line ...`，不要把 `change list` 当详情入口
4. 创建小改变时，如果用户没有给 `meego_link`，且没有明确说“不需要 Meego”，优先先创建 Meego 再绑定
5. 创建和更新富文本字段时，直接传 Markdown 给 CLI；要把内容按语义拆到 `description` / `solution` / `cost-benefit` 三个字段，不要全部塞进 `description`
6. 需要机器可读输出时，优先使用 `bytedcli --json ...`
7. `change list` 的分页参数默认是 `--page 1 --page-size 20`
8. 如果目标是“从创建推进到完成”，推荐顺序是 `create -> claim -> update --completed`

## Key rules

- 小改变创建默认要关联 Meego：如果用户没给 `meego_link`，且没有明确说不需要 Meego，先调用 `bytedance-meego` / `bytedcli meego create` 创建需求，再把返回 URL 填给 `change create --meego-link`
- 创建 Meego 时优先复用用户给的小改变标题和描述；若描述较长，可提炼成适合 Meego 的简版标题与描述，但不要编造额外需求信息
- 只有当用户已经提供 `meego_link`，或明确表示“不需要创建 Meego / 不要绑定 Meego”时，才跳过自动建 Meego
- `change create` 的 `description`、`solution`、`cost-benefit` 接收 Markdown，CLI 会自动转成富文本 JSON
- 含换行的 Markdown 必须用 `$'...'` 写（如 `$'## 背景\n\n正文'`）；写成 `"...\n..."` 时 shell 不会展开 `\n`，富文本会渲染成「一坨没有换行」的文本
- `change get` 会把后端富文本字段自动转成 Markdown 展示
- `change list` 用于列表筛选；按 ID 看详情时用 `change get`
- `change list` 的时间筛选 flag 使用 `--start` / `--end`，值仍然传 ISO 时间戳
- `change update` 未传的字段不会更新
- `change update` 中 `title` 未传则不下发；传了但 `trim` 后为空会报错
- `change update --completed` 之前必须保证 `cost-benefit` 非空；并且 **必须在同一条 `update --completed` 命令里再次传入 `--cost-benefit`**，即使之前在 create / 上一次 update 时已经写过 —— 后端在完成分支会重新校验该字段，未带会被拒绝
- `change create` 的三个富文本字段是独立字段，要按语义拆分：背景/改动范围 → `description`，方案/步骤 → `solution`，成本/收益 → `cost-benefit`；不要把整段 Markdown 全部塞进 `description` 而让另外两个字段空着
- `--completed` 是布尔 flag；只有显式带上时才标记完成，不带时不会下发该字段
- `change claim` 只需要 `id` 和 `biz_line`
- 如果缺少 `biz_line`，先运行 `bytedcli safe sparkinnovation biz-line list`
- 文档里的 `123` 只是占位值；真实 `biz_line` 请先通过 `bytedcli safe sparkinnovation biz-line list` 获取
- `--json` 是全局参数，必须放在命令前

## References

- `../invocation.md`
- `references/subskills/sparkinnovation.md`
- `../troubleshooting.md`
- `../bytedance-meego/SKILL.md`

## Reference: sparkinnovation

## SparkInnovation 命令面

## 发现类命令

```bash
# 业务线
bytedcli safe sparkinnovation biz-line list

# 部门
bytedcli safe sparkinnovation department list --biz-line 123

# 枚举值
bytedcli safe sparkinnovation change enum get
```

推荐顺序：

1. 不知道业务线时先 `biz-line list`
2. 不知道枚举值时先 `change enum get`
3. 创建小改变时，如果没有现成 `meego_link`，且用户没有明确要求跳过 Meego，先执行 `meego create`
4. 再执行 `list`、`create`、`update`、`claim`

## 查询类命令

```bash
# 列表
bytedcli safe sparkinnovation change list --biz-line 123

# 按标题和枚举条件过滤
bytedcli safe sparkinnovation change list \
  --biz-line 123 \
  --title "优化" \
  --category "技术优化" \
  --status "进行中" \
  --priority P2 \
  --start 2026-01-01T00:00:00Z \
  --end 2026-01-31T00:00:00Z

# 详情
bytedcli safe sparkinnovation change get --id 9527 --biz-line 123
```

说明：

- `change get` 必须同时提供 `--id` 和 `--biz-line`
- `change get` 会把后端富文本字段自动转换成 Markdown 展示
- `change list` 支持按 `title` 做标题文本过滤
- `change list` 支持的枚举过滤字段有 `category`、`status`、`priority`
- `change list` 的时间筛选 flag 使用 `--start` / `--end`，值仍然传 ISO 时间戳
- `change list` 默认按 `--page 1 --page-size 20` 分页
- 按 ID 获取单个 change 时用 `change get`，不要把 `change list` 当详情入口
- 文档中的 `123` 是占位值；真实 `biz_line` 先通过 `bytedcli safe sparkinnovation biz-line list` 获取

## 创建类命令

```bash
# 先创建 Meego，拿到返回的 URL
bytedcli meego create \
  --space demo-project \
  --title "优化 xxx 流程" \
  --description "这里可以复用小改变描述"

# 再创建小改变，并绑定 meego_link
# ⚠️ 含换行 Markdown 必须用 $'...'，普通 "..." 不会解释 \n
bytedcli safe sparkinnovation change create \
  --title "优化 xxx 流程" \
  --category "技术优化" \
  --description $'## 背景\n\n这里写 Markdown' \
  --solution $'- step 1\n- step 2' \
  --cost-benefit "- 节省人力" \
  --meego-link "https://meego.larkoffice.com/demo-project/story/detail/123456" \
  --priority P2 \
  --biz-line 123
```

说明：

- `title`、`category`、`priority`、`biz_line` 是必填
- `description`、`solution`、`cost-benefit` 传 Markdown 即可
- CLI 会自动把 Markdown 转成后端需要的富文本 JSON
- **含换行的 Markdown 必须用 `$'...'`，不要写成 `"...\n..."`**（shell 不会解释，CLI 收到的是字面量 `\n`，富文本会渲染成单行）
- 默认策略：创建小改变时，如果用户没给 `meego_link`，且没有明确要求跳过 Meego，先创建 Meego 再绑定
- 创建 Meego 优先复用现有 `bytedance-meego` skill 和 `bytedcli meego create`，不要在 `sparkinnovation` skill 里重复定义 Meego 创建协议
- 如果用户已经提供 `meego_link`，直接透传给 `change create`
- 如果用户明确说“不需要创建 Meego”或“不绑定 Meego”，则不要自动创建

## 自动创建 Meego 并绑定

推荐方案：

1. 先复用现有 `bytedance-meego` skill 的创建路径
2. 默认调用高层命令 `bytedcli meego create`，而不是直接拼更底层的 `meego workitem create`
3. 从返回结果中取 `url`
4. 把该 `url` 作为 `--meego-link` 传给 `safe sparkinnovation change create`

原因：

- `bytedance-meego` 已经封装了 Meego 登录、快速创建需求和结果输出
- `bytedcli meego create` 是面向“快速建需求”的高层命令，最适合这里的自动编排
- 这样 `sparkinnovation` skill 只负责工作流编排，不需要复制 Meego 领域细节

默认编排规则：

```text
if user provides meego_link:
  use it directly
else if user explicitly says no meego:
  create sparkinnovation change without meego_link
else:
  create meego from change title/description
  bind returned meego url to change create --meego-link
```

推荐命令序列：

```bash
# Step 1: 创建 Meego
bytedcli meego create \
  --space demo-project \
  --title "优化审核流转效率" \
  --description "当前人工流转成本较高，计划通过自动分发和流程收敛提升效率"

# Step 2: 创建小改变并绑定 Meego URL
bytedcli safe sparkinnovation change create \
  --title "优化审核流转效率" \
  --category "流程工具" \
  --description $'## 背景\n\n当前人工流转成本较高' \
  --meego-link "https://meego.larkoffice.com/demo-project/story/detail/123456" \
  --priority P2 \
  --biz-line 123
```

参数映射建议：

- Meego `title`：优先复用小改变 `title`
- Meego `description`：优先复用小改变 `description` 的 Markdown 文本；必要时可以做轻量摘要，但不要编造额外背景
- 小改变 `meego_link`：使用 `meego create` 返回的 `url`

## 从创建到完成的完整流程

```bash
# 1. 创建 Meego
bytedcli meego create \
  --space demo-project \
  --title "优化审核流转效率" \
  --description "当前人工流转成本较高，计划通过自动分发和流程收敛提升效率"

# 2. 创建小改变：新建后通常是“待认领”
bytedcli safe sparkinnovation change create \
  --title "优化审核流转效率" \
  --category "流程工具" \
  --description $'## 背景\n\n当前人工流转成本较高' \
  --meego-link "https://meego.larkoffice.com/demo-project/story/detail/123456" \
  --priority P2 \
  --biz-line 123

# 3. 认领：owner 变成当前用户，状态变成“进行中”
bytedcli safe sparkinnovation change claim --id 9527 --biz-line 123

# 4. 更新并完成：完成前必须保证 cost-benefit 非空
bytedcli safe sparkinnovation change update \
  --id 9527 \
  --biz-line 123 \
  --solution $'## 实施方案\n\n- 接入自动分发\n- 缩短人工等待时间' \
  --cost-benefit $'## 成本收益\n\n- 每日节省人工处理时长' \
  --completed
```

说明：

- 如果用户没有给 `meego_link`，默认应先创建 Meego 再创建小改变
- 创建后默认不是“进行中”，通常先进入“待认领”
- 认领后后端会把 `owner` 设为当前用户，并把状态推进到“进行中”
- 想把状态推进到“已完成”时，必须保证 `cost-benefit` 非空，且 **必须在同一条 `update --completed` 命令里同时再次传入 `--cost-benefit`**，即使之前 `create` 或上一次 `update` 已经写过 —— 后端在完成分支会重新校验该字段，未带会被拒绝

## 更新类命令

```bash
bytedcli safe sparkinnovation change update \
  --id 9527 \
  --biz-line 123 \
  --title "更新后的标题" \
  --category "技术优化" \
  --priority P2 \
  --completed
```

说明：

- `id` 和 `biz_line` 必填
- 其他字段按需传；未传字段不会更新
- `--completed` 是 flag，带上时才会下发完成标记；不带时不会下发该字段
- `title` 未传不下发；传了但去空白后为空会报错
- 想完成 change 时，必须确保 `cost-benefit` 非空；并且 **必须在同一条 `update --completed` 命令里再次传入 `--cost-benefit`**，即使之前已经写过 —— 后端在完成分支会重新校验该字段，未带会被拒绝

## 认领类命令

```bash
bytedcli safe sparkinnovation change claim --id 9527 --biz-line 123
```

说明：

- 只需要 `id` 和 `biz_line`
- 适用于“认领”“参与”“加入处理该 change”等意图
- 缺少 `biz_line` 时，先运行 `bytedcli safe sparkinnovation biz-line list`

## 枚举值

- `category`
  - `业务创新`
  - `技术优化`
  - `流程工具`

- `priority`
  - `P0`
  - `P1`
  - `P2`

- `status`
  - `待认领`
  - `进行中`
  - `已完成`

## AI 使用建议

- 不确定枚举时先查 `change enum get`，不要猜
- 需要结构化结果时优先用 `bytedcli --json`
- 用户只说“认领这个 change”时，优先尝试 `change claim`
- 用户只说“改一下这个 change”时，优先用 `change update`
- 用户提到“按标题搜”时，优先用 `change list --title <text>`
- 用户给一大段 Markdown 时，按语义把内容拆到 `description` / `solution` / `cost-benefit` 三个字段，不要全部塞进 `description`
- 用户要创建小改变但没给 `meego_link` 时，默认先走 `bytedcli meego create`，再把返回 URL 绑定到 `change create --meego-link`

---
name: bytedance-ecop
description: "Use bytedcli for ECOP governance workflows: browse the zhili label directory tree, list and inspect zhili (治理) labels, dump label metadata, list standard audit labels (std-audit-label) under a zhili directory, list/get/create auto governance rules (autorule) for the merchant scene. Trigger this skill whenever the user mentions ECOP、治理标签、审核标签、std-audit-label、zhili label、autorule、治理任务、自动规则、创建治理规则、商家场景、违规主体、治理域、场域、判罚示例、label directory tree, asks to look up a label by ID/version, wants to find which audit labels are mounted under a zhili 目录, wants to list/search/create 商家场景下的治理任务, or wants to submit positive/negative product IDs to create a governance rule."
---

# bytedcli ECOP

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

完整调用说明见 `../../invocation.md`。

## When to use

- 浏览 ECOP 治理标签目录树（含分类/目录/标签三层）
- 按目录或关键词分页列出治理标签（zhili-label）
- 查看某条治理标签或目录的详细配置（含 meta：违规主体、治理域、场域、积分值、判罚示例等）
- 查询某个治理目录下挂载的标准审核标签（std-audit-label）
- 列出、查看、**创建**商家场景下的自动治理任务（autorule）
- 提交正例/负例商品 ID 列表以创建新的治理规则任务
- 用户提到 `ECOP`、`治理标签`、`审核标签`、`autorule`、`治理任务`、`自动规则`、`创建治理规则`、`正负例`、`违规主体`、`治理域`、`场域`、`判罚示例` 等关键词

## 能力范围

当前 skill 覆盖以下命令，详细参数见对应参考文件：

### 治理标签（`references/zhili-label.md`）
- `ecop zhili-label tree`：拉取治理标签目录树
- `ecop zhili-label list`：分页查询治理标签
- `ecop zhili-label get`：查询治理标签或目录详情（含 meta 中文化展开）
- `ecop std-audit-label list`：查询某治理目录下挂载的标准审核标签

### 自动治理规则（`references/autorule.md`）
- `ecop autorule list`：列出商家场景下的治理任务
- `ecop autorule get`：查看某个版本任务详情（基本信息 + 人审/机审规则 + 训练统计）
- `ecop autorule create`：创建新的自动治理规则任务（商品体裁，提交正负例商品 ID）

## 前置条件

- 首次使用前先确保 `bytedcli auth login` 已完成
- ECOP 接口走 ByteCloud SSO JWT，CLI 会自动通过 `x-jwt-token` header 注入登录态
- ECOP 网关要求所有业务接口必须带站点上下文（`space`、`group_id`）；CLI 已硬编码统一站点参数，使用者无需额外传入

## 工作流约定

1. 需要机器可读输出时默认加 `--json`，且必须放在 `ecop` 前面：`bytedcli --json ecop ...`
2. 探索目录骨架时优先用 `ecop zhili-label tree --scope dir`，需要看到挂载的标签条目时再切到 `--scope all`。
3. 拿到目录节点 ID 后，用 `ecop zhili-label list --dir-id <id>` 分页查询；按名称/编码模糊查找时改用 `--keyword`。
4. 已知治理标签或目录 ID 时，用 `ecop zhili-label get --id <id>`；如需特定版本，加 `--version <n>`。
5. 想看某个治理目录下挂了哪些标准审核标签时，用 `ecop std-audit-label list --dir <code-or-id>`；`--dir` 同时接受 code（如 `violation_type:zl_xxx`）和数字 ID。
6. 治理任务列表（`autorule list`）返回每条任务的 `id`（autoRuleID）和 `lastVersionTaskId`（最新版本 ID）；想查版本详情时用这两个值执行 `autorule get`。
7. 创建新治理任务（`autorule create`）需要提供正例和负例商品 ID 各 **15–100 个**，逗号分隔传给 `--positive-ids` / `--negative-ids`；同时需要从 `zhili-label list/get` 获取正确的治理标签编码（`--label-code`）和中文名（`--label-name`）。

## Quick start

```bash
# ── 治理标签 ──────────────────────────────────────────────────────────
# 1. 浏览目录骨架
bytedcli --json ecop zhili-label tree --scope dir

# 2. 看完整目录 + 标签
bytedcli --json ecop zhili-label tree

# 3. 分页查询某目录下的治理标签
bytedcli --json ecop zhili-label list --dir-id 123456 --page 1 --page-size 10

# 4. 关键词搜索治理标签
bytedcli --json ecop zhili-label list --keyword demo-keyword

# 5. 查询治理标签详情（含 meta 中文展开）
bytedcli --json ecop zhili-label get --id 123456 --version 2

# 6. 查询治理目录下挂载的标准审核标签
bytedcli --json ecop std-audit-label list --dir violation_type:zl_tgsjbhldrdr
bytedcli --json ecop std-audit-label list --dir 123456 --page 1 --page-size 20

# ── 自动治理规则（autorule）────────────────────────────────────────────
# 7. 列出商家场景下的治理任务
bytedcli --json ecop autorule list --page 1 --page-size 10
bytedcli --json ecop autorule list --keyword demo-task
bytedcli --json ecop autorule list --owner demo-user@bytedance.com

# 8. 查看治理任务版本详情（人审规则 + 机审规则）
bytedcli ecop autorule get --id 1459 --task-id 1633
bytedcli --json ecop autorule get --id 1459 --task-id 1633

# 9. 创建新的自动治理规则任务
bytedcli ecop autorule create \
  --name "demo-task-name" \
  --label-code violation_type:zl_lfxx1 \
  --label-name "冒用官方名义-商家" \
  --desc "风险场景概括描述" \
  --positive-ids "id1,id2,...,id15" \
  --negative-ids "id1,id2,...,id15" \
  --owner demo-user@bytedance.com
```

## 常见工作流

### 1. 从目录树定位治理标签

- 先用 `ecop zhili-label tree --scope dir` 拿到目录骨架（`labelType: 0` 是分类、`labelType: 1` 是目录）
- 记录感兴趣目录的 `id` 与 `code`
- 再用 `ecop zhili-label list --dir-id <id>` 拉该目录下分页的治理标签

### 2. 关键词查找治理标签

- 用 `ecop zhili-label list --keyword <keyword>`，CLI 内部桥接到上游 `filterNameCode` 字段
- 适合只记得名称片段或编码片段的场景

### 3. 查看治理标签的完整配置

- 用 `ecop zhili-label get --id <id>`，必要时加 `--version`
- 文本输出对 `meta` 进行中文化展示：违规主体、治理域、场域、积分值、判罚示例（从 ProseMirror 富文本递归提取）等

### 4. 找治理目录下挂的标准审核标签

- 用 `ecop std-audit-label list --dir <code-or-id>`
- `--dir` 既接受目录 code，也接受目录数字 ID
- 输出包含 `id`、`name`、`code`、`status`、`labelPath`、`version`、嵌套 `zhili.controlSubject`

### 5. 浏览治理任务列表

- 用 `ecop autorule list` 分页查询商家场景（`scene=2`）下的治理任务
- `--keyword` 同时匹配任务名称与任务 ID；`--owner` 按负责人邮箱精确过滤
- 列表输出：ID / 最新任务ID / 任务名称 / 版本状态 / 触发方式 / 治理标签 / 负责人

### 6. 查看治理任务版本详情

- 用 `ecop autorule get --id <autoRuleID> --task-id <autoRuleTaskID>`
- `--id` 为 autoRuleID，`--task-id` 为对应版本的 autoRuleTaskID（从 `autorule list` 的 `lastVersionTaskId` 取得）
- 文本输出包含：基本信息、人审规则（违规点/豁免点）、机审规则（prompt）、训练统计

### 7. 创建新的自动治理规则任务

1. 先通过 `ecop zhili-label list --keyword <关键词>` 找到目标治理标签，记录 `code`（如 `violation_type:zl_lfxx1`）和 `name`
2. 收集正例商品 ID（命中违规的商品）和负例商品 ID（未命中的正常商品），各 15–100 个
3. 执行 `ecop autorule create`，传入上述参数
4. 成功后根据输出的任务 ID 和版本 ID 执行 `ecop autorule get` 查看创建结果

## Notes

- `--json` 是全局参数，必须放在 `ecop` 前面，例如 `bytedcli --json ecop zhili-label list ...`
- ECOP 上游字段大小写不规范（同时存在 `status`/`Status`、`autoRuleID`/`autoRuleId`），CLI 已在 `parsers.ts` 内规范化为小写驼峰
- `autorule create` 的正负例 ID 数量必须各在 **[15, 100]** 区间；数量不足会立即报 `ECOP_INPUT_ERROR`（带修复提示）
- `autorule create` 内部硬编码 `entityType=product`（商品）、`scene=2`（商家）、`isSubmit=true`（直接提交），不对外暴露这些参数
- `autorule get` 并发调用 `AutoRuleDetail` + `AutoRuleTaskDetail` 两个接口，减少总耗时
- `std-audit-label list` 的分页是 1-based（CLI 一致），handler 内部换算成上游 0-based 的 `pageNum`
- `ecop`、`zhili-label`、`std-audit-label`、`autorule` 四个父命令均在不带子命令时输出 help（exit code 0）
- 治理标签状态码映射示例：`3=生效中`、`4=已下线`、`5=驳回或取消`、`-1=已删除`，完整映射见 `references/zhili-label.md`

## Agent Guidance

- 查询治理标签详情后需要创建治理任务时，先从 `zhili-label list/get` 获取 `code` 与 `name`，再传给 `autorule create --label-code / --label-name`，不要让用户手动拼写。
- `autorule list` 返回的 `lastVersionTaskId` 就是 `autorule get --task-id` 所需的值，无需额外查询。
- 正负例 ID 数量校验在 CLI 侧立即执行，不会发起网络请求；如果用户提供的 ID 数量不足，直接告知需要补充至 15 个以上。

## References

- `references/ecop.md`：参考文件索引 + 认证说明
- `references/zhili-label.md`：治理标签 & 标准审核标签命令详细参数、字段映射、状态码
- `references/autorule.md`：自动治理规则 list/get/create 完整参数、错误说明、上游接口
- `../../invocation.md`：通用调用方式
- `../../troubleshooting.md`：常见错误与排查

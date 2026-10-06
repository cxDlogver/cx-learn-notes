# Safe TCS — Queue Work-Mode Switch

把一个 TCS 队列从「主审队列审核」切换到「众包审核」（包含可选的盲审父队列）的编排流程。本 reference 只做**决策与编排**，所有 `bytedcli safe tcs` 子命令以 [`tcs.md`](tcs.md) 为 SSOT，不重复维护命令原文。

严格按本文件执行，遇到信息缺失必须向用户追问，**禁止编造队列 id**。

---

## Scope（正反例）

| ✅ 触发                                                                                         | ❌ 不触发                                |
| ----------------------------------------------------------------------------------------------- | ---------------------------------------- |
| "把 example-master-id 切换为众包审核模式"                                                       | "查询下队列 example-id 的当前状态"       |
| "队列 example-master-id 绑定众包子队列 example-hands-id，主审 70% / 众包 30%"                   | "帮我做一个 Puzzle 特征"                 |
| "任务池绑定队列：父队列 example-parent-id 分流到主审 example-master-id 与众包 example-hands-id" | "Hawkpro 里的策略规则怎么写"             |
| "把 example-master-id 切到盲审众包模式"                                                         | "其它平台的任务池怎么配置"               |
| "切换队列审核模式：主审 + 众包 7:3"                                                             | "改一下队列的 ProductType"（非切换语境） |

---

## Flow at a Glance

```
[用户输入]
   │
   ▼
[步骤 1.0 主队列角色预检]  safe tcs project get --project-id <master>
   │   └─► 解析 master_role ∈ {normal, parent, child}, master_parent_id, master_verify_type
   │
   ▼
[1.1 分支选择矩阵：master_role × is_blind]
   │
   ├─ A-1 normal / 否 ─► [分支 1 直分流] parent=master_project_id, splitList=众包
   │
   ├─ A-2 normal / 是 ─► [分支 3 盲审] parent=用户给的父 / 3a 克隆得到, splitList=主审+众包
   │
   ├─ B-1 parent / 否 ─► [分支 1 直分流] parent=master_project_id（已是父队列）, splitList=众包
   │
   ├─ B-2 parent / 是 ─► [分支 5 父队列降级 + 盲审]
   │                       └─► 3a 克隆新父队列 → 逐条 `safe tcs project get` 拿子队列 verify_type
   │                             └─► 走分支 1: parent=新父队列, splitList=主审+众包，
   │                                   每条 `projectVerifyType` 透传自 project get（禁止自行赋值）
   │
   ├─ C-1 child  / 否 ─► [分支 1 直分流] parent=master_parent_id（沿用现有父）, splitList=众包
   │
   └─ C-2 child  / 是 ─► [分支 1 直分流] parent=master_parent_id（已是盲审拓扑）, splitList=主审+众包

[凡进入分支 1 前，缺众包 → 走 [分支 2 克隆众包]；缺百分比 → 追问]

[分支 1 调用 set-shared-project-split 失败]
   │
   └─ 错误信息含 product_type 不一致 ──► [分支 4: ProductType 修复]
           └─► 以主审队列为基准 ──► 列出待修复队列 ──► 用户显式确认
                 ├─ 同意 ──► update-product-type ──► 重试 [分支 1]
                 └─ 拒绝 ──► 报告原始错误后停止
```

完成前必须跑完 `## Completion Checklist`。

---

## 0. 全局规则

### 0.1 执行上下文（每个关键步骤结束后回显）

| 变量                    | 来源                    | 说明                                                                          |
| ----------------------- | ----------------------- | ----------------------------------------------------------------------------- |
| `master_project_id`     | 用户输入                | 主审队列 id（**必填**），全流程的 product_type 基准                           |
| `master_role`           | 步骤 1.0 预检           | 主队列当前角色：`normal` / `parent` / `child`，由 `safe tcs project get` 解析 |
| `master_parent_id`      | 步骤 1.0 预检           | 主队列若为 `child`，对应的现有父队列 id（来自 `get` 返回字段）                |
| `master_verify_type`    | 步骤 1.0 预检           | 主队列的 `project_verify_type`：`1` = 父队列、`0` = 子队列 / 普通             |
| `hands_project_id`      | 用户输入 / 分支 2 克隆  | 众包子队列 id；分支 2 中由 clone 响应 `destProject.id` 获得                   |
| `parent_project_id`     | 用户输入 / 分支 3a 克隆 | 父队列 id；仅盲审场景需要；分支 3a 中由 clone 响应获得                        |
| `is_blind`              | 用户输入                | 用户是否提到「盲审」                                                          |
| `master_percent`        | 用户输入                | 主审分流比例（0~1 之间的小数）                                                |
| `hands_percent`         | 用户输入                | 众包分流比例（0~1 之间的小数），与 `master_percent` 之和应为 1                |
| `existing_split_list`   | 步骤 1.4                | `get-related-project-list` 返回的当前线上分流列表                             |
| `final_split_list`      | 步骤 2.1                | 即将提交的最终 splitList，必须是 `existing_split_list` 的超集                 |
| `product_type_repaired` | 分支 4                  | 是否触发并完成过 product_type 修复                                            |

### 0.2 命令硬约束

- 全部命令均通过 `bytedcli safe tcs project ...` 调用，使用 `--option` 形式参数，禁止位置参数。
- 命令签名以 [`tcs.md`](tcs.md) 为唯一来源，本 reference 只在下文「本 reference 用到的 safe tcs 子命令清单」给一行用法 + 跳转。
- 认证统一走 `bytedcli auth login --session && bytedcli safe login`，不在本 skill 重复说明。

### 0.3 用户交互阻塞点（必须先追问再继续）

1. 主审队列 id 缺失 → 询问后再继续。
2. 进入决策分支前 → 必须先按 [步骤 1.0 主队列角色预检](#10-主队列角色预检必做) 拿到 `master_role` / `master_parent_id` / `master_verify_type`，**信息缺失或无法解析时停止追问用户**。
3. 分支 2 / 分支 3a 克隆完成后，分流百分比缺失 → 询问主审/众包百分比，求和必须为 1。
4. 分支 1 写入前 → CLI handler 会自动渲染中文 preview 并等用户确认（详见 0.4）；Agent 自身仍应在调用前向用户回放本次改动并取得显式同意，再决定是否追加 `--yes` 让 CLI 跳过二次 prompt。
5. 分支 4 触发 `update-product-type` 前 → CLI handler 同样会自动 preview 并等待确认；Agent 必须先列出待修复队列与 `master_project_id` 基准，取得用户显式同意后再调用（自动化场景再追加 `--yes`）。
6. 任意 clone 响应缺少 `destProject.id` 时 → 停止，提示用户检查后端响应或重试。
7. 场景 B-2（主队列原本为父队列 + 用户要求盲审）需要把主队列由父队列改为子队列，需要 `project_verify_type` 由 `1` 改为 `0`；当前 CLI 没有提供该修改命令 → 停止，并向用户回显：「当前 bytedcli 暂无 `project_verify_type` 修改命令，请走平台/后端通道把 `<master_project_id>` 改为子队列后再继续」，**禁止编造命令**。
8. 任何 `safe tcs project clone --is-hands-project` 调用前 → Agent **必须主动**向用户询问「众包队列归属业务组（`--group-name`）」，取值参考飞书表格 `https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5`；拿到用户回复后再发起 clone，并把回复值作为 `--group-name "<用户回复>"` 透传。**禁止**仅依赖 CLI 缺省追问或直接用占位字符串调用；自动化 / `--json` / 非 TTY 场景同样必须先取得用户回复，否则 CLI 抛 `SAFE_INPUT_ERROR`。

### 0.4 复用 safe tcs 的护栏（强约束）

`set-shared-project-split` 与 `update-product-type` 均为高危写命令，CLI handler 已在内部强制执行 preview + 用户确认：

- 在调用上游 API 之前，CLI 会自动并行查询所涉队列的可读名称，向 stderr 渲染中文 preview，并通过 readline 单行提示等待用户输入 `y` / `yes`（忽略大小写）；
- 名称查询失败时该条目渲染为 `<id> (name unavailable)`，仍会照常 prompt；
- `--json` 或非 TTY（脚本管道、Skill 调用）场景下，缺 `--yes` 时 CLI 直接抛 `SAFE_INPUT_ERROR`（message：`高危操作需要交互确认，非交互/JSON 模式请追加 --yes 跳过提示`），避免静默执行；用户在交互式终端拒绝时同样抛 `SAFE_INPUT_ERROR`（message：`操作已取消`）。

Agent 在编排时仍需做以下事情，与 CLI 行为保持一致并兜住 CLI 不覆盖的语义：

1. 调用 `bytedcli safe tcs project get-related-project-list --shared-project-id <parent>` 拉取当前线上分流；
2. **superset 校验**（CLI 不做这一步）：`final_split_list` 必须包含 `existing_split_list` 中的每一个 `projectId`，只允许新增子队列或调整 `sharedTaskPercent`，禁止删除任何已有子队列；不满足时拒绝写入并向用户列出缺失的 `projectId`；
3. 在 Agent 侧把本次改动以中文 preview 回放给用户、取得用户显式同意；自动化（`--json` / 非 TTY）场景再追加 `--yes` 调用 CLI；
4. 交互式终端中可以让用户直接回答 CLI 的 prompt，不强制 Agent 再额外封装一次预览。

中文 preview 模板（与 CLI 实际打印一致）：

```
本次提交的分流配置是：

• 父队列：<parent_project_id>+<父队列名称>
• 子队列 <projectId>+<子队列名称>：<sharedTaskPercent*100>%
```

错误码 `SAFE_INPUT_ERROR` 说明见 [`tcs.md`](tcs.md)。

---

## 1. 决策分支选择

### 1.0 主队列角色预检（必做）

进入下面的分支选择前，**必须**先调用一次：

```bash
bytedcli --json safe tcs project get --project-id <master_project_id>
```

按以下规则解析：

- `master_verify_type = data.project_verify_type`（部分响应字段名也可能是 `verify_type`，按实际响应取整数值）；
- `master_role`：
  - `master_verify_type === 1` → `parent`（主队列本身就是父队列）；
  - `master_verify_type === 0` 且响应中含 `shared_project_id` / `parent_project_id` 等指向「所属父队列」的非空字段 → `child`，并把该字段值写入 `master_parent_id`；
  - 其它情况 → `normal`（普通队列，无父子关系）；
- 字段缺失或无法解析时 → 停止并提示用户检查后端响应，**禁止编造**。

> 解析后必须向用户回显：「主队列 `<master_project_id>` 当前是 `<master_role>`（`master_verify_type=<...>`，父队列=`<master_parent_id 或 N/A>`），是否继续？」并等待用户确认；用户给出修正信息时按修正继续。

### 1.1 分支选择矩阵（按主队列角色 × 是否盲审）

按以下顺序判定，命中第一条即进入对应分支；表格中「父队列」指 `set-shared-project-split` 的 `--shared-project-id`，「子队列」指 splitList 条目。

| #   | `master_role` | `is_blind` | 分支                                                 | 实际 `parent_project_id` 来源            | `final_split_list`                            |
| --- | ------------- | ---------- | ---------------------------------------------------- | ---------------------------------------- | --------------------------------------------- |
| A-1 | `normal`      | 否         | [分支 1 直分流](#2-分支-1直分流)                     | `master_project_id`（主审作父队列）      | 仅众包                                        |
| A-2 | `normal`      | 是         | [分支 3 盲审](#4-分支-3盲审)                         | 用户给的父队列 / 3a 克隆的新父队列       | 主审 + 众包                                   |
| B-1 | `parent`      | 否         | [分支 1 直分流](#2-分支-1直分流)                     | `master_project_id`（已是父队列）        | 仅众包                                        |
| B-2 | `parent`      | 是         | [分支 5 父队列降级 + 盲审](#6-分支-5父队列降级-盲审) | 3a 克隆得到的新父队列                    | 主审 + 众包（主审需先由 `parent` 改 `child`） |
| C-1 | `child`       | 否         | [分支 1 直分流](#2-分支-1直分流)                     | `master_parent_id`（主队列已有的父队列） | 仅众包（挂到现有父队列下）                    |
| C-2 | `child`       | 是         | [分支 1 直分流](#2-分支-1直分流)                     | `master_parent_id`（沿用已有父队列）     | 主审 + 众包（已经是盲审拓扑，沿用即可）       |

> 全局硬约束（再次强调）：`final_split_list` 中任意条目都不得等于 `parent_project_id`。
>
> 决策矩阵已经覆盖「仅给主审 / 主审 + 众包 + 百分比已给齐」这类信息组合：缺什么就先按 [分支 2 克隆众包子队列](#3-分支-2克隆众包子队列) 把众包补齐、缺百分比就追问；信息齐备后再按本表选分支。
>
> 同时给齐主审 + 众包 + 百分比但**也提到了盲审**时，盲审优先：按 `is_blind = 是` 走对应分支。

---

## 2. 分支 1：直分流

### 2.1 构造 `final_split_list`

- 先按主队列角色确定 `parent_project_id`（与 [1.1 矩阵](#11-分支选择矩阵按主队列角色--是否盲审) 保持一致）：
  - `master_role = normal` 或 `parent` → `parent_project_id = master_project_id`；
  - `master_role = child` → `parent_project_id = master_parent_id`；
  - 由分支 3a / 分支 5 进入时 → `parent_project_id` 取克隆得到的新父队列 id；
  - 用户显式给出独立父队列时（如任务池场景） → 沿用用户给的值。
- 子队列条目（`projectId`）按场景选择：
  - `is_blind = 否` 且主队列作父队列（A-1 / B-1 / C-1）→ 仅 `hands_project_id`；
  - `is_blind = 是` 或 `master_role = child` 且 `is_blind = 是`（A-2 / B-2 / C-2）→ 同时包含 `master_project_id` 与 `hands_project_id`；
- 任何场景下 `parent_project_id` 都**不得**作为条目出现在 `final_split_list` 中；
- 每条 `sharedTaskPercent` 取用户提供的百分比，转换为 0~1 小数；总和应为 1（允许极小浮点误差）。
- 每条可选写入 `projectVerifyType`：值取自该子队列 `bytedcli --json safe tcs project get --project-id <id>` 返回的 `project_verify_type`。已经查询过子队列详情时，把该值带上以避免后端默认填充与拓扑不一致；查不到时**不要**填写（保持字段缺省）。
- 若用户额外提到其它子队列，按用户给的比例补充。

### 2.2 校验 superset

- 调用 `get-related-project-list --shared-project-id <parent_project_id>`；
- 如果 `existing_split_list` 中存在某个 `projectId` 不在 `final_split_list`，**拒绝写入**，列出缺失项并要求用户：
  - 把它们加回 `final_split_list`（要求给出 `sharedTaskPercent`），或
  - 显式声明本次是「移除子队列」流程（本 skill 不覆盖此场景，请走人工流程）。

### 2.3 名称回显与确认

- 对父队列与每个子队列调用 `safe tcs project get --project-id <id>` 取名称；
- 按 0.4 步骤 4 模板向用户回显，等待显式确认。

### 2.4 写入

- 调用：

  ```bash
  # 交互式终端：CLI 会自动 preview 并等待 y/yes/确认
  bytedcli safe tcs project set-shared-project-split \
    --shared-project-id <parent_project_id> \
    --split-list <final_split_list_json_or_@file>

  # 自动化 / Skill 链式调用：必须显式 --yes，否则抛 SAFE_INPUT_ERROR
  bytedcli --json safe tcs project set-shared-project-split \
    --shared-project-id <parent_project_id> \
    --split-list <final_split_list_json_or_@file> \
    --yes
  ```

- 若返回成功 → 跳到 [完成](#completion-checklist)。
- 若返回失败且错误信息提示 `product_type` 不一致 → 跳到 [分支 4](#5-分支-4producttype-修复)。
- 其它失败 → 透传上游错误信息，停止。

> `parent_project_id` 的取值规则见 [2.1](#21-构造-final_split_list)；进入本分支前必须已按 [1.1 矩阵](#11-分支选择矩阵按主队列角色--是否盲审) 完成主队列角色判定。

---

## 3. 分支 2：克隆众包子队列

### 3.1 克隆

> **Step 0（必做）**：在执行下方 clone 命令前，Agent 必须先向用户询问「众包队列归属业务组（`--group-name`）」，取值参考飞书表格 `https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5`。拿到用户回复后才能进入下一步，并把回复值替换到下方示例的 `<用户回复的 group-name>` 占位处；禁止用 `<demo-group>` 等占位字符串直接调用。

```bash
# 众包克隆必须指定归属业务组（取值参考飞书表格
# https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5）
# 下方 --group-name 必须替换为 Step 0 中用户回复的值，禁止用占位字符串直接调用。
bytedcli safe tcs project clone \
  --project-id <master_project_id> \
  --is-hands-project \
  --group-name "<用户回复的 group-name>"
```

> 若用户在需求中明确给出「克隆后众包队列名称」，追加 `--title "<用户给出的名称>"`；未提及则不写该参数，沿用后端默认命名。

### 3.2 解析新众包队列 id

- 从响应 `destProject.id`（或 `destProject.projectId` / `destProject.ProjectID`，按响应实际字段取）解析为 `hands_project_id`；
- **失败处理**：响应缺少 `destProject` 或字段不存在 → 停止，输出原始响应让用户检查。

### 3.3 询问分流百分比

- 主审 / 众包百分比缺失时，向用户索取（默认推荐 7:3，但必须等用户确认）。

### 3.4 走分支 1

- 按 [2.1](#21-构造-final_split_list) 中的 `parent_project_id` 选择规则确定父队列：
  - `master_role = normal` 或 `parent` → `parent_project_id = master_project_id`；
  - `master_role = child` → `parent_project_id = master_parent_id`（沿用主队列已有的父队列）；
- 跳到 [分支 1](#2-分支-1直分流)。

---

## 4. 分支 3：盲审

### 3a 盲审克隆父队列

#### 4a.1 克隆父队列

```bash
bytedcli safe tcs project clone --project-id <master_project_id> --is-shared-project
```

> 若用户在需求中明确给出「克隆后父队列名称」，追加 `--title "<用户给出的名称>"`；未提及则不写该参数。

#### 4a.2 解析新父队列 id

- 从响应 `destProject.id` 解析为 `parent_project_id`；缺失字段处理同 3.2。

#### 4a.3 确认是否还需克隆众包子队列

- 如果 `hands_project_id` 缺失，先按 [分支 2](#3-分支-2克隆众包子队列) 克隆众包队列；
- 然后转到 [分支 3b](#3b-直接父队列分流)。

### 3b 直接父队列分流

#### 4b.1 询问分流百分比

- 同 3.3。

#### 4b.2 走分支 1

- `parent_project_id` 已知（用户给的或 3a 克隆得到的），子队列同时包含 `master_project_id` 与 `hands_project_id`，跳到 [分支 1](#2-分支-1直分流)。

---

## 5. 分支 4：ProductType 修复

仅当 `set-shared-project-split` 写入失败、错误信息明确指出 `product_type` 不一致 / mismatch 时进入。

### 5.1 锁定基准与待修复队列

- **基准**：`master_project_id` 的 `product_type` 视为权威值（`product_type_repaired = false` 时不必单独查询，直接以主审为目标）。
- **待修复**：根据上游错误信息或额外的 `safe tcs project get --project-id <id>` 调用，确认是父队列 / 众包队列中哪些与主审不一致。

### 5.2 显式确认

- 向用户回显：

  ```
  本次将以主审队列 <master_project_id> 的 product_type 为准，把以下队列的 product_type 同步为相同值：
    • <queue_id_1>（父队列 / 众包队列）
    • <queue_id_2>
  请确认是否继续。
  ```

- 用户拒绝 / 取消 → **不调用** `update-product-type`，把分支 1 的原始错误信息透传给用户后停止。

### 5.3 修复

- 对每个待修复队列依次调用：

  ```bash
  # 交互式终端：CLI 自动 preview 并等待 y/yes/确认
  bytedcli safe tcs project update-product-type \
    --project-id <to-be-repaired> \
    --target-project-id <master_project_id>

  # 自动化 / Skill 链式调用：必须显式 --yes
  bytedcli --json safe tcs project update-product-type \
    --project-id <to-be-repaired> \
    --target-project-id <master_project_id> \
    --yes
  ```

- 失败 → 透传上游错误后停止。

### 5.4 重试分流

- `product_type_repaired = true`；
- 回到 [分支 1 步骤 2.4](#24-写入) 重新执行 `set-shared-project-split`；
- 若再次报 `product_type` 不一致 → **不再循环**，向用户报告并停止，建议人工介入。

---

## 6. 分支 5：父队列降级 + 盲审

仅当 [1.1 矩阵](#11-分支选择矩阵按主队列角色--是否盲审) 命中 **B-2**（`master_role = parent` 且 `is_blind = 是`）时进入。

### 6.1 克隆新父队列

```bash
bytedcli safe tcs project clone --project-id <master_project_id> --is-shared-project
```

> 若用户在需求中明确给出「克隆后父队列名称」，追加 `--title "<用户给出的名称>"`；未提及则不写该参数。

- 从响应 `destProject.id` 解析为 `parent_project_id`（新建的盲审父队列）；缺失字段处理同 [3.2](#32-解析新众包队列-id)。

### 6.2 准备众包队列

- 如果 `hands_project_id` 缺失，按 [分支 2](#3-分支-2克隆众包子队列) 克隆众包子队列；
- 询问 / 确认主审 / 众包分流百分比（默认推荐 7:3，需用户确认）。

### 6.3 逐条查询子队列 `project_verify_type`

对即将进入 `splitList` 的每个 `projectId`（主审 `master_project_id` 与众包 `hands_project_id`），逐条执行：

```bash
bytedcli --json safe tcs project get --project-id <projectId>
```

- 从响应中取 `project_verify_type`，原样作为该条目的 `projectVerifyType`；
- **Agent 不得自行赋值**：禁止猜测、硬编码 `0` / `1`，禁止复用其它队列的值；
- 查询失败 / 响应中缺少 `project_verify_type` 字段 → 该条目**不写** `projectVerifyType`，并向用户回显警告：

  ```
  ⚠️ 未能从 `safe tcs project get --project-id <projectId>` 拿到 `project_verify_type`，
     该条目将不携带 `projectVerifyType`，按后端缺省语义提交。请确认是否继续。
  ```

### 6.4 走分支 1（一次性分流 + 主审降级）

- `parent_project_id = 6.1 克隆得到的新父队列 id`；
- `final_split_list` 同时包含 `master_project_id`（由后端按 `projectVerifyType` 写入时同步降级为子队列）与 `hands_project_id`；
- 每条 splitList item 带上 6.3 拿到的 `projectVerifyType`（缺失则不写该字段）；
- 父队列绝不出现在 `final_split_list` 中；
- 跳到 [分支 1](#2-分支-1直分流) 完成 superset 校验 + preview + 写入；一次 `set-shared-project-split` 同时完成「分流 + 主审从父队列降级为子队列」，**无需走人工通道**。

---

## Completion Checklist（结束前自检）

- [ ] 已完成主队列角色预检：`master_role` / `master_parent_id` / `master_verify_type` 已回显并经用户确认。
- [ ] 上下文表所有变量已回显且无空缺（至少 `master_project_id`、`parent_project_id`、`hands_project_id`、最终分流比例）。
- [ ] 分支选择与用户原始诉求一致（直分流 / 克隆众包 / 盲审 / 父队列降级 / 修复）。
- [ ] 写入 `set-shared-project-split` 前已完成 superset 校验；CLI handler 自动 preview 与用户确认（或自动化场景显式追加 `--yes`）已通过。
- [ ] 涉及 clone 的分支已成功解析 `destProject.id`，新队列 id 已写入上下文。
- [ ] 进入分支 5 时：splitList 中各 `projectVerifyType` 已通过 `bytedcli --json safe tcs project get` 拿到 `project_verify_type` 后透传，**未自行赋值**；查询失败的条目已回显警告且未硬塞值。
- [ ] 触发 product_type 修复时：已向用户列出待修复队列与主审基准，已取得显式确认；用户拒绝时未调用 `update-product-type` 且已透传原始错误。
- [ ] 最终结果向用户汇报：父队列 id、子队列 + 百分比、`product_type_repaired` 状态。

---

## References

- 「本 reference 用到的 safe tcs 子命令清单」 — `bytedcli safe tcs` 子命令速查（指向 `tcs.md` SSOT）
- [`references/decision-tree.md`](references/decision-tree.md) — 四种输入场景的判定矩阵与最简编排示例
- [`troubleshooting.md`](../troubleshooting.md) — 常见错误（splitList 非超集、product_type 不一致、clone 字段缺失、用户拒绝确认）排查
- [`tcs.md`](tcs.md) — 命令签名、参数、preview 与 superset 校验 SSOT

## Reference: commands

## Commands Quick Reference

本 reference 用到的 `bytedcli safe tcs` 子命令清单。完整签名、option 默认值、输出格式以 [`tcs.md`](tcs.md) 为唯一来源，本节只给最小用法行 + 跳转。

| 用途                                 | 最小命令                                                                                              | 详细说明                                  |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| 查询单个队列基础信息（取名称）       | `bytedcli safe tcs project get --project-id <id>`                                                     | [tcs.md](tcs.md) `project get` 段落      |
| 拉取父队列当前分流（superset 校验）  | `bytedcli safe tcs project get-related-project-list --shared-project-id <parent>`                     | [tcs.md](tcs.md) `project` 段落           |
| 设置/更新父队列分流配置（高危写）    | `bytedcli safe tcs project set-shared-project-split --shared-project-id <parent> --split-list <json>` | [tcs.md](tcs.md) `project` 段落           |
| 克隆为众包子队列（先向用户询问 `--group-name`） | `bytedcli safe tcs project clone --project-id <master> --is-hands-project --group-name "<用户回复>"` | [tcs.md](tcs.md) `project` 段落           |
| 克隆为父队列（盲审用）               | `bytedcli safe tcs project clone --project-id <master> --is-shared-project`                           | [tcs.md](tcs.md) `project` 段落           |
| 把队列 product_type 同步为另一个队列 | `bytedcli safe tcs project update-product-type --project-id <to-fix> --target-project-id <master>`    | [tcs.md](tcs.md) `project` 段落           |

## 共同约束

- 全部命令均使用 `--option` 形式参数，不使用位置参数。
- 写入类命令（`set-shared-project-split`、`clone`、`update-product-type`）必须严格遵循本 skill 中的阻塞点与确认护栏，禁止直接执行。
- JSON 模式（`-j` / `--json`）的语义与字段细节请参考主 skill；本 skill 在 agent 编排里默认使用 JSON 模式以便解析 `destProject.id`、当前分流列表等字段。
- `safe tcs project clone --is-hands-project` 调用前 Agent **必须主动**向用户索取 `--group-name`（取值参考飞书表格 https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5），拿到回复后再发起命令并把回复值作为 `--group-name "<用户回复>"` 透传。**禁止**仅依赖 CLI 缺省追问或直接用占位字符串调用；自动化 / `--json` / 非 TTY 场景同样适用，未携带时 CLI 抛 `SAFE_INPUT_ERROR`。

## 认证

本 skill 不重复维护登录步骤。若任意命令返回认证失败，按主 skill 提示先执行：

```bash
bytedcli auth login --session
bytedcli safe login
```

完成后重试当前步骤。

## Reference: decision-tree

## Decision Tree — 输入场景判定矩阵

按用户输入信号选择正确的执行路径。命中第一条匹配条件即进入对应分支，不再向下匹配。

> **全局硬约束**：调用 `set-shared-project-split` 时，`--shared-project-id`（父队列）**绝不能**作为条目出现在 `--split-list` 中。下表与示例已按此规则书写。
>
> **进入判定前**：必须先调用 `bytedcli --json safe tcs project get --project-id <master_project_id>` 解析主队列角色：
>
> - `project_verify_type === 1` → `master_role = parent`；
> - `project_verify_type === 0` 且响应中包含非空的 `shared_project_id` / `parent_project_id` 字段 → `master_role = child`，并取该字段值作为 `master_parent_id`；
> - 其它情况 → `master_role = normal`。
>
> 解析失败 → 停止并向用户回显原始响应，禁止编造。

## 主队列角色 × 是否盲审 矩阵

| #   | `master_role` | `is_blind` | 最终 `parent_project_id` 来源       | `splitList` 条目                              | 分支                                                             |
| --- | ------------- | ---------- | ----------------------------------- | --------------------------------------------- | ---------------------------------------------------------------- |
| A-1 | `normal`      | 否         | `master_project_id`（主审作父队列） | 仅众包                                        | 分支 1（缺众包先走分支 2）                                       |
| A-2 | `normal`      | 是         | 用户给的父队列 / 分支 3a 克隆       | 主审 + 众包                                   | 分支 3 → 分支 1                                                  |
| B-1 | `parent`      | 否         | `master_project_id`（主队列已是父） | 仅众包                                        | 分支 1（缺众包先走分支 2）                                       |
| B-2 | `parent`      | 是         | 分支 5 克隆得到的新父队列           | 主审 + 众包；每条带 `projectVerifyType`，取自 `safe tcs project get` | 分支 5 → 一次 `set-shared-project-split` 同时完成分流 + 主审降级 |
| C-1 | `child`       | 否         | `master_parent_id`（沿用现有父）    | 仅众包                                        | 分支 1                                                           |
| C-2 | `child`       | 是         | `master_parent_id`（已是盲审拓扑）  | 主审 + 众包                                   | 分支 1                                                           |

## 输入信息组合判定

> 主队列角色已按上表确定后，再根据用户提供的信息组合决定如何补齐缺口。

| #   | 用户输入特征                                                                              | 是否盲审 | 父队列已给 | 主审已给 | 众包已给 | 百分比已给 | 最终 `parent_project_id`        | 子队列条目（splitList）                                                              | 分支                             |
| --- | ----------------------------------------------------------------------------------------- | -------- | ---------- | -------- | -------- | ---------- | ------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------- |
| 1   | "把 example-master-id 切到盲审，主审 70 / 众包 30"                                        | 是       | 否         | 是       | 否       | 是         | 克隆得到的新父队列              | 主审 + 众包                                                                          | 3a → 3b → 1（克隆父+众包+分流）  |
| 2   | "盲审：父队列 example-parent-id 分流到主审 example-master-id 与众包 example-hands-id 7:3" | 是       | 是         | 是       | 是       | 是         | 用户给的 `example-parent-id`    | 主审 + 众包                                                                          | 3b → 1（直接父队列分流）         |
| 3   | "把 example-master-id 切到盲审众包模式"（仅给主审）                                       | 是       | 否         | 是       | 否       | 否         | 克隆得到的新父队列              | 主审 + 众包                                                                          | 3a → 询问百分比 → 3b → 1         |
| 4   | "队列 example-master-id 绑定众包子队列 example-hands-id，主审 70% / 众包 30%"             | 否       | n/a        | 是       | 是       | 是         | `example-master-id`（主审作父） | **仅众包**（主审作父，不能再作子队列）；如需 7:3 主审/众包同时作子队列，请按盲审处理 | 1（直分流）                      |
| 5   | "把 example-master-id 改成众包审核"（仅给主审）                                           | 否       | n/a        | 是       | 否       | 否         | `example-master-id`（主审作父） | **仅众包**                                                                           | 2（克隆众包）→ 询问 → 1          |
| 6   | "把 example-master-id 改成众包审核，主审 70 / 众包 30"（仅给主审 + 百分比）               | 否       | n/a        | 是       | 否       | 是         | `example-master-id`（主审作父） | **仅众包**（同上：主审作父则只剩众包）                                               | 2（克隆众包）→ 1                 |
| 7   | "切换队列审核模式"（信息不足）                                                            | ?        | ?          | 否       | ?        | ?          | -                               | -                                                                                    | 阻塞：先追问 `master_project_id` |
| 8   | "把 example-master-id 切到盲审"，且主队列本身是父队列（`master_role = parent`）           | 是       | 否         | 是       | 否       | ?          | 分支 5 克隆得到的新父队列       | 主审 + 众包；每条带 `projectVerifyType`，取自 `safe tcs project get`                 | 5 → 2（如缺众包）→ 逐条 project get → 1（一次性分流 + 主审降级） |
| 9   | "把 example-master-id 改成众包审核"，且主队列已经挂在父队列下（`master_role = child`）    | 否       | n/a        | 是       | 否       | ?          | `master_parent_id`              | **仅众包**（挂到现有父队列）                                                         | 2（如缺众包）→ 1                 |

> 同时给齐主审 + 众包 + 百分比但**也提到了盲审**时，盲审优先：必须有 `parent_project_id` 才能继续，否则按场景 3 / 1 处理。
>
> 当用户希望主审 / 众包按比例切分（如 7:3、6:4）时，必须走盲审路径：先克隆或提供独立父队列，再把**主审队列 + 众包队列**同时作为子队列挂到该父队列下；其中父队列为克隆得到的父队列（或用户显式提供的独立父队列），`splitList` 只包含主审与众包，不包含父队列自身。

## 各场景最简编排示例

> 以下示例统一使用占位 id：`example-master-id`（主审）、`example-hands-id`（众包）、`example-parent-id`（父队列），分流比例 0.7 / 0.3。所有 `--split-list` 示例都**不**包含父队列条目。
>
> 每条子队列条目可选 `projectVerifyType`，值取自子队列 `bytedcli --json safe tcs project get --project-id <id>` 返回的 `project_verify_type`；下面示例为可读性省略，实际编排时如已查询到子队列详情，建议在条目中显式带上该字段（缺失时不要填写）。
>
> 所有 `safe tcs project clone` 调用都可选追加 `--title "<用户给出的名称>"`：仅当用户在需求中明确给出「克隆后队列名称」时才透传，未提及则不写该参数，沿用后端默认命名。下方示例为简洁起见均省略 `--title`。
>
> 所有 `safe tcs project clone --is-hands-project` 调用前，Agent **必须主动**先向用户询问 `--group-name`（取值参考飞书表格 https://bytedance.larkoffice.com/wiki/TZoBw7G72iaX7RkTtoXcxNvSnif?table=tblH8ScsAFYsdk02&view=vewdWVvBH5）。下方示例中的 `--group-name "<用户回复>"` 仅作占位示意；实际编排时务必先拿到用户回复，再把回复值替换到该位置。**禁止**直接用 `demo-group` 等占位字符串调用，自动化 / `--json` / 非 TTY 场景同样适用。

### 场景 1：盲审 + 仅给主审 + 百分比

```bash
# Step 1: 克隆父队列
bytedcli --json safe tcs project clone \
  --project-id example-master-id \
  --is-shared-project
# → 解析 destProject.id 为 example-parent-id

# Step 2: 克隆众包子队列
bytedcli --json safe tcs project clone \
  --project-id example-master-id \
  --is-hands-project \
  --group-name "demo-group"
# → 解析 destProject.id 为 example-hands-id

# Step 3: 父队列分流（superset 校验 + CLI 自动 preview + 确认后再执行；自动化场景需追加 `--yes`）
bytedcli safe tcs project get-related-project-list \
  --shared-project-id example-parent-id
bytedcli safe tcs project get --project-id example-parent-id
bytedcli safe tcs project get --project-id example-master-id
bytedcli safe tcs project get --project-id example-hands-id

# splitList 同时含主审与众包，不含父队列
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-parent-id \
  --split-list '[{"projectId":"example-master-id","sharedTaskPercent":0.7},{"projectId":"example-hands-id","sharedTaskPercent":0.3}]'
```

### 场景 2：盲审 + 父队列已给

```bash
# Step 1: 父队列分流（superset 校验 + CLI 自动 preview + 确认后再执行；自动化场景需追加 `--yes`）
bytedcli safe tcs project get-related-project-list \
  --shared-project-id example-parent-id
# 名称解析略

# splitList 同时含主审与众包，不含 example-parent-id
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-parent-id \
  --split-list '[{"projectId":"example-master-id","sharedTaskPercent":0.7},{"projectId":"example-hands-id","sharedTaskPercent":0.3}]'
```

### 场景 4：直分流（主审 + 众包 + 百分比都给齐，主审作父队列）

```bash
# 主审队列同时作为父队列分流，子队列只能是众包队列；
# 因此在该编排下众包占 100%（hands_percent = 1）。如果业务真的要主审 / 众包按 7:3 分流，
# 应改走盲审：克隆独立父队列后再把主审与众包同时挂到父队列下。
bytedcli safe tcs project get-related-project-list \
  --shared-project-id example-master-id
bytedcli safe tcs project get --project-id example-master-id
bytedcli safe tcs project get --project-id example-hands-id

# splitList 仅含众包，不含父队列（即主审 example-master-id）自身
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-master-id \
  --split-list '[{"projectId":"example-hands-id","sharedTaskPercent":1}]'
```

### 场景 5/6：仅给主审（可选百分比）→ 克隆众包 → 主审作父队列直分流

```bash
# Step 1: 克隆众包子队列
bytedcli --json safe tcs project clone \
  --project-id example-master-id \
  --is-hands-project \
  --group-name "demo-group"
# → 解析 destProject.id 为 example-hands-id

# Step 2: 询问 / 确认；主审作父队列时子队列仅为众包，hands_percent = 1。
#         若用户坚持主审 70 / 众包 30，澄清并改走盲审场景（场景 1）。

# Step 3: 直分流（superset 校验 + CLI 自动 preview + 确认后再执行；自动化场景需追加 `--yes`）
# splitList 仅含众包，不含父队列（即主审 example-master-id）自身
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-master-id \
  --split-list '[{"projectId":"example-hands-id","sharedTaskPercent":1}]'
```

### 场景 8（B-2）：主队列原本是父队列 + 要求盲审

```bash
# Step 0: 角色预检（确认 master_role = parent）
bytedcli --json safe tcs project get --project-id example-master-id

# Step 1: 克隆新父队列（盲审拓扑下的真正父队列）
bytedcli --json safe tcs project clone \
  --project-id example-master-id \
  --is-shared-project
# → 解析 destProject.id 为 example-new-parent-id

# Step 2: 如缺众包，先克隆（同分支 2）
bytedcli --json safe tcs project clone \
  --project-id example-master-id \
  --is-hands-project \
  --group-name "demo-group"
# → 解析 destProject.id 为 example-hands-id

# Step 3: 逐条调用 `safe tcs project get` 拿子队列 `project_verify_type`
#         （Agent 不得自行赋值；查询失败 / 字段缺失 → 该条目不写 projectVerifyType 并回显警告）
bytedcli --json safe tcs project get --project-id example-master-id
# → 假设响应中 project_verify_type = 1，记为 master_verify_type
bytedcli --json safe tcs project get --project-id example-hands-id
# → 假设响应中 project_verify_type = 0，记为 hands_verify_type

# Step 4: 一次 set-shared-project-split 同时完成分流 + 主审降级（superset 校验 + CLI 自动 preview + 确认后再执行；自动化场景需追加 `--yes`）
# splitList 同时含主审与众包，每条 projectVerifyType 透传自 Step 3 的查询结果，不含 example-new-parent-id
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-new-parent-id \
  --split-list '[{"projectId":"example-master-id","sharedTaskPercent":0.7,"projectVerifyType":1},{"projectId":"example-hands-id","sharedTaskPercent":0.3,"projectVerifyType":0}]'
```

### 场景 9（C-1）：主队列已经是子队列 + 直分流（挂到现有父队列）

```bash
# Step 0: 角色预检（确认 master_role = child，取 master_parent_id）
bytedcli --json safe tcs project get --project-id example-master-id
# → 假设响应中 shared_project_id = example-existing-parent-id

# Step 1: 克隆众包子队列（先向用户索取 group-name，再调用本命令）
bytedcli --json safe tcs project clone \
  --project-id example-master-id \
  --is-hands-project \
  --group-name "<用户回复>"
# → 解析 destProject.id 为 example-hands-id

# Step 2: 把众包挂到现有父队列下（superset 校验 + CLI 自动 preview + 确认后再执行；自动化场景需追加 `--yes`）
# splitList 仅含众包；父队列沿用 master_parent_id
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-existing-parent-id \
  --split-list '[{"projectId":"example-hands-id","sharedTaskPercent":1}]'
```

## ProductType 修复（任意分支失败后触发）

仅当上一步 `set-shared-project-split` 因 `product_type` 不一致失败。`update-product-type` 由 CLI handler 自动 preview + 等用户确认；自动化场景请追加 `--yes`：

```bash
# 交互式终端：CLI 自动 preview，等待用户输入 y/yes/确认
bytedcli safe tcs project update-product-type \
  --project-id example-parent-id \
  --target-project-id example-master-id
# 若众包队列也不一致，再补一次：
bytedcli safe tcs project update-product-type \
  --project-id example-hands-id \
  --target-project-id example-master-id

# 自动化 / Skill 链式调用：必须显式 --yes，否则抛 SAFE_INPUT_ERROR
bytedcli --json safe tcs project update-product-type \
  --project-id example-parent-id \
  --target-project-id example-master-id \
  --yes

# 修复完成后重试分流；splitList 仍然不含父队列；CLI 自动 preview，自动化场景同样需要 `--yes`
bytedcli safe tcs project set-shared-project-split \
  --shared-project-id example-parent-id \
  --split-list '[{"projectId":"example-master-id","sharedTaskPercent":0.7},{"projectId":"example-hands-id","sharedTaskPercent":0.3}]'
```

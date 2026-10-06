# ECOP 自动治理规则（autorule）命令参考

## 资源模型

`autorule` 是 ECOP 商家场景（`scene=2`）下的自动规则任务，由「任务（AutoRule）→ 任务版本（AutoRuleTask）」两层组成：

- **AutoRule**：一条治理规则的主体记录，有唯一 `autoRuleID`。
- **AutoRuleTask / Version**：每次提交训练产出的版本，有唯一 `autoRuleTaskID`（即版本 ID）。

每个版本包含：
- 人审规则（`manualReview`）：管控准则名称、违规点、豁免点
- 机审规则（`machineReview`）：完整 prompt 文本
- 训练统计（`stat`）：正负样本数、召回率、精确率

---

## `ecop autorule list`

列出商家场景下的自动治理任务。

```bash
bytedcli ecop autorule list --page 1 --page-size 10
bytedcli ecop autorule list --keyword demo-task
bytedcli ecop autorule list --owner demo-user@bytedance.com
bytedcli --json ecop autorule list
```

| 参数 | 上游字段 | 说明 |
|---|---|---|
| `--keyword` | `keyword` | 同时匹配任务名称与任务 ID |
| `--owner` | `userEmail` | 按负责人邮箱精确过滤 |
| `--page` / `--page-size` | `pageNum`/`pageSize` | CLI 1-based；上游接受字符串格式 |

内部常量：`scene=2`（商家场景，不对外暴露）

文本输出列：ID / 最新任务ID / 任务名称 / 版本状态 / 触发方式 / 治理标签 / 负责人

**版本状态**字段由 `lastVersionStageName`（阶段中文名）和 `lastVersionStatus`（状态值）拼合为「等待新规审核（success）」格式。

---

## `ecop autorule get`

查看某个版本的任务详情，包含基本信息、人审规则和机审规则。

```bash
bytedcli ecop autorule get --id 1459 --task-id 1633
bytedcli --json ecop autorule get --id 1459 --task-id 1633
```

| 参数 | 说明 |
|---|---|
| `--id`（必填）| AutoRule ID（autoRuleID），从 `autorule list` 返回的 `id` 获取 |
| `--task-id`（必填）| 版本 ID（autoRuleTaskID），从 `list` 返回的 `lastVersionTaskId` 获取 |

CLI 并发调用两个接口：`AutoRuleDetail`（基本信息）+ `AutoRuleTaskDetail`（版本规则）。

文本输出三个区块：

- `【基本信息】`：任务名称、治理标签（含编码）、体裁（商品/商家/用户/达人）、负责人
- `【人审规则】`：管控准则名称、风险描述、各违规点（管控范围/管控类目/行业/违规点描述/豁免规则）
- `【机审规则】`：完整 prompt 文本
- `【训练统计】`：正负样本数、召回率、精确率

---

## `ecop autorule create`

创建一条新的自动治理规则任务（商家场景 / 商品体裁）。

```bash
bytedcli ecop autorule create \
  --name "任务名称" \
  --label-code violation_type:zl_lfxx1 \
  --label-name "冒用官方名义-商家" \
  --desc "风险场景描述（initRuleInfo）" \
  --positive-ids "id1,id2,...,id15+" \
  --negative-ids "id1,id2,...,id15+" \
  --owner demo-user@bytedance.com
```

### 必填参数

| 参数 | 说明 | 校验规则 |
|---|---|---|
| `--name` | 任务名称 | 非空字符串 |
| `--label-code` | 治理标签编码，如 `violation_type:zl_lfxx1` | 非空字符串 |
| `--label-name` | 治理标签中文名 | 非空字符串 |
| `--desc` | 风险场景概括（对应上游 `initRuleInfo`） | 非空字符串 |
| `--positive-ids` | 正例商品 ID，逗号分隔 | 元素数量 **[15, 100]**，超出范围报错 |
| `--negative-ids` | 负例商品 ID，逗号分隔 | 元素数量 **[15, 100]**，超出范围报错 |
| `--owner` | 负责人邮箱，多人逗号分隔 | 非空字符串 |

### 硬编码参数（不对外暴露）

| 字段 | 值 | 说明 |
|---|---|---|
| `entityType` | `product` | 体裁：商品 |
| `scene` | `2` | 商家场景 |
| `caseType` | `4` | 训练集类型 |
| `isSubmit` | `true` | 直接提交（不保存草稿）|
| `source` | `pe` | 来源标识 |

### 成功输出示例

```
✓ 治理任务已创建
  治理任务 ID:      1461
  治理任务版本 ID:  1635

  查看详情: bytedcli ecop autorule get --id 1461 --task-id 1635
```

JSON 模式（`bytedcli --json ecop autorule create ...`）输出：

```json
{
  "status": "success",
  "data": {
    "auto_rule_id": "1461",
    "auto_rule_version_id": "1635"
  }
}
```

### 常见错误

| 错误 | 原因 | 修复方式 |
|---|---|---|
| `ECOP_INPUT_ERROR: --positive-ids must contain between 15 and 100...` | 正例 ID 数量不足或超出 | 补充到 15–100 个，逗号分隔 |
| `ECOP_INPUT_ERROR: --name is required` | 必填参数缺失 | 补上对应参数 |
| `ECOP_API_ERROR` | 上游接口返回错误（如标签编码不存在）| 核查 `--label-code` 是否为有效的治理标签编码 |

---

## 上游接口对应关系

| CLI 命令 | 上游 RPC |
|---|---|
| `ecop autorule list` | `ModelPlatformRpc/AutoRuleList` |
| `ecop autorule get` | `ModelPlatformRpc/AutoRuleDetail` + `AutoRuleTaskDetail`（并发）|
| `ecop autorule create` | `ModelPlatformRpc/SubmitAutoRule` |

所有接口路径前缀：`/api/governance_base/byte_cloud/rpc/`

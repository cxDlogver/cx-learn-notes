# Safe BCP

Query BCP reconciliation rows for one rule and time window via the Aeolus dashboard.

## Command

```bash
bytedcli safe bcp key list --rule-id <id> --result <codes> [--last-sync-minutes <n>]
```

## Workflow

1. Authenticate with Titan Passport once: `bytedcli auth login` (this command does **not** require `safe login`)
2. Pick a `rule_id` from the Aeolus dashboard rule selector (e.g. `1576`)
3. Run `bytedcli safe bcp key list --rule-id <id> --result 0` to list reconciliation failures
4. Use text output for a compact table; switch to `-j` when another tool needs the raw payload

## Examples

```bash
# 列最近 60 分钟内对账失败的 bcp_key（文本表格）
bytedcli safe bcp key list --rule-id 1576 --result 0 --last-sync-minutes 60

# JSON 输出 + 直接抽出去重后的 bcp_key 列表
bytedcli safe bcp key list --rule-id 1576 --result 0 -j | jq -r '.data.bcp_keys[]'

# 同时查看成功 + 失败两类
bytedcli safe bcp key list --rule-id 1576 --result 0,1 --last-sync-minutes 60
```

## Options

- `--rule-id <id>` — Reconciliation rule id from the dashboard rule selector (required, must be an integer; the dashboard schema is `int`)
- `--result <codes>` — Reconciliation result codes, comma-separated. See the full code table below. Examples: `--result 0`, `--result 0,2,3,4` (all failure modes), `--result 0,1` (success + fail) (required)
- `--last-sync-minutes <n>` — Filter rows whose `reconciliation_time` falls within the last N minutes from now. Default: `30`
- `--limit <n>` — Maximum number of rows to fetch from the dashboard. Default: `1000`. When `total === limit`, the response sets `truncated: true` and the text mode prints an explicit hint; rerun with a smaller `--last-sync-minutes` window or larger `--limit` to widen the slice.

### Result Code Reference

Dashboard codes follow backend `BCPResultCode` (opposite of unix exit codes):

| Code | Backend Const            | Meaning                                  |
| ---- | ------------------------ | ---------------------------------------- |
| 0    | `BCPResultCodeFail`      | 对账失败（实际值与期望值不一致）         |
| 1    | `BCPResultCodeSuccess`   | 对账成功（实际值与期望值一致）           |
| 2    | `BCPResultCodeMissParam` | 缺参数（对账规则的入参没拿到，无法执行） |
| 3    | `BCPResultCodeExecFail`  | 执行失败（对账规则运行时报错）           |
| 4    | `BCPResultCodeBuildFail` | 构建失败（对账规则编译/构建阶段失败）    |

Common combos:

- `--result 0` — only mismatches
- `--result 0,2,3,4` — all "not success" rows (mismatches + 3 种异常态)
- `--result 2,3,4` — pipeline-side problems only (排除业务对账不一致)

## Output

Text mode shows a compact table with:

- `bcp_key`
- `result` (raw dashboard code, no semantic mapping)
- `reconciliation_time`

JSON mode (`-j`) returns:

- `data.bcp_keys` — **去重**后的 key 列表（同一 `bcp_key` 只出现一次），适合直接喂给通知 / 拉群 / 批量下单等场景，例如 `jq -r '.data.bcp_keys[]'`
- `data.rows` — **完整**的失败行（不去重），包含每次失败的 `reconciliation_time` 与 `feature_list`；同一个 `bcp_key` 重复送审或多次失败时，这里会出现多条记录
- `data.total` — 原始行数（= `rows.length`，不等于 `bcp_keys.length`）
- `data.limit` — 当次请求实际生效的 `--limit`（默认 `1000`）
- `data.truncated` — `true` 表示 `total === limit`，dashboard 还可能有更多行未返回；text mode 会同时多打印一行 “results may be truncated at --limit=…” 提示

> 即同一个 `bcp_key` 多次失败时，`bcp_keys` 只显示一次（表达"该 key 有问题"），`rows` / `total` 仍然保留每次失败的上下文。
>
> 想统计每个 key 的失败次数：
>
> ```bash
> ... -j | jq '[.data.rows[] | .bcp_key] | group_by(.) | map({key: .[0], times: length})'
> ```

## Agent Guidance

- Result codes are raw dashboard codes; do **not** map them client-side. Pick the right code(s) from the table above:
  - "对账失败" / "不一致" → `--result 0`
  - "对账成功" / "一致" → `--result 1`
  - "缺参数" / "miss param" → `--result 2`
  - "执行失败" / "exec fail" → `--result 3`
  - "构建失败" / "build fail" → `--result 4`
  - "所有异常" / "排查所有失败" → `--result 0,2,3,4`
- The dashboard id `263849` is hard-coded; this command is intentionally bound to that one report and not a general dashboard query.
- Authentication reuses Aeolus headers (Titan Passport). If the request fails with a 401-shaped error, the fix is `bytedcli auth login`, not `safe login`.

## References

- [invocation.md](../invocation.md)

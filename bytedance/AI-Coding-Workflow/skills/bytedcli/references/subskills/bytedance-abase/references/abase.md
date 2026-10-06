# ABase

ABase2 namespace、table 与在线查询命令。

```bash
bytedcli abase list --scope all --keyword "demo.namespace" --limit 20
bytedcli abase list --scope mine --limit 20
bytedcli abase list --scope favor --limit 20
bytedcli abase search --psm "demo.namespace"
bytedcli abase get --psm "demo.namespace"
bytedcli abase get --namespace-id 1001 --cluster "sample-cluster"
```

Table 查询：

```bash
bytedcli abase table list --psm "demo.namespace"
bytedcli abase table list --cluster "sample-cluster" --namespace "demo_namespace"
bytedcli abase table get --psm "demo.namespace" --table "sample_table"
bytedcli abase table get --cluster "sample-cluster" --namespace "demo_namespace" --table-id 2001
```

在线查询：

```bash
bytedcli abase command list
bytedcli abase command list --psm "demo.namespace" --table "sample_table"
bytedcli abase command run --psm "demo.namespace" --table "sample_table" --command "GET" --inputs "sample-key"
bytedcli abase command run --cluster "sample-cluster" --namespace "demo_namespace" --table "sample_table" --payload-json '{"command":"GET","inputs":"sample-key"}'
```

区域元数据：

```bash
bytedcli abase region list
bytedcli abase location list
bytedcli abase region list --abase-site "i18n-tt" --region "us"
```

Notes:

- 国内生产默认使用 `--abase-site cn --region online`。
- Redis / Cache 服务仍使用 `bytedcli cache ...`，ABase2 namespace / table 使用 `bytedcli abase ...`。
- `--limit` 对 namespace list/search 是本地输出上限；后端列表接口当前不返回可靠 total，JSON 输出使用 `current_count`。

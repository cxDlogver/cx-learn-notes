# Magnus

Magnus GLS metadata read-only queries for catalogs, databases, tables, and schemas.

当前命令只覆盖 CN GLS 元数据读接口，不读取表数据，不创建、更新、删除、注册、导入或上传资源。

```bash
bytedcli magnus catalog list
bytedcli magnus database list --catalog demo_catalog
bytedcli magnus database get --catalog demo_catalog --db-name demo_db
bytedcli magnus table list --catalog demo_catalog --db-name demo_db --page 1 --page-size 20
bytedcli magnus table get --name demo_catalog.demo_db.demo_table
bytedcli magnus table get --name demo_catalog.demo_db.demo_table --detail
bytedcli magnus schema columns --name demo_catalog.demo_db.demo_table
```

常用入口：

- `bytedcli magnus catalog list|get|exists`
- `bytedcli magnus database list|get|exists`
- `bytedcli magnus table list|get|exists`
- `bytedcli magnus schema columns|partitions|properties|column-types`

database 入参统一使用 `--db-name`。

不要使用 `magnus data list`；首版没有表数据读取命令。

# 数据库迁移

`manifest.json` 按四位数字登记迁移，文件名为 `NNNN_说明.sql`。CORE-03 从 `0001` 开始建立业务 schema。迁移只向前执行；部署使用 expand → deploy → contract 顺序，不能在同一发布中删除旧客户端仍读取的字段。

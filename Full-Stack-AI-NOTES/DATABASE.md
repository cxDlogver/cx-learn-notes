---
title: DATABASE
categories:
  - 后端学习
date: 2024-09-18 22:28:09
tags:
---

<!--more-->

# MYSQL数据库知识汇总

## MySQL数据类型汇总

<font color='yellow'>MySQL与Java数据类型的对应关系：</font>

**1. 数值类型**

| MySQL 数据类型    | Java 数据类型          | 说明                                             |
| ----------------- | ---------------------- | ------------------------------------------------ |
| `TINYINT`         | `byte`                 | 范围：-128 到 127                                |
| `SMALLINT`        | `short`                | 范围：-32,768 到 32,767                          |
| `MEDIUMINT`       | `int`                  | 范围：-8,388,608 到 8,388,607                    |
| `INT` / `INTEGER` | `int`                  | 范围：-2^31 到 2^31-1                            |
| `BIGINT`          | `long`                 | 范围：-2^63 到 2^63-1                            |
| `DECIMAL(p, s)`   | `java.math.BigDecimal` | 精确的定点数值，可以用于处理货币等需要高精度的值 |
| `FLOAT`           | `float`                | 单精度浮点数                                     |
| `DOUBLE`          | `double`               | 双精度浮点数                                     |
| `BIT`             | `boolean` 或 `byte`    | 用于布尔值或位字段，Java中常用 `boolean`         |

**2. 字符串类型**

| MySQL 数据类型 | Java 数据类型 | 说明                     |
| -------------- | ------------- | ------------------------ |
| `CHAR(n)`      | `String`      | 固定长度的字符串         |
| `VARCHAR(n)`   | `String`      | 可变长度的字符串         |
| `TEXT`         | `String`      | 长文本数据               |
| `TINYTEXT`     | `String`      | 最多255字节的文本        |
| `MEDIUMTEXT`   | `String`      | 最多16,777,215字节的文本 |
| `LONGTEXT`     | `String`      | 最多4GB的文本            |

**3. 日期和时间类型**

| MySQL 数据类型 | Java 数据类型                            | 说明                                    |
| -------------- | ---------------------------------------- | --------------------------------------- |
| `DATE`         | `java.sql.Date`                          | 只包含日期，格式为`YYYY-MM-DD`          |
| `DATETIME`     | `java.sql.Timestamp` 或 `java.util.Date` | 日期和时间，格式为`YYYY-MM-DD HH:MM:SS` |
| `TIMESTAMP`    | `java.sql.Timestamp`                     | 带有时区的日期时间戳                    |
| `TIME`         | `java.sql.Time`                          | 只包含时间，格式为`HH:MM:SS`            |
| `YEAR`         | `int`                                    | 仅年份，范围为 1901 到 2155             |

**4. 二进制数据类型**

| MySQL 数据类型 | Java 数据类型 | 说明                       |
| -------------- | ------------- | -------------------------- |
| `BINARY(n)`    | `byte[]`      | 固定长度的二进制数据       |
| `VARBINARY(n)` | `byte[]`      | 可变长度的二进制数据       |
| `BLOB`         | `byte[]`      | 二进制大对象，最大长度64KB |
| `TINYBLOB`     | `byte[]`      | 最大255字节的二进制数据    |
| `MEDIUMBLOB`   | `byte[]`      | 最大16MB的二进制数据       |
| `LONGBLOB`     | `byte[]`      | 最大4GB的二进制数据        |

**5. 布尔和枚举类型**

| MySQL 数据类型 | Java 数据类型 | 说明                                                       |
| -------------- | ------------- | ---------------------------------------------------------- |
| `BOOLEAN`      | `boolean`     | `BOOLEAN` 实际上是 `TINYINT(1)`，1表示`true`，0表示`false` |
| `ENUM`         | `String`      | 枚举类型，对应Java中的字符串                               |

**6. JSON 数据类型**

| MySQL 数据类型 | Java 数据类型                     | 说明                                                         |
| -------------- | --------------------------------- | ------------------------------------------------------------ |
| `JSON`         | `String` 或 `org.json.JSONObject` | JSON格式的数据，通常在Java中作为`String`处理，或者通过第三方库（如`org.json.JSONObject`）处理 |


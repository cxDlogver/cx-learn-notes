---
title: DATABASE
categories:
  - 后端学习
date: 2024-09-18 22:28:09
tags:
---

<!--more-->

# MySQL 数据类型与 Java 数据访问映射

本文先区分 **MySQL Server 中的数据类型** 与 **Java 应用通过 JDBC / Connector/J 读取数据时的类型映射**。两者不是一一对应关系：

```text
MySQL Server Type
        ↓
JDBC API
        ↓
MySQL Connector/J
        ↓
Java Application Type
```

MySQL 类型定义数据在数据库中的范围、精度和语义；Connector/J 负责按照 JDBC 规则在 MySQL 与 Java 之间转换；应用最终使用哪种 Java 类型，还会受到读取 API、字段是否为 `UNSIGNED`、Connector/J 配置和业务精度要求影响。Connector/J 官方也明确说明，同一个 MySQL 类型通常可以转换为多个 Java 类型，选择容量不足的 Java 类型还可能产生溢出或精度损失。[[1]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html)

## 1. MySQL 数据类型描述数据库中的数据语义

这一层只回答“数据库怎样保存和约束数据”，不把某个 Java 类型当成 MySQL 类型自身的定义。

### 【数值类型】

MySQL 整数需要同时考虑类型宽度与 `SIGNED / UNSIGNED`。Java 基本整数类型没有与 MySQL `UNSIGNED` 完全对应的一套类型，因此不能仅根据名称机械映射。[[1]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html)

| MySQL 数据类型 | 数据库语义 | 常见注意点 |
| --- | --- | --- |
| `TINYINT` | 小范围整数 | 可声明为 `SIGNED` 或 `UNSIGNED` |
| `SMALLINT` | 较小范围整数 | 不应直接等同于 Java `short` |
| `MEDIUMINT` | MySQL 特有的中等范围整数 | Java 没有同名整数类型 |
| `INT / INTEGER` | 常用整数 | `UNSIGNED INT` 的上界超过 Java signed `int` |
| `BIGINT` | 大范围整数 | `BIGINT UNSIGNED` 的完整范围超过 Java signed `long` |
| `DECIMAL(p, s)` | 精确定点数 | 适合货币、精确计量等场景 |
| `FLOAT` | 单精度浮点数 | 存在浮点精度误差 |
| `DOUBLE` | 双精度浮点数 | 精度高于 `FLOAT`，仍属于浮点数 |
| `BIT(n)` | 位字段 | `BIT(1)` 与多位 `BIT(n)` 的 Driver 映射不同 |

### 【字符串与二进制类型】

| 类型 | 数据库语义 |
| --- | --- |
| `CHAR(n)` | 固定长度字符数据 |
| `VARCHAR(n)` | 可变长度字符数据 |
| `TINYTEXT / TEXT / MEDIUMTEXT / LONGTEXT` | 不同容量级别的文本数据 |
| `BINARY(n)` | 固定长度二进制数据 |
| `VARBINARY(n)` | 可变长度二进制数据 |
| `TINYBLOB / BLOB / MEDIUMBLOB / LONGBLOB` | 不同容量级别的二进制大对象 |

字符串长度与容量还受到字符集、类型定义和 MySQL 版本规则影响，不应只通过 Java `String` 的能力反推数据库容量。

### 【日期和时间类型】

| MySQL 数据类型 | 数据库语义 |
| --- | --- |
| `DATE` | 日期 |
| `TIME` | 时间或时间间隔语义 |
| `DATETIME` | 日期与时间组合，不表示一个自带时区标识的瞬时时间点 |
| `TIMESTAMP` | MySQL 会按照 Session Time Zone 与 UTC 之间进行转换，但字段本身不保存时区标识 |
| `YEAR` | 年份类型；常规范围为 1901–2155，并存在特殊值 `0000` |

因此，不能把 `TIMESTAMP` 简化成“带有时区的日期时间戳”。MySQL 的时间类型语义与 Java 最终使用 `LocalDateTime`、`Timestamp`、`Instant` 等哪一种类型是两个层面的问题。[[2]](https://dev.mysql.com/doc/refman/8.4/en/date-and-time-type-syntax.html)

### 【布尔、枚举与 JSON】

MySQL 中 `BOOL / BOOLEAN` 是 `TINYINT` 的同义类型，而不是独立的原生 Boolean 存储类型。[[3]](https://dev.mysql.com/doc/refman/8.4/en/other-vendor-data-types.html)

| MySQL 数据类型 | 数据库语义 |
| --- | --- |
| `BOOLEAN / BOOL` | `TINYINT` 的同义类型，通常用于表达布尔语义 |
| `ENUM` | 值必须来自预定义枚举集合 |
| `JSON` | MySQL 原生 JSON 数据类型 |

## 2. Connector/J 在 MySQL 与 Java 之间执行类型转换

MySQL Connector/J 是实现 JDBC API 的 Type 4 Driver。Java 应用并不是直接把 MySQL 类型“变成 Java 类型”，而是通过 JDBC 与 Connector/J 完成协议通信和类型转换。当前 Connector/J 实现 JDBC 4.2，并支持 `java.time` 中的本地时间与带偏移时间类型。[[4]](https://dev.mysql.com/doc/connector-j/en/connector-j-overview.html)

```text
Java Application
        ↓
JDBC API
        ↓
MySQL Connector/J
        ↓
MySQL Protocol
        ↓
MySQL Server
```

### 【整数映射取决于范围与 UNSIGNED】

以下表格描述的是 Connector/J 当前 `ResultSetMetaData.getColumnClassName()` 的典型返回类型，不表示 MySQL 类型只能转换为这一种 Java 类型。Connector/J 支持更多合法转换。[[1]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html)

| MySQL 类型 | Connector/J 元数据对应的 Java Class | 需要注意的边界 |
| --- | --- | --- |
| `TINYINT(>1) SIGNED` | `Integer` | 不能把 `TINYINT` 固定理解成 Java `byte` |
| `TINYINT UNSIGNED` | `Integer` | Java `byte` 无法完整表达 unsigned 范围 |
| `SMALLINT` | `Integer` | 无论 signed / unsigned，元数据默认均为 `Integer` |
| `MEDIUMINT` | `Integer` | 无论 signed / unsigned，元数据默认均为 `Integer` |
| `INT / INTEGER` | `Integer` | signed 情况 |
| `INT UNSIGNED` | `Long` | unsigned 上界超过 Java signed `int` |
| `BIGINT` | `Long` | signed 情况 |
| `BIGINT UNSIGNED` | `BigInteger` | unsigned 上界超过 Java signed `long` |
| `DECIMAL` | `BigDecimal` | 保留十进制定点精度 |
| `FLOAT` | `Float` | 浮点数 |
| `DOUBLE` | `Double` | 浮点数 |

因此更准确的理解是：

```text
数据库数值范围
        ↓
Driver 转换规则
        ↓
Java 类型容量是否足够
        ↓
应用最终选择
```

### 【BIT 与 BOOLEAN 需要区分 Server 类型和 Driver 行为】

Connector/J 当前对位类型明确区分：

```text
BIT(1)
→ Boolean

BIT(n > 1)
→ byte[]
```

而 `TINYINT(1) / BOOLEAN` 的 JDBC 类型解释还会受到 Connector/J 的 `tinyInt1isBit`、`transformedBitIsBoolean` 等配置影响；例如关闭 `tinyInt1isBit` 后，元数据 Java Class 可以表现为 `Integer`。[[1]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html)[[5]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html)

所以不能简单写成：

```text
BOOLEAN = Java boolean
BIT = Java boolean
```

应区分：

```text
MySQL Server
BOOLEAN / TINYINT / BIT
        ↓
Connector/J 配置与转换
        ↓
Boolean / Integer / byte[]
```

### 【日期时间映射同时存在 JDBC 传统类型与 java.time】

旧式 JDBC 代码常见 `java.sql.Date`、`java.sql.Time`、`java.sql.Timestamp`，但它们不是现代 Java 应用唯一的选择。Connector/J 当前实现 JDBC 4.2，并支持 `java.time`。[[4]](https://dev.mysql.com/doc/connector-j/en/connector-j-overview.html)

Connector/J 当前默认元数据映射中，`DATETIME` 对应 `java.time.LocalDateTime`，而 `TIMESTAMP` 对应 `java.sql.Timestamp`；同时 Driver 的时间处理 API 还支持 `LocalDate`、`LocalTime`、`Instant`、`OffsetDateTime`、`ZonedDateTime` 等类型。[[1]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html)[[6]](https://dev.mysql.com/doc/connector-j/en/connector-j-query-attributes.html)

因此应用选型应先判断数据语义：

```text
只有日期
→ LocalDate

不带时区语义的本地日期时间
→ LocalDateTime

表示真实时间线上的瞬时点
→ Instant / OffsetDateTime 等
```

具体转换仍要结合 MySQL 字段类型、Connector/J 配置和系统时区策略，不能仅根据 Java 类名判断数据库的时间语义。

### 【YEAR 的 Java 表现受 Driver 配置影响】

MySQL `YEAR` 的数据库语义是年份；Connector/J 如何把它暴露给 Java 则属于 Driver 行为。当前 `yearIsDateType` 默认值为 `true`：启用时 `YEAR` 可按 `java.sql.Date` 返回，关闭时按 `java.sql.Short` 返回。[[5]](https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html)

因此原来的：

```text
YEAR → int
```

不能作为固定映射规则。

## 3. 数据库类型、Driver 类型与应用类型必须分层判断

遇到“某个 MySQL 类型在 Java 中应该用什么类型”时，建议按下面的顺序判断：

```text
1. MySQL 字段真正表达什么数据？
        ↓
2. SIGNED / UNSIGNED、精度、长度和时间语义是什么？
        ↓
3. Connector/J 当前版本怎样转换？
        ↓
4. 使用 getObject / getInt / getLong / setObject 等哪种 JDBC API？
        ↓
5. Java 类型能否完整表达数据库范围和业务语义？
```

例如 `BIGINT UNSIGNED` 不能因为名称里有 `BIGINT` 就机械选择 Java `long`；`DATETIME` 也不能因为包含日期和时间就直接等同于 `Timestamp`。

这条分层关系可以推广到其他技术栈：

```text
通用关系

Application
↓
Database Driver
↓
DBMS

Java 示例
Java → Connector/J → MySQL

Node.js 示例
Node.js → node-postgres → PostgreSQL
```

Driver 是应用语言与具体 DBMS 之间的数据访问层之一；数据库类型、Driver 转换和应用类型属于三个不同层级。

## 4. 参考文献

[1] Oracle / MySQL, *MySQL Connector/J Developer Guide — Java, JDBC, and MySQL Types*, Connector/J 26.7, 2026-08-31. https://dev.mysql.com/doc/connector-j/en/connector-j-reference-type-conversions.html

[2] Oracle / MySQL, *MySQL 8.4 Reference Manual — Date and Time Data Type Syntax*, MySQL 8.4. https://dev.mysql.com/doc/refman/8.4/en/date-and-time-type-syntax.html

[3] Oracle / MySQL, *MySQL 8.4 Reference Manual — Data Types from Other Database Engines*, MySQL 8.4. https://dev.mysql.com/doc/refman/8.4/en/other-vendor-data-types.html

[4] Oracle / MySQL, *MySQL Connector/J Developer Guide — Overview of MySQL Connector/J*, Connector/J 26.7, 2026-08-31. https://dev.mysql.com/doc/connector-j/en/connector-j-overview.html

[5] Oracle / MySQL, *MySQL Connector/J Developer Guide — Configuration Properties*, Connector/J 26.7. https://dev.mysql.com/doc/connector-j/en/connector-j-reference-configuration-properties.html

[6] Oracle / MySQL, *MySQL Connector/J Developer Guide — Using Query Attributes*, Connector/J 26.7. https://dev.mysql.com/doc/connector-j/en/connector-j-query-attributes.html

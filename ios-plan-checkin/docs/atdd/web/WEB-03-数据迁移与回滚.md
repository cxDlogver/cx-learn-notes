# WEB-03｜共享数据兼容迁移与回滚记录

| 项目 | 实际状态 |
| --- | --- |
| 任务 | `IN_PROGRESS`；`0012_web_compatibility.sql` 已编码并完成 PGlite 及隔离 PostgreSQL 17 的旧库迁移、事务回滚、备份恢复检查，待最终检查与复核 |
| 基线 | Web 技术方案 §7、Web PRD、现有 `0001～0011` 数据库迁移 |
| 业务验收 | 136 项仍 `NOT_RUN`；本页仅是数据库开发验证 |
| 迁移策略 | 扩展式：保留原列/表/旧 API 使用的字段，Web API/Worker 后续切入新增结构 |

## 已落地数据字典

| 对象 | 新字段与约束 | 旧数据与兼容口径 |
| --- | --- | --- |
| `sessions` | `client_channel` 限 `ios/web`；按用户/渠道/到期建立活跃索引 | 默认 `ios`，原会话与轮换逻辑不变；Web 会话由 WEB-04 显式写 `web` |
| `channel_notification_preferences` | `(user_id, channel)` 主键；计划和三类社交通知开关、版本 | 既有 `notification_preferences` 逐行复制为 `ios`；`web` 未预建，由首次设置创建；原表留给旧 API，WEB-15 切流时保持双读一致 |
| `web_push_subscriptions` | 用户、浏览器设备、32 字节 endpoint 哈希、加密字段、启用/失效时间；endpoint 全局唯一、同用户同浏览器唯一 | 不改 `devices` APNs 模型；加密与授权由 WEB-15 服务实现，不在日志存 endpoint/密钥 |
| `inbox_messages` | 接收账号、业务事件、行为人、最小 JSON、事件去重键、创建/已读时间 | 账号级 `read_at` 支持多 Web 浏览器已读共享；历史 APNs 发送不倒推成可读消息 |
| `plan_numeric_config_versions` | 每计划版本/生效日期唯一，名称 1～40、单位 1～20；更新被 append-only 触发器拒绝 | 未凭空为旧计划生成配置；新规则向后生效，旧打卡继续显示原值/单位 |
| `checkins` | 可空的 `numeric_label`、所属计划的配置版本外键 | 仅在旧规则 JSON 明示同一单位和非空 `label` 时回填名称；无法确认时名称留空，`numeric_value`/`numeric_unit` 保持原样 |
| `one_time_resolutions` | 可空的数值、单位、名称、配置版本外键，数值/单位成对 | 旧终态及 `note` 不变；照片原已有 `media.one_time_plan_id`，不重复建表 |
| `worker_jobs` | 名称约束新增 `send-web-push`、`send-plan-reminder` | 旧任务名和行仍有效，后续 Worker 实现新任务消费 |

## 已执行验证

1. `node scripts/sql-static-check.mjs`：PostgreSQL 17 语法解析与扩展迁移静态检查通过，41 张表、12 个迁移。
2. `node scripts/migrations-smoke.mjs`：空库完整迁移通过；旧核心唯一打卡、时区和规则不可修改、一次性方向约束仍通过。
3. `node scripts/web-migrations-smoke.mjs`：先加载 11 个旧迁移并写入旧用户/通知偏好/会话/计划/记录/一次性结果；在事务中应用 Web 迁移后回滚，表数恢复 37 且旧行不变；再次应用后为 41 张表。核对 iOS 偏好复制、旧会话标识、历史数值标签与单位、一次性备注保留、新终态数值；非法跨计划配置引用、缺单位、配置修改、重复消息及重复 Push 哈希均被拒绝，新 Worker 名称可插入。
4. 在独立、仅绑定 `127.0.0.1` 的 PostgreSQL 17-alpine 容器里，对空 `web_atdd` 数据库执行同一旧库/回滚/重放用例；生成 113814 字节自定义格式备份，恢复到另一空库。原库与恢复库依次核对表数、用户、渠道偏好、打卡、收件箱、Push、一次性数值结果，均为 `41|2|1|1|1|1|1`。命令退出码、输出、备份大小及字段顺序见 [PostgreSQL 备份恢复记录](./evidence/WEB-03/postgres-restore.json)；SHA-256 为 `41e27cb4beadec3d1bb471d60f787f274655bf069489d8758dc5244ab8c45331`。临时容器已停止并自动删除。

两类测试均使用隔离合成用户，不连真实用户库；证明数据库语法、事务回滚、备份恢复和历史行兼容，不能代替后续 API/Worker 或浏览器业务验收。原始输出与 SHA-256 在 WEB-03 证据清单中登记。

## 回滚与切流

- **迁移事务失败时：**现有 `migrate.mjs` 在单个迁移的事务中回滚；本任务已用旧库事务回滚实测，旧表和行保留。
- **迁移已提交、Web 尚未切流时：**回退应用版本即可，保留新增表和可空列；旧 iOS 代码继续读原字段，不删除新表，以免丢失已经写入的数据。
- **Web 写入后需回退时：**先关闭 Web 写入口与新 Worker 消费，保留数据库扩展和审计数据，按事件/账号核对已写消息、Push 订阅和数值配置，再决定补偿或重放。不能直接运行会删除新数据的 down 迁移。
- **切流门槛：**WEB-04/06/08/13/15 的服务与契约测试、旧移动接口兼容测试、真实 PostgreSQL 迁移与备份恢复演练完成后才让 Web 使用新结构。旧 `notification_preferences` 与新 `ios` 行在过渡期的同步由 WEB-15 明确实现与验收。

## 后续未完成

- 生产部署前仍需按发布候选流程在拟发布环境演练备份、迁移和恢复；本任务已完成隔离 PostgreSQL 17 旧库演练。
- 服务端读写和 Worker 仍未接入新表；依赖任务各自执行 API/浏览器验收。
- WEB-03 checklist 在环境级验证与复核完成前保持未勾选。

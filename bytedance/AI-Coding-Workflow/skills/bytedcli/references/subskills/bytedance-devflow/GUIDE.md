---
name: bytedance-devflow
description: 面向 DevFlow 任务创建/查看/关闭、空间项目列表查询、Meego/需求 列表查询、Meego 绑定、资源查询、服务部署/重试部署/删除部署/开启 debug、RDS 工单创建，添加服务到 devflow 任务，以及 TCC key 查询/创建/修改/删除的统一入口。当用户提到 DevFlow、服务信息、项目信息、部署情况、泳道信息、服务MR信息、TCC 部署信息、RDS 工单、服务部署、服务重试部署、在 DevFlow 上开启或重启 debug、查看空间项目列表、查看我的 meego 列表、查询某个 meego、Meego 关联任务查询、将 Meego 绑定到 DevFlow task 或 TCC 配置管理时使用。
---
# DevFlow 技能

本技能是 DevFlow 相关能力的统一入口，覆盖以下场景：

- DevFlow 任务创建、查询、关闭
- 查询某个业务空间下的项目列表
- 查询与当前用户或关键词相关的 Meego 列表
- DevFlow 服务与资源信息查询, 包括服务信息、项目信息、TCC 部署信息、部署情况、泳道信息、服务MR信息
- DevFlow 资源查询，尤其是根据 `meego_id` 查询关联任务和资源
- 将指定 Meego issue 绑定到某个 DevFlow task
- DevFlow 服务部署、重试部署、删除部署、开启或重启 debug
- DevFlow RDS 工单创建
- 当前 DevFlow 任务里的 TCC key 查询、创建、修改、删除

使用该工具时，非必要信息尽量不要与用户进行交互，尽可能快速完成相关操作。

## Scripts

- `bytedcli devflow`：DevFlow CLI 的 bytedcli 代理入口，内部转发到 `skills/bytedance-devflow/scripts/devflow.sh`。AI 按 skill 调用时应显式追加 `--bytedcli-skill-dir="<skill所在目录>"`，把当前 skill 安装目录透传给 wrapper 做 agent 推断。

## 何时使用

当用户明确表达以下意图时使用本技能：

- 创建新的 DevFlow 任务
- 查看或关闭现有 DevFlow 任务
- 查看空间项目列表或 Biz 下项目列表
- 查看一下我的 meego 列表，或按 meego 链接 / meego id / meego 名称查询 meego
- 将某个 Meego issue 绑定到指定 DevFlow task
- 查询服务部署信息、服务信息、项目信息、TCC 部署信息、部署情况、泳道信息、服务MR信息
- 发起服务部署、重试部署或删除某个服务部署
- 创建某个 RDS 资源的 DDL / DML / CLEAR 工单
- 添加服务到 DevFlow 任务
- 在当前项目对应的 DevFlow 服务上开启 debug 或重启 debug
- 查询、创建、修改或删除当前 DevFlow 任务里的 TCC key
- 提到 DevFlow/TCC 配置管理，且需要先识别具体动作再继续处理

## References

- [query-tcc.md](references/query-tcc.md): 当用户要查询、查看、确认某个 `tcc_psm + tcc_key` 当前配置内容时，加载并阅读该文档。
- [create-tcc.md](references/create-tcc.md): 当用户要在当前任务中为某个服务新增 `tcc key`，并写入初始值、描述或类型信息时，加载并阅读该文档。
- [edit-tcc.md](references/edit-tcc.md): 当用户要修改、更新、覆盖某个 `tcc_psm + tcc_key` 的配置值时，加载并阅读该文档。
- [delete-tcc.md](references/delete-tcc.md): 当用户要删除、移除某个 `tcc_psm + tcc_key` 配置时，加载并阅读该文档。
- [info-task.md](references/info-task.md): 当用户要查看、确认、检查某个 DevFlow task 的当前信息时，加载并阅读该文档。
- [list-project.md](references/list-project.md): 当用户要查看某个 `biz_id` 下的空间项目列表时，加载并阅读该文档。
- [list-work-item.md](references/list-work-item.md): 当用户要查看自己的 meego/需求 列表，或按 meego 链接、meego id、meego 名称/描述查询 meego 候选列表时，加载并阅读该文档；对应命令入口为 `work_item list`。
- [info-service.md](references/info-service.md): 当用户要查询服务部署信息、服务信息、项目信息、TCC 部署信息、部署情况、泳道信息、服务MR信息或 scm 编译情况时，加载并阅读该文档。
- [deploy-service.md](references/deploy-service.md): 当用户要创建新的 DevFlow 任务并发起服务部署或泳道部署，或在当前仓库/分支上发起一次服务部署或泳道部署，添加服务到 DevFlow 任务时，加载并阅读该文档。如果用户在使用该文档创建任务的同时提供`meego_id`,则再执行`add_meego-task.md`将`meego_id`绑定到新创建的任务。
- [debug-service.md](references/debug-service.md): 当用户要在 DevFlow 上为当前项目开启 debug、重启 debug，或指定 `repo_name/branch/ide_type/env/cluster/idc` 发起一次 debug 时，加载并阅读该文档；其中 `ide_type` 支持 `DEBUG_IDE_TYPE_GOLAND`、`DEBUG_IDE_TYPE_VSCODE`、`DEBUG_IDE_TYPE_WEBIDE`。
- [create-rds-ticket.md](references/create-rds-ticket.md): 当用户要在 DevFlow 里为某个 RDS 资源创建 DDL / DML / CLEAR 工单，或用户明确提到“发 RDS 工单”“创建数据库工单”“提交 SQL 变更单”时，加载并阅读该文档。
- [retry-deploy-service.md](references/retry-deploy-service.md): 当用户要重试当前 DevFlow 任务里某个服务已有的部署流水线，或按 `task_id/repo_name/branch/psm/lane/region` 触发一次服务重试部署，并且用户当前动作不涉及提交或git push的时候，加载并阅读该文档。
- [search-resource.md](references/search-resource.md): 当用户要按 `meego_id` / meego 链接查询 DevFlow 关联任务，按任务标题关键词或创建者搜索任务，搜索可部署资源或可添加到 DevFlow 任务的资源，或表达“先帮我搜索下 xxx，再加到 DevFlow 任务里”这类先搜再继续处理的意图时，加载并阅读该文档。
- [add\_meego-task.md](references/add_meego-task.md): 当用户要把某个 Meego issue 绑定到指定 DevFlow task，或把当前仓库/分支对应任务和某个 `meego_id` 关联起来时，加载并阅读该文档。
- [delete-service.md](references/delete-service.md): 当用户要删除某个 DevFlow 任务里的服务部署，或移除指定 `psm` 的部署时，加载并阅读该文档。
- [close-task.md](references/close-task.md): 当用户要关闭、结束、终止某个 DevFlow task 时，加载并阅读该文档。

## 使用原则

- 本文档作为 DevFlow 总入口，负责先识别任务、部署、TCC 等大类场景
- 如果用户提到的是“DevFlow 任务信息”，不要直接默认走 `references/info-task.md`；应先判断用户描述里是否已经指向某个资源
- 一旦用户提到 DevFlow 任务下的某个资源，优先路由到该资源对应的信息查询路径，而不是泛化路由到 `references/info-task.md`
- 例如：查询服务的 DevFlow 任务信息，或查询 TCC 的部署信息，应优先加载并阅读 `references/info-service.md`
- 例如：查询当前 DevFlow 任务下某个 TCC 资源的信息，应优先加载并阅读对应的 `references/*-tcc.md`
- 当需求落在服务部署或泳道部署上时，加载并阅读 `references/deploy-service.md`
- 当需求落在服务重试部署、重跑部署流水线、重试当前部署流程，并且用户当前动作不涉及提交或git push的时候，加载并阅读 `references/retry-deploy-service.md`
- 当需求落在在 DevFlow 上开启 debug 或重启 debug 时，加载并阅读 `references/debug-service.md`
- 当需求落在 RDS 工单创建、数据库 DDL / DML / CLEAR 发单，或涉及重命名表、truncate table、清空表、drop table、删除表等清表类需求时，加载并阅读 `references/create-rds-ticket.md`
- 涉及 DevFlow CLI / OpenAPI 返回 `pending` 的场景时，必须优先把返回文案原样展示给用户，再继续追问、补参或请求确认；不能只做摘要式转述
- 当需求落在服务部署信息、服务信息、项目信息、TCC 部署信息、部署情况、泳道信息、服务MR信息查询上时，加载并阅读 `references/info-service.md`
- 当需求是泛化的 DevFlow task 信息查看，且未提及任何具体资源时，加载并阅读 `references/info-task.md`
- 当需求落在空间项目列表查询，或用户提供 `biz_id` 要查看项目列表时，加载并阅读 `references/list-project.md`
- 当需求落在 Meego/需求 列表查询、Meego 候选查询，或用户说“查看一下我的 meego/需求 列表”“帮我查询 xxx meego/需求”时，加载并阅读 `references/list-work-item.md`
- 当需求落在 DevFlow 资源搜索、按 `meego_id` / meego 链接查询关联任务、按任务标题关键词或创建者搜索任务、搜索可部署资源或可添加到 DevFlow 任务的资源、，或表达“先帮我搜索下 xxx，再加到 DevFlow 任务里”这类先搜再继续处理的意图时，加载并阅读 `references/search-resource.md`；若同时要求任务搜索和可部署资源搜索，应提示拆成两次调用
- 当需求落在把某个 Meego issue 绑定到 DevFlow task 上时，加载并阅读 `references/add_meego-task.md`
- 当需求落在服务部署、添加服务到 DevFlow 任务上时，加载并阅读 `references/deploy-service.md`
- 当需求落在删除服务部署上时，加载并阅读 `references/delete-service.md`
- 当需求落在关闭 DevFlow task 上时，加载并阅读 `references/close-task.md`
- 当需求落在 TCC 资源上时，先判断具体 action，再加载并阅读匹配的引用文档
- 主文档不再重复展开 task、service、TCC action 的参数和命令细节，避免与引用文档重复维护
- 如果用户意图同时涉及多个 TCC 动作，例如先查后改，可以依次阅读多个引用文档
- 后续如新增新的 DevFlow action 文档，也应继续维护在当前 skill 目录下的 `references/` 中，并同步更新本文件里的触发场景说明
- 完成当前 skill 的任务时，若还需要使用其他 skill，必须优先使用名称带有 `bytedance-devflow-` 前缀的技能。

## 场景分流

以下能力已拆分为独立引用文档，命中对应场景时应先加载并阅读相应文档，再执行命令：

- DevFlow 任务创建 / 服务部署 / 泳道部署 / 添加服务到 DevFlow 任务：`references/deploy-service.md`
- DevFlow 服务重试部署 / 重跑已有部署流水线, 并且用户当前动作不涉及提交或git push：`references/retry-deploy-service.md`
- 在 DevFlow 上开启 debug / 重启 debug：`references/debug-service.md`
- 创建 RDS 工单：`references/create-rds-ticket.md`
- 查看服务相关的 DevFlow 任务信息 / 服务部署信息 / 项目信息 / TCC 部署信息 / 泳道信息 / 服务MR信息 / scm 编译情况：`references/info-service.md`
- 删除 DevFlow 服务部署：`references/delete-service.md`
- 关闭 DevFlow 任务：`references/close-task.md`
- 查看泛化的 DevFlow 任务信息（未指向任何具体资源）：`references/info-task.md`
- 查看空间项目列表：`references/list-project.md`
- 查看我的 Meego/需求 列表 / 按 Meego 链接、Meego ID、Meego 描述查询候选：`references/list-work-item.md`
- 按 `meego_id` / meego 链接查询 DevFlow 关联任务、按任务标题关键词或创建者搜索任务、搜索可部署资源或可添加到 DevFlow 任务的资源、先搜索再继续添加到任务：`references/search-resource.md`
- 将 Meego 绑定到 DevFlow task：`references/add_meego-task.md`
- TCC 查询 / 创建 / 修改 / 删除：加载对应 `references/*-tcc.md`

---
name: bytedance-mango
description: "通过 bytedcli 操作芒果平台任务与接口录入能力。用户提到 Mango、芒果、芒果任务查询、任务创建、接口查询、接口录入、接口修改、接口删除、空间、应用、GraphQL 规则时使用。"
---

# bytedcli 芒果平台

使用 `bytedcli mango` 管理芒果平台任务和任务下的接口。执行芒果业务命令前，先准备 `cn` 站点 SSO browser session；Mango 请求会用该 session 访问 `https://open-admin.bytedance.net/platformApi/main/login` 换取 open-admin cookie，再显式传入空间、模块和任务 ID。

## 命令速查

需要稳定结构化输出时，把全局参数 `--json` 放在 `mango` 前面。

| 分类   | 命令                                       | 用途                                           |
| ------ | ------------------------------------------ | ---------------------------------------------- |
| 登录态 | `--site cn auth login --session --auto`    | 准备 Mango/open-admin 请求需要的 SSO browser session。 |
| 空间   | `mango space list`                         | 查看可用空间 ID，用于后续 `--space-id`。       |
| 应用   | `mango app list --space-id <id>`           | 查看空间下应用，获取 `Module` 和 AGW PSM。     |
| 模块   | `mango module graphql-rule list`           | 查看指定模块默认会注入的 GraphQL 规则。        |
| 任务   | `mango task list/create/trigger-pipeline`  | 查询、创建任务，或触发任务流水线重跑。         |
| 菜单   | `mango task menu list`                     | 查询任务可选菜单；资源由添加接口流程默认选择。 |
| 接口   | `mango task method list/add/update/delete` | 查询、录入、修改或删除任务下的接口。           |

## 推荐流程

1. 先准备登录态和当前用户名。Mango 业务请求会自动用 SSO browser session 获取 open-admin cookie；调试时也可用 `BYTEDCLI_MANGO_COOKIE` 临时覆盖 cookie header。

```bash
bytedcli --site cn auth login --session --auto
bytedcli auth userinfo
```

2. 查询空间，确定后续命令使用的 `--space-id`。

```bash
bytedcli mango space list
```

3. 查询空间下应用，确定后续命令使用的 `--module`。如果录入接口需要回填已有 AGW 路由，也记录应用的 AGW PSM，后续传给 `--agw-psm`。

```bash
bytedcli mango app list --space-id 6
```

4. 查询或创建任务，拿到任务 ID。所有任务接口命令都要显式传任务 ID。

```bash
bytedcli mango task list --space-id 6 --module demo_module --name demo-task --env ppe_demo
bytedcli mango task create --space-id 6 --module demo_module --name demo-task --boe boe_demo --ppe ppe_demo
```

5. 如果接口需要关联菜单，先查询任务下可选菜单。默认文本输出会直接说明是否已绑定菜单；只有提示“当前任务已绑定菜单”且“可以直接添加接口”时，`mango task method add` 才可以不传 `MenuItems` / `MethodResources`，CLI 会默认使用绑定菜单并自动选择默认资源。硬阻塞：如果任务未绑定菜单、未绑定资源、需要选择菜单/资源，或 JSON 中 `task_menu_bound=false`、`can_use_default_menu=false`、`default_method_menu_item=null`、`requires_method_resources=true` 但无法自动选择资源，Agent 必须停下来展示候选项并让用户确认；用户未确认前禁止调用 `mango task method add/update`，也禁止根据接口路径、前端路由、PRD/RFC、service group、PSM 或历史任务推断。AI 开放平台会展示预设 `Scope` 菜单；默认 scope 可直接添加接口，想换菜单时把表格里的 `Scope` 传给 `--menu-scope`。需要机器读取时再加 `--json`，其中 `method_menu_item` 只能在用户明确确认后放入 `--methods` 的 `MenuItems`。

```bash
bytedcli mango task menu list --space-id 6 --module demo_module --task-id 4238
```

6. 操作任务下接口。

```bash
bytedcli mango task method list --space-id 6 --module demo_module --task-id 4238
bytedcli mango task method add --space-id 6 --module demo_module --agw-psm example.agw_demo --task-id 4238 --methods '[{"Name":"demo-method"}]'
```

7. 接口录入、修改或删除后，触发任务流水线重新运行，让刚才的配置生效。

```bash
bytedcli mango task trigger-pipeline --space-id 6 --module demo_module --task-id 4238
```

## 使用规则

- `--space-id` 来自 `mango space list`。
- `mango task list` 必须传 `--space-id` 和 `--module`；`--name`、`--env` 是可选过滤条件，已知泳道时优先加 `--env` 查询。
- `--module` 来自 `mango app list --space-id <id>` 输出中的 `Module`。
- 所有任务 ID 都使用 `--task-id <task-id>`。
- 录入接口时，默认都传 `--agw-psm <psm>`，agw psm 来自 `mango app list --space-id <id>` 输出中的 `AGW PSM`。

## References

| 任务场景                                           | 参考文件                                            |
| -------------------------------------------------- | --------------------------------------------------- |
| 通用执行、JSON 输出、HTTP 调试                     | [invocation.md](../../invocation.md)           |
| 登录态与显式上下文                                 | [auth-state.md](references/auth-state.md)           |
| 模块 GraphQL 默认规则                              | [module.md](references/module.md)                   |
| 任务查询、创建、流水线                             | [task.md](references/task.md)                       |
| 任务接口查询、录入、修改、删除、接口类型和字段说明 | [method.md](references/method.md)                   |
| 常见错误与处理                                     | [troubleshooting.md](../../troubleshooting.md) |

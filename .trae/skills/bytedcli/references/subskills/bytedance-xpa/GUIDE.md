---
name: bytedance-xpa
description: "Operate XPA agent platform via bytedcli: log in (folds bytedcli ByteCloud session into an XPA token), inspect the current user via the gateway, run system status checks, and manage tasks / devices / dataset (list, get, status, running, subtask list/stop, create, start/pause/stop, task device add/remove, export-result, device list/idle/get/tasks/unbind/delete, dataset reset/rerun). Use when tasks mention XPA, xpa task, xpa device, xpa dataset, xpa whoami, xpa system, or migrating from the standalone xpa-cli. All write commands are dry-run by default; add --yes to execute."
---

# bytedcli XPA

## 如何调用 bytedcli

推荐：先全局安装一次，后续所有命令直接调用 `bytedcli`。

```bash
# 推荐方式：先全局安装，后续直接调用 bytedcli
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

```bash
# Fallback：仅在无法全局安装时使用 npx 临时执行
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npx -y @bytedance-dev/bytedcli@latest <command> [options]
```

## When to use

- XPA 任务管理：list / get / status / running / subtask list / subtask stop / create / start / pause / stop / task device add / task device remove / export-result
- XPA 设备管理：list / idle / get / tasks / unbind / delete（mobile / pc 两种 device type）
- XPA 数据集维护：reset / rerun
- 用户与连通性：whoami（网关侧用户视角，含 roles）、system status（网关 + env 路由自检）
- 鉴权：login / status / logout（复用 bytedcli ByteCloud 登录态，自动 exchange + 60s 内提前 refresh，refresh 失败降级重新 exchange）

## Do not use

- 独立 npm 包 `@bytedance-dev/xpa-cli`（`xpa <cmd>`）已并入 bytedcli。新用户优先 `bytedcli xpa ...`，不再单独装 `xpa-cli`。
- 设备 / 任务自身的执行（mobile-use / autopilot 等运行时能力）：不在本 skill 范围。
- xpa-cli 历史的 `xpa update` 自升级命令未移植；bytedcli 的自升级走 `bytedcli self update`。

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 鉴权链路：bytedcli ByteCloud JWT → POST 换 XPA token → 落盘；首次跑 `bytedcli xpa whoami` 等命令时静默 exchange。命令报「请重新登录」时跑 `bytedcli xpa auth login`。
- BOE 联调：网关当前只在特性泳道部署，跑 `--xpa-env boe --xpa-tt-env <feature-lane>`（具体泳道名跟后端确认；基准环境部署后可省 `--xpa-tt-env`）。prod 默认即可。

> 执行前缀见 `../../invocation.md`；下面示例直接写 `bytedcli`。

## Quick start

```bash
# 鉴权
bytedcli xpa auth login
bytedcli xpa auth status
bytedcli xpa whoami
bytedcli xpa system status

# 任务（读）
bytedcli xpa task list --status running --page-size 20
bytedcli xpa task list --task-id 1234567890
bytedcli xpa task get --id 1234567890
bytedcli xpa task status --id 1234567890
bytedcli xpa task running
bytedcli xpa task subtask list --id 1234567890 --status failed
bytedcli xpa task subtask list --id 1234567890 --serial-number SN-DEMO-001

# 任务（写：默认 dry-run，加 --yes 执行）
bytedcli xpa task start --id 1234567890
bytedcli xpa task start --id 1234567890 --yes
bytedcli xpa task pause --id 1234567890 --yes
bytedcli xpa task stop --id 1234567890 --yes

# 子任务终止（owner / super-admin 权限，先看 status 是 running）
bytedcli xpa task subtask stop --id 1234567890 --sub-id 9876543210 --yes

# 创建任务
bytedcli xpa task create \
  --name "demo-task" \
  --workflow-id 1234567890 \
  --device-ids 100001,100002 \
  --lark-file-url "https://example.feishu.cn/sheets/demoSheetToken"
bytedcli xpa task create ... --yes

# 任务设备增减
bytedcli xpa task device add --id 1234567890 --device-ids 100003,100004 --yes
bytedcli xpa task device remove --id 1234567890 --device-ids 100002 --reason "device offline" --yes

# 导出结果（异步，后端接受后才落表）
bytedcli xpa task export-result --id 1234567890 --all --yes
bytedcli xpa task export-result --id 1234567890 --sub-ids 9876543210,9876543211 --yes
bytedcli xpa task export-result --id 1234567890 \
  --execute-start-from 1719158400 --execute-start-to 1719244800 --yes

# 设备
bytedcli xpa device list --type mobile --device-status online --page-size 50
bytedcli xpa device idle --type pc --os-type Windows
bytedcli xpa device get --type mobile --device-id 100001        # 定位符恰好一个
bytedcli xpa device get --type mobile --serial-number SN-DEMO-001
bytedcli xpa device tasks --type pc --instance-name demo-pc-01
bytedcli xpa device unbind --task 1234567890 --yes
bytedcli xpa device delete --type mobile --device-id 100001 --yes  # 破坏性、不可逆

# 数据集
bytedcli xpa dataset reset --task 1234567890 --yes
bytedcli xpa dataset rerun --task 1234567890 --rerun-type failed_task --yes
bytedcli xpa dataset rerun --task 1234567890 --sub-ids 9876543210 --device-ids 100002 --yes
```

## Notes

- 结构化输出加 `--json`（全局选项，放在子命令之前，如 `bytedcli --json xpa task list`）。
- 所有写命令默认 dry-run（不真发请求），加 `--yes` 才执行。**没有 `--dry-run` flag,也没有交互式 y/N 确认**——不带 `--yes` 即为 dry-run（退出 0），加 `--yes` 即真发。CI / 非 TTY 一律按此行为,不会卡在确认提示上。迁移自 `xpa-cli` 旧脚本时,把 `--dry-run` 直接删掉即可。
- env profile：`--xpa-env boe|ppe|prod`（默认 prod）。BOE 暂只在特性泳道有实例，需要再带 `--xpa-tt-env <feature-lane>`。ppe 会自动加 PPE 染色头 `x-use-ppe: 1`。
- **flag 位置(commander 限制)**: `--xpa-env / --xpa-tt-env` 挂在 xpa 父命令上,**只能写在 `bytedcli xpa <这里> <subcmd>` 之间**——写在 `bytedcli` 后 `xpa` 前(`bytedcli --xpa-env boe xpa ...`)或叶子命令后(`bytedcli xpa system status --xpa-env boe`)都会 `error: unknown option --xpa-env`。同样的有 `--xpa-path-prefix / --xpa-base-url / --xpa-use-ppe / --xpa-http-timeout-ms`。位置不便时用环境变量等价: `BYTEDCLI_XPA_ENV / BYTEDCLI_XPA_TT_ENV / BYTEDCLI_XPA_PATH_PREFIX / BYTEDCLI_XPA_BASE_URL / BYTEDCLI_XPA_USE_PPE / BYTEDCLI_XPA_HTTP_TIMEOUT_MS`。
- **与 bytedcli 顶层 `--site` 的关系**: 顶层 `--site cn|boe|i18n|...` 只切 **ByteCloud SSO / OpenAPI 区域**(决定怎么拿 ByteCloud JWT),**不**切 XPA 网关环境。`bytedcli --site boe xpa whoami` 还是打 prod 网关——切 XPA 用 `--xpa-env`。两者独立,语义不同。
- 路径前缀已迁到根（不带 `/api`）：带 `/api` 会被 web BFF 截胡返回 `{code:401,"not login"}`。如果后端将来挪回 `/api`，用 `BYTEDCLI_XPA_PATH_PREFIX=/api` 覆盖,无需改码。
- int64 字段（task_id / sub_task_id / device_id / dataset_id / workflow_id / serial_numbers / sub_task_ids 等）以 string 承载保精度，命令层接受字符串，正整数本地校验。
- 设备定位符校验：mobile 用 `--device-id` 或 `--serial-number` 二选一；pc 还可用 `--instance-name`、`--instance-id`。四选一里恰好一个，多传或全空都直接拒。
- 时间范围（`--execute-start-from/to`、`--execute-end-from/to`、`--collection-from/to`）是**秒级 Unix 时间戳**（与后端一致），CLI 本地严校（拒 NaN/0/负数）。
- delete 设备是破坏性写；subtask-stop / dataset rerun / task stop 也会影响线上数据，都走二次确认。
- 凭据落盘走 bytedcli 凭据存储约定（`bytedcliDataDir` 下的 `AuthFileCache`），不再使用旧的 `~/.xpa/auth.json`；token 明文绝不打印到终端。
- 历史的独立 `xpa <cmd>` 仍可用，但能力等价；新工作流统一用 `bytedcli xpa <cmd>`。

## References

- `references/commands.md` — XPA 各子命令的参数清单、写确认机制、定位符校验细节
- `../../troubleshooting.md` — 鉴权失败 / env-routing / int64 / 泳道相关常见问题处理

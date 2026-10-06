---
name: bytedance-ai-dev-pro
description: "获取 ai-dev-pro.bytedance.net 平台提供的 afs (Agent File System) 知识库查询能力，可获取代码/接口/PSM 知识、调用图等研发流程中的知识，覆盖 生活服务、电商、广告、地理位置中台 业务域。功能仅对 中国交易与广告、地理位置中台 组织架构下的用户开放。"
---

# bytedcli AI Dev Pro AFS

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

## 适用场景

- 查询代码原文类知识：语义检索代码、正则检索代码、读取代码实体、读取文件内容、查询文件内方法列表、查询 MR 变更内容。
- 查询服务和接口知识：PSM 检索、接口检索、接口出入参、接口上游调用方、接口下游调用、IDL、README、AGENTS.md、服务摘要、TCC/Dolphin 配置列表、DB 依赖。
- 查询关系类知识：代码调用图、接口上下游关系、DB 表反向调用方、FE wiki。

## 核心规则

- 所有 AFS 查询都通过 `bytedcli ai-dev-pro afs ...` 执行；具体命令和参数以对应命令的 `--help` 为准。
- 命令、必填参数、option 名称、枚举值和示例都以对应命令的 `--help` 为事实源。
- 不要自行添加 help 中不存在的参数，也不要根据历史协议或记忆拼接参数。
- 不要猜数字枚举值。部分 AFS option 会透传服务端定义的数字枚举，必须读取叶子命令的 `--help`，按 help 中的映射传参。
- 不要在最终回答、日志、示例或生成文件中打印、保存或回显服务账号密钥和已签发的 JWT。

## 鉴权

### 用户鉴权（默认方案）
默认使用当前 bytedcli 登录用户的 ByteCloud 身份访问 AFS。执行 `bytedcli ai-dev-pro afs ...` 时，CLI 会自动获取用户 JWT 并传递给 AFS 服务端。如未登录或登录态过期，可执行 `bytedcli auth login` 登录。

### 服务账号鉴权（可选方案）
AFS 也支持服务账号鉴权，适合 Agent / Workflow / 受管运行环境使用。使用服务账号方式前，需要先联系能力提供方 `zhangsijie.0122@bytedance.com` 沟通服务账号加白。

使用 IAM 平台申请到的服务账号密钥，向 ByteCloud JWT 接口签发临时服务账号 JWT：

```bash
curl -I -X GET 'https://cloud.bytedance.net/auth/api/v1/jwt' \
  -H 'Authorization: Bearer <service-account-secret>'
```

从响应头中读取签发后的 JWT，然后写入当前 shell 的临时环境变量：

```bash
export BYTEDCLI_SERVICE_ACCOUNT_JWT='<service-account-jwt>'
```

CLI执行时会自动从环境变量 `BYTEDCLI_SERVICE_ACCOUNT_JWT` 中读取 JWT 并传递给 AFS 服务端。

### 问题排查
JWT 有过期时间。用户登录态问题优先通过 `bytedcli auth status` / `bytedcli auth login` 处理；服务账号 JWT 过期或服务账号鉴权失败时，需要重新签发 JWT，并更新环境变量 `BYTEDCLI_SERVICE_ACCOUNT_JWT` 后再重试。如仍遇到鉴权错误，去 ../../troubleshooting.md 按步骤排查。

## 命令发现

先用父级 help 选择命令组，再用叶子命令 help 查看准确的参数：

```bash
bytedcli ai-dev-pro afs --help
bytedcli ai-dev-pro afs code --help
bytedcli ai-dev-pro afs interface --help
bytedcli ai-dev-pro afs psm --help
bytedcli ai-dev-pro afs callgraph --help
bytedcli ai-dev-pro afs doc --help
```

生成具体命令前，优先查看叶子命令 help：

```bash
bytedcli ai-dev-pro afs code search --help
bytedcli ai-dev-pro afs interface callee list --help
bytedcli ai-dev-pro afs psm agent-md get --help
bytedcli ai-dev-pro afs doc abstract search --help
bytedcli ai-dev-pro afs code mr get --help
bytedcli ai-dev-pro afs meego get --help
bytedcli ai-dev-pro afs mr list --help
```

## 命令选择

| 需求                                                   | 优先查看                                                                                                                                                                                           |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 根据自然语言检索可能相关的代码                         | `bytedcli ai-dev-pro afs code search --help`                                                                                                                                                       |
| 在单个 PSM 内按正则/模式搜索代码                       | `bytedcli ai-dev-pro afs code glob --help`                                                                                                                                                         |
| 根据代码实体 ID、PSM + 方法名等方式读取代码实体        | `bytedcli ai-dev-pro afs code get --help`                                                                                                                                                          |
| 查询 PSM/repository 包路径下的文件列表                 | `bytedcli ai-dev-pro afs code file list --help`                                                                                                                                                    |
| 读取指定文件或文件行号范围                             | `bytedcli ai-dev-pro afs code file get --help`                                                                                                                                                     |
| 查询文件中包含的方法列表                               | `bytedcli ai-dev-pro afs code file method list --help`                                                                                                                                             |
| 查询发布单关联 MR 的变更后代码                         | `bytedcli ai-dev-pro afs code mr get --help`                                                                                                                                                       |
| 查询 MR 代码变更内容                                   | `bytedcli ai-dev-pro afs code mr diff get --help`                                                                                                                                                  |
| 查询 MR 关联的 Meego                                   | `bytedcli ai-dev-pro afs meego get --help`                                                                                                                                                         |
| 根据方法查询相关发布下的 MR                            | `bytedcli ai-dev-pro afs mr list --help`                                                                                                                                                           |
| 根据自然语言检索可能相关的接口                         | `bytedcli ai-dev-pro afs interface search --help`                                                                                                                                                  |
| 查询 PSM 下接口列表，并可按方法名或 method ID 精确筛选 | `bytedcli ai-dev-pro afs interface list --help`                                                                                                                                                    |
| 查询接口出入参                                         | `bytedcli ai-dev-pro afs interface param get --help`                                                                                                                                               |
| 查询接口下游调用                                       | `bytedcli ai-dev-pro afs interface callee list --help`                                                                                                                                             |
| 查询接口上游调用方                                     | `bytedcli ai-dev-pro afs interface caller list --help`                                                                                                                                             |
| 查询接口使用的 DB 表                                   | `bytedcli ai-dev-pro afs interface db list --help`                                                                                                                                                 |
| 根据 query 发现 PSM                                    | `bytedcli ai-dev-pro afs psm search --help`                                                                                                                                                        |
| 查询 PSM 的 IDL、摘要、README 或 AGENTS.md             | `bytedcli ai-dev-pro afs psm idl get --help`、`bytedcli ai-dev-pro afs psm summary get --help`、`bytedcli ai-dev-pro afs psm readme get --help`、`bytedcli ai-dev-pro afs psm agent-md get --help` |
| 查询 PSM 依赖的 TCC、Dolphin 或 DB                     | `bytedcli ai-dev-pro afs psm tcc list --help`、`bytedcli ai-dev-pro afs psm dolphin list --help`、`bytedcli ai-dev-pro afs psm db list --help`                                                     |
| 查询代码调用图                                         | `bytedcli ai-dev-pro afs callgraph code-entity get --help` 或 `bytedcli ai-dev-pro afs callgraph method get --help`                                                                                |
| 反查 DB 表被哪些服务/接口调用                          | `bytedcli ai-dev-pro afs db caller list --help`                                                                                                                                                    |
| 根据前端仓库和路径查询 FE wiki                         | `bytedcli ai-dev-pro afs fe-wiki get --help`                                                                                                                                                       |
| 根据主题检索文档及关联实体图谱                         | `bytedcli ai-dev-pro afs doc graph search --help`                                                                                                                                                  |
| 按文档摘要快速检索文档                                 | `bytedcli ai-dev-pro afs doc abstract search --help`                                                                                                                                               |
| 按文档标题快速检索文档                                 | `bytedcli ai-dev-pro afs doc title search --help`                                                                                                                                                  |
| 读取文档原文                                           | `bytedcli ai-dev-pro afs doc get --help`                                                                                                                                                           |
| 在指定文档内检索 Chunk                                 | `bytedcli ai-dev-pro afs doc chunk search --help`                                                                                                                                                  |
| 读取指定文档的 Chunk 列表                              | `bytedcli ai-dev-pro afs doc chunk get --help`                                                                                                                                                     |

## 查询策略

- 当用户明确是在寻找某个接口、接口方法或接口入参出参，而不是先寻找服务/PSM 时，加载 [references/scene_interface_discovery.md](references/scene_interface_discovery.md)，按“接口语义检索 → 接口确认 → 接口参数获取”的路径执行。
- 当用户只提供业务功能语义、尚不知道具体 PSM，但希望定位承载服务及其接口时，加载 [references/scene_semantic_psm_interface_discovery.md](references/scene_semantic_psm_interface_discovery.md)，按“PSM 语义检索 → PSM 摘要确认 → PSM 内接口检索”的路径执行；仅当用户需要接口出入参信息，或需要根据出入参进一步筛选接口时，再查询接口参数。
- 面对模糊的产品或实现问题，先用 `psm search`、`interface search`、`code search` 等发现类命令收集候选 PSM、方法名或 method ID。
- 已知 PSM 和方法名时，优先使用 `interface list`、`interface param get`、`code get`、`psm idl get`、`psm readme get` 等精确读取命令。
- 已知 method ID 或代码实体 ID 时，直接使用 ID 查询类命令，不要重复做语义检索。
- 需要查看实现细节时，先定位代码实体或文件，再使用 `code get` 或 `code file get` 读取源码内容。
- 需要分析影响面或依赖关系时，先定位服务、接口或代码实体，再使用 `interface caller list`、`interface callee list`、`interface db list`、`psm db list`、`db caller list` 或 `callgraph ... get`。
- 如果结果为空，先扩大搜索 query、先检索 PSM/接口候选，或查看叶子命令 help 中是否存在其他查询组合；不要直接下结论说数据不存在。
- 需要找文档时，优先用 `doc abstract search`；需要探索主题关联关系时用 `doc graph search`；已知文档标题关键词时用 `doc title search`。文档检索结果中的摘要字段用于快速判断相关性，服务端会做脱敏处理，需要完整内容时，再根据search指令返回的 `Path`，使用 `doc get` 读取原文。长文档需要分段理解时，用 `doc chunk get` 或 `doc chunk search`。

## 输出模式

AFS 服务端结果通常已经是 JSON-like 数据。日常排查和人工阅读可以直接使用默认文本输出。

当结果需要被脚本、Agent workflow 或后续结构化步骤继续解析时，再使用 `--json`：

```bash
bytedcli --json ai-dev-pro afs code search --q "create order" --psm example.service --exclude-psms demo-legacy.service --limit 3
```

不要因为没有使用 `--json` 就认为结果不可解析；是否使用 `--json` 取决于外层流程是否需要 bytedcli 的 JSON envelope。

## 服务端定义的数字枚举

AFS 部分 option 会直接透传服务端定义的数字枚举。这是 `ai-dev-pro afs` 这个薄包装 domain 的例外设计。

使用 `--call-types`、`--entity-types`、`--entry-types`、`--source`、`--type`、`--wiki-type`、`--return-strategy` 等数字枚举参数时，必须读取叶子命令 help，并传入 help 中列出的数字值。不要凭记忆复制枚举映射。

不要把这种数字枚举透传风格扩散到其他 bytedcli domain；大多数 domain 应该暴露语义值，并在内部映射到后端数字编码。

## 示例

```bash
bytedcli ai-dev-pro afs code search --q "create order" --psm example.service --exclude-psms demo-legacy.service --limit 3
bytedcli ai-dev-pro afs code glob --psm example.service --pattern "func" --entity-types 1,2 --entry-types 1,3
bytedcli ai-dev-pro afs code file get --repo example_org/example_repo --file-path base.thrift
bytedcli ai-dev-pro afs code mr get --release-id 723714636966282436 --repo sample-org/sample-repo
bytedcli ai-dev-pro afs interface callee list --psm example.service --method-name CreateOrder --call-types 0,1,2
bytedcli ai-dev-pro afs psm summary get --psm example.service --type 2
bytedcli ai-dev-pro afs psm agent-md get --psm example.service --source 1,2
bytedcli ai-dev-pro afs callgraph code-entity get --psm example.service --method-id 2438590 --up-depth 2 --down-depth 2 --return-strategy 3
bytedcli ai-dev-pro afs meego get --release-id 723714636966282436 --repo sample-org/sample-repo
bytedcli ai-dev-pro afs mr list --method-id 17673069 --limit 20
bytedcli ai-dev-pro afs fe-wiki get --repo example/frontend-repo --name /layout --app-path apps/demo --wiki-type 1
bytedcli ai-dev-pro afs doc abstract search --q "order permission" --filter '[{"Field":"business_domain","InFieldValues":["life"]}]' --limit 5
bytedcli ai-dev-pro afs doc get --path /knowledge/docs/resources/wiki/demo_doc_token
```

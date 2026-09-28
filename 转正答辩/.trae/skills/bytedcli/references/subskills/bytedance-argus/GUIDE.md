---
name: bytedance-argus
description: "Create Argus Hybrid tickets through bytedcli. Use when tasks mention Argus Hybrid, hybrid app ticket generation, Lynx Gecko channel binding, H5 safe URL, H5/Lynx JSB permission application, secure JSB methods, frontend identity, or JSB auth ticket workflows."
---

# Argus Hybrid（bytedcli）

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

- 给 Lynx 应用绑定 Gecko channel。
- 给 Lynx 应用申请 JSB 权限。
- 给 H5 应用新增安全 URL。
- 给 H5 应用申请 JSB 权限。
- 申请 secure JSB 方法。
- 查询我有权限的或我部门的 Argus Hybrid 前端应用。
- 查询 Argus Hybrid H5/Lynx 权限信息。
- 查询 Lynx 资源加签情况。
- 用户说“新增前端身份标识”“新增 JSB 鉴权”“只是生成工单”“Argus Hybrid 工单”。

不要用于：

- 查询 Gecko 资源详情：使用 `bytedance-gecko` / `bytedcli gecko ...`。
- 查询 LynxExample 产物：使用 `bytedance-lynx` / `bytedcli lynx ...`。
- 通用 BPM / Cloud Ticket 审批查询：使用对应工单 skill。

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- 需要先登录：`bytedcli auth login`
- 当前用户身份来自 bytedcli 自身认证信息。不要调用 `/v3/api/hybrid/common/user`，该接口需要页面 cookie，CLI 场景没有稳定 cookie。
- 登录后可先验证身份：

```bash
bytedcli argus hybrid user
```

## Agent Guidance

- 自然语言场景默认直接生成工单，不要先用 `--dry-run` 让用户确认 payload；Argus payload 属于实现细节，用户通常无法判断是否正确。
- 只有用户明确要求“预览 payload”“dry-run”“联调不提交”时才加 `--dry-run`。
- 默认不要加 `--auto-execute`。只有用户明确要求自动执行时才加。
- Argus Hybrid 只支持线上 prod；不要使用 `--argus-site boe`。用户要求非线上环境时直接说明不支持。
- 需要稳定机器可读输出时，把 `--json` 放在 `argus` 前面，例如 `bytedcli --json argus hybrid ...`。
- 如果缺必填槽位，先追问，不要猜测 app、host、reviewer、DID、PRD 或 secure URL。
- `--hosts` 如果已经是 `id:label` 或纯数字 id，会直接使用；如果用户只给 label，bytedcli 会模糊搜索 Argus Hybrid host、host group 和 group 内 host。
- label-only host 搜索只有唯一明确命中时才自动使用。命中的是 host group 时，会展开为组内所有宿主；多命中时，按返回的候选 `input` 让用户二次确认。
- URL 只让用户提供完整 URL；bytedcli 会自动解析成 Argus 需要的 domain 和 path。如果 URL 携带 query，query 会自动去掉。
- 权限信息查询里，H5 `--url` 会去掉 query/hash 后传给平台；Lynx 使用 `--channel` 查询 Gecko channel 关系。
- 加签情况查询里，`--url` 是 CDN 资源 URL，会保留 query；也可以用 `--channel-name` 或 `--channel-id` 查询 Gecko channel。不要提供本地文件路径，bytedcli 不支持本地文件加签查询。
- `--group` 默认不要传；只有用户明确要求 public/private 权限组时才加，避免覆盖服务端建单默认值。
- H5 secure 方法必须提供 `--secure-count`、`--secure-frequency`、`--prd` 和至少一个 `--secure-url`。Lynx secure 方法必须提供 `--secure-count`、`--secure-frequency`、`--prd`，但可以不传 URL。
- 申请 secure 方法时，bytedcli 会根据已解析宿主调用 Argus Hybrid 的 secure 方法候选接口，判断方法是否涉及高敏系统能力、高敏用户数据或系统权限。若涉及，必须让用户补充对应说明后再建单，不要替用户编造。
- 常见 secure 补充信息：为什么调用该能力、为什么获取该数据、是否向服务端传输该数据；如果选择“传输”，还要说明传输原因。系统权限类方法还可能要求说明拒绝授权后的可用性和是否仍申请权限。
- 示例必须使用 `example.*`、`demo-*`、`sample-*` 这类占位值，不要写真实线上 app、host、URL 或人员。

## 意图到命令

| 用户意图                       | 命令                                        |
| ------------------------------ | ------------------------------------------- |
| 查询前端应用                   | `bytedcli argus hybrid app list`            |
| 搜索宿主或宿主组               | `bytedcli argus hybrid host search`         |
| 权限信息查询                   | `bytedcli argus hybrid permission query`    |
| 加签情况查询                   | `bytedcli argus hybrid sign query`          |
| Lynx 应用绑定 Gecko channel    | `bytedcli argus hybrid gecko bind`          |
| Lynx 应用申请 JSB 权限         | `bytedcli argus hybrid jsb apply --platform lynx` |
| H5 应用新增安全 URL            | `bytedcli argus hybrid safe-url add`        |
| H5 应用申请 JSB 权限           | `bytedcli argus hybrid jsb apply --platform h5` |
| 申请 secure JSB 方法           | `bytedcli argus hybrid secure-method apply` |
| 已有完整 params JSON，直接建单 | `bytedcli argus hybrid ticket create`       |

## 必填槽位

| 能力                       | 必填信息                                                                                                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Lynx Gecko channel 绑定    | `app-id`、`gecko-app-id`、`deployment-id`、`channel-id`、`channel-approver`、`reviewers`                                                                                       |
| H5/Lynx JSB 鉴权           | `app-id`、`hosts`、`did`、`reason`、`reviewers`                                                                                                                                |
| H5 安全 URL 新增           | `app-id`、`hosts`、`safe-url`、`did`、`reason`、`reviewers`                                                                                                                    |
| H5 secure 方法申请         | `platform=h5`、`app-id`、`hosts`、`methods`、`secure-count`、`secure-frequency`、`secure-url`、`prd`、`did`、`reason`、`reviewers`，以及方法候选接口判定需要的 secure 合规说明 |
| Lynx secure 方法申请       | `platform=lynx`、`app-id`、`hosts`、`methods`、`secure-count`、`secure-frequency`、`prd`、`did`、`reason`、`reviewers`，以及方法候选接口判定需要的 secure 合规说明             |
| H5 权限信息查询            | `platform=h5`、`hosts`、`url`                                                                                                                                                  |
| Lynx 权限信息查询          | `platform=lynx`、`channel`                                                                                                                                                     |
| URL 加签情况查询           | `url`                                                                                                                                                                          |
| Gecko channel 加签情况查询 | `channel-name` 或 `channel-id`                                                                                                                                                 |
| raw ticket create          | `payload-json` 或 `payload-file`                                                                                                                                               |

`--hosts` 支持 `id:name`、纯 id 或 label-only。label-only 会调用 Argus Hybrid suggest 接口搜索；唯一 host 命中直接写入，唯一 host group 命中会展开组内所有宿主，多命中会返回候选。`--did`、`--reviewers` 这类选择项支持 `id:name` 或普通值，多个值用逗号分隔，例如 `--hosts 100:demo-host`。

H5/Lynx JSB 鉴权不要求提供 methods。`--private-methods` / `--secure-methods` 仅在用户明确要同时申请具体 JSB 方法权限时使用；单独申请 secure 方法优先走 `argus hybrid secure-method apply`。如果用户要求 JSB 工单里同时申请 URL，加 `--safe-url`，该字段会写入 `params.patchSafeUrls`。

## 参数说明

通用提交参数：

| 参数             | 说明                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| `--argus-site`   | Argus Hybrid 站点。当前只支持 `prod`，非线上/BOE 直接报错。                 |
| `--dry-run`      | 只解析身份并输出最终 Argus params，不创建工单。自然语言场景默认不要加。     |
| `--auto-execute` | 设置 `params.autoExecute=true`，让 Argus 在建单后尝试自动执行。默认不要加。 |
| `--timeout-ms`   | Argus API 请求超时时间，单位毫秒。                                          |
| `--json`         | 全局参数，放在 `argus` 前面，输出稳定 JSON。                                |

应用查询字段：

| 参数           | 说明                                                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| `--scope`      | 前端应用范围：`permission` 表示我有权限的，`department` 表示我部门的，`all` 表示全部，`collected` 表示我收藏的。 |
| `--search`     | 应用 ID、应用名或描述关键词。                                                                                    |
| `--page`       | 页码，从 1 开始。                                                                                                |
| `--page-size`  | 每页数量。                                                                                                       |
| `--user`       | 联调覆盖用用户名；自然语言真实查询默认不要传，使用 bytedcli 当前身份。                                           |
| `--user-email` | 联调覆盖用邮箱；自然语言真实查询默认不要传。                                                                     |

权限信息查询字段：

| 参数         | 说明                                                           |
| ------------ | -------------------------------------------------------------- |
| `--platform` | 查询平台，`h5` 或 `lynx`。                                     |
| `--hosts`    | H5 权限查询的宿主选择项；支持 `id:name`、纯 id 或 label-only。 |
| `--url`      | H5 页面 URL；支持重复传入，query/hash 会在请求平台前去掉。     |
| `--channel`  | Lynx Gecko channel 名称；支持重复传入。                        |

加签情况查询字段：

| 参数             | 说明                                                          |
| ---------------- | ------------------------------------------------------------- |
| `--url`          | CDN 资源 URL；query 会保留，平台会下载并检查该 URL 对应资源。 |
| `--channel-name` | Gecko channel 名称，用于查询 channel 最近包的加签情况。       |
| `--channel-id`   | Gecko channel ID，用于查询 channel 最近包的加签情况。         |

`argus hybrid sign query` 只能从 `--url`、`--channel-name`、`--channel-id` 三选一。bytedcli 不支持本地文件加签查询。

发布类工单通用字段：

| 参数              | 说明                                                                                                                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--app-id`        | Argus Hybrid 应用 ID，写入 `params.hybridAppId`。                                                                                                                                          |
| `--hosts`         | 目标宿主，写入 `params.hosts`；支持 `id:name`、纯 id 或 label-only。label-only 会搜索 `/suggest/host`、`/suggest/group/host` 和 `/suggest/hostByGroup`，唯一命中自动使用，多命中返回候选。 |
| `--did`           | DID / on-call owner，写入 `params.did`；多个用逗号分隔。                                                                                                                                   |
| `--reason`        | 申请理由，写入 `params.applyReason`。                                                                                                                                                      |
| `--reviewers`     | 工单 reviewer，写入 `params.ticketReviewers`；多个用逗号分隔。                                                                                                                             |
| `--publish-scope` | 发布范围，`both` 表示线上 + inhouse，`inhouse` 表示只发布 inhouse。                                                                                                                        |

Lynx Gecko channel 绑定字段：

| 参数                        | 说明                                                                              |
| --------------------------- | --------------------------------------------------------------------------------- |
| `--gecko-app-id`            | Gecko app ID，写入 `params.geckoChannelList[].geckoApp.value`。                   |
| `--gecko-app-name`          | Gecko app 展示名；不传时默认使用 `--gecko-app-id`。                               |
| `--deployment-id`           | Gecko deployment ID，写入 `params.geckoChannelList[].deployment.value`。          |
| `--deployment-name`         | Gecko deployment 展示名；不传时默认使用 `--deployment-id`。                       |
| `--channel-id`              | Gecko channel ID，写入 `params.geckoChannelList[].channelList[].channel.value`。  |
| `--channel-name`            | Gecko channel 展示名；不传时默认使用 `--channel-id`。                             |
| `--channel-approver`        | Gecko channel approver，写入 `params.geckoChannelList[].channelList[].approver`。 |
| `--gecko-channel-list-json` | 高级用法：直接传完整 `params.geckoChannelList` JSON array。                       |
| `--gecko-channel-list-file` | 高级用法：从文件读取完整 `params.geckoChannelList` JSON array。                   |

H5 安全 URL 字段：

| 参数         | 说明                                                              |
| ------------ | ----------------------------------------------------------------- |
| `--safe-url` | 要新增的 H5 安全 URL，写入 `params.patchSafeUrls`；支持重复传入。 |

JSB 鉴权与 secure 方法字段：

| 参数                                                 | 说明                                                                                                               |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `--platform`                                         | 目标容器，`h5` 或 `lynx`；`jsb apply` 和 `secure-method apply` 使用。                                             |
| `--group`                                            | 可选 JSB 权限组，写入 `params.group`；默认不传，只有用户明确要求时使用 `private` 或 `public`。                     |
| `--safe-url`                                         | 可选 URL 申请项，写入 `params.patchSafeUrls`；H5/Lynx JSB apply 可重复传入。                                       |
| `--private-methods`                                  | 可选私有 JSB 方法，写入 `params.patchPrivateMethods`；H5/Lynx JSB 鉴权不强制。                                     |
| `--secure-methods`                                   | 可选 secure JSB 方法，写入 `params.patchSecureMethods`；H5/Lynx JSB 鉴权不强制。                                   |
| `--methods`                                          | standalone secure 方法申请必填方法列表，等价写入 `params.patchSecureMethods`。                                     |
| `--secure-methods-json`                              | 高级用法：直接传完整 `params.patchSecureMethods` JSON array。                                                      |
| `--secure-methods-file`                              | 高级用法：从文件读取完整 `params.patchSecureMethods` JSON array。                                                  |
| `--secure-count`                                     | secure 方法调用次数限制，写入 `SecureCount`。                                                                      |
| `--secure-frequency`                                 | secure 方法调用频率限制，写入 `SecureFrequency`。                                                                  |
| `--secure-frequency-reason`                          | 可选调用限制说明，写入 `SecureFrequencyCountReason`。                                                              |
| `--secure-url`                                       | secure 方法允许访问的 URL，转换为 `SecureUrls` pattern；H5 secure 方法必填，Lynx secure 方法可不传；支持重复传入。 |
| `--secure-ability-reason`                            | 当方法涉及高敏系统能力时必填，写入能力项的 `SystemPowerDesc`，说明为什么调用该能力。                               |
| `--secure-user-data-reason`                          | 当方法返回高敏用户数据时必填，写入数据项的 `userDataGetReason`，说明为什么获取该数据。                             |
| `--secure-user-data-send-service`                    | 当方法返回高敏用户数据时必填，取值 `yes` 或 `no`，写入 `userDataSendService`。                                     |
| `--secure-user-data-send-service-reason`             | 当 `--secure-user-data-send-service yes` 时必填，说明为什么向服务端传输数据。                                      |
| `--secure-system-permission-use-without-user`        | 当方法申请系统权限时按 CLI 提示补充，取值 `yes` 或 `no`，表示用户拒绝授权后功能是否不可用。                        |
| `--secure-system-permission-use-without-user-reason` | 当 `--secure-system-permission-use-without-user yes` 时必填，说明拒绝授权后不可用的原因。                          |
| `--secure-system-permission-get-without-user`        | 当方法申请系统权限时按 CLI 提示补充，取值 `yes` 或 `no`，表示拒绝授权后前端是否仍申请权限。                        |
| `--secure-system-permission-get-without-user-reason` | 当 `--secure-system-permission-get-without-user yes` 时必填，说明仍申请权限的原因。                                |
| `--prd`                                              | PRD 文档 URL 或 token，写入 `params.prd`；存在 secure 方法时必填。                                                 |
| `--did-auth`                                         | 用户确认已完成飞书文档授权时使用，写入 `params.didAuth=true`。                                                     |
| `--skip-doc-auth`                                    | 用户明确接受跳过文档授权时使用，写入 `params.didAuth=false`。                                                      |

Raw 工单字段：

| 参数             | 说明                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------- |
| `--payload-json` | 完整 Argus params JSON object；bytedcli 仍会补 `user`、`autoExecute`、`initByByteCli`。 |
| `--payload-file` | 从文件读取完整 Argus params JSON object；bytedcli 仍会补提交元数据。                    |

## Quick start

```bash
# 查看当前 bytedcli 身份
bytedcli argus hybrid user

# 搜索宿主和宿主组，确认 label-only 输入会命中哪个候选
bytedcli --json argus hybrid host search \
  --keyword sample-host \
  --platform h5

# 查询我有权限的前端应用
bytedcli --json argus hybrid app list \
  --scope permission \
  --search sample-app

# 查询 H5 权限信息；页面 URL 的 query 会自动去掉
bytedcli --json argus hybrid permission query \
  --platform h5 \
  --hosts sample-host \
  --url https://example.com/path?debug=true

# 查询 Lynx channel 权限信息
bytedcli --json argus hybrid permission query \
  --platform lynx \
  --channel sample-channel

# 查询 CDN URL 加签情况；URL query 会保留
bytedcli --json argus hybrid sign query \
  --url https://example.com/app.lynx.bundle?token=sample

# 查询 Gecko channel 加签情况
bytedcli --json argus hybrid sign query \
  --channel-name sample-channel

# H5 应用新增安全 URL
bytedcli --json argus hybrid safe-url add \
  --app-id 1000 \
  --hosts sample-host \
  --safe-url https://example.com/path \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer

# Lynx 应用绑定 Gecko channel
bytedcli --json argus hybrid gecko bind \
  --app-id 1000 \
  --gecko-app-id 2000 \
  --gecko-app-name demo-gecko-app \
  --deployment-id 3000 \
  --deployment-name demo-deployment \
  --channel-id 4000 \
  --channel-name demo-channel \
  --channel-approver demo-approver \
  --reviewers demo-reviewer

# H5 应用申请 JSB 权限
bytedcli --json argus hybrid jsb apply \
  --platform h5 \
  --app-id 1000 \
  --hosts 10:demo-host \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer

# H5 应用申请 JSB 权限，并在同一张工单里申请 URL
bytedcli --json argus hybrid jsb apply \
  --platform h5 \
  --app-id 1000 \
  --hosts 10:demo-host \
  --safe-url https://example.com/path?ignored=query \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer

# Lynx 应用申请 JSB 权限
bytedcli --json argus hybrid jsb apply \
  --platform lynx \
  --app-id 1000 \
  --hosts 10:demo-host \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer

# secure 方法申请；只有用户确认文档授权完成后才加 --did-auth
bytedcli --json argus hybrid secure-method apply \
  --platform h5 \
  --app-id 1000 \
  --hosts 10:demo-host \
  --methods demo.secureMethod \
  --secure-url https://example.com/path \
  --secure-count 10 \
  --secure-frequency 60 \
  --secure-ability-reason "demo reason" \
  --secure-user-data-reason "demo reason" \
  --secure-user-data-send-service no \
  --prd sample-doc-token \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer \
  --did-auth
```

## Secure 方法与文档授权

- 申请 secure 方法时通常需要 PRD 文档授权。
- 如果用户明确表示“我已经完成文档授权”，加 `--did-auth`。
- 如果用户明确接受跳过文档授权，加 `--skip-doc-auth`。
- 如果没有确认授权，真实提交可能返回授权 URL；把 URL 返回给用户，让用户授权后重试。
- 不要替用户假定 `--did-auth`。
- bytedcli 会在建单前查询 secure 方法定义，并校验 `permissionArr` 内对应说明。缺字段时会报错列出 `missing`，按缺失项追问用户后重试。
- 如果用户要对多个方法或多个能力填写不同说明，使用 `--secure-methods-json` 传完整 `params.patchSecureMethods`；不要用同一条全局说明硬套不同业务含义。

## 真实提交

默认只是生成工单，不自动执行：

```bash
bytedcli argus hybrid safe-url add \
  --app-id 1000 \
  --hosts 10:demo-host \
  --safe-url https://example.com/path \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer
```

只有用户明确要求自动执行时才加：

```bash
bytedcli argus hybrid safe-url add \
  --app-id 1000 \
  --hosts 10:demo-host \
  --safe-url https://example.com/path \
  --did demo-owner \
  --reason "demo reason" \
  --reviewers demo-reviewer \
  --auto-execute
```

## References

- `../../invocation.md`
- `../../troubleshooting.md`

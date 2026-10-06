# Feishu 能力与工作流

这个 skill 面向协作工作流，不只是“会调某个命令”。下面是推荐的能力映射。

## 1. 文档协作

适用场景：

- 读取需求文档、会议纪要、周报
- 生成新文档
- 在现有文档中追加或替换章节

推荐流程：

1. `feishu docs fetch-doc` 读取文档正文
2. 分析用户意图，提取需要执行的动作
3. 需要新建时用 `feishu docs create-doc`
4. 需要局部修改时优先 `feishu docs update-doc`
5. 需要协作反馈时用 `feishu drive doc-comments create`

群聊协作文档权限：

- 如果 Bot 在群聊上下文里创建文档，且文档是给这个群协作/阅读的，创建成功后应主动给当前群开阅读权限，再把链接发回群里。
- 新版飞书文档通常用 `--file-type docx`；群聊协作者用 `--member-type openchat --collaborator-type chat`，`--member-id` 填当前群 `chat_id`（`oc_xxx`）。
- 推荐优先给群聊授权，而不是逐个给群成员授权；只有用户明确要求按人授权时，再解析成员 `open_id` 后逐人添加。

```bash
bytedcli feishu docs permission-member create \
  --file-token docxcnxxxxxxxx \
  --file-type docx \
  --member-id oc_xxx \
  --member-type openchat \
  --collaborator-type chat \
  --perm view
```

## 2. 约会议

适用场景：

- “帮我约一个会”
- “查一下我和某人的空闲时间”
- “把某某加入会议”

推荐流程：

1. `feishu user search` 解析参与人的 `open_id`
2. `feishu calendar calendar list` 选择主日历
3. 如需先查忙闲，使用 `feishu calendar freebusy ...`
4. `feishu calendar event create` 创建会议
5. `feishu calendar attendee create` 添加参会人
6. 回传明确的绝对时间，而不是只写“今天下午”

## 3. 创建待办

适用场景：

- “给我建个待办”
- “和某某一起跟进这个事项”
- “给任务补评论/子任务”

推荐流程：

1. `feishu user search` 解析人员
2. `feishu task task create` 创建主任务
3. 需要拆分工作时用 `feishu task subtask create`
4. 需要补充说明时用 `feishu task comment create`

## 4. 搜索与导航

适用场景：

- 找某个文档、Wiki、群聊或用户

推荐命令：

- 用户：`feishu user search`
- 文档 / Wiki：`feishu search doc-wiki`
- 群聊：`feishu chat search`
- Wiki 空间 / 节点：`feishu wiki space ...`、`feishu wiki node ...`

## 5. 消息与聊天

适用场景：

- 给人发消息
- 回复消息
- 查群、建群、管理群成员、查消息历史、拉取消息资源
- 发送飞书卡片或回复卡片

推荐流程：

1. 先通过 `user search` 或 `chat search` 拿到目标 ID
2. 确认应用本身已开通对应应用权限；`im message send/reply`、`im image upload`、`im file upload`、`chat create`、`chat add-members` 都使用应用身份和 `tenant_access_token`，不是用户 OAuth token
3. `feishu im message send` 或 `feishu im message reply` 发送/回复消息
4. 需要定位上下文时再用 `messages` / `resource`
5. 需要建群时用 `feishu chat create`
6. 需要加用户进群时用 `feishu chat add-members`
7. 需要加机器人进群时使用应用 `app_id`，并显式传 `--member-id-type app_id`

命令参考（注意 `message` 单数用于写操作，`messages` 复数用于读操作）：

- 发送消息：`feishu im message send --receive-id-type chat_id --receive-id <id> --text "内容"`
- 回复消息：`feishu im message reply --message-id <id> --text "内容"`
- 读取群聊消息历史：`feishu im messages get --chat-id <chat_id>`
- 搜索消息：`feishu im messages search --query <text>`
- 获取话题回复：`feishu im messages thread --thread-id <thread_id>`
- 下载消息附件：`feishu im resource --message-id <id> --file-key <key>`

## 6. 飞书卡片 / CardKit

适用场景：

- 从本地 `card_json` 发送飞书卡片
- 引用飞书卡片模板发送消息
- 创建或更新 CardKit 运行时卡片实体，再用 `card_id` 发送
- 管理 CardKit 搭建工具里的模板资产 lifecycle

推荐流程：

1. 本地 JSON 先用 `feishu card validate --card-file ./card.json` 做结构摘要
2. 直接发送 JSON 卡片时用 `feishu card send --receive-id-type chat_id --receive-id oc_xxx --card-file ./card.json`
3. 引用模板时用 `--template-id`，可选 `--template-version-name` 和 `--template-variable-json`
4. 需要运行时实体时，先 `feishu card entity create` 拿 `card_id`，再 `feishu card send --card-id`
5. 更新运行时实体时，用 `feishu card entity update --card-id --sequence --card-file`
6. 需要创建、编辑、发布模板资产时，用 `feishu cardkit template ...`；这是临时 Web-backed 能力，使用飞书卡片搭建工具 Web 接口

命令参考：

- 校验/摘要：`feishu card validate --card-file ./card.json`
- 发送 JSON 卡片：`feishu card send --receive-id-type chat_id --receive-id oc_xxx --card-file ./card.json`
- 回复 JSON 卡片：`feishu card reply --message-id om_xxx --card-file ./card.json`
- 发送模板卡片：`feishu card send --receive-id-type chat_id --receive-id oc_xxx --template-id AAqxxx --template-variable-json '{"name":"demo"}'`
- 创建运行时实体：`feishu card entity create --card-file ./card.json`
- 发送运行时实体：`feishu card send --receive-id-type chat_id --receive-id oc_xxx --card-id demo-card-id`
- 更新运行时实体：`feishu card entity update --card-id demo-card-id --sequence 2 --card-file ./card.json`
- 列模板资产：`feishu cardkit template list --status all --page-size 20`
- 读模板详情：`feishu cardkit template get --template-id AAqxxx`
- 创建模板草稿：`feishu cardkit template create --name "Demo" --card-file ./card.json`
- 更新模板草稿：`feishu cardkit template update --template-id AAqxxx --name "Demo v2" --card-file ./card.json`
- 发布模板：`feishu cardkit template publish --template-id AAqxxx --version-name 1.0.0 --yes`
- 回滚到已发布版本草稿：`feishu cardkit template rollback --template-id AAqxxx --version-id <release_id> --yes`
- 列发布版本：`feishu cardkit template version list --template-id AAqxxx`
- 导出 `.card`：`feishu cardkit template export --template-id AAqxxx --output ./demo.card`
- 导入 `.card`：`feishu cardkit template import --file ./demo.card --name "Imported Demo"`
- 删除未发布模板：`feishu cardkit template delete --template-id AAqxxx --yes --confirm-template-id AAqxxx`

边界：

- CardKit 运行时实体 create/update 走官方 `/open-apis/cardkit/v1/cards`，要求 JSON 2.0（顶层 `"schema": "2.0"`）
- `cardkit template` 使用用户飞书网页登录态和搭建工具 Web API，不使用 bot `tenant_access_token`
- 这层是因为官方 CardKit OpenAPI 和 lark-cli 当前没有模板资产 CRUD/publish API；等官方能力补齐后可以删除 Web-backed 兼容层
- `cardkit template` 的 `--template-id` 是搭建工具模板资产 `card_id`，不要和运行时实体 `card_id` 混用
- 普通写操作 `create/update/import` 支持 `--dry-run`；强副作用 `publish/rollback` 需要 `--yes`；`delete` 需要 `--yes --confirm-template-id <id>`
- 当前不提供权限管理命令；权限以网页可见能力和接口为准
- Web 接口发现记录、`.card` 格式和 live test 清单见 `feishu-cardkit-web.md`

### CardKit 模板资产 lifecycle

使用前先确保有飞书 Web session：

```bash
bytedcli auth login --session --feishu
bytedcli --json feishu cardkit template list --page-size 5
```

命令分组：

| 命令           | 作用                             | 副作用门槛                                   |
| -------------- | -------------------------------- | -------------------------------------------- |
| `list`         | 分页列模板资产                   | 只读                                         |
| `get`          | 读取模板详情、草稿 DSL、变量配置 | 只读                                         |
| `create`       | 新建模板草稿                     | 普通写；支持 `--dry-run`                     |
| `update`       | 更新名称和/或草稿内容            | 普通写；支持 `--dry-run`                     |
| `publish`      | 发布当前草稿版本                 | 强副作用；需要 `--yes`                       |
| `rollback`     | 把某个已发布版本恢复到草稿       | 强副作用；需要 `--yes`                       |
| `version list` | 列出已发布版本                   | 只读                                         |
| `export`       | 导出本地 `.card` 文件            | 本地写文件                                   |
| `import`       | 从 `.card` 新建模板              | 普通写；支持 `--dry-run`                     |
| `delete`       | 删除未发布模板                   | 强副作用；需要 `--yes --confirm-template-id` |

`.card` 文件格式：

```json
{
  "name": "Demo template",
  "dsl": {
    "schema": "2.0",
    "config": {
      "update_multi": true
    },
    "body": {
      "direction": "vertical",
      "elements": [
        {
          "tag": "markdown",
          "content": "hello"
        }
      ]
    }
  },
  "variables": [],
  "variable_constraint": [],
  "schema_version": 2
}
```

写作约定：

- `dsl` 是 Card JSON 2.0 主体，也可用 `card` 字段；裸 card JSON 文件也可直接作为 `--card-file`
- CLI 会在创建/更新模板时补齐 JSON 2.0 可发布草稿的最低字段：`config.update_multi=true`、`body.direction="vertical"`、`body.elements=[]`
- `variables` 是模板变量配置，会进入 Web API 的 `dsl_entity.variable`
- `variable_constraint` 是变量约束，会进入 `dsl_entity.variable_constraint`；无约束时用 `[]`
- `publish --version-name` 跟随搭建工具 UI 校验，格式为 `major.minor.patch`，例如 `1.0.0`
- 导出的 `.card` 用于 CLI import/export，不代表官方文件格式契约
- 真实更新后用 `get` 回读 `draft_version_id`、`card_json` 和 `variables`；发布后用 `version list` 回读版本

### Card JSON 2.0 写作 guide

先按目标选择来源形态：

- 直接维护本地 JSON：写 `card_json` 文件，使用 `feishu card validate --card-file` 校验，再 `send/reply/entity create`
- 消费已发布模板：不把变量写进 `card_json`，发送时用 `--template-id`、`--template-version-name`、`--template-variable-json`
- 复用运行时实体：先 `entity create` 得到 `card_id`，之后用 `send --card-id` 或 `entity update`

最小 JSON 2.0 骨架：

```json
{
  "schema": "2.0",
  "config": {
    "update_multi": true,
    "summary": {
      "content": "Quota update"
    }
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "Quota update"
    },
    "subtitle": {
      "tag": "plain_text",
      "content": ""
    },
    "template": "blue"
  },
  "body": {
    "direction": "vertical",
    "elements": [
      {
        "tag": "markdown",
        "content": "**Service**: byte_quota\n\nStatus: ready"
      }
    ]
  }
}
```

顶层结构：

- `schema`: JSON 2.0 写 `"2.0"`；CardKit 运行时实体 create/update 必须是 2.0
- `config`: 全局行为，如 `summary`、`enable_forward`、`update_multi`、`width_mode`、`locales`、`style`
- `card_link`: 整卡跳转链接，常用 `url`、`android_url`、`ios_url`、`pc_url`
- `header`: 标题区，常用 `title`、`subtitle`、`template`、`icon`、`text_tag_list`
- `body.elements`: 正文组件数组；组件通过 `tag` 区分

控件分类：

- 容器类：`column_set`、`form`、`interactive_container`、`collapsible_panel`，以及搭建工具中的循环容器
- 展示类：`div`、`markdown`、`img`、`img_combination`、`person`、`person_list`、`chart`、`table`、`hr`
- 交互类：`input`、`button`、`overflow`、`select_static`、`multi_select_static`、`select_person`、`multi_select_person`、`date_picker`、`picker_time`、`picker_datetime`、`select_img`、`checker`

控件速查：

| 类别   | 控件 / `tag`            | 用途                                | 常用配置                                                                             |
| ------ | ----------------------- | ----------------------------------- | ------------------------------------------------------------------------------------ |
| 标题区 | `header`                | 卡片标题、副标题、状态色、标题标签  | `title`、`subtitle`、`template`、`icon`、`text_tag_list`                             |
| 容器   | `column_set`            | 分栏排版                            | `columns`、`flex_mode`、`horizontal_spacing`、`horizontal_align`、`background_style` |
| 容器   | `form`                  | 提交表单                            | `name`、`elements`、`direction`；内部输入/选择控件配置唯一 `name`                    |
| 容器   | `interactive_container` | 整块可点击或可回调区域              | `elements`、`behaviors`、`padding`、`background_style`                               |
| 容器   | `collapsible_panel`     | 可折叠内容区                        | `header`、`elements`、`expanded`                                                     |
| 容器   | 循环容器                | 在 CardKit 模板中按数组变量重复渲染 | 通常在搭建工具配置变量和循环项；不要当作裸 `card_json` 通用字段硬写                  |
| 展示   | `div`                   | 普通文本                            | `text`、`text_size`、`text_color`、`text_align`、`lines`、`icon`                     |
| 展示   | `markdown`              | 富文本 / Markdown 内容              | `content`、`text_size`、`text_align`、`icon`                                         |
| 展示   | `img`                   | 单图                                | `img_key`、`alt`、`title`、`size`、`scale_type`、`preview`                           |
| 展示   | `img_combination`       | 多图组合                            | `img_key` 列表、`alt`、布局相关字段                                                  |
| 展示   | `person`                | 单个人员展示                        | `user_id` 或 `open_id`、`size`、`show_avatar`                                        |
| 展示   | `person_list`           | 多人员展示                          | `persons`、`size`、`show_avatar`、数量展示配置                                       |
| 展示   | `chart`                 | 图表                                | 图表数据和样式配置；复杂图表优先用搭建工具生成 JSON                                  |
| 展示   | `table`                 | 表格                                | `columns`、`rows`、`page_size`、`row_height`、`header_style`                         |
| 展示   | `hr`                    | 分割线                              | 通常只需 `tag`，按需加 `margin`                                                      |
| 交互   | `input`                 | 文本输入                            | `name`、`placeholder`、`default_value`、`required`、`input_type`、`max_length`       |
| 交互   | `button`                | 按钮                                | `text`、`type`、`size`、`width`、`behaviors`、`confirm`、`disabled`                  |
| 交互   | `overflow`              | 折叠按钮组 / 更多菜单               | `options`、`behaviors`、`confirm`                                                    |
| 交互   | `select_static`         | 静态单选下拉                        | `name`、`placeholder`、`options`、`initial_option`、`required`                       |
| 交互   | `multi_select_static`   | 静态多选下拉                        | `name`、`placeholder`、`options`、`initial_options`、`required`                      |
| 交互   | `select_person`         | 人员单选                            | `name`、`placeholder`、`initial_option`、`required`                                  |
| 交互   | `multi_select_person`   | 人员多选                            | `name`、`placeholder`、`initial_options`、`required`                                 |
| 交互   | `date_picker`           | 日期选择                            | `name`、`placeholder`、`initial_date`、`required`                                    |
| 交互   | `picker_time`           | 时间选择                            | `name`、`placeholder`、`initial_time`、`required`                                    |
| 交互   | `picker_datetime`       | 日期时间选择                        | `name`、`placeholder`、`initial_datetime`、`required`                                |
| 交互   | `select_img`            | 图片选择                            | `name`、`options`、`required`                                                        |
| 交互   | `checker`               | 勾选 / 切换类输入                   | `name`、`checked`、`default_value`、`required`                                       |

常用属性模式：

- 通用：组件至少有 `tag`；需要交互回调、局部更新或稳定定位时加 `element_id`
- 文本：`plain_text`/`lark_md` 文本对象常用 `tag`、`content`；`markdown` 组件直接用 `content`
- 多语言：优先用局部多语言字段，如 `i18n_content`、`i18n_img_key`、`i18n_default_value`
- 链接/回调：交互组件用 `behaviors`，常见类型是 `open_url` 和 `callback`
- 表单：`form` 放在根 `body.elements`；表单内输入/选择类组件用唯一 `name`，按需设置 `required`、`placeholder`、`default_value`
- 按钮：常用 `text`、`type`、`size`、`width`、`icon`、`disabled`、`confirm`、`behaviors`
- 下拉：`select_static`/`multi_select_static` 常用 `placeholder`、`options[].text`、`options[].value`、`initial_option`；同一选择器内 `value` 不重复
- 图片：`img` 需要 `img_key` 和 `alt`；先用 `feishu im image upload --file-path` 获取 `image_key`
- 表格：`table` 以 `columns` 和 `rows` 表达结构；复杂表格先做小样例再扩展

带按钮的最小示例：

```json
{
  "schema": "2.0",
  "config": {
    "update_multi": true
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "Quota approval"
    },
    "subtitle": {
      "tag": "plain_text",
      "content": ""
    },
    "template": "wathet"
  },
  "body": {
    "direction": "vertical",
    "elements": [
      {
        "tag": "markdown",
        "content": "**App**: byte_quota\n\nPlease review the quota change."
      },
      {
        "tag": "button",
        "text": {
          "tag": "plain_text",
          "content": "Open"
        },
        "type": "primary",
        "behaviors": [
          {
            "type": "open_url",
            "default_url": "https://example.com"
          }
        ]
      }
    ]
  }
}
```

校验边界和常见坑：

- `feishu card validate` 是本地结构摘要和基础校验，不等价于官方渲染器或搭建工具预览
- 组件全集和枚举会随官方更新；CLI 不长期硬编码全量 schema，未知组件应优先透传
- `element_id` 应在同一卡片内唯一；交互组件的 `name` 在表单里也应唯一
- `form` 不要嵌套 `form`；复杂表单优先拆小样例做 live test
- CardKit 模板变量属于模板发送参数，不是裸 `card_json` 顶层字段
- 线上发送模板时建议固定 `template_version_name`，避免新发布版本立即影响已有自动化
- 涉及真实发送前，先用测试群和 `--json feishu card validate` 检查摘要，再执行 `send`

## 7. 表格与多维表格

适用场景：

- 更新电子表格
- 导出表格
- 写 Bitable 记录

推荐命令：

- 电子表格：`feishu sheet read/write/append/prepend/find/create/export`
- 多维表格：`feishu bitable app/table/record/field/view`

实践建议：

- 简单二维数据用 `--values-json`（inline）
- 公式单元格要写成对象 `{"type":"formula","text":"=A1"}`；如果只传字符串 `=A1`，它会被当成普通文本写入
- 大批量（几百行以上）用 `--values-file <path>`，文件内容同 `--values-json`（`append`/`write`/`create` 都支持）
- 复杂多维表格结构用 `--body-json`
- 用户给的是 `sheets/...?...table=...&view=...` 时，优先直接用 `feishu bitable record list --url "<sheet链接>"`，CLI 会自动解析真实 `app_token/table_id` 并复用当前视图
- 修改前先读取当前结构，避免误写字段

## 8. IM 富媒体上传

发送图片/文件/视频前需先上传获取 key：

- 图片：`im image upload` → `image_key` → `im message send --msg-type image`
- 文件：`im file upload` → `file_key` → `im message send --msg-type file`
- 视频：`im file upload` + 可选 `im image upload`（封面）→ `im message send --msg-type media`

## 9. 原生语音气泡（IM Audio）

适用场景：

- 给个人或群聊发送原生飞书语音气泡
- 回复某条消息时用语音气泡补充说明
- 本地只有 `.mp3` / `.wav` / `.m4a` 等音频文件，需要自动转码后发送

推荐流程：

1. 先确认应用已完成 `feishu login`，并且 bot config 可用
2. 优先直接使用 `feishu im audio send` / `feishu im audio reply`
3. 输入如果不是 `.opus`，CLI 会尝试先转码成 Opus 再上传发送
4. 若运行环境没有 `ffmpeg`，先安装 `ffmpeg`，或直接传预先转好的 `.opus` 文件

命令示例：

- 发给个人：

  ```bash
  bytedcli feishu im audio send \
    --receive-id-type open_id \
    --receive-id ou_xxx \
    --file-path ./intro.mp3
  ```

- 发到群里：

  ```bash
  bytedcli feishu im audio send \
    --receive-id-type chat_id \
    --receive-id oc_xxx \
    --file-path ./status.wav
  ```

- 回复某条消息：

  ```bash
  bytedcli feishu im audio reply \
    --message-id om_xxx \
    --file-path ./followup.m4a
  ```

- 指定上传文件名与 UUID：

  ```bash
  bytedcli feishu im audio send \
    --receive-id-type chat_id \
    --receive-id oc_xxx \
    --file-path ./brief.mp3 \
    --file-name friday-brief.opus \
    --uuid friday-audio-20260423-01
  ```

- 手动先转码再发送：

  ```bash
  ffmpeg -y -i ./memo.mp3 -acodec libopus -ac 1 -ar 16000 ./memo.opus

  bytedcli feishu im audio send \
    --receive-id-type open_id \
    --receive-id ou_xxx \
    --file-path ./memo.opus
  ```

补充说明：

- `.opus` 默认直传；`.ogg`、`.mp3`、`.wav`、`.m4a`、`.aac`、`.flac`、`.wma` 会先转码
- 如果环境里没有 `ffmpeg`，transcode 路径会失败；报错 hint 会明确提示安装 `ffmpeg` 或改传 `.opus`
- 目标结果应是 **原生语音气泡**，而不是普通文件附件

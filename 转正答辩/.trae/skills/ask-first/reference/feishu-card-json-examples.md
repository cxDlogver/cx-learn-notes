# Ask First 飞书卡片 JSON 示例

这个文件只提供 `ask-first-card.json` 的结构和文案参考。示例要站在用户视角写：用户先知道为什么收到卡片，再知道每个问题属于哪类、现在要决定什么、推荐怎么选、不决定会影响什么。

下面的链接都是占位示例。生成真实卡片时，要替换成当前 PRD、Figma、评论、接口资料或补充文档链接。若确实没有可点击入口，可见文案必须写 `无可点击入口：<原因 + 摘录>`。

## 完整表单卡片

```json
{
  "schema": "2.0",
  "config": {
    "update_multi": true
  },
  "header": {
    "title": {
      "tag": "plain_text",
      "content": "达人舆情优化：4 个决定需要你确认"
    },
    "subtitle": {
      "tag": "plain_text",
      "content": "只问会改变范围、设计依据或验收边界的问题"
    },
    "template": "blue"
  },
  "body": {
    "direction": "vertical",
    "elements": [
      {
        "tag": "markdown",
        "content": "**背景**\n- 这张卡是为了把“达人舆情优化”进入技术计划前的 4 个不确定点先确认清楚。\n- 你不需要判断怎么实现，只需要确认业务范围、设计依据和外部系统边界。\n\n**当前问题**\n- PRD、设计稿、补充资料和接口资料之间有几处对不上。\n- 如果现在直接继续，后续计划可能把本轮要做的页面、字段或验收标准写错。\n\n**主要入口**\n- PRD：[达人舆情优化需求](https://feishu.example.com/docx/daren-public-opinion-prd)\n- 设计稿：[达人舆情优化设计稿](https://feishu.example.com/file/figma-daren-public-opinion)\n- 接口资料：[舆情处理接口说明](https://feishu.example.com/docx/public-opinion-interface)\n\n**如何回答**：每题按你的真实预期选一个选项。看到“推荐”也可以改选；需要补充说明时选 D。"
      },
      {
        "tag": "form",
        "name": "ask_first_form_ask_first_20260703_daren_public_opinion_001",
        "direction": "vertical",
        "vertical_spacing": "12px",
        "elements": [
          {
            "tag": "markdown",
            "content": "### 问题 1：线索图片要不要进入本轮？\n\n**类型**：范围确认\n\n**背景**\n- 位置是舆情详情页的“线索材料”区域。\n- PRD 提到线索材料可能包含图片，但设计稿和接口资料没有把图片怎么展示说完整。\n\n**我看到了什么**\n- PRD 写了“查看舆情相关线索材料”。\n- 设计稿只展示了文字说明、处理人和处理时间。\n- 接口资料只确认了文字说明字段，没有确认图片地址字段。\n\n**需要你决定**：本轮是否必须做图片展示和预览，还是先只做文字线索。\n\n**我建议**：选 B。现在文字线索依据最完整，图片展示缺字段和交互规则，先做文字线索更稳。\n\n**不确认的代价**：如果默认做图片，可能会补错预览方式；如果默认不做，又可能漏掉你期望的验收范围。\n\n**你可以怎么选**\nA 做图片展示和预览；B 先只做文字线索；C 只保留图片入口；D 你补充最终规则。"
          },
          {
            "tag": "collapsible_panel",
            "expanded": false,
            "header": {
              "title": {
                "tag": "plain_text",
                "content": "为什么推荐 B：图片依据还不完整"
              }
            },
            "border": {
              "color": "grey",
              "corner_radius": "5px"
            },
            "padding": "8px 8px 8px 8px",
            "elements": [
              {
                "tag": "markdown",
                "content": "**依据摘录**\n- PRD：[线索材料说明](https://feishu.example.com/docx/daren-public-opinion-prd#clue-material) 写到“查看舆情相关线索材料”，但没有给图片交互细节。\n- 设计稿：[详情页线索材料区域](https://feishu.example.com/file/figma-daren-public-opinion#detail-record) 只展示文字说明、处理人和处理时间。\n- 接口资料：[线索字段](https://feishu.example.com/docx/public-opinion-interface#clue-fields) 只列出说明文本和处理时间。\n\n**还缺什么**\n- 图片地址字段、缩略图尺寸、点击预览方式、加载失败状态。"
              }
            ]
          },
          {
            "tag": "select_static",
            "name": "af_001_choice",
            "required": true,
            "width": "fill",
            "placeholder": {
              "tag": "plain_text",
              "content": "请选择处理方式"
            },
            "options": [
              {
                "text": {
                  "tag": "plain_text",
                  "content": "A. 本轮做图片展示和预览"
                },
                "value": "A"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "B. 本轮只做文字线索（推荐）"
                },
                "value": "B"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "C. 只保留图片入口，不展示内容"
                },
                "value": "C"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "D. 我补充图片规则"
                },
                "value": "D"
              }
            ]
          },
          {
            "tag": "input",
            "name": "af_001_custom_input",
            "width": "fill",
            "input_type": "multiline_text",
            "rows": 2,
            "max_length": 1000,
            "placeholder": {
              "tag": "plain_text",
              "content": "选择 D 时，请写清楚图片字段、展示位置、预览方式或设计链接"
            }
          },
          {
            "tag": "hr"
          },
          {
            "tag": "markdown",
            "content": "### 问题 2：批量合并要不要等弹窗设计补齐？\n\n**类型**：设计证据\n\n**背景**\n- 位置是舆情列表页勾选多条舆情后的“批量合并”操作。\n- PRD 说明了合并动作，但当前设计稿没有确认弹窗、二次提醒和成功提示。\n\n**我看到了什么**\n- PRD 写到重复舆情可以合并处理。\n- 设计稿能看到批量操作按钮，但没有看到合并确认弹窗。\n- 现有页面已有通用确认弹窗样式，可以先承载基础确认动作。\n\n**需要你决定**：本轮是先按通用确认弹窗继续，还是必须等专属弹窗设计补齐。\n\n**我建议**：选 B。合并主流程可以继续，弹窗文案和成功提示后续再对齐，不会阻塞主体范围。\n\n**不确认的代价**：如果不确认，技术计划会卡在“弹窗是否存在”和“合并后怎么提示”两个验收点上。\n\n**你可以怎么选**\nA 等设计补齐；B 先按通用弹窗继续；C 本轮不做批量合并；D 你补充弹窗规则。"
          },
          {
            "tag": "collapsible_panel",
            "expanded": false,
            "header": {
              "title": {
                "tag": "plain_text",
                "content": "证据和未决缺口：批量合并弹窗"
              }
            },
            "border": {
              "color": "grey",
              "corner_radius": "5px"
            },
            "padding": "8px 8px 8px 8px",
            "elements": [
              {
                "tag": "markdown",
                "content": "**依据摘录**\n- PRD：[批量合并规则](https://feishu.example.com/docx/daren-public-opinion-prd#merge-rule) 写到“重复舆情可合并处理”。\n- 设计稿：[舆情列表批量操作区](https://feishu.example.com/file/figma-daren-public-opinion#batch-actions) 能看到批量操作按钮，但没有合并确认弹窗。\n- 现有页面代码：无可点击入口：已有通用确认弹窗样式，可复用标题、正文和确认按钮结构。\n\n**还缺什么**\n- 合并弹窗标题、正文、确认按钮文案、合并成功后的提示。"
              }
            ]
          },
          {
            "tag": "select_static",
            "name": "af_002_choice",
            "required": true,
            "width": "fill",
            "placeholder": {
              "tag": "plain_text",
              "content": "请选择处理方式"
            },
            "options": [
              {
                "text": {
                  "tag": "plain_text",
                  "content": "A. 等设计补齐弹窗后继续"
                },
                "value": "A"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "B. 按通用确认弹窗继续（推荐）"
                },
                "value": "B"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "C. 本轮不做批量合并"
                },
                "value": "C"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "D. 我补充弹窗规则"
                },
                "value": "D"
              }
            ]
          },
          {
            "tag": "input",
            "name": "af_002_custom_input",
            "width": "fill",
            "input_type": "multiline_text",
            "rows": 2,
            "max_length": 1000,
            "placeholder": {
              "tag": "plain_text",
              "content": "选择 D 时，请写清楚弹窗标题、正文、按钮文案、成功提示或设计链接"
            }
          },
          {
            "tag": "hr"
          },
          {
            "tag": "markdown",
            "content": "### 问题 3：无权限的补充资料要不要阻塞本轮？\n\n**类型**：资料权限\n\n**背景**\n- PRD 正文已经能支持舆情列表、详情和处理动作的主体范围。\n- 任务里还引用了一份补充资料，但当前账号打开后提示无权限。\n\n**我看到了什么**\n- 可读 PRD 没有要求新增“导出审批记录”或“运营复核结论回写”。\n- 补充资料链接存在，但现在无法读取正文。\n- 如果补充资料里有强制要求，会改变本轮范围和验收清单。\n\n**需要你决定**：是否必须等补充资料开放权限后再继续，还是先按可读 PRD 进入技术计划。\n\n**我建议**：选 B。先按可读 PRD 继续，并把这份资料标记为待确认；这样不让一份未知资料阻塞主体流程。\n\n**不确认的代价**：如果资料里确实有本轮必做功能，后续要补任务；如果现在等待权限，技术计划会被未知内容卡住。\n\n**你可以怎么选**\nA 等权限开放；B 先按可读 PRD 继续；C 明确排除补充资料；D 你补充资料摘要。"
          },
          {
            "tag": "collapsible_panel",
            "expanded": false,
            "header": {
              "title": {
                "tag": "plain_text",
                "content": "证据和未决缺口：无权限补充资料"
              }
            },
            "border": {
              "color": "grey",
              "corner_radius": "5px"
            },
            "padding": "8px 8px 8px 8px",
            "elements": [
              {
                "tag": "markdown",
                "content": "**依据摘录**\n- PRD：[主体功能范围](https://feishu.example.com/docx/daren-public-opinion-prd#main-scope) 已覆盖舆情列表、详情和处理动作。\n- 补充资料：[舆情补充说明](https://feishu.example.com/docx/public-opinion-extra) 当前打开后提示无权限，无法读取正文。\n\n**还缺什么**\n- 补充资料正文摘要，或明确说明它不包含本轮新增功能。"
              }
            ]
          },
          {
            "tag": "select_static",
            "name": "af_003_choice",
            "required": true,
            "width": "fill",
            "placeholder": {
              "tag": "plain_text",
              "content": "请选择处理方式"
            },
            "options": [
              {
                "text": {
                  "tag": "plain_text",
                  "content": "A. 等资料开放权限后继续"
                },
                "value": "A"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "B. 先按可读 PRD 继续（推荐）"
                },
                "value": "B"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "C. 明确排除补充资料内容"
                },
                "value": "C"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "D. 我补充资料摘要"
                },
                "value": "D"
              }
            ]
          },
          {
            "tag": "input",
            "name": "af_003_custom_input",
            "width": "fill",
            "input_type": "multiline_text",
            "rows": 2,
            "max_length": 1000,
            "placeholder": {
              "tag": "plain_text",
              "content": "选择 D 时，请写清楚补充资料摘要、权限链接或明确排除原因"
            }
          },
          {
            "tag": "hr"
          },
          {
            "tag": "markdown",
            "content": "### 问题 4：运营处理结果要不要同步到外部系统？\n\n**类型**：外部系统\n\n**背景**\n- 位置是舆情详情页提交处理结果之后。\n- PRD 明确页面内要展示处理状态，但没有明确是否要同步到外部处理系统。\n\n**我看到了什么**\n- PRD 写到“运营可标记舆情处理结果”。\n- 接口资料提供了页面内状态和备注字段。\n- 外部处理系统只在背景里出现，没有同步地址、权限和失败处理规则。\n\n**需要你决定**：本轮是否要做外部系统同步，还是只更新页面内处理状态。\n\n**我建议**：选 B。当前证据只支持页面内状态更新；外部同步缺少地址、权限和失败处理规则。\n\n**不确认的代价**：如果默认做同步，范围和验收会明显扩大；如果默认不做，可能漏掉你期望的跨系统处理要求。\n\n**你可以怎么选**\nA 本轮同步到外部系统；B 本轮只更新页面内状态；C 只记录待同步标记；D 你补充外部系统规则。"
          },
          {
            "tag": "collapsible_panel",
            "expanded": false,
            "header": {
              "title": {
                "tag": "plain_text",
                "content": "为什么推荐 B：同步规则还不完整"
              }
            },
            "border": {
              "color": "grey",
              "corner_radius": "5px"
            },
            "padding": "8px 8px 8px 8px",
            "elements": [
              {
                "tag": "markdown",
                "content": "**依据摘录**\n- PRD：[处理结果说明](https://feishu.example.com/docx/daren-public-opinion-prd#process-result) 写到“运营可标记舆情处理结果”。\n- 接口资料：[处理结果字段](https://feishu.example.com/docx/public-opinion-interface#process-result) 包含页面内状态和备注字段。\n- 外部处理系统：无可点击入口：当前资料只在背景里提到系统名称，没有给同步地址和失败处理规则。\n\n**还缺什么**\n- 外部系统地址、权限规则、同步时机、失败后是否重试。"
              }
            ]
          },
          {
            "tag": "select_static",
            "name": "af_004_choice",
            "required": true,
            "width": "fill",
            "placeholder": {
              "tag": "plain_text",
              "content": "请选择处理方式"
            },
            "options": [
              {
                "text": {
                  "tag": "plain_text",
                  "content": "A. 本轮同步到外部系统"
                },
                "value": "A"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "B. 本轮只更新页面内状态（推荐）"
                },
                "value": "B"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "C. 只记录待同步标记"
                },
                "value": "C"
              },
              {
                "text": {
                  "tag": "plain_text",
                  "content": "D. 我补充外部系统规则"
                },
                "value": "D"
              }
            ]
          },
          {
            "tag": "input",
            "name": "af_004_custom_input",
            "width": "fill",
            "input_type": "multiline_text",
            "rows": 2,
            "max_length": 1000,
            "placeholder": {
              "tag": "plain_text",
              "content": "选择 D 时，请写清楚外部系统地址、同步时机、权限、失败处理或排除原因"
            }
          },
          {
            "tag": "column_set",
            "horizontal_align": "right",
            "columns": [
              {
                "tag": "column",
                "width": "auto",
                "elements": [
                  {
                    "tag": "button",
                    "name": "ask_first_submit",
                    "type": "primary_filled",
                    "text": {
                      "tag": "plain_text",
                      "content": "提交确认"
                    },
                    "form_action_type": "submit",
                    "behaviors": [
                      {
                        "type": "callback",
                        "value": {
                          "request_id": "ask_first_20260703_daren_public_opinion_001",
                          "artifact_workspace": "artifacts/7283871565-public-opinion-optimization",
                          "resume_command": "/delivery:prd",
                          "next_command_after_pass": "/delivery:plan",
                          "decision_ids": [
                            "AF-001",
                            "AF-002",
                            "AF-003",
                            "AF-004"
                          ]
                        }
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
```

## 当前对话里的回答格式

当用户明确要在当前对话里直接回答时，使用下面这种紧凑格式：

```text
AF-001=B; AF-002=B; AF-003=D; AF-003_custom_input=补充资料只包含历史讨论，不纳入本轮
```

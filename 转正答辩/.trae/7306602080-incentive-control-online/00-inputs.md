> status: DONE
> 本文件由 `/delivery:init` 基于 `meego-7306602080/context`、PRD、技术文档和仓库上下文整理。

# 00 Inputs

## Current Workspace

- artifacts_workspace: `artifacts/7306602080-incentive-control-online`
- context_source: `meego-7306602080/context`
- meego_task_id: `7306602080`
- meego_repos_root: `meego-7306602080/repos`
- execution_repo_root: `meego-7306602080/repos/alliance-operation-mono`
- target_repo: `ecom/alliance-operation-mono`
- target_repo_branch: `cx-3`

## PRD Source

- source_type: `meego context imported PRD`
- source_location: `artifacts/7306602080-incentive-control-online/prd-source.md`
- original_doc_url: `https://bytedance.larkoffice.com/wiki/RQFqwENe8iiLqTkWk7ScWfIznwt`
- title: `【PRD】运营平台_内容活动_激励管控线上化`
- status: `已获取`
- authority: `HIGH`
- summary: `修改内容活动的奖励配置与投放功能，在发奖前自动校验、提示、剔除命中「不激励」规则的作品与账号。`

## Supplemental Materials

| 类型 | 来源 | 状态 | 权威等级 | 说明 |
| --- | --- | --- | --- | --- |
| Meego 摘要 | `artifacts/7306602080-incentive-control-online/meego-summary.md` | 已获取 | HIGH | 记录工作项、角色、PRD/技术文档来源与抽取 Gate。 |
| repo-routing | `artifacts/7306602080-incentive-control-online/repo-routing.md` | 已获取 | HIGH | 主仓库定位为 `ecom/alliance-operation-mono`，页面落点为内容活动奖励配置/奖励投放。 |
| 后端技术文档 | `artifacts/7306602080-incentive-control-online/tech-doc-raw.md` | 已获取 | HIGH | 来自 `context/tech-doc-raw.md`，包含 BAM 链接、接口字段、下载移除明细和剔除记录接口。 |
| PRD 图片资源 | `prd-source/media/*` | 已导入 | HIGH | 正文引用闭包内 11 张图片已导入。 |
| PRD 白板资源 | `prd-source/whiteboards/*` | 已导入 | HIGH | 6 组白板、节点 JSON、分析和节点图片已导入。 |
| 技术文档图片资源 | `tech-doc-raw/media/*` | 已导入 | HIGH | 技术文档正文引用闭包内 4 张图片已导入。 |
| 技术文档评论 | `tech-doc-raw/comments/comments_page_1.json` | 已导入 | MEDIUM | 作为技术文档评论证据保留。 |

## Design Source Discovery

- design_source_status: `FIGMA_FOUND`
- design_source_locations:
  - `prd-source.md:36`：PRD 相关文档表格明确写入 `figma设计稿` URL。
  - `prd-source/raw/fetch_doc_content.md:113-114`：原始 fetch 内容直接回读到 Figma URL。
  - `prd-source/raw/lark_parser_strict.md:12`：Parser 原始 HTML 表格中直接回读到同一 Figma URL。
  - `prd-source.md:13-20`、`prd-source.md:116-118`、`prd-source.md:152`、`prd-source.md:198`：PRD 引用 6 组白板证据。
- figma_url: `https://www.figma.com/design/fNJJ7mEmEMYU5y0tcAZm3X/Untitled?node-id=0-1&p=f&m=dev`
- raw_body_check: `PRD 主报告未包含名为 Raw Body 的章节；已直接回读导入的原始 fetch/parser 片段，Figma URL 与 PRD 正文一致。`
- design_gate_impact: `已发现 Figma，且 PRD 存在核心 UI 改造信号；init 阶段不因设计源缺失暂停，后续 /delivery:prd 需继续建立 ui-source-map。`

## Initial Module Sketch

- `奖励配置 / 活动参与资格 / 预埋用户名单`：前置透出「不激励」规则提示与跳转。
- `奖励投放 / 奖励下发`：发奖前按作品/账号维度校验不激励状态，命中自然处罚阻断或剔除。
- `奖励投放 / 人工提报`：上传候选作品后标注命中「不激励」规则，支持一键移除与导出剔除明细。
- `奖励投放 / 剔除明细`：新增 Tab，展示 DOU+币、DOU+券剔除列表、筛选项和埋点。
- `BAM / API 接入`：`get_delivery_items_from_sheet` 新增 `if_not_incentive`、`not_incentive_reason`，新增下载移除明细与剔除记录相关接口。

## Missing Or Deferred Materials

| 材料 | 当前状态 | 影响 |
| --- | --- | --- |
| 测试文档 | 未发现字段级证据 | 不阻塞 init，PRD 阶段登记测试覆盖风险。 |
| 风险评估报告 | Meego 摘要发现链接，但未作为主输入导入 | 不阻塞 init；如 PRD 阶段需要风险口径，可补充获取。 |
| PRD 中补充 wiki：治理规则/上游接口/模板示例 | 作为线上链接保留，未在 init 阶段抽取 | 不阻塞 init；PRD 阶段按需求点确认是否必须补拉。 |

## Initial Risks

- P1：PRD 评论存在「剔除交互详细讨论」「接口名待定」「作品被激励金额定义」等未完全闭合项，需在 `/delivery:prd` 阶段归类。
- P1：技术文档包含 BAM 接口链接，后续进入 `/delivery:plan` 前需按 `/delivery:bam` Gate 判断是否必须先同步 BAM。
- P1：repo-routing 原文中的本地路径来自历史 `meego-9` workspace；本次执行已以当前 checkout 的 `meego-7306602080/repos/alliance-operation-mono` 作为 execution repo。

## Next Step

- next_command: `/delivery:prd`

## Imported Context Sources

- imported_at: `2026-07-07 19:46:29 +0800`
- context_source: `meego-7306602080/context`
- artifacts_workspace: `artifacts/7306602080-incentive-control-online`
- import_rule: `same-name artifacts files plus referenced-resource closure`
- prd_source_priority: `context/prd-source.md -> context/prd-raw.md legacy fallback`
- prd_source_resolution: `context/prd-source.md`
- repo_routing_source: `context/repo-routing.md`
- backend_tech_doc: `imported from context/tech-doc-raw.md`
- imported_resource_files: `prd-source/comments/comments_page_1.json prd-source/media/image_01_KhAubDqzHomlzoxoiGscUJfVnVv.png prd-source/media/image_02_YaLsbktc2o3NrnxnGv6cBln3nFg.png prd-source/media/image_03_MNlybiMzFojxK0xcipTcGjumnkb.png prd-source/media/image_04_OlSpbF4vyoQCdJxMEo2cnKYJnsh.png prd-source/media/image_05_MkHrbAHoeoMsJtxMbZuc5JSXnNd.png prd-source/media/image_06_A4bVbtiXDoz87PxuMG3cgZCunKd.png prd-source/media/image_07_XmdgbAtNvokABPx0RF7cXfGFnZd.png prd-source/media/image_08_SW5bbnyvPoT5Sexb5olcqVB2n2U.png prd-source/media/image_09_C267bJE7foaCNrxOF33cCV47nog.png prd-source/media/image_10_TCRCbdSLmoCEnYx8Nd2cJDdrn1e.png prd-source/media/image_11_GO0db3raJoA9lqxK912ca6Dhnld.png prd-source/raw/fetch_doc_content.md prd-source/raw/lark_parser_strict.md prd-source/whiteboards/whiteboard_01_node_d2-2_FSE0bwtcFo1MdWxdA5rcu0Bdnif.png prd-source/whiteboards/whiteboard_01_Q0E1wrjCuhA0h5bO1WycqdyRnFf_analysis.md prd-source/whiteboards/whiteboard_01_Q0E1wrjCuhA0h5bO1WycqdyRnFf_nodes.json prd-source/whiteboards/whiteboard_01_Q0E1wrjCuhA0h5bO1WycqdyRnFf_thumbnail.jpg prd-source/whiteboards/whiteboard_02_node_d2-4_YgPib424SofgXax98ZFcnJ39nMg.png prd-source/whiteboards/whiteboard_02_node_d8-1_UOv8bfvSeocNJgxbzXlcBXNQn5m.png prd-source/whiteboards/whiteboard_02_Rr6lw0FtThXhHEbHIJWcwcwTnle_analysis.md prd-source/whiteboards/whiteboard_02_Rr6lw0FtThXhHEbHIJWcwcwTnle_nodes.json prd-source/whiteboards/whiteboard_02_Rr6lw0FtThXhHEbHIJWcwcwTnle_thumbnail.jpg prd-source/whiteboards/whiteboard_03_D8wwwJrbAhwQ35bCgHCcIMzgnsg_analysis.md prd-source/whiteboards/whiteboard_03_D8wwwJrbAhwQ35bCgHCcIMzgnsg_nodes.json prd-source/whiteboards/whiteboard_03_D8wwwJrbAhwQ35bCgHCcIMzgnsg_thumbnail.jpg prd-source/whiteboards/whiteboard_03_node_d1-10_MBzUbLUdboLVZvxAtONctCmrnnh.png prd-source/whiteboards/whiteboard_03_node_d1-13_BlZIbCAD0oW86ZxkftucpOOqnrd.png prd-source/whiteboards/whiteboard_03_node_d1-27_TD9BbWEiDogQG7xmjG1cVIKUn3P.png prd-source/whiteboards/whiteboard_04_IFrAwadoph00bBbFniecIsVEnRh_analysis.md prd-source/whiteboards/whiteboard_04_IFrAwadoph00bBbFniecIsVEnRh_nodes.json prd-source/whiteboards/whiteboard_04_IFrAwadoph00bBbFniecIsVEnRh_thumbnail.jpg prd-source/whiteboards/whiteboard_04_node_d33-7_LASfbECFdoXb5VxpxU8cNgRen4g.png prd-source/whiteboards/whiteboard_04_node_d33-8_G4eXbsEojoXuDExlCHlcsBDvnTf.png prd-source/whiteboards/whiteboard_04_node_d33-9_SfgebPx4boxzn4xL8DAcbXvmnmg.png prd-source/whiteboards/whiteboard_05_LxmswBz6yhhPDubamDSceRj2nub_analysis.md prd-source/whiteboards/whiteboard_05_LxmswBz6yhhPDubamDSceRj2nub_nodes.json prd-source/whiteboards/whiteboard_05_LxmswBz6yhhPDubamDSceRj2nub_thumbnail.jpg prd-source/whiteboards/whiteboard_05_node_d2-4_WBrjb5aCuoBesUxwKnLc0Y3Hnaf prd-source/whiteboards/whiteboard_05_node_d8-1_U1x1bRxuOo1h1hx4kfVchJqMnLe prd-source/whiteboards/whiteboard_06_node_d33-7_C0J7ba3vOo3ZS5xNO9Bc5Ax6nOh prd-source/whiteboards/whiteboard_06_node_d33-8_UmBubUgmSozWCDxEmVqc28Hsn0h prd-source/whiteboards/whiteboard_06_node_d33-9_DVfwbaHDxo7TC4xuSX6crfvinLZ prd-source/whiteboards/whiteboard_06_XqZwwzZVBh38QUbp3itcbqAUnmh_analysis.md prd-source/whiteboards/whiteboard_06_XqZwwzZVBh38QUbp3itcbqAUnmh_nodes.json prd-source/whiteboards/whiteboard_06_XqZwwzZVBh38QUbp3itcbqAUnmh_thumbnail.jpg tech-doc-raw/comments/comments_page_1.json tech-doc-raw/media/image_01_Vtu5bFcRvoSHsFxaG53caOKEncc.png tech-doc-raw/media/image_02_CvM6bJRPGoZm2ExcGxzctNAOnBh.png tech-doc-raw/media/image_03_FOPkbJIhvoABu2x5zq0ccbW3naf.png tech-doc-raw/media/image_04_VblYbK9YcosBzgxrYQGc4sPunY0.png tech-doc-raw/raw/fetch_doc_content.md tech-doc-raw/raw/lark_parser_strict.md `
- referenced_resource_files: `prd-source/comments/comments_page_1.json prd-source/media/image_01_KhAubDqzHomlzoxoiGscUJfVnVv.png prd-source/media/image_02_YaLsbktc2o3NrnxnGv6cBln3nFg.png prd-source/media/image_03_MNlybiMzFojxK0xcipTcGjumnkb.png prd-source/media/image_04_OlSpbF4vyoQCdJxMEo2cnKYJnsh.png prd-source/media/image_05_MkHrbAHoeoMsJtxMbZuc5JSXnNd.png prd-source/media/image_06_A4bVbtiXDoz87PxuMG3cgZCunKd.png prd-source/media/image_07_XmdgbAtNvokABPx0RF7cXfGFnZd.png prd-source/media/image_08_SW5bbnyvPoT5Sexb5olcqVB2n2U.png prd-source/media/image_09_C267bJE7foaCNrxOF33cCV47nog.png prd-source/media/image_10_TCRCbdSLmoCEnYx8Nd2cJDdrn1e.png prd-source/media/image_11_GO0db3raJoA9lqxK912ca6Dhnld.png prd-source/raw/fetch_doc_content.md prd-source/raw/lark_parser_strict.md prd-source/whiteboards/whiteboard_01_node_d2-2_FSE0bwtcFo1MdWxdA5rcu0Bdnif.png prd-source/whiteboards/whiteboard_01_Q0E1wrjCuhA0h5bO1WycqdyRnFf_analysis.md prd-source/whiteboards/whiteboard_01_Q0E1wrjCuhA0h5bO1WycqdyRnFf_nodes.json prd-source/whiteboards/whiteboard_01_Q0E1wrjCuhA0h5bO1WycqdyRnFf_thumbnail.jpg prd-source/whiteboards/whiteboard_02_node_d2-4_YgPib424SofgXax98ZFcnJ39nMg.png prd-source/whiteboards/whiteboard_02_node_d8-1_UOv8bfvSeocNJgxbzXlcBXNQn5m.png prd-source/whiteboards/whiteboard_02_Rr6lw0FtThXhHEbHIJWcwcwTnle_analysis.md prd-source/whiteboards/whiteboard_02_Rr6lw0FtThXhHEbHIJWcwcwTnle_nodes.json prd-source/whiteboards/whiteboard_02_Rr6lw0FtThXhHEbHIJWcwcwTnle_thumbnail.jpg prd-source/whiteboards/whiteboard_03_D8wwwJrbAhwQ35bCgHCcIMzgnsg_analysis.md prd-source/whiteboards/whiteboard_03_D8wwwJrbAhwQ35bCgHCcIMzgnsg_nodes.json prd-source/whiteboards/whiteboard_03_D8wwwJrbAhwQ35bCgHCcIMzgnsg_thumbnail.jpg prd-source/whiteboards/whiteboard_03_node_d1-10_MBzUbLUdboLVZvxAtONctCmrnnh.png prd-source/whiteboards/whiteboard_03_node_d1-13_BlZIbCAD0oW86ZxkftucpOOqnrd.png prd-source/whiteboards/whiteboard_03_node_d1-27_TD9BbWEiDogQG7xmjG1cVIKUn3P.png prd-source/whiteboards/whiteboard_04_IFrAwadoph00bBbFniecIsVEnRh_analysis.md prd-source/whiteboards/whiteboard_04_IFrAwadoph00bBbFniecIsVEnRh_nodes.json prd-source/whiteboards/whiteboard_04_IFrAwadoph00bBbFniecIsVEnRh_thumbnail.jpg prd-source/whiteboards/whiteboard_04_node_d33-7_LASfbECFdoXb5VxpxU8cNgRen4g.png prd-source/whiteboards/whiteboard_04_node_d33-8_G4eXbsEojoXuDExlCHlcsBDvnTf.png prd-source/whiteboards/whiteboard_04_node_d33-9_SfgebPx4boxzn4xL8DAcbXvmnmg.png prd-source/whiteboards/whiteboard_05_LxmswBz6yhhPDubamDSceRj2nub_analysis.md prd-source/whiteboards/whiteboard_05_LxmswBz6yhhPDubamDSceRj2nub_nodes.json prd-source/whiteboards/whiteboard_05_LxmswBz6yhhPDubamDSceRj2nub_thumbnail.jpg prd-source/whiteboards/whiteboard_05_node_d2-4_WBrjb5aCuoBesUxwKnLc0Y3Hnaf prd-source/whiteboards/whiteboard_05_node_d8-1_U1x1bRxuOo1h1hx4kfVchJqMnLe prd-source/whiteboards/whiteboard_06_node_d33-7_C0J7ba3vOo3ZS5xNO9Bc5Ax6nOh prd-source/whiteboards/whiteboard_06_node_d33-8_UmBubUgmSozWCDxEmVqc28Hsn0h prd-source/whiteboards/whiteboard_06_node_d33-9_DVfwbaHDxo7TC4xuSX6crfvinLZ prd-source/whiteboards/whiteboard_06_XqZwwzZVBh38QUbp3itcbqAUnmh_analysis.md prd-source/whiteboards/whiteboard_06_XqZwwzZVBh38QUbp3itcbqAUnmh_nodes.json prd-source/whiteboards/whiteboard_06_XqZwwzZVBh38QUbp3itcbqAUnmh_thumbnail.jpg tech-doc-raw/comments/comments_page_1.json tech-doc-raw/media/image_01_Vtu5bFcRvoSHsFxaG53caOKEncc.png tech-doc-raw/media/image_02_CvM6bJRPGoZm2ExcGxzctNAOnBh.png tech-doc-raw/media/image_03_FOPkbJIhvoABu2x5zq0ccbW3naf.png tech-doc-raw/media/image_04_VblYbK9YcosBzgxrYQGc4sPunY0.png tech-doc-raw/raw/fetch_doc_content.md tech-doc-raw/raw/lark_parser_strict.md `
- unreferenced_intermediates: `not imported`

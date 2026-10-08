# cx-learn-notes

学习笔记与项目实践。Browser Monitor 独立维护在 [cxDlogver/browser-monitor](https://github.com/cxDlogver/browser-monitor)，本仓库通过 Git 子模块保留 `browser-monitor/` 目录及固定版本引用。走航车平台独立维护在 [cxDlogver/qhzhc-realtime-platform](https://github.com/cxDlogver/qhzhc-realtime-platform)，通过子模块保留 `qhzhc-realtime-platform/` 目录及固定版本引用。

## AI 全栈面试训练

[全栈 AI 面试评审任务规范](全栈AI面试评审任务规范.md) 区分完整岗位知识与当前简历经历：知识题按能力树选题，项目分析限于简历陈述。每题说明来源、考察能力和选题原因，按验证价值与覆盖缺口深入或切换；回答结合仓库与权威资料完整展开。

GitHub Skill 入口：[ai-fullstack-interview](.github/skills/ai-fullstack-interview/SKILL.md)。知识正文与已有问题分别见 [知识体系索引](Full-Stack-AI-NOTES/知识体系索引.md) 和 [QA](Full-Stack-AI-NOTES/QA.md)。

## 获取完整项目

```bash
git clone --recurse-submodules https://github.com/cxDlogver/cx-learn-notes.git
cd cx-learn-notes
```

已有本仓库时，在仓库根目录初始化或同步子模块：

```bash
git submodule update --init --recursive
```

`official-network`、`browser-monitor`、`qhzhc-realtime-platform`、`qhfg-energy-platform` 和 `miaoma-aiflow` 都由各自仓库管理；修改子模块代码后，先提交并推送子模块，再在本仓库提交对应的版本指针。

## 保持 SDK 调用

根目录的 `pnpm-workspace.yaml` 继续包含 `browser-monitor/protocol`、`browser-monitor/sdk`、`official-network` 和 `qhzhc-realtime-platform/QHZHC_Web`。官网及走航车前端仍通过 `cx-browser-monitor-sdk: workspace:*` 引用原路径下的 SDK。

```bash
# 在 cx-learn-notes 根目录执行
pnpm install
pnpm --filter @browser-monitor/protocol build
pnpm --filter cx-browser-monitor-sdk build
```

监控系统的完整检查和平台启动方式见 [Browser Monitor 说明](browser-monitor/README.md)。检查在监控项目根目录执行：

```bash
cd browser-monitor
pnpm install
pnpm check
```

## 更新监控项目版本

普通同步使用 `git submodule update --init --recursive`，恢复本仓库锁定的版本。需要主动升级到独立仓库的最新版本时：

```bash
git -C browser-monitor switch main
git -C browser-monitor pull --ff-only origin main
git add browser-monitor
git commit -m "chore: update browser-monitor submodule"
git push
```

## 更新走航车项目版本

```bash
git -C qhzhc-realtime-platform switch main
git -C qhzhc-realtime-platform pull --ff-only origin main
git add qhzhc-realtime-platform
git commit -m "chore: update qhzhc submodule"
git push
```

## 能源可视化平台

[QHFG Energy Platform](https://github.com/cxDlogver/qhfg-energy-platform) 独立维护，当前仓库通过 `qhfg-energy-platform/` 子模块固定引用。保留原 Vue 页面与二维/三维功能，TypeScript 后端只迁移前端调用的20个接口。默认使用隔离fixture；真实数据库/QGIS/Excel/邮件配置和验收边界见项目README。

该项目使用独立pnpm workspace，需要Node >=22.19，不并入本仓库SDK依赖链：

```bash
git submodule update --init qhfg-energy-platform
cd qhfg-energy-platform
pnpm install --frozen-lockfile
pnpm dev
```

[性能指标](https://github.com/cxDlogver/qhfg-energy-platform/blob/main/docs/performance/results.md) · [完整优化过程](https://github.com/cxDlogver/qhfg-energy-platform/blob/main/docs/performance/optimization-log.md) · [功能与视觉验证](https://github.com/cxDlogver/qhfg-energy-platform/blob/main/docs/validation/results.md)。保留48次Lighthouse Node API审计，含退化候选与未解决的移动数据页TBT回退。

更新该子模块时先提交并推送独立仓库，再在父仓库更新版本指针。

## AI Flow 项目

[miaoma-aiflow](https://github.com/cxDlogver/miaoma-aiflow) 独立维护，本仓库通过根目录 `miaoma-aiflow/` 子模块固定引用。课程笔记、RAG 手册、图片和验收样本统一放在项目的 `docs/`；课程阶段源码和两份原始 ZIP 保留在 [Resource/miaoma-aiflow](Resource/miaoma-aiflow)。

```bash
git submodule update --init miaoma-aiflow
cd miaoma-aiflow
```

该项目使用独立的 pnpm 9.12.3 workspace。环境配置与启动步骤见 [项目 README](miaoma-aiflow/README.md) 和 [全链路手册](miaoma-aiflow/docs/妙码AI-Flow企业知识库RAG全链路使用与答辩手册.md)。

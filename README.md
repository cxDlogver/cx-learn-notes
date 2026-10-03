# cx-learn-notes

学习笔记与项目实践。Browser Monitor 独立维护在 [cxDlogver/browser-monitor](https://github.com/cxDlogver/browser-monitor)，本仓库通过 Git 子模块保留 `browser-monitor/` 目录及固定版本引用。

## 获取完整项目

```bash
git clone --recurse-submodules https://github.com/cxDlogver/cx-learn-notes.git
cd cx-learn-notes
```

已有本仓库时，在仓库根目录初始化或同步子模块：

```bash
git submodule update --init --recursive
```

`official-network` 和 `browser-monitor` 都由各自仓库管理；修改子模块代码后，先提交并推送子模块，再在本仓库提交对应的版本指针。

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

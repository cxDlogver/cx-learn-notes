---
name: bytedance-bytedog
description: "Use whenever users mention ByteDog, bytedcli bytedog, flamegraphs, CPU profiling, continuous profiling, jemalloc, off-CPU, pthread or lock contention, PID lookup, profile result download, or performance diagnostics"
---

# ByteDog (`bytedcli bytedog`) — Performance Profiling & Diagnostics

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

## 前置条件

- 使用通用调用方式：`../../invocation.md`
- ByteDog 需要 ByteCloud JWT 认证：`references/auth.md`
- `bytedcli bytedog` 命令参数: `references/profile-tool-command-reference.md`

## When to use

- 获取或解析已有 ByteDog detail URL 的 profiling 结果，使用 `bytedcli bytedog profile get`。
- 查询历史 profiling 任务并希望拿到可用结果 URL 时，默认给 `profile <type> list` 加 `--status GOOD`；只有排查运行中或失败任务时再改用 `--status RUNNING` / `--status BAD` 或省略状态过滤。
- 创建 profiling 任务前如果需要确认主机、TCE Pod、Cloud IDE、大数据分析实例或 Kubernetes 容器里的目标进程、PID、RSS、CPU、命令行时，先用 `bytedcli bytedog tool process list`。
- `bytedcli bytedog profile oncpu create`：用于 CPU 忙、CPU 使用率高、需要定位 C++/Go/Rust/Java/Python 热点函数或调用栈时；支持主机、TCE Pod、Cloud IDE、大数据分析实例和 Kubernetes 容器目标。如果只想采某个进程，先拿 PID 再传 `--pid`；大数据分析实例目标必须传 `--pid`；Kubernetes 容器目标仅非 TTP 站点支持。
- `bytedcli bytedog profile sprofile create`：用于需要机器维度的 continuous profiling、长时间 CPU 画像、历史时间窗口或难以稳定复现的 CPU 问题；该命令只支持 `--ip` 目标。
- `bytedcli bytedog profile offcpu create`：用于 p99/RT 飙升但 CPU 未饱和、怀疑线程卡在 IO wait、sleep、futex、调度等待或阻塞调用时；支持主机、TCE Pod、大数据分析实例和 Kubernetes 容器目标，需要明确 PID；大数据分析实例和 Kubernetes 容器目标仅非 TTP 站点支持。
- `bytedcli bytedog profile pthread create`：用于怀疑 pthread mutex/rwlock 等用户态锁竞争、锁等待或临界区争用导致延迟时；支持主机、TCE Pod、大数据分析实例和 Kubernetes 容器目标，需要明确 PID；大数据分析实例和 Kubernetes 容器目标仅非 TTP 站点支持。
- `bytedcli bytedog profile je-stats create`：用于快速查看 jemalloc allocator stats，判断 RSS、arena/bin/tcache、碎片或分配状态是否异常；支持主机、TCE Pod、大数据分析实例和 Kubernetes 容器目标，需要明确 PID。
- `bytedcli bytedog profile je-flamegraph create`：用于怀疑 jemalloc 内存泄漏、RSS 持续增长、分配热点不清楚，或需要按调用栈定位内存分配来源时；支持主机、TCE Pod、大数据分析实例和 Kubernetes 容器目标，需要明确 PID，默认 `--type increment` 依赖目标已处于 jemalloc memory flamegraph enable 状态；TCE Pod 目标必要时先执行 `bytedcli bytedog profile je-flamegraph enable --pod demo-pod --pid 12345 --wait`。大数据分析实例和 Kubernetes 容器目标仅非 TTP 站点支持。
- `bytedcli bytedog profile java-heapdump create`：用于分析 Java heap 使用、疑似内存泄漏、对象分布、引用链、retained size 或 GC 压力来源时；支持在线 TCE / machine / 大数据分析实例目标，需要明确 PID，不支持 Kubernetes 容器。该命令会采集完整 heap 快照，可能短时间影响目标进程，必须传 `--confirm-hang-risk`。
- `bytedcli bytedog profile java-allocation create`：用于线上低开销定位 Java 分配热点、短时间 heap 增长或分配压力来源时；采样结果不是完整分配日志，但通常足够定位热点调用栈。支持在线 TCE / machine / 大数据分析实例目标，需要明确 PID，不支持 Kubernetes 容器。
- `bytedcli bytedog profile java-gc create`：用于分析 Java GC 行为、频繁 GC、Full GC、停顿过长或内存回收效果异常时；支持在线 TCE / machine / 大数据分析实例目标，需要明确 PID，不支持 Kubernetes 容器。
- `bytedcli bytedog profile java-thread create`：用于分析 Java 线程状态、thread dump、线程阻塞、Runnable/Waiting 分布、高 CPU 线程栈或疑似死锁线索时；支持在线 TCE / machine / 大数据分析实例目标，需要明确 PID，不支持 Kubernetes 容器。
- `bytedcli bytedog profile java-lock create`：用于分析 Java 锁竞争、锁等待、锁冲突、monitor/synchronized 热点或疑似死锁时；支持在线 TCE / machine / 大数据分析实例目标，需要明确 PID，不支持 Kubernetes 容器。
- 需要确认 `bytedcli bytedog` 命令参数、输出、限制或示例时，读 `references/profile-tool-command-reference.md`。

## TTP 环境支持

| 命令 | TTP 目标支持 |
| --- | --- |
| `bytedcli bytedog profile oncpu create` | 支持主机、TCE Pod、Cloud IDE、大数据分析实例；不支持 Kubernetes 容器。 |
| `bytedcli bytedog profile offcpu create` / `pthread create` / `je-flamegraph create` | 仅支持主机、TCE Pod；大数据分析实例和 Kubernetes 容器仅非 TTP 站点支持。 |
| `bytedcli bytedog profile je-stats create` | 支持主机、TCE Pod、大数据分析实例、Kubernetes 容器。 |
| `bytedcli bytedog profile java-* create` | 支持主机、TCE Pod、大数据分析实例；不支持 Kubernetes 容器和 Cloud IDE。 |
| `bytedcli bytedog tool process list` | 支持所有目标形态；`--tob` 在 TTP 站点会被忽略。 |

## 常用流程

执行 ByteDog profile 任务时，常见的使用场景对应的流程文档：

| Workflow | Use for |
| -------- | ------- |
| `references/tce-on-cpu-profile-workflow.md` | 根据 TCE PSM + podname 定位实例，创建 on-cpu 火焰图并获取结果。 |
| `references/profile-create-to-get-workflow.md` | 创建新的 profile 任务，等待完成并获取结果文件或远端文件 URL。 |
| `references/profile-list-to-get-workflow.md` | 查询历史 profile 任务，选择 `detail_url` 并获取结果文件或远端文件 URL。 |

## CLI Reference

Before executing or recommending `bytedcli bytedog`, read `references/profile-tool-command-reference.md` for the full command matrix, output shapes, limitations, and examples.

| Command | Use for |
| ------- | ------- |
| `bytedcli bytedog profile get` | Get task status, result URLs, and downloadable files from existing ByteDog detail URLs; generates `data-format.md` only when result files exist. |
| `bytedcli bytedog profile <oncpu/sprofile/offcpu/pthread/je-stats/je-flamegraph/java-heapdump/java-allocation/java-gc/java-thread/java-lock> create` | Submit new profiling tasks and return detail URLs. |
| `bytedcli bytedog profile <oncpu/sprofile/offcpu/pthread/je-stats/je-flamegraph/java-heapdump/java-allocation/java-gc/java-thread/java-lock> list --status GOOD` | Search completed historical profiling tasks and detail URLs. |
| `bytedcli bytedog tool process list` | List target processes for machine, TCE Pod, Cloud IDE, big data analytics instance, or Kubernetes container targets before creating PID-scoped profiling tasks. |

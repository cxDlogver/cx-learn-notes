# ByteDog Profile Create 到 Get 标准流程

本文用于 Agent 执行“创建新的 ByteDog profiling 任务，再拿结果文件”的标准流程。需要完整参数、输出字段或边界条件时，同时阅读 `profile-tool-command-reference.md`。

## 适用场景

用户需要新采集一次 profiling 数据时使用本流程，例如：

- CPU 忙、CPU 使用率高、需要看热点函数：`bytedcli bytedog profile oncpu create`
- 需要机器维度长时间 CPU 画像或历史时间窗口：`bytedcli bytedog profile sprofile create`
- RT/p99 高但 CPU 不高，怀疑 IO wait、sleep、futex、调度等待：`bytedcli bytedog profile offcpu create`
- 怀疑 pthread mutex/rwlock 锁竞争或临界区争用：`bytedcli bytedog profile pthread create`
- 需要快速查看 jemalloc allocator stats：`bytedcli bytedog profile je-stats create`
- 怀疑 jemalloc 内存泄漏、RSS 持续增长、需要看内存分配调用栈：`bytedcli bytedog profile je-flamegraph create`
- Java heap 使用异常、疑似泄漏、对象分布或 GC 压力来源：`bytedcli bytedog profile java-heapdump create`
- Java 分配热点、短时间 heap 增长或分配压力：`bytedcli bytedog profile java-allocation create`
- Java 频繁 GC、Full GC、停顿过长或回收效果异常：`bytedcli bytedog profile java-gc create`
- Java 线程状态、线程阻塞、高 CPU 线程栈或疑似死锁线索：`bytedcli bytedog profile java-thread create`
- Java 锁竞争、锁等待、锁冲突或 monitor/synchronized 热点：`bytedcli bytedog profile java-lock create`

## 标准步骤

1. 选择站点与 profile 类型。

   `--site` 是全局参数，写在 `bytedcli` 后、`bytedog` 前。若用户没有指定站点，按当前环境默认值执行；需要跨站点排查时让用户给出目标 site 或目标 detail URL。

2. 确认目标与 PID。

   `oncpu` 支持 `--ip`、`--pod`、`--workspace-id`、`--ip --app-id`、`--ip --k8s-pod --container-id` 这些目标形态；其中 `--app-id` 表示大数据分析实例，必须同时传 `--pid`，且只支持 `cpp/java/python`；Kubernetes 容器目标仅非 TTP 站点支持。`sprofile` 只支持 `--ip`。`offcpu`、`pthread`、`je-stats`、`je-flamegraph` 支持 `--ip`、`--pod`、`--ip --app-id`、`--ip --k8s-pod --container-id` 且需要 `--pid`；其中 offcpu/pthread/je-flamegraph 的大数据分析实例和 Kubernetes 容器目标仅非 TTP 站点支持。Java heap/allocation/gc/thread/lock create 支持 `--ip`、`--pod`、`--ip --app-id` 且需要 `--pid`，不支持 Kubernetes 容器；其中 heapdump 还必须显式传 `--confirm-hang-risk`。

   需要 PID、进程命令、RSS 或 CPU 信息时先执行：

   ```bash
   bytedcli bytedog tool process list \
     --pod demo-pod
   ```

   大数据分析实例和 Kubernetes 容器目标也先用同一个 tool 命令查 PID：

   ```bash
   bytedcli bytedog tool process list \
     --ip example-host \
     --app-id sample-application

   bytedcli bytedog tool process list \
     --ip example-host \
     --k8s-pod demo-pod \
     --container-id sample-container
   ```

3. 创建 profiling 任务。

   `profile <type> create` 只提交异步任务，不等待结果文件生成。创建成功后记录输出里的 detail URL。
   非 TTP 站点如需补充问题和原因，只在 create 命令上追加 `--question <text>` / `--reason <text>`。

   ```bash
   bytedcli bytedog profile oncpu create \
     --pod demo-pod \
     --type go \
     --question "Why is CPU usage high?" \
     --reason "Investigating p99 latency"
   ```

   对需要 PID 的任务：

   ```bash
   bytedcli bytedog profile offcpu create \
     --pod demo-pod \
     --pid 12345

   bytedcli bytedog profile java-gc create \
     --pod demo-pod \
     --pid 12345
   ```

   `je-flamegraph create` 默认创建增量采集任务，目标需要先处于 jemalloc memory flamegraph enable 状态。TCE Pod 目标没有 enable 时，先执行 enable 并等待成功，再创建采集任务；JSON 模式方便外层流程稳定提取 URL：

   ```bash
   bytedcli bytedog profile je-flamegraph enable \
     --pod demo-pod \
     --pid 12345 \
     --wait

   bytedcli --json bytedog profile je-flamegraph create \
     --pod demo-pod \
     --pid 12345
   ```

4. 等待任务完成。

   创建命令返回 detail URL 后，等待采样时长加处理时间。`profile get` 只在任务状态为 `GOOD` 时获取结果文件；如果任务仍在运行，按提示稍后重试同一条 `profile get` 命令。若状态可用但详情页没有结果 URL，命令会成功返回 `status`、`result_urls` 和空 `files`，不要继续读取不存在的 `data-format.md`。

5. 用 detail URL 获取结果。

   ```bash
   bytedcli bytedog profile get \
     --url 'https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=tce' \
     --output-dir ./bytedog-output
   ```

   `profile get` 在存在结果文件时会在输出目录生成 `data-format.md` 和可自动下载的结果文件。拿到文件后先读 `data-format.md`，再解析 `.collapse`、`.json` 等结果文件。Java heap dump `.hprof` 不会自动下载，命令会输出远端 TOS URL，需要手动下载后再用 HPROF 工具分析。若输出 `files: []`，说明详情页未返回可下载结果 URL，向用户展示 `status` 和 `result_urls` 即可。

6. 批量获取多个结果。

   多个 detail URL 用英文逗号分隔，并写入同一个输出目录：

   ```bash
   bytedcli bytedog profile get \
     --url 'https://example.bytedog/profiling/on-cpu-profiling/detail?id=1001&from=tce,https://example.bytedog/profiling/jemalloc-profiling/stats?id=1004&from=machine' \
     --output-dir ./bytedog-output
   ```

## Agent 输出要求

- 向用户汇报创建出的 detail URL、输出目录、任务 `status`、`result_urls`、结果文件路径，以及不会自动下载的远端文件 URL；只有输出里实际包含 `data-format.md` 时才汇报并读取它。
- 如果 `profile get` 提示任务未完成，说明任务仍在运行，并给出可直接重试的 `profile get --url ... --output-dir ...` 命令。
- 如果任务失败，保留错误信息和 detail URL，建议用户根据错误提示修正目标、PID、采样类型或 jemalloc 环境后重新创建。

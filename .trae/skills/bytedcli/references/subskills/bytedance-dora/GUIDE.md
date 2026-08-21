---
name: bytedance-dora
description: "Use when tasks mention Dora, 云真机, 云手机, cloud device, device occupation/reservation/release/renewal, Android/adb cloud devices, iOS/bdc cloud devices, ADB/BDC connection, or installing APK/IPA packages on occupied cloud devices."
---

# bytedcli Dora

Use this skill for Dora cloud-device work. The command domain is top-level `dora`; do not use `bits dora`.

## Invocation

Prefer globally installed `bytedcli`:

```bash
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm install -g @bytedance-dev/bytedcli@latest
bytedcli <command> [options]
```

Use JSON mode for machine-readable output by placing `--json` before `dora`:

```bash
bytedcli --json dora device list
```

Requires bytedcli authentication; if not logged in, run `bytedcli auth login` first.

## When to use

- 查询 Dora 公有云真机 / 云手机列表。
- 查询当前用户已占用设备列表。
- 获取单台设备详情。
- 占用一台空闲设备用于远程调试。
- 申请预约设备。
- 按用户输入的 `安卓/adb` 或 `iOS/bdc` 精确占用对应平台设备。
- 占用云真机后做二次验证、续期，并在长时间任务中启动到期前自动续期守护。
- 用户提供或指定 APK/IPA 安装包时，占用、续期和连接验证完成后自动安装。
- 释放、续期当前占用的设备。
- 获取设备 ADB 或 BDC 连接地址。

## Quick start

```bash
# 查询公有空闲设备；默认筛选 public / idle / Android / physical / CN
bytedcli dora device list
bytedcli --json dora device list

# 常用筛选
bytedcli --json dora device list --os ios --device-type physical --usage idle --connect-state online
bytedcli --json dora device list --os android --device-type physical --usage idle --connect-state online
bytedcli dora device list --keyword "pixel"
bytedcli dora device list --connect-state online --country SG
bytedcli dora device list --level high --version "14" --manufacturer "Google"

# 查询当前用户已占用设备
bytedcli --json dora device list --scope occupied

# 获取设备详情
bytedcli --json dora device get --serial <device-serial>

# 占用设备用于远程调试；默认 1800 秒，最大 14400 秒
bytedcli --json dora device occupy --serial <device-serial> --time-sec 3600

# 申请预约设备
bytedcli --json dora device apply --serial <device-serial> --hours 2
bytedcli --json dora device apply --serial <model-key> --reservation-type model --hours 2

# 续期 / 释放
bytedcli --json dora device renew --serial <device-serial> --time-sec 14400
bytedcli --json dora device release --serial <device-serial>

# 获取连接地址
bytedcli --json dora device adb --serial <device-serial>
bytedcli --json dora device bdc --serial <device-serial>
```

## 稳定占用云真机 + 可选安装包

用于“占用一台云真机并连到本地”，以及“用户给了安装包就自动安装”的任务。核心原则：**先明确平台，再只筛对应平台；占用后必须二次验证并续期；长时间占用要启动自动续期守护；连接验证通过后才安装**。

### 输入到设备类型映射

| 用户输入 / 物料 | 目标平台 | 连接方式 | 安装方式 |
| --- | --- | --- | --- |
| `安卓` / `android` / `adb` / `.apk` / `.apks` | Android | ADB | `adb install`（`.apks` 需 bundletool 或平台支持） |
| `iOS` / `ios` / `iphone` / `bdc` / `.ipa` | iOS | BDC | `bdc install --resign` |

- 用户显式说 `adb` 就按 Android；显式说 `bdc` 就按 iOS。
- 用户只给安装包时，从后缀推断：`.apk`/`.apks` => Android，`.ipa` => iOS。
- 显式平台与安装包后缀冲突时先停下说明冲突，不要跨平台安装或随机占设备。
- 没有平台线索且没有安装包时，先询问 Android 还是 iOS；不要默认占 Android。

### 手动稳定流程

1. **确认平台**：按上表把 `安卓/adb` 映射到 Android，把 `iOS/bdc` 映射到 iOS。用户只输入 `ios` 时，目标平台就是 iOS，连接方式就是 BDC。
2. **只查对应平台候选设备**：

   ```bash
   # iOS / BDC
   bytedcli --json dora device list --os ios --device-type physical --usage idle --connect-state online

   # Android / ADB
   bytedcli --json dora device list --os android --device-type physical --usage idle --connect-state online
   ```

3. **占用候选设备**：

   ```bash
   bytedcli --json dora device occupy --serial <device-serial> --time-sec 3600
   ```

4. **占用后必须验证**：

   ```bash
   bytedcli --json dora device get --serial <device-serial>
   bytedcli --json dora device list --scope occupied
   ```

   验证点：目标 serial 出现在“我已占用”列表；平台仍是预期的 `ios` 或 `android`；连接状态为 online；用途变为远程调试/已占用。任一不满足，不要继续连接或安装，换一台重试。

5. **占用确认后立即续期，并再次确认**：

   ```bash
   bytedcli --json dora device renew --serial <device-serial> --time-sec 14400
   bytedcli --json dora device get --serial <device-serial>
   bytedcli --json dora device list --scope occupied
   ```

   续期策略：未指定时续到 Dora 允许的最大远程调试时长（当前最大 14400 秒）；如果用户指定占用时长，按用户时长续期但不能超过平台上限。续期失败时不要继续安装包，先说明设备可能很快过期并重新占用或重试续期。

6. **长时间任务启动自动续期守护**：

   如果任务可能超过当前占用时长，或用户明确要求“别让设备过期 / 快到期自动续期”，占用验证和首次续期成功后立即启动后台续期守护。默认策略：到期前 10 分钟触发续期；如果当前 Dora JSON 字段不好稳定解析到期时间，则使用保守轮询，每 50 分钟续到 14400 秒，并把每次 `get / renew / occupied` 结果写日志。

   ```bash
   DORA_SERIAL=<device-serial>
   DORA_RENEW_SEC=14400
   DORA_RENEW_INTERVAL_SEC=3000   # 50 分钟；必须短于当前租约剩余时长
   DORA_RENEW_LOG="/tmp/dora-renew-${DORA_SERIAL}.log"
   DORA_RENEW_PID="/tmp/dora-renew-${DORA_SERIAL}.pid"

   (
     while true; do
       date '+%Y-%m-%d %H:%M:%S %z'
       bytedcli --json dora device get --serial "$DORA_SERIAL"
       bytedcli --json dora device renew --serial "$DORA_SERIAL" --time-sec "$DORA_RENEW_SEC"
       bytedcli --json dora device list --scope occupied
       sleep "$DORA_RENEW_INTERVAL_SEC"
     done
   ) >> "$DORA_RENEW_LOG" 2>&1 &
   echo $! > "$DORA_RENEW_PID"
   ```

   启动后要说明 PID 和日志路径。任务结束或释放设备前必须停止守护，避免无人使用时继续续期：

   ```bash
   kill "$(cat /tmp/dora-renew-<device-serial>.pid)"
   rm -f "/tmp/dora-renew-<device-serial>.pid"
   bytedcli --json dora device release --serial <device-serial>
   ```

   自动续期守护失败时，优先看日志里的 `renew` 返回和续期后的 `device get` / `--scope occupied`；连续失败不要继续声称设备安全，重新占用或提醒用户。

7. **获取连接地址并连接本地**：

   - Android：

     ```bash
     bytedcli --json dora device adb --serial <device-serial>
     adb connect <host:port>
     adb -s <host:port-or-serial> get-state
     ```

   - iOS：

     ```bash
     bytedcli --json dora device bdc --serial <device-serial>
     bdc connect <bdc-address-or-command-from-dora>
     bdc devices
     ```

   连接验证不通过时不要安装。

8. **可选安装包**：仅当用户给了包路径或明确指定要找包时安装；未指定安装包时只占用、续期、按需启动自动续期守护并连接验证。

   - Android APK：

     ```bash
     adb -s <adb-serial> install -r -d <package.apk>
     ```

     如果云真机弹出 PackageInstaller 二次确认，可用 `adb shell uiautomator dump` 定位按钮，再 `adb shell input tap x y` 点击确认。

   - iOS IPA：

     ```bash
     bdc install --resign -u <ios-udid-or-bdc-id> <package.ipa>
     ```

     iOS 真机常见证书不匹配；默认加 `--resign`，不要先尝试无重签安装再失败。

9. **安装后验证**：Android 用 `pm list packages` 或启动 activity；iOS 用 `bdc` 的 app list/info/launch 能力验证 bundle 存在并可启动。没有包名 / bundle id 时，先从安装包元信息解析，不凭文件名猜。

## Notes

- `device list` 的主要筛选值使用语义化输入：`--usage idle|remote-debug|automation|ops|reserve|all`，`--connect-state online|offline|all`，`--os android|ios|windows|macos|linux|harmony|all`，`--device-type physical|vm|emulator|baymax|all`，`--level low|medium|high|all`。
- `--version` 按 Dora 页面设备系统版本过滤，`--manufacturer` 按品牌过滤。
- 文本输出会渲染关键字段；JSON 输出保留结构化结果，适合脚本继续解析。
- `adb` / `bdc` 文本模式输出可复制的连接命令或地址；需要原始字段时使用 JSON 模式。
- 设备操作按 Dora 页面接口执行，`occupy` 固定用于远程调试占用，`apply` 用于预约申请。

## 常见错误

- 不要使用 `bits dora ...` 或猜测 `dora device connect`；Dora 是顶层 `dora` 域，连接地址分别通过 `device adb` / `device bdc` 获取。
- 不要把 `adb` 当成 iOS 连接方式，也不要把 `bdc` 当成 Android 连接方式。
- 不要只看 `occupy` 命令返回成功；必须用 `device get` + `--scope occupied` 验证确实占到当前用户名下，然后执行 `device renew` 续期并再次确认。
- 不要为长时间占用只续期一次；用户要求保持占用或任务可能超过租约时，要启动自动续期守护，并记录 PID 与日志路径。
- 不要在释放设备后留下自动续期守护；释放前先 kill 对应 PID，否则可能无人使用时继续续期占住设备。
- 不要在多设备连接时省略 `adb -s` / `bdc -u`；安装必须指向刚才验证过的目标设备。
- 不要在用户未提供安装包、也未指定包来源时主动找包或猜包；这种场景只占用、续期、按需自动续期并连接验证。

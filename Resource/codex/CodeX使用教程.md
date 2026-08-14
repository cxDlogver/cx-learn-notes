# CodeX（Codex CLI）Windows 使用与配置教程

> 面向：在 Windows 上使用 OpenAI Codex CLI（简称 Codex CLI / codex）的日常开发者。  
> 说明：官方标注 **Windows 支持为实验性**，更推荐在 **WSL2** 中运行，以获得更稳定的沙箱与工具链体验。

## 目录

- [1. 你需要准备什么](#1-你需要准备什么)
- [2. 安装（推荐 WSL2）](#2-安装推荐-wsl2)
- [3. 安装（原生 Windows：实验性）](#3-安装原生-windows实验性)
- [4. 登录与鉴权](#4-登录与鉴权)
- [5. 配置文件与优先级](#5-配置文件与优先级)
- [6. Windows 沙箱与目录访问](#6-windows-沙箱与目录访问)
- [7. 常见 CLI 指令（终端命令）](#7-常见-cli-指令终端命令)
- [8. 常见 TUI 斜杠指令（交互界面内）](#8-常见-tui-斜杠指令交互界面内)
- [9. 常见用法示例（可直接复制）](#9-常见用法示例可直接复制)
- [10. 常见问题排查](#10-常见问题排查)
- [11. 参考](#11-参考)

---

## 1. 你需要准备什么

1) **Node.js**（如果用 npm 安装 codex）。推荐使用当前 LTS 版本。  
2) 一个可用的 **OpenAI 账号/鉴权方式**：
   - ChatGPT 登录（device code / browser），或
   - OpenAI API Key（适合 CI/脚本化）。
3) 建议准备一个干净的项目目录（尤其在 WSL 下尽量放在 Linux 文件系统里，例如 `~/code/...`）。

---

## 2. 安装（推荐 WSL2）

> WSL2 路线通常更顺：类 Linux 工具链齐全、文件权限模型更适配、沙箱更好用。

### 2.1 安装 WSL2

以管理员 PowerShell 运行：

```powershell
wsl --install
```

按提示完成安装并重启后，进入 WSL：

```powershell
wsl
```

### 2.2 在 WSL 中安装 Node（示例：nvm）

官方文档示例使用 `nvm`（Node Version Manager）。你也可以用系统包管理器或 `fnm` 等。

```bash
# 进入 WSL 之后执行（bash/zsh）
nvm install 22
nvm use 22
node -v
npm -v
```

### 2.3 在 WSL 中安装 Codex CLI

```bash
npm i -g @openai/codex
codex --help
```

---

## 3. 安装（原生 Windows：实验性）

> 原生 Windows 运行 codex 属于实验性路径；如果遇到沙箱/权限/路径问题，优先切到 WSL2。

### 3.1 安装 Node.js

安装完成后在 PowerShell 验证：

```powershell
node -v
npm -v
```

### 3.2 安装 Codex CLI

```powershell
npm i -g @openai/codex
codex --help
```

---

## 4. 登录与鉴权

Codex CLI 支持使用 ChatGPT 登录，也支持用 API Key 登录（便于自动化）。

### 4.1 ChatGPT 登录（交互式）

```powershell
codex login
```

它会提示打开浏览器/输入 device code 等流程。登录后可检查状态：

```powershell
codex login status
```

退出登录：

```powershell
codex logout
```

### 4.2 使用 API Key（适合脚本 / CI）

将 API Key 作为环境变量（PowerShell 当前会话）：

```powershell
$env:OPENAI_API_KEY = "sk-***"
```

把 Key 通过标准输入传给 codex（避免把 Key 写进命令历史）：

```powershell
$env:OPENAI_API_KEY | codex login --with-api-key
```

（可选）将环境变量写入“用户级”永久环境变量：

```powershell
[Environment]::SetEnvironmentVariable("OPENAI_API_KEY","sk-***","User")
```

### 4.3 鉴权文件保存在哪里

Codex CLI 会把凭据保存到 `CODEX_HOME`（默认 `~/.codex`）下的 `auth.json`。  
Windows 下 `~` 通常对应 `C:\Users\<你的用户名>\`。

---

## 5. 配置文件与优先级

Codex CLI 的配置文件为 `config.toml`，支持“用户级”和“项目级”两种位置。

### 5.1 配置文件位置

- 用户级：`~/.codex/config.toml`（Windows 示例：`C:\Users\<你>\.codex\config.toml`）
- 项目级：`<项目根目录>/.codex/config.toml`

项目级配置通常只在你“信任该目录”后生效（Codex 会提示你确认信任）。

### 5.2 配置优先级（从高到低）

1) CLI 显式参数（如 `--model` 等）
2) 项目级 `./.codex/config.toml`
3) 用户级 `~/.codex/config.toml`
4) 内置默认值

### 5.3 一个实用的 `config.toml` 示例

把下面内容放到 `~/.codex/config.toml`（或项目级 `./.codex/config.toml`），按需改动：

```toml
# 常用：指定默认模型（示例值，请按你账号可用模型调整）
model = "gpt-5"

# 常用：命令执行/写文件需要你确认（更安全）
approval_policy = "on-request"

# 常用：限制在工作区内写文件（适合大多数仓库）
sandbox_mode = "workspace-write"

# Windows 原生（实验性）可用的沙箱选项
[windows]
sandbox = "elevated"   # 或 "unelevated"
```

---

## 6. Windows 沙箱与目录访问

### 6.1 `sandbox_mode` 常见取值（跨平台）

你会在配置里看到 `sandbox_mode`，它控制 Codex 可以读写哪些路径以及能否运行外部命令。常见模式包括：

- `read-only`：尽量不修改文件
- `workspace-write`：允许在工作区内写入（推荐默认）
- `danger-full-access`：全盘访问（谨慎使用）

### 6.2 Windows 原生的沙箱开关（实验性）

在 Windows 原生运行时，配置里的：

```toml
[windows]
sandbox = "elevated"
```

表示使用“提升权限”的 Windows 沙箱方案（如果你理解并接受其风险/权限提示）。

### 6.3 需要额外读取目录时：`/sandbox-add-read-dir`

当 Codex 在 Windows 上因为沙箱限制读不到某些目录时，可以在交互界面输入：

```
/sandbox-add-read-dir <绝对路径>
```

例如：

```
/sandbox-add-read-dir F:\CX_notes
```

---

## 7. 常见 CLI 指令（终端命令）

> CLI 指令在 PowerShell / CMD / WSL 里运行；如果你已进入 Codex 的交互界面，则用下一节的“斜杠指令”。

### 7.1 启动交互界面

```powershell
codex
```

启动后你可以像聊天一样描述任务，例如“帮我修复某个测试”或“生成一份 README”。

### 7.2 直接执行一次性任务（非交互）

适合脚本化调用：

```powershell
codex exec "把当前目录下所有 *.md 的标题统一为 Title Case"
```

常用搭配：

- `--cd <dir>`：在指定目录执行（避免先 `cd`）
- `--model <name>`：临时指定模型
- `--sandbox <mode>`：临时指定沙箱策略

### 7.3 登录相关

```powershell
codex login
codex login status
codex logout
```

### 7.4 功能开关（features）

查看可用功能：

```powershell
codex features
```

（如果你的版本支持子命令）启用/禁用：

```powershell
codex features enable <feature_name>
codex features disable <feature_name>
```

---

## 8. 常见 TUI 斜杠指令（交互界面内）

进入 `codex` 交互界面后，可输入斜杠指令管理会话与工具状态（示例，具体以你安装版本为准）：

- `/help`：查看帮助
- `/model`：切换模型
- `/status`：查看当前会话/环境信息
- `/debug-config`：查看最终生效的配置（便于排查“为什么没按 config 生效”）
- `/diff`：查看当前工作区修改
- `/review`：让 Codex 做代码审查
- `/plan`：查看/切换计划视图（如你的版本支持）
- `/quit` 或 `/exit`：退出
- `/sandbox-add-read-dir <path>`：给 Windows 沙箱增加只读目录白名单

---

## 9. 常见用法示例（可直接复制）

### 9.1 让 Codex 修复一个报错

交互模式：

```text
我在运行单测时报错（粘贴错误堆栈），请定位根因并修复；修复后运行最相关的测试验证。
```

### 9.2 生成/更新文档

```text
请为这个仓库写一份 README：包含项目目的、快速开始、常见命令、目录结构说明。
```

### 9.3 做一次代码审查

在交互界面：

```text
/review
```

或直接描述：

```text
请审查我刚做的改动，重点看：安全风险、边界条件、可维护性、是否缺少测试。
```

### 9.4 只允许在工作区内写文件（更安全）

在 `~/.codex/config.toml` 设置：

```toml
sandbox_mode = "workspace-write"
approval_policy = "on-request"
```

---

## 10. 常见问题排查

### 10.1 `codex` 命令找不到

优先检查 npm 全局 bin 是否在 PATH：

```powershell
npm config get prefix
where codex
```

如果用 WSL，确认是在 WSL 里安装并在 WSL 里运行：

```bash
which codex
```

### 10.2 Windows 上读不到某个目录/文件

在交互界面使用：

```text
/sandbox-add-read-dir <绝对路径>
```

### 10.3 项目级配置不生效

在交互界面运行：

```text
/debug-config
```

检查：

- 是否放在 `./.codex/config.toml`
- 是否已“信任”该项目目录
- 是否被 CLI 参数覆盖（CLI 优先级最高）

### 10.4 WSL 下性能/文件监听很慢

把仓库放在 Linux 文件系统里（如 `~/code/...`），尽量不要放在 `/mnt/c/...`。

---

## 11. 参考

官方文档（建议以这里为准）：

- Codex CLI 文档入口：`https://developers.openai.com/codex/cli`
- Windows 说明：`https://developers.openai.com/codex/cli/windows`
- 配置基础：`https://developers.openai.com/codex/cli/config`
- 配置示例：`https://developers.openai.com/codex/cli/config#sample-config`
- 斜杠指令：`https://developers.openai.com/codex/cli/reference#slash-commands`


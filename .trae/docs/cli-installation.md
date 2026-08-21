# Trae Delivery CLI Installation

Export time: 2026-06-23

Scope: `/Users/bytedance/Desktop/BPO2/.trae`

This document lists the CLI dependencies used by the Trae delivery workflow and how to install or validate them on a new machine. It is intentionally credential-free. Do not paste tokens, cookies, UAT, JWT values, or browser profile data into this document.

## Dependency Groups

| Group | CLI | Required by | Install scope |
| --- | --- | --- | --- |
| Base shell/tools | `bash`, `git`, `rg`, `jq`, `python3`, `node`, `npm`, `npx`, `pnpm` | All local scripts, repo scan, JSON parsing, Node scripts | Machine |
| Node version manager | `nvm` | Stable project Node selection | Machine/user |
| Monorepo/project | `emo` / `eden-monorepo` | `EMO_MONOREPO` install/start/build/BAM | Global npm |
| Internal platform | `bytedcli` | BAM metadata, BITS develop task, Codebase review access, Feishu fallback, internal platform access | Global npm or `npx` |
| Codebase/MR | `bitscli` | Optional codebase/MR/CI workflows | Global npm |
| Feishu/Lark docs | `larkparser`, `larkparser-mcp`, `feishu-lark` | LarkParser fallback, doc/media/whiteboard extraction fallback | Global npm or `npx` |
| D2C/F2C | `codin-d2c`, `codin-d2c-mcp` | F2C/D2C evidence and MCP server | Global npm or `npx` |
| Browser automation | `playwright`, Chromium browser, optional `chrome-devtools-mcp` | CoCo / Trae CLI headless verify/design/mock browser evidence | Project or global npm / `npx` |
| MCP stdio launchers | `chrome-devtools-mcp`, `figma-developer-mcp`, `@byted/*` MCP packages | MCP servers in `mcp-servers.install.yaml` | Usually `npx`; global optional |

## Base Setup

Use a shell that can reach ByteDance internal network and npm registry.

```bash
# macOS / Homebrew baseline
brew install git jq ripgrep python node pnpm

# Optional but recommended for project Node pinning
brew install nvm
mkdir -p ~/.nvm
```

Add nvm to your shell profile if not already present:

```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"
```

Install and select the project Node line:

```bash
nvm install 18
nvm use 18
node -v
npm -v
npx -v
```

Current project context says this repo uses `EMO_MONOREPO`, `emo install`, and defaults to `nvm use 18` before execution-phase commands.

## Internal NPM Registry

For one-off commands:

```bash
NPM_CONFIG_REGISTRY=http://bnpm.byted.org npm view @bytedance-dev/bytedcli version
```

For this shell session:

```bash
export NPM_CONFIG_REGISTRY=http://bnpm.byted.org
```

For persistent npm config:

```bash
npm config set registry http://bnpm.byted.org
```

If a package fails to resolve, retry with `https://bnpm.byted.org/` because some tools and environments prefer HTTPS.

## Install Commands

### Required For This Workflow

```bash
# Monorepo CLI: provides emo / eden-monorepo / eden-mono.
npm install -g @ies/eden-monorepo@latest --registry=http://bnpm.byted.org

# ByteDance internal platform CLI.
npm install -g @bytedance-dev/bytedcli@latest --registry=http://bnpm.byted.org

# LarkParser CLI + MCP server: provides larkparser / larkparser-cli / larkparser-mcp.
npm install -g @byted/larkparser-cli@latest --registry=http://bnpm.byted.org

# Feishu/Lark MCP package also provides the feishu-lark CLI fallback.
npm install -g @i18n-ecom/feishu-lark-mcp-server@latest --registry=http://bnpm.byted.org

# D2C/F2C CLI + MCP server: provides codin-d2c / codin-d2c-mcp.
npm install -g @byted/codin-d2c-mcp@latest --registry=http://bnpm.byted.org

# Headless browser automation for CoCo / Trae CLI runtime evidence.
npm install -g playwright@latest --registry=http://bnpm.byted.org
npx playwright install chromium
```

### Optional But Useful

```bash
# Codebase / MR / CI wrapper.
npm install -g @byted/bits-cli@latest --registry=http://bnpm.byted.org
```

### MCP Packages Usually Launched By `npx`

These do not have to be installed globally if your MCP config uses `npx -y ...`.

```bash
npx -y --registry=http://bnpm.byted.org @byted/bytedance-figma-mcp --help
npx -y --registry=http://bnpm.byted.org @byted/byted_fe_mcp@latest --help
npx -y --registry=http://bnpm.byted.org @byted/mcp-lark-docs@latest --help
npx -y figma-developer-mcp --help
npx -y chrome-devtools-mcp@latest --help
npx -y playwright --version
```

Some MCP servers are stdio processes and may wait for MCP input instead of printing long help text. A version/banner or a clean startup attempt is enough for install validation.

## Auth Setup

Run auth setup interactively on the target machine. Never commit or export resulting credentials.

```bash
# bytedcli global auth
bytedcli auth login
bytedcli --json auth status

# Site-specific auth when needed
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth login
BYTEDCLI_CLOUD_SITE=i18n-tt bytedcli auth status

# Codebase/MR auth, optional
bitscli codebase auth login
bitscli codebase auth status

# LarkParser auth
larkparser auth login
larkparser auth status

# Feishu/Lark fallback sanity check
feishu-lark call feishu_get_user '{}'
```

For non-interactive LarkParser MCP, configure one of these in the target environment only:

```bash
export USER_JWT_EXEC="<command that prints a JWT>"
# or
export USER_JWT_TOKEN="<JWT value from secure secret manager>"
```

Do not write the resolved JWT value into repo files.

## Project Workflow Commands

Run these inside the execution repo root recorded by `.trae/DELIVERY_STATE.md`, not necessarily inside `.trae`.

```bash
source ~/.nvm/nvm.sh
nvm use 18

# Install repo dependencies
emo install

# Start main app used by this workflow
emo start alliance-operation-daren

# Build
emo scm

# BAM generation priority for this repo
emo run bam
# fallback only if the target app/package explicitly defines it
npm run bam
```

Current project context:

- repo command model: `EMO_MONOREPO`
- install command: `emo install`
- start command template: `emo start <package_name>`
- build command template: `emo scm`
- BAM command priority: `emo run bam`, then target app/package `npm run bam`

## Workflow Script Dependencies

| Script / stage | CLI dependencies |
| --- | --- |
| `.trae/scripts/collect_repo_snapshot.sh` | `bash`, `git`, `node` |
| `.trae/scripts/verify_frontend.sh` | `bash`, `node`, `npm` |
| `.trae/scripts/fetch_feishu_prd.sh` | `bash`, `npx`, `@bytedance-dev/bytedcli`, `python3` |
| `.trae/scripts/check_no_debug_code.sh` | `bash`, `git` |
| `.trae/scripts/check_changed_files.sh` | `bash`, `git` |
| `.trae/scripts/ensure_execution_workspace.sh` | `bash`, `git`, `python3`, `sed`, `tr` |
| `.trae/scripts/sync_bam_config_from_tech_doc.mjs` | `node` |
| `.trae/skills/feishu-doc-extractor/scripts/fetch-whiteboard-nodes.sh` | `bash`, `jq`, `feishu-lark` |
| `/delivery:bam` | `bytedcli`, `node`, `emo`, optional target `npm run bam` |
| `/delivery:mock` | `node`, `emo`, browser tooling, local port tools such as `lsof` / `ps` |
| `/delivery:verify` / `/delivery:design` | project start/build CLIs plus browser MCPs |
| `/delivery:bits --init` | `bytedcli`; `npx @bytedance-dev/bytedcli` only as fallback |
| `/delivery:bits --cr` | `bytedcli`, `git` |
| `/delivery:bits --coverage` | `node`, `git`; browser MCP dependency is listed in `mcp-config-export.md` |

## Browser Runtime Modes

The workflow has two browser branches:

- `TRAE_DESKTOP`: use Trae integrated browser first; system Chrome profile is only a desktop fallback for auth or profile reuse.
- `COCO_CLI_HEADLESS`: use headless browser automation, preferably Playwright Chromium. Reuse a dedicated user data dir or storage state for auth, and never paste cookie/JWT/token values into workflow files.

Headless verification must still use the vmok shell URL, not localhost deep links, and must collect DOM, screenshot, console, and Network evidence before closing verify/design/mock browser cases.

## Validation Checklist

```bash
command -v bash git rg jq python3 node npm npx pnpm
command -v emo bytedcli larkparser larkparser-mcp feishu-lark codin-d2c codin-d2c-mcp

node -v
npm -v
npx -v
pnpm -v
emo --version
bytedcli --version
larkparser --version
codin-d2c --version
codin-d2c-mcp --version

bytedcli --json auth status
larkparser auth status
feishu-lark call feishu_get_user '{}'
```

Optional:

```bash
command -v bitscli && bitscli --version
command -v bitscli && bitscli codebase auth status
```

## Current Machine Snapshot

Observed on the export machine:

| CLI | Observed path / version |
| --- | --- |
| `node` | `/opt/homebrew/bin/node`, `v26.0.0`; project commands should still use `nvm use 18` |
| `npm` / `npx` | `/opt/homebrew/bin/npm`, `11.12.1` |
| `pnpm` | `/opt/homebrew/bin/pnpm`, `9.1.4` |
| `git` | `/opt/homebrew/bin/git`, `2.54.0` |
| `jq` | `/usr/bin/jq`, `1.7.1-apple` |
| `rg` | `/Applications/Codex.app/Contents/Resources/rg`, `15.1.0` |
| `python3` | `/opt/homebrew/bin/python3`, `3.14.4` |
| `emo` | `/opt/homebrew/bin/emo`, `3.11.0` |
| `bitscli` | `/opt/homebrew/bin/bitscli`, `1.1.34` |
| `bytedcli` | `/Users/bytedance/.nvm/versions/node/v20.20.2/bin/bytedcli`, `0.59.0`; latest registry version observed: `0.85.0` |
| `larkparser` | `/Users/bytedance/.nvm/versions/node/v20.20.2/bin/larkparser`, `1.1.8`; latest registry version observed: `1.2.22` |
| `codin-d2c` / `codin-d2c-mcp` | `/opt/homebrew/bin/*`, `3.6.1`; latest registry version observed: `3.7.1` |

Snapshot paths are for audit only; do not copy them into new machine config.

## Common Issues

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `node` exists but project commands fail | Shell loaded Homebrew Node instead of project Node | `source ~/.nvm/nvm.sh && nvm use 18` before project commands. |
| `emo` not found | `@ies/eden-monorepo` not installed globally or global npm bin not in `PATH` | Install `@ies/eden-monorepo`, then reopen shell or add npm global bin to `PATH`. |
| Internal npm package not found | Registry not set to ByteDance internal registry | Use `--registry=http://bnpm.byted.org` or set `NPM_CONFIG_REGISTRY`. |
| `bytedcli` auth failure | Missing or expired internal login | Run `bytedcli auth login`; for i18n sites set `BYTEDCLI_CLOUD_SITE`. |
| `feishu-lark` or `larkparser` auth failure | Missing user-context Lark auth | Run `larkparser auth login` or `feishu-lark call feishu_auth ...` according to the tool output. |
| BAM command prints unexpected global `bam` banner | Wrong generator selected; project local dependency not installed | Run `emo install`, then retry `emo run bam` / target `npm run bam`. |
| `codin-d2c-mcp` asks for tokens | D2C/Figma credentials not configured in target environment | Configure required secrets through the target environment or secret manager; do not store them in repo. |

# Goofy Deploy
---
## Quick Preview / 快速预览部署

```bash
# Deploy current directory to a quick preview
bytedcli goofy preview deploy ./ --alias <alias>

# Update an existing alias
bytedcli goofy preview deploy ./dist --alias <alias> --override

# List previews
bytedcli goofy preview list --page 1 --page-size 20

# Remove a preview
bytedcli goofy preview remove --preview-id <preview_id>

# Open preview dashboard
bytedcli goofy preview dashboard
```

自动识别目录结构（`deploy.yml` / Next.js / 静态站点 / 构建产物），详见 `preview-directory.md`。

---

## Normal Project Deploy / 普通项目部署
### Sites

```bash
# List supported sites
bytedcli goofy deploy list-sites
```

### Common

``` bash
# Get Region Name By Region Id (such as: 2001 -> China-North)
bytedcli goofy deploy region-to-region-name --region <region_id>

# Get Region ID By Region Name (such as:  China-North -> 2001)
bytedcli goofy deploy region-name-to-region --region <region_name>
```

### Search Projects
```bash
# Search projects by name
bytedcli goofy deploy project search --mode by-name --query example-app
# Search projects by Scm Name
bytedcli goofy deploy project search --mode by-scm --query example/app
# Search projects by Git Repo
bytedcli goofy deploy project search --mode by-git --query example-repo
# Search projects by route
bytedcli goofy deploy project search --mode by-route --query deploy.example.com
```

### Teams

```bash
# Get team details
bytedcli goofy deploy get-team --team-id <team_id>
```

### Projects

```bash
# List projects in a team
bytedcli goofy deploy list-projects --team-id <team_id> --page 1 --page-size 20

# Get project details
bytedcli goofy deploy get-project --app-id <app_id>

# Get project build configuration (app type, SCM, build/deploy platform)
bytedcli goofy deploy get-build-config --app-id <app_id>
```

### Regions & Channels

```bash
# List deployment regions for a project
bytedcli goofy deploy list-regions --app-id <app_id>

# Create a deployment channel (requires region-id); defaults to env-name based traffic matching
bytedcli goofy deploy create-channel \
  --region-id <region_id> \
  --name <channel_name> \
  --env-name <env_name>

# Create a deployment channel with header-based traffic matching
# Header mode does not require --env-name; --header-key and --header-value must be provided together; --header-op defaults to 1 (= equals)
bytedcli goofy deploy create-channel \
  --region-id <region_id> \
  --name <channel_name> \
  --header-key fe-env \
  --header-value <header_value>

# List deployment channels for a project
bytedcli goofy deploy list-channels --app-id <app_id>
bytedcli goofy deploy list-channels --app-id <app_id> --env-name <env_name>
bytedcli goofy deploy list-channels --app-id <app_id> --keyword <name_substring>

# Get channel details
bytedcli goofy deploy get-channel --channel-id <channel_id>
```

### Deployments

```bash
# List deployment history for a project
bytedcli goofy deploy list-deployments --app-id <app_id> --page 1 --page-size 20

# List deployment history for a specific channel (app-id is not required)
bytedcli goofy deploy list-deployments --channel-id <channel_id>

# Provide both flags; --channel-id takes precedence and --app-id is ignored
# (a note is emitted in text mode; JSON output includes ignored_app_id: true)
bytedcli goofy deploy list-deployments --app-id <app_id> --channel-id <channel_id>

# Get deployment details (by ID or URL)
bytedcli goofy deploy get-deployment <deploy_url_or_id>
bytedcli goofy deploy get-deployment --deploy-id <deploy_id>

# Diagnose a deployment failure (by ID or URL)
bytedcli goofy deploy diagnose <deploy_url_or_id>
bytedcli -j goofy deploy diagnose <deploy_url_or_id>
# Also fetch and render the latest pipeline node log (last 300 lines)
bytedcli goofy deploy diagnose <deploy_url_or_id> --show-deployment-log
```

### Triggering Deployments

#### Deploy New Version (from git branch + commit)

```bash
bytedcli goofy deploy deploy-new \
  --channel-id <channel_id> \
  --git-branch <branch_name> \
  --commit-hash <commit_hash>

# Deploy and wait for completion
bytedcli goofy deploy deploy-new \
  --channel-id <channel_id> \
  --git-branch <branch_name> \
  --commit-hash <commit_hash> \
  --wait --wait-timeout-sec 900 --poll-interval-sec 15
```

### Deploy Existing Version (from existed scm version)

```bash
bytedcli goofy deploy deploy-version \
  --channel-id <channel_id> \
  --scm-version <version>

# Deploy and wait
bytedcli goofy deploy deploy-version \
  --channel-id <channel_id> \
  --scm-version <version> \
  --wait --poll-interval-sec 10
```

### Deployment Lifecycle

```bash
# Cancel a running/pending deployment (by ID or URL)
bytedcli goofy deploy cancel <deploy_url_or_id>
bytedcli goofy deploy cancel --deploy-id <deploy_id>

# Retry a failed deployment with the same parameters (by ID or URL)
bytedcli goofy deploy retry <deploy_url_or_id>
bytedcli goofy deploy retry --deploy-id <deploy_id> --wait --poll-interval-sec 10

# Rollback channel to previous online version
bytedcli goofy deploy rollback --channel-id <channel_id>
bytedcli goofy deploy rollback --channel-id <channel_id> --wait --poll-interval-sec 10
```

## Example Workflow

```bash
# 1. List regions
bytedcli goofy deploy list-regions --app-id 131716
# Output shows region IDs like 224335

# 2. (Optional) create channel
bytedcli goofy deploy create-channel \
  --region-id 224335 \
  --name demo-test \
  --env-name ppe_demo_test

# 3. Get project channels
bytedcli goofy deploy list-channels --app-id 131716
# Output shows channel IDs like 3520795

# 4. Check recent deployments
bytedcli goofy deploy list-deployments --app-id 131716
# Output shows versions like 1.0.0.47

# 5a. Deploy by git branch + commit
bytedcli goofy deploy deploy-new \
  --channel-id 3520795 \
  --git-branch main \
  --commit-hash abc123def456 \
  --wait

# 5b. Or deploy by existed scm version
bytedcli goofy deploy deploy-version \
  --channel-id 3520795 \
  --scm-version 1.0.0.47

# 6. If deployment fails, diagnose it (paste the URL directly)
bytedcli goofy deploy diagnose "https://cloud.bytedance.net/goofy/channel/3520795/deploy?deploymentId=12345678"
#   optionally include the pipeline node log for deeper debugging
bytedcli goofy deploy diagnose 12345678 --show-deployment-log

# 7. Retry the failed deployment
bytedcli goofy deploy retry 12345678 --wait --poll-interval-sec 10

# 8. Or rollback to previous version
bytedcli goofy deploy rollback --channel-id 3520795 --wait --poll-interval-sec 10
```

## Aliases

- 主入口：`goofy deploy *` / `goofy preview *`
- 可用别名：`gd` = `goofy-deploy`

---
name: bytedance-lg-admin
description: "Use when tasks involve LG Admin Torch package releases, Torch image builds, build-history form submission, cpu/cuda/mlu Torch version selection, use-cache, skip-arm, image rebuild, or custom image options through bytedcli lg-admin."
---

# LG Admin

Use `bytedcli lg-admin` for LG Admin operations. The current command surface covers the lg-admin Torch release page. Do not use this skill for general ICM release, history, repo, or build queries. Names containing lagrange, torch, cpu, cuda, or mlu may be repo/package identifiers; they are not enough to route to LG Admin. Do not use or describe `lagrange torch`. Use `bytedcli lg-admin torch` only when the user asks to submit a Torch package/image release, or to query a known LG Admin image task/build version.

## Torch Releases

Package release, matching the build history form:

```bash
bytedcli lg-admin torch release package build \
  --branch demo-branch \
  --platform cpu=2.7 \
  --platform cuda=2.10 \
  --platform mlu=2.10 \
  --comment dev
```

Submit with `--yes`; without it the command fetches meta and permission, then renders a dry-run summary.

Useful package release flags:

- `--release-type DEV|LTS`
- `--pub-base branch|tag|commit`, plus `--branch`, `--git-tag`, or `--git-commit`
- `--regions cn,va`
- `--platform cpu=2.10`, repeatable for `cpu`, `cuda`, `mlu`, or other supported platforms
- `--use-cache` / `--no-use-cache`
- `--skip-arm`, `--skip-arch <arch>`
- `--image-mode default|rebuild|custom|custom-cmd`
- `--image platform=namespace/image:tag` for `--image-mode custom`
- `--cmd-option platform=cmd` for `--image-mode custom-cmd`
- `--skip-permission`

Image release, matching the ICM build history form:

```bash
bytedcli lg-admin torch release image build \
  --branch demo-branch \
  --compute-platforms cpu,cuda,mlu \
  --regions cn \
  --comment dev
```

Query an image release task:

```bash
bytedcli lg-admin torch release image get --task-id 821
```

Useful image release flags:

- `--release-type DEV|LTS`
- `--pub-base branch|tag|commit`, plus `--branch`, `--git-tag`, or `--git-commit`
- `--regions cn,va`
- `--compute-platforms cpu,cuda,mlu`
- `--build-describe <text>`
- `--yes`

Routing hints for agents:

- User asks for ICM release/history/repo/build queries, including ICM prod, recent releases, build commit, build repository, or repo/build metadata: do not use this skill; use the top-level `icm` command/skill. Repo/package names containing lagrange, torch, cpu, cuda, or mlu do not change this routing.
- User asks to 发 LG 镜像 / 发布 LG 镜像 / LG Torch 镜像 / LG Admin 镜像 / build LG image / LG image release: use `lg-admin torch release image build`; use `lg-admin torch release image get` only when querying a known LG Admin image task id or build version.
- User asks to 发版 / 发版本 / 发布版本 / package release / Torch 版本发版: use `lg-admin torch release package build`.

## Auth And Headers

The native commands use the ByteCloud personal JWT flow and send lg-admin headers:

- `X-Jwt-Token`
- `X-Lgx-Admin-Control-Plane`, default `cn`
- `X-Lgx-Admin-Region`, default `cn`
- `X-Lgx-Admin-Domain-Id`, default `online`

Override API or header values with `--host`, `--control-plane`, `--admin-region`, and `--domain-id`.

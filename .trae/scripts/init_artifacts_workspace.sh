#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <artifacts-workspace>" >&2
  exit 2
fi

WORKSPACE="$1"
mkdir -p "$WORKSPACE"

write_template_if_missing() {
  local relative_path="$1"
  local target="$WORKSPACE/$relative_path"

  if [ -e "$target" ]; then
    echo "skipped_existing_file:$relative_path"
    return 0
  fi

  mkdir -p "$(dirname "$target")"
  cat > "$target"
  echo "created_file:$relative_path"
}

write_template_if_missing "prd-source.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# PRD Source

- source_type: `pending`
- source_location: `pending`
- note: `等待权威需求原文写入`
EOF

write_template_if_missing "00-inputs.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 00 Inputs
EOF

write_template_if_missing "01-intake.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 01 Intake
EOF

write_template_if_missing "02-task-space.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 02 Task Space
EOF

write_template_if_missing "03-prd-analysis.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 03 PRD Analysis
EOF

write_template_if_missing "04-tech-plan.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 04 Tech Plan
EOF

write_template_if_missing "05-implementation-log.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 05 Implementation Log
EOF

write_template_if_missing "06-debug-verification.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 06 Debug Verification
EOF

write_template_if_missing "07-design-alignment.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 07 Design Alignment
EOF

write_template_if_missing "08-acceptance-report.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# 08 Acceptance Report
EOF

write_template_if_missing "ui-source-map.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# UI Source Map
EOF

write_template_if_missing "uncertainty-register.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# Uncertainty Register
EOF

write_template_if_missing "omission-risk-scan.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# Omission Risk Scan
EOF

write_template_if_missing "decision-log.md" <<'EOF'
> status: TEMPLATE_ONLY
> 当前文件是初始化模板，不代表阶段已执行完成。

# Decision Log
EOF

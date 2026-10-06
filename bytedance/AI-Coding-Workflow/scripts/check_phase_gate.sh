#!/usr/bin/env bash
set -euo pipefail

# Lightweight gate checker for humans/agents.
# Usage: .trae/scripts/check_phase_gate.sh <workspace> <phase>

WORKSPACE="${1:-}"
PHASE="${2:-}"

if [[ -z "$WORKSPACE" || -z "$PHASE" ]]; then
  echo "Usage: $0 <workspace> <phase>" >&2
  exit 2
fi

if [[ ! -d "$WORKSPACE" ]]; then
  echo "BLOCKED: workspace not found: $WORKSPACE" >&2
  exit 2
fi

case "$PHASE" in
  prd)
    [[ -s "$WORKSPACE/prd-source.md" ]] || { echo "BLOCKED: missing prd-source.md" >&2; exit 2; }
    ;;
  plan)
    [[ -s "$WORKSPACE/03-prd-analysis.md" ]] || { echo "BLOCKED: missing 03-prd-analysis.md" >&2; exit 2; }
    grep -q "P0" "$WORKSPACE/uncertainty-register.md" 2>/dev/null && echo "WARN: uncertainty-register contains P0; agent must decide whether it blocks planning" >&2
    ;;
  mock)
    [[ -s "$WORKSPACE/04-tech-plan.md" ]] || { echo "BLOCKED: missing 04-tech-plan.md" >&2; exit 2; }
    grep -q "Implementation Mode: MOCK_PREVIEW\|Implementation Mode.*MOCK_PREVIEW" "$WORKSPACE/04-tech-plan.md" || { echo "BLOCKED: tech plan is not MOCK_PREVIEW" >&2; exit 2; }
    ;;
  task)
    [[ -s "$WORKSPACE/04-tech-plan.md" ]] || { echo "BLOCKED: missing 04-tech-plan.md" >&2; exit 2; }
    ;;
  code)
    [[ -s "$WORKSPACE/04-tech-plan.md" ]] || { echo "BLOCKED: missing 04-tech-plan.md" >&2; exit 2; }
    [[ -s "$WORKSPACE/delivery-task.md" ]] || { echo "BLOCKED: missing delivery-task.md; run /delivery:task" >&2; exit 2; }
    [[ -s "$WORKSPACE/09-test-case-matrix.md" ]] || { echo "BLOCKED: missing 09-test-case-matrix.md; run /delivery:task" >&2; exit 2; }
    grep -q "Plan Readiness.*READY\|READY" "$WORKSPACE/04-tech-plan.md" || { echo "BLOCKED: tech plan is not READY" >&2; exit 2; }
    ;;
  verify)
    [[ -s "$WORKSPACE/05-implementation-log.md" ]] || { echo "BLOCKED: missing implementation log" >&2; exit 2; }
    ;;
  design)
    [[ -s "$WORKSPACE/06-debug-verification.md" ]] || { echo "BLOCKED: missing verification report" >&2; exit 2; }
    ;;
  accept)
    [[ -s "$WORKSPACE/07-design-alignment.md" ]] || { echo "BLOCKED: missing design alignment report" >&2; exit 2; }
    ;;
  *)
    echo "Unknown phase: $PHASE" >&2
    exit 2
    ;;
esac

echo "Gate check completed for phase: $PHASE"

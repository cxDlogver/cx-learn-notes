#!/usr/bin/env python3
"""Send Ask First cards and receive Feishu card callbacks over long connection."""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import threading
import time
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any


CN_TZ = timezone(timedelta(hours=8))
CHOICE_VALUES = {"A", "B", "C", "D"}
BLOCKING_OPTION_PHRASES = (
    "当前暂停",
    "暂停当前流程",
    "等配置补齐",
    "等后端",
    "现在补",
    "先补",
    "继续补",
    "补扫",
    "重新抓取",
    "重跑",
    "不能继续",
    "升级为 P0",
    "等待补图",
    "等待设计补图",
    "等待配置",
    "等待后端",
)
BLOCKING_CUSTOM_INPUT_PHRASES = BLOCKING_OPTION_PHRASES + (
    "需要补图",
    "需要补设计图",
    "先不要继续",
    "暂不继续",
)
NON_BLOCKING_PHRASES = (
    "不阻塞",
    "不作为当前阻塞",
    "不作为阻塞",
    "而不是等待",
    "不是等待",
    "不需要等待",
    "无需等待",
)
ENV_NAME_PATTERN = re.compile(r"^[A-Z_][A-Z0-9_]*$")
EMAIL_PATTERN = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
FORBIDDEN_SECRET_CONFIG_KEYS = {
    "secret",
    "appsecret",
    "clientsecret",
    "tenantaccesstoken",
    "useraccesstoken",
}


@dataclass
class DecisionSpec:
    decision_id: str
    title: str
    level: str
    background: str
    why_now: str
    recommended: str
    options: dict[str, str]


@dataclass
class AskFirstContext:
    workspace: Path
    delivery_state_path: Path
    request_path: Path
    card_path: Path
    request_text: str
    card: dict[str, Any]
    metadata: dict[str, str]
    decisions: dict[str, DecisionSpec]

    @property
    def request_id(self) -> str:
        return self.metadata["request_id"]

    @property
    def next_command_after_pass(self) -> str:
        return self.metadata["next_command_after_pass"]

    @property
    def resume_command(self) -> str:
        return self.metadata["resume_command"]


@dataclass
class RuntimeSettings:
    app_id: str
    app_secret: str
    receive_id_type: str
    receiver_id: str
    receiver_query: str


def now_text() -> str:
    return datetime.now(CN_TZ).strftime("%Y-%m-%d %H:%M:%S +0800")


def json_dump(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def markdown_cell(value: Any) -> str:
    text = "" if value is None else str(value)
    return text.replace("\n", "<br>").replace("|", "\\|").strip()


def looks_like_email(value: str) -> bool:
    return bool(EMAIL_PATTERN.match(value.strip()))


def extract_code_or_text(value: str) -> str:
    value = value.strip()
    match = re.search(r"`([^`]+)`", value)
    if match:
        return match.group(1).strip()
    return value.strip("`").strip()


def clean_markdown_field(value: str) -> str:
    return value.strip().replace("`", "")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.write_text(content, encoding="utf-8")


def append_text(path: Path, content: str) -> None:
    with path.open("a", encoding="utf-8") as file:
        file.write(content)


def load_json(path: Path) -> Any:
    return json.loads(read_text(path))


def find_trae_root(start: Path | None = None) -> Path:
    current = (start or Path(__file__)).expanduser().resolve()
    if current.is_file():
        current = current.parent
    for path in (current, *current.parents):
        if (path / "AGENTS.md").exists() and ((path / "PROJECT_CONTEXT.md").exists() or path.name == ".trae"):
            return path
    raise FileNotFoundError(f"无法从 {current} 向上定位 .trae 根目录")


def object_to_plain(value: Any) -> Any:
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, dict):
        return {str(k): object_to_plain(v) for k, v in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [object_to_plain(v) for v in value]
    if hasattr(value, "__dict__"):
        return {
            key: object_to_plain(item)
            for key, item in vars(value).items()
            if not key.startswith("_")
        }
    return str(value)


def get_nested(value: Any, *path: str, default: Any = None) -> Any:
    current = value
    for part in path:
        if current is None:
            return default
        if isinstance(current, dict):
            current = current.get(part)
        else:
            current = getattr(current, part, None)
    return default if current is None else current


def parse_request_metadata(request_text: str) -> dict[str, str]:
    metadata: dict[str, str] = {}
    for line in request_text.splitlines():
        match = re.match(r"^- ([A-Za-z0-9_/-]+):\s*(.*)$", line)
        if not match:
            continue
        key, value = match.groups()
        metadata[key] = extract_code_or_text(value)
    required_keys = ["request_id", "resume_command", "next_command_after_pass"]
    missing = [key for key in required_keys if key not in metadata or not metadata[key]]
    if missing:
        raise ValueError(f"ask-first-request.md 缺少必需路由字段: {', '.join(missing)}")
    return metadata


def parse_decisions(request_text: str, card: dict[str, Any]) -> dict[str, DecisionSpec]:
    decisions: dict[str, DecisionSpec] = {}
    pattern = re.compile(r"^### (AF-\d{3})\. (.+)$", re.MULTILINE)
    matches = list(pattern.finditer(request_text))

    for index, match in enumerate(matches):
        decision_id, title = match.groups()
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(request_text)
        block = request_text[start:end]
        level = find_field(block, "当前分级")
        background = find_field(block, "背景证据")
        why_now = find_field(block, "为什么现在问")
        recommended = find_field(block, "推荐策略").upper()
        options = parse_options(block)
        decisions[decision_id] = DecisionSpec(
            decision_id=decision_id,
            title=title.strip(),
            level=level,
            background=background,
            why_now=why_now,
            recommended=recommended if recommended in CHOICE_VALUES else "",
            options=options,
        )

    if decisions:
        return decisions

    for decision_id in find_decision_ids_in_card(card):
        decisions[decision_id] = DecisionSpec(
            decision_id=decision_id,
            title=decision_id,
            level="UNKNOWN",
            background="ask-first-card.json",
            why_now="卡片字段合同要求用户确认",
            recommended="",
            options={choice: choice for choice in sorted(CHOICE_VALUES)},
        )
    return decisions


def find_field(block: str, label: str) -> str:
    match = re.search(rf"^- {re.escape(label)}：(.+)$", block, re.MULTILINE)
    return clean_markdown_field(match.group(1)) if match else ""


def parse_options(block: str) -> dict[str, str]:
    options: dict[str, str] = {}
    for line in block.splitlines():
        match = re.match(r"\s+- ([A-D])\. (.+)$", line)
        if match:
            choice, text = match.groups()
            options[choice] = text.strip()
    return options


def find_decision_ids_in_card(card: Any) -> list[str]:
    found: list[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            ids = value.get("decision_ids")
            if isinstance(ids, list):
                found.extend(str(item) for item in ids)
            for item in value.values():
                walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    walk(card)
    return sorted(set(found))


def load_context(workspace: Path, delivery_state: Path | None) -> AskFirstContext:
    workspace = workspace.expanduser().resolve()
    trae_root = find_trae_root()
    delivery_state_path = (delivery_state or trae_root / "DELIVERY_STATE.md").expanduser().resolve()
    request_path = workspace / "ask-first-request.md"
    card_path = workspace / "ask-first-card.json"

    missing = [path for path in (request_path, card_path, delivery_state_path) if not path.exists()]
    if missing:
        raise FileNotFoundError("缺少必需文件: " + ", ".join(str(path) for path in missing))

    request_text = read_text(request_path)
    card = load_json(card_path)
    metadata = parse_request_metadata(request_text)
    decisions = parse_decisions(request_text, card)
    if not decisions:
        raise ValueError("没有从 ask-first-request.md 或 ask-first-card.json 解析到决策项")

    return AskFirstContext(
        workspace=workspace,
        delivery_state_path=delivery_state_path,
        request_path=request_path,
        card_path=card_path,
        request_text=request_text,
        card=card,
        metadata=metadata,
        decisions=decisions,
    )


def field_name(decision_id: str, suffix: str) -> str:
    number = decision_id.split("-")[1].lower()
    return f"af_{number}_{suffix}"


def normalize_choice(value: Any) -> str:
    if isinstance(value, dict):
        if "value" in value:
            return normalize_choice(value["value"])
        if "text" in value:
            return normalize_choice(value["text"])
    if isinstance(value, list) and value:
        return normalize_choice(value[0])
    return str(value).strip().upper()


def normalize_input(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, dict):
        if "value" in value:
            return normalize_input(value["value"])
        if "text" in value:
            return normalize_input(value["text"])
    if isinstance(value, list):
        return ", ".join(normalize_input(item) for item in value if normalize_input(item))
    return str(value).strip()


def parse_form_value(context: AskFirstContext, form_value: dict[str, Any]) -> list[dict[str, Any]]:
    parsed: list[dict[str, Any]] = []
    errors: list[str] = []

    for decision_id, spec in sorted(context.decisions.items()):
        choice_field = field_name(decision_id, "choice")
        input_field = field_name(decision_id, "custom_input")
        raw_choice = form_value.get(choice_field)
        if raw_choice is None:
            errors.append(f"{decision_id} 缺少选择")
            continue

        choice = normalize_choice(raw_choice)
        custom_input = normalize_input(form_value.get(input_field))
        if choice not in CHOICE_VALUES:
            errors.append(f"{decision_id} 选择值无效: {choice}")
            continue
        if choice == "D" and not custom_input:
            errors.append(f"{decision_id} 选择 D 时必须填写补充说明")
            continue

        option_text = spec.options.get(choice, "")
        status = decide_status(choice, custom_input, spec)
        parsed.append(
            {
                "id": decision_id,
                "title": spec.title,
                "level": spec.level,
                "recommended": spec.recommended,
                "choice": choice,
                "custom_input": custom_input,
                "option_text": option_text,
                "background": spec.background,
                "why_now": spec.why_now,
                "status": status,
                "blocks_next_stage": blocks_next_stage(status, option_text, custom_input),
            }
        )

    if errors:
        raise ValueError("；".join(errors))
    return parsed


def load_fallback_form_value(raw: str) -> dict[str, Any]:
    value = raw.strip()
    if not value:
        raise ValueError("fallback form value 不能为空")
    if value.startswith("@"):
        return load_json(Path(value[1:]))
    if value.startswith("{"):
        parsed = json.loads(value)
        if not isinstance(parsed, dict):
            raise ValueError("fallback form value JSON 必须是 object")
        return parsed

    form_value: dict[str, Any] = {}
    parts = [part.strip() for part in re.split(r"[;\n,]+", value) if part.strip()]
    for part in parts:
        match = re.match(r"^(AF-\d{3})(?:_(choice|custom_input|input))?\s*[:=]\s*(.+)$", part, re.IGNORECASE)
        if not match:
            raise ValueError(f"无法解析 fallback 表达式片段: {part}")
        decision_id, suffix, item_value = match.groups()
        suffix = "choice" if suffix is None else ("custom_input" if suffix == "input" else suffix)
        form_value[field_name(decision_id.upper(), suffix)] = item_value.strip()
    return form_value


def decide_status(choice: str, custom_input: str, spec: DecisionSpec) -> str:
    custom_upper = custom_input.upper()
    if "P0" in custom_upper or "阻塞" in custom_input:
        return "USER_ESCALATED_TO_P0"
    if "P1" in custom_upper and "降级" in custom_input:
        return "USER_DOWNGRADED_TO_P1"
    if "P2" in custom_upper and "降级" in custom_input:
        return "USER_DOWNGRADED_TO_P2"
    if "跳过" in custom_input or "延期" in custom_input:
        return "USER_DEFERRED_PLAN_RISK"
    if choice == "D":
        return "USER_CONFIRMED_CUSTOM"
    if spec.recommended and choice == spec.recommended:
        return "USER_AUTHORIZED_RECOMMENDED_STRATEGY"
    return "USER_CONFIRMED"


def blocks_next_stage(status: str, option_text: str, custom_input: str) -> bool:
    if status == "USER_ESCALATED_TO_P0":
        return True

    def normalize_for_blocking_check(text: str) -> str:
        normalized = text.strip()
        for phrase in NON_BLOCKING_PHRASES:
            normalized = normalized.replace(phrase, " ")
        return normalized

    normalized_option = normalize_for_blocking_check(option_text)
    normalized_input = normalize_for_blocking_check(custom_input)
    return any(phrase in normalized_option for phrase in BLOCKING_OPTION_PHRASES) or any(
        phrase in normalized_input for phrase in BLOCKING_CUSTOM_INPUT_PHRASES
    )


def append_jsonl(path: Path, record: dict[str, Any]) -> None:
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def load_processed_keys(events_path: Path) -> set[str]:
    if not events_path.exists():
        return set()
    processed: set[str] = set()
    for line in read_text(events_path).splitlines():
        if not line.strip():
            continue
        try:
            record = json.loads(line)
        except json.JSONDecodeError:
            continue
        key = record.get("idempotency_key")
        if key and record.get("status") == "processed":
            processed.add(str(key))
    return processed


def build_feedback(
    context: AskFirstContext,
    event_id: str,
    operator_open_id: str,
    open_message_id: str,
    open_chat_id: str,
    decisions: list[dict[str, Any]],
    source: str = "FEISHU_CARD_LONG_CONNECTION",
) -> dict[str, Any]:
    blocked = any(item["blocks_next_stage"] for item in decisions)
    return {
        "request_id": context.request_id,
        "submitted_at": now_text(),
        "source": source,
        "event_id": event_id,
        "operator_open_id": operator_open_id,
        "open_message_id": open_message_id,
        "open_chat_id": open_chat_id,
        "result": "BLOCKED" if blocked else "PASS",
        "resume_command": context.resume_command,
        "next_command_after_pass": context.next_command_after_pass,
        "decisions": decisions,
    }


def persist_feedback(context: AskFirstContext, feedback: dict[str, Any]) -> None:
    write_text(context.workspace / "ask-first-feedback.json", json_dump(feedback) + "\n")
    write_resume_request(context, feedback)
    append_decision_log(context, feedback)
    append_prd_notes(context, feedback)
    append_uncertainty_updates(context, feedback)
    update_delivery_state(context, feedback)


def write_resume_request(context: AskFirstContext, feedback: dict[str, Any]) -> None:
    target_command = feedback["next_command_after_pass"] if feedback["result"] == "PASS" else feedback["resume_command"]
    marker = {
        "request_id": feedback["request_id"],
        "status": "READY",
        "result": feedback["result"],
        "target_command": target_command,
        "resume_command": feedback["resume_command"],
        "next_command_after_pass": feedback["next_command_after_pass"],
        "submitted_at": feedback["submitted_at"],
        "source": feedback["source"],
        "feedback_path": str(context.workspace / "ask-first-feedback.json"),
        "delivery_state_path": str(context.delivery_state_path),
    }
    write_text(context.workspace / "ask-first-resume-request.json", json_dump(marker) + "\n")


def append_decision_log(context: AskFirstContext, feedback: dict[str, Any]) -> None:
    path = context.workspace / "decision-log.md"
    text = read_text(path) if path.exists() else "# Decision Log\n"
    if "## Ask First Decisions" not in text:
        text = text.rstrip() + (
            "\n\n## Ask First Decisions\n\n"
            "| Date | ID | Topic | Decision | Chosen Strategy | Alternatives Considered | Reason | Evidence | Impact on Plan | Status |\n"
            "|---|---|---|---|---|---|---|---|---|---|\n"
        )
    rows = []
    for item in feedback["decisions"]:
        alternatives = "; ".join(
            f"{choice}: {option_text}"
            for choice, option_text in sorted(context.decisions[item["id"]].options.items())
        )
        chosen = item["custom_input"] if item["choice"] == "D" else item["option_text"]
        impact = build_impact_text(feedback, item)
        rows.append(
            "| {date} | {id} | {topic} | {decision} | {chosen} | {alts} | {reason} | {evidence} | {impact} | {status} |".format(
                date=markdown_cell(feedback["submitted_at"]),
                id=markdown_cell(item["id"]),
                topic=markdown_cell(item["title"]),
                decision=markdown_cell(f"用户选择 {item['choice']}"),
                chosen=markdown_cell(chosen),
                alts=markdown_cell(alternatives),
                reason=markdown_cell(item["custom_input"] or item["why_now"]),
                evidence=markdown_cell(f"ask-first-request.md；{item['background']}"),
                impact=markdown_cell(impact),
                status=markdown_cell(item["status"]),
            )
        )
    write_text(path, text.rstrip() + "\n" + "\n".join(rows) + "\n")


def append_prd_notes(context: AskFirstContext, feedback: dict[str, Any]) -> None:
    path = context.workspace / "prd-notes.md"
    text = read_text(path) if path.exists() else "# PRD Notes\n"
    lines = [
        "",
        "## Ask First Final Decisions",
        "",
        f"- request_id: `{feedback['request_id']}`",
        f"- submitted_at: `{feedback['submitted_at']}`",
        f"- result: `{feedback['result']}`",
        f"- next_command_after_pass: `{feedback['next_command_after_pass']}`",
        "",
        "| ID | Title | Choice | Final Strategy | User Input | Status |",
        "|---|---|---|---|---|---|",
    ]
    for item in feedback["decisions"]:
        final_strategy = item["custom_input"] if item["choice"] == "D" else item["option_text"]
        lines.append(
            "| {id} | {title} | {choice} | {strategy} | {input} | {status} |".format(
                id=markdown_cell(item["id"]),
                title=markdown_cell(item["title"]),
                choice=markdown_cell(item["choice"]),
                strategy=markdown_cell(final_strategy),
                input=markdown_cell(item["custom_input"]),
                status=markdown_cell(item["status"]),
            )
        )

    lines.extend(
        [
            "",
            "## Ask First Feedback Source",
            "",
            "| item | value |",
            "|---|---|",
            f"| source | `FEISHU_CARD_LONG_CONNECTION` |",
            f"| operator_open_id | `{markdown_cell(feedback.get('operator_open_id'))}` |",
            f"| open_message_id | `{markdown_cell(feedback.get('open_message_id'))}` |",
            f"| open_chat_id | `{markdown_cell(feedback.get('open_chat_id'))}` |",
            f"| event_id | `{markdown_cell(feedback.get('event_id'))}` |",
            "",
            "## Ask First Impact on Plan",
            "",
            "| ID | Impact |",
            "|---|---|",
        ]
    )
    for item in feedback["decisions"]:
        lines.append(f"| {markdown_cell(item['id'])} | {markdown_cell(build_impact_text(feedback, item))} |")

    lines.extend(
        [
            "",
            "## Ask First Follow-up Trigger",
            "",
            "| item | value |",
            "|---|---|",
            f"| trigger_time | `{feedback['submitted_at']}` |",
            f"| trigger_source | `{markdown_cell(feedback['source'])}` |",
            f"| target_command | `{feedback['next_command_after_pass'] if feedback['result'] == 'PASS' else feedback['resume_command']}` |",
            f"| result | `{feedback['result']}` |",
            "| note | Python 长连接服务负责落盘并写入 `ask-first-resume-request.json`；Codex heartbeat 看到 READY marker 后唤醒主 Agent 继续阶段路由。 |",
        ]
    )
    write_text(path, text.rstrip() + "\n" + "\n".join(lines) + "\n")


def build_impact_text(feedback: dict[str, Any], item: dict[str, Any]) -> str:
    if item.get("blocks_next_stage"):
        return "该决策要求继续暂停或补充信息，后续阶段不得放行。"
    if feedback["result"] != "PASS":
        return "该决策本身已确认；但当前轮仍有其他决策未放行，整体暂不进入下一阶段。"
    if item["choice"] == "D":
        return "后续阶段必须按用户自定义输入约束 scope、集成边界和验收。"
    return f"后续阶段按选项 {item['choice']} 消费该决策；下一步命令为 {feedback['next_command_after_pass']}。"


def append_uncertainty_updates(context: AskFirstContext, feedback: dict[str, Any]) -> None:
    tracked = [
        item
        for item in feedback["decisions"]
        if item["status"] in {
            "USER_CONFIRMED_CUSTOM",
            "USER_DEFERRED_PLAN_RISK",
            "USER_DOWNGRADED_TO_P1",
            "USER_DOWNGRADED_TO_P2",
            "USER_ESCALATED_TO_P0",
        }
    ]
    if not tracked:
        return

    path = context.workspace / "uncertainty-register.md"
    text = read_text(path) if path.exists() else "# Uncertainty Register\n"
    lines = [
        "",
        "## Ask First Feedback Follow-ups",
        "",
        "| 等级 | 问题 | 影响 | 用户反馈 | Evidence |",
        "|---|---|---|---|---|",
    ]
    for item in tracked:
        level = "P0_BLOCKER" if item["status"] == "USER_ESCALATED_TO_P0" else item["level"] or "P1_RISK"
        lines.append(
            "| {level} | {problem} | {impact} | {feedback_text} | {evidence} |".format(
                level=markdown_cell(level),
                problem=markdown_cell(item["title"]),
                impact=markdown_cell(build_impact_text(feedback, item)),
                feedback_text=markdown_cell(item["custom_input"] or item["option_text"]),
                evidence=markdown_cell(f"Ask First {feedback['request_id']}"),
            )
        )
    write_text(path, text.rstrip() + "\n" + "\n".join(lines) + "\n")


def update_delivery_state(context: AskFirstContext, feedback: dict[str, Any]) -> None:
    path = context.delivery_state_path
    text = read_text(path)
    passed = feedback["result"] == "PASS"
    next_command = feedback["next_command_after_pass"] if passed else feedback["resume_command"]
    status = "DONE" if passed else "PAUSED"
    result = "PASS" if passed else "BLOCKED_PENDING_USER_DECISION"
    pause_reason = "none" if passed else f"Ask First still blocked after {feedback['request_id']}"
    waiting = "none" if passed else "请在飞书卡片补充阻塞项说明或调整选择"
    current_action = (
        f"Ask First 飞书卡片已提交并落盘，下一步 `{next_command}`"
        if passed
        else "Ask First 飞书卡片已提交但仍存在阻塞选择，继续等待用户确认"
    )

    replacements = [
        (r"^> status: .*$", f"> status: {status}"),
        (r"^- updated_at：.*$", f"- updated_at：`{feedback['submitted_at']} ask-first feishu callback`"),
        (r"^- 当前动作：.*$", f"- 当前动作：`{current_action}`"),
        (r"^- result：.*$", f"- result：`{result}`"),
        (r"^- next_command：.*$", f"- next_command：`{next_command}`"),
        (r"^- is_paused：.*$", f"- is_paused：{'false' if passed else 'true'}"),
        (r"^- paused_phase：.*$", "- paused_phase：`none`" if passed else "- paused_phase：`/delivery:prd`"),
        (r"^- paused_reason：.*$", f"- paused_reason：`{pause_reason}`"),
        (r"^- waiting_for_user：.*$", f"- waiting_for_user：`{waiting}`"),
        (r"^- resume_command：.*$", f"- resume_command：`{next_command}`"),
        (r"^- last_question_to_user：.*$", "- last_question_to_user：`none`" if passed else "- last_question_to_user：`Ask First still blocked`"),
    ]
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text, flags=re.MULTILINE)
    if passed:
        text = text.replace("| PRD 解析 | /delivery:prd | PAUSED |", "| PRD 解析 | /delivery:prd | DONE |")
    write_text(path, text)


def build_success_card(feedback: dict[str, Any]) -> dict[str, Any]:
    target_command = feedback["next_command_after_pass"] if feedback["result"] == "PASS" else feedback["resume_command"]
    title = "Ask First 已提交" if feedback["result"] == "PASS" else "Ask First 仍需补充"
    template = "green" if feedback["result"] == "PASS" else "orange"
    decision_rows = build_frozen_decision_rows(feedback)
    return {
        "schema": "2.0",
        "config": {"update_multi": True, "width_mode": "fill"},
        "header": {
            "template": template,
            "title": {"tag": "plain_text", "content": title},
            "subtitle": {"tag": "plain_text", "content": feedback["request_id"]},
        },
        "body": {
            "direction": "vertical",
            "elements": [
                {
                    "tag": "markdown",
                    "content": (
                        f"**处理结果**：{feedback['result']}\n"
                        f"**提交时间**：{feedback['submitted_at']}\n"
                        f"**下一步**：{target_command}\n"
                        "决策结果已写入本地 PRD 产物。\n\n"
                        "<font color='grey'>该卡片已冻结，不能再次编辑或提交。</font>"
                    ),
                },
                {
                    "tag": "markdown",
                    "content": "### 已提交内容\n\n" + decision_rows,
                },
            ],
        },
    }


def build_frozen_decision_rows(feedback: dict[str, Any]) -> str:
    rows = [
        "| ID | 题目 | 选择 | 最终策略 | 补充说明 | 状态 |",
        "|---|---|---|---|---|---|",
    ]
    for item in feedback["decisions"]:
        final_strategy = item["custom_input"] if item["choice"] == "D" else item["option_text"]
        rows.append(
            "| {id} | {title} | {choice} | {strategy} | {custom_input} | {status} |".format(
                id=markdown_cell(item["id"]),
                title=markdown_cell(item["title"]),
                choice=markdown_cell(item["choice"]),
                strategy=markdown_cell(final_strategy),
                custom_input=markdown_cell(item["custom_input"] or "无"),
                status=markdown_cell(item["status"]),
            )
        )
    return "\n".join(rows)


def build_callback_card_response(card: dict[str, Any]) -> dict[str, Any]:
    return {"type": "raw", "data": card}


class AskFirstRunner:
    def __init__(self, context: AskFirstContext):
        self.context = context
        self.events_path = context.workspace / "ask-first-events.jsonl"
        self._shutdown_requested = threading.Event()

    def request_shutdown(self) -> None:
        self._shutdown_requested.set()

    def shutdown_requested(self) -> bool:
        return self._shutdown_requested.is_set()

    def process_callback(self, callback: Any) -> dict[str, Any]:
        header = get_nested(callback, "header", default={})
        event = get_nested(callback, "event", default={})
        event_type = get_nested(header, "event_type", default="card.action.trigger")
        if event_type != "card.action.trigger":
            return toast("info", f"忽略非 Ask First 回调: {event_type}")

        action = get_nested(event, "action", default={})
        action_value = get_nested(action, "value", default={}) or {}
        request_id = action_value.get("request_id") if isinstance(action_value, dict) else None
        if request_id != self.context.request_id:
            return toast("info", "忽略其他 Ask First 请求")

        event_id = str(get_nested(header, "event_id", default="") or "")
        if not event_id:
            event_id = f"no-event-id-{datetime.now(CN_TZ).timestamp()}"
        idempotency_key = f"{event_id}:{self.context.request_id}"
        if idempotency_key in load_processed_keys(self.events_path):
            return toast("info", "该 Ask First 提交已处理，无需重复提交")

        form_value = get_nested(action, "form_value", default={}) or {}
        if not isinstance(form_value, dict):
            return toast("error", "表单数据格式不正确，请重试")

        try:
            decisions = parse_form_value(self.context, form_value)
            operator_open_id = str(get_nested(event, "operator", "open_id", default="") or "")
            open_message_id = str(get_nested(event, "context", "open_message_id", default="") or "")
            open_chat_id = str(get_nested(event, "context", "open_chat_id", default="") or "")
            feedback = build_feedback(
                self.context,
                event_id=event_id,
                operator_open_id=operator_open_id,
                open_message_id=open_message_id,
                open_chat_id=open_chat_id,
                decisions=decisions,
            )
            persist_feedback(self.context, feedback)
            append_jsonl(
                self.events_path,
                {
                    "idempotency_key": idempotency_key,
                    "request_id": self.context.request_id,
                    "event_id": event_id,
                    "status": "processed",
                    "processed_at": now_text(),
                    "result": feedback["result"],
                },
            )
            self.request_shutdown()
        except Exception as exc:  # noqa: BLE001 - callback must return a user-readable toast.
            append_jsonl(
                self.events_path,
                {
                    "idempotency_key": idempotency_key,
                    "request_id": self.context.request_id,
                    "event_id": event_id,
                    "status": "failed",
                    "processed_at": now_text(),
                    "error": str(exc),
                },
            )
            return toast("error", f"提交校验失败：{exc}")

        response = toast("success", "已提交，Ask First 决策已写入本地 PRD 产物")
        response["card"] = build_callback_card_response(build_success_card(feedback))
        return response


def toast(kind: str, content: str) -> dict[str, Any]:
    return {"toast": {"type": kind, "content": content, "i18n": {"zh_cn": content, "en_us": content}}}


def send_ask_first_card(app_id: str, app_secret: str, receive_id_type: str, receive_id: str, card: dict[str, Any]) -> dict[str, Any]:
    import lark_oapi as lark
    from lark_oapi.api.im.v1 import CreateMessageRequest, CreateMessageRequestBody

    client = lark.Client.builder().app_id(app_id).app_secret(app_secret).build()
    request = (
        CreateMessageRequest.builder()
        .receive_id_type(receive_id_type)
        .request_body(
            CreateMessageRequestBody.builder()
            .receive_id(receive_id)
            .msg_type("interactive")
            .content(json.dumps(card, ensure_ascii=False))
            .build()
        )
        .build()
    )
    response = client.im.v1.message.create(request)
    if not response.success():
        raise RuntimeError(
            "发送 Ask First 卡片失败: "
            f"code={response.code}, msg={response.msg}, log_id={response.get_log_id()}"
        )
    return object_to_plain(response.data)


def append_dispatch_note(context: AskFirstContext, receive_id_type: str, receive_id: str, send_result: dict[str, Any]) -> None:
    path = context.workspace / "prd-notes.md"
    message_id = send_result.get("message_id") or send_result.get("open_message_id") or ""
    chat_id = send_result.get("chat_id") or send_result.get("open_chat_id") or ""
    content = (
        "\n## Ask First Feishu Dispatch Runtime\n\n"
        "| item | value |\n"
        "|---|---|\n"
        f"| dispatch_time | `{now_text()}` |\n"
        "| feedback_mode | `LONG_CONNECTION` |\n"
        f"| receiver_type | `{markdown_cell(receive_id_type)}` |\n"
        f"| receiver_id | `{markdown_cell(receive_id)}` |\n"
        f"| open_message_id | `{markdown_cell(message_id)}` |\n"
        f"| open_chat_id | `{markdown_cell(chat_id)}` |\n"
    )
    append_text(path, content)


def append_dispatch_failure_note(
    context: AskFirstContext,
    receive_id_type: str,
    receive_id: str,
    error: BaseException,
) -> None:
    path = context.workspace / "prd-notes.md"
    content = (
        "\n## Ask First Feishu Dispatch Failure\n\n"
        "| item | value |\n"
        "|---|---|\n"
        f"| failure_time | `{now_text()}` |\n"
        "| feedback_mode | `LONG_CONNECTION` |\n"
        f"| receiver_type | `{markdown_cell(receive_id_type)}` |\n"
        f"| receiver_id | `{markdown_cell(receive_id)}` |\n"
        f"| error | `{markdown_cell(error)}` |\n"
    )
    append_text(path, content)


def process_text_fallback(
    context: AskFirstContext,
    form_value: dict[str, Any],
    source: str = "TEXT_FALLBACK_CURRENT_CHAT",
) -> dict[str, Any]:
    decisions = parse_form_value(context, form_value)
    feedback = build_feedback(
        context,
        event_id=f"text-fallback-{datetime.now(CN_TZ).timestamp()}",
        operator_open_id="",
        open_message_id="",
        open_chat_id="",
        decisions=decisions,
        source=source,
    )
    persist_feedback(context, feedback)
    append_jsonl(
        context.workspace / "ask-first-events.jsonl",
        {
            "idempotency_key": f"{source}:{context.request_id}:{feedback['submitted_at']}",
            "request_id": context.request_id,
            "event_id": feedback["event_id"],
            "status": "processed",
            "processed_at": now_text(),
            "result": feedback["result"],
            "source": source,
        },
    )
    return feedback


def start_long_connection(app_id: str, app_secret: str, runner: AskFirstRunner) -> None:
    import lark_oapi as lark
    import lark_oapi.ws.client as lark_ws_client
    from lark_oapi.event.callback.model.p2_card_action_trigger import P2CardActionTriggerResponse

    def handler(data: Any) -> Any:
        response = runner.process_callback(data)
        return P2CardActionTriggerResponse(response)

    def ignore_message_read(data: Any) -> None:
        print("忽略 im.message.message_read_v1 事件。", flush=True)

    event_handler = (
        lark.EventDispatcherHandler.builder("", "")
        .register_p2_card_action_trigger(handler)
        .register_p2_im_message_message_read_v1(ignore_message_read)
        .build()
    )
    ws_client = lark.ws.Client(
        app_id,
        app_secret,
        event_handler=event_handler,
        log_level=lark.LogLevel.DEBUG,
    )
    print("Ask First 长连接服务启动中，等待 card.action.trigger 回调...", flush=True)
    try:
        lark_ws_client.loop.run_until_complete(ws_client._connect())
    except lark_ws_client.ClientException as exc:
        raise exc
    except Exception as exc:
        lark_ws_client.loop.run_until_complete(ws_client._disconnect())
        if ws_client._auto_reconnect:
            lark_ws_client.loop.run_until_complete(ws_client._reconnect())
        else:
            raise exc

    ping_task = lark_ws_client.loop.create_task(ws_client._ping_loop())
    try:
        lark_ws_client.loop.run_until_complete(wait_for_runner_shutdown(ws_client, runner))
    finally:
        lark_ws_client.loop.run_until_complete(cancel_async_task(ping_task))


async def wait_for_runner_shutdown(ws_client: Any, runner: AskFirstRunner, poll_interval: float = 0.2) -> None:
    poll_interval = max(poll_interval, 0.0)
    while not runner.shutdown_requested():
        await asyncio.sleep(poll_interval)

    if hasattr(ws_client, "_auto_reconnect"):
        ws_client._auto_reconnect = False

    disconnect = getattr(ws_client, "_disconnect", None)
    if callable(disconnect):
        await disconnect()


async def cancel_async_task(task: Any) -> None:
    if task is None:
        return
    cancel = getattr(task, "cancel", None)
    if callable(cancel):
        cancel()
    try:
        await task
    except asyncio.CancelledError:
        return
    except Exception:
        return


def start_long_connection_in_background(
    app_id: str,
    app_secret: str,
    runner: AskFirstRunner,
    startup_grace_seconds: float = 2.0,
) -> threading.Thread:
    errors: list[BaseException] = []

    def target() -> None:
        try:
            start_long_connection(app_id, app_secret, runner)
        except BaseException as exc:  # noqa: BLE001 - surface startup failures before card dispatch.
            errors.append(exc)

    thread = threading.Thread(target=target, name="ask-first-long-connection", daemon=True)
    thread.start()
    if startup_grace_seconds > 0:
        time.sleep(startup_grace_seconds)
    if errors:
        raise RuntimeError(f"启动 Ask First 长连接接收器失败: {errors[0]}") from errors[0]
    if not thread.is_alive():
        raise RuntimeError("Ask First 长连接接收器已退出，未发送卡片")
    print("Ask First 长连接接收器已启动，准备发送交互卡片。", flush=True)
    return thread


def wait_for_receiver(receiver_handle: Any) -> None:
    if hasattr(receiver_handle, "join"):
        receiver_handle.join()


def run_live_session(
    context: AskFirstContext,
    runner: AskFirstRunner,
    app_id: str,
    app_secret: str,
    receive_id_type: str,
    receiver_id: str,
    startup_grace_seconds: float = 2.0,
    start_receiver: Any = None,
    send_card: Any = None,
    wait_for_receiver: Any = None,
) -> None:
    start_receiver_fn = start_receiver or start_long_connection_in_background
    send_card_fn = send_card or send_ask_first_card
    wait_for_receiver_fn = wait_for_receiver or globals()["wait_for_receiver"]

    receiver_handle = start_receiver_fn(
        app_id=app_id,
        app_secret=app_secret,
        runner=runner,
        startup_grace_seconds=startup_grace_seconds,
    )
    try:
        send_result = send_card_fn(
            app_id=app_id,
            app_secret=app_secret,
            receive_id_type=receive_id_type,
            receive_id=receiver_id,
            card=context.card,
        )
    except Exception as exc:
        append_dispatch_failure_note(context, receive_id_type, receiver_id, exc)
        raise
    append_dispatch_note(context, receive_id_type, receiver_id, send_result)
    print("Ask First 卡片已发送:", json.dumps(send_result, ensure_ascii=False), flush=True)
    wait_for_receiver_fn(receiver_handle)


def env_first(*names: str) -> str:
    for name in names:
        value = os.getenv(name)
        if value:
            return value
    return ""


def normalized_config_key(key: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(key).lower())


def find_forbidden_secret_config_keys(value: Any, prefix: str = "") -> list[str]:
    matches: list[str] = []
    if isinstance(value, dict):
        for key, item in value.items():
            key_text = str(key)
            path = f"{prefix}.{key_text}" if prefix else key_text
            if normalized_config_key(key_text) in FORBIDDEN_SECRET_CONFIG_KEYS:
                matches.append(path)
            matches.extend(find_forbidden_secret_config_keys(item, path))
    elif isinstance(value, list):
        for index, item in enumerate(value):
            path = f"{prefix}[{index}]" if prefix else f"[{index}]"
            matches.extend(find_forbidden_secret_config_keys(item, path))
    return matches


def load_runtime_config(path: Path | None) -> dict[str, Any]:
    if path is None:
        return {}
    config = load_json(path.expanduser())
    if not isinstance(config, dict):
        raise ValueError("runtime config 必须是 JSON object")
    forbidden = find_forbidden_secret_config_keys(config)
    if forbidden:
        raise ValueError(
            "runtime config 不允许内联 APP_SECRET 或 access token；"
            f"请改用 app_secret_env 指向环境变量。违规字段: {', '.join(forbidden)}"
        )
    return config


def config_text(config: dict[str, Any], key: str) -> str:
    value = config.get(key)
    if value is None:
        return ""
    return str(value).strip()


def config_env_value(config: dict[str, Any], key: str) -> str:
    env_name = config_text(config, f"{key}_env")
    if not env_name:
        return ""
    if not ENV_NAME_PATTERN.match(env_name):
        raise ValueError(f"{key}_env 必须是环境变量名，不能填写实际密钥或明文值")
    return os.getenv(env_name, "")


def run_secret_lookup(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def resolve_app_secret_from_keychain(config: dict[str, Any], runner: Any = None) -> str:
    keychain = config.get("app_secret_keychain")
    if not isinstance(keychain, dict):
        return ""
    service = str(keychain.get("service") or "").strip()
    account = str(keychain.get("account") or "").strip()
    if not service or not account:
        raise ValueError("app_secret_keychain 必须包含 service 和 account")

    command = [
        "security",
        "find-generic-password",
        "-s",
        service,
        "-a",
        account,
        "-w",
    ]
    result = (runner or run_secret_lookup)(command)
    returncode = int(getattr(result, "returncode", 0) or 0)
    stdout = str(getattr(result, "stdout", "") or "")
    stderr = str(getattr(result, "stderr", "") or "")
    if returncode != 0:
        detail = stderr.strip() or stdout.strip() or f"exit={returncode}"
        raise RuntimeError(f"读取 macOS Keychain 中的 APP_SECRET 失败: {detail}")
    secret = stdout.strip()
    if not secret:
        raise RuntimeError("macOS Keychain 返回了空 APP_SECRET")
    return secret


def extract_open_ids_from_contact_search(output: str) -> list[str]:
    found: list[str] = []

    def remember(value: Any) -> None:
        text = str(value).strip()
        if text.startswith("ou_") and text not in found:
            found.append(text)

    def walk(value: Any) -> None:
        if isinstance(value, dict):
            for key, item in value.items():
                if key in {"open_id", "openId"}:
                    remember(item)
                else:
                    walk(item)
        elif isinstance(value, list):
            for item in value:
                walk(item)

    text = output.strip()
    if text:
        try:
            walk(json.loads(text))
        except json.JSONDecodeError:
            pass
    for match in re.findall(r"\bou_[A-Za-z0-9_]+\b", output):
        remember(match)
    return found


def run_lark_cli(command: list[str]) -> subprocess.CompletedProcess[str]:
    return subprocess.run(command, capture_output=True, text=True, check=False)


def resolve_receiver_open_id_from_query(query: str, command_runner: Any = None) -> str:
    command = [
        "lark-cli",
        "contact",
        "+search-user",
        "--query",
        query,
        "--as",
        "user",
        "--format",
        "json",
    ]
    runner = command_runner or run_lark_cli
    result = runner(command)
    returncode = int(getattr(result, "returncode", 0) or 0)
    stdout = str(getattr(result, "stdout", "") or "")
    stderr = str(getattr(result, "stderr", "") or "")
    if returncode != 0:
        detail = stderr.strip() or stdout.strip() or f"exit={returncode}"
        raise RuntimeError(f"lark-cli contact +search-user 查询接收人失败: {detail}")

    open_ids = extract_open_ids_from_contact_search(stdout)
    if len(open_ids) == 1:
        return open_ids[0]
    if not open_ids:
        raise RuntimeError(f"未通过 lark-cli contact +search-user 找到接收人: {query}")
    raise RuntimeError("查询到多个 open_id，请改用 --receiver-open-id 精确指定接收人")


def receiver_config_values(config: dict[str, Any]) -> tuple[str, str, str]:
    receiver_id = config_text(config, "receiver_id") or config_text(config, "receiver_open_id")
    receiver_query = config_text(config, "receiver_query")
    receive_id_type = config_text(config, "receive_id_type")
    receiver = config.get("receiver")

    if isinstance(receiver, dict):
        receiver_type = str(receiver.get("type") or "").strip()
        if receiver_type in {"open_id", "user_id", "chat_id", "email"}:
            receiver_id = str(receiver.get(receiver_type) or receiver.get("id") or receiver_id).strip()
            receive_id_type = receiver_type
        elif receiver_type == "contact_query":
            receiver_query = str(receiver.get("query") or receiver_query).strip()
            if looks_like_email(receiver_query):
                receiver_id = receiver_query
                receive_id_type = "email"
            else:
                receive_id_type = "open_id"

    return receiver_id, receiver_query, receive_id_type


def resolve_runtime_settings(
    args: argparse.Namespace,
    config: dict[str, Any],
    contact_search_runner: Any = None,
    secret_lookup_runner: Any = None,
) -> RuntimeSettings:
    config_receiver_id, config_receiver_query, config_receive_id_type = receiver_config_values(config)
    receive_id_type = (
        getattr(args, "receive_id_type", "")
        or config_receive_id_type
        or env_first("ASK_FIRST_RECEIVE_ID_TYPE")
        or "open_id"
    )
    app_id = (
        getattr(args, "app_id", "")
        or config_env_value(config, "app_id")
        or config_text(config, "app_id")
        or env_first("ASK_FIRST_APP_ID", "APP_ID", "LARK_APP_ID", "FEISHU_APP_ID")
    )
    app_secret = (
        getattr(args, "app_secret", "")
        or config_env_value(config, "app_secret")
        or resolve_app_secret_from_keychain(config, secret_lookup_runner)
        or env_first("ASK_FIRST_APP_SECRET", "APP_SECRET", "LARK_APP_SECRET", "FEISHU_APP_SECRET")
    )
    receiver_id = (
        getattr(args, "receiver_id", "")
        or getattr(args, "receiver_open_id", "")
        or config_receiver_id
        or env_first("ASK_FIRST_RECEIVER_OPEN_ID", "ASK_FIRST_RECEIVER_ID")
    )
    receiver_query = (
        getattr(args, "receiver_query", "")
        or config_receiver_query
        or env_first("ASK_FIRST_RECEIVER_QUERY")
    )

    if not app_id or not app_secret:
        raise RuntimeError("缺少 APP_ID/APP_SECRET，请通过环境变量、runtime config env 名或参数传入")

    if not receiver_id and receiver_query and not getattr(args, "no_send", False):
        if looks_like_email(receiver_query):
            receiver_id = receiver_query
            receive_id_type = "email"
        elif receive_id_type != "open_id":
            raise RuntimeError("--receiver-query 非邮箱场景只能解析 open_id，请使用 --receive-id-type open_id")
        else:
            receiver_id = resolve_receiver_open_id_from_query(receiver_query, contact_search_runner)

    if not getattr(args, "no_send", False) and not receiver_id:
        raise RuntimeError("缺少接收人，请设置 ASK_FIRST_RECEIVER_OPEN_ID、--receiver-id 或 --receiver-query")

    return RuntimeSettings(
        app_id=app_id,
        app_secret=app_secret,
        receive_id_type=receive_id_type,
        receiver_id=receiver_id,
        receiver_query=receiver_query,
    )


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ask First Feishu card long-connection runner")
    parser.add_argument("--workspace", required=True, help="Ask First artifact workspace path")
    parser.add_argument("--delivery-state", help="DELIVERY_STATE.md path; defaults to .trae/DELIVERY_STATE.md")
    parser.add_argument("--runtime-config", default=env_first("ASK_FIRST_RUNTIME_CONFIG"))
    parser.add_argument("--receive-id-type", default="", choices=["open_id", "chat_id", "user_id", "email", ""])
    parser.add_argument("--receiver-open-id", default="")
    parser.add_argument("--receiver-id", default="", help="Override receiver id for non-open_id send target")
    parser.add_argument(
        "--receiver-query",
        default="",
        help="If query looks like email, send directly with receive_id_type=email; otherwise resolve unique open_id via lark-cli contact +search-user",
    )
    parser.add_argument("--app-id", default="")
    parser.add_argument("--app-secret", default="")
    parser.add_argument("--no-send", action="store_true", help="Do not send card before starting long connection")
    parser.add_argument("--send-only", action="store_true", help="Only send card and exit")
    parser.add_argument("--simulate-callback", help="Load a local callback JSON file and process it without Feishu")
    parser.add_argument(
        "--fallback-form-value",
        help=(
            "Persist text fallback answers without Feishu callback. "
            "Accepts JSON object, @json-file, or shorthand like 'AF-001=A; AF-002=C'."
        ),
    )
    parser.add_argument("--fallback-source", default="TEXT_FALLBACK_CURRENT_CHAT")
    parser.add_argument(
        "--receiver-startup-grace-seconds",
        type=float,
        default=2.0,
        help="Seconds to let the long-connection receiver start before dispatching the card",
    )
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    context = load_context(Path(args.workspace), Path(args.delivery_state) if args.delivery_state else None)
    runner = AskFirstRunner(context)

    if args.simulate_callback:
        callback = load_json(Path(args.simulate_callback))
        response = runner.process_callback(callback)
        print(json_dump(response))
        return 0

    if args.fallback_form_value:
        form_value = load_fallback_form_value(args.fallback_form_value)
        feedback = process_text_fallback(context, form_value, args.fallback_source)
        print(
            json_dump(
                {
                    "result": feedback["result"],
                    "request_id": feedback["request_id"],
                    "target_command": (
                        feedback["next_command_after_pass"]
                        if feedback["result"] == "PASS"
                        else feedback["resume_command"]
                    ),
                }
            )
        )
        return 0

    config = load_runtime_config(Path(args.runtime_config)) if args.runtime_config else {}
    settings = resolve_runtime_settings(args, config)

    if args.send_only:
        send_result = send_ask_first_card(
            app_id=settings.app_id,
            app_secret=settings.app_secret,
            receive_id_type=settings.receive_id_type,
            receive_id=settings.receiver_id,
            card=context.card,
        )
        append_dispatch_note(context, settings.receive_id_type, settings.receiver_id, send_result)
        print("Ask First 卡片已发送:", json.dumps(send_result, ensure_ascii=False), flush=True)
        return 0

    if args.no_send:
        start_long_connection(settings.app_id, settings.app_secret, runner)
        return 0

    run_live_session(
        context=context,
        runner=runner,
        app_id=settings.app_id,
        app_secret=settings.app_secret,
        receive_id_type=settings.receive_id_type,
        receiver_id=settings.receiver_id,
        startup_grace_seconds=args.receiver_startup_grace_seconds,
    )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        print("Ask First 长连接服务已停止。", file=sys.stderr)
        raise SystemExit(130)
    except Exception as error:  # noqa: BLE001 - command-line entrypoint should print concise errors.
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)

#!/usr/bin/env python3
"""Bootstrap local Ask First runtime config without writing APP_SECRET to the repo."""

from __future__ import annotations

import argparse
import getpass
import json
import os
import re
import subprocess
import sys
from pathlib import Path
from typing import Any


DEFAULT_CONFIG_PATH = Path(".trae/config/ask-first-runtime.local.json")
DEFAULT_KEYCHAIN_SERVICE = "trae.ask-first.ask-first-runner"
EMAIL_PATTERN = r"^[^@\s]+@[^@\s]+\.[^@\s]+$"


def json_dump(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2)


def build_runtime_config(
    app_id: str,
    receiver_type: str,
    receiver_value: str,
    keychain_service: str,
    keychain_account: str,
) -> dict[str, Any]:
    receiver: dict[str, str] = {"type": receiver_type}
    if receiver_type == "contact_query":
        receiver["query"] = receiver_value
    elif receiver_type in {"open_id", "user_id", "chat_id", "email"}:
        receiver[receiver_type] = receiver_value
    else:
        receiver["id"] = receiver_value

    return {
        "app_id": app_id,
        "app_secret_keychain": {
            "service": keychain_service,
            "account": keychain_account,
        },
        "receiver": receiver,
    }


def write_runtime_config(path: Path, config: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json_dump(config) + "\n", encoding="utf-8")
    os.chmod(path, 0o600)


def store_secret_in_keychain(
    secret: str,
    service: str,
    account: str,
    runner: Any = subprocess.run,
) -> None:
    command = [
        "security",
        "add-generic-password",
        "-U",
        "-s",
        service,
        "-a",
        account,
        "-w",
        secret,
    ]
    result = runner(command, capture_output=True, text=True, check=False)
    returncode = int(getattr(result, "returncode", 0) or 0)
    if returncode != 0:
        stderr = str(getattr(result, "stderr", "") or "").strip()
        stdout = str(getattr(result, "stdout", "") or "").strip()
        detail = stderr or stdout or f"exit={returncode}"
        raise RuntimeError(f"写入 macOS Keychain 失败: {detail}")


def prompt_nonempty(label: str, default: str = "") -> str:
    suffix = f" [{default}]" if default else ""
    while True:
        value = input(f"{label}{suffix}: ").strip()
        if value:
            return value
        if default:
            return default
        print(f"{label} 不能为空。", file=sys.stderr)


def looks_like_email(value: str) -> bool:
    return bool(re.match(EMAIL_PATTERN, value.strip()))


def resolve_receiver(args: argparse.Namespace) -> tuple[str, str]:
    if args.receiver_open_id:
        return "open_id", args.receiver_open_id
    if args.receiver_query:
        return ("email", args.receiver_query) if looks_like_email(args.receiver_query) else ("contact_query", args.receiver_query)
    receiver_query = prompt_nonempty("Receiver email or name")
    return ("email", receiver_query) if looks_like_email(receiver_query) else ("contact_query", receiver_query)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Bootstrap Ask First runtime config")
    parser.add_argument("--config-path", default=str(DEFAULT_CONFIG_PATH))
    parser.add_argument("--app-id", default="")
    parser.add_argument("--receiver-query", default="", help="Receiver email or contact query; email values are stored as receiver.type=email")
    parser.add_argument("--receiver-open-id", default="")
    parser.add_argument("--keychain-service", default=DEFAULT_KEYCHAIN_SERVICE)
    parser.add_argument("--keychain-account", default="")
    return parser.parse_args(argv)


def main(argv: list[str]) -> int:
    args = parse_args(argv)
    app_id = args.app_id or prompt_nonempty("ASK_FIRST_APP_ID")
    receiver_type, receiver_value = resolve_receiver(args)
    account = args.keychain_account or app_id
    secret = getpass.getpass("ASK_FIRST_APP_SECRET: ").strip()
    if not secret:
        raise RuntimeError("ASK_FIRST_APP_SECRET 不能为空")

    store_secret_in_keychain(secret, args.keychain_service, account)
    config = build_runtime_config(
        app_id=app_id,
        receiver_type=receiver_type,
        receiver_value=receiver_value,
        keychain_service=args.keychain_service,
        keychain_account=account,
    )
    config_path = Path(args.config_path)
    write_runtime_config(config_path, config)

    print(f"Ask First runtime config written: {config_path}")
    print("APP_SECRET stored in macOS Keychain; it was not written to runtime config.")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main(sys.argv[1:]))
    except KeyboardInterrupt:
        raise SystemExit(130)
    except Exception as error:  # noqa: BLE001 - command-line entrypoint should print concise errors.
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)

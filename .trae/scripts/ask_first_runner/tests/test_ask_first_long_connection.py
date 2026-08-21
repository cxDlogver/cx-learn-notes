import asyncio
import importlib.util
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "ask_first_long_connection.py"
SPEC = importlib.util.spec_from_file_location("ask_first_long_connection", MODULE_PATH)
ask_first = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = ask_first
SPEC.loader.exec_module(ask_first)


def contains_interactive_control(card):
    blocked_tags = {"form", "select_static", "input", "button"}

    def walk(value):
        if isinstance(value, dict):
            if value.get("tag") in blocked_tags or "form_action_type" in value:
                return True
            return any(walk(item) for item in value.values())
        if isinstance(value, list):
            return any(walk(item) for item in value)
        return False

    return walk(card)


def write_fixture_workspace(root: Path):
    workspace = root / "workspace"
    workspace.mkdir()
    delivery_state = root / "DELIVERY_STATE.md"

    (workspace / "ask-first-request.md").write_text(
        """# Ask First Request

- request_id: `ask_first_test_001`
- resume_command: `/delivery:prd`
- next_command_after_pass: `/delivery:bam`

### AF-001. Scope

- 当前分级：`P1_RISK`
- 背景证据：fixture
- 为什么现在问：验证回调闭环。
- 推荐策略：A
- 选项：
  - A. 按推荐策略继续
  - B. 暂停
  - C. 后续发现
  - D. 人工输入
""",
        encoding="utf-8",
    )
    (workspace / "ask-first-card.json").write_text(
        """{
  "schema": "2.0",
  "config": {"update_multi": true},
  "header": {
    "title": {"tag": "plain_text", "content": "PRD 阶段待确认决策"},
    "template": "blue"
  },
  "body": {
    "elements": [
      {
        "tag": "form",
        "name": "ask_first_form_ask_first_test_001",
        "elements": [
          {"tag": "select_static", "name": "af_001_choice", "options": [{"text": {"tag": "plain_text", "content": "A"}, "value": "A"}]},
          {"tag": "input", "name": "af_001_custom_input"},
          {
            "tag": "button",
            "name": "ask_first_submit",
            "form_action_type": "submit",
            "behaviors": [{"type": "callback", "value": {"request_id": "ask_first_test_001", "decision_ids": ["AF-001"]}}]
          }
        ]
      }
    ]
  }
}
""",
        encoding="utf-8",
    )
    delivery_state.write_text(
        """# Delivery State

> status: PAUSED

## Current Task

- updated_at：`old`
- 当前动作：`waiting`

## Stage Result

- result：`BLOCKED_PENDING_USER_DECISION`
- next_command：`/delivery:prd`

## Pause State

- is_paused：true
- paused_phase：`/delivery:prd`
- paused_reason：`Ask First card submission pending`
- waiting_for_user：`card`
- resume_command：`/delivery:prd`
- last_question_to_user：`card`

## Phase Status

| 阶段 | 命令 | 状态 | 产物 | Gate |
|---|---|---|---|---|
| PRD 解析 | /delivery:prd | PAUSED | ask-first-request.md | 等待 Ask First 用户确认 |
""",
        encoding="utf-8",
    )
    return workspace, delivery_state


class AskFirstLongConnectionTest(unittest.TestCase):
    def test_module_lives_under_trae_scripts_for_agent_runtime(self):
        self.assertIn(".trae/scripts/ask_first_runner", MODULE_PATH.as_posix())

    def test_default_delivery_state_resolves_to_trae_root(self):
        self.assertEqual(
            MODULE_PATH.resolve().parents[2],
            ask_first.find_trae_root(MODULE_PATH).resolve(),
        )

    def test_request_metadata_requires_explicit_next_command_after_pass(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            request_path = workspace / "ask-first-request.md"
            request_path.write_text(
                request_path.read_text(encoding="utf-8").replace(
                    "- next_command_after_pass: `/delivery:bam`\n",
                    "",
                ),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "next_command_after_pass"):
                ask_first.load_context(workspace, delivery_state)

    def test_success_callback_replaces_form_with_raw_frozen_card(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            response = runner.process_callback(
                {
                    "header": {"event_id": "evt-1", "event_type": "card.action.trigger"},
                    "event": {
                        "operator": {"open_id": "ou_test"},
                        "context": {"open_message_id": "om_test", "open_chat_id": "oc_test"},
                        "action": {
                            "value": {"request_id": "ask_first_test_001"},
                            "form_value": {"af_001_choice": "A", "af_001_custom_input": ""},
                        },
                    },
                }
            )

            self.assertEqual("success", response["toast"]["type"])
            self.assertEqual("raw", response["card"]["type"])
            frozen_card = response["card"]["data"]
            self.assertEqual("2.0", frozen_card["schema"])
            self.assertFalse(contains_interactive_control(frozen_card))

    def test_frozen_card_shows_submitted_decisions(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            response = runner.process_callback(
                {
                    "header": {"event_id": "evt-2", "event_type": "card.action.trigger"},
                    "event": {
                        "operator": {"open_id": "ou_test"},
                        "context": {"open_message_id": "om_test", "open_chat_id": "oc_test"},
                        "action": {
                            "value": {"request_id": "ask_first_test_001"},
                            "form_value": {
                                "af_001_choice": "D",
                                "af_001_custom_input": "本轮只做后端，前端另开任务",
                            },
                        },
                    },
                }
            )

            frozen_card = response["card"]["data"]
            rendered = ask_first.json_dump(frozen_card)
            self.assertIn("AF-001", rendered)
            self.assertIn("D", rendered)
            self.assertIn("本轮只做后端，前端另开任务", rendered)
            self.assertFalse(contains_interactive_control(frozen_card))

    def test_callback_writes_resume_marker_for_thread_wakeup(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            runner.process_callback(
                {
                    "header": {"event_id": "evt-3", "event_type": "card.action.trigger"},
                    "event": {
                        "operator": {"open_id": "ou_test"},
                        "context": {"open_message_id": "om_test", "open_chat_id": "oc_test"},
                        "action": {
                            "value": {"request_id": "ask_first_test_001"},
                            "form_value": {"af_001_choice": "A", "af_001_custom_input": ""},
                        },
                    },
                }
            )

            marker = ask_first.load_json(workspace / "ask-first-resume-request.json")
            self.assertEqual("ask_first_test_001", marker["request_id"])
            self.assertEqual("PASS", marker["result"])
            self.assertEqual("/delivery:bam", marker["target_command"])
            self.assertEqual("READY", marker["status"])

    def test_success_callback_requests_runner_shutdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            self.assertFalse(runner.shutdown_requested())

            runner.process_callback(
                {
                    "header": {"event_id": "evt-stop", "event_type": "card.action.trigger"},
                    "event": {
                        "operator": {"open_id": "ou_test"},
                        "context": {"open_message_id": "om_test", "open_chat_id": "oc_test"},
                        "action": {
                            "value": {"request_id": "ask_first_test_001"},
                            "form_value": {"af_001_choice": "A", "af_001_custom_input": ""},
                        },
                    },
                }
            )

            self.assertTrue(runner.shutdown_requested())

    def test_mismatched_request_callback_does_not_request_runner_shutdown(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            response = runner.process_callback(
                {
                    "header": {"event_id": "evt-other", "event_type": "card.action.trigger"},
                    "event": {
                        "action": {
                            "value": {"request_id": "ask_first_other_999"},
                            "form_value": {"af_001_choice": "A", "af_001_custom_input": ""},
                        },
                    },
                }
            )

            self.assertEqual("info", response["toast"]["type"])
            self.assertFalse(runner.shutdown_requested())

    def test_wait_for_runner_shutdown_disables_reconnect_and_disconnects_client(self):
        class FakeClient:
            def __init__(self):
                self._auto_reconnect = True
                self.disconnect_calls = 0

            async def _disconnect(self):
                self.disconnect_calls += 1

        async def scenario():
            with tempfile.TemporaryDirectory() as temp_dir:
                workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
                context = ask_first.load_context(workspace, delivery_state)
                runner = ask_first.AskFirstRunner(context)
                client = FakeClient()

                waiter = asyncio.create_task(
                    ask_first.wait_for_runner_shutdown(client, runner, poll_interval=0.001)
                )
                await asyncio.sleep(0.01)
                runner.request_shutdown()
                await waiter
                return client

        client = asyncio.run(scenario())
        self.assertFalse(client._auto_reconnect)
        self.assertEqual(1, client.disconnect_calls)

    def test_text_fallback_shorthand_uses_same_persistence_path(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            form_value = ask_first.load_fallback_form_value("AF-001=A")

            feedback = ask_first.process_text_fallback(context, form_value)

            self.assertEqual("PASS", feedback["result"])
            marker = ask_first.load_json(workspace / "ask-first-resume-request.json")
            self.assertEqual("READY", marker["status"])
            self.assertEqual("TEXT_FALLBACK_CURRENT_CHAT", marker["source"])
            self.assertTrue((workspace / "ask-first-feedback.json").exists())

    def test_text_fallback_blocks_when_selected_option_requires_more_evidence(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            request_path = workspace / "ask-first-request.md"
            request_text = request_path.read_text(encoding="utf-8")
            request_path.write_text(
                request_text.replace("A. 按推荐策略继续", "A. 重新抓取设计证据后再继续"),
                encoding="utf-8",
            )
            context = ask_first.load_context(workspace, delivery_state)
            form_value = ask_first.load_fallback_form_value("AF-001=A")

            feedback = ask_first.process_text_fallback(context, form_value)

            self.assertEqual("BLOCKED", feedback["result"])
            marker = ask_first.load_json(workspace / "ask-first-resume-request.json")
            self.assertEqual("/delivery:prd", marker["target_command"])

    def test_text_fallback_does_not_block_when_option_only_mentions_not_waiting(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            request_path = workspace / "ask-first-request.md"
            request_text = request_path.read_text(encoding="utf-8")
            request_path.write_text(
                request_text.replace("A. 按推荐策略继续", "A. 按 PRD 直接验收，而不是等待额外设计图"),
                encoding="utf-8",
            )
            context = ask_first.load_context(workspace, delivery_state)
            form_value = ask_first.load_fallback_form_value("AF-001=A")

            feedback = ask_first.process_text_fallback(context, form_value)

            self.assertEqual("PASS", feedback["result"])
            self.assertFalse(feedback["decisions"][0]["blocks_next_stage"])

    def test_build_impact_text_only_marks_actual_blocking_decision_as_blocking(self):
        feedback = {
            "result": "BLOCKED",
            "next_command_after_pass": "/delivery:bam",
        }

        confirmed_item = {
            "choice": "A",
            "blocks_next_stage": False,
        }
        blocking_item = {
            "choice": "B",
            "blocks_next_stage": True,
        }

        self.assertIn("本身已确认", ask_first.build_impact_text(feedback, confirmed_item))
        self.assertIn("继续暂停", ask_first.build_impact_text(feedback, blocking_item))

    def test_live_session_starts_receiver_before_dispatching_card(self):
        events = []

        def start_receiver(**kwargs):
            events.append(("receiver", kwargs["app_id"]))
            return "receiver-handle"

        def send_card(**kwargs):
            events.append(("send", kwargs["receive_id"]))
            return {"message_id": "om_test", "chat_id": "oc_test"}

        def wait_for_receiver(handle):
            events.append(("wait", handle))

        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            ask_first.run_live_session(
                context=context,
                runner=runner,
                app_id="cli_app",
                app_secret="secret",
                receive_id_type="open_id",
                receiver_id="ou_test",
                start_receiver=start_receiver,
                send_card=send_card,
                wait_for_receiver=wait_for_receiver,
            )

        self.assertEqual(
            [("receiver", "cli_app"), ("send", "ou_test"), ("wait", "receiver-handle")],
            events,
        )

    def test_runtime_config_rejects_inline_app_secret(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            config_path = Path(temp_dir) / "runtime.json"
            config_path.write_text(
                """{
  "app_id_env": "ASK_FIRST_APP_ID",
  "app_secret": "do-not-store-secret-here"
}
""",
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "APP_SECRET"):
                ask_first.load_runtime_config(config_path)

    def test_runtime_config_resolves_secret_from_env_name_only(self):
        old_value = ask_first.os.environ.get("ASK_FIRST_TEST_SECRET")
        ask_first.os.environ["ASK_FIRST_TEST_SECRET"] = "runtime-secret"
        try:
            settings = ask_first.resolve_runtime_settings(
                args=ask_first.parse_args(
                    [
                        "--workspace",
                        "/tmp/unused",
                        "--runtime-config",
                        "/tmp/unused.json",
                    ]
                ),
                config={
                    "app_id": "cli_test",
                    "app_secret_env": "ASK_FIRST_TEST_SECRET",
                    "receiver": {"type": "open_id", "open_id": "ou_test"},
                },
                contact_search_runner=lambda command: None,
            )
        finally:
            if old_value is None:
                ask_first.os.environ.pop("ASK_FIRST_TEST_SECRET", None)
            else:
                ask_first.os.environ["ASK_FIRST_TEST_SECRET"] = old_value

        self.assertEqual("cli_test", settings.app_id)
        self.assertEqual("runtime-secret", settings.app_secret)
        self.assertEqual("ou_test", settings.receiver_id)

    def test_runtime_config_resolves_secret_from_macos_keychain_reference(self):
        calls = []

        class Result:
            returncode = 0
            stdout = "keychain-secret\n"
            stderr = ""

        def fake_secret_lookup(command):
            calls.append(command)
            return Result()

        settings = ask_first.resolve_runtime_settings(
            args=ask_first.parse_args(["--workspace", "/tmp/unused"]),
            config={
                "app_id": "cli_test",
                "app_secret_keychain": {
                    "service": "trae.ask-first.test",
                    "account": "cli_test",
                },
                "receiver": {"type": "open_id", "open_id": "ou_test"},
            },
            contact_search_runner=lambda command: None,
            secret_lookup_runner=fake_secret_lookup,
        )

        self.assertEqual("keychain-secret", settings.app_secret)
        self.assertEqual(
            [
                "security",
                "find-generic-password",
                "-s",
                "trae.ask-first.test",
                "-a",
                "cli_test",
                "-w",
            ],
            calls[0],
        )

    def test_runtime_settings_uses_email_receive_id_for_email_query_from_config(self):
        old_secret = ask_first.os.environ.get("ASK_FIRST_TEST_SECRET")
        ask_first.os.environ["ASK_FIRST_TEST_SECRET"] = "runtime-secret"
        try:
            settings = ask_first.resolve_runtime_settings(
                args=ask_first.parse_args(["--workspace", "/tmp/unused"]),
                config={
                    "app_id": "cli_test",
                    "app_secret_env": "ASK_FIRST_TEST_SECRET",
                    "receiver": {
                        "type": "contact_query",
                        "query": "user@example.com",
                    },
                },
                contact_search_runner=lambda command: self.fail("email receiver should not trigger contact lookup"),
            )
        finally:
            if old_secret is None:
                ask_first.os.environ.pop("ASK_FIRST_TEST_SECRET", None)
            else:
                ask_first.os.environ["ASK_FIRST_TEST_SECRET"] = old_secret

        self.assertEqual("email", settings.receive_id_type)
        self.assertEqual("user@example.com", settings.receiver_id)

    def test_runtime_settings_uses_email_receive_id_for_email_query_from_args(self):
        old_app_id = ask_first.os.environ.get("ASK_FIRST_APP_ID")
        old_app_secret = ask_first.os.environ.get("ASK_FIRST_APP_SECRET")
        ask_first.os.environ["ASK_FIRST_APP_ID"] = "cli_test"
        ask_first.os.environ["ASK_FIRST_APP_SECRET"] = "secret"
        try:
            settings = ask_first.resolve_runtime_settings(
                args=ask_first.parse_args(
                    [
                        "--workspace",
                        "/tmp/unused",
                        "--receiver-query",
                        "user@example.com",
                    ]
                ),
                config={},
                contact_search_runner=lambda command: self.fail("email receiver should not trigger contact lookup"),
            )
        finally:
            if old_app_id is None:
                ask_first.os.environ.pop("ASK_FIRST_APP_ID", None)
            else:
                ask_first.os.environ["ASK_FIRST_APP_ID"] = old_app_id
            if old_app_secret is None:
                ask_first.os.environ.pop("ASK_FIRST_APP_SECRET", None)
            else:
                ask_first.os.environ["ASK_FIRST_APP_SECRET"] = old_app_secret

        self.assertEqual("email", settings.receive_id_type)
        self.assertEqual("user@example.com", settings.receiver_id)

    def test_receiver_query_resolves_open_id_via_lark_cli_without_shell(self):
        calls = []

        class Result:
            returncode = 0
            stdout = '{"data":{"items":[{"name":"测试同事","open_id":"ou_018eaef93640d1457d7313a523c8ca58"}]}}'
            stderr = ""

        def fake_runner(command):
            calls.append(command)
            return Result()

        receiver_id = ask_first.resolve_receiver_open_id_from_query("测试同事", fake_runner)

        self.assertEqual("ou_018eaef93640d1457d7313a523c8ca58", receiver_id)
        self.assertEqual(
            [
                "lark-cli",
                "contact",
                "+search-user",
                "--query",
                "测试同事",
                "--as",
                "user",
                "--format",
                "json",
            ],
            calls[0],
        )

    def test_receiver_query_fails_closed_on_multiple_matches(self):
        class Result:
            returncode = 0
            stdout = '{"data":{"items":[{"open_id":"ou_a"},{"open_id":"ou_b"}]}}'
            stderr = ""

        with self.assertRaisesRegex(RuntimeError, "多个"):
            ask_first.resolve_receiver_open_id_from_query("同名用户", lambda command: Result())

    def test_live_session_records_dispatch_failure_before_reraising(self):
        def start_receiver(**kwargs):
            return "receiver-handle"

        def send_card(**kwargs):
            raise RuntimeError("发送 Ask First 卡片失败: code=230006, msg=open_id cross app")

        with tempfile.TemporaryDirectory() as temp_dir:
            workspace, delivery_state = write_fixture_workspace(Path(temp_dir))
            context = ask_first.load_context(workspace, delivery_state)
            runner = ask_first.AskFirstRunner(context)

            with self.assertRaisesRegex(RuntimeError, "open_id cross app"):
                ask_first.run_live_session(
                    context=context,
                    runner=runner,
                    app_id="cli_app",
                    app_secret="secret",
                    receive_id_type="email",
                    receiver_id="user@example.com",
                    start_receiver=start_receiver,
                    send_card=send_card,
                    wait_for_receiver=lambda handle: None,
                )

            prd_notes = (workspace / "prd-notes.md").read_text(encoding="utf-8")
            self.assertIn("Ask First Feishu Dispatch Failure", prd_notes)
            self.assertIn("open_id cross app", prd_notes)
            self.assertIn("user@example.com", prd_notes)


if __name__ == "__main__":
    unittest.main()

import importlib.util
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "bootstrap_runtime_config.py"
SPEC = importlib.util.spec_from_file_location("bootstrap_runtime_config", MODULE_PATH)
bootstrap = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = bootstrap
SPEC.loader.exec_module(bootstrap)


class BootstrapRuntimeConfigTest(unittest.TestCase):
    def test_build_keychain_runtime_config_stores_email_receiver_without_secret_value(self):
        config = bootstrap.build_runtime_config(
            app_id="cli_test",
            receiver_type="email",
            receiver_value="user@example.com",
            keychain_service="trae.ask-first.test",
            keychain_account="cli_test",
        )

        rendered = json.dumps(config, ensure_ascii=False)
        self.assertIn("app_secret_keychain", rendered)
        self.assertNotIn("super-secret", rendered)
        self.assertEqual("cli_test", config["app_id"])
        self.assertEqual("email", config["receiver"]["type"])
        self.assertEqual("user@example.com", config["receiver"]["email"])

    def test_resolve_receiver_uses_email_type_for_email_query(self):
        receiver_type, receiver_value = bootstrap.resolve_receiver(
            bootstrap.parse_args(["--receiver-query", "user@example.com"])
        )

        self.assertEqual("email", receiver_type)
        self.assertEqual("user@example.com", receiver_value)

    def test_resolve_receiver_keeps_contact_query_for_non_email_name(self):
        receiver_type, receiver_value = bootstrap.resolve_receiver(
            bootstrap.parse_args(["--receiver-query", "测试同事"])
        )

        self.assertEqual("contact_query", receiver_type)
        self.assertEqual("测试同事", receiver_value)

    def test_store_secret_in_keychain_uses_security_command_without_shell(self):
        calls = []

        class Result:
            returncode = 0
            stdout = ""
            stderr = ""

        def fake_runner(command, **kwargs):
            calls.append((command, kwargs))
            return Result()

        bootstrap.store_secret_in_keychain(
            secret="super-secret",
            service="trae.ask-first.test",
            account="cli_test",
            runner=fake_runner,
        )

        self.assertEqual(
            [
                "security",
                "add-generic-password",
                "-U",
                "-s",
                "trae.ask-first.test",
                "-a",
                "cli_test",
                "-w",
                "super-secret",
            ],
            calls[0][0],
        )
        self.assertFalse(calls[0][1].get("shell", False))

    def test_write_runtime_config_uses_private_file_permissions(self):
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "ask-first-runtime.local.json"
            bootstrap.write_runtime_config(
                path,
                bootstrap.build_runtime_config(
                    app_id="cli_test",
                    receiver_type="open_id",
                    receiver_value="ou_test",
                    keychain_service="trae.ask-first.test",
                    keychain_account="cli_test",
                ),
            )

            self.assertEqual(0o600, os.stat(path).st_mode & 0o777)


if __name__ == "__main__":
    unittest.main()

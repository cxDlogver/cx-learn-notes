import json
import sqlite3
import sys
import tempfile
from contextlib import closing
from pathlib import Path


def apply(connection, migrations):
    current = connection.execute("PRAGMA user_version").fetchone()[0]
    for migration in migrations:
        version = migration["version"]
        if version <= current:
            continue
        assert version == current + 1
        connection.execute("BEGIN IMMEDIATE")
        try:
            for statement in migration["sql"].split(";"):
                if statement.strip():
                    connection.execute(statement)
            connection.execute(f"PRAGMA user_version = {version}")
            connection.commit()
            current = version
        except Exception:
            connection.rollback()
            raise


def main():
    migrations = json.load(sys.stdin)
    assert [entry["version"] for entry in migrations] == [1, 2]
    with tempfile.TemporaryDirectory(prefix="plan-checkin-local-") as directory:
        first = Path(directory) / "account-a.db"
        second = Path(directory) / "account-b.db"
        with closing(sqlite3.connect(first, isolation_level=None)) as database:
            database.execute("PRAGMA foreign_keys = ON")
            apply(database, migrations)
            tables = {row[0] for row in database.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            assert {"local_plans", "local_rule_versions", "local_checkins", "local_outbox", "local_media", "local_sync_cursor", "local_permission_tombstones"} <= tables
            database.execute("INSERT INTO local_plans VALUES (?,?,?,?,?)", ("plan-a", 1, "active", '{"title":"A"}', "2026-09-28T00:00:00Z"))
            database.execute("INSERT INTO local_checkins VALUES (?,?,?,?,?,?,?)", ("plan-a", "2026-09-28", 0, "local", '{"note":"local"}', "operation-a", "2026-09-28T00:00:00Z"))
            database.execute("INSERT INTO local_outbox(operation_id,plan_id,business_date,kind,status,payload,created_at) VALUES (?,?,?,?,?,?,?)", ("operation-a", "plan-a", "2026-09-28", "create", "pending", "{}", "2026-09-28T00:00:00Z"))
        with closing(sqlite3.connect(first, isolation_level=None)) as recovered:
            recovered.execute("PRAGMA foreign_keys = ON")
            apply(recovered, migrations)
            assert recovered.execute("SELECT count(*) FROM local_outbox").fetchone()[0] == 1
            assert recovered.execute("PRAGMA user_version").fetchone()[0] == 2
            try:
                apply(recovered, [{"version": 3, "sql": "CREATE TABLE should_rollback(id INTEGER); INVALID SQL"}])
                raise AssertionError("broken migration unexpectedly succeeded")
            except sqlite3.OperationalError:
                pass
            assert recovered.execute("PRAGMA user_version").fetchone()[0] == 2
            assert "should_rollback" not in {row[0] for row in recovered.execute("SELECT name FROM sqlite_master WHERE type='table'")}
            assert recovered.execute("SELECT count(*) FROM local_checkins").fetchone()[0] == 1
        with closing(sqlite3.connect(second, isolation_level=None)) as isolated:
            apply(isolated, migrations)
            assert isolated.execute("SELECT count(*) FROM local_plans").fetchone()[0] == 0
    print("Mobile local schema smoke passed: migrations, reopen, rollback and account file isolation.")


if __name__ == "__main__":
    main()

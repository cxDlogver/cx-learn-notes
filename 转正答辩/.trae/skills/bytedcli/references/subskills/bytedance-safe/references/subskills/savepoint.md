# Safe Savepoint

Savepoint emergency version and traffic commands. These commands are provided by the safecli plugin (repo `ies_safety/safecli`, bytedcli `>=0.88.0`). If a command is unknown, install the plugin first:

```bash
bytedcli self plugin install --repo ies_safety/safecli
bytedcli self plugin doctor --name safecli
```

Requires Safe authentication. See parent skill `bytedance-safe` for login instructions.

Important: `safe-test-lab.bytedance.net` is the production domain of the Savepoint test platform; it is not a test environment.

## Commands

```bash
# Read operations
bytedcli safe savepoint version list --scope demo-scope --scene demo-scene
bytedcli safe savepoint emergency list

# High-risk write operations; interactive mode prompts for confirmation
bytedcli safe savepoint emergency deploy --scope demo-scope --scene demo-scene --unified-version demo-version
bytedcli safe savepoint emergency load --scope demo-scope --scene demo-scene --unified-version demo-version --ratio 100 --batch-num 1
bytedcli safe savepoint emergency unload --scope demo-scope --scene demo-scene --unified-version demo-version --batch-num 1
```

## JSON / automation mode

```bash
bytedcli --json safe savepoint version list --scope demo-scope --scene demo-scene
bytedcli --json safe savepoint emergency list
bytedcli --json safe savepoint emergency deploy --scope demo-scope --scene demo-scene --unified-version demo-version --yes
bytedcli --json safe savepoint emergency load --scope demo-scope --scene demo-scene --unified-version demo-version --ratio 100 --batch-num 1 --yes
bytedcli --json safe savepoint emergency unload --scope demo-scope --scene demo-scene --unified-version demo-version --batch-num 1 --yes
```

In JSON or non-TTY mode, high-risk write commands require `--yes` to skip the interactive prompt.

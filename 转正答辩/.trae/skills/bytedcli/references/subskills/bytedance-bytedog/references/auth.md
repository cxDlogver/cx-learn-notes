# ByteDog Authentication

ByteDog API requires a ByteCloud JWT token for authentication. The `bytedcli bytedog` commands handle JWT acquisition and injection automatically via the global `--site` option.

## If authentication fails

You need to log in first:

```bash
# CN site
bytedcli auth login

# I18N site
bytedcli --site i18n-tt auth login
```

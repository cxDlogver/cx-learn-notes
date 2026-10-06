# Cache

```bash
# 服务列表
bytedcli cache list-starred-service --page 1 --page-size 20
bytedcli cache search-service --keyword "cache.demo" --page 1 --page-size 20
bytedcli cache get-service --psm "cache.demo"
bytedcli cache get-cluster --psm "cache.demo"
bytedcli cache get-idc-topology --psm "cache.demo"

# Redis 命令
bytedcli cache list-commands
bytedcli cache execute-command --psm "cache.demo" --command "GET" --args "key"

# 慢查询 / 大 Key / 热 Key
bytedcli cache slow-log --psm "cache.demo"
bytedcli cache list-big-keys --psm "cache.demo" --date "2026-02-05" --start "00:00:00" --end "23:59:59"
bytedcli cache list-hot-keys --psm "cache.demo" --date "2026-02-05" --start "00:00:00" --end "23:59:59" --type read

# 工单
bytedcli cache update-permission --psm "cache.demo" --change-type allow --target "example.service.psm"
bytedcli cache update-permission --psm "cache.demo" --change-type remove --target "example.service.psm" "demo.service.psm" --dry-run
bytedcli cache list-my-tickets --psm "cache.demo"
bytedcli cache list-service-tickets --psm "cache.demo" --page 1 --page-size 20

# 海外 SG（--site i18n-tt）
bytedcli --site i18n-tt cache list-starred-service

# 海外 US TTP
bytedcli --site ttp-us-limited cache list-starred-service

# 海外 EU TTP
bytedcli --site ttp-eu cache search-service --keyword "cache.demo" --page 1 --page-size 20
bytedcli --site ttp-eu cache get-cluster --psm "cache.demo"
bytedcli --site ttp-eu cache execute-command --psm "cache.demo" --command "GET" --args "key"
```

$ErrorActionPreference = 'Stop'
$name = 'webatdd08_' + [guid]::NewGuid().ToString('N').Substring(0, 10)
$container = $null
try {
  $container = (docker run --rm -d --name $name -e POSTGRES_PASSWORD=web_atdd_only -e POSTGRES_DB=web_atdd_web08 -p 127.0.0.1::5432 postgres:17-alpine).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $container) { throw 'Could not start isolated PostgreSQL' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $container pg_isready -U postgres -d web_atdd_web08 | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not become ready' }
  $mapping = docker port $container 5432/tcp
  if ($LASTEXITCODE -ne 0 -or $mapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Could not resolve loopback port' }
  $port = $Matches[1]
  $env:DATABASE_URL = "postgres://postgres:web_atdd_only@127.0.0.1:$port/web_atdd_web08"
  $env:WEB_ATDD_DATABASE_URL = $env:DATABASE_URL
  node scripts/migrate.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
  node scripts/web-records-http-smoke.mjs
  if ($LASTEXITCODE -ne 0) { throw 'HTTP smoke failed' }
} finally {
  Remove-Item Env:DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Item Env:WEB_ATDD_DATABASE_URL -ErrorAction SilentlyContinue
  if ($container) { docker stop $container | Out-Null }
}

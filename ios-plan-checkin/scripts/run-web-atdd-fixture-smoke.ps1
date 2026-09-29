$ErrorActionPreference = 'Stop'
$name = 'webatdd02_' + [guid]::NewGuid().ToString('N').Substring(0, 10)
$container = $null
try {
  $container = (docker run --rm -d --name $name -e POSTGRES_PASSWORD=web_atdd_only -e POSTGRES_DB=web_atdd_fixture -p 127.0.0.1::5432 postgres:17-alpine).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $container) { throw 'Could not start isolated PostgreSQL' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $container pg_isready -U postgres -d web_atdd_fixture | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not become ready' }
  $mapping = docker port $container 5432/tcp
  if ($LASTEXITCODE -ne 0 -or $mapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Could not resolve loopback port' }
  $port = $Matches[1]
  $env:DATABASE_URL = "postgres://postgres:web_atdd_only@127.0.0.1:$port/web_atdd_fixture"
  $env:WEB_ATDD_DATABASE_URL = $env:DATABASE_URL
  $env:APP_ENV = 'development'
  $env:SMS_PROVIDER = 'stub'
  $env:PHONE_ENCRYPTION_KEY = 'web_atdd_only_phone_encrypt'
  $env:PHONE_LOOKUP_KEY = 'web_atdd_only_phone_lookup'
  $env:AUTH_IDEMPOTENCY_KEY = 'web_atdd_only_idempotency'
  $env:ACCESS_TOKEN_SECRET = 'web_atdd_only_access'
  $env:OTP_HASH_KEY = 'web_atdd_only_otp'
  $env:PUSH_TOKEN_ENCRYPTION_KEY = 'web_atdd_only_push'
  node scripts/migrate.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed' }
  $runId = 'web02-selftest'
  $fixedNow = '2026-09-28T13:00:00Z'
  node scripts/web-atdd-fixture.mjs seed $runId $fixedNow
  if ($LASTEXITCODE -ne 0) { throw 'First seed failed' }
  node scripts/web-atdd-fixture-session-smoke.mjs $runId
  if ($LASTEXITCODE -ne 0) { throw 'Seeded Web session probe failed' }
  node scripts/web-atdd-fixture.mjs set-session-expiry $runId A3 -1
  if ($LASTEXITCODE -ne 0) { throw 'Database expiry setup failed' }
  node scripts/web-atdd-fixture-session-smoke.mjs $runId A3
  if ($LASTEXITCODE -ne 0) { throw 'Expired Web session was not rejected' }
  node scripts/web-atdd-fixture.mjs set-session-expiry $runId A3 3600
  if ($LASTEXITCODE -ne 0) { throw 'Database expiry restoration failed' }
  node scripts/web-atdd-fixture-session-smoke.mjs $runId
  if ($LASTEXITCODE -ne 0) { throw 'Restored Web session was not accepted' }
  node scripts/web-atdd-fixture.mjs cleanup $runId
  if ($LASTEXITCODE -ne 0) { throw 'First cleanup failed' }
  node scripts/web-atdd-fixture.mjs seed $runId $fixedNow
  if ($LASTEXITCODE -ne 0) { throw 'Rebuild seed failed' }
  node scripts/web-atdd-fixture.mjs cleanup $runId
  if ($LASTEXITCODE -ne 0) { throw 'Final cleanup failed' }
} finally {
  foreach ($variable in @('DATABASE_URL','WEB_ATDD_DATABASE_URL','APP_ENV','SMS_PROVIDER','PHONE_ENCRYPTION_KEY','PHONE_LOOKUP_KEY','AUTH_IDEMPOTENCY_KEY','ACCESS_TOKEN_SECRET','OTP_HASH_KEY','PUSH_TOKEN_ENCRYPTION_KEY')) {
    Remove-Item "Env:$variable" -ErrorAction SilentlyContinue
  }
  if ($container) { docker stop $container | Out-Null }
}

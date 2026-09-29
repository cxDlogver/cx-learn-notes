$ErrorActionPreference = 'Stop'
$name = 'webatdd-browser-' + [guid]::NewGuid().ToString('N').Substring(0, 10)
$container = $null
$api = $null
$artifact = Join-Path (Get-Location) 'docs/atdd/web/artifacts/web-05-api'
New-Item -ItemType Directory -Path $artifact -Force | Out-Null
try {
  $container = (docker run --rm -d --name $name -e POSTGRES_PASSWORD=web_atdd_only -e POSTGRES_DB=web_atdd_browser -p 127.0.0.1::5432 postgres:17-alpine).Trim()
  if ($LASTEXITCODE -ne 0 -or -not $container) { throw 'Could not start isolated PostgreSQL' }
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    docker exec $container pg_isready -U postgres -d web_atdd_browser | Out-Null
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    Start-Sleep -Seconds 1
  }
  if (-not $ready) { throw 'Isolated PostgreSQL did not become ready' }
  $mapping = docker port $container 5432/tcp
  if ($LASTEXITCODE -ne 0 -or $mapping -notmatch '^127\.0\.0\.1:(\d+)$') { throw 'Could not resolve loopback database port' }
  $port = $Matches[1]
  $env:DATABASE_URL = "postgres://postgres:web_atdd_only@127.0.0.1:$port/web_atdd_browser"
  $env:APP_ENV = 'development'
  $env:SMS_PROVIDER = 'stub'
  $env:PHONE_ENCRYPTION_KEY = 'web_atdd_only_phone_encrypt'
  $env:PHONE_LOOKUP_KEY = 'web_atdd_only_phone_lookup'
  $env:AUTH_IDEMPOTENCY_KEY = 'web_atdd_only_idempotency'
  $env:ACCESS_TOKEN_SECRET = 'web_atdd_only_access'
  $env:OTP_HASH_KEY = 'web_atdd_only_otp'
  $env:PUSH_TOKEN_ENCRYPTION_KEY = 'web_atdd_only_push'
  $env:OBJECT_ENDPOINT = 'http://127.0.0.1:19000'
  $env:OBJECT_PUBLIC_ENDPOINT = 'http://127.0.0.1:19000'
  $env:OBJECT_BUCKET = 'plan-checkin-local'
  $env:OBJECT_ACCESS_KEY_ID = 'localdev'
  $env:OBJECT_SECRET_ACCESS_KEY = 'local_only_change_me'
  $env:WEB_ORIGIN = 'http://127.0.0.1:5173'
  $env:API_PORT = '3001'
  node scripts/migrate.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Browser test migrations failed' }
  $node = (Get-Command node).Source
  $api = Start-Process -FilePath $node -ArgumentList 'apps/api/dist/main.js' -PassThru -WindowStyle Hidden -RedirectStandardOutput (Join-Path $artifact 'api-stdout.log') -RedirectStandardError (Join-Path $artifact 'api-stderr.log')
  $listening = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $response = Invoke-WebRequest -Uri 'http://127.0.0.1:5173/api/v1/auth/web/session' -TimeoutSec 2 -UseBasicParsing
      if ($response.StatusCode -eq 401) { $listening = $true; break }
    } catch {
      if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -eq 401) {
        $listening = $true
        break
      }
    }
    Start-Sleep -Seconds 1
  }
  if (-not $listening) { throw 'Isolated Web API did not become ready' }
  Write-Output 'WEB_ATDD_API_READY origin=http://127.0.0.1:5173 apiPort=3001 database=web_atdd_browser'
  while ($true) { Start-Sleep -Seconds 1 }
} finally {
  if ($api -and -not $api.HasExited) { Stop-Process -Id $api.Id -ErrorAction SilentlyContinue }
  if ($container) { docker stop $container | Out-Null }
  foreach ($variable in @('DATABASE_URL','APP_ENV','SMS_PROVIDER','PHONE_ENCRYPTION_KEY','PHONE_LOOKUP_KEY','AUTH_IDEMPOTENCY_KEY','ACCESS_TOKEN_SECRET','OTP_HASH_KEY','PUSH_TOKEN_ENCRYPTION_KEY','OBJECT_ENDPOINT','OBJECT_PUBLIC_ENDPOINT','OBJECT_BUCKET','OBJECT_ACCESS_KEY_ID','OBJECT_SECRET_ACCESS_KEY','WEB_ORIGIN','API_PORT')) {
    Remove-Item "Env:$variable" -ErrorAction SilentlyContinue
  }
}

param(
  [string]$InterfaceAlias = 'WLAN',
  [switch]$Restart,
  [switch]$Build
)

$ErrorActionPreference = 'Stop'
if ($PSVersionTable.PSVersion.Major -lt 7) {
  throw 'Start this script with PowerShell 7 (pwsh).'
}

$workspace = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envPath = Join-Path $workspace '.env'
$localDirectory = Join-Path $workspace 'apps/api/.local'
$certPath = Join-Path $localDirectory 'lan-dev-cert.pem'
$keyPath = Join-Path $localDirectory 'lan-dev-key.pem'
$opensslConfigPath = Join-Path $localDirectory 'lan-openssl.cnf'
if (-not (Test-Path -LiteralPath $envPath)) {
  throw 'Missing local .env. Create it from .env.example and configure development secrets first.'
}
New-Item -ItemType Directory -Path $localDirectory -Force | Out-Null

$addresses = @(
  Get-NetIPAddress -InterfaceAlias $InterfaceAlias -AddressFamily IPv4 |
    Where-Object {
      $_.AddressState -eq 'Preferred' -and
      $_.IPAddress -notmatch '^(127\.|169\.254\.)'
    }
)
if ($addresses.Count -ne 1) {
  throw "Expected one active IPv4 address on $InterfaceAlias; found $($addresses.Count)."
}
$lanIp = $addresses[0].IPAddress
$origin = "https://${lanIp}:5173"
$networkProfile = Get-NetConnectionProfile -InterfaceAlias $InterfaceAlias

$contents = [System.IO.File]::ReadAllText($envPath)
$expected = [ordered]@{
  WEB_ORIGIN = $origin
  OBJECT_PUBLIC_ENDPOINT = $origin
  PLAN_CHECKIN_OBJECT_ALLOWED_ORIGINS = "$origin,https://localhost:5173"
  API_HOST = '127.0.0.1'
}
$configChanged = $false
foreach ($name in $expected.Keys) {
  $pattern = '(?m)^' + [regex]::Escape($name) + '=(.*)$'
  $match = [regex]::Match($contents, $pattern)
  if (-not $match.Success) { throw "Missing $name in .env" }
  if ($match.Groups[1].Value -eq $expected[$name]) { continue }
  $replacement = "$name=$($expected[$name])"
  $contents = $contents.Substring(0, $match.Index) + $replacement +
    $contents.Substring($match.Index + $match.Length)
  $configChanged = $true
}
if ($configChanged) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  Copy-Item -LiteralPath $envPath -Destination (Join-Path $localDirectory "env-backup-$stamp.txt")
  [System.IO.File]::WriteAllText(
    $envPath,
    $contents,
    [System.Text.UTF8Encoding]::new($false)
  )
  Write-Output "Updated local Web/API/object origins to $origin."
}

$openssl = (Get-Command openssl -ErrorAction Stop).Source
$configText = "[req]`ndistinguished_name = dn`nprompt = no`n[dn]`nCN = $lanIp`n"
[System.IO.File]::WriteAllText(
  $opensslConfigPath,
  $configText,
  [System.Text.UTF8Encoding]::new($false)
)
$certificateValid = $false
if ((Test-Path -LiteralPath $certPath) -and (Test-Path -LiteralPath $keyPath)) {
  $san = (& $openssl x509 -in $certPath -noout -ext subjectAltName 2>$null | Out-String)
  $sanValid = $LASTEXITCODE -eq 0 -and
    $san.Contains("IP Address:$lanIp") -and
    $san.Contains('IP Address:127.0.0.1')
  & $openssl x509 -in $certPath -checkend 86400 -noout 2>$null | Out-Null
  $certificateValid = $sanValid -and $LASTEXITCODE -eq 0
}
$certificateRotated = -not $certificateValid
if ($certificateRotated) {
  $stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
  if (Test-Path -LiteralPath $certPath) {
    Copy-Item -LiteralPath $certPath -Destination (Join-Path $localDirectory "lan-dev-cert-$stamp.bak.pem")
  }
  if (Test-Path -LiteralPath $keyPath) {
    Copy-Item -LiteralPath $keyPath -Destination (Join-Path $localDirectory "lan-dev-key-$stamp.bak.pem")
  }
  $temporaryCert = Join-Path $localDirectory "lan-dev-cert-$stamp.tmp.pem"
  $temporaryKey = Join-Path $localDirectory "lan-dev-key-$stamp.tmp.pem"
  try {
    & $openssl req -x509 -newkey rsa:2048 -sha256 -nodes -days 30 `
      -keyout $temporaryKey -out $temporaryCert -config $opensslConfigPath `
      -addext "subjectAltName=IP:$lanIp,IP:127.0.0.1,DNS:localhost" 2>$null
    if ($LASTEXITCODE -ne 0) { throw 'Could not create the LAN development certificate.' }
    $newSan = (& $openssl x509 -in $temporaryCert -noout -ext subjectAltName | Out-String)
    if ($LASTEXITCODE -ne 0 -or -not $newSan.Contains("IP Address:$lanIp")) {
      throw 'The generated certificate is missing the current LAN IP SAN.'
    }
    $certificatePublicKey = (& $openssl x509 -in $temporaryCert -pubkey -noout | Out-String).Trim()
    $privatePublicKey = (& $openssl pkey -in $temporaryKey -pubout | Out-String).Trim()
    if ($certificatePublicKey -ne $privatePublicKey) {
      throw 'The generated certificate and private key do not match.'
    }
    Copy-Item -LiteralPath $temporaryCert -Destination $certPath -Force
    Copy-Item -LiteralPath $temporaryKey -Destination $keyPath -Force
  } finally {
    Remove-Item -LiteralPath $temporaryCert, $temporaryKey -ErrorAction SilentlyContinue
  }
  Write-Output "Generated a new local HTTPS certificate for $lanIp."
}

$apiEntry = Join-Path $workspace 'apps/api/dist/main.js'
$workerEntry = Join-Path $workspace 'apps/worker/dist/main.js'
$webDirectory = Join-Path $workspace 'apps/web'
$webEntry = Join-Path $webDirectory 'node_modules/vite/bin/vite.js'
$node = $null
$nodeVersion = [version]'0.0.0'
foreach ($candidate in @(Get-Command node -All -ErrorAction Stop)) {
  if (-not $candidate.Source -or -not (Test-Path -LiteralPath $candidate.Source)) { continue }
  $reported = (& $candidate.Source --version 2>$null | Out-String).Trim()
  if ($LASTEXITCODE -ne 0 -or $reported -notmatch '^v?(\d+\.\d+\.\d+)$') { continue }
  $version = [version]$Matches[1]
  if ($version -ge [version]'22.13.0' -and $version -gt $nodeVersion) {
    $node = $candidate.Source
    $nodeVersion = $version
  }
}
if (-not $node) { throw 'Node.js >=22.13.0 is required for this project.' }
Write-Output "Using Node.js $nodeVersion."
if ($Build) {
  $tscEntry = Join-Path $workspace 'node_modules/typescript/bin/tsc'
  if (-not (Test-Path -LiteralPath $tscEntry)) {
    throw 'Dependencies are not installed. Install the workspace packages with a working pnpm first.'
  }
  foreach ($package in @('contracts', 'domain', 'design-tokens')) {
    & $node $tscEntry -p (Join-Path $workspace "packages/$package/tsconfig.json")
    if ($LASTEXITCODE -ne 0) { throw "Build failed for $package." }
  }
  foreach ($package in @('api', 'worker')) {
    & $node $tscEntry -p (Join-Path $workspace "apps/$package/tsconfig.json")
    if ($LASTEXITCODE -ne 0) { throw "Build failed for $package." }
  }
  & $node $tscEntry --noEmit -p (Join-Path $webDirectory 'tsconfig.json')
  if ($LASTEXITCODE -ne 0) { throw 'Web typecheck failed.' }
  Push-Location $webDirectory
  try {
    & $node $webEntry build
    if ($LASTEXITCODE -ne 0) { throw 'Web build failed.' }
  } finally {
    Pop-Location
  }
  Write-Output 'Workspace API, Worker and Web builds passed.'
}
foreach ($entry in @($apiEntry, $workerEntry, $webEntry)) {
  if (-not (Test-Path -LiteralPath $entry)) {
    throw "Missing built dependency: $entry. Build/install the project first."
  }
}

function Find-ManagedProcess([string]$entry) {
  $found = @(
    Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" |
      Where-Object {
        $_.CommandLine -and
        $_.CommandLine.IndexOf($entry, [StringComparison]::OrdinalIgnoreCase) -ge 0
      }
  )
  if ($found.Count -gt 1) { throw "More than one local process uses $entry" }
  if ($found.Count -eq 1) { return $found[0] }
  return $null
}

if ($configChanged -or $certificateRotated -or $Restart -or $Build) {
  foreach ($entry in @($webEntry, $workerEntry, $apiEntry)) {
    $managed = Find-ManagedProcess $entry
    if ($managed) {
      Stop-Process -Id $managed.ProcessId -ErrorAction Stop
      Write-Output "Stopped stale local process $($managed.ProcessId)."
    }
  }
}

function Test-DockerReady {
  & docker info --format '{{.ServerVersion}}' 2>$null | Out-Null
  return $LASTEXITCODE -eq 0
}

if (-not (Test-DockerReady)) {
  $dockerExecutable = (Get-Command docker -ErrorAction Stop).Source
  $dockerInstall = Split-Path (Split-Path (Split-Path $dockerExecutable -Parent) -Parent) -Parent
  $dockerDesktop = Join-Path $dockerInstall 'Docker Desktop.exe'
  if (-not (Test-Path -LiteralPath $dockerDesktop)) {
    throw 'Docker Desktop is stopped and its launcher could not be found.'
  }
  Start-Process -FilePath $dockerDesktop -WindowStyle Hidden | Out-Null
  $ready = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    Start-Sleep -Seconds 3
    if (Test-DockerReady) { $ready = $true; break }
  }
  if (-not $ready) { throw 'Docker Desktop did not become ready within 90 seconds.' }
}

Push-Location $workspace
try {
  & docker compose --env-file .env -f infra/compose.yaml up -d --wait
  if ($LASTEXITCODE -ne 0) { throw 'Local dependency containers did not become healthy.' }
  & $node '--env-file=.env' scripts/migrate.mjs
  if ($LASTEXITCODE -ne 0) { throw 'Local database migrations failed.' }

  function Ensure-ManagedProcess(
    [string]$name,
    [string]$entry,
    [string]$workingDirectory,
    [int]$port = 0
  ) {
    $managed = Find-ManagedProcess $entry
    if ($port -gt 0) {
      $listener = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue |
        Select-Object -First 1
      if ($listener -and (-not $managed -or $listener.OwningProcess -ne $managed.ProcessId)) {
        throw "Port $port is occupied by an unmanaged process $($listener.OwningProcess)."
      }
    }
    if ($managed) {
      Write-Output "Reusing $name PID $($managed.ProcessId)."
      return
    }
    $arguments = if ($name -eq 'web') {
      @("`"$entry`"")
    } else {
      @("--env-file=`"$envPath`"", "`"$entry`"")
    }
    $started = Start-Process -FilePath $node -ArgumentList $arguments `
      -WorkingDirectory $workingDirectory -WindowStyle Hidden -PassThru `
      -RedirectStandardOutput (Join-Path $localDirectory "lan-$name.stdout.log") `
      -RedirectStandardError (Join-Path $localDirectory "lan-$name.stderr.log")
    Write-Output "Started $name PID $($started.Id)."
  }

  Ensure-ManagedProcess 'api' $apiEntry $workspace 3000
  Ensure-ManagedProcess 'worker' $workerEntry $workspace
  Ensure-ManagedProcess 'web' $webEntry $webDirectory 5173

  $healthy = $false
  for ($attempt = 0; $attempt -lt 30; $attempt++) {
    try {
      $page = Invoke-WebRequest -Uri "$origin/login" -SkipCertificateCheck -TimeoutSec 3
      $api = Invoke-WebRequest -Uri "$origin/api/v1/health/ready" -SkipCertificateCheck -TimeoutSec 3
      if ($page.StatusCode -eq 200 -and $api.StatusCode -eq 200) {
        $healthy = $true
        break
      }
    } catch {
      Start-Sleep -Seconds 1
    }
  }
  if (-not $healthy) { throw 'LAN Web or API failed its local health check.' }
} finally {
  Pop-Location
}

$rule = Get-NetFirewallRule -DisplayName 'Plan Checkin Web LAN 5173' -ErrorAction SilentlyContinue
if ($rule) {
  $portFilter = $rule | Get-NetFirewallPortFilter
  $addressFilter = $rule | Get-NetFirewallAddressFilter
  if (
    $rule.Enabled -ne 'True' -or
    $rule.Profile -ne 'Private' -or
    $rule.Direction -ne 'Inbound' -or
    $rule.Action -ne 'Allow' -or
    $portFilter.Protocol -ne 'TCP' -or
    $portFilter.LocalPort -ne '5173' -or
    $addressFilter.RemoteAddress -ne 'LocalSubnet'
  ) {
    throw 'The existing LAN firewall rule does not match the approved Private/LocalSubnet TCP 5173 scope.'
  }
} else {
  Write-Warning 'The approved Private/LocalSubnet TCP 5173 firewall rule is absent; remote devices may be blocked.'
}
if ($networkProfile.NetworkCategory -ne 'Private') {
  Write-Warning "The $InterfaceAlias network profile is not Private; the scoped firewall rule will not allow remote devices."
}

Write-Output "LAN_URL=$origin/"
Write-Output "API_HEALTH=$origin/api/v1/health/ready"
Write-Output "CERTIFICATE=$certPath"
if ($certificateRotated) {
  Write-Warning 'The certificate changed. Other devices must trust the new public certificate before browser secure-context features can work.'
}
Write-Output 'Local host and container checks do not establish physical phone/browser reachability.'

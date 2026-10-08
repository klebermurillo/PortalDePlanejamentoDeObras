$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
  throw "Docker Desktop/Engine nao encontrado. Instale Docker com Docker Compose e tente novamente."
}
docker compose version | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "Docker Compose v2 nao esta disponivel."
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
}

if (Select-String -Path ".env" -Pattern '^DB_(ROOT_)?PASSWORD=configure-' -Quiet) {
  $bytes = New-Object byte[] 32
  $random = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  try {
    $random.GetBytes($bytes)
    $dbPassword = [BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant()
    $random.GetBytes($bytes)
    $rootPassword = [BitConverter]::ToString($bytes).Replace("-", "").ToLowerInvariant()
  } finally {
    $random.Dispose()
  }

  $environment = (Get-Content ".env" -Raw) -replace '(?m)^DB_PASSWORD=configure-[^\r\n]*', "DB_PASSWORD=$dbPassword"
  $environment = $environment -replace '(?m)^DB_ROOT_PASSWORD=configure-[^\r\n]*', "DB_ROOT_PASSWORD=$rootPassword"
  [System.IO.File]::WriteAllText((Join-Path $PSScriptRoot ".env"), $environment, [System.Text.UTF8Encoding]::new($false))
  Write-Host "Placeholders do MySQL no .env foram substituidos por senhas aleatorias."
}

if (-not (Select-String -Path ".env" -Pattern '^DB_PASSWORD=.+$' -Quiet) -or -not (Select-String -Path ".env" -Pattern '^DB_ROOT_PASSWORD=.+$' -Quiet)) {
  throw "Configure DB_PASSWORD e DB_ROOT_PASSWORD no .env."
}

Write-Host "Construindo a aplicacao e iniciando o MySQL..."
docker compose up --detach --build --wait
if ($LASTEXITCODE -ne 0) { throw "Falha ao iniciar os servicos Docker." }

Write-Host "Verificando o administrador inicial..."
docker compose exec app node dist/scripts/criarAdministrador.js --if-empty
if ($LASTEXITCODE -ne 0) { throw "Falha na configuracao do administrador." }

$portLine = Get-Content ".env" | Where-Object { $_ -match '^PORT=' } | Select-Object -First 1
$port = if ($portLine) { ($portLine -split "=", 2)[1] } else { "3000" }
$url = "http://localhost:$port"
Start-Process $url

Write-Host "SIGPO esta no ar: $url"
Write-Host "Para parar sem apagar os dados: docker compose down"
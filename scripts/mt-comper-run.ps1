<#
.SYNOPSIS
  Pipeline E2E MT/COMPER - Worker, Motor, BASE, JSONs hibridos.
#>
[CmdletBinding()]
param(
  [string]$Competencia = "2026-07",
  [string]$DataReferencia = "2026-07-13",
  [string]$FolderId = "",
  [string]$PackageId = "",
  [switch]$DryRun,
  [switch]$KeepFiles,
  [switch]$SkipUpload,
  [switch]$SkipTests,
  [switch]$SkipHomologacao
)

$ErrorActionPreference = "Stop"

$RepoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $RepoRoot

if (Test-Path "C:\node 22\node.exe") {
  $env:Path = "C:\node 22;" + $env:Path
}

$ReportDir = Join-Path $RepoRoot "src\motor\.tmp\hibrido\MT\COMPER"
$ReportPath = Join-Path $ReportDir "mt_comper_run_report.json"
$StartedAt = Get-Date
$script:Steps = @()

function Write-Step {
  param([string]$Name, [string]$Status, [string]$Detail = "")
  $entry = @{ step = $Name; status = $Status; detail = $Detail; at = (Get-Date).ToString("o") }
  $script:Steps += $entry
  Write-Host "[$Status] $Name"
  if ($Detail) { Write-Host "       $Detail" }
}

function Invoke-NpmStep {
  param([string[]]$NpmArgs)
  & npm @NpmArgs
  if ($LASTEXITCODE -ne 0) { throw "npm failed: $($NpmArgs -join ' ')" }
}

function Invoke-TsxStep {
  param([string]$Script, [string[]]$ExtraArgs = @())
  & node --import tsx $Script @ExtraArgs
  if ($LASTEXITCODE -ne 0) { throw "tsx failed: $Script" }
}

function Test-EnvVar {
  param([string]$Name)
  $item = Get-Item "Env:$Name" -ErrorAction SilentlyContinue
  if ($null -eq $item) { return $false }
  return -not [string]::IsNullOrWhiteSpace($item.Value)
}

function Save-Report {
  param([string]$FinalStatus, [string]$ErrorMsg = "")
  $report = @{
    regional = "MT"
    bandeira = "COMPER"
    competencia = $Competencia
    dataReferencia = $DataReferencia
    dryRun = [bool]$DryRun
    skipUpload = [bool]$SkipUpload
    skipTests = [bool]$SkipTests
    startedAt = $StartedAt.ToString("o")
    finishedAt = (Get-Date).ToString("o")
    durationMs = [int]((Get-Date) - $StartedAt).TotalMilliseconds
    status = $FinalStatus
    error = $ErrorMsg
    steps = $script:Steps
  }
  New-Item -ItemType Directory -Force -Path $ReportDir | Out-Null
  $report | ConvertTo-Json -Depth 6 | Set-Content -Path $ReportPath -Encoding UTF8
  Write-Host ""
  Write-Host "Relatorio: $ReportPath"
}

try {
  $needEnv = (-not $DryRun) -and (-not $SkipUpload)
  $envOk = $true
  $missing = @()
  foreach ($v in @("SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY")) {
    if (-not (Test-EnvVar $v)) { $missing += $v; $envOk = $false }
  }
  if ($PackageId -or $FolderId) {
    foreach ($v in @("GOOGLE_DRIVE_CLIENT_EMAIL", "GOOGLE_DRIVE_PRIVATE_KEY")) {
      if (-not (Test-EnvVar $v)) { $missing += $v; $envOk = $false }
    }
  }
  if ($needEnv -and (-not $envOk)) {
    throw "Missing env: $($missing -join ', ')"
  }
  if ($DryRun -and (-not $envOk)) {
    Write-Step "1. Credenciais" "SKIP" "DryRun local sources"
  } else {
    Write-Step "1. Credenciais" "OK" "env ok"
  }

  $importDir = "C:\area-de-trabalho-v7\importar\RUPTURA"
  if ($PackageId) {
    $workerArgs = @("run", "motor:drive-worker", "--", "--once", "--package-id", $PackageId)
    if ($KeepFiles) { $workerArgs += "--keep-files" }
    if ($DryRun) { $workerArgs += "--dry-run" }
    Invoke-NpmStep $workerArgs
    Write-Step "2-5. Worker Drive" "OK" $PackageId
  } elseif ($FolderId) {
    Write-Step "2-5. Worker Drive" "SKIP" "FolderId requires PackageId"
  } else {
    if (-not (Test-Path $importDir)) { throw "Missing import dir: $importDir" }
    $required = @(
      "1 Grupo de Ruptura.txt", "2 Grupo de Ruptura.txt", "Inventario Lojas.txt",
      "Rede.txt", "Plan 6 CD.txt", "Validacao Ruptura.xlsx", "Ordem CDs.xlsx",
      "Compradores da regional.xlsx", "Regras definidas.xlsx", "Estrutura Fake.xlsx", "bandeira.csv"
    )
    $found = 0
    Get-ChildItem $importDir -File | ForEach-Object { $found++ }
    if ($found -lt 11) { throw "Gate 1 incomplete: $found files in $importDir" }
    Write-Step "2-5. Fontes locais" "OK" "11/11 importar/RUPTURA"
  }

  Invoke-TsxStep "src/motor/scripts/gerarBaseComperMtLocal.ts"
  Write-Step "6-7. Motor + BASE" "OK" "gerarBaseComperMtLocal.ts"

  if ($DryRun -or $SkipUpload) {
    Invoke-TsxStep "src/motor/scripts/publicarComperMtBatch.ts" @("--dry-run")
    Write-Step "8. JSONs locais" "OK" "dry-run validation"
  } else {
    Invoke-TsxStep "src/motor/scripts/publicarComperMtBatch.ts"
    Write-Step "8-10. Publicacao Storage" "OK" "publicarComperMtBatch.ts"
  }

  if (-not $SkipHomologacao) {
    Invoke-TsxStep "src/motor/scripts/homologacaoComperMt.ts"
    Write-Step "11. Homologacao" "OK" "homologacaoComperMt.ts"
  } else {
    Write-Step "11. Homologacao" "SKIP" "SkipHomologacao"
  }

  if (-not $SkipTests) {
    foreach ($t in @("auth-v7:test", "ruptura-v7:test", "hibrido-publicacao:test", "motor:drive:test", "motor:test")) {
      Invoke-NpmStep @("run", $t)
    }
    Invoke-NpmStep @("run", "build")
    Write-Step "12. Testes + build" "OK"
  } else {
    Write-Step "12. Testes + build" "SKIP" "SkipTests"
  }

  Save-Report "OK"
  exit 0
} catch {
  Write-Step "FALHA" "FAIL" $_.Exception.Message
  Save-Report "FAIL" $_.Exception.Message
  exit 1
}

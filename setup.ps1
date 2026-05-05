param()

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Invoke-Pnpm {
  param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Args
  )

  $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue
  if ($null -ne $pnpmCmd) {
    & pnpm @Args
    return
  }

  $corepackCmd = Get-Command corepack -ErrorAction SilentlyContinue
  if ($null -eq $corepackCmd) {
    throw "pnpm was not found and corepack is unavailable. Install pnpm or enable Corepack, then rerun setup."
  }

  & corepack pnpm @Args
}

function Import-EnvFile {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return
  }

  foreach ($rawLine in Get-Content $Path) {
    $line = $rawLine.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith("#")) {
      continue
    }

    $eqIndex = $line.IndexOf("=")
    if ($eqIndex -lt 1) {
      continue
    }

    $key = $line.Substring(0, $eqIndex).Trim()
    $value = $line.Substring($eqIndex + 1).Trim()

    if (
      ($value.StartsWith('"') -and $value.EndsWith('"')) -or
      ($value.StartsWith("'") -and $value.EndsWith("'"))
    ) {
      $value = $value.Substring(1, $value.Length - 2)
    }

    if ([string]::IsNullOrWhiteSpace($key) -or [string]::IsNullOrWhiteSpace($value)) {
      continue
    }

    Set-Item -Path "Env:$key" -Value $value
  }
}

function Test-PlaceholderValues {
  param([string]$Path)

  if (-not (Test-Path $Path)) {
    return $true
  }

  $content = Get-Content $Path -Raw
  return (
    $content -match 'pk_\.\.\.' -or
    $content -match 'sk_\.\.\.' -or
    $content -match 'your-secret-here' -or
    $content -match 'change-me'
  )
}

$envFile = Join-Path $root ".env.local"
$exampleFile = Join-Path $root ".env.example"

if (-not (Test-Path $envFile)) {
  if (-not (Test-Path $exampleFile)) {
    throw ".env.example is missing, so setup cannot create .env.local."
  }

  Copy-Item $exampleFile $envFile
  Write-Host "Created .env.local from .env.example. Fill in the real values there, then rerun setup if needed." -ForegroundColor Yellow
}

Invoke-Pnpm @("install")

if (Test-PlaceholderValues $envFile) {
  Write-Host "Setup stopped after install because .env.local still contains placeholder values." -ForegroundColor Yellow
  Write-Host "Fill in VITE_CLERK_PUBLISHABLE_KEY, CLERK_SECRET_KEY, DATABASE_URL, and SESSION_SECRET, then run:" -ForegroundColor Yellow
  Write-Host "  pnpm dev" -ForegroundColor Yellow
  exit 0
}

Import-EnvFile $envFile

Invoke-Pnpm @("--filter", "@workspace/db", "run", "push")

Write-Host ""
Write-Host "Setup complete. Start the app with:" -ForegroundColor Green
Write-Host "  pnpm dev" -ForegroundColor Green

param(
  [switch]$SkipNodeInstall,
  [switch]$SkipPythonInstall,
  [switch]$SkipPlaywright
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location "$repoRoot"

function Write-Step {
  param([string]$Message)
  Write-Host ""
  Write-Host "==> $Message"
}

function Resolve-PythonLauncher {
  foreach ($candidate in @("python", "python3")) {
    if (Get-Command "$candidate" -ErrorAction SilentlyContinue) {
      & "$candidate" --version *> $null
      if ($LASTEXITCODE -eq 0) {
        return $candidate
      }
    }
  }

  if (Get-Command "py" -ErrorAction SilentlyContinue) {
    & "py" -3 --version *> $null
    if ($LASTEXITCODE -eq 0) {
      return "py"
    }
  }

  throw "Python 3 was not found. Please install Python >= 3.10 first."
}

function Invoke-Python {
  param([string[]]$Arguments)

  if ($script:PythonLauncher -eq "py") {
    & "py" -3 @Arguments
    return
  }

  & "$script:PythonLauncher" @Arguments
}

function Add-EnvValueIfMissing {
  param(
    [string]$Path,
    [string]$Name,
    [string]$Value
  )

  $pattern = "^\s*${Name}\s*="
  if (Select-String -Path "$Path" -Pattern "$pattern" -Quiet) {
    return
  }

  Add-Content -Path "$Path" -Value ""
  Add-Content -Path "$Path" -Value "$Name=$Value"
}

if (-not $SkipNodeInstall) {
  Write-Step "Installing Node.js dependencies"
  if (Test-Path "package-lock.json") {
    & "npm" "ci"
  } else {
    & "npm" "install"
  }
}

$script:PythonLauncher = Resolve-PythonLauncher
$venvDir = Join-Path "$repoRoot" ".venv"
$isWindows = $env:OS -eq "Windows_NT"
$venvPython = if ($isWindows) {
  Join-Path "$venvDir" "Scripts/python.exe"
} else {
  Join-Path "$venvDir" "bin/python"
}

if (-not $SkipPythonInstall) {
  Write-Step "Creating Python virtual environment"
  if (-not (Test-Path "$venvDir")) {
    Invoke-Python @("-m", "venv", "$venvDir")
  }

  Write-Step "Installing Python dependencies"
  & "$venvPython" "-m" "pip" "install" "--upgrade" "pip"
  & "$venvPython" "-m" "pip" "install" "-r" "requirements.txt"
}

if (-not $SkipPlaywright) {
  Write-Step "Installing Playwright Chromium"
  & "$venvPython" "-m" "playwright" "install" "chromium"
}

Write-Step "Initializing local environment variables"
if (-not (Test-Path ".env.local")) {
  Copy-Item -LiteralPath ".env.example" -Destination ".env.local"
}
Add-EnvValueIfMissing -Path ".env.local" -Name "PYTHON_PATH" -Value "$venvPython"

Write-Host ""
Write-Host "Local environment is ready."
Write-Host "Configure AI provider and API keys in .env.local, then run:"
Write-Host "  npm run dev"

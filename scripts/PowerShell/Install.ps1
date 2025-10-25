<#
.SYNOPSIS
    Installation script for Claude CLI PowerShell integration

.DESCRIPTION
    Sets up the Claude CLI PowerShell module by:
    - Verifying Node.js and npm are installed
    - Building the TypeScript CLI application
    - Adding the module to PowerShell profile
    - Creating necessary configuration

.PARAMETER AddToProfile
    Add module import to PowerShell profile (default: true)

.PARAMETER EnableAutoDetection
    Enable automatic question detection in PowerShell prompt (default: false)

.PARAMETER Force
    Force reinstallation even if already installed

.EXAMPLE
    .\Install.ps1
    Install with default settings

.EXAMPLE
    .\Install.ps1 -EnableAutoDetection
    Install and enable auto-detection mode

.EXAMPLE
    .\Install.ps1 -Force
    Force reinstallation
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [bool]$AddToProfile = $true,

    [Parameter(Mandatory=$false)]
    [switch]$EnableAutoDetection,

    [Parameter(Mandatory=$false)]
    [switch]$Force
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Claude CLI PowerShell Integration - Installation       ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 7) {
    Write-Host "ERROR: This module requires PowerShell 7 or later." -ForegroundColor Red
    Write-Host ""
    Write-Host "You are currently running PowerShell $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please install PowerShell 7:" -ForegroundColor Cyan
    Write-Host "  Windows: winget install Microsoft.PowerShell" -ForegroundColor White
    Write-Host "  Or download from: https://aka.ms/powershell" -ForegroundColor White
    Write-Host ""
    Write-Host "After installing, run this script using 'pwsh' instead of 'powershell'" -ForegroundColor Cyan
    exit 1
}

Write-Host "✓ PowerShell $($PSVersionTable.PSVersion) detected" -ForegroundColor Green
Write-Host ""

# Get project root
$ProjectRoot = Split-Path (Split-Path $PSScriptRoot)
$ModulePath = Join-Path $PSScriptRoot "ClaudePrompt.psm1"

Write-Host "[1/6] Checking prerequisites..." -ForegroundColor Yellow

# Check Node.js
try {
    $nodeVersion = node --version
    Write-Host "  ✓ Node.js found: $nodeVersion" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Node.js not found!" -ForegroundColor Red
    Write-Host "  Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check npm
try {
    $npmVersion = npm --version
    Write-Host "  ✓ npm found: v$npmVersion" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ npm not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "[2/6] Installing dependencies..." -ForegroundColor Yellow

# Navigate to project root and install dependencies
Push-Location $ProjectRoot
try {
    if (-not (Test-Path "node_modules") -or $Force) {
        npm install
        Write-Host "  ✓ Dependencies installed" -ForegroundColor Green
    }
    else {
        Write-Host "  ✓ Dependencies already installed" -ForegroundColor Green
    }
}
catch {
    Write-Host "  ✗ Failed to install dependencies: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Write-Host ""
Write-Host "[3/6] Building TypeScript CLI..." -ForegroundColor Yellow

try {
    npm run build
    Write-Host "  ✓ TypeScript compiled successfully" -ForegroundColor Green
}
catch {
    Write-Host "  ✗ Failed to build TypeScript: $_" -ForegroundColor Red
    Pop-Location
    exit 1
}

Pop-Location

Write-Host ""
Write-Host "[4/6] Checking environment configuration..." -ForegroundColor Yellow

# Function to detect if Claude Code is installed
function Test-ClaudeCodeInstalled {
    # Check if Claude Code CLI is available
    try {
        $null = Get-Command claude -ErrorAction Stop
        return $true
    }
    catch {}

    # Check VSCode with Claude Code extension
    try {
        $vscodePath = Get-Command code -ErrorAction Stop
        if ($vscodePath) {
            # Claude Code extension ID check (placeholder - adjust if needed)
            $extensionCheck = code --list-extensions 2>$null | Select-String -Pattern "claude|anthropic"
            if ($extensionCheck) {
                return $true
            }
        }
    }
    catch {}

    # Check common installation paths
    $commonPaths = @(
        "$env:LOCALAPPDATA\Programs\Claude",
        "$env:PROGRAMFILES\Claude",
        "$env:USERPROFILE\.claude"
    )

    foreach ($path in $commonPaths) {
        if (Test-Path $path) {
            return $true
        }
    }

    return $false
}

# Detect Claude Code installation
$claudeCodeInstalled = Test-ClaudeCodeInstalled

# Check for .env file
$envFile = Join-Path $ProjectRoot ".env"
$apiKeyRequired = -not $claudeCodeInstalled

if ($claudeCodeInstalled) {
    Write-Host "  ✓ Claude Code detected - using local installation" -ForegroundColor Green
    Write-Host "    API key not required" -ForegroundColor Gray
}
else {
    Write-Host "  ℹ Claude Code not detected locally" -ForegroundColor Cyan
    Write-Host "    API key required for direct API access" -ForegroundColor Gray
}

Write-Host ""

if (-not (Test-Path $envFile)) {
    if ($apiKeyRequired) {
        $envExample = Join-Path $ProjectRoot ".env.example"

        if (Test-Path $envExample) {
            Write-Host "  Creating .env from .env.example..." -ForegroundColor Yellow
            Copy-Item $envExample $envFile
        }
        else {
            Write-Host "  Creating .env file..." -ForegroundColor Yellow
            "ANTHROPIC_API_KEY=your-api-key-here" | Out-File -FilePath $envFile -Encoding UTF8
        }

        Write-Host "  ⚠ IMPORTANT: Edit .env and add your ANTHROPIC_API_KEY" -ForegroundColor Yellow
        Write-Host "  File location: $envFile" -ForegroundColor Cyan
        Write-Host "  Get your API key from: https://console.anthropic.com/" -ForegroundColor Gray
    }
    else {
        Write-Host "  ℹ No .env file needed (using local Claude Code)" -ForegroundColor Cyan
        # Create empty .env to avoid warnings
        "" | Out-File -FilePath $envFile -Encoding UTF8
    }
}
else {
    # .env exists, check if API key is set
    $envContent = Get-Content $envFile -Raw

    if ($envContent -match 'ANTHROPIC_API_KEY=(.+)') {
        $apiKey = $matches[1].Trim()
        if ($apiKey -and $apiKey -ne 'your-api-key-here' -and $apiKey -ne '') {
            Write-Host "  ✓ ANTHROPIC_API_KEY found in .env" -ForegroundColor Green
        }
        else {
            if ($apiKeyRequired) {
                Write-Host "  ⚠ ANTHROPIC_API_KEY not set in .env" -ForegroundColor Yellow
                Write-Host "  Please edit: $envFile" -ForegroundColor Cyan
            }
            else {
                Write-Host "  ℹ ANTHROPIC_API_KEY not set (not required with local Claude Code)" -ForegroundColor Cyan
            }
        }
    }
    else {
        if ($apiKeyRequired) {
            Write-Host "  ⚠ ANTHROPIC_API_KEY not found in .env" -ForegroundColor Yellow
            Write-Host "  Please add it to: $envFile" -ForegroundColor Cyan
        }
        else {
            Write-Host "  ℹ No API key needed (using local Claude Code)" -ForegroundColor Cyan
        }
    }
}

Write-Host ""
Write-Host "[5/6] Setting up PowerShell profile..." -ForegroundColor Yellow

if ($AddToProfile) {
    # Get PowerShell profile path
    $profilePath = $PROFILE

    # Create profile if it doesn't exist
    if (-not (Test-Path $profilePath)) {
        Write-Host "  Creating PowerShell profile: $profilePath" -ForegroundColor Gray
        New-Item -Path $profilePath -ItemType File -Force | Out-Null
    }

    # Check if module is already in profile
    $profileContent = Get-Content $profilePath -Raw -ErrorAction SilentlyContinue

    $importStatement = "Import-Module '$ModulePath'"

    if ($profileContent -notmatch [regex]::Escape($ModulePath)) {
        Write-Host "  Adding module import to profile..." -ForegroundColor Gray

        # Add import statement
        Add-Content -Path $profilePath -Value "`n# Claude CLI Integration"
        Add-Content -Path $profilePath -Value $importStatement

        Write-Host "  ✓ Module added to profile" -ForegroundColor Green
    }
    else {
        Write-Host "  ✓ Module already in profile" -ForegroundColor Green
    }
}
else {
    Write-Host "  ℹ Skipping profile modification (manual import required)" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "[6/6] Testing installation..." -ForegroundColor Yellow

# Import module to test
try {
    Import-Module $ModulePath -Force
    Write-Host "  ✓ Module loaded successfully" -ForegroundColor Green

    # Test that ai command exists
    if (Get-Command ai -ErrorAction SilentlyContinue) {
        Write-Host "  ✓ 'ai' command available" -ForegroundColor Green
    }
    else {
        Write-Host "  ✗ 'ai' command not found" -ForegroundColor Red
    }

    # Enable auto-detection in config if requested
    if ($EnableAutoDetection) {
        Write-Host "  Enabling auto-detection in config..." -ForegroundColor Gray
        try {
            ai --enable-auto-detection | Out-Null
            Write-Host "  ✓ Auto-detection enabled" -ForegroundColor Green
        }
        catch {
            Write-Host "  ⚠ Failed to enable auto-detection: $_" -ForegroundColor Yellow
        }
    }
}
catch {
    Write-Host "  ✗ Failed to load module: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║           Installation Complete!                          ║" -ForegroundColor Green
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""

if ($claudeCodeInstalled) {
    Write-Host "Setup: Using local Claude Code installation" -ForegroundColor Green
    Write-Host ""
}
else {
    Write-Host "Setup: Using direct API access" -ForegroundColor Yellow
    Write-Host ""
}

Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host ""

if (-not $claudeCodeInstalled -and $apiKeyRequired) {
    Write-Host "  1. Set your ANTHROPIC_API_KEY in .env file" -ForegroundColor White
    Write-Host "     Location: $envFile" -ForegroundColor Gray
    Write-Host "     Get your key from: https://console.anthropic.com/" -ForegroundColor Gray
    Write-Host ""
    $stepNum = 2
}
else {
    Write-Host "  1. Ready to use! (Using local Claude Code)" -ForegroundColor Green
    Write-Host ""
    $stepNum = 2
}

if ($AddToProfile) {
    Write-Host "  $stepNum. Restart PowerShell or reload your profile:" -ForegroundColor White
    Write-Host "     . `$PROFILE" -ForegroundColor Yellow
}
else {
    Write-Host "  $stepNum. Import the module in your PowerShell session:" -ForegroundColor White
    Write-Host "     Import-Module '$ModulePath'" -ForegroundColor Yellow
}
$stepNum++

Write-Host ""
Write-Host "  $stepNum. Try it out:" -ForegroundColor White
Write-Host "     ai `"what is git stash?`"" -ForegroundColor Yellow
$stepNum++
Write-Host ""
Write-Host "  $stepNum. Get help:" -ForegroundColor White
Write-Host "     ai --help" -ForegroundColor Yellow
Write-Host ""

if ($EnableAutoDetection) {
    Write-Host "Auto-detection: enabled" -ForegroundColor Green
    Write-Host "  Questions starting with 'what', 'how', 'why', etc. will auto-route to Claude" -ForegroundColor Gray
    Write-Host ""
}
else {
    Write-Host "Optional: Enable auto-detection mode" -ForegroundColor Cyan
    Write-Host "  ai --enable-auto-detection" -ForegroundColor Yellow
    Write-Host "  (Makes auto-detection persistent across all PowerShell sessions)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "For more information, see:" -ForegroundColor Cyan
Write-Host "  - README.md" -ForegroundColor Gray
Write-Host "  - CLAUDE.md" -ForegroundColor Gray
Write-Host ""

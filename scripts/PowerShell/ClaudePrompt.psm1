<#
.SYNOPSIS
    PowerShell module for Claude CLI integration

.DESCRIPTION
    Provides the `prompt-ai` function (aliased as `ai`) for asking Claude questions
    from PowerShell with full conversation context and session management.

.NOTES
    Version: 1.0.0
    Author: Claude Agent SDK
#>

# Get the project root directory (go up two levels from scripts/PowerShell)
$script:ProjectRoot = Split-Path (Split-Path $PSScriptRoot)
$script:CliScript = Join-Path $script:ProjectRoot "dist\cli\ask-claude.js"

# Check if CLI script exists, fallback to tsx if not compiled
if (-not (Test-Path $script:CliScript)) {
    $script:CliScript = Join-Path $script:ProjectRoot "src\cli\ask-claude.ts"
    $script:UseTsx = $true
} else {
    $script:UseTsx = $false
}

<#
.SYNOPSIS
    Ask Claude a question with conversation context

.DESCRIPTION
    Main function to interact with Claude AI from PowerShell.
    Supports session management, conversation history, and various configuration options.

.PARAMETER Question
    The question to ask Claude. Can be multiple words without quotes.

.PARAMETER Session
    Use or switch to a specific named session

.PARAMETER NewSession
    Create a new named session

.PARAMETER SystemPrompt
    Override the system prompt for this query

.PARAMETER NoHistory
    Don't save this interaction to history (one-off question)

.PARAMETER ListSessions
    List all available sessions

.PARAMETER SessionInfo
    Show information about the current session

.PARAMETER History
    Show conversation history for the current session

.PARAMETER Clear
    Clear the current session's history

.PARAMETER ClearAll
    Clear all session histories

.PARAMETER Export
    Export current session to a file

.PARAMETER Retry
    Retry the last failed question

.PARAMETER ConfigShow
    Show current configuration

.PARAMETER ConfigReset
    Reset configuration to defaults

.PARAMETER UsePrompt
    Switch to a different system prompt preset (default|powershell|git|nodejs|custom)

.PARAMETER SetDefaultPrompt
    Set a custom default system prompt

.PARAMETER AllowTools
    Specify allowed tools (comma-separated)

.PARAMETER PermissionMode
    Override permission mode (default|acceptEdits|bypassPermissions|plan)

.PARAMETER Help
    Show help message

.PARAMETER Version
    Show version information

.EXAMPLE
    Invoke-ClaudeAI "what is git stash?"
    Ask a simple question

.EXAMPLE
    ai "explain PowerShell pipelines"
    Using the alias

.EXAMPLE
    ai "how do I debug Node.js?" --session nodejs-help
    Use a specific session

.EXAMPLE
    ai --new-session git-learning
    Create a new named session

.EXAMPLE
    ai --list-sessions
    List all sessions

.EXAMPLE
    ai --clear
    Clear current session

.EXAMPLE
    ai "explain this error" --system-prompt "You are a debugging expert"
    Override system prompt for one query
#>
function Invoke-ClaudeAI {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$false, Position=0, ValueFromRemainingArguments=$true)]
        [string[]]$Question,

        [Parameter(Mandatory=$false)]
        [Alias('s')]
        [string]$Session,

        [Parameter(Mandatory=$false)]
        [string]$NewSession,

        [Parameter(Mandatory=$false)]
        [Alias('prompt')]
        [string]$SystemPrompt,

        [Parameter(Mandatory=$false)]
        [switch]$NoHistory,

        [Parameter(Mandatory=$false)]
        [Alias('list')]
        [switch]$ListSessions,

        [Parameter(Mandatory=$false)]
        [Alias('info')]
        [switch]$SessionInfo,

        [Parameter(Mandatory=$false)]
        [switch]$History,

        [Parameter(Mandatory=$false)]
        [switch]$Clear,

        [Parameter(Mandatory=$false)]
        [switch]$ClearAll,

        [Parameter(Mandatory=$false)]
        [string]$Export,

        [Parameter(Mandatory=$false)]
        [switch]$Retry,

        [Parameter(Mandatory=$false)]
        [Alias('config')]
        [switch]$ConfigShow,

        [Parameter(Mandatory=$false)]
        [switch]$ConfigReset,

        [Parameter(Mandatory=$false)]
        [string]$UsePrompt,

        [Parameter(Mandatory=$false)]
        [string]$SetDefaultPrompt,

        [Parameter(Mandatory=$false)]
        [string]$AllowTools,

        [Parameter(Mandatory=$false)]
        [string]$PermissionMode,

        [Parameter(Mandatory=$false)]
        [Alias('h')]
        [switch]$Help,

        [Parameter(Mandatory=$false)]
        [switch]$Version
    )

    # Build arguments for Node.js CLI
    $nodeArgs = @()

    # Add CLI script path
    if ($script:UseTsx) {
        $nodeArgs += "tsx"
        $nodeArgs += $script:CliScript
    } else {
        $nodeArgs += $script:CliScript
    }

    # Add question if provided
    if ($Question -and $Question.Length -gt 0) {
        $questionText = $Question -join ' '
        $nodeArgs += $questionText
    }

    # Add flags
    if ($Session) {
        $nodeArgs += "--session"
        $nodeArgs += $Session
    }

    if ($NewSession) {
        $nodeArgs += "--new-session"
        $nodeArgs += $NewSession
    }

    if ($SystemPrompt) {
        $nodeArgs += "--system-prompt"
        $nodeArgs += $SystemPrompt
    }

    if ($NoHistory) {
        $nodeArgs += "--no-history"
    }

    if ($ListSessions) {
        $nodeArgs += "--list-sessions"
    }

    if ($SessionInfo) {
        $nodeArgs += "--session-info"
    }

    if ($History) {
        $nodeArgs += "--history"
    }

    if ($Clear) {
        $nodeArgs += "--clear"
    }

    if ($ClearAll) {
        $nodeArgs += "--clear-all"
    }

    if ($Export) {
        $nodeArgs += "--export"
        $nodeArgs += $Export
    }

    if ($Retry) {
        $nodeArgs += "--retry"
    }

    if ($ConfigShow) {
        $nodeArgs += "--config-show"
    }

    if ($ConfigReset) {
        $nodeArgs += "--config-reset"
    }

    if ($UsePrompt) {
        $nodeArgs += "--use-prompt"
        $nodeArgs += $UsePrompt
    }

    if ($SetDefaultPrompt) {
        $nodeArgs += "--set-default-prompt"
        $nodeArgs += $SetDefaultPrompt
    }

    if ($AllowTools) {
        $nodeArgs += "--allow-tools"
        $nodeArgs += $AllowTools
    }

    if ($PermissionMode) {
        $nodeArgs += "--permission-mode"
        $nodeArgs += $PermissionMode
    }

    if ($Help) {
        $nodeArgs += "--help"
    }

    if ($Version) {
        $nodeArgs += "--version"
    }

    # Set PowerShell PID environment variable for session management
    $env:POWERSHELL_PID = $PID

    # Save current directory and change to project root
    $originalLocation = Get-Location
    try {
        Set-Location $script:ProjectRoot

        # Execute Node.js CLI
        if ($script:UseTsx) {
            & npx $nodeArgs | Out-Host
        } else {
            & node $nodeArgs | Out-Host
        }
    }
    catch {
        Write-Error "Failed to execute Claude CLI: $_"
        Write-Error "CLI Script: $script:CliScript"
        Write-Error "Using tsx: $script:UseTsx"
    }
    finally {
        Set-Location $originalLocation
    }
}

# Note: Auto-detection feature has been removed due to technical limitations
# with PowerShell's prompt mechanism. The prompt function cannot intercept
# command input in PowerShell. For quick access, use the short 'ai' alias instead.

# Set alias for convenience
Set-Alias -Name ai -Value Invoke-ClaudeAI

# Note: ? is a protected PowerShell alias (AllScope) and cannot be overridden
# Use 'ai' for quick questions instead

# Export module members
Export-ModuleMember -Function Invoke-ClaudeAI
Export-ModuleMember -Alias ai


# Display welcome message on import
Write-Host ""
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "    Claude CLI - PowerShell Integration Loaded        " -ForegroundColor Cyan
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Usage: " -NoNewline -ForegroundColor Gray
Write-Host "ai " -NoNewline -ForegroundColor Yellow
Write-Host '"your question"' -ForegroundColor White
Write-Host ""
Write-Host "  Commands:" -ForegroundColor Gray
Write-Host "    ai --help                 " -NoNewline -ForegroundColor Yellow
Write-Host "Show all commands" -ForegroundColor White
Write-Host "    ai --list-sessions        " -NoNewline -ForegroundColor Yellow
Write-Host "List sessions" -ForegroundColor White
Write-Host "    ai --config-show          " -NoNewline -ForegroundColor Yellow
Write-Host "Show configuration" -ForegroundColor White
Write-Host ""

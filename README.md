# PowerShell + Claude Agent SDK Integration

A comprehensive PowerShell integration for the Claude Agent SDK that enables natural conversation with Claude directly from your terminal, complete with session management, conversation context persistence, and intelligent question routing.

## Table of Contents

- [Features](#features)
- [Requirements](#requirements)
- [Setup Modes](#setup-modes)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Usage](#usage)
- [Session Management](#session-management)
- [Configuration](#configuration)
- [Examples](#examples)
- [Architecture](#architecture)
- [Troubleshooting](#troubleshooting)
- [Advanced Usage](#advanced-usage)

## Features

### 🌐 Global Session (Default)
Persistent conversation context across all PowerShell windows. Ask a question in one terminal, continue the conversation in another.

### 🖥️ Per-Shell Sessions
Isolated context for each PowerShell window. Perfect for keeping different projects or debugging sessions separate.

### 📝 Named Sessions
Create topic-specific conversations like `git-learning`, `nodejs-debug`, or `api-project` and switch between them at will.

### 🔄 Conversation Context
Follow-up questions automatically understand previous context. No need to repeat yourself - Claude remembers what you're talking about.

### 🎭 Multiple AI Personalities
Switch between different system prompts - PowerShell expert, Git expert, generic assistant, or create your own custom prompts.


### 📊 Full History Management
View, export, and clear conversation histories. Sessions persist across PowerShell restarts.

### 🔧 Read-Only Tool Access
Claude can read files in your current directory and search the web for latest documentation - perfect for "explain this file" questions.

## Requirements

⚠️ **PowerShell 7+ Required** - This module requires PowerShell 7 or later (not Windows PowerShell 5.1)

**To install PowerShell 7:**
```powershell
# Windows
winget install Microsoft.PowerShell

# Or download from: https://aka.ms/powershell
```

After installation, use `pwsh` instead of `powershell` to run PowerShell 7.

**Other Requirements:**
- Node.js and npm
- Either local Claude Code installation OR Anthropic API key

## Setup Modes

This integration supports two setup modes, and the installation script automatically detects which one you're using:

### Mode 1: Local Claude Code (Recommended)

If you have Claude Code installed locally (either the CLI tool or the VSCode extension), the integration will use it automatically. **No API key required!**

**Benefits:**
- No API key needed - uses your local Claude Code authentication
- Seamless integration with existing Claude Code setup
- Same conversation context across different interfaces

**Requirements:**
- Claude Code CLI (`claude` command available), OR
- VSCode with Claude Code extension installed, OR
- Claude Code installed in standard locations

The installation script checks for these automatically and configures the setup accordingly.

### Mode 2: Direct API Access

If Claude Code is not installed locally, you can use direct API access with an Anthropic API key.

**Requirements:**
- Anthropic API key from https://console.anthropic.com/
- Set `ANTHROPIC_API_KEY` in `.env` file

**How It Works:**
The Claude Agent SDK checks for authentication in this order:
1. `ANTHROPIC_AUTH_TOKEN` (used by local Claude Code)
2. `ANTHROPIC_API_KEY` (direct API access)
3. If neither is found, the SDK will use local Claude Code if available

The `Install.ps1` script detects which mode you're using and displays appropriate setup instructions.

## Quick Start

### Installation

⚠️ **Important:** Use PowerShell 7+ (`pwsh`), not Windows PowerShell

```powershell
# 1. Clone or navigate to the repository
cd d:\GitHubRepos\powershell-agent

# 2. Run the installation script with PowerShell 7
cd scripts\PowerShell
pwsh .\Install.ps1

# 3. Set your API key in .env file (OPTIONAL - only if Claude Code not installed)
# ANTHROPIC_API_KEY=your-api-key-here
# If you have Claude Code installed locally, no API key is needed!

# 4. Reload PowerShell 7 profile
. $PROFILE
```

### First Question

```powershell
ai "what is git stash?"
```

That's it! You're now chatting with Claude from PowerShell.

## Usage

### Basic Q&A

```powershell
# Ask a question
PS> ai "what is the command to stash git commits?"

# Follow-up questions maintain context
PS> ai "show me examples"
PS> ai "what about unstashing?"
PS> ai "explain the difference between pop and apply"
```

### Named Sessions

```powershell
# Create a Git learning session
PS> ai --new-session git-mastery
PS> ai --session git-mastery "I want to learn git internals"
PS> ai "explain the object database"
PS> ai "what about pack files?"

# Switch to a different topic
PS> ai --new-session nodejs-project
PS> ai --session nodejs-project "building an Express REST API"
PS> ai "show me middleware best practices"

# Resume Git learning later
PS> ai --session git-mastery "where were we?"
```

### Session Management

```powershell
# List all sessions
PS> ai --list-sessions

═══════════════════════════════════════════
         Active Sessions
═══════════════════════════════════════════

🌐 global ●
   Messages: 23 | Tokens: 15,432
   Last used: 5 minutes ago

📝 git-mastery
   Messages: 8 | Tokens: 6,124
   Last used: 1 hour ago

📝 nodejs-project
   Messages: 12 | Tokens: 8,956
   Last used: 30 minutes ago

# View current session info
PS> ai --session-info

# Clear a session
PS> ai --clear --session git-mastery

# Export session to file
PS> ai --export conversation.txt
```

## Configuration

### System Prompts

Switch between different AI personalities:

```powershell
# Use PowerShell expert
PS> ai --use-prompt powershell
PS> ai "explain pipeline variables"

# Use Git expert
PS> ai --use-prompt git
PS> ai "explain rebasing strategies"

# Use Node.js expert
PS> ai --use-prompt nodejs
PS> ai "async/await best practices"

# Generic assistant
PS> ai --use-prompt default

# Set custom prompt
PS> ai --set-default-prompt "You are a DevOps expert specializing in CI/CD"
```

### View Configuration

```powershell
PS> ai --config-show

===========================================
         Claude CLI Configuration
===========================================

Version: 1.0.0
Active System Prompt: powershell
Model: default (sonnet)
Allowed Tools: Read, Grep, WebSearch
Default Session: global
Max History Turns: 50
Streaming: enabled
Auto Compaction: enabled
Auto Detection: disabled
```

### Configure Tools

```powershell
# Change allowed tools
PS> ai --allow-tools Read,Grep,WebSearch,Bash

# View current config
PS> ai --config-show
```

## Examples

### Example 1: Learning Git from Scratch

```powershell
# Create dedicated learning session
PS> ai --new-session git-learning

# Start learning journey
PS> ai --session git-learning "I'm new to Git, teach me the basics"
# Claude explains Git fundamentals

PS> ai "what should I learn next?"
# Claude suggests commits and branching

PS> ai "explain commits in detail"
# Deep dive into commits

PS> ai "show me practical examples"
# Hands-on examples

PS> ai "give me exercises to practice"
# Practice exercises

# Resume later
PS> ai --session git-learning "let's continue from where we left off"
# Claude recalls the entire conversation
```

### Example 2: Debugging a Node.js Application

```powershell
# Use per-shell session for this debugging task
PS> ai --new-session shell
PS> ai "I'm debugging a Node.js app with high memory usage"
PS> ai "what tools should I use?"
PS> ai "explain how to take heap snapshots"
PS> ai "how do I analyze the snapshot?"

# Context stays only in this PowerShell window
# Other windows have their own contexts
```

### Example 3: Daily Development Workflow

```powershell
# Morning - general questions (global session)
PS> ai "what's the difference between npm and yarn?"
PS> ai "which one is better for modern projects?"

# Afternoon - working on API project
PS> ai --new-session api-project
PS> ai --session api-project "I'm building a REST API with Express and TypeScript"
PS> ai "what's the best way to structure route handlers?"
PS> ai "show me middleware patterns"
PS> ai "how should I handle validation?"

# Next day - resume project
PS> ai --session api-project "what did we discuss about validation?"
# Claude remembers the entire conversation about the API project

# Later - quick one-off question (don't pollute session)
PS> ai "what's the capital of France?" --no-history
```

### Example 4: Code Review Assistant

```powershell
# Ask Claude to review a file
PS> ai "review the file .\src\server.ts"
# Claude reads and reviews the file

PS> ai "what about error handling in this file?"
# Follow-up on the same file

PS> ai "suggest improvements"
# Still in context of the file review
```

## Architecture

### Session Storage

```
~/.claude-sessions/
├── config.json              # User configuration
├── sessions/
│   ├── global.json          # Global session metadata
│   ├── shell-12345.json     # Per-PowerShell-session
│   ├── git-learning.json    # Named session
│   └── api-project.json     # Another named session
└── transcripts/             # SDK-managed transcripts
```

### Session Auto-Selection Logic

1. If `--session <name>` specified → Use that named session
2. Else if per-shell session exists for current PowerShell PID → Use it
3. Else → Use global default session

### How Context Persistence Works

1. When you ask a question, the CLI determines which session to use
2. Session metadata (including SDK session ID) is loaded
3. Query is sent to Claude with `resume: sessionId` option
4. SDK automatically loads the entire conversation history
5. Response is streamed back to PowerShell
6. Session metadata is updated (last used, message count, tokens)

This means follow-up questions automatically have full context from previous questions in the same session.

### Authentication Flow

The Claude Agent SDK supports multiple authentication methods and automatically selects the appropriate one:

1. **Local Claude Code** (Recommended)
   - SDK checks for local Claude Code installation
   - Uses `ANTHROPIC_AUTH_TOKEN` if available
   - No API key required

2. **Direct API Access** (Fallback)
   - SDK checks for `ANTHROPIC_API_KEY` in environment
   - Reads from `.env` file in project root
   - Requires valid Anthropic API key

3. **Automatic Detection**
   - The `Install.ps1` script detects your setup type
   - Displays appropriate installation instructions
   - Creates `.env` file only if needed

This dual-authentication approach means the integration works seamlessly whether you're using local Claude Code or direct API access.

## Troubleshooting

### "spawn node ENOENT" Error

```powershell
# Verify Node.js is installed and in PATH
PS> node --version
v22.17.0

# If not found, install Node.js from https://nodejs.org/
# Then restart PowerShell
```

### API Key Not Set

**Note:** API key is only needed if Claude Code is NOT installed locally.

```powershell
# If you have Claude Code installed:
# No action needed! The SDK uses your local Claude Code automatically.

# If you don't have Claude Code:
# Check .env file in project root
PS> cat .env
ANTHROPIC_API_KEY=your-key-here

# Get your API key from: https://console.anthropic.com/
```

### Module Not Loading

```powershell
# Manually import the module
PS> Import-Module "D:\GitHubRepos\powershell-agent\scripts\PowerShell\ClaudePrompt.psm1" -Force

# Check if it's in your profile
PS> cat $PROFILE

# Re-run installation if needed
PS> cd scripts\PowerShell
PS> .\Install.ps1 -Force
```

### Build Errors

```powershell
# Ensure dependencies are installed
PS> npm install

# Build TypeScript
PS> npm run build

# Verify dist/cli/ask-claude.js exists
PS> Test-Path dist\cli\ask-claude.js
True
```

### Session Not Persisting

Sessions are stored in `~/.claude-sessions/`. Check:

```powershell
# Verify sessions directory exists
PS> Test-Path ~/.claude-sessions
True

# List session files
PS> ls ~/.claude-sessions/sessions/

# View a session file
PS> cat ~/.claude-sessions/sessions/global.json
```

## Advanced Usage

### One-Off Questions

Don't save to history:

```powershell
PS> ai "quick factual question" --no-history
```

### Custom System Prompt for Single Query

```powershell
PS> ai "review this code" --system-prompt "You are a senior code reviewer focusing on security"
```

### Retry Failed Questions

```powershell
PS> ai "complex question"
# Network timeout error

PS> ai --retry
# Automatically retries the same question
```

### Verbose Mode

See debug information:

```powershell
PS> ai "question" --verbose
Using session: global (global)
System prompt: You are a helpful assistant...
Allowed tools: Read, Grep, WebSearch
SDK Session ID: abc-123-def
...
```

### Export Sessions

```powershell
# Export current session
PS> ai --export session-export.txt

# Export specific session
PS> ai --export git-learning.txt --session git-learning
```

### Clear All Sessions

```powershell
# Nuclear option - clear everything
PS> ai --clear-all
✓ Cleared 5 session(s)
```

## Command Reference

### Query Commands
```powershell
ai "question"                           # Ask in current session
ai "question" --session <name>          # Ask in specific session
ai "question" --no-history              # One-off (no save)
ai "question" --system-prompt "..."     # Custom prompt
ai "question" --verbose                 # Debug mode
```

### Session Commands
```powershell
ai --new-session <name>                 # Create named session
ai --session <name>                     # Switch to session
ai --list-sessions                      # List all sessions
ai --session-info                       # Current session info
ai --clear                              # Clear current session
ai --clear --session <name>             # Clear specific session
ai --clear-all                          # Clear all sessions
ai --export <file>                      # Export current session
```

### Configuration Commands
```powershell
ai --config-show                        # Show configuration
ai --config-reset                       # Reset to defaults
ai --use-prompt <preset>                # Switch system prompt
ai --set-default-prompt "..."           # Set custom prompt
ai --allow-tools <tools>                # Configure tools
```

### Utility Commands
```powershell
ai --retry                              # Retry failed question
ai --help                               # Show help
ai --version                            # Show version
```

## Tips & Best Practices

1. **Use Named Sessions** for distinct topics or long-term learning
2. **Use Shell Sessions** for temporary debugging or project work
3. **Use Global Session** for quick questions and general chat
4. **Clear Old Sessions** periodically with `--clear` to manage token usage
5. **Export Important Sessions** before clearing them
6. **Use `--no-history`** for sensitive or one-off questions
7. **Configure System Prompts** to get expert-level responses in specific domains
8. **Use the short `ai` command** for quick questions without typing full command names

## What's Next?

- Explore different system prompts for specialized responses
- Create topic-specific sessions for learning new technologies
- Export your learning sessions for future reference

## Contributing

Contributions are welcome! This project demonstrates Claude Agent SDK integration patterns.

## License

Same as the main project.

---

**Happy Learning with Claude! 🚀**

For more details:
- [CLAUDE.md](./CLAUDE.md) - Developer documentation and codebase instructions

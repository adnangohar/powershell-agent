#!/usr/bin/env node

/**
 * PowerShell + Claude Agent SDK CLI
 *
 * Main entry point for the `ai` command
 */

import 'dotenv/config';
import { query, type Options } from '@anthropic-ai/claude-agent-sdk';
import { configManager } from './config-manager.js';
import { sessionManager } from './session-manager.js';
import { CLIOptions, CLIResult } from './types.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Parse command line arguments
 */
function parseArgs(args: string[]): CLIOptions {
  const options: CLIOptions = {};
  const questionParts: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--session':
      case '-s':
        options.session = args[++i];
        break;

      case '--new-session':
        options.newSession = args[++i];
        break;

      case '--system-prompt':
      case '--prompt':
        options.systemPrompt = args[++i];
        break;

      case '--no-history':
        options.noHistory = true;
        break;

      case '--list-sessions':
      case '--list':
        options.listSessions = true;
        break;

      case '--session-info':
      case '--info':
        options.sessionInfo = true;
        break;

      case '--history':
        options.history = true;
        break;

      case '--clear':
        options.clear = true;
        break;

      case '--clear-all':
        options.clearAll = true;
        break;

      case '--export':
        options.export = args[++i];
        break;

      case '--retry':
        options.retry = true;
        break;

      case '--help':
      case '-h':
        options.help = true;
        break;

      case '--version':
      case '-v':
        options.version = true;
        break;

      case '--config-show':
      case '--config':
        options.configShow = true;
        break;

      case '--config-reset':
        options.configReset = true;
        break;

      case '--use-prompt':
        options.usePrompt = args[++i] as any;
        break;

      case '--set-default-prompt':
        options.setDefaultPrompt = args[++i];
        break;

      case '--allow-tools':
        options.allowTools = args[++i];
        break;

      case '--permission-mode':
        options.permissionMode = args[++i] as any;
        break;

      case '--verbose':
        options.verbose = true;
        break;

      default:
        // Everything else is part of the question
        if (!arg.startsWith('--')) {
          questionParts.push(arg);
        }
    }
  }

  if (questionParts.length > 0) {
    options.question = questionParts.join(' ');
  }

  return options;
}

/**
 * Display help message
 */
function showHelp(): void {
  console.log(`
===============================================================
           Claude CLI - PowerShell Integration
===============================================================

USAGE:
  ai "your question"                  Ask Claude a question
  ai [command] [options]              Run a specific command

BASIC COMMANDS:
  ai "question"                       Ask in current session
  ai "question" --no-history          One-off question (no context)
  ai --session <name> "question"      Use specific session
  ai --new-session <name>             Create new named session

SESSION MANAGEMENT:
  ai --list-sessions, --list          List all sessions
  ai --session-info, --info           Show current session details
  ai --clear                          Clear current session
  ai --clear-all                      Clear all sessions

HISTORY & EXPORT:
  ai --history                        Show conversation history
  ai --export <file>                  Export session to file
  ai --retry                          Retry last failed question

CONFIGURATION:
  ai --config-show, --config          Show current configuration
  ai --config-reset                   Reset to default configuration
  ai --use-prompt <preset>            Switch system prompt
                                      (default|powershell|git|nodejs|custom)
  ai --set-default-prompt "..."       Set custom default prompt
  ai --allow-tools <tools>            Set allowed tools (comma-separated)
  ai --enable-auto-detection          Enable auto-detection (persistent)
  ai --disable-auto-detection         Disable auto-detection

OVERRIDES:
  --system-prompt, --prompt "..."     Override system prompt for this query
  --permission-mode <mode>            Set permission mode
                                      (default|acceptEdits|bypassPermissions|plan)

OTHER:
  --help, -h                          Show this help message
  --version, -v                       Show version
  --verbose                           Show detailed output

EXAMPLES:
  ai "what is git stash?"
  ai "show me examples"
  ai --new-session git-help
  ai --session git-help "explain git rebase"
  ai --list-sessions
  ai --clear
  ai "review this code" --no-history --prompt "You are a code reviewer"

For more information, see the documentation in CLAUDE.md
`);
}

/**
 * Display version
 */
function showVersion(): void {
  try {
    const packagePath = join(__dirname, '../../package.json');
    const packageJson = JSON.parse(readFileSync(packagePath, 'utf-8'));
    console.log(`Claude CLI v${packageJson.version}`);
  } catch {
    console.log('Claude CLI v1.0.0');
  }
}

/**
 * Execute a query to Claude
 */
async function executeQuery(question: string, options: CLIOptions): Promise<CLIResult> {
  try {
    // Get or create active session
    const shellPID = process.env.POWERSHELL_PID || process.env.PPID;

    const session = await sessionManager.getActiveSession({
      sessionName: options.session || options.newSession,
      shellPID,
      type: options.newSession ? 'named' : 'auto',
      forceNew: !!options.newSession
    });

    if (options.verbose) {
      console.error(`Using session: ${session.name} (${session.type})`);
    }

    // Load configuration
    const config = await configManager.loadConfig();

    // Determine system prompt
    let systemPrompt: string;
    if (options.systemPrompt) {
      systemPrompt = options.systemPrompt;
    } else if (session.systemPrompt) {
      systemPrompt = session.systemPrompt;
    } else {
      systemPrompt = await configManager.getCurrentSystemPrompt();
    }

    // Determine allowed tools
    const allowedTools = session.allowedTools || config.allowedTools;

    // Build SDK options
    const sdkOptions: Options = {
      systemPrompt,
      allowedTools,
      permissionMode: options.permissionMode || 'bypassPermissions',
      cwd: process.cwd(),
      maxTurns: config.maxHistoryTurns
    };

    // Add resume option if not --no-history
    if (!options.noHistory && session.sdkSessionId) {
      sdkOptions.resume = session.sdkSessionId;
    }

    // Add model if configured
    if (config.model) {
      sdkOptions.model = config.model;
    }

    if (options.verbose) {
      console.error(`System prompt: ${systemPrompt.substring(0, 60)}...`);
      console.error(`Allowed tools: ${allowedTools.join(', ')}`);
    }

    // Execute query
    const result = query({ prompt: question, options: sdkOptions });

    let responseText = '';
    let hadError = false;

    for await (const message of result) {
      // Capture session ID from system message
      if (message.type === 'system' && message.subtype === 'init') {
        session.sdkSessionId = message.session_id;

        if (options.verbose) {
          console.error(`SDK Session ID: ${message.session_id}`);
        }
      }

      // Display assistant responses
      if (message.type === 'assistant') {
        for (const block of message.message.content) {
          if (block.type === 'text') {
            if (config.streamOutput) {
              // Stream output in real-time
              process.stdout.write(block.text);
            }
            responseText += block.text;
          }
        }
      }

      // Capture final result
      if (message.type === 'result') {
        session.messageCount += message.num_turns;

        if (message.usage) {
          const inputTokens = message.usage.input_tokens || 0;
          const outputTokens = message.usage.output_tokens || 0;
          session.totalTokens += inputTokens + outputTokens;

          // Rough cost estimation (adjust based on actual pricing)
          const costPer1kInput = 0.003; // $3 per 1M tokens
          const costPer1kOutput = 0.015; // $15 per 1M tokens
          const cost = (inputTokens / 1000) * costPer1kInput + (outputTokens / 1000) * costPer1kOutput;
          session.totalCost += cost;
        }

        hadError = message.is_error;

        if (options.verbose) {
          console.error(`\n\nTokens: ${session.totalTokens.toLocaleString()} | Cost: $${session.totalCost.toFixed(4)}`);
        }
      }
    }

    // Print newline after streaming output
    if (config.streamOutput && responseText) {
      console.log('');
    }

    // Print buffered output if not streaming
    if (!config.streamOutput && responseText) {
      console.log(responseText);
    }

    // Update session metadata
    if (!options.noHistory) {
      session.lastUsed = new Date();
      await sessionManager.saveSession(session);
    }

    // Save failed question for retry
    if (hadError) {
      sessionManager.setLastFailedQuestion(question);
    }

    return {
      success: !hadError,
      exitCode: hadError ? 1 : 0,
      message: responseText
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);

    // Save failed question for retry
    sessionManager.setLastFailedQuestion(question);

    return {
      success: false,
      exitCode: 1,
      error: errorMessage
    };
  }
}

/**
 * Handle session-related commands
 */
async function handleSessionCommands(options: CLIOptions): Promise<CLIResult> {
  try {
    if (options.listSessions) {
      const sessionList = await sessionManager.formatSessionList();
      console.log(sessionList);
      return { success: true, exitCode: 0 };
    }

    if (options.sessionInfo) {
      const sessionInfo = await sessionManager.formatSessionInfo(options.session);
      console.log(sessionInfo);
      return { success: true, exitCode: 0 };
    }

    if (options.clear) {
      const sessionName = options.session || sessionManager.getCurrentSession()?.name || 'global';
      const deleted = await sessionManager.deleteSession(sessionName);

      if (deleted) {
        console.log(`✓ Session '${sessionName}' cleared`);
        return { success: true, exitCode: 0 };
      } else {
        console.error(`✗ Failed to clear session '${sessionName}'`);
        return { success: false, exitCode: 1 };
      }
    }

    if (options.clearAll) {
      const sessions = await sessionManager.listAllSessions();
      let cleared = 0;

      for (const session of sessions) {
        if (await sessionManager.deleteSession(session.name)) {
          cleared++;
        }
      }

      console.log(`✓ Cleared ${cleared} session(s)`);
      return { success: true, exitCode: 0 };
    }

    if (options.export) {
      const sessionName = options.session || sessionManager.getCurrentSession()?.name || 'global';
      await sessionManager.exportSession(sessionName, options.export);
      console.log(`✓ Session '${sessionName}' exported to ${options.export}`);
      return { success: true, exitCode: 0 };
    }

    return { success: true, exitCode: 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    return { success: false, exitCode: 1, error: errorMessage };
  }
}

/**
 * Handle configuration commands
 */
async function handleConfigCommands(options: CLIOptions): Promise<CLIResult> {
  try {
    if (options.configShow) {
      const configDisplay = await configManager.displayConfig();
      console.log(configDisplay);
      return { success: true, exitCode: 0 };
    }

    if (options.configReset) {
      await configManager.resetConfig();
      console.log('✓ Configuration reset to defaults');
      return { success: true, exitCode: 0 };
    }

    if (options.usePrompt) {
      await configManager.setCurrentPromptPreset(options.usePrompt);
      console.log(`✓ Switched to '${options.usePrompt}' system prompt`);
      return { success: true, exitCode: 0 };
    }

    if (options.setDefaultPrompt) {
      await configManager.setCustomSystemPrompt(options.setDefaultPrompt);
      console.log('✓ Custom system prompt set and activated');
      return { success: true, exitCode: 0 };
    }

    if (options.allowTools) {
      const tools = options.allowTools.split(',').map(t => t.trim());
      await configManager.setAllowedTools(tools);
      console.log(`✓ Allowed tools updated: ${tools.join(', ')}`);
      return { success: true, exitCode: 0 };
    }

    return { success: true, exitCode: 0 };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error: ${errorMessage}`);
    return { success: false, exitCode: 1, error: errorMessage };
  }
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Parse arguments
  const options = parseArgs(args);

  // Handle help and version
  if (options.help) {
    showHelp();
    process.exit(0);
  }

  if (options.version) {
    showVersion();
    process.exit(0);
  }

  // Clean up expired sessions
  await sessionManager.cleanupExpiredSessions();

  // Handle configuration commands
  if (options.configShow || options.configReset || options.usePrompt ||
      options.setDefaultPrompt || options.allowTools) {
    const result = await handleConfigCommands(options);
    process.exit(result.exitCode);
  }

  // Handle session commands
  if (options.listSessions || options.sessionInfo || options.clear ||
      options.clearAll || options.export) {
    const result = await handleSessionCommands(options);
    process.exit(result.exitCode);
  }

  // Handle retry
  if (options.retry) {
    const lastQuestion = sessionManager.getLastFailedQuestion();
    if (!lastQuestion) {
      console.error('No failed question to retry');
      process.exit(1);
    }
    options.question = lastQuestion;
    console.log(`Retrying: ${lastQuestion}\n`);
  }

  // Execute query if question provided
  if (options.question) {
    const result = await executeQuery(options.question, options);
    process.exit(result.exitCode);
  }

  // No command or question provided
  showHelp();
  process.exit(1);
}

// Run CLI
main().catch((error) => {
  console.error('Unexpected error:', error);
  process.exit(1);
});

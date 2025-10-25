/**
 * Type definitions for the PowerShell + Claude Agent SDK integration
 */

/**
 * Session types
 */
export type SessionType = 'global' | 'shell' | 'named';

/**
 * System prompt preset names
 */
export type SystemPromptPreset = 'default' | 'powershell' | 'git' | 'nodejs' | 'custom';

/**
 * Metadata for a conversation session
 */
export interface SessionMetadata {
  /** Unique session identifier */
  id: string;

  /** User-friendly session name */
  name: string;

  /** Type of session */
  type: SessionType;

  /** SDK session ID for resuming conversations */
  sdkSessionId?: string;

  /** When the session was created */
  created: Date;

  /** Last time the session was used */
  lastUsed: Date;

  /** Number of messages in the conversation */
  messageCount: number;

  /** Total tokens used in this session */
  totalTokens: number;

  /** Total cost in USD */
  totalCost: number;

  /** PowerShell process ID (for shell-type sessions) */
  powerShellPID?: number;

  /** Custom system prompt for this session */
  systemPrompt?: string;

  /** Custom allowed tools for this session */
  allowedTools?: string[];

  /** Whether this session is active */
  active: boolean;
}

/**
 * User configuration
 */
export interface UserConfig {
  /** Config version */
  version: string;

  /** Default system prompt */
  defaultSystemPrompt: string;

  /** Available system prompt presets */
  customSystemPrompts: Record<SystemPromptPreset, string>;

  /** Currently active system prompt preset */
  currentSystemPrompt: SystemPromptPreset;

  /** Tools allowed by default */
  allowedTools: string[];

  /** Default session to use */
  defaultSession: string;

  /** Enable automatic conversation compaction */
  autoCompaction: boolean;

  /** Maximum number of conversation turns to keep */
  maxHistoryTurns: number;

  /** Number of retry attempts for failed requests */
  retryAttempts: number;

  /** Enable streaming output */
  streamOutput: boolean;

  /** Claude model to use */
  model?: string;

  /** Session management settings */
  sessions: {
    /** Auto-cleanup expired sessions */
    autoCleanup: boolean;

    /** Shell session expiry (e.g., "7d", "24h") */
    shellSessionExpiry: string;

    /** Named session expiry (e.g., "30d") */
    namedSessionExpiry: string;
  };
}

/**
 * CLI command options
 */
export interface CLIOptions {
  /** The question to ask (if not a special command) */
  question?: string;

  /** Session to use/switch to */
  session?: string;

  /** Create a new session with this name */
  newSession?: string;

  /** Override system prompt */
  systemPrompt?: string;

  /** Don't save this interaction to history */
  noHistory?: boolean;

  /** List all sessions */
  listSessions?: boolean;

  /** Show current session info */
  sessionInfo?: boolean;

  /** Show conversation history */
  history?: boolean;

  /** Clear current session */
  clear?: boolean;

  /** Clear all sessions */
  clearAll?: boolean;

  /** Export current session to file */
  export?: string;

  /** Retry last failed question */
  retry?: boolean;

  /** Show help */
  help?: boolean;

  /** Show version */
  version?: boolean;

  /** Show current configuration */
  configShow?: boolean;

  /** Reset configuration to defaults */
  configReset?: boolean;

  /** Use a specific system prompt preset */
  usePrompt?: SystemPromptPreset;

  /** Set default system prompt */
  setDefaultPrompt?: string;

  /** Configure allowed tools */
  allowTools?: string;

  /** Permission mode override */
  permissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions' | 'plan';

  /** Verbose output */
  verbose?: boolean;
}

/**
 * Session selection options
 */
export interface SessionSelectionOptions {
  /** Requested session name */
  sessionName?: string;

  /** PowerShell process ID */
  shellPID?: string;

  /** Session type to create if new */
  type: 'auto' | 'global' | 'shell' | 'named';

  /** Force create new session */
  forceNew?: boolean;
}

/**
 * Conversation message for history display
 */
export interface ConversationMessage {
  /** Timestamp */
  timestamp: Date;

  /** Speaker: 'user' or 'assistant' */
  role: 'user' | 'assistant';

  /** Message content */
  content: string;

  /** Whether this message resulted in an error */
  error?: boolean;

  /** Error message if applicable */
  errorMessage?: string;

  /** Tokens used in this message */
  tokens?: number;
}

/**
 * Session history
 */
export interface SessionHistory {
  /** Session metadata */
  session: SessionMetadata;

  /** Conversation messages */
  messages: ConversationMessage[];
}

/**
 * CLI execution result
 */
export interface CLIResult {
  /** Success status */
  success: boolean;

  /** Exit code */
  exitCode: number;

  /** Output message */
  message?: string;

  /** Error message */
  error?: string;
}

/**
 * Session storage paths
 */
export interface SessionPaths {
  /** Base directory for all sessions */
  baseDir: string;

  /** Configuration file path */
  configFile: string;

  /** Sessions directory */
  sessionsDir: string;

  /** Transcripts directory */
  transcriptsDir: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: UserConfig = {
  version: '1.0.0',
  defaultSystemPrompt: 'You are a helpful assistant for developers working in PowerShell and command-line environments. Keep responses concise - maximum 2-3 sentences unless more detail is specifically requested.',
  customSystemPrompts: {
    default: 'You are a helpful assistant. Keep responses concise - maximum 2-3 sentences unless more detail is specifically requested.',
    powershell: 'You are a PowerShell and Windows command-line expert. Provide concise, accurate answers about PowerShell cmdlets, scripts, and best practices. Keep responses brief - maximum 2-3 sentences with essential syntax/examples only.',
    git: 'You are a Git version control expert. Provide clear, concise explanations and examples for Git commands and workflows. Keep responses brief - show essential syntax and common options only, maximum 2-3 sentences.',
    nodejs: 'You are a Node.js and JavaScript expert. Help with Node.js development, npm, and JavaScript best practices. Keep responses concise - maximum 2-3 sentences with essential examples only.',
    custom: ''
  },
  currentSystemPrompt: 'default',
  allowedTools: ['Read', 'Grep', 'WebSearch'],
  defaultSession: 'global',
  autoCompaction: true,
  maxHistoryTurns: 50,
  retryAttempts: 1,
  streamOutput: true,
  sessions: {
    autoCleanup: true,
    shellSessionExpiry: '7d',
    namedSessionExpiry: '30d'
  }
};

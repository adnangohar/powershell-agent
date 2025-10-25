/**
 * Configuration management for the PowerShell + Claude integration
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  UserConfig,
  SessionPaths,
  DEFAULT_CONFIG,
  SystemPromptPreset
} from './types.js';

export class ConfigManager {
  private paths: SessionPaths;
  private config: UserConfig | null = null;

  constructor() {
    this.paths = this.initializePaths();
  }

  /**
   * Initialize storage paths
   */
  private initializePaths(): SessionPaths {
    const baseDir = path.join(os.homedir(), '.claude-sessions');

    return {
      baseDir,
      configFile: path.join(baseDir, 'config.json'),
      sessionsDir: path.join(baseDir, 'sessions'),
      transcriptsDir: path.join(baseDir, 'transcripts')
    };
  }

  /**
   * Get storage paths
   */
  getPaths(): SessionPaths {
    return this.paths;
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories(): Promise<void> {
    const dirs = [
      this.paths.baseDir,
      this.paths.sessionsDir,
      this.paths.transcriptsDir
    ];

    for (const dir of dirs) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * Load configuration from disk
   */
  async loadConfig(): Promise<UserConfig> {
    if (this.config) {
      return this.config;
    }

    await this.ensureDirectories();

    try {
      const data = await fs.readFile(this.paths.configFile, 'utf-8');
      this.config = JSON.parse(data);

      // Merge with defaults to handle new fields
      this.config = { ...DEFAULT_CONFIG, ...this.config };

      return this.config;
    } catch (error) {
      // Config doesn't exist, create default
      this.config = { ...DEFAULT_CONFIG };
      await this.saveConfig(this.config);
      return this.config;
    }
  }

  /**
   * Save configuration to disk
   */
  async saveConfig(config: UserConfig): Promise<void> {
    await this.ensureDirectories();
    await fs.writeFile(
      this.paths.configFile,
      JSON.stringify(config, null, 2),
      'utf-8'
    );
    this.config = config;
  }

  /**
   * Reset configuration to defaults
   */
  async resetConfig(): Promise<void> {
    this.config = { ...DEFAULT_CONFIG };
    await this.saveConfig(this.config);
  }

  /**
   * Get current system prompt
   */
  async getCurrentSystemPrompt(): Promise<string> {
    const config = await this.loadConfig();
    const presetName = config.currentSystemPrompt;
    return config.customSystemPrompts[presetName] || config.defaultSystemPrompt;
  }

  /**
   * Set active system prompt preset
   */
  async setCurrentPromptPreset(preset: SystemPromptPreset): Promise<void> {
    const config = await this.loadConfig();
    config.currentSystemPrompt = preset;
    await this.saveConfig(config);
  }

  /**
   * Set custom system prompt
   */
  async setCustomSystemPrompt(prompt: string): Promise<void> {
    const config = await this.loadConfig();
    config.customSystemPrompts.custom = prompt;
    config.currentSystemPrompt = 'custom';
    await this.saveConfig(config);
  }

  /**
   * Set default system prompt
   */
  async setDefaultSystemPrompt(prompt: string): Promise<void> {
    const config = await this.loadConfig();
    config.defaultSystemPrompt = prompt;
    await this.saveConfig(config);
  }

  /**
   * Get allowed tools
   */
  async getAllowedTools(): Promise<string[]> {
    const config = await this.loadConfig();
    return config.allowedTools;
  }

  /**
   * Set allowed tools
   */
  async setAllowedTools(tools: string[]): Promise<void> {
    const config = await this.loadConfig();
    config.allowedTools = tools;
    await this.saveConfig(config);
  }

  /**
   * Get model name
   */
  async getModel(): Promise<string | undefined> {
    const config = await this.loadConfig();
    return config.model;
  }

  /**
   * Set model name
   */
  async setModel(model: string): Promise<void> {
    const config = await this.loadConfig();
    config.model = model;
    await this.saveConfig(config);
  }

  /**
   * Get max history turns
   */
  async getMaxHistoryTurns(): Promise<number> {
    const config = await this.loadConfig();
    return config.maxHistoryTurns;
  }

  /**
   * Get retry attempts
   */
  async getRetryAttempts(): Promise<number> {
    const config = await this.loadConfig();
    return config.retryAttempts;
  }

  /**
   * Check if streaming is enabled
   */
  async isStreamingEnabled(): Promise<boolean> {
    const config = await this.loadConfig();
    return config.streamOutput;
  }

  /**
   * Check if auto-compaction is enabled
   */
  async isAutoCompactionEnabled(): Promise<boolean> {
    const config = await this.loadConfig();
    return config.autoCompaction;
  }

  /**
   * Get session settings
   */
  async getSessionSettings(): Promise<UserConfig['sessions']> {
    const config = await this.loadConfig();
    return config.sessions;
  }

  /**
   * Display current configuration
   */
  async displayConfig(): Promise<string> {
    const config = await this.loadConfig();

    const lines: string[] = [];
    lines.push('===========================================');
    lines.push('         Claude CLI Configuration');
    lines.push('===========================================');
    lines.push('');
    lines.push(`Version: ${config.version}`);
    lines.push(`Active System Prompt: ${config.currentSystemPrompt}`);
    lines.push(`Model: ${config.model || 'default (sonnet)'}`);
    lines.push(`Allowed Tools: ${config.allowedTools.join(', ')}`);
    lines.push(`Default Session: ${config.defaultSession}`);
    lines.push(`Max History Turns: ${config.maxHistoryTurns}`);
    lines.push(`Streaming: ${config.streamOutput ? 'enabled' : 'disabled'}`);
    lines.push(`Auto Compaction: ${config.autoCompaction ? 'enabled' : 'disabled'}`);
    lines.push(`Retry Attempts: ${config.retryAttempts}`);
    lines.push('');
    lines.push('System Prompt Presets:');
    for (const [name, prompt] of Object.entries(config.customSystemPrompts)) {
      const active = name === config.currentSystemPrompt ? ' *' : '';
      if (prompt.length === 0) {
        lines.push(`  - ${name}${active}: (empty)`);
      } else {
        // Show full prompt, wrapping if needed
        lines.push(`  - ${name}${active}:`);
        lines.push(`    ${prompt}`);
      }
    }
    lines.push('');
    lines.push('Session Settings:');
    lines.push(`  - Auto Cleanup: ${config.sessions.autoCleanup ? 'enabled' : 'disabled'}`);
    lines.push(`  - Shell Session Expiry: ${config.sessions.shellSessionExpiry}`);
    lines.push(`  - Named Session Expiry: ${config.sessions.namedSessionExpiry}`);
    lines.push('');
    lines.push(`Config Location: ${this.paths.configFile}`);
    lines.push(`Sessions Directory: ${this.paths.sessionsDir}`);
    lines.push('===========================================');

    return lines.join('\n');
  }

  /**
   * Validate configuration
   */
  private async validateConfig(config: UserConfig): Promise<boolean> {
    // Basic validation
    if (!config.version) return false;
    if (!config.customSystemPrompts) return false;
    if (!config.allowedTools || !Array.isArray(config.allowedTools)) return false;
    if (typeof config.maxHistoryTurns !== 'number') return false;

    return true;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();

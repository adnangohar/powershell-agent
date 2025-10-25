/**
 * Session management for conversation persistence
 */

import fs from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  SessionMetadata,
  SessionType,
  SessionSelectionOptions,
  SessionHistory,
  ConversationMessage
} from './types.js';
import { configManager } from './config-manager.js';

export class SessionManager {
  private activeSession: SessionMetadata | null = null;
  private lastFailedQuestion: string | null = null;

  /**
   * Get the path to a session file
   */
  private getSessionPath(sessionName: string): string {
    const paths = configManager.getPaths();
    return path.join(paths.sessionsDir, `${sessionName}.json`);
  }

  /**
   * Load session from disk
   */
  private async loadSessionFromDisk(sessionName: string): Promise<SessionMetadata | null> {
    try {
      const sessionPath = this.getSessionPath(sessionName);
      const data = await fs.readFile(sessionPath, 'utf-8');
      const session = JSON.parse(data);

      // Convert date strings back to Date objects
      session.created = new Date(session.created);
      session.lastUsed = new Date(session.lastUsed);

      return session;
    } catch {
      return null;
    }
  }

  /**
   * Save session to disk
   */
  async saveSession(session: SessionMetadata): Promise<void> {
    const sessionPath = this.getSessionPath(session.name);
    await fs.writeFile(
      sessionPath,
      JSON.stringify(session, null, 2),
      'utf-8'
    );
  }

  /**
   * Create a new session
   */
  private async createSession(
    name: string,
    type: SessionType,
    powerShellPID?: string
  ): Promise<SessionMetadata> {
    const session: SessionMetadata = {
      id: randomUUID(),
      name,
      type,
      created: new Date(),
      lastUsed: new Date(),
      messageCount: 0,
      totalTokens: 0,
      totalCost: 0,
      powerShellPID: powerShellPID ? parseInt(powerShellPID) : undefined,
      active: true
    };

    await this.saveSession(session);
    return session;
  }

  /**
   * Get or create the global default session
   */
  private async getGlobalSession(): Promise<SessionMetadata> {
    let session = await this.loadSessionFromDisk('global');

    if (!session) {
      session = await this.createSession('global', 'global');
    }

    return session;
  }

  /**
   * Get or create a shell-specific session
   */
  private async getShellSession(shellPID: string): Promise<SessionMetadata> {
    const sessionName = `shell-${shellPID}`;
    let session = await this.loadSessionFromDisk(sessionName);

    if (!session) {
      session = await this.createSession(sessionName, 'shell', shellPID);
    }

    return session;
  }

  /**
   * Get or create a named session
   */
  private async getNamedSession(name: string, forceNew: boolean = false): Promise<SessionMetadata> {
    if (forceNew) {
      return await this.createSession(name, 'named');
    }

    let session = await this.loadSessionFromDisk(name);

    if (!session) {
      session = await this.createSession(name, 'named');
    }

    return session;
  }

  /**
   * Get the active session based on selection options
   */
  async getActiveSession(options: SessionSelectionOptions): Promise<SessionMetadata> {
    let session: SessionMetadata;

    if (options.sessionName) {
      // Explicit session name provided
      session = await this.getNamedSession(options.sessionName, options.forceNew);
    } else if (options.type === 'shell' && options.shellPID) {
      // Shell-specific session
      session = await this.getShellSession(options.shellPID);
    } else if (options.type === 'named' && options.sessionName) {
      // Named session
      session = await this.getNamedSession(options.sessionName, options.forceNew);
    } else {
      // Default to global session
      session = await this.getGlobalSession();
    }

    this.activeSession = session;
    return session;
  }

  /**
   * Get current active session
   */
  getCurrentSession(): SessionMetadata | null {
    return this.activeSession;
  }

  /**
   * List all sessions
   */
  async listAllSessions(): Promise<SessionMetadata[]> {
    const paths = configManager.getPaths();
    const sessions: SessionMetadata[] = [];

    try {
      const files = await fs.readdir(paths.sessionsDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const sessionName = file.replace('.json', '');
          const session = await this.loadSessionFromDisk(sessionName);
          if (session) {
            sessions.push(session);
          }
        }
      }
    } catch {
      // Sessions directory doesn't exist yet
      return [];
    }

    // Sort by last used (most recent first)
    sessions.sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

    return sessions;
  }

  /**
   * Delete a session
   */
  async deleteSession(sessionName: string): Promise<boolean> {
    try {
      const sessionPath = this.getSessionPath(sessionName);
      await fs.unlink(sessionPath);

      // Clear active session if it was deleted
      if (this.activeSession?.name === sessionName) {
        this.activeSession = null;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete all sessions of a specific type
   */
  async deleteSessionsByType(type: SessionType): Promise<number> {
    const sessions = await this.listAllSessions();
    let deletedCount = 0;

    for (const session of sessions) {
      if (session.type === type) {
        const deleted = await this.deleteSession(session.name);
        if (deleted) deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<number> {
    const config = await configManager.loadConfig();

    if (!config.sessions.autoCleanup) {
      return 0;
    }

    const sessions = await this.listAllSessions();
    const now = new Date();
    let cleanedCount = 0;

    for (const session of sessions) {
      let shouldDelete = false;
      const daysSinceLastUse = (now.getTime() - session.lastUsed.getTime()) / (1000 * 60 * 60 * 24);

      if (session.type === 'shell') {
        // Parse expiry string (e.g., "7d" -> 7 days)
        const expiryDays = parseInt(config.sessions.shellSessionExpiry);
        if (daysSinceLastUse > expiryDays) {
          shouldDelete = true;
        }
      } else if (session.type === 'named') {
        const expiryDays = parseInt(config.sessions.namedSessionExpiry);
        if (daysSinceLastUse > expiryDays) {
          shouldDelete = true;
        }
      }
      // Never auto-delete global session

      if (shouldDelete) {
        const deleted = await this.deleteSession(session.name);
        if (deleted) cleanedCount++;
      }
    }

    return cleanedCount;
  }

  /**
   * Format session list for display
   */
  async formatSessionList(): Promise<string> {
    const sessions = await this.listAllSessions();

    if (sessions.length === 0) {
      return 'No sessions found.';
    }

    const lines: string[] = [];
    lines.push('===========================================');
    lines.push('         Active Sessions');
    lines.push('===========================================');
    lines.push('');

    const activeSessionName = this.activeSession?.name;

    for (const session of sessions) {
      const isActive = session.name === activeSessionName ? ' ●' : '';
      const typeLabel = session.type === 'global' ? '🌐' : session.type === 'shell' ? '🖥️' : '📝';

      lines.push(`${typeLabel} ${session.name}${isActive}`);
      lines.push(`   Messages: ${session.messageCount} | Tokens: ${session.totalTokens.toLocaleString()}`);

      const lastUsed = this.formatRelativeTime(session.lastUsed);
      lines.push(`   Last used: ${lastUsed}`);

      if (session.totalCost > 0) {
        lines.push(`   Cost: $${session.totalCost.toFixed(4)}`);
      }

      lines.push('');
    }

    lines.push('===========================================');

    return lines.join('\n');
  }

  /**
   * Get session info for display
   */
  async formatSessionInfo(sessionName?: string): Promise<string> {
    const session = sessionName
      ? await this.loadSessionFromDisk(sessionName)
      : this.activeSession;

    if (!session) {
      return 'No active session.';
    }

    const lines: string[] = [];
    lines.push('===========================================');
    lines.push('         Session Information');
    lines.push('===========================================');
    lines.push('');
    lines.push(`Name: ${session.name}`);
    lines.push(`Type: ${session.type}`);
    lines.push(`ID: ${session.id}`);

    if (session.sdkSessionId) {
      lines.push(`SDK Session ID: ${session.sdkSessionId}`);
    }

    lines.push(`Created: ${session.created.toLocaleString()}`);
    lines.push(`Last Used: ${session.lastUsed.toLocaleString()}`);
    lines.push(`Messages: ${session.messageCount}`);
    lines.push(`Total Tokens: ${session.totalTokens.toLocaleString()}`);
    lines.push(`Total Cost: $${session.totalCost.toFixed(4)}`);

    if (session.powerShellPID) {
      lines.push(`PowerShell PID: ${session.powerShellPID}`);
    }

    if (session.systemPrompt) {
      lines.push(`Custom System Prompt: ${session.systemPrompt.substring(0, 60)}...`);
    }

    if (session.allowedTools) {
      lines.push(`Custom Tools: ${session.allowedTools.join(', ')}`);
    }

    lines.push('');
    lines.push('===========================================');

    return lines.join('\n');
  }

  /**
   * Format relative time for display
   */
  private formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 30) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  }

  /**
   * Store last failed question for retry
   */
  setLastFailedQuestion(question: string): void {
    this.lastFailedQuestion = question;
  }

  /**
   * Get last failed question
   */
  getLastFailedQuestion(): string | null {
    return this.lastFailedQuestion;
  }

  /**
   * Export session to text file
   */
  async exportSession(sessionName: string, outputPath: string): Promise<void> {
    const session = await this.loadSessionFromDisk(sessionName);

    if (!session) {
      throw new Error(`Session '${sessionName}' not found`);
    }

    const lines: string[] = [];
    lines.push('===========================================');
    lines.push(`Session Export: ${session.name}`);
    lines.push('===========================================');
    lines.push('');
    lines.push(`Exported: ${new Date().toLocaleString()}`);
    lines.push(`Session Type: ${session.type}`);
    lines.push(`Total Messages: ${session.messageCount}`);
    lines.push(`Total Tokens: ${session.totalTokens.toLocaleString()}`);
    lines.push('');
    lines.push('===========================================');
    lines.push('');

    // Note: Actual conversation history would need to be retrieved from SDK transcripts
    // For now, we just export metadata
    lines.push('(Conversation history would be exported here from SDK transcripts)');

    await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();

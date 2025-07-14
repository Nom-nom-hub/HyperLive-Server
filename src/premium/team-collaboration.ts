import * as vscode from 'vscode';
import * as WebSocket from 'ws';
import * as http from 'http';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface CollaborationSession {
  id: string;
  name: string;
  host: string;
  participants: CollaborationParticipant[];
  files: CollaborationFile[];
  createdAt: Date;
  expiresAt: Date;
}

export interface CollaborationParticipant {
  id: string;
  name: string;
  email: string;
  role: 'host' | 'viewer' | 'editor';
  joinedAt: Date;
  lastActive: Date;
  cursor?: {
    line: number;
    character: number;
    file: string;
  };
}

export interface CollaborationFile {
  path: string;
  content: string;
  lastModified: Date;
  modifiedBy: string;
  version: number;
}

export interface CollaborationMessage {
  type: 'join' | 'leave' | 'cursor_update' | 'file_change' | 'chat' | 'sync';
  participantId?: string;
  data: any;
  timestamp: Date;
}

export class TeamCollaborationService {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private wss: WebSocket.Server | null = null;
  private sessions: Map<string, CollaborationSession> = new Map();
  private participants: Map<string, CollaborationParticipant> = new Map();
  private fileWatchers: Map<string, vscode.FileSystemWatcher> = new Map();

  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.context = context;
    this.outputChannel = outputChannel;
  }

  /**
   * Start a collaboration session
   */
  async startSession(sessionName: string, port: number = 3001): Promise<CollaborationSession> {
    try {
      const sessionId = this.generateSessionId();
      const host = await this.getHostInfo();

      const session: CollaborationSession = {
        id: sessionId,
        name: sessionName,
        host: host.name,
        participants: [host],
        files: [],
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      };

      // Start WebSocket server
      const server = http.createServer();
      this.wss = new WebSocket.Server({ server });

      this.wss.on('connection', (ws: WebSocket, req: http.IncomingMessage) => {
        this.handleConnection(ws, req, session);
      });

      server.listen(port, () => {
        this.outputChannel.appendLine(`🚀 Team collaboration session started on port ${port}`);
        this.outputChannel.appendLine(`📋 Session ID: ${sessionId}`);
        this.outputChannel.appendLine(`🔗 Join URL: http://localhost:${port}/join/${sessionId}`);
      });

      this.sessions.set(sessionId, session);
      this.participants.set(host.id, host);

      // Start file watching
      this.startFileWatching(session);

      return session;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to start collaboration session: ${error}`);
      throw error;
    }
  }

  /**
   * Join an existing collaboration session
   */
  async joinSession(sessionId: string, participantName: string, role: 'viewer' | 'editor' = 'viewer'): Promise<CollaborationSession> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const participant: CollaborationParticipant = {
        id: this.generateParticipantId(),
        name: participantName,
        email: `${participantName}@collaboration.local`,
        role,
        joinedAt: new Date(),
        lastActive: new Date()
      };

      session.participants.push(participant);
      this.participants.set(participant.id, participant);

      this.outputChannel.appendLine(`👋 ${participantName} joined session ${sessionId} as ${role}`);

      return session;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to join session: ${error}`);
      throw error;
    }
  }

  /**
   * Stop a collaboration session
   */
  async stopSession(sessionId: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Stop file watching
      this.stopFileWatching(sessionId);

      // Close WebSocket connections
      if (this.wss) {
        this.wss.close();
        this.wss = null;
      }

      // Clean up participants
      session.participants.forEach(p => this.participants.delete(p.id));
      this.sessions.delete(sessionId);

      this.outputChannel.appendLine(`🛑 Collaboration session ${sessionId} stopped`);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to stop session: ${error}`);
      throw error;
    }
  }

  /**
   * Get active collaboration sessions
   */
  getActiveSessions(): CollaborationSession[] {
    return Array.from(this.sessions.values()).filter(session => 
      session.expiresAt > new Date()
    );
  }

  /**
   * Send a message to all participants in a session
   */
  async sendMessage(sessionId: string, message: CollaborationMessage): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Broadcast message to all participants
      if (this.wss) {
        this.wss.clients.forEach(client => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(message));
          }
        });
      }

      this.outputChannel.appendLine(`📨 Message sent to session ${sessionId}: ${message.type}`);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to send message: ${error}`);
      throw error;
    }
  }

  /**
   * Update cursor position for a participant
   */
  async updateCursor(sessionId: string, participantId: string, cursor: { line: number; character: number; file: string }): Promise<void> {
    try {
      const participant = this.participants.get(participantId);
      if (participant) {
        participant.cursor = cursor;
        participant.lastActive = new Date();

        await this.sendMessage(sessionId, {
          type: 'cursor_update',
          participantId,
          data: { cursor },
          timestamp: new Date()
        });
      }
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to update cursor: ${error}`);
    }
  }

  /**
   * Sync file changes across participants
   */
  async syncFile(sessionId: string, filePath: string, content: string, modifiedBy: string): Promise<void> {
    try {
      const session = this.sessions.get(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Update file in session
      const existingFile = session.files.find(f => f.path === filePath);
      if (existingFile) {
        existingFile.content = content;
        existingFile.lastModified = new Date();
        existingFile.modifiedBy = modifiedBy;
        existingFile.version++;
      } else {
        session.files.push({
          path: filePath,
          content,
          lastModified: new Date(),
          modifiedBy,
          version: 1
        });
      }

      // Send sync message to all participants
      await this.sendMessage(sessionId, {
        type: 'file_change',
        data: {
          filePath,
          content,
          modifiedBy,
          version: existingFile ? existingFile.version : 1
        },
        timestamp: new Date()
      });

      this.outputChannel.appendLine(`📄 File synced: ${filePath} (v${existingFile ? existingFile.version : 1})`);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to sync file: ${error}`);
      throw error;
    }
  }

  /**
   * Handle WebSocket connections
   */
  private handleConnection(ws: WebSocket, req: http.IncomingMessage, session: CollaborationSession): void {
    this.outputChannel.appendLine(`🔌 New WebSocket connection to session ${session.id}`);

    ws.on('message', (data: WebSocket.Data) => {
      try {
        const message: CollaborationMessage = JSON.parse(data.toString());
        this.handleMessage(ws, message, session);
      } catch (error) {
        this.outputChannel.appendLine(`❌ Failed to parse message: ${error}`);
      }
    });

    ws.on('close', () => {
      this.outputChannel.appendLine(`🔌 WebSocket connection closed for session ${session.id}`);
    });

    ws.on('error', (error) => {
      this.outputChannel.appendLine(`❌ WebSocket error: ${error}`);
    });
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(ws: WebSocket, message: CollaborationMessage, session: CollaborationSession): void {
    switch (message.type) {
      case 'join':
        this.handleJoinMessage(ws, message, session);
        break;
      case 'cursor_update':
        this.handleCursorUpdate(message, session);
        break;
      case 'file_change':
        this.handleFileChange(message, session);
        break;
      case 'chat':
        this.handleChatMessage(message, session);
        break;
      case 'sync':
        this.handleSyncRequest(ws, message, session);
        break;
      default:
        this.outputChannel.appendLine(`⚠️ Unknown message type: ${message.type}`);
    }
  }

  /**
   * Handle join messages
   */
  private handleJoinMessage(ws: WebSocket, message: CollaborationMessage, session: CollaborationSession): void {
    const participant = this.participants.get(message.participantId!);
    if (participant) {
      // Send current session state to new participant
      ws.send(JSON.stringify({
        type: 'sync',
        data: {
          session,
          participants: session.participants,
          files: session.files
        },
        timestamp: new Date()
      }));

      this.outputChannel.appendLine(`👋 ${participant.name} joined session ${session.id}`);
    }
  }

  /**
   * Handle cursor updates
   */
  private handleCursorUpdate(message: CollaborationMessage, session: CollaborationSession): void {
    const participant = this.participants.get(message.participantId!);
    if (participant) {
      participant.cursor = message.data.cursor;
      participant.lastActive = new Date();
    }
  }

  /**
   * Handle file changes
   */
  private handleFileChange(message: CollaborationMessage, session: CollaborationSession): void {
    const { filePath, content, modifiedBy, version } = message.data;
    
    // Update file in session
    const existingFile = session.files.find(f => f.path === filePath);
    if (existingFile) {
      existingFile.content = content;
      existingFile.lastModified = new Date();
      existingFile.modifiedBy = modifiedBy;
      existingFile.version = version;
    } else {
      session.files.push({
        path: filePath,
        content,
        lastModified: new Date(),
        modifiedBy,
        version
      });
    }
  }

  /**
   * Handle chat messages
   */
  private handleChatMessage(message: CollaborationMessage, session: CollaborationSession): void {
    const participant = this.participants.get(message.participantId!);
    if (participant) {
      this.outputChannel.appendLine(`💬 ${participant.name}: ${message.data.text}`);
    }
  }

  /**
   * Handle sync requests
   */
  private handleSyncRequest(ws: WebSocket, message: CollaborationMessage, session: CollaborationSession): void {
    // Send current session state
    ws.send(JSON.stringify({
      type: 'sync',
      data: {
        session,
        participants: session.participants,
        files: session.files
      },
      timestamp: new Date()
    }));
  }

  /**
   * Start file watching for a session
   */
  private startFileWatching(session: CollaborationSession): void {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const watcher = vscode.workspace.createFileSystemWatcher('**/*.{html,css,js,jsx,ts,tsx,vue,svelte}');
    
    watcher.onDidChange(async (uri) => {
      try {
        const content = fs.readFileSync(uri.fsPath, 'utf8');
        const relativePath = path.relative(workspaceFolder.uri.fsPath, uri.fsPath);
        
        await this.syncFile(session.id, relativePath, content, session.host);
      } catch (error) {
        this.outputChannel.appendLine(`❌ Failed to watch file change: ${error}`);
      }
    });

    this.fileWatchers.set(session.id, watcher);
  }

  /**
   * Stop file watching for a session
   */
  private stopFileWatching(sessionId: string): void {
    const watcher = this.fileWatchers.get(sessionId);
    if (watcher) {
      watcher.dispose();
      this.fileWatchers.delete(sessionId);
    }
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(8).toString('hex');
  }

  /**
   * Generate a unique participant ID
   */
  private generateParticipantId(): string {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * Get host information
   */
  private async getHostInfo(): Promise<CollaborationParticipant> {
    const hostName = process.env.USERNAME || process.env.USER || 'Unknown';
    
    return {
      id: this.generateParticipantId(),
      name: hostName,
      email: `${hostName}@host.local`,
      role: 'host',
      joinedAt: new Date(),
      lastActive: new Date()
    };
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    // Stop all sessions
    this.sessions.forEach((session, sessionId) => {
      this.stopSession(sessionId);
    });

    // Dispose file watchers
    this.fileWatchers.forEach(watcher => watcher.dispose());
    this.fileWatchers.clear();

    // Clear maps
    this.sessions.clear();
    this.participants.clear();
  }
} 
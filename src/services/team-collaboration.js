"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TeamCollaborationService = void 0;
const vscode = __importStar(require("vscode"));
const WebSocket = __importStar(require("ws"));
const http = __importStar(require("http"));
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class TeamCollaborationService {
    constructor(context, outputChannel) {
        this.wss = null;
        this.sessions = new Map();
        this.participants = new Map();
        this.fileWatchers = new Map();
        this.context = context;
        this.outputChannel = outputChannel;
    }
    /**
     * Start a collaboration session
     */
    async startSession(sessionName, port = 3001) {
        try {
            const sessionId = this.generateSessionId();
            const host = await this.getHostInfo();
            const session = {
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
            this.wss.on('connection', (ws, req) => {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to start collaboration session: ${error}`);
            throw error;
        }
    }
    /**
     * Join an existing collaboration session
     */
    async joinSession(sessionId, participantName, role = 'viewer') {
        try {
            const session = this.sessions.get(sessionId);
            if (!session) {
                throw new Error('Session not found');
            }
            const participant = {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to join session: ${error}`);
            throw error;
        }
    }
    /**
     * Stop a collaboration session
     */
    async stopSession(sessionId) {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to stop session: ${error}`);
            throw error;
        }
    }
    /**
     * Get active collaboration sessions
     */
    getActiveSessions() {
        return Array.from(this.sessions.values()).filter(session => session.expiresAt > new Date());
    }
    /**
     * Send a message to all participants in a session
     */
    async sendMessage(sessionId, message) {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to send message: ${error}`);
            throw error;
        }
    }
    /**
     * Update cursor position for a participant
     */
    async updateCursor(sessionId, participantId, cursor) {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to update cursor: ${error}`);
        }
    }
    /**
     * Sync file changes across participants
     */
    async syncFile(sessionId, filePath, content, modifiedBy) {
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
            }
            else {
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
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to sync file: ${error}`);
            throw error;
        }
    }
    /**
     * Handle WebSocket connections
     */
    handleConnection(ws, req, session) {
        this.outputChannel.appendLine(`🔌 New WebSocket connection to session ${session.id}`);
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data.toString());
                this.handleMessage(ws, message, session);
            }
            catch (error) {
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
    handleMessage(ws, message, session) {
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
    handleJoinMessage(ws, message, session) {
        const participant = this.participants.get(message.participantId);
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
    handleCursorUpdate(message, session) {
        const participant = this.participants.get(message.participantId);
        if (participant) {
            participant.cursor = message.data.cursor;
            participant.lastActive = new Date();
        }
    }
    /**
     * Handle file changes
     */
    handleFileChange(message, session) {
        const { filePath, content, modifiedBy, version } = message.data;
        // Update file in session
        const existingFile = session.files.find(f => f.path === filePath);
        if (existingFile) {
            existingFile.content = content;
            existingFile.lastModified = new Date();
            existingFile.modifiedBy = modifiedBy;
            existingFile.version = version;
        }
        else {
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
    handleChatMessage(message, session) {
        const participant = this.participants.get(message.participantId);
        if (participant) {
            this.outputChannel.appendLine(`💬 ${participant.name}: ${message.data.text}`);
        }
    }
    /**
     * Handle sync requests
     */
    handleSyncRequest(ws, message, session) {
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
    startFileWatching(session) {
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
            }
            catch (error) {
                this.outputChannel.appendLine(`❌ Failed to watch file change: ${error}`);
            }
        });
        this.fileWatchers.set(session.id, watcher);
    }
    /**
     * Stop file watching for a session
     */
    stopFileWatching(sessionId) {
        const watcher = this.fileWatchers.get(sessionId);
        if (watcher) {
            watcher.dispose();
            this.fileWatchers.delete(sessionId);
        }
    }
    /**
     * Generate a unique session ID
     */
    generateSessionId() {
        return crypto.randomBytes(8).toString('hex');
    }
    /**
     * Generate a unique participant ID
     */
    generateParticipantId() {
        return crypto.randomBytes(4).toString('hex');
    }
    /**
     * Get host information
     */
    async getHostInfo() {
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
    dispose() {
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
exports.TeamCollaborationService = TeamCollaborationService;
//# sourceMappingURL=team-collaboration.js.map
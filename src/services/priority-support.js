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
exports.PrioritySupportService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class PrioritySupportService {
    constructor(context, outputChannel) {
        this.tickets = new Map();
        this.featureRequests = new Map();
        this.supportEmail = 'support@advancedliveserver.com';
        this.context = context;
        this.outputChannel = outputChannel;
        this.config = {
            enabled: true,
            autoCollectLogs: true,
            includeSystemInfo: true,
            includeErrorDetails: true,
            maxTicketHistory: 100,
            responseTimeTarget: 4,
            priorityEscalation: true
        };
        this.loadConfig();
        this.loadTickets();
        this.loadFeatureRequests();
    }
    /**
     * Create a new support ticket
     */
    async createTicket(type, priority, title, description, tags = []) {
        try {
            const ticket = {
                id: this.generateTicketId(),
                type,
                priority,
                status: 'open',
                title,
                description,
                reporter: this.getCurrentUser(),
                createdAt: new Date(),
                updatedAt: new Date(),
                tags,
                attachments: [],
                comments: [],
                metadata: this.config.includeSystemInfo ? this.getSystemInfo() : undefined
            };
            // Auto-collect logs if enabled
            if (this.config.autoCollectLogs) {
                ticket.attachments = await this.collectLogs();
            }
            // Add initial comment with system info
            if (this.config.includeSystemInfo) {
                ticket.comments.push({
                    id: this.generateCommentId(),
                    author: 'System',
                    content: this.formatSystemInfo(ticket.metadata || {}),
                    timestamp: new Date(),
                    isInternal: true
                });
            }
            this.tickets.set(ticket.id, ticket);
            this.saveTickets();
            this.outputChannel.appendLine(`🎫 Created support ticket: ${ticket.id} - ${title}`);
            // Send notification for high priority tickets
            if (priority === 'high' || priority === 'critical') {
                await this.sendPriorityNotification(ticket);
            }
            return ticket;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to create ticket: ${error}`);
            throw error;
        }
    }
    /**
     * Update a support ticket
     */
    async updateTicket(ticketId, updates) {
        try {
            const ticket = this.tickets.get(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            const updatedTicket = {
                ...ticket,
                ...updates,
                updatedAt: new Date()
            };
            // Update resolved date if status changed to resolved
            if (updates.status === 'resolved' && ticket.status !== 'resolved') {
                updatedTicket.resolvedAt = new Date();
            }
            this.tickets.set(ticketId, updatedTicket);
            this.saveTickets();
            this.outputChannel.appendLine(`✏️ Updated ticket: ${ticketId}`);
            return updatedTicket;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to update ticket: ${error}`);
            throw error;
        }
    }
    /**
     * Add comment to a ticket
     */
    async addComment(ticketId, content, isInternal = false) {
        try {
            const ticket = this.tickets.get(ticketId);
            if (!ticket) {
                throw new Error('Ticket not found');
            }
            const comment = {
                id: this.generateCommentId(),
                author: this.getCurrentUser(),
                content,
                timestamp: new Date(),
                isInternal
            };
            ticket.comments.push(comment);
            ticket.updatedAt = new Date();
            this.tickets.set(ticketId, ticket);
            this.saveTickets();
            this.outputChannel.appendLine(`💬 Added comment to ticket: ${ticketId}`);
            return comment;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to add comment: ${error}`);
            throw error;
        }
    }
    /**
     * Create a feature request
     */
    async createFeatureRequest(title, description, category, priority, tags = []) {
        try {
            const featureRequest = {
                id: this.generateFeatureRequestId(),
                title,
                description,
                category,
                priority,
                status: 'proposed',
                requester: this.getCurrentUser(),
                votes: 1,
                createdAt: new Date(),
                updatedAt: new Date(),
                tags,
                comments: []
            };
            this.featureRequests.set(featureRequest.id, featureRequest);
            this.saveFeatureRequests();
            this.outputChannel.appendLine(`💡 Created feature request: ${featureRequest.id} - ${title}`);
            return featureRequest;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to create feature request: ${error}`);
            throw error;
        }
    }
    /**
     * Vote for a feature request
     */
    async voteForFeature(featureId) {
        try {
            const feature = this.featureRequests.get(featureId);
            if (!feature) {
                throw new Error('Feature request not found');
            }
            feature.votes++;
            feature.updatedAt = new Date();
            this.featureRequests.set(featureId, feature);
            this.saveFeatureRequests();
            this.outputChannel.appendLine(`👍 Voted for feature: ${featureId} (${feature.votes} votes)`);
            return feature;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to vote for feature: ${error}`);
            throw error;
        }
    }
    /**
     * Get all tickets
     */
    getTickets() {
        return Array.from(this.tickets.values());
    }
    /**
     * Get tickets by status
     */
    getTicketsByStatus(status) {
        return this.getTickets().filter(t => t.status === status);
    }
    /**
     * Get tickets by priority
     */
    getTicketsByPriority(priority) {
        return this.getTickets().filter(t => t.priority === priority);
    }
    /**
     * Get all feature requests
     */
    getFeatureRequests() {
        return Array.from(this.featureRequests.values());
    }
    /**
     * Get feature requests by status
     */
    getFeatureRequestsByStatus(status) {
        return this.getFeatureRequests().filter(f => f.status === status);
    }
    /**
     * Get support statistics
     */
    getSupportStats() {
        const tickets = this.getTickets();
        const features = this.getFeatureRequests();
        return {
            tickets: {
                total: tickets.length,
                open: tickets.filter(t => t.status === 'open').length,
                inProgress: tickets.filter(t => t.status === 'in_progress').length,
                resolved: tickets.filter(t => t.status === 'resolved').length,
                closed: tickets.filter(t => t.status === 'closed').length,
                critical: tickets.filter(t => t.priority === 'critical').length,
                high: tickets.filter(t => t.priority === 'high').length
            },
            features: {
                total: features.length,
                proposed: features.filter(f => f.status === 'proposed').length,
                approved: features.filter(f => f.status === 'approved').length,
                inDevelopment: features.filter(f => f.status === 'in_development').length,
                completed: features.filter(f => f.status === 'completed').length,
                totalVotes: features.reduce((sum, f) => sum + f.votes, 0)
            },
            responseTime: {
                average: this.calculateAverageResponseTime(tickets),
                target: this.config.responseTimeTarget
            }
        };
    }
    /**
     * Generate support report
     */
    async generateSupportReport() {
        const stats = this.getSupportStats();
        const recentTickets = this.getTickets()
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 10);
        const report = {
            generatedAt: new Date(),
            stats,
            recentTickets: recentTickets.map(t => ({
                id: t.id,
                title: t.title,
                priority: t.priority,
                status: t.status,
                createdAt: t.createdAt
            })),
            topFeatures: this.getFeatureRequests()
                .sort((a, b) => b.votes - a.votes)
                .slice(0, 5)
                .map(f => ({
                id: f.id,
                title: f.title,
                votes: f.votes,
                status: f.status
            }))
        };
        return JSON.stringify(report, null, 2);
    }
    /**
     * Export support data
     */
    async exportSupportData() {
        const data = {
            tickets: this.getTickets(),
            featureRequests: this.getFeatureRequests(),
            config: this.config,
            exportedAt: new Date()
        };
        return JSON.stringify(data, null, 2);
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        this.outputChannel.appendLine(`⚙️ Priority support configuration updated`);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Collect system logs
     */
    async collectLogs() {
        const logs = [];
        try {
            // Collect VS Code logs
            const logPath = path.join(this.context.logPath, 'renderer1.log');
            if (fs.existsSync(logPath)) {
                logs.push(logPath);
            }
            // Collect extension logs
            const extensionLogPath = path.join(this.context.globalStorageUri.fsPath, 'extension.log');
            if (fs.existsSync(extensionLogPath)) {
                logs.push(extensionLogPath);
            }
            // Collect output channel content
            const outputContent = this.outputChannel.toString();
            if (outputContent) {
                const outputPath = path.join(this.context.globalStorageUri.fsPath, 'output.log');
                fs.writeFileSync(outputPath, outputContent);
                logs.push(outputPath);
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`⚠️ Failed to collect some logs: ${error}`);
        }
        return logs;
    }
    /**
     * Get system information
     */
    getSystemInfo() {
        return {
            platform: os.platform(),
            arch: os.arch(),
            version: os.version(),
            hostname: os.hostname(),
            userInfo: os.userInfo(),
            totalMemory: os.totalmem(),
            freeMemory: os.freemem(),
            cpus: os.cpus().length,
            uptime: os.uptime(),
            vscodeVersion: vscode.version,
            extensionVersion: this.context.extension.packageJSON.version
        };
    }
    /**
     * Format system info for display
     */
    formatSystemInfo(systemInfo) {
        return `
**System Information:**
- Platform: ${systemInfo.platform} ${systemInfo.arch}
- OS Version: ${systemInfo.version}
- Hostname: ${systemInfo.hostname}
- User: ${systemInfo.userInfo.username}
- Memory: ${Math.round(systemInfo.freeMemory / 1024 / 1024)}MB free / ${Math.round(systemInfo.totalMemory / 1024 / 1024)}MB total
- CPUs: ${systemInfo.cpus}
- Uptime: ${Math.round(systemInfo.uptime / 3600)} hours
- VS Code: ${systemInfo.vscodeVersion}
- Extension: ${systemInfo.extensionVersion}
    `.trim();
    }
    /**
     * Send priority notification
     */
    async sendPriorityNotification(ticket) {
        try {
            const message = `
🚨 **Priority Support Ticket Created**

**Ticket ID:** ${ticket.id}
**Type:** ${ticket.type}
**Priority:** ${ticket.priority}
**Title:** ${ticket.title}

**Description:**
${ticket.description}

**Reporter:** ${ticket.reporter}
**Created:** ${ticket.createdAt.toISOString()}

Please respond within ${this.config.responseTimeTarget} hours.
      `.trim();
            this.outputChannel.appendLine(`📧 Priority notification sent for ticket: ${ticket.id}`);
            // In a real implementation, this would send an email or notification
            // For now, we just log it
            console.log('Priority notification:', message);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to send priority notification: ${error}`);
        }
    }
    /**
     * Calculate average response time
     */
    calculateAverageResponseTime(tickets) {
        const resolvedTickets = tickets.filter(t => t.resolvedAt);
        if (resolvedTickets.length === 0)
            return 0;
        const totalResponseTime = resolvedTickets.reduce((sum, ticket) => {
            const responseTime = ticket.resolvedAt.getTime() - ticket.createdAt.getTime();
            return sum + responseTime;
        }, 0);
        return Math.round(totalResponseTime / resolvedTickets.length / (1000 * 60 * 60)); // Hours
    }
    /**
     * Get current user
     */
    getCurrentUser() {
        return os.userInfo().username || 'Unknown User';
    }
    /**
     * Load configuration from storage
     */
    loadConfig() {
        try {
            const configData = this.context.globalState.get('prioritySupportConfig');
            if (configData) {
                this.config = { ...this.config, ...configData };
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to load priority support config: ${error}`);
        }
    }
    /**
     * Save configuration to storage
     */
    saveConfig() {
        try {
            this.context.globalState.update('prioritySupportConfig', this.config);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save priority support config: ${error}`);
        }
    }
    /**
     * Load tickets from storage
     */
    loadTickets() {
        try {
            const ticketsPath = path.join(this.context.globalStorageUri.fsPath, 'support-tickets.json');
            if (fs.existsSync(ticketsPath)) {
                const data = fs.readFileSync(ticketsPath, 'utf8');
                const tickets = JSON.parse(data);
                tickets.forEach((ticket) => {
                    this.tickets.set(ticket.id, ticket);
                });
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to load tickets: ${error}`);
        }
    }
    /**
     * Save tickets to storage
     */
    saveTickets() {
        try {
            const ticketsPath = path.join(this.context.globalStorageUri.fsPath, 'support-tickets.json');
            const tickets = this.getTickets();
            fs.writeFileSync(ticketsPath, JSON.stringify(tickets, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save tickets: ${error}`);
        }
    }
    /**
     * Load feature requests from storage
     */
    loadFeatureRequests() {
        try {
            const featuresPath = path.join(this.context.globalStorageUri.fsPath, 'feature-requests.json');
            if (fs.existsSync(featuresPath)) {
                const data = fs.readFileSync(featuresPath, 'utf8');
                const features = JSON.parse(data);
                features.forEach((feature) => {
                    this.featureRequests.set(feature.id, feature);
                });
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to load feature requests: ${error}`);
        }
    }
    /**
     * Save feature requests to storage
     */
    saveFeatureRequests() {
        try {
            const featuresPath = path.join(this.context.globalStorageUri.fsPath, 'feature-requests.json');
            const features = this.getFeatureRequests();
            fs.writeFileSync(featuresPath, JSON.stringify(features, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save feature requests: ${error}`);
        }
    }
    /**
     * Generate unique IDs
     */
    generateTicketId() {
        return `TICKET_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateFeatureRequestId() {
        return `FEATURE_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateCommentId() {
        return `COMMENT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Dispose of the service
     */
    dispose() {
        this.outputChannel.appendLine(`🔄 Priority Support service disposed`);
    }
}
exports.PrioritySupportService = PrioritySupportService;
//# sourceMappingURL=priority-support.js.map
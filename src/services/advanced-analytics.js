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
exports.AdvancedAnalyticsService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const os = __importStar(require("os"));
class AdvancedAnalyticsService {
    constructor(context, outputChannel) {
        this.events = [];
        this.metrics = [];
        this.context = context;
        this.outputChannel = outputChannel;
        this.sessionId = this.generateSessionId();
        this.userId = this.generateUserId();
        this.startTime = new Date();
        this.config = {
            enabled: true,
            trackEvents: true,
            trackPerformance: true,
            trackErrors: true,
            anonymizeData: true,
            retentionDays: 90,
            autoExport: false,
            exportFormat: 'json'
        };
        this.loadConfig();
        this.startPeriodicCleanup();
    }
    /**
     * Track an analytics event
     */
    trackEvent(type, category, action, label, value, metadata) {
        if (!this.config.enabled || !this.config.trackEvents) {
            return;
        }
        const event = {
            id: this.generateEventId(),
            type,
            category,
            action,
            label,
            value,
            timestamp: new Date(),
            sessionId: this.sessionId,
            userId: this.config.anonymizeData ? this.hashUserId(this.userId) : this.userId,
            metadata: this.config.anonymizeData ? this.anonymizeMetadata(metadata) : metadata
        };
        this.events.push(event);
        this.saveEvents();
        this.outputChannel.appendLine(`📊 Analytics: ${category}/${action}${label ? ` - ${label}` : ''}`);
    }
    /**
     * Track a performance metric
     */
    trackPerformance(name, value, unit, category, metadata) {
        if (!this.config.enabled || !this.config.trackPerformance) {
            return;
        }
        const metric = {
            id: this.generateMetricId(),
            name,
            value,
            unit,
            timestamp: new Date(),
            category,
            metadata: this.config.anonymizeData ? this.anonymizeMetadata(metadata) : metadata
        };
        this.metrics.push(metric);
        this.saveMetrics();
        this.outputChannel.appendLine(`⚡ Performance: ${name} = ${value} ${unit}`);
    }
    /**
     * Track an error
     */
    trackError(error, context) {
        if (!this.config.enabled || !this.config.trackErrors) {
            return;
        }
        this.trackEvent('error', 'system', 'error_occurred', error.message, undefined, {
            errorName: error.name,
            errorStack: error.stack,
            context,
            userAgent: navigator.userAgent,
            platform: os.platform(),
            arch: os.arch()
        });
    }
    /**
     * Get analytics dashboard data
     */
    async getDashboardData() {
        const now = new Date();
        const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentEvents = this.events.filter(e => e.timestamp >= last24Hours);
        const recentMetrics = this.metrics.filter(m => m.timestamp >= last24Hours);
        return {
            overview: {
                totalEvents: this.events.length,
                totalMetrics: this.metrics.length,
                sessionDuration: now.getTime() - this.startTime.getTime(),
                activeUsers: this.getUniqueUsers(recentEvents)
            },
            recentActivity: {
                events24h: recentEvents.length,
                metrics24h: recentMetrics.length,
                topFeatures: this.getTopFeatures(recentEvents),
                performanceTrends: this.getPerformanceTrends(recentMetrics)
            },
            performance: {
                averageResponseTime: this.getAverageMetric(recentMetrics, 'response_time'),
                memoryUsage: this.getLatestMetric(recentMetrics, 'memory_usage'),
                cpuUsage: this.getLatestMetric(recentMetrics, 'cpu_usage'),
                errorRate: this.getErrorRate(recentEvents)
            },
            usage: {
                dailyEvents: this.getDailyEvents(7),
                featureUsage: this.getFeatureUsage(recentEvents),
                sessionStats: this.getSessionStats()
            }
        };
    }
    /**
     * Generate usage report
     */
    async generateReport(period) {
        const endDate = new Date();
        const startDate = this.getStartDate(endDate, period);
        const periodEvents = this.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
        const periodMetrics = this.metrics.filter(m => m.timestamp >= startDate && m.timestamp <= endDate);
        const report = {
            period,
            startDate,
            endDate,
            totalEvents: periodEvents.length,
            uniqueUsers: this.getUniqueUsers(periodEvents),
            topFeatures: this.getTopFeatures(periodEvents),
            performanceMetrics: periodMetrics,
            errors: this.getErrorSummary(periodEvents),
            sessions: this.getSessionData(startDate, endDate)
        };
        return report;
    }
    /**
     * Export analytics data
     */
    async exportData(format = 'json') {
        const data = {
            events: this.events,
            metrics: this.metrics,
            config: this.config,
            generatedAt: new Date()
        };
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            case 'html':
                return this.convertToHTML(data);
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }
    /**
     * Clear old analytics data
     */
    async cleanupOldData() {
        const cutoffDate = new Date(Date.now() - this.config.retentionDays * 24 * 60 * 60 * 1000);
        const originalEventCount = this.events.length;
        const originalMetricCount = this.metrics.length;
        this.events = this.events.filter(e => e.timestamp >= cutoffDate);
        this.metrics = this.metrics.filter(m => m.timestamp >= cutoffDate);
        this.saveEvents();
        this.saveMetrics();
        const removedEvents = originalEventCount - this.events.length;
        const removedMetrics = originalMetricCount - this.metrics.length;
        this.outputChannel.appendLine(`🧹 Cleaned up ${removedEvents} old events and ${removedMetrics} old metrics`);
    }
    /**
     * Update analytics configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        this.outputChannel.appendLine(`⚙️ Analytics configuration updated`);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Reset analytics data
     */
    async resetData() {
        this.events = [];
        this.metrics = [];
        this.saveEvents();
        this.saveMetrics();
        this.outputChannel.appendLine(`🔄 Analytics data reset`);
    }
    /**
     * Get system performance metrics
     */
    async getSystemMetrics() {
        const metrics = [];
        // Memory usage
        const memUsage = process.memoryUsage();
        metrics.push({
            id: this.generateMetricId(),
            name: 'memory_usage',
            value: Math.round(memUsage.heapUsed / 1024 / 1024),
            unit: 'MB',
            timestamp: new Date(),
            category: 'memory',
            metadata: {
                heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
                heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
                external: Math.round(memUsage.external / 1024 / 1024),
                rss: Math.round(memUsage.rss / 1024 / 1024)
            }
        });
        // CPU usage (simplified)
        const startUsage = process.cpuUsage();
        await new Promise(resolve => setTimeout(resolve, 100));
        const endUsage = process.cpuUsage(startUsage);
        const cpuPercent = (endUsage.user + endUsage.system) / 1000000; // Convert to seconds
        metrics.push({
            id: this.generateMetricId(),
            name: 'cpu_usage',
            value: Math.round(cpuPercent * 100),
            unit: '%',
            timestamp: new Date(),
            category: 'cpu',
            metadata: {
                userTime: endUsage.user,
                systemTime: endUsage.system
            }
        });
        // Uptime
        metrics.push({
            id: this.generateMetricId(),
            name: 'uptime',
            value: Math.round(process.uptime()),
            unit: 'seconds',
            timestamp: new Date(),
            category: 'server',
            metadata: {
                startTime: this.startTime
            }
        });
        return metrics;
    }
    /**
     * Load configuration from storage
     */
    loadConfig() {
        try {
            const configData = this.context.globalState.get('analyticsConfig');
            if (configData) {
                this.config = { ...this.config, ...configData };
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to load analytics config: ${error}`);
        }
    }
    /**
     * Save configuration to storage
     */
    saveConfig() {
        try {
            this.context.globalState.update('analyticsConfig', this.config);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save analytics config: ${error}`);
        }
    }
    /**
     * Save events to storage
     */
    saveEvents() {
        try {
            const eventsPath = path.join(this.context.globalStorageUri.fsPath, 'analytics-events.json');
            fs.writeFileSync(eventsPath, JSON.stringify(this.events, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save events: ${error}`);
        }
    }
    /**
     * Save metrics to storage
     */
    saveMetrics() {
        try {
            const metricsPath = path.join(this.context.globalStorageUri.fsPath, 'analytics-metrics.json');
            fs.writeFileSync(metricsPath, JSON.stringify(this.metrics, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save metrics: ${error}`);
        }
    }
    /**
     * Start periodic cleanup
     */
    startPeriodicCleanup() {
        setInterval(() => {
            this.cleanupOldData();
        }, 24 * 60 * 60 * 1000); // Daily cleanup
    }
    /**
     * Generate unique IDs
     */
    generateEventId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateMetricId() {
        return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateSessionId() {
        return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    generateUserId() {
        return `user_${os.hostname()}_${os.userInfo().username}`;
    }
    /**
     * Hash user ID for anonymization
     */
    hashUserId(userId) {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(userId).digest('hex').substr(0, 16);
    }
    /**
     * Anonymize metadata
     */
    anonymizeMetadata(metadata) {
        if (!metadata)
            return undefined;
        const anonymized = { ...metadata };
        const sensitiveKeys = ['username', 'email', 'ip', 'hostname', 'path'];
        sensitiveKeys.forEach(key => {
            if (anonymized[key]) {
                anonymized[key] = '[REDACTED]';
            }
        });
        return anonymized;
    }
    /**
     * Helper methods for analytics calculations
     */
    getUniqueUsers(events) {
        const userIds = new Set(events.map(e => e.userId).filter(Boolean));
        return userIds.size;
    }
    getTopFeatures(events) {
        const featureCounts = new Map();
        events.forEach(event => {
            const feature = `${event.category}/${event.action}`;
            featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
        });
        return Array.from(featureCounts.entries())
            .map(([feature, count]) => ({ feature, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }
    getPerformanceTrends(metrics) {
        const trends = new Map();
        metrics.forEach(metric => {
            if (!trends.has(metric.name)) {
                trends.set(metric.name, []);
            }
            trends.get(metric.name).push(metric.value);
        });
        return Array.from(trends.entries()).map(([name, values]) => ({
            name,
            average: values.reduce((a, b) => a + b, 0) / values.length,
            min: Math.min(...values),
            max: Math.max(...values),
            count: values.length
        }));
    }
    getAverageMetric(metrics, name) {
        const matchingMetrics = metrics.filter(m => m.name === name);
        if (matchingMetrics.length === 0)
            return 0;
        const sum = matchingMetrics.reduce((acc, m) => acc + m.value, 0);
        return Math.round(sum / matchingMetrics.length);
    }
    getLatestMetric(metrics, name) {
        const matchingMetrics = metrics.filter(m => m.name === name);
        if (matchingMetrics.length === 0)
            return null;
        return matchingMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
    }
    getErrorRate(events) {
        const errorEvents = events.filter(e => e.type === 'error');
        return events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;
    }
    getDailyEvents(days) {
        const dailyCounts = new Map();
        for (let i = 0; i < days; i++) {
            const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
            const dateStr = date.toISOString().split('T')[0];
            dailyCounts.set(dateStr, 0);
        }
        this.events.forEach(event => {
            const dateStr = event.timestamp.toISOString().split('T')[0];
            if (dailyCounts.has(dateStr)) {
                dailyCounts.set(dateStr, dailyCounts.get(dateStr) + 1);
            }
        });
        return Array.from(dailyCounts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    getFeatureUsage(events) {
        const usage = new Map();
        events.forEach(event => {
            const feature = event.category;
            usage.set(feature, (usage.get(feature) || 0) + 1);
        });
        return Array.from(usage.entries())
            .map(([feature, count]) => ({ feature, count }))
            .sort((a, b) => b.count - a.count);
    }
    getSessionStats() {
        return {
            currentSessionId: this.sessionId,
            sessionStartTime: this.startTime,
            sessionDuration: Date.now() - this.startTime.getTime()
        };
    }
    getStartDate(endDate, period) {
        switch (period) {
            case 'daily':
                return new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
            case 'weekly':
                return new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
            case 'monthly':
                return new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
        }
    }
    getErrorSummary(events) {
        const errorCounts = new Map();
        events.filter(e => e.type === 'error').forEach(event => {
            const error = event.label || 'Unknown Error';
            errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
        });
        return Array.from(errorCounts.entries())
            .map(([error, count]) => ({ error, count }))
            .sort((a, b) => b.count - a.count);
    }
    getSessionData(startDate, endDate) {
        const sessionCounts = new Map();
        this.events
            .filter(e => e.timestamp >= startDate && e.timestamp <= endDate)
            .forEach(event => {
            const dateStr = event.timestamp.toISOString().split('T')[0];
            if (event.sessionId) {
                sessionCounts.set(dateStr, (sessionCounts.get(dateStr) || 0) + 1);
            }
        });
        return Array.from(sessionCounts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }
    /**
     * Export format converters
     */
    convertToCSV(data) {
        const events = data.events.map((e) => `${e.id},${e.type},${e.category},${e.action},${e.label || ''},${e.value || ''},${e.timestamp.toISOString()}`).join('\n');
        const headers = 'ID,Type,Category,Action,Label,Value,Timestamp\n';
        return headers + events;
    }
    convertToHTML(data) {
        return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
        </style>
      </head>
      <body>
        <h1>Analytics Report</h1>
        <div class="section">
          <h2>Summary</h2>
          <p>Total Events: ${data.events.length}</p>
          <p>Total Metrics: ${data.metrics.length}</p>
          <p>Generated: ${data.generatedAt.toISOString()}</p>
        </div>
        <div class="section">
          <h2>Recent Events</h2>
          <table>
            <tr><th>Type</th><th>Category</th><th>Action</th><th>Timestamp</th></tr>
            ${data.events.slice(-10).map((e) => `<tr><td>${e.type}</td><td>${e.category}</td><td>${e.action}</td><td>${e.timestamp.toISOString()}</td></tr>`).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
    }
    /**
     * Dispose of the service
     */
    dispose() {
        this.cleanupOldData();
        this.outputChannel.appendLine(`🔄 Advanced Analytics service disposed`);
    }
}
exports.AdvancedAnalyticsService = AdvancedAnalyticsService;
//# sourceMappingURL=advanced-analytics.js.map
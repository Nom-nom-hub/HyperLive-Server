import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface AnalyticsEvent {
  id: string;
  type: string;
  category: string;
  action: string;
  label?: string;
  value?: number;
  timestamp: Date;
  sessionId?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: 'server' | 'ai' | 'file' | 'network' | 'memory' | 'cpu';
  metadata?: Record<string, any>;
}

export interface UsageReport {
  period: 'daily' | 'weekly' | 'monthly';
  startDate: Date;
  endDate: Date;
  totalEvents: number;
  uniqueUsers: number;
  topFeatures: Array<{ feature: string; count: number }>;
  performanceMetrics: PerformanceMetric[];
  errors: Array<{ error: string; count: number }>;
  sessions: Array<{ date: string; count: number }>;
}

export interface AnalyticsConfig {
  enabled: boolean;
  trackEvents: boolean;
  trackPerformance: boolean;
  trackErrors: boolean;
  anonymizeData: boolean;
  retentionDays: number;
  autoExport: boolean;
  exportFormat: 'json' | 'csv' | 'html';
}

export class AdvancedAnalyticsService {
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private events: AnalyticsEvent[] = [];
  private metrics: PerformanceMetric[] = [];
  private config: AnalyticsConfig;
  private sessionId: string;
  private userId: string;
  private startTime: Date;

  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
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
  trackEvent(type: string, category: string, action: string, label?: string, value?: number, metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.trackEvents) {
      return;
    }

    const event: AnalyticsEvent = {
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
  trackPerformance(name: string, value: number, unit: string, category: 'server' | 'ai' | 'file' | 'network' | 'memory' | 'cpu', metadata?: Record<string, any>): void {
    if (!this.config.enabled || !this.config.trackPerformance) {
      return;
    }

    const metric: PerformanceMetric = {
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
  trackError(error: Error, context?: string): void {
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
  async getDashboardData(): Promise<any> {
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
  async generateReport(period: 'daily' | 'weekly' | 'monthly'): Promise<UsageReport> {
    const endDate = new Date();
    const startDate = this.getStartDate(endDate, period);

    const periodEvents = this.events.filter(e => e.timestamp >= startDate && e.timestamp <= endDate);
    const periodMetrics = this.metrics.filter(m => m.timestamp >= startDate && m.timestamp <= endDate);

    const report: UsageReport = {
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
  async exportData(format: 'json' | 'csv' | 'html' = 'json'): Promise<string> {
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
  async cleanupOldData(): Promise<void> {
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
  updateConfig(newConfig: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
    this.outputChannel.appendLine(`⚙️ Analytics configuration updated`);
  }

  /**
   * Get current configuration
   */
  getConfig(): AnalyticsConfig {
    return { ...this.config };
  }

  /**
   * Reset analytics data
   */
  async resetData(): Promise<void> {
    this.events = [];
    this.metrics = [];
    this.saveEvents();
    this.saveMetrics();
    this.outputChannel.appendLine(`🔄 Analytics data reset`);
  }

  /**
   * Get system performance metrics
   */
  async getSystemMetrics(): Promise<PerformanceMetric[]> {
    const metrics: PerformanceMetric[] = [];

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
  private loadConfig(): void {
    try {
      const configData = this.context.globalState.get('analyticsConfig');
      if (configData) {
        this.config = { ...this.config, ...configData };
      }
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to load analytics config: ${error}`);
    }
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    try {
      this.context.globalState.update('analyticsConfig', this.config);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to save analytics config: ${error}`);
    }
  }

  /**
   * Save events to storage
   */
  private saveEvents(): void {
    try {
      const eventsPath = path.join(this.context.globalStorageUri.fsPath, 'analytics-events.json');
      fs.writeFileSync(eventsPath, JSON.stringify(this.events, null, 2));
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to save events: ${error}`);
    }
  }

  /**
   * Save metrics to storage
   */
  private saveMetrics(): void {
    try {
      const metricsPath = path.join(this.context.globalStorageUri.fsPath, 'analytics-metrics.json');
      fs.writeFileSync(metricsPath, JSON.stringify(this.metrics, null, 2));
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to save metrics: ${error}`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupOldData();
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Generate unique IDs
   */
  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateMetricId(): string {
    return `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateUserId(): string {
    return `user_${os.hostname()}_${os.userInfo().username}`;
  }

  /**
   * Hash user ID for anonymization
   */
  private hashUserId(userId: string): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(userId).digest('hex').substr(0, 16);
  }

  /**
   * Anonymize metadata
   */
  private anonymizeMetadata(metadata?: Record<string, any>): Record<string, any> | undefined {
    if (!metadata) return undefined;

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
  private getUniqueUsers(events: AnalyticsEvent[]): number {
    const userIds = new Set(events.map(e => e.userId).filter(Boolean));
    return userIds.size;
  }

  private getTopFeatures(events: AnalyticsEvent[]): Array<{ feature: string; count: number }> {
    const featureCounts = new Map<string, number>();
    
    events.forEach(event => {
      const feature = `${event.category}/${event.action}`;
      featureCounts.set(feature, (featureCounts.get(feature) || 0) + 1);
    });

    return Array.from(featureCounts.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  private getPerformanceTrends(metrics: PerformanceMetric[]): any {
    const trends = new Map<string, number[]>();
    
    metrics.forEach(metric => {
      if (!trends.has(metric.name)) {
        trends.set(metric.name, []);
      }
      trends.get(metric.name)!.push(metric.value);
    });

    return Array.from(trends.entries()).map(([name, values]) => ({
      name,
      average: values.reduce((a, b) => a + b, 0) / values.length,
      min: Math.min(...values),
      max: Math.max(...values),
      count: values.length
    }));
  }

  private getAverageMetric(metrics: PerformanceMetric[], name: string): number {
    const matchingMetrics = metrics.filter(m => m.name === name);
    if (matchingMetrics.length === 0) return 0;
    
    const sum = matchingMetrics.reduce((acc, m) => acc + m.value, 0);
    return Math.round(sum / matchingMetrics.length);
  }

  private getLatestMetric(metrics: PerformanceMetric[], name: string): PerformanceMetric | null {
    const matchingMetrics = metrics.filter(m => m.name === name);
    if (matchingMetrics.length === 0) return null;
    
    return matchingMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  private getErrorRate(events: AnalyticsEvent[]): number {
    const errorEvents = events.filter(e => e.type === 'error');
    return events.length > 0 ? (errorEvents.length / events.length) * 100 : 0;
  }

  private getDailyEvents(days: number): Array<{ date: string; count: number }> {
    const dailyCounts = new Map<string, number>();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];
      dailyCounts.set(dateStr, 0);
    }

    this.events.forEach(event => {
      const dateStr = event.timestamp.toISOString().split('T')[0];
      if (dailyCounts.has(dateStr)) {
        dailyCounts.set(dateStr, dailyCounts.get(dateStr)! + 1);
      }
    });

    return Array.from(dailyCounts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getFeatureUsage(events: AnalyticsEvent[]): any {
    const usage = new Map<string, number>();
    
    events.forEach(event => {
      const feature = event.category;
      usage.set(feature, (usage.get(feature) || 0) + 1);
    });

    return Array.from(usage.entries())
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getSessionStats(): any {
    return {
      currentSessionId: this.sessionId,
      sessionStartTime: this.startTime,
      sessionDuration: Date.now() - this.startTime.getTime()
    };
  }

  private getStartDate(endDate: Date, period: 'daily' | 'weekly' | 'monthly'): Date {
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

  private getErrorSummary(events: AnalyticsEvent[]): Array<{ error: string; count: number }> {
    const errorCounts = new Map<string, number>();
    
    events.filter(e => e.type === 'error').forEach(event => {
      const error = event.label || 'Unknown Error';
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    return Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count);
  }

  private getSessionData(startDate: Date, endDate: Date): Array<{ date: string; count: number }> {
    const sessionCounts = new Map<string, number>();
    
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
  private convertToCSV(data: any): string {
    const events = data.events.map((e: AnalyticsEvent) => 
      `${e.id},${e.type},${e.category},${e.action},${e.label || ''},${e.value || ''},${e.timestamp.toISOString()}`
    ).join('\n');

    const headers = 'ID,Type,Category,Action,Label,Value,Timestamp\n';
    return headers + events;
  }

  private convertToHTML(data: any): string {
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
            ${data.events.slice(-10).map((e: AnalyticsEvent) => 
              `<tr><td>${e.type}</td><td>${e.category}</td><td>${e.action}</td><td>${e.timestamp.toISOString()}</td></tr>`
            ).join('')}
          </table>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Dispose of the service
   */
  dispose(): void {
    this.cleanupOldData();
    this.outputChannel.appendLine(`🔄 Advanced Analytics service disposed`);
  }
} 
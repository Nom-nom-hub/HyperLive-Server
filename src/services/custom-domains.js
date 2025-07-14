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
exports.CustomDomainsService = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const dns = __importStar(require("dns"));
const https = __importStar(require("https"));
const http = __importStar(require("http"));
class CustomDomainsService {
    constructor(context, outputChannel) {
        this.domains = new Map();
        this.verificationTimer = null;
        this.context = context;
        this.outputChannel = outputChannel;
        this.config = {
            enabled: true,
            autoVerify: true,
            sslRequired: false,
            maxDomains: 10,
            allowedTlds: ['.com', '.net', '.org', '.io', '.dev', '.app', '.tech', '.co'],
            verificationInterval: 30 // 30 minutes
        };
        this.loadConfig();
        this.loadDomains();
        this.startPeriodicVerification();
    }
    /**
     * Add a custom domain
     */
    async addDomain(domain, targetUrl, sslEnabled = true) {
        try {
            // Validate domain format
            if (!this.isValidDomain(domain)) {
                throw new Error('Invalid domain format');
            }
            // Check if domain already exists
            if (this.domains.has(domain)) {
                throw new Error('Domain already exists');
            }
            // Check domain limit
            if (this.domains.size >= this.config.maxDomains) {
                throw new Error(`Maximum number of domains (${this.config.maxDomains}) reached`);
            }
            const customDomain = {
                id: this.generateDomainId(),
                domain: domain.toLowerCase(),
                targetUrl,
                sslEnabled,
                status: 'pending',
                createdAt: new Date(),
                lastVerified: new Date()
            };
            this.domains.set(domain, customDomain);
            this.saveDomains();
            this.outputChannel.appendLine(`🌐 Added custom domain: ${domain} -> ${targetUrl}`);
            // Auto-verify if enabled
            if (this.config.autoVerify) {
                await this.verifyDomain(domain);
            }
            return customDomain;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to add domain: ${error}`);
            throw error;
        }
    }
    /**
     * Remove a custom domain
     */
    async removeDomain(domain) {
        try {
            if (!this.domains.has(domain)) {
                throw new Error('Domain not found');
            }
            this.domains.delete(domain);
            this.saveDomains();
            this.outputChannel.appendLine(`🗑️ Removed custom domain: ${domain}`);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to remove domain: ${error}`);
            throw error;
        }
    }
    /**
     * Update domain configuration
     */
    async updateDomain(domain, updates) {
        try {
            const existingDomain = this.domains.get(domain);
            if (!existingDomain) {
                throw new Error('Domain not found');
            }
            const updatedDomain = {
                ...existingDomain,
                ...updates,
                lastVerified: new Date()
            };
            this.domains.set(domain, updatedDomain);
            this.saveDomains();
            this.outputChannel.appendLine(`✏️ Updated domain: ${domain}`);
            return updatedDomain;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to update domain: ${error}`);
            throw error;
        }
    }
    /**
     * Verify domain configuration
     */
    async verifyDomain(domain) {
        try {
            const customDomain = this.domains.get(domain);
            if (!customDomain) {
                throw new Error('Domain not found');
            }
            this.outputChannel.appendLine(`🔍 Verifying domain: ${domain}`);
            const result = {
                success: false
            };
            // DNS resolution check
            try {
                const startTime = Date.now();
                const addresses = await this.resolveDomain(domain);
                result.responseTime = Date.now() - startTime;
                result.ipAddress = addresses[0];
                if (addresses.length === 0) {
                    result.error = 'Domain does not resolve to any IP address';
                    return result;
                }
            }
            catch (error) {
                result.error = `DNS resolution failed: ${error}`;
                return result;
            }
            // SSL certificate check (if enabled)
            if (customDomain.sslEnabled) {
                try {
                    result.sslValid = await this.verifySSL(domain);
                    if (!result.sslValid) {
                        result.error = 'SSL certificate is invalid or expired';
                        return result;
                    }
                }
                catch (error) {
                    result.error = `SSL verification failed: ${error}`;
                    return result;
                }
            }
            // HTTP/HTTPS connectivity check
            try {
                const isReachable = await this.checkConnectivity(domain, customDomain.sslEnabled);
                if (!isReachable) {
                    result.error = 'Domain is not reachable';
                    return result;
                }
            }
            catch (error) {
                result.error = `Connectivity check failed: ${error}`;
                return result;
            }
            result.success = true;
            // Update domain status
            await this.updateDomain(domain, {
                status: result.success ? 'active' : 'error',
                lastVerified: new Date()
            });
            this.outputChannel.appendLine(`✅ Domain verification successful: ${domain}`);
            return result;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Domain verification failed: ${error}`);
            // Update domain status to error
            await this.updateDomain(domain, {
                status: 'error',
                lastVerified: new Date()
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
    /**
     * Get all custom domains
     */
    getDomains() {
        return Array.from(this.domains.values());
    }
    /**
     * Get domain by ID
     */
    getDomain(domain) {
        return this.domains.get(domain);
    }
    /**
     * Get active domains
     */
    getActiveDomains() {
        return this.getDomains().filter(d => d.status === 'active');
    }
    /**
     * Check if domain is valid
     */
    isValidDomain(domain) {
        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!domainRegex.test(domain)) {
            return false;
        }
        // Check TLD
        const tld = domain.substring(domain.lastIndexOf('.'));
        if (!this.config.allowedTlds.includes(tld)) {
            return false;
        }
        return true;
    }
    /**
     * Generate domain suggestions
     */
    generateDomainSuggestions(baseName) {
        const suggestions = [];
        const cleanName = baseName.toLowerCase().replace(/[^a-z0-9]/g, '');
        this.config.allowedTlds.forEach(tld => {
            suggestions.push(`${cleanName}${tld}`);
            suggestions.push(`${cleanName}-dev${tld}`);
            suggestions.push(`${cleanName}-staging${tld}`);
            suggestions.push(`${cleanName}-preview${tld}`);
        });
        return suggestions.slice(0, 10); // Limit to 10 suggestions
    }
    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.saveConfig();
        this.outputChannel.appendLine(`⚙️ Custom domains configuration updated`);
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.config };
    }
    /**
     * Export domains configuration
     */
    async exportDomains() {
        const data = {
            domains: this.getDomains(),
            config: this.config,
            exportedAt: new Date()
        };
        return JSON.stringify(data, null, 2);
    }
    /**
     * Import domains configuration
     */
    async importDomains(configData) {
        try {
            const data = JSON.parse(configData);
            if (data.domains && Array.isArray(data.domains)) {
                // Clear existing domains
                this.domains.clear();
                // Import new domains
                data.domains.forEach((domain) => {
                    this.domains.set(domain.domain, domain);
                });
                this.saveDomains();
                this.outputChannel.appendLine(`📥 Imported ${data.domains.length} domains`);
            }
            if (data.config) {
                this.updateConfig(data.config);
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to import domains: ${error}`);
            throw error;
        }
    }
    /**
     * Get domain statistics
     */
    getDomainStats() {
        const domains = this.getDomains();
        return {
            total: domains.length,
            active: domains.filter(d => d.status === 'active').length,
            pending: domains.filter(d => d.status === 'pending').length,
            error: domains.filter(d => d.status === 'error').length,
            disabled: domains.filter(d => d.status === 'disabled').length,
            sslEnabled: domains.filter(d => d.sslEnabled).length,
            averageAge: this.getAverageDomainAge(domains)
        };
    }
    /**
     * DNS resolution helper
     */
    resolveDomain(domain) {
        return new Promise((resolve, reject) => {
            dns.resolve4(domain, (err, addresses) => {
                if (err) {
                    reject(err);
                }
                else {
                    resolve(addresses);
                }
            });
        });
    }
    /**
     * SSL verification helper
     */
    verifySSL(domain) {
        return new Promise((resolve) => {
            const options = {
                hostname: domain,
                port: 443,
                method: 'GET',
                timeout: 5000
            };
            const req = https.request(options, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => {
                resolve(false);
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }
    /**
     * Connectivity check helper
     */
    checkConnectivity(domain, ssl) {
        return new Promise((resolve) => {
            const protocol = ssl ? https : http;
            const port = ssl ? 443 : 80;
            const options = {
                hostname: domain,
                port,
                method: 'HEAD',
                timeout: 5000
            };
            const req = protocol.request(options, (res) => {
                resolve((res.statusCode || 0) >= 200 && (res.statusCode || 0) < 400);
            });
            req.on('error', () => {
                resolve(false);
            });
            req.on('timeout', () => {
                req.destroy();
                resolve(false);
            });
            req.end();
        });
    }
    /**
     * Start periodic domain verification
     */
    startPeriodicVerification() {
        if (this.verificationTimer) {
            clearInterval(this.verificationTimer);
        }
        this.verificationTimer = setInterval(async () => {
            if (this.config.autoVerify) {
                const domains = this.getActiveDomains();
                for (const domain of domains) {
                    await this.verifyDomain(domain.domain);
                }
            }
        }, this.config.verificationInterval * 60 * 1000);
    }
    /**
     * Load configuration from storage
     */
    loadConfig() {
        try {
            const configData = this.context.globalState.get('customDomainsConfig');
            if (configData) {
                this.config = { ...this.config, ...configData };
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to load custom domains config: ${error}`);
        }
    }
    /**
     * Save configuration to storage
     */
    saveConfig() {
        try {
            this.context.globalState.update('customDomainsConfig', this.config);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save custom domains config: ${error}`);
        }
    }
    /**
     * Load domains from storage
     */
    loadDomains() {
        try {
            const domainsPath = path.join(this.context.globalStorageUri.fsPath, 'custom-domains.json');
            if (fs.existsSync(domainsPath)) {
                const data = fs.readFileSync(domainsPath, 'utf8');
                const domains = JSON.parse(data);
                domains.forEach((domain) => {
                    this.domains.set(domain.domain, domain);
                });
            }
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to load domains: ${error}`);
        }
    }
    /**
     * Save domains to storage
     */
    saveDomains() {
        try {
            const domainsPath = path.join(this.context.globalStorageUri.fsPath, 'custom-domains.json');
            const domains = this.getDomains();
            fs.writeFileSync(domainsPath, JSON.stringify(domains, null, 2));
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to save domains: ${error}`);
        }
    }
    /**
     * Generate unique domain ID
     */
    generateDomainId() {
        return `domain_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Calculate average domain age
     */
    getAverageDomainAge(domains) {
        if (domains.length === 0)
            return 0;
        const totalAge = domains.reduce((sum, domain) => {
            return sum + (Date.now() - domain.createdAt.getTime());
        }, 0);
        return Math.round(totalAge / domains.length / (1000 * 60 * 60 * 24)); // Days
    }
    /**
     * Dispose of the service
     */
    dispose() {
        if (this.verificationTimer) {
            clearInterval(this.verificationTimer);
        }
        this.outputChannel.appendLine(`🔄 Custom Domains service disposed`);
    }
}
exports.CustomDomainsService = CustomDomainsService;
//# sourceMappingURL=custom-domains.js.map
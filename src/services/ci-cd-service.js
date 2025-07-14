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
exports.CICDService = void 0;
const vscode = __importStar(require("vscode"));
const child_process = __importStar(require("child_process"));
class CICDService {
    constructor(context) {
        this.context = context;
        this.outputChannel = vscode.window.createOutputChannel('Advanced Live Server - CI/CD');
        this.config = this.loadConfig();
    }
    loadConfig() {
        const workspaceConfig = vscode.workspace.getConfiguration('advancedLiveServer.cicd');
        return {
            enabled: workspaceConfig.get('enabled', false),
            providers: {
                github: workspaceConfig.get('github'),
                gitlab: workspaceConfig.get('gitlab'),
                netlify: workspaceConfig.get('netlify'),
                vercel: workspaceConfig.get('vercel'),
                custom: workspaceConfig.get('custom'),
            },
            autoDeploy: workspaceConfig.get('autoDeploy', false),
            preDeployTests: workspaceConfig.get('preDeployTests', true),
            postDeployChecks: workspaceConfig.get('postDeployChecks', true),
        };
    }
    async triggerBuild(provider) {
        if (!this.config.enabled) {
            throw new Error('CI/CD is not enabled');
        }
        const providerConfig = this.config.providers[provider];
        if (!providerConfig) {
            throw new Error(`Provider ${provider} is not configured`);
        }
        const startTime = Date.now();
        this.outputChannel.appendLine(`Starting ${provider} build...`);
        try {
            let result;
            switch (provider) {
                case 'github':
                    result = await this.triggerGitHubBuild(providerConfig);
                    break;
                case 'gitlab':
                    result = await this.triggerGitLabBuild(providerConfig);
                    break;
                case 'netlify':
                    result = await this.triggerNetlifyBuild(providerConfig);
                    break;
                case 'vercel':
                    result = await this.triggerVercelBuild(providerConfig);
                    break;
                case 'custom':
                    result = await this.triggerCustomBuild(providerConfig);
                    break;
                default:
                    throw new Error(`Unsupported provider: ${provider}`);
            }
            result.duration = Date.now() - startTime;
            result.timestamp = new Date();
            this.outputChannel.appendLine(`Build completed in ${result.duration}ms`);
            if (result.success) {
                this.outputChannel.appendLine(`✅ Build successful${result.url ? ` - ${result.url}` : ''}`);
            }
            else {
                this.outputChannel.appendLine(`❌ Build failed`);
            }
            return result;
        }
        catch (error) {
            const result = {
                success: false,
                output: error instanceof Error ? error.message : 'Unknown error',
                duration: Date.now() - startTime,
                timestamp: new Date(),
            };
            this.outputChannel.appendLine(`❌ Build failed: ${result.output}`);
            return result;
        }
    }
    async triggerGitHubBuild(config) {
        // Trigger GitHub Actions workflow
        const command = `gh workflow run ${config.workflow} --ref ${config.branch}`;
        return new Promise((resolve, reject) => {
            child_process.exec(command, {
                env: { ...process.env, GITHUB_TOKEN: config.token },
            }, (error, stdout, stderr) => {
                if (stderr) {
                    reject(new Error(`GitHub build failed: ${stderr}`));
                }
                else {
                    resolve({
                        success: true,
                        output: typeof stdout === 'string' ? stdout : '',
                        duration: 0,
                        timestamp: new Date(),
                        url: `https://github.com/${config.repository}/actions`,
                    });
                }
            });
        });
    }
    async triggerGitLabBuild(config) {
        // Trigger GitLab CI pipeline
        const command = `curl --request POST --header "PRIVATE-TOKEN: ${config.token}" "https://gitlab.com/api/v4/projects/${config.projectId}/pipeline?ref=${config.branch}"`;
        return new Promise((resolve, reject) => {
            child_process.exec(command, (error, stdout, stderr) => {
                if (stderr) {
                    reject(new Error(`GitLab build failed: ${stderr}`));
                }
                else {
                    resolve({
                        success: true,
                        output: typeof stdout === 'string' ? stdout : '',
                        duration: 0,
                        timestamp: new Date(),
                        url: `https://gitlab.com/api/v4/projects/${config.projectId}/pipelines`,
                    });
                }
            });
        });
    }
    async triggerNetlifyBuild(config) {
        // Deploy to Netlify
        const command = `npx netlify-cli deploy --prod --dir=${config.publishDirectory} --site=${config.siteId}`;
        return new Promise((resolve, reject) => {
            child_process.exec(command, {
                env: { ...process.env, NETLIFY_AUTH_TOKEN: config.token },
            }, (error, stdout, stderr) => {
                if (stderr) {
                    reject(new Error(`Netlify build failed: ${stderr}`));
                }
                else {
                    // Extract URL from output
                    const outStr = typeof stdout === 'string' ? stdout : '';
                    const urlMatch = outStr.match(/https:\/\/[^\s]+/);
                    const url = urlMatch ? urlMatch[0] : undefined;
                    resolve({
                        success: true,
                        output: outStr,
                        duration: 0,
                        timestamp: new Date(),
                        url: url,
                    });
                }
            });
        });
    }
    async triggerVercelBuild(config) {
        // Deploy to Vercel
        const command = `npx vercel --prod --token ${config.token}`;
        return new Promise((resolve, reject) => {
            child_process.exec(command, (error, stdout, stderr) => {
                if (stderr) {
                    reject(new Error(`Vercel build failed: ${stderr}`));
                }
                else {
                    // Extract URL from output
                    const outStr = typeof stdout === 'string' ? stdout : '';
                    const urlMatch = outStr.match(/https:\/\/[^\s]+/);
                    const url = urlMatch ? urlMatch[0] : undefined;
                    resolve({
                        success: true,
                        output: outStr,
                        duration: 0,
                        timestamp: new Date(),
                        url: url,
                    });
                }
            });
        });
    }
    async triggerCustomBuild(config) {
        // Run custom build commands
        const commands = [];
        if (this.config.preDeployTests && config.testCommand) {
            commands.push(config.testCommand);
        }
        commands.push(config.buildCommand);
        commands.push(config.deployCommand);
        let output = '';
        for (const command of commands) {
            const result = await this.executeCommand(command);
            output += `\n${command}:\n${result.output}\n`;
            if (!result.success) {
                return {
                    success: false,
                    output: output,
                    duration: 0,
                    timestamp: new Date(),
                };
            }
        }
        return {
            success: true,
            output: output,
            duration: 0,
            timestamp: new Date(),
        };
    }
    executeCommand(command) {
        return new Promise(resolve => {
            child_process.exec(command, (error, stdout, stderr) => {
                resolve({
                    success: !stderr,
                    output: typeof stderr === 'string' && stderr
                        ? stderr
                        : typeof stdout === 'string'
                            ? stdout
                            : '',
                });
            });
        });
    }
    async runTests() {
        if (!this.config.preDeployTests) {
            return { success: true, output: 'Tests skipped' };
        }
        const testCommands = [
            'npm test',
            'npm run test',
            'yarn test',
            'yarn run test',
            'pnpm test',
            'pnpm run test',
        ];
        for (const command of testCommands) {
            try {
                const result = await this.executeCommand(command);
                if (result.success) {
                    return result;
                }
            }
            catch {
                // Continue to next command
            }
        }
        return {
            success: false,
            output: 'No test command found or all tests failed',
        };
    }
    async checkDeployment(url) {
        if (!this.config.postDeployChecks) {
            return { success: true, status: 200, responseTime: 0 };
        }
        return new Promise(resolve => {
            const startTime = Date.now();
            // Simple HTTP check
            const http = require('http');
            const https = require('https');
            const client = url.startsWith('https') ? https : http;
            const req = client.get(url, (res) => {
                const responseTime = Date.now() - startTime;
                resolve({
                    success: res.statusCode >= 200 && res.statusCode < 300,
                    status: res.statusCode,
                    responseTime,
                });
            });
            req.on('error', () => {
                resolve({
                    success: false,
                    status: 0,
                    responseTime: Date.now() - startTime,
                });
            });
            req.setTimeout(10000, () => {
                req.destroy();
                resolve({
                    success: false,
                    status: 0,
                    responseTime: Date.now() - startTime,
                });
            });
        });
    }
    getOutputChannel() {
        return this.outputChannel;
    }
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
        // Update workspace configuration
        const config = vscode.workspace.getConfiguration('advancedLiveServer.cicd');
        if (updates.enabled !== undefined) {
            config.update('enabled', updates.enabled);
        }
        if (updates.autoDeploy !== undefined) {
            config.update('autoDeploy', updates.autoDeploy);
        }
        if (updates.preDeployTests !== undefined) {
            config.update('preDeployTests', updates.preDeployTests);
        }
        if (updates.postDeployChecks !== undefined) {
            config.update('postDeployChecks', updates.postDeployChecks);
        }
    }
}
exports.CICDService = CICDService;
//# sourceMappingURL=ci-cd-service.js.map
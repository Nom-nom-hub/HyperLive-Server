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
exports.PluginManager = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const child_process = __importStar(require("child_process"));
class PluginManager {
    constructor(context) {
        this.plugins = new Map();
        this.context = context;
        this.pluginDir = path.join(context.globalStorageUri.fsPath, 'plugins');
        this.outputChannel = vscode.window.createOutputChannel('Advanced Live Server - Plugins');
        this.registry = this.loadRegistry();
        this.loadPlugins();
    }
    loadRegistry() {
        const registryPath = path.join(this.context.globalStorageUri.fsPath, 'plugin-registry.json');
        try {
            if (fs.existsSync(registryPath)) {
                const data = fs.readFileSync(registryPath, 'utf8');
                return JSON.parse(data);
            }
        }
        catch (error) {
            console.error('Failed to load plugin registry:', error);
        }
        // Default registry
        return {
            plugins: [],
            sources: [
                {
                    name: 'Official',
                    url: 'https://api.npmjs.org/search?q=advanced-live-server-plugin',
                    type: 'npm',
                },
                {
                    name: 'Community',
                    url: 'https://github.com/topics/advanced-live-server-plugin',
                    type: 'github',
                },
            ],
        };
    }
    saveRegistry() {
        const registryPath = path.join(this.context.globalStorageUri.fsPath, 'plugin-registry.json');
        try {
            const data = JSON.stringify(this.registry, null, 2);
            fs.writeFileSync(registryPath, data);
        }
        catch (error) {
            console.error('Failed to save plugin registry:', error);
        }
    }
    loadPlugins() {
        if (!fs.existsSync(this.pluginDir)) {
            fs.mkdirSync(this.pluginDir, { recursive: true });
            return;
        }
        const pluginDirs = fs
            .readdirSync(this.pluginDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
        for (const pluginId of pluginDirs) {
            try {
                const pluginPath = path.join(this.pluginDir, pluginId);
                const manifestPath = path.join(pluginPath, 'package.json');
                if (fs.existsSync(manifestPath)) {
                    const manifestData = fs.readFileSync(manifestPath, 'utf8');
                    const manifest = JSON.parse(manifestData);
                    const configPath = path.join(pluginPath, 'config.json');
                    let config = {};
                    if (fs.existsSync(configPath)) {
                        const configData = fs.readFileSync(configPath, 'utf8');
                        config = JSON.parse(configData);
                    }
                    const plugin = {
                        id: manifest.id,
                        name: manifest.name,
                        version: manifest.version,
                        description: manifest.description,
                        author: manifest.author,
                        repository: manifest.repository,
                        homepage: manifest.homepage,
                        license: manifest.license,
                        dependencies: manifest.dependencies,
                        enabled: true,
                        config,
                        installedAt: new Date(),
                        updatedAt: new Date(),
                    };
                    this.plugins.set(pluginId, plugin);
                }
            }
            catch (error) {
                console.error(`Failed to load plugin ${pluginId}:`, error);
            }
        }
    }
    async installPlugin(source, pluginId) {
        this.outputChannel.appendLine(`Installing plugin: ${pluginId} from ${source}`);
        try {
            const pluginPath = path.join(this.pluginDir, pluginId);
            // Create plugin directory
            if (!fs.existsSync(pluginPath)) {
                fs.mkdirSync(pluginPath, { recursive: true });
            }
            // Download and install plugin
            await this.downloadPlugin(source, pluginId, pluginPath);
            // Load plugin manifest
            const manifestPath = path.join(pluginPath, 'package.json');
            const manifestData = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            // Install dependencies if any
            if (manifest.dependencies &&
                Object.keys(manifest.dependencies).length > 0) {
                await this.installDependencies(pluginPath, manifest.dependencies);
            }
            // Create plugin instance
            const plugin = {
                id: manifest.id,
                name: manifest.name,
                version: manifest.version,
                description: manifest.description,
                author: manifest.author,
                repository: manifest.repository,
                homepage: manifest.homepage,
                license: manifest.license,
                dependencies: manifest.dependencies,
                enabled: true,
                config: {},
                installedAt: new Date(),
                updatedAt: new Date(),
            };
            this.plugins.set(pluginId, plugin);
            this.outputChannel.appendLine(`✅ Plugin ${pluginId} installed successfully`);
            return plugin;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to install plugin ${pluginId}: ${error}`);
            throw error;
        }
    }
    async downloadPlugin(source, pluginId, pluginPath) {
        if (source.startsWith('npm:')) {
            await this.downloadFromNpm(source.replace('npm:', ''), pluginPath);
        }
        else if (source.startsWith('github:')) {
            await this.downloadFromGithub(source.replace('github:', ''), pluginPath);
        }
        else if (source.startsWith('http')) {
            await this.downloadFromUrl(source, pluginPath);
        }
        else {
            throw new Error(`Unsupported plugin source: ${source}`);
        }
    }
    async downloadFromNpm(packageName, pluginPath) {
        return new Promise((resolve, reject) => {
            child_process.exec(`npm pack ${packageName}`, {
                cwd: pluginPath,
            }, (error, stdout) => {
                if (error) {
                    reject(new Error(`Failed to download from npm: ${error.message}`));
                    return;
                }
                const tarball = stdout.trim();
                if (tarball) {
                    child_process.exec(`tar -xzf ${tarball} --strip-components=1`, {
                        cwd: pluginPath,
                    }, extractError => {
                        if (extractError) {
                            reject(new Error(`Failed to extract plugin: ${extractError.message}`));
                        }
                        else {
                            // Clean up tarball
                            fs.unlinkSync(path.join(pluginPath, tarball));
                            resolve();
                        }
                    });
                }
                else {
                    reject(new Error('No package found'));
                }
            });
        });
    }
    async downloadFromGithub(repo, pluginPath) {
        return new Promise((resolve, reject) => {
            child_process.exec(`git clone https://github.com/${repo}.git .`, {
                cwd: pluginPath,
            }, error => {
                if (error) {
                    reject(new Error(`Failed to download from GitHub: ${error.message}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
    async downloadFromUrl(url, pluginPath) {
        // Simple download implementation
        const https = require('https');
        const http = require('http');
        return new Promise((resolve, reject) => {
            const client = url.startsWith('https') ? https : http;
            client
                .get(url, (res) => {
                if (res.statusCode !== 200) {
                    reject(new Error(`HTTP ${res.statusCode}`));
                    return;
                }
                const file = fs.createWriteStream(path.join(pluginPath, 'plugin.zip'));
                res.pipe(file);
                file.on('finish', () => {
                    file.close();
                    // Extract zip file
                    child_process.exec('unzip plugin.zip', {
                        cwd: pluginPath,
                    }, error => {
                        if (error) {
                            reject(new Error(`Failed to extract plugin: ${error.message}`));
                        }
                        else {
                            fs.unlinkSync(path.join(pluginPath, 'plugin.zip'));
                            resolve();
                        }
                    });
                });
                file.on('error', (err) => {
                    fs.unlink(path.join(pluginPath, 'plugin.zip'), () => { });
                    reject(err);
                });
            })
                .on('error', reject);
        });
    }
    async installDependencies(pluginPath, dependencies) {
        const packageJson = {
            name: 'plugin-dependencies',
            version: '1.0.0',
            dependencies,
        };
        fs.writeFileSync(path.join(pluginPath, 'package.json'), JSON.stringify(packageJson, null, 2));
        return new Promise((resolve, reject) => {
            child_process.exec('npm install', {
                cwd: pluginPath,
            }, error => {
                if (error) {
                    reject(new Error(`Failed to install dependencies: ${error.message}`));
                }
                else {
                    resolve();
                }
            });
        });
    }
    async uninstallPlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        this.outputChannel.appendLine(`Uninstalling plugin: ${pluginId}`);
        try {
            const pluginPath = path.join(this.pluginDir, pluginId);
            if (fs.existsSync(pluginPath)) {
                fs.rmSync(pluginPath, { recursive: true, force: true });
            }
            this.plugins.delete(pluginId);
            this.outputChannel.appendLine(`✅ Plugin ${pluginId} uninstalled successfully`);
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to uninstall plugin ${pluginId}: ${error}`);
            throw error;
        }
    }
    async enablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        plugin.enabled = true;
        plugin.updatedAt = new Date();
        this.outputChannel.appendLine(`✅ Plugin ${pluginId} enabled`);
    }
    async disablePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        plugin.enabled = false;
        plugin.updatedAt = new Date();
        this.outputChannel.appendLine(`✅ Plugin ${pluginId} disabled`);
    }
    async updatePlugin(pluginId) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        this.outputChannel.appendLine(`Updating plugin: ${pluginId}`);
        try {
            const pluginPath = path.join(this.pluginDir, pluginId);
            const source = plugin.repository || `npm:${pluginId}`;
            // Backup current config
            const configPath = path.join(pluginPath, 'config.json');
            let config = {};
            if (fs.existsSync(configPath)) {
                const configData = fs.readFileSync(configPath, 'utf8');
                config = JSON.parse(configData);
            }
            // Remove old plugin
            fs.rmSync(pluginPath, { recursive: true, force: true });
            fs.mkdirSync(pluginPath, { recursive: true });
            // Download new version
            await this.downloadPlugin(source, pluginId, pluginPath);
            // Restore config
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
            // Update plugin info
            const manifestPath = path.join(pluginPath, 'package.json');
            const manifestData = fs.readFileSync(manifestPath, 'utf8');
            const manifest = JSON.parse(manifestData);
            plugin.version = manifest.version;
            plugin.updatedAt = new Date();
            this.outputChannel.appendLine(`✅ Plugin ${pluginId} updated to version ${manifest.version}`);
            return plugin;
        }
        catch (error) {
            this.outputChannel.appendLine(`❌ Failed to update plugin ${pluginId}: ${error}`);
            throw error;
        }
    }
    async searchPlugins(query) {
        this.outputChannel.appendLine(`Searching for plugins: ${query}`);
        const results = [];
        for (const source of this.registry.sources) {
            try {
                const sourceResults = await this.searchSource(source, query);
                results.push(...sourceResults);
            }
            catch (error) {
                console.error(`Failed to search source ${source.name}:`, error);
            }
        }
        return results;
    }
    async searchSource(source, query) {
        // Simplified search implementation
        // In a real implementation, you would make actual API calls
        const mockResults = [
            {
                id: 'mock-plugin-1',
                name: 'Mock Plugin 1',
                version: '1.0.0',
                description: 'A mock plugin for testing',
                author: 'Test Author',
                repository: 'test/mock-plugin-1',
                enabled: false,
                installedAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'mock-plugin-2',
                name: 'Mock Plugin 2',
                version: '2.0.0',
                description: 'Another mock plugin',
                author: 'Test Author 2',
                repository: 'test/mock-plugin-2',
                enabled: false,
                installedAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        return mockResults.filter(plugin => plugin.name.toLowerCase().includes(query.toLowerCase()) ||
            plugin.description.toLowerCase().includes(query.toLowerCase()));
    }
    getInstalledPlugins() {
        return Array.from(this.plugins.values());
    }
    getEnabledPlugins() {
        return Array.from(this.plugins.values()).filter(plugin => plugin.enabled);
    }
    getPlugin(pluginId) {
        return this.plugins.get(pluginId);
    }
    async updatePluginConfig(pluginId, config) {
        const plugin = this.plugins.get(pluginId);
        if (!plugin) {
            throw new Error(`Plugin ${pluginId} not found`);
        }
        plugin.config = { ...plugin.config, ...config };
        plugin.updatedAt = new Date();
        // Save config to file
        const configPath = path.join(this.pluginDir, pluginId, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(plugin.config, null, 2));
    }
    getOutputChannel() {
        return this.outputChannel;
    }
}
exports.PluginManager = PluginManager;
//# sourceMappingURL=plugin-manager.js.map
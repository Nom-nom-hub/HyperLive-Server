import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface ServerConfig {
  port: number;
  https: boolean;
  spa: boolean;
  openBrowser: boolean;
  showOverlay: boolean;
  watchPatterns: string[];
  ignorePatterns: string[];
  proxy?: Record<string, string>;
  enableCloudPreview?: boolean;
  ngrokAuthToken?: string;
  aiMode?: string;
  aiProvider?: string;
  aiModel?: string;
  aiApiKey?: string;
  aiBaseUrl?: string;
  aiTemperature?: number;
  aiMaxTokens?: number;
  aiEnableErrorExplanation?: boolean;
  aiEnableCodeSuggestions?: boolean;
  aiEnableAccessibilityAnalysis?: boolean;
  cert?: {
    key: string;
    cert: string;
  };
  projectType?: string; // e.g. 'react', 'vue', 'svelte', 'vite', 'snowpack', 'webpack', 'static'
}

export class ConfigManager {
  static async loadConfig(workspacePath: string): Promise<ServerConfig> {
    // Force a fresh configuration read
    const vscodeConfig =
      vscode.workspace.getConfiguration('advancedLiveServer');

    // Debug: Log all configuration values
    const debugConfig = {
      port: vscodeConfig.get('port'),
      https: vscodeConfig.get('https'),
      spa: vscodeConfig.get('spa'),
      openBrowser: vscodeConfig.get('openBrowser'),
      showOverlay: vscodeConfig.get('showOverlay'),
    };

    console.log('🔍 Debug - VSCode config values:', debugConfig);

    // Force read from global scope to ensure we get the latest values
    const globalConfig = vscode.workspace.getConfiguration(
      'advancedLiveServer',
      null
    );
    const workspaceConfig = vscode.workspace.getConfiguration(
      'advancedLiveServer',
      vscode.workspace.workspaceFolders?.[0]?.uri
    );

    // Debug: Compare global vs workspace config
    console.log('🔍 Debug - Global config:', {
      port: globalConfig.get('port'),
      https: globalConfig.get('https'),
      spa: globalConfig.get('spa'),
    });
    console.log('🔍 Debug - Workspace config:', {
      port: workspaceConfig.get('port'),
      https: workspaceConfig.get('https'),
      spa: workspaceConfig.get('spa'),
    });

    let config: ServerConfig = {
      port: vscodeConfig.get('port', 5500),
      https: vscodeConfig.get('https', false),
      spa: vscodeConfig.get('spa', false),
      openBrowser: vscodeConfig.get('openBrowser', true),
      showOverlay: vscodeConfig.get('showOverlay', true),
      watchPatterns: vscodeConfig.get('watchPatterns', [
        '**/*.html',
        '**/*.css',
        '**/*.js',
      ]),
      ignorePatterns: vscodeConfig.get('ignorePatterns', [
        '**/node_modules/**',
        '**/.git/**',
      ]),
      proxy: vscodeConfig.get('proxy', {}),
      enableCloudPreview: vscodeConfig.get('enableCloudPreview', false),
      ngrokAuthToken: vscodeConfig.get('ngrokAuthToken', ''),
      aiMode: vscodeConfig.get('aiMode', 'local'),
      aiProvider: vscodeConfig.get('aiProvider', 'openai'),
      aiModel: vscodeConfig.get('aiModel', 'gpt-4'),
      aiApiKey: vscodeConfig.get('aiApiKey', ''),
      aiBaseUrl: vscodeConfig.get('aiBaseUrl', ''),
      aiTemperature: vscodeConfig.get('aiTemperature', 0.7),
      aiMaxTokens: vscodeConfig.get('aiMaxTokens', 2048),
      aiEnableErrorExplanation: vscodeConfig.get(
        'aiEnableErrorExplanation',
        true
      ),
      aiEnableCodeSuggestions: vscodeConfig.get(
        'aiEnableCodeSuggestions',
        true
      ),
      aiEnableAccessibilityAnalysis: vscodeConfig.get(
        'aiEnableAccessibilityAnalysis',
        true
      ),
    };

    console.log('🔍 Debug - Final config:', {
      port: config.port,
      https: config.https,
      spa: config.spa,
      openBrowser: config.openBrowser,
      showOverlay: config.showOverlay,
    });

    // Try to load .liveserverrc.json
    const rcPath = path.join(workspacePath, '.liveserverrc.json');
    if (fs.existsSync(rcPath)) {
      try {
        const rcConfig = JSON.parse(fs.readFileSync(rcPath, 'utf8'));
        config = { ...config, ...rcConfig };
      } catch (error) {
        console.warn('Failed to parse .liveserverrc.json:', error);
      }
    }

    // Try to load live-server.config.js
    const jsConfigPath = path.join(workspacePath, 'live-server.config.js');
    if (fs.existsSync(jsConfigPath)) {
      try {
        // Note: In a real extension, you'd want to use a safer way to load JS config
        // For now, we'll just check if it exists and log it
        console.log(
          'Found live-server.config.js - manual configuration required'
        );
      } catch (error) {
        console.warn('Failed to load live-server.config.js:', error);
      }
    }

    // Detect project type
    config.projectType = this.detectProjectType(workspacePath);

    // Validate port
    if (config.port < 1 || config.port > 65535) {
      config.port = 5500;
    }

    return config;
  }

  static async saveConfig(
    workspacePath: string,
    config: Partial<ServerConfig>
  ): Promise<void> {
    const rcPath = path.join(workspacePath, '.liveserverrc.json');
    const existingConfig = await this.loadConfig(workspacePath);
    const newConfig = { ...existingConfig, ...config };

    fs.writeFileSync(rcPath, JSON.stringify(newConfig, null, 2));
  }

  static detectProjectType(workspacePath: string): string {
    const pkgPath = path.join(workspacePath, 'package.json');
    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        if (deps['react-scripts'] || deps['react-dom']) {
          return 'react';
        }
        if (deps['@vue/cli-service'] || deps['vue']) {
          return 'vue';
        }
        if (deps['svelte'] || deps['@sveltejs/kit']) {
          return 'svelte';
        }
        if (deps['vite']) {
          return 'vite';
        }
        if (deps['snowpack']) {
          return 'snowpack';
        }
        if (deps['webpack'] || deps['webpack-dev-server']) {
          return 'webpack';
        }
      } catch {
        // Ignore parsing errors
      }
    }
    // Fallback: check for config files
    if (fs.existsSync(path.join(workspacePath, 'vite.config.js'))) {
      return 'vite';
    }
    if (fs.existsSync(path.join(workspacePath, 'snowpack.config.js'))) {
      return 'snowpack';
    }
    if (fs.existsSync(path.join(workspacePath, 'webpack.config.js'))) {
      return 'webpack';
    }
    if (fs.existsSync(path.join(workspacePath, 'svelte.config.js'))) {
      return 'svelte';
    }
    if (fs.existsSync(path.join(workspacePath, 'vue.config.js'))) {
      return 'vue';
    }
    // Default
    return 'static';
  }

  static getDefaultConfig(): ServerConfig {
    return {
      port: 5500,
      https: false,
      spa: false,
      openBrowser: true,
      showOverlay: true,
      watchPatterns: ['**/*.html', '**/*.css', '**/*.js'],
      ignorePatterns: ['**/node_modules/**', '**/.git/**'],
      proxy: {},
      enableCloudPreview: false,
      ngrokAuthToken: '',
      aiMode: 'local',
      aiProvider: 'openai',
      aiModel: 'gpt-4',
      aiApiKey: '',
      aiBaseUrl: '',
      aiTemperature: 0.7,
      aiMaxTokens: 2048,
      aiEnableErrorExplanation: true,
      aiEnableCodeSuggestions: true,
      aiEnableAccessibilityAnalysis: true,
    };
  }
}

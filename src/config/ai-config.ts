import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface AIModelConfig {
  provider:
    | 'openai'
    | 'anthropic'
    | 'ollama'
    | 'local'
    | 'gemini'
    | 'cohere'
    | 'mistral'
    | 'perplexity'
    | 'together'
    | 'huggingface'
    | 'openrouter'
    | 'groq'
    | 'deepseek'
    | 'fireworks'
    | 'nomic'
    | 'custom';
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AIFeaturesConfig {
  enabled: boolean;
  mode: 'local' | 'cloud' | 'hybrid'; // New mode option
  errorExplanation: boolean;
  accessibilityAnalysis: boolean;
  codeImprovements: boolean;
  performanceAnalysis: boolean;
  seoOptimization: boolean;
  securityScan: boolean;
  modelConfig: AIModelConfig;
}

export class AIConfigManager {
  private config: AIFeaturesConfig;
  private configPath: string;

  constructor(private context: vscode.ExtensionContext) {
    this.configPath = path.join(
      context.globalStorageUri.fsPath,
      'ai-config.json'
    );
    this.config = this.loadConfig();
  }

  private loadConfig(): AIFeaturesConfig {
    try {
      if (fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load AI config:', error);
    }

    // Default configuration
    return {
      enabled: false,
      mode: 'local', // Default to local AI
      errorExplanation: true,
      accessibilityAnalysis: true,
      codeImprovements: true,
      performanceAnalysis: false,
      seoOptimization: false,
      securityScan: false,
      modelConfig: {
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 30000,
      },
    };
  }

  private saveConfig(): void {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      // Debug: Log config path and data
      console.log('[AIConfigManager] Writing config to:', this.configPath);
      console.log('[AIConfigManager] Config data:', JSON.stringify(this.config, null, 2));
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error('[AIConfigManager] Failed to save AI config:', error);
    }
  }

  getConfig(): AIFeaturesConfig {
    return { ...this.config };
  }

  getAIMode(): 'local' | 'cloud' | 'hybrid' {
    return this.config.mode;
  }

  updateConfig(updates: Partial<AIFeaturesConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  updateModelConfig(updates: Partial<AIModelConfig>): void {
    this.config.modelConfig = { ...this.config.modelConfig, ...updates };
    this.saveConfig();
  }

  isFeatureEnabled(
    feature: keyof Omit<AIFeaturesConfig, 'enabled' | 'modelConfig'>
  ): boolean {
    return this.config.enabled && Boolean(this.config[feature]);
  }

  async validateModelConfig(): Promise<{ valid: boolean; error?: string }> {
    const { modelConfig } = this.config;

    // Only validate if AI features are enabled
    if (!this.config.enabled) {
      return { valid: true };
    }

    // For local provider, no validation needed
    if (modelConfig.provider === 'local') {
      return { valid: true };
    }

    // For Ollama, only validate if baseUrl is provided and invalid
    if (modelConfig.provider === 'ollama') {
      if (modelConfig.baseUrl && !this.isValidUrl(modelConfig.baseUrl)) {
        return {
          valid: false,
          error: 'Invalid Ollama base URL',
        };
      }
      return { valid: true };
    }

    // For custom provider, require baseUrl
    if (modelConfig.provider === 'custom') {
      if (!modelConfig.baseUrl) {
        return {
          valid: false,
          error: 'Base URL is required for custom provider',
        };
      }
      if (!this.isValidUrl(modelConfig.baseUrl)) {
        return {
          valid: false,
          error: 'Invalid custom provider base URL',
        };
      }
      return { valid: true };
    }

    // For all other cloud providers, API key is optional (user can test without it)
    // Only validate URL if provided
    if (modelConfig.baseUrl && !this.isValidUrl(modelConfig.baseUrl)) {
      return {
        valid: false,
        error: 'Invalid base URL',
      };
    }

    return { valid: true };
  }

  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  getProviderConfig() {
    const { modelConfig } = this.config;

    switch (modelConfig.provider) {
      case 'openai':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.openai.com/v1',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'anthropic':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.anthropic.com',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'ollama':
        return {
          baseURL: modelConfig.baseUrl || 'http://localhost:11434',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          timeout: modelConfig.timeout,
        };

      case 'gemini':
        return {
          apiKey: modelConfig.apiKey,
          baseURL:
            modelConfig.baseUrl || 'https://generativelanguage.googleapis.com',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'cohere':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.cohere.ai',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'mistral':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.mistral.ai',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'perplexity':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.perplexity.ai',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'together':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.together.xyz',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'huggingface':
        return {
          apiKey: modelConfig.apiKey,
          baseURL:
            modelConfig.baseUrl || 'https://api-inference.huggingface.co',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'openrouter':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://openrouter.ai/api/v1',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'groq':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.groq.com/openai/v1',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'deepseek':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.deepseek.com',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'fireworks':
        return {
          apiKey: modelConfig.apiKey,
          baseURL:
            modelConfig.baseUrl || 'https://api.fireworks.ai/inference/v1',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'nomic':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl || 'https://api.nomic.ai/v1',
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'custom':
        return {
          apiKey: modelConfig.apiKey,
          baseURL: modelConfig.baseUrl,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          maxTokens: modelConfig.maxTokens,
          timeout: modelConfig.timeout,
        };

      case 'local':
        return {
          baseURL: modelConfig.baseUrl,
          model: modelConfig.model,
          temperature: modelConfig.temperature,
          timeout: modelConfig.timeout,
        };

      default:
        throw new Error(`Unsupported provider: ${modelConfig.provider}`);
    }
  }
}

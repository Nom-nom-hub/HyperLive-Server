import * as vscode from 'vscode';
import { AIConfigManager, AIModelConfig } from '../config/ai-config';

export interface AIProvider {
  name: string;
  analyzeCode(code: string, task: string): Promise<string>;
  explainError(error: string): Promise<string>;
  suggestImprovements(code: string, language: string): Promise<string[]>;
  generateAltText(imagePath: string, context?: string): Promise<string>;
  analyzeAccessibility(html: string): Promise<string>;
  analyzePerformance(html: string): Promise<string>;
  analyzeSEO(html: string): Promise<string>;
  securityScan(code: string): Promise<string>;
  formatCode(code: string, language: string): Promise<string>;
}

export class MultiAIService {
  private configManager: AIConfigManager;
  private outputChannel: vscode.OutputChannel;
  private currentProvider: AIProvider | null = null;

  constructor(context: vscode.ExtensionContext, outputChannel: vscode.OutputChannel) {
    this.configManager = new AIConfigManager(context);
    this.outputChannel = outputChannel;
  }

  async initialize(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      if (!config.enabled) {
        this.outputChannel.appendLine('⚠️ AI features are disabled');
        return;
      }

      const validation = await this.configManager.validateModelConfig();
      if (!validation.valid) {
        this.outputChannel.appendLine(`❌ AI configuration invalid: ${validation.error}`);
        return;
      }

      this.currentProvider = await this.createProvider();
      this.outputChannel.appendLine(`✅ AI service initialized with ${this.currentProvider?.name || 'local'} provider`);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to initialize AI service: ${error}`);
    }
  }

  private async createProvider(): Promise<AIProvider> {
    const config = this.configManager.getConfig();
    const providerConfig = this.configManager.getProviderConfig();

    switch (config.modelConfig.provider) {
      case 'openai':
        return new OpenAIProvider(providerConfig, this.outputChannel);
      case 'ollama':
        return new OllamaProvider(providerConfig, this.outputChannel);
      case 'openrouter':
        return new OpenRouterProvider(providerConfig, this.outputChannel);
      case 'anthropic':
        return new AnthropicProvider(providerConfig, this.outputChannel);
      case 'gemini':
        return new GeminiProvider(providerConfig, this.outputChannel);
      case 'local':
      default:
        return new LocalAIProvider({}, this.outputChannel);
    }
  }

  async analyzeCode(code: string, task: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Analyzing code with ${this.currentProvider.name}...`);
      return await this.currentProvider.analyzeCode(code, task);
    } catch (error) {
      this.outputChannel.appendLine(`❌ AI analysis failed: ${error}`);
      return 'AI analysis failed. Please try again or check your configuration.';
    }
  }

  async explainError(error: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Explaining error with ${this.currentProvider.name}...`);
      return await this.currentProvider.explainError(error);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Error explanation failed: ${error}`);
      return 'Error explanation failed. Please try again or check your configuration.';
    }
  }

  async suggestImprovements(code: string, language: string): Promise<string[]> {
    if (!this.currentProvider) {
      return ['AI service not initialized. Please check your configuration.'];
    }

    try {
      this.outputChannel.appendLine(`🤖 Suggesting improvements with ${this.currentProvider.name}...`);
      return await this.currentProvider.suggestImprovements(code, language);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Improvement suggestions failed: ${error}`);
      return ['Improvement suggestions failed. Please try again or check your configuration.'];
    }
  }

  async generateAltText(imagePath: string, context?: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Generating alt text with ${this.currentProvider.name}...`);
      return await this.currentProvider.generateAltText(imagePath, context);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Alt text generation failed: ${error}`);
      return 'Alt text generation failed. Please try again or check your configuration.';
    }
  }

  async analyzeAccessibility(html: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Analyzing accessibility with ${this.currentProvider.name}...`);
      return await this.currentProvider.analyzeAccessibility(html);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Accessibility analysis failed: ${error}`);
      return 'Accessibility analysis failed. Please try again or check your configuration.';
    }
  }

  async analyzePerformance(html: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Analyzing performance with ${this.currentProvider.name}...`);
      return await this.currentProvider.analyzePerformance(html);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Performance analysis failed: ${error}`);
      return 'Performance analysis failed. Please try again or check your configuration.';
    }
  }

  async analyzeSEO(html: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Analyzing SEO with ${this.currentProvider.name}...`);
      return await this.currentProvider.analyzeSEO(html);
    } catch (error) {
      this.outputChannel.appendLine(`❌ SEO analysis failed: ${error}`);
      return 'SEO analysis failed. Please try again or check your configuration.';
    }
  }

  async securityScan(code: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Scanning security with ${this.currentProvider.name}...`);
      return await this.currentProvider.securityScan(code);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Security scan failed: ${error}`);
      return 'Security scan failed. Please try again or check your configuration.';
    }
  }

  async formatCode(code: string, language: string): Promise<string> {
    if (!this.currentProvider) {
      return 'AI service not initialized. Please check your configuration.';
    }

    try {
      this.outputChannel.appendLine(`🤖 Formatting code with ${this.currentProvider.name}...`);
      return await this.currentProvider.formatCode(code, language);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Code formatting failed: ${error}`);
      return 'Code formatting failed. Please try again or check your configuration.';
    }
  }

  getCurrentProvider(): string {
    return this.currentProvider?.name || 'None';
  }

  isAvailable(): boolean {
    return this.currentProvider !== null;
  }
}

// Base provider class with common functionality
abstract class BaseAIProvider implements AIProvider {
  constructor(
    protected config: any,
    protected outputChannel: vscode.OutputChannel
  ) {}

  abstract name: string;

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    // This is a base implementation - each provider will override this
    throw new Error('makeRequest must be implemented by provider');
  }

  async analyzeCode(code: string, task: string): Promise<string> {
    const systemPrompt = `You are an expert code analyzer. Analyze the following code for ${task}. Provide clear, actionable feedback.`;
    const prompt = `Task: ${task}\n\nCode:\n\`\`\`\n${code}\n\`\`\`\n\nPlease analyze this code and provide specific recommendations.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async explainError(error: string): Promise<string> {
    const systemPrompt = `You are an expert debugging assistant. Explain errors clearly and provide actionable solutions.`;
    const prompt = `Error: ${error}\n\nPlease explain this error and provide specific steps to fix it.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async suggestImprovements(code: string, language: string): Promise<string[]> {
    const systemPrompt = `You are an expert code reviewer. Suggest specific improvements for ${language} code.`;
    const prompt = `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nPlease suggest specific improvements. Return as a numbered list.`;
    
    const response = await this.makeRequest(prompt, systemPrompt);
    return response.split('\n').filter(line => line.trim().match(/^\d+\./));
  }

  async generateAltText(imagePath: string, context?: string): Promise<string> {
    const systemPrompt = `You are an accessibility expert. Generate descriptive alt text for images.`;
    const prompt = `Image path: ${imagePath}${context ? `\nContext: ${context}` : ''}\n\nGenerate descriptive alt text for this image.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async analyzeAccessibility(html: string): Promise<string> {
    const systemPrompt = `You are an accessibility expert. Analyze HTML for accessibility issues and provide specific recommendations.`;
    const prompt = `HTML:\n\`\`\`html\n${html}\n\`\`\`\n\nPlease analyze this HTML for accessibility issues and provide specific recommendations.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async analyzePerformance(html: string): Promise<string> {
    const systemPrompt = `You are a web performance expert. Analyze HTML for performance issues and provide optimization recommendations.`;
    const prompt = `HTML:\n\`\`\`html\n${html}\n\`\`\`\n\nPlease analyze this HTML for performance issues and provide optimization recommendations.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async analyzeSEO(html: string): Promise<string> {
    const systemPrompt = `You are an SEO expert. Analyze HTML for SEO issues and provide optimization recommendations.`;
    const prompt = `HTML:\n\`\`\`html\n${html}\n\`\`\`\n\nPlease analyze this HTML for SEO issues and provide optimization recommendations.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async securityScan(code: string): Promise<string> {
    const systemPrompt = `You are a security expert. Analyze code for security vulnerabilities and provide specific recommendations.`;
    const prompt = `Code:\n\`\`\`\n${code}\n\`\`\`\n\nPlease analyze this code for security vulnerabilities and provide specific recommendations.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }

  async formatCode(code: string, language: string): Promise<string> {
    const systemPrompt = `You are a code formatter. Format the code according to best practices for ${language}.`;
    const prompt = `Language: ${language}\n\nCode:\n\`\`\`${language}\n${code}\n\`\`\`\n\nPlease format this code according to best practices.`;
    
    return await this.makeRequest(prompt, systemPrompt);
  }
}

// OpenAI Provider
class OpenAIProvider extends BaseAIProvider {
  name = 'OpenAI';

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response from OpenAI';
    } catch (error) {
      this.outputChannel.appendLine(`❌ OpenAI request failed: ${error}`);
      throw error;
    }
  }
}

// Ollama Provider
class OllamaProvider extends BaseAIProvider {
  name = 'Ollama';

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseURL}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: this.config.model,
          prompt: `${systemPrompt || ''}\n\n${prompt}`,
          temperature: this.config.temperature || 0.7,
          stream: false,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.response || 'No response from Ollama';
    } catch (error) {
      this.outputChannel.appendLine(`❌ Ollama request failed: ${error}`);
      throw error;
    }
  }
}

// OpenRouter Provider
class OpenRouterProvider extends BaseAIProvider {
  name = 'OpenRouter';

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'HTTP-Referer': 'https://github.com/Nom-nom-hub/HyperLive-Server',
          'X-Title': 'Advanced Live Server',
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            { role: 'system', content: systemPrompt || 'You are a helpful assistant.' },
            { role: 'user', content: prompt }
          ],
          temperature: this.config.temperature || 0.7,
          max_tokens: this.config.maxTokens || 1000,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response from OpenRouter';
    } catch (error) {
      this.outputChannel.appendLine(`❌ OpenRouter request failed: ${error}`);
      throw error;
    }
  }
}

// Anthropic Provider
class AnthropicProvider extends BaseAIProvider {
  name = 'Anthropic';

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseURL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.config.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.config.model,
          max_tokens: this.config.maxTokens || 1000,
          messages: [
            { role: 'user', content: `${systemPrompt || ''}\n\n${prompt}` }
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.content[0]?.text || 'No response from Anthropic';
    } catch (error) {
      this.outputChannel.appendLine(`❌ Anthropic request failed: ${error}`);
      throw error;
    }
  }
}

// Gemini Provider
class GeminiProvider extends BaseAIProvider {
  name = 'Gemini';

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await fetch(`${this.config.baseURL}/v1beta/models/${this.config.model}:generateContent?key=${this.config.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: `${systemPrompt || ''}\n\n${prompt}` }
              ]
            }
          ],
          generationConfig: {
            temperature: this.config.temperature || 0.7,
            maxOutputTokens: this.config.maxTokens || 1000,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || 'No response from Gemini';
    } catch (error) {
      this.outputChannel.appendLine(`❌ Gemini request failed: ${error}`);
      throw error;
    }
  }
}

// Local AI Provider (fallback)
class LocalAIProvider extends BaseAIProvider {
  name = 'Local';

  protected async makeRequest(prompt: string, systemPrompt?: string): Promise<string> {
    // This is a fallback implementation that provides basic analysis
    // In a real implementation, this could connect to a local model
    this.outputChannel.appendLine('⚠️ Using local AI analysis (limited capabilities)');
    
    // Simple keyword-based responses for common tasks
    if (prompt.toLowerCase().includes('error')) {
      return this.analyzeErrorLocally(prompt);
    } else if (prompt.toLowerCase().includes('improve')) {
      return this.suggestImprovementsLocally(prompt);
    } else {
      return 'Local AI analysis is limited. Please configure a cloud AI provider for better results.';
    }
  }

  private analyzeErrorLocally(prompt: string): string {
    return `Local Error Analysis:
    
This is a basic local analysis. For more detailed error explanations, please configure a cloud AI provider like OpenAI, Ollama, or OpenRouter.

Common debugging steps:
1. Check the browser console for more details
2. Look at the line number mentioned in the error
3. Verify all variables are properly declared
4. Check for typos in function or variable names`;
  }

  private suggestImprovementsLocally(prompt: string): string {
    return `Local Code Improvement Suggestions:
    
This is a basic local analysis. For more detailed code improvements, please configure a cloud AI provider like OpenAI, Ollama, or OpenRouter.

General best practices:
1. Use const and let instead of var
2. Use strict equality (===) for comparisons
3. Add proper error handling
4. Use meaningful variable and function names
5. Follow consistent code formatting`;
  }
} 
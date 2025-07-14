import * as vscode from 'vscode';
import { AIConfigManager } from '../config/ai-config';
import { LocalAIService } from './local-ai-service';

export interface AIAnalysisResult {
  type:
    | 'error'
    | 'accessibility'
    | 'improvement'
    | 'performance'
    | 'seo'
    | 'security';
  title: string;
  description: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
  code?: string;
  line?: number;
}

export class AIService {
  private configManager: AIConfigManager;
  private localAIService: LocalAIService;
  private outputChannel: vscode.OutputChannel;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new AIConfigManager(context);
    this.outputChannel = vscode.window.createOutputChannel('HyperServer AI');
    this.localAIService = new LocalAIService(context, this.outputChannel);
  }

  async analyzeError(
    error: Error,
    context?: string
  ): Promise<AIAnalysisResult | null> {
    const mode = this.configManager.getAIMode();

    if (mode === 'local' || mode === 'hybrid') {
      try {
        const localResult = await this.localAIService.analyzeCode(
          context || error.message,
          'error-analysis'
        );

        return {
          type: 'error',
          title: 'Error Analysis (Code Analyzers)',
          description: localResult,
          suggestions: this.extractSuggestions(localResult),
          severity: 'high',
          code: context,
        };
      } catch (error) {
        this.outputChannel.appendLine(`Local error analysis failed: ${error}`);
      }
    }

    if (mode === 'cloud' || mode === 'hybrid') {
      try {
        const cloudResult = await this.analyzeErrorWithCloud(error, context);
        if (cloudResult) {
          return cloudResult;
        }
      } catch (error) {
        this.outputChannel.appendLine(`Cloud error analysis failed: ${error}`);
      }
    }

    return null;
  }

  async suggestCodeImprovements(code: string): Promise<AIAnalysisResult[]> {
    const mode = this.configManager.getAIMode();
    const results: AIAnalysisResult[] = [];

    if (mode === 'local' || mode === 'hybrid') {
      try {
        const localResult = await this.localAIService.analyzeCode(
          code,
          'code-improvements'
        );

        results.push({
          type: 'improvement',
          title: 'Code Improvements (Code Analyzers)',
          description: localResult,
          suggestions: this.extractSuggestions(localResult),
          severity: 'medium',
          code: code,
        });
      } catch (error) {
        this.outputChannel.appendLine(`Local code analysis failed: ${error}`);
      }
    }

    if (mode === 'cloud' || mode === 'hybrid') {
      try {
        const cloudResults = await this.suggestCodeImprovementsWithCloud(code);
        results.push(...cloudResults);
      } catch (error) {
        this.outputChannel.appendLine(`Cloud code analysis failed: ${error}`);
      }
    }

    return results;
  }

  async analyzeAccessibility(html: string): Promise<AIAnalysisResult[]> {
    const mode = this.configManager.getAIMode();
    const results: AIAnalysisResult[] = [];

    if (mode === 'local' || mode === 'hybrid') {
      try {
        const localResult =
          await this.localAIService.analyzeAccessibility(html);

        results.push({
          type: 'accessibility',
          title: 'Accessibility Analysis (Code Analyzers)',
          description: localResult,
          suggestions: this.extractSuggestions(localResult),
          severity: 'medium',
          code: html,
        });
      } catch (error) {
        this.outputChannel.appendLine(
          `Local accessibility analysis failed: ${error}`
        );
      }
    }

    if (mode === 'cloud' || mode === 'hybrid') {
      try {
        const cloudResults = await this.analyzeAccessibilityWithCloud(html);
        results.push(...cloudResults);
      } catch (error) {
        this.outputChannel.appendLine(
          `Cloud accessibility analysis failed: ${error}`
        );
      }
    }

    return results;
  }

  async analyzePerformance(html: string): Promise<AIAnalysisResult[]> {
    const mode = this.configManager.getAIMode();
    const results: AIAnalysisResult[] = [];

    if (mode === 'local' || mode === 'hybrid') {
      try {
        const localResult = await this.localAIService.analyzePerformance(html);

        results.push({
          type: 'performance',
          title: 'Performance Analysis (Code Analyzers)',
          description: localResult,
          suggestions: this.extractSuggestions(localResult),
          severity: 'medium',
          code: html,
        });
      } catch (error) {
        this.outputChannel.appendLine(
          `Local performance analysis failed: ${error}`
        );
      }
    }

    if (mode === 'cloud' || mode === 'hybrid') {
      try {
        const cloudResults = await this.analyzePerformanceWithCloud(html);
        results.push(...cloudResults);
      } catch (error) {
        this.outputChannel.appendLine(
          `Cloud performance analysis failed: ${error}`
        );
      }
    }

    return results;
  }

  async analyzeSEO(html: string): Promise<AIAnalysisResult[]> {
    const mode = this.configManager.getAIMode();
    const results: AIAnalysisResult[] = [];

    if (mode === 'local' || mode === 'hybrid') {
      try {
        const localResult = await this.localAIService.analyzeSEO(html);

        results.push({
          type: 'seo',
          title: 'SEO Analysis (Code Analyzers)',
          description: localResult,
          suggestions: this.extractSuggestions(localResult),
          severity: 'low',
          code: html,
        });
      } catch (error) {
        this.outputChannel.appendLine(`Local SEO analysis failed: ${error}`);
      }
    }

    if (mode === 'cloud' || mode === 'hybrid') {
      try {
        const cloudResults = await this.analyzeSEOWithCloud(html);
        results.push(...cloudResults);
      } catch (error) {
        this.outputChannel.appendLine(`Cloud SEO analysis failed: ${error}`);
      }
    }

    return results;
  }

  async securityScan(code: string): Promise<AIAnalysisResult[]> {
    const mode = this.configManager.getAIMode();
    const results: AIAnalysisResult[] = [];

    if (mode === 'local' || mode === 'hybrid') {
      try {
        const localResult = await this.localAIService.securityScan(code);

        results.push({
          type: 'security',
          title: 'Security Scan (Code Analyzers)',
          description: localResult,
          suggestions: this.extractSuggestions(localResult),
          severity: 'high',
          code: code,
        });
      } catch (error) {
        this.outputChannel.appendLine(`Local security scan failed: ${error}`);
      }
    }

    if (mode === 'cloud' || mode === 'hybrid') {
      try {
        const cloudResults = await this.securityScanWithCloud(code);
        results.push(...cloudResults);
      } catch (error) {
        this.outputChannel.appendLine(`Cloud security scan failed: ${error}`);
      }
    }

    return results;
  }

  // Cloud AI methods (existing implementation)
  private async analyzeErrorWithCloud(
    error: Error,
    context?: string
  ): Promise<AIAnalysisResult | null> {
    if (!this.configManager.isFeatureEnabled('errorExplanation')) {
      return null;
    }

    try {
      const response = await this.callAI();

      return {
        type: 'error',
        title: 'Error Analysis (Cloud AI)',
        description: response,
        suggestions: this.extractSuggestions(response),
        severity: 'high',
        code: context,
      };
    } catch (error) {
      console.error('Cloud AI error analysis failed:', error);
      return null;
    }
  }

  private async suggestCodeImprovementsWithCloud(
    code: string
  ): Promise<AIAnalysisResult[]> {
    if (!this.configManager.isFeatureEnabled('codeImprovements')) {
      return [];
    }

    try {
      const response = await this.callAI();

      return [
        {
          type: 'improvement',
          title: 'Code Improvement Suggestions (Cloud AI)',
          description: response,
          suggestions: this.extractSuggestions(response),
          severity: 'medium',
          code: code,
        },
      ];
    } catch (error) {
      console.error('Cloud AI code improvement analysis failed:', error);
      return [];
    }
  }

  private async analyzeAccessibilityWithCloud(
    html: string
  ): Promise<AIAnalysisResult[]> {
    if (!this.configManager.isFeatureEnabled('accessibilityAnalysis')) {
      return [];
    }

    try {
      const response = await this.callAI();

      return [
        {
          type: 'accessibility',
          title: 'Accessibility Analysis (Cloud AI)',
          description: response,
          suggestions: this.extractSuggestions(response),
          severity: 'medium',
          code: html,
        },
      ];
    } catch (error) {
      console.error('Cloud AI accessibility analysis failed:', error);
      return [];
    }
  }

  private async analyzePerformanceWithCloud(
    html: string
  ): Promise<AIAnalysisResult[]> {
    if (!this.configManager.isFeatureEnabled('performanceAnalysis')) {
      return [];
    }

    try {
      const response = await this.callAI();

      return [
        {
          type: 'performance',
          title: 'Performance Analysis (Cloud AI)',
          description: response,
          suggestions: this.extractSuggestions(response),
          severity: 'medium',
          code: html,
        },
      ];
    } catch (error) {
      console.error('Cloud AI performance analysis failed:', error);
      return [];
    }
  }

  private async analyzeSEOWithCloud(html: string): Promise<AIAnalysisResult[]> {
    if (!this.configManager.isFeatureEnabled('seoOptimization')) {
      return [];
    }

    try {
      const response = await this.callAI();

      return [
        {
          type: 'seo',
          title: 'SEO Analysis (Cloud AI)',
          description: response,
          suggestions: this.extractSuggestions(response),
          severity: 'low',
          code: html,
        },
      ];
    } catch (error) {
      console.error('Cloud AI SEO analysis failed:', error);
      return [];
    }
  }

  private async securityScanWithCloud(
    code: string
  ): Promise<AIAnalysisResult[]> {
    if (!this.configManager.isFeatureEnabled('securityScan')) {
      return [];
    }

    try {
      const response = await this.callAI();

      return [
        {
          type: 'security',
          title: 'Security Analysis (Cloud AI)',
          description: response,
          suggestions: this.extractSuggestions(response),
          severity: 'high',
          code: code,
        },
      ];
    } catch (error) {
      console.error('Cloud AI security scan failed:', error);
      return [];
    }
  }

  private async callAI(): Promise<string> {
    const validation = await this.configManager.validateModelConfig();

    if (!validation.valid) {
      throw new Error(validation.error || 'Invalid AI configuration');
    }

    // This is a simplified implementation
    // In a real implementation, you would integrate with actual AI providers
    // For now, we'll return a mock response

    return `AI Analysis Result:

Based on the provided code, here are the key findings:

1. **Issue 1**: Description of the first issue found
   - Suggestion: How to fix this issue
   - Impact: What this affects

2. **Issue 2**: Description of the second issue found
   - Suggestion: How to fix this issue
   - Impact: What this affects

3. **Recommendations**:
   - General improvement suggestion
   - Best practice recommendation
   - Performance optimization tip

This analysis was generated using AI to help improve your code quality and user experience.`;
  }

  private extractSuggestions(response: string): string[] {
    // Extract suggestions from AI response
    const lines = response.split('\n');
    const suggestions: string[] = [];

    // Check if the response indicates no issues found
    if (
      response.includes('✅ No') ||
      response.includes('✅ Good') ||
      response.includes('✅ Code looks good')
    ) {
      return ['No issues found - your code follows best practices!'];
    }

    for (const line of lines) {
      // Look for bullet points (•) which is what our local analysis uses
      if (line.includes('• ')) {
        const suggestion = line.replace(/^.*?•\s*/, '').trim();
        if (
          suggestion &&
          !suggestion.includes('Total') &&
          !suggestion.includes('found:')
        ) {
          suggestions.push(suggestion);
        }
      }
      // Also look for dash points (-) for cloud AI responses
      else if (
        line.includes('- ') &&
        !line.includes('Total issues found') &&
        !line.includes('Total improvements found')
      ) {
        const suggestion = line.replace(/^.*?-\s*/, '').trim();
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
      // Look for "Suggestion:" format from cloud AI
      else if (line.includes('Suggestion:')) {
        const suggestion = line.replace(/^.*?Suggestion:\s*/, '').trim();
        if (suggestion) {
          suggestions.push(suggestion);
        }
      }
    }

    return suggestions.length > 0
      ? suggestions
      : ['Review the code for potential improvements'];
  }

  // Tool management methods
  async downloadTool(toolId: string): Promise<boolean> {
    return await this.localAIService.ensureToolAvailable(toolId);
  }

  async getInstalledTools(): Promise<
    Array<{ name: string; version: string; description: string }>
  > {
    const tools = await this.localAIService.getAvailableTools();
    const installedTools: Array<{
      name: string;
      version: string;
      description: string;
    }> = [];

    for (const tool of tools) {
      const status = await this.localAIService.getToolStatus(tool.name);
      if (status.available) {
        installedTools.push({
          name: tool.name,
          version: '1.0.0', // Default version
          description: tool.description,
        });
      }
    }

    return installedTools;
  }

  async updateTools(): Promise<void> {
    // For now, just ensure all tools are available
    const tools = await this.localAIService.getAvailableTools();
    for (const tool of tools) {
      await this.localAIService.ensureToolAvailable(tool.name);
    }
  }
}

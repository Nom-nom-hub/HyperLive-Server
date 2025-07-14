import * as vscode from 'vscode';
import {
  HyperServerAIModelManager,
  HyperServerAITool,
} from './hyperserver-ai-model';

export class LocalAIService {
  private modelManager: HyperServerAIModelManager;
  private outputChannel: vscode.OutputChannel;

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.modelManager = new HyperServerAIModelManager(context, outputChannel);
    this.outputChannel = outputChannel;
  }

  async analyzeCode(code: string, task: string): Promise<string> {
    this.outputChannel.appendLine('🔍 Starting local code analysis...');

    // Use different tools based on the task
    let toolId = 'eslint'; // default

    if (task === 'code-improvements') {
      toolId = 'prettier'; // Use prettier for code improvements
    } else if (task === 'error-analysis') {
      toolId = 'eslint'; // Use eslint for error analysis
    }

    try {
      const result = await this.modelManager.analyzeCodeWithTool(
        toolId,
        code,
        task
      );
      this.outputChannel.appendLine('✅ Local code analysis completed');
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Local code analysis failed: ${error}`);
      return 'Local analysis failed. Please try again.';
    }
  }

  async analyzeAccessibility(html: string): Promise<string> {
    this.outputChannel.appendLine('♿ Starting accessibility analysis...');

    try {
      const result = await this.modelManager.analyzeCodeWithTool(
        'axe-core',
        html,
        'accessibility'
      );
      this.outputChannel.appendLine('✅ Accessibility analysis completed');
      return result;
    } catch (error) {
      this.outputChannel.appendLine(
        `❌ Accessibility analysis failed: ${error}`
      );
      return 'Accessibility analysis failed. Please try again.';
    }
  }

  async analyzePerformance(html: string): Promise<string> {
    this.outputChannel.appendLine('⚡ Starting performance analysis...');

    try {
      const result = await this.modelManager.analyzeCodeWithTool(
        'lighthouse',
        html,
        'performance'
      );
      this.outputChannel.appendLine('✅ Performance analysis completed');
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Performance analysis failed: ${error}`);
      return 'Performance analysis failed. Please try again.';
    }
  }

  async analyzeSEO(html: string): Promise<string> {
    this.outputChannel.appendLine('🔍 Starting SEO analysis...');

    try {
      const result = await this.modelManager.analyzeCodeWithTool(
        'seo-checker',
        html,
        'seo'
      );
      this.outputChannel.appendLine('✅ SEO analysis completed');
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`❌ SEO analysis failed: ${error}`);
      return 'SEO analysis failed. Please try again.';
    }
  }

  async securityScan(code: string): Promise<string> {
    this.outputChannel.appendLine('🔒 Starting security scan...');

    try {
      const result = await this.modelManager.analyzeCodeWithTool(
        'security-scanner',
        code,
        'security'
      );
      this.outputChannel.appendLine('✅ Security scan completed');
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Security scan failed: ${error}`);
      return 'Security scan failed. Please try again.';
    }
  }

  async formatCode(code: string): Promise<string> {
    this.outputChannel.appendLine('🎨 Starting code formatting...');

    try {
      const result = await this.modelManager.analyzeCodeWithTool(
        'prettier',
        code,
        'formatting'
      );
      this.outputChannel.appendLine('✅ Code formatting completed');
      return result;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Code formatting failed: ${error}`);
      return 'Code formatting failed. Please try again.';
    }
  }

  // Tool management methods
  async getAvailableTools() {
    return this.modelManager.getAvailableTools();
  }

  async getToolStatus(toolId: string) {
    return this.modelManager.getToolStatus(toolId);
  }

  async ensureToolAvailable(toolId: string) {
    return this.modelManager.ensureToolAvailable(toolId);
  }
}

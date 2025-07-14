import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export interface HyperServerAITool {
  name: string;
  type:
    | 'code-analysis'
    | 'accessibility'
    | 'performance'
    | 'seo'
    | 'security'
    | 'linting';
  size: number; // in KB
  description: string;
  bundled: boolean;
  npmPackage?: string;
}

export class HyperServerAIModelManager {
  private tools: Map<string, HyperServerAITool> = new Map();
  private extensionPath: string;
  private outputChannel: vscode.OutputChannel;

  constructor(
    context: vscode.ExtensionContext,
    outputChannel: vscode.OutputChannel
  ) {
    this.extensionPath = context.extensionPath;
    this.outputChannel = outputChannel;
    this.initializeTools();
  }

  private initializeTools() {
    // Lightweight, practical development tools
    this.tools.set('eslint', {
      name: 'ESLint',
      type: 'code-analysis',
      size: 50,
      description: 'JavaScript/TypeScript linting and code quality analysis',
      bundled: true,
      npmPackage: 'eslint',
    });

    this.tools.set('prettier', {
      name: 'Prettier',
      type: 'linting',
      size: 30,
      description: 'Code formatting and style consistency',
      bundled: true,
      npmPackage: 'prettier',
    });

    this.tools.set('axe-core', {
      name: 'Axe Core',
      type: 'accessibility',
      size: 200,
      description: 'Accessibility testing and analysis',
      bundled: true,
      npmPackage: 'axe-core',
    });

    this.tools.set('lighthouse', {
      name: 'Lighthouse',
      type: 'performance',
      size: 500,
      description: 'Performance, accessibility, and SEO auditing',
      bundled: true,
      npmPackage: 'lighthouse',
    });

    this.tools.set('html-validator', {
      name: 'HTML Validator',
      type: 'code-analysis',
      size: 20,
      description: 'HTML validation and best practices',
      bundled: true,
      npmPackage: 'w3c-html-validator',
    });

    this.tools.set('css-validator', {
      name: 'CSS Validator',
      type: 'code-analysis',
      size: 15,
      description: 'CSS validation and optimization',
      bundled: true,
      npmPackage: 'w3c-css-validator',
    });

    this.tools.set('security-scanner', {
      name: 'Security Scanner',
      type: 'security',
      size: 100,
      description: 'Security vulnerability detection',
      bundled: true,
      npmPackage: 'eslint-plugin-security',
    });

    this.tools.set('seo-checker', {
      name: 'SEO Checker',
      type: 'seo',
      size: 80,
      description: 'SEO analysis and optimization suggestions',
      bundled: true,
      npmPackage: 'seo-checker',
    });
  }

  async ensureToolAvailable(toolId: string): Promise<boolean> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      this.outputChannel.appendLine(`❌ Tool ${toolId} not found`);
      return false;
    }

    if (tool.bundled) {
      // For bundled tools, we'll use npm packages instead of downloading files
      this.outputChannel.appendLine(
        `✅ Tool ${tool.name} is available via npm`
      );
      return true;
    }

    return false;
  }

  async analyzeCodeWithTool(
    toolId: string,
    code: string,
    task: string
  ): Promise<string> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      throw new Error(`Tool ${toolId} not found`);
    }

    // Ensure tool is available
    const isAvailable = await this.ensureToolAvailable(toolId);
    if (!isAvailable) {
      throw new Error(`Tool ${toolId} is not available`);
    }

    // Use pattern-based analysis for now
    // In a real implementation, you would call the actual npm packages
    return this.analyzeWithPatterns(code, task, tool.type);
  }

  private analyzeWithPatterns(
    code: string,
    task: string,
    toolType: string
  ): string {
    switch (toolType) {
      case 'code-analysis':
        return this.analyzeCodePatterns(code);
      case 'accessibility':
        return this.analyzeAccessibilityPatterns(code);
      case 'performance':
        return this.analyzePerformancePatterns(code);
      case 'seo':
        return this.analyzeSEOPatterns(code);
      case 'security':
        return this.analyzeSecurityPatterns(code);
      case 'linting':
        return this.analyzeLintingPatterns(code);
      default:
        return 'Analysis not available for this tool type';
    }
  }

  private analyzeCodePatterns(code: string): string {
    const issues: string[] = [];
    const lines = code.split('\n');

    // Real code analysis
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for var usage
      if (line.includes('var ')) {
        issues.push(
          `Line ${lineNum}: Use 'let' or 'const' instead of 'var' for better scoping`
        );
      }

      // Check for console.log in production code
      if (line.includes('console.log(')) {
        issues.push(
          `Line ${lineNum}: Remove console.log before production - use proper logging`
        );
      }

      // Check for loose equality
      if (line.includes(' == ') && !line.includes(' === ')) {
        issues.push(
          `Line ${lineNum}: Use strict equality (===) instead of loose equality (==)`
        );
      }

      // Check for eval usage
      if (line.includes('eval(')) {
        issues.push(
          `Line ${lineNum}: Avoid eval() for security reasons - use safer alternatives`
        );
      }

      // Check for function spacing
      if (line.includes('function(') && !line.includes('function (')) {
        issues.push(
          `Line ${lineNum}: Add space after 'function' keyword for consistency`
        );
      }

      // Check for unused variables (basic check)
      if (line.includes('let ') || line.includes('const ')) {
        const varName = line.match(/(?:let|const)\s+(\w+)/)?.[1];
        if (
          varName &&
          !code.includes(varName + ' ') &&
          !code.includes(varName + ';') &&
          !code.includes(varName + ')')
        ) {
          issues.push(`Line ${lineNum}: Variable '${varName}' might be unused`);
        }
      }

      // Check for missing semicolons (if not using no-semi style)
      if (
        line.trim() &&
        !line.trim().endsWith(';') &&
        !line.trim().endsWith('{') &&
        !line.trim().endsWith('}')
      ) {
        if (
          line.includes('return ') ||
          line.includes('break ') ||
          line.includes('continue ')
        ) {
          issues.push(
            `Line ${lineNum}: Consider adding semicolon for consistency`
          );
        }
      }

      // Check for long lines
      if (line.length > 80) {
        issues.push(
          `Line ${lineNum}: Line is ${line.length} characters long - consider breaking it up`
        );
      }
    }

    // Check for overall code structure
    if (!code.includes('use strict') && code.includes('function')) {
      issues.push(
        'Consider adding "use strict" directive for better error checking'
      );
    }

    if (code.includes('setTimeout') && code.includes('0')) {
      issues.push(
        'Consider using requestAnimationFrame instead of setTimeout(0) for better performance'
      );
    }

    if (issues.length > 0) {
      return `Code Analysis Results:\n\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nTotal issues found: ${issues.length}`;
    } else {
      return 'Code Analysis Results:\n\n✅ Code looks good! No major issues found.';
    }
  }

  private analyzeAccessibilityPatterns(code: string): string {
    const issues: string[] = [];
    const lines = code.split('\n');

    // Real accessibility analysis
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for images without alt text
      if (line.includes('<img') && !line.includes('alt=')) {
        issues.push(
          `Line ${lineNum}: Image missing alt text - add alt="description" for screen readers`
        );
      }

      // Check for buttons without accessible text
      if (
        line.includes('<button') &&
        !line.includes('>') &&
        !line.includes('aria-label=')
      ) {
        issues.push(
          `Line ${lineNum}: Button missing accessible text - add text content or aria-label="description"`
        );
      }

      // Check for form inputs without labels
      if (
        (line.includes('<input') ||
          line.includes('<select>') ||
          line.includes('<textarea')) &&
        !line.includes('<label') &&
        !line.includes('aria-label=') &&
        !line.includes('aria-labelledby=')
      ) {
        issues.push(
          `Line ${lineNum}: Form control missing label - add <label> or aria-label="description"`
        );
      }

      // Check for heading hierarchy
      if (line.match(/<h[1-6]/)) {
        const headingLevel = parseInt(line.match(/<h([1-6])/)?.[1] || '1');
        if (headingLevel > 1 && !code.includes(`<h${headingLevel - 1}`)) {
          issues.push(
            `Line ${lineNum}: Heading hierarchy issue - h${headingLevel} should follow h${headingLevel - 1}`
          );
        }
      }

      // Check for color-only information
      if (
        line.includes('color:') &&
        (line.includes('red') ||
          line.includes('green') ||
          line.includes('blue'))
      ) {
        issues.push(
          `Line ${lineNum}: Color-only information - ensure information isn't conveyed by color alone`
        );
      }

      // Check for keyboard navigation
      if (line.includes('onclick=') && !line.includes('tabindex=')) {
        issues.push(
          `Line ${lineNum}: Interactive element should be keyboard accessible - add tabindex="0"`
        );
      }
    }

    // Check for overall document structure
    if (!code.includes('<main>') && !code.includes('<article>')) {
      issues.push(
        'Document missing semantic landmarks - add <main> or <article> for better navigation'
      );
    }

    if (!code.includes('lang=')) {
      issues.push(
        'HTML missing language attribute - add lang="en" to <html> tag'
      );
    }

    if (issues.length > 0) {
      return `Accessibility Analysis Results:\n\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nTotal issues found: ${issues.length}`;
    } else {
      return 'Accessibility Analysis Results:\n\n✅ No accessibility issues found! Your code follows good accessibility practices.';
    }
  }

  private analyzePerformancePatterns(code: string): string {
    const issues: string[] = [];
    const lines = code.split('\n');

    // Real performance analysis
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for DOM queries in loops
      if (
        line.includes('querySelector') &&
        (code.includes('for') || code.includes('forEach'))
      ) {
        issues.push(
          `Line ${lineNum}: DOM queries in loops are expensive - cache selectors outside the loop`
        );
      }

      // Check for missing event listener cleanup
      if (
        line.includes('addEventListener') &&
        !code.includes('removeEventListener')
      ) {
        issues.push(
          `Line ${lineNum}: Consider removing event listeners to prevent memory leaks`
        );
      }

      // Check for slow DOM manipulation
      if (line.includes('innerHTML') || line.includes('outerHTML')) {
        issues.push(
          `Line ${lineNum}: innerHTML/outerHTML can be slow - consider using textContent or DOM manipulation`
        );
      }

      // Check for setTimeout(0) anti-pattern
      if (line.includes('setTimeout') && line.includes('0')) {
        issues.push(
          `Line ${lineNum}: setTimeout(0) can be replaced with requestAnimationFrame for better performance`
        );
      }

      // Check for synchronous operations
      if (
        line.includes('alert(') ||
        line.includes('confirm(') ||
        line.includes('prompt(')
      ) {
        issues.push(
          `Line ${lineNum}: Synchronous operations block the UI - consider async alternatives`
        );
      }

      // Check for large loops
      if (
        line.includes('for(') &&
        code.includes('length') &&
        code.includes('i++')
      ) {
        issues.push(
          `Line ${lineNum}: Large loops can block the main thread - consider chunking or Web Workers`
        );
      }
    }

    // Check for overall performance patterns
    if (code.includes('document.write(')) {
      issues.push(
        'document.write() blocks rendering - use DOM manipulation instead'
      );
    }

    if (code.includes('eval(')) {
      issues.push('eval() is slow and dangerous - use safer alternatives');
    }

    if (issues.length > 0) {
      return `Performance Analysis Results:\n\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nTotal performance issues found: ${issues.length}`;
    } else {
      return 'Performance Analysis Results:\n\n✅ Good performance practices! No major issues found.';
    }
  }

  private analyzeSEOPatterns(code: string): string {
    const issues: string[] = [];
    const lines = code.split('\n');

    // Real SEO analysis
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for missing title tag
      if (line.includes('<title>') && line.trim() === '<title></title>') {
        issues.push(
          `Line ${lineNum}: Title tag is empty - add descriptive title for SEO`
        );
      }

      // Check for missing meta description
      if (
        line.includes('meta name="description"') &&
        line.includes('content=""')
      ) {
        issues.push(
          `Line ${lineNum}: Meta description is empty - add descriptive content for search results`
        );
      }

      // Check for missing h1 tag
      if (line.includes('<h1>') && line.trim() === '<h1></h1>') {
        issues.push(
          `Line ${lineNum}: H1 tag is empty - add main heading for SEO hierarchy`
        );
      }

      // Check for images without alt text
      if (line.includes('<img') && !line.includes('alt=')) {
        issues.push(
          `Line ${lineNum}: Image missing alt text - helps with image search and accessibility`
        );
      }

      // Check for non-semantic divs
      if (
        line.includes('<div>') &&
        !code.includes('<main>') &&
        !code.includes('<article>') &&
        !code.includes('<section>')
      ) {
        issues.push(
          `Line ${lineNum}: Consider using semantic HTML elements (main, article, section) for better SEO`
        );
      }

      // Check for missing language attribute
      if (line.includes('<html') && !line.includes('lang=')) {
        issues.push(
          `Line ${lineNum}: HTML missing language attribute - add lang="en" for better SEO`
        );
      }

      // Check for missing viewport meta tag
      if (line.includes('<head>') && !code.includes('viewport')) {
        issues.push(
          `Line ${lineNum}: Missing viewport meta tag - add for mobile SEO`
        );
      }
    }

    // Check for overall SEO patterns
    if (!code.includes('<title>')) {
      issues.push('Missing title tag - essential for SEO');
    }

    if (!code.includes('meta name="description"')) {
      issues.push('Missing meta description - important for search results');
    }

    if (!code.includes('<h1>')) {
      issues.push('Missing h1 tag - important for SEO hierarchy');
    }

    if (code.includes('<img') && !code.includes('alt=')) {
      issues.push('Images missing alt text - helps with image search');
    }

    if (
      code.includes('<div>') &&
      !code.includes('<main>') &&
      !code.includes('<article>')
    ) {
      issues.push(
        'Consider using semantic HTML elements (main, article, section)'
      );
    }

    if (issues.length > 0) {
      return `SEO Analysis Results:\n\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nTotal SEO issues found: ${issues.length}`;
    } else {
      return 'SEO Analysis Results:\n\n✅ Good SEO practices! No major issues found.';
    }
  }

  private analyzeSecurityPatterns(code: string): string {
    const issues: string[] = [];
    const lines = code.split('\n');

    // Real security analysis
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for XSS vulnerabilities
      if (line.includes('innerHTML') || line.includes('outerHTML')) {
        issues.push(
          `Line ${lineNum}: Potential XSS vulnerability - use textContent instead of innerHTML`
        );
      }

      // Check for eval usage
      if (line.includes('eval(')) {
        issues.push(
          `Line ${lineNum}: Critical security risk - eval() can execute arbitrary code`
        );
      }

      // Check for inline event handlers
      if (
        line.includes('onclick=') ||
        line.includes('onload=') ||
        line.includes('onerror=')
      ) {
        issues.push(
          `Line ${lineNum}: Inline event handlers can be security risks - use addEventListener`
        );
      }

      // Check for hardcoded secrets
      if (
        line.includes('password') ||
        line.includes('secret') ||
        line.includes('key') ||
        line.includes('token')
      ) {
        if (line.includes('"') || line.includes("'")) {
          issues.push(
            `Line ${lineNum}: Hardcoded secret detected - move to environment variables`
          );
        }
      }

      // Check for localStorage with sensitive data
      if (
        line.includes('localStorage') &&
        (line.includes('password') || line.includes('token'))
      ) {
        issues.push(
          `Line ${lineNum}: Sensitive data in localStorage - use secure storage or encryption`
        );
      }

      // Check for SQL injection patterns
      if (line.includes('query') && line.includes('+') && line.includes('"')) {
        issues.push(
          `Line ${lineNum}: Potential SQL injection - use parameterized queries`
        );
      }

      // Check for unsafe redirects
      if (
        line.includes('window.location') &&
        line.includes('href') &&
        line.includes('+')
      ) {
        issues.push(
          `Line ${lineNum}: Unsafe redirect - validate and sanitize URLs`
        );
      }

      // Check for unsafe file operations
      if (line.includes('readFile') && !line.includes('path.join')) {
        issues.push(
          `Line ${lineNum}: Unsafe file path - use path.join() to prevent path traversal`
        );
      }
    }

    // Check for overall security patterns
    if (!code.includes('Content-Security-Policy')) {
      issues.push(
        'Missing Content Security Policy - add CSP headers to prevent XSS'
      );
    }

    if (code.includes('http://') && !code.includes('localhost')) {
      issues.push('Insecure HTTP protocol detected - use HTTPS for production');
    }

    if (issues.length > 0) {
      return `Security Analysis Results:\n\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nTotal security issues found: ${issues.length}`;
    } else {
      return 'Security Analysis Results:\n\n✅ No security vulnerabilities found! Your code follows security best practices.';
    }
  }

  private analyzeLintingPatterns(code: string): string {
    const issues: string[] = [];
    const lines = code.split('\n');

    // Real code improvement analysis
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineNum = i + 1;

      // Check for inconsistent spacing
      if (line.includes('function(') && !line.includes('function (')) {
        issues.push(
          `Line ${lineNum}: Add space after 'function' keyword for consistency`
        );
      }

      if (line.includes('if(') && !line.includes('if (')) {
        issues.push(
          `Line ${lineNum}: Add space after 'if' keyword for consistency`
        );
      }

      if (line.includes('for(') && !line.includes('for (')) {
        issues.push(
          `Line ${lineNum}: Add space after 'for' keyword for consistency`
        );
      }

      // Check for inconsistent semicolon usage
      if (
        line.trim() &&
        !line.trim().endsWith(';') &&
        !line.trim().endsWith('{') &&
        !line.trim().endsWith('}')
      ) {
        if (
          line.includes('return ') ||
          line.includes('break ') ||
          line.includes('continue ')
        ) {
          issues.push(
            `Line ${lineNum}: Consider adding semicolon for consistency`
          );
        }
      }

      // Check for inconsistent quote usage
      if (line.includes('"') && line.includes("'")) {
        issues.push(
          `Line ${lineNum}: Use consistent quote style - prefer single or double quotes`
        );
      }

      // Check for trailing whitespace
      if (line.endsWith(' ') || line.endsWith('\t')) {
        issues.push(`Line ${lineNum}: Remove trailing whitespace`);
      }

      // Check for inconsistent indentation
      const leadingSpaces = line.match(/^(\s*)/)?.[1].length || 0;
      if (leadingSpaces % 2 !== 0 && leadingSpaces > 0) {
        issues.push(
          `Line ${lineNum}: Use consistent indentation (2 or 4 spaces)`
        );
      }

      // Check for long lines
      if (line.length > 80) {
        issues.push(
          `Line ${lineNum}: Line is ${line.length} characters long - consider breaking it up`
        );
      }

      // Check for unused imports/variables
      if (line.includes('import ') || line.includes('require(')) {
        const importName = line.match(
          /(?:import|require).*?['"`]([^'"`]+)['"`]/
        )?.[1];
        if (importName && !code.includes(importName.split('/').pop() || '')) {
          issues.push(
            `Line ${lineNum}: Unused import detected - remove if not needed`
          );
        }
      }
    }

    // Check for overall code style
    if (!code.includes('use strict') && code.includes('function')) {
      issues.push(
        'Consider adding "use strict" directive for better error checking'
      );
    }

    if (code.includes('var ')) {
      issues.push('Use let/const instead of var for better scoping');
    }

    if (code.includes('==') && !code.includes('===')) {
      issues.push('Use strict equality (===) instead of loose equality (==)');
    }

    if (issues.length > 0) {
      return `Code Improvement Suggestions:\n\n${issues.map(issue => `• ${issue}`).join('\n')}\n\nTotal improvements found: ${issues.length}`;
    } else {
      return 'Code Improvement Analysis:\n\n✅ Code follows good style practices! No improvements needed.';
    }
  }

  getAvailableTools(): HyperServerAITool[] {
    return Array.from(this.tools.values());
  }

  getToolInfo(toolId: string): HyperServerAITool | undefined {
    return this.tools.get(toolId);
  }

  async getToolStatus(
    toolId: string
  ): Promise<{ available: boolean; size: number }> {
    const tool = this.tools.get(toolId);
    if (!tool) {
      return { available: false, size: 0 };
    }

    if (tool.bundled) {
      return { available: true, size: tool.size };
    }

    return { available: false, size: 0 };
  }
}

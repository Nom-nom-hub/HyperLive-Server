import * as vscode from 'vscode';
import * as path from 'path';

export interface AIErrorExplanation {
  error: string;
  explanation: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high';
}

export interface AccessibilityIssue {
  element: string;
  issue: string;
  suggestion: string;
  priority: 'low' | 'medium' | 'high';
}

export class AIFeatures {
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  /**
   * Generate AI-powered error explanation
   */
  async explainError(errorMessage: string): Promise<AIErrorExplanation> {
    try {
      this.outputChannel.appendLine(`🤖 Analyzing error: ${errorMessage}`);

      // Simple AI-like error analysis (in a real implementation, this would call an AI service)
      const explanation = this.analyzeError(errorMessage);

      return {
        error: errorMessage,
        explanation: explanation.explanation,
        suggestions: explanation.suggestions,
        severity: explanation.severity,
      };
    } catch (error) {
      this.outputChannel.appendLine(`❌ AI error analysis failed: ${error}`);
      return {
        error: errorMessage,
        explanation: 'Unable to analyze this error automatically.',
        suggestions: [
          'Check the browser console for more details',
          'Review the file for syntax errors',
        ],
        severity: 'medium',
      };
    }
  }

  /**
   * Generate alt text for images
   */
  async generateAltText(imagePath: string, context?: string): Promise<string> {
    try {
      this.outputChannel.appendLine(`🤖 Generating alt text for: ${imagePath}`);

      // Simple alt text generation based on filename and context
      const fileName = path.basename(imagePath, path.extname(imagePath));
      const extension = path.extname(imagePath).toLowerCase();

      let altText = this.generateAltTextFromFilename(fileName, extension);

      if (context) {
        altText = `${altText} in ${context}`;
      }

      return altText;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Alt text generation failed: ${error}`);
      return `Image: ${path.basename(imagePath)}`;
    }
  }

  /**
   * Analyze HTML for accessibility issues
   */
  async analyzeAccessibility(
    htmlContent: string
  ): Promise<AccessibilityIssue[]> {
    try {
      this.outputChannel.appendLine('🤖 Analyzing accessibility...');

      const issues: AccessibilityIssue[] = [];

      // Check for missing alt attributes
      const imgRegex = /<img[^>]*>/gi;
      const imgMatches = htmlContent.match(imgRegex) || [];

      imgMatches.forEach((img, index) => {
        if (!img.includes('alt=')) {
          issues.push({
            element: `img[${index}]`,
            issue: 'Missing alt attribute',
            suggestion: 'Add descriptive alt text for screen readers',
            priority: 'high',
          });
        }
      });

      // Check for heading hierarchy
      const headingRegex = /<h([1-6])[^>]*>/gi;
      const headings = htmlContent.match(headingRegex) || [];
      const headingLevels = headings.map(h =>
        parseInt(h.match(/<h([1-6])/i)?.[1] || '1')
      );

      for (let i = 1; i < headingLevels.length; i++) {
        if (headingLevels[i] - headingLevels[i - 1] > 1) {
          issues.push({
            element: `h${headingLevels[i]}`,
            issue: 'Skipped heading level',
            suggestion: `Consider using h${headingLevels[i - 1] + 1} instead of h${headingLevels[i]}`,
            priority: 'medium',
          });
        }
      }

      // Check for color contrast issues (simplified)
      const colorRegex =
        /color:\s*(#[0-9a-fA-F]{3,6}|rgb\([^)]+\)|rgba\([^)]+\))/gi;
      const colors = htmlContent.match(colorRegex) || [];

      if (colors.length > 0) {
        issues.push({
          element: 'color styles',
          issue: 'Color contrast may be insufficient',
          suggestion: 'Use a color contrast checker to ensure WCAG compliance',
          priority: 'medium',
        });
      }

      // Check for form labels
      const inputRegex = /<input[^>]*>/gi;
      const inputs = htmlContent.match(inputRegex) || [];

      inputs.forEach((input, index) => {
        if (!input.includes('id=') && !input.includes('aria-label=')) {
          issues.push({
            element: `input[${index}]`,
            issue: 'Missing label or aria-label',
            suggestion: 'Add a label element or aria-label attribute',
            priority: 'high',
          });
        }
      });

      this.outputChannel.appendLine(
        `✅ Found ${issues.length} accessibility issues`
      );
      return issues;
    } catch (error) {
      this.outputChannel.appendLine(
        `❌ Accessibility analysis failed: ${error}`
      );
      return [];
    }
  }

  /**
   * Suggest improvements for code
   */
  async suggestImprovements(code: string, language: string): Promise<string[]> {
    try {
      this.outputChannel.appendLine(
        `🤖 Analyzing ${language} code for improvements...`
      );

      const suggestions: string[] = [];

      if (language === 'html') {
        // HTML suggestions
        if (!code.includes('<!DOCTYPE html>')) {
          suggestions.push(
            'Add DOCTYPE declaration for better browser compatibility'
          );
        }
        if (!code.includes('<meta charset')) {
          suggestions.push(
            'Add charset meta tag for proper character encoding'
          );
        }
        if (!code.includes('<meta name="viewport"')) {
          suggestions.push('Add viewport meta tag for responsive design');
        }
      } else if (language === 'css') {
        // CSS suggestions
        if (code.includes('!important')) {
          suggestions.push(
            'Consider avoiding !important - use more specific selectors instead'
          );
        }
        if (
          code.includes('px') &&
          !code.includes('rem') &&
          !code.includes('em')
        ) {
          suggestions.push(
            'Consider using relative units (rem/em) for better accessibility'
          );
        }
      } else if (language === 'javascript') {
        // JavaScript suggestions
        if (code.includes('var ')) {
          suggestions.push(
            'Consider using const/let instead of var for better scoping'
          );
        }
        if (code.includes('==') && !code.includes('===')) {
          suggestions.push(
            'Use strict equality (===) instead of loose equality (==)'
          );
        }
      }

      this.outputChannel.appendLine(
        `✅ Generated ${suggestions.length} improvement suggestions`
      );
      return suggestions;
    } catch (error) {
      this.outputChannel.appendLine(`❌ Code analysis failed: ${error}`);
      return [];
    }
  }

  private analyzeError(error: string): {
    explanation: string;
    suggestions: string[];
    severity: 'low' | 'medium' | 'high';
  } {
    const lowerError = error.toLowerCase();

    // Common error patterns
    if (
      lowerError.includes('cannot read property') ||
      lowerError.includes('undefined')
    ) {
      return {
        explanation:
          'This error occurs when trying to access a property of an undefined or null object.',
        suggestions: [
          'Check if the object exists before accessing its properties',
          'Use optional chaining (?.) or nullish coalescing (??)',
          'Add proper null checks',
        ],
        severity: 'high',
      };
    }

    if (
      lowerError.includes('unexpected token') ||
      lowerError.includes('syntax error')
    ) {
      return {
        explanation:
          'This is a syntax error indicating invalid JavaScript/HTML/CSS code.',
        suggestions: [
          'Check for missing brackets, parentheses, or semicolons',
          'Verify all tags are properly closed',
          'Use a linter to catch syntax errors early',
        ],
        severity: 'high',
      };
    }

    if (lowerError.includes('404') || lowerError.includes('not found')) {
      return {
        explanation:
          'The requested resource (file, API endpoint, etc.) was not found.',
        suggestions: [
          'Check if the file path is correct',
          'Verify the file exists in the specified location',
          'Check for typos in URLs or file names',
        ],
        severity: 'medium',
      };
    }

    if (lowerError.includes('cors') || lowerError.includes('cross-origin')) {
      return {
        explanation: 'This is a Cross-Origin Resource Sharing (CORS) error.',
        suggestions: [
          'Configure CORS headers on your server',
          'Use a proxy for development',
          'Check if the API endpoint allows your domain',
        ],
        severity: 'medium',
      };
    }

    // Default response
    return {
      explanation:
        'This appears to be a runtime error that needs investigation.',
      suggestions: [
        'Check the browser console for more details',
        'Review the code around the error location',
        'Add console.log statements for debugging',
      ],
      severity: 'medium',
    };
  }

  private generateAltTextFromFilename(
    fileName: string,
    extension: string
  ): string {
    // Convert filename to readable text
    const readableName = fileName
      .replace(/[-_]/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .toLowerCase()
      .trim();

    // Add context based on file extension
    switch (extension) {
      case '.jpg':
      case '.jpeg':
      case '.png':
      case '.gif':
      case '.webp':
        return `Image of ${readableName}`;
      case '.svg':
        return `Icon or graphic of ${readableName}`;
      case '.pdf':
        return `PDF document: ${readableName}`;
      default:
        return `File: ${readableName}`;
    }
  }
}

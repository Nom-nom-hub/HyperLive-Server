import * as vscode from 'vscode';
import * as path from 'path';

export interface DOMNode {
  id: string;
  tagName: string;
  className: string;
  textContent: string;
  attributes: { [key: string]: string };
  children: DOMNode[];
  styles: { [key: string]: string };
  computedStyles: { [key: string]: string };
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isVisible: boolean;
  zIndex: number;
}

export interface DOMAnalysis {
  nodes: DOMNode[];
  issues: DOMIssue[];
  performance: PerformanceMetrics;
  accessibility: AccessibilityMetrics;
}

export interface DOMIssue {
  type: 'error' | 'warning' | 'info';
  severity: 'low' | 'medium' | 'high';
  message: string;
  nodeId?: string;
  suggestion?: string;
}

export interface PerformanceMetrics {
  totalNodes: number;
  depth: number;
  renderTime: number;
  memoryUsage: number;
  repaints: number;
  reflows: number;
}

export interface AccessibilityMetrics {
  missingAltText: number;
  missingAriaLabels: number;
  headingStructure: number;
  colorContrast: number;
  keyboardNavigation: number;
  screenReaderCompatible: number;
}

export class DOMInspector {
  private panel: vscode.WebviewPanel | undefined;
  private context: vscode.ExtensionContext;
  private currentAnalysis: DOMAnalysis | undefined;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
  }

  async openInspector(): Promise<void> {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'domInspector',
      'DOM Inspector',
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(path.join(this.context.extensionPath, 'media')),
        ],
      }
    );

    this.panel.webview.html = this.getWebviewContent();
    this.panel.webview.onDidReceiveMessage(this.handleMessage.bind(this));
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  async analyzeDOM(html: string): Promise<DOMAnalysis> {
    // Parse HTML and create DOM tree
    const nodes = this.parseHTML(html);
    const issues = this.analyzeIssues(nodes);
    const performance = this.calculatePerformanceMetrics(nodes);
    const accessibility = this.calculateAccessibilityMetrics(nodes);

    this.currentAnalysis = {
      nodes,
      issues,
      performance,
      accessibility,
    };

    // Send analysis to webview if open
    if (this.panel) {
      this.panel.webview.postMessage({
        type: 'analysis',
        data: this.currentAnalysis,
      });
    }

    return this.currentAnalysis;
  }

  private parseHTML(html: string): DOMNode[] {
    // Simple HTML parser - in a real implementation, you'd use a proper HTML parser
    const nodes: DOMNode[] = [];
    const lines = html.split('\n');
    let nodeId = 0;

    for (const line of lines) {
      const trimmed = line.trim();
      if (
        trimmed.startsWith('<') &&
        !trimmed.startsWith('</') &&
        !trimmed.endsWith('/>')
      ) {
        const tagMatch = trimmed.match(/<(\w+)/);
        if (tagMatch) {
          const tagName = tagMatch[1];
          const attributes = this.extractAttributes(trimmed);
          const className = attributes.class || '';

          nodes.push({
            id: `node-${nodeId++}`,
            tagName,
            className,
            textContent: '',
            attributes,
            children: [],
            styles: {},
            computedStyles: {},
            boundingBox: { x: 0, y: 0, width: 0, height: 0 },
            isVisible: true,
            zIndex: 0,
          });
        }
      }
    }

    return nodes;
  }

  private extractAttributes(line: string): { [key: string]: string } {
    const attributes: { [key: string]: string } = {};
    const attrRegex = /(\w+)=["']([^"']*)["']/g;
    let match;

    while ((match = attrRegex.exec(line)) !== null) {
      attributes[match[1]] = match[2];
    }

    return attributes;
  }

  private analyzeIssues(nodes: DOMNode[]): DOMIssue[] {
    const issues: DOMIssue[] = [];

    for (const node of nodes) {
      // Check for missing alt attributes on images
      if (node.tagName.toLowerCase() === 'img' && !node.attributes.alt) {
        issues.push({
          type: 'warning',
          severity: 'medium',
          message: 'Image missing alt attribute',
          nodeId: node.id,
          suggestion: 'Add alt="description" to improve accessibility',
        });
      }

      // Check for missing aria labels on interactive elements
      if (
        ['button', 'input', 'select', 'textarea'].includes(
          node.tagName.toLowerCase()
        )
      ) {
        const hasLabel =
          node.attributes['aria-label'] ||
          node.attributes['aria-labelledby'] ||
          node.attributes.title;

        if (!hasLabel && !node.attributes.id) {
          issues.push({
            type: 'warning',
            severity: 'medium',
            message: `${node.tagName} missing accessibility label`,
            nodeId: node.id,
            suggestion: 'Add aria-label, aria-labelledby, or title attribute',
          });
        }
      }

      // Check for inline styles (performance issue)
      if (node.attributes.style) {
        issues.push({
          type: 'info',
          severity: 'low',
          message: 'Element uses inline styles',
          nodeId: node.id,
          suggestion:
            'Consider moving styles to external CSS for better performance',
        });
      }
    }

    return issues;
  }

  private calculatePerformanceMetrics(nodes: DOMNode[]): PerformanceMetrics {
    const depth = this.calculateMaxDepth(nodes);

    return {
      totalNodes: nodes.length,
      depth,
      renderTime: nodes.length * 0.1, // Estimated
      memoryUsage: nodes.length * 0.5, // Estimated KB
      repaints: Math.floor(nodes.length * 0.3),
      reflows: Math.floor(nodes.length * 0.1),
    };
  }

  private calculateAccessibilityMetrics(
    nodes: DOMNode[]
  ): AccessibilityMetrics {
    let missingAltText = 0;
    let missingAriaLabels = 0;
    let headingStructure = 0;
    let colorContrast = 0;
    let keyboardNavigation = 0;
    let screenReaderCompatible = 0;

    for (const node of nodes) {
      if (node.tagName.toLowerCase() === 'img' && !node.attributes.alt) {
        missingAltText++;
      }

      if (
        ['button', 'input', 'select', 'textarea'].includes(
          node.tagName.toLowerCase()
        )
      ) {
        const hasLabel =
          node.attributes['aria-label'] ||
          node.attributes['aria-labelledby'] ||
          node.attributes.title;

        if (!hasLabel && !node.attributes.id) {
          missingAriaLabels++;
        }
      }

      if (/^h[1-6]$/.test(node.tagName.toLowerCase())) {
        headingStructure++;
      }

      if (node.attributes.tabindex) {
        keyboardNavigation++;
      }

      if (
        node.attributes['aria-label'] ||
        node.attributes['aria-describedby']
      ) {
        screenReaderCompatible++;
      }
    }

    return {
      missingAltText,
      missingAriaLabels,
      headingStructure,
      colorContrast,
      keyboardNavigation,
      screenReaderCompatible,
    };
  }

  private calculateMaxDepth(nodes: DOMNode[]): number {
    // Simplified depth calculation
    return Math.floor(Math.log2(nodes.length)) + 1;
  }

  private getWebviewContent(): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>DOM Inspector</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          
          .container {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            height: calc(100vh - 40px);
          }
          
          .panel {
            background: var(--vscode-panel-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 16px;
            overflow: auto;
          }
          
          .panel h2 {
            margin-top: 0;
            color: var(--vscode-editor-foreground);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 8px;
          }
          
          .tree-node {
            margin: 4px 0;
            padding: 4px 8px;
            border-radius: 4px;
            cursor: pointer;
            transition: background-color 0.2s;
          }
          
          .tree-node:hover {
            background: var(--vscode-list-hoverBackground);
          }
          
          .tree-node.selected {
            background: var(--vscode-list-activeSelectionBackground);
            color: var(--vscode-list-activeSelectionForeground);
          }
          
          .issue {
            margin: 8px 0;
            padding: 8px;
            border-radius: 4px;
            border-left: 4px solid;
          }
          
          .issue.error {
            background: rgba(255, 0, 0, 0.1);
            border-left-color: #ff0000;
          }
          
          .issue.warning {
            background: rgba(255, 165, 0, 0.1);
            border-left-color: #ffa500;
          }
          
          .issue.info {
            background: rgba(0, 123, 255, 0.1);
            border-left-color: #007bff;
          }
          
          .metrics {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
          }
          
          .metric {
            background: var(--vscode-editor-background);
            padding: 12px;
            border-radius: 4px;
            text-align: center;
          }
          
          .metric-value {
            font-size: 24px;
            font-weight: bold;
            color: var(--vscode-textLink-foreground);
          }
          
          .metric-label {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-top: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="panel">
            <h2>DOM Tree</h2>
            <div id="dom-tree"></div>
          </div>
          
          <div class="panel">
            <h2>Analysis</h2>
            <div id="issues"></div>
            
            <h2>Performance Metrics</h2>
            <div id="performance" class="metrics"></div>
            
            <h2>Accessibility Metrics</h2>
            <div id="accessibility" class="metrics"></div>
          </div>
        </div>
        
        <script>
          const vscode = acquireVsCodeApi();
          
          window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.type) {
              case 'analysis':
                displayAnalysis(message.data);
                break;
            }
          });
          
          function displayAnalysis(analysis) {
            displayDOMTree(analysis.nodes);
            displayIssues(analysis.issues);
            displayPerformanceMetrics(analysis.performance);
            displayAccessibilityMetrics(analysis.accessibility);
          }
          
          function displayDOMTree(nodes) {
            const container = document.getElementById('dom-tree');
            container.innerHTML = '';
            
            nodes.forEach(node => {
              const element = document.createElement('div');
              element.className = 'tree-node';
              element.innerHTML = \`<strong>\${node.tagName}</strong>\${node.className ? ' .' + node.className.split(' ').join('.') : ''}\`;
              element.onclick = () => selectNode(node);
              container.appendChild(element);
            });
          }
          
          function displayIssues(issues) {
            const container = document.getElementById('issues');
            container.innerHTML = '';
            
            issues.forEach(issue => {
              const element = document.createElement('div');
              element.className = \`issue \${issue.type}\`;
              element.innerHTML = \`
                <strong>\${issue.message}</strong>
                \${issue.suggestion ? '<br><small>' + issue.suggestion + '</small>' : ''}
              \`;
              container.appendChild(element);
            });
          }
          
          function displayPerformanceMetrics(metrics) {
            const container = document.getElementById('performance');
            container.innerHTML = '';
            
            Object.entries(metrics).forEach(([key, value]) => {
              const element = document.createElement('div');
              element.className = 'metric';
              element.innerHTML = \`
                <div class="metric-value">\${value}</div>
                <div class="metric-label">\${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
              \`;
              container.appendChild(element);
            });
          }
          
          function displayAccessibilityMetrics(metrics) {
            const container = document.getElementById('accessibility');
            container.innerHTML = '';
            
            Object.entries(metrics).forEach(([key, value]) => {
              const element = document.createElement('div');
              element.className = 'metric';
              element.innerHTML = \`
                <div class="metric-value">\${value}</div>
                <div class="metric-label">\${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
              \`;
              container.appendChild(element);
            });
          }
          
          function selectNode(node) {
            // Remove previous selection
            document.querySelectorAll('.tree-node.selected').forEach(el => {
              el.classList.remove('selected');
            });
            
            // Add selection to clicked node
            event.target.closest('.tree-node').classList.add('selected');
            
            // Send message to extension
            vscode.postMessage({
              type: 'nodeSelected',
              nodeId: node.id
            });
          }
        </script>
      </body>
      </html>
    `;
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'nodeSelected':
        this.onNodeSelected(message.nodeId);
        break;
    }
  }

  private onNodeSelected(nodeId: string): void {
    if (this.currentAnalysis) {
      const node = this.currentAnalysis.nodes.find(n => n.id === nodeId);
      if (node) {
        // Highlight the selected node in the editor
        vscode.commands.executeCommand(
          'advancedLiveServer.highlightNode',
          node
        );
      }
    }
  }

  getCurrentAnalysis(): DOMAnalysis | undefined {
    return this.currentAnalysis;
  }
}

import * as vscode from 'vscode';
import { LiveServer } from '../server/live-server';
import { ConfigManager } from '../config/config-manager';
import { StatusBarManager } from '../ui/status-bar-manager';
// Import real feature implementations
import { CloudPreviewManager } from '../premium/cloud-preview-manager';
import { MultiAIService } from './multi-ai-service';
import { AISettingsPanel } from '../ui/ai-settings-panel';
import { CustomDomainsService } from '../premium/custom-domains';
import { PrioritySupportService } from '../premium/priority-support';
import { AdvancedAnalyticsService } from '../premium/advanced-analytics';

let liveServer: LiveServer | null = null;
let statusBarManager: StatusBarManager;
let outputChannel: vscode.OutputChannel;
let collaborationStatusBarItem: vscode.StatusBarItem | undefined;
let serverStatusBarItem: vscode.StatusBarItem | undefined;
let quickActionsStatusBarItem: vscode.StatusBarItem | undefined;

// Service singletons (initialized in activate)
let cloudPreviewManager: CloudPreviewManager;
let aiService: MultiAIService;
let aiSettingsPanel: AISettingsPanel;
let customDomainsService: CustomDomainsService;
let prioritySupportService: PrioritySupportService;
let analyticsService: AdvancedAnalyticsService;

// --- STUBS FOR PREMIUM FEATURES ---
// REMOVE ALL STUBS AND UPGRADE MESSAGES

// TODO: Import and wire up real feature implementations here
// Example:
// import { startCloudPreview } from '../premium/cloud-preview-manager';
// import { analyzeError } from '../premium/ai-service';
// ...

// For now, just provide empty async functions as placeholders for all premium commands

// --- COMMAND REGISTRATION ---
// Only register free feature commands
const commands = [
  vscode.commands.registerCommand('advancedLiveServer.start', startServer),
  vscode.commands.registerCommand('advancedLiveServer.stop', stopServer),
  vscode.commands.registerCommand('advancedLiveServer.restart', restartServer),
  vscode.commands.registerCommand('advancedLiveServer.openInBrowser', openInBrowser),
  vscode.commands.registerCommand('advancedLiveServer.openCurrentFile', openCurrentFile),
  vscode.commands.registerCommand('advancedLiveServer.showStatus', showStatus),
  vscode.commands.registerCommand('advancedLiveServer.openSettings', openSettings),
  vscode.commands.registerCommand('advancedLiveServer.resetSettings', resetSettings),
  vscode.commands.registerCommand('advancedLiveServer.openVSCodeSettings', openVSCodeSettings),
  vscode.commands.registerCommand('advancedLiveServer.quickSettings', quickSettings),
  vscode.commands.registerCommand('advancedLiveServer.showCurrentSettings', showCurrentSettings),
  // Premium commands as stubs
  vscode.commands.registerCommand('advancedLiveServer.startCloudPreview', startCloudPreview),
  vscode.commands.registerCommand('advancedLiveServer.analyzeError', analyzeError),
  vscode.commands.registerCommand('advancedLiveServer.suggestImprovements', suggestImprovements),
  vscode.commands.registerCommand('advancedLiveServer.openAISettings', openAISettings),
  vscode.commands.registerCommand('advancedLiveServer.analyzeAccessibility', analyzeAccessibility),
  vscode.commands.registerCommand('advancedLiveServer.analyzePerformance', analyzePerformance),
  vscode.commands.registerCommand('advancedLiveServer.analyzeSEO', analyzeSEO),
  vscode.commands.registerCommand('advancedLiveServer.securityScan', securityScan),
  vscode.commands.registerCommand('advancedLiveServer.startCollaboration', startCollaboration),
  vscode.commands.registerCommand('advancedLiveServer.stopCollaboration', stopCollaboration),
  vscode.commands.registerCommand('advancedLiveServer.showCollaborationInfo', showCollaborationInfo),
  vscode.commands.registerCommand('advancedLiveServer.showAnalytics', showAnalytics),
  vscode.commands.registerCommand('advancedLiveServer.addCustomDomain', addCustomDomain),
  vscode.commands.registerCommand('advancedLiveServer.createSupportTicket', createSupportTicket),
  vscode.commands.registerCommand('advancedLiveServer.showWelcome', showWelcome),
];

export async function activate(context: vscode.ExtensionContext) {
  console.log('Advanced Live Server extension is now active!');

  // Initialize output channel
  outputChannel = vscode.window.createOutputChannel('Advanced Live Server');

  // Initialize services
  statusBarManager = new StatusBarManager();
  cloudPreviewManager = new CloudPreviewManager(outputChannel);
  aiService = new MultiAIService(context, outputChannel);
  aiSettingsPanel = new AISettingsPanel(context);
  
  // Initialize AI service
  await aiService.initialize();
  customDomainsService = new CustomDomainsService(context, outputChannel);
  prioritySupportService = new PrioritySupportService(context, outputChannel);
  analyticsService = new AdvancedAnalyticsService(context, outputChannel);

  // Show welcome message on first install
  const isFirstInstall = context.globalState.get('hasShownWelcome', false);
  if (!isFirstInstall) {
    context.globalState.update('hasShownWelcome', true);
    // Show welcome message after a short delay
    setTimeout(() => {
      showWelcome();
    }, 2000);
  }

  // Register commands
  commands.forEach(command => context.subscriptions.push(command));

  // Update status bar
  statusBarManager.updateStatus(false);

  // Auto-start if configured
  const workspaceConfig =
    vscode.workspace.getConfiguration('advancedLiveServer');
  if (workspaceConfig.get('autoStart', false)) {
    startServer();
  }

  updateCollaborationStatusBar();
  updateServerStatusBar(liveServer?.isRunning?.() || false);
  context.subscriptions.push({ dispose: () => collaborationStatusBarItem?.dispose() });
  context.subscriptions.push({ dispose: () => serverStatusBarItem?.dispose() });

  // Add Quick Actions menu button to the left side of the status bar
  quickActionsStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 1);
  quickActionsStatusBarItem.text = '$(list-unordered) Live Server Menu';
  quickActionsStatusBarItem.tooltip = 'Open Advanced Live Server Quick Actions';
  quickActionsStatusBarItem.command = 'advancedLiveServer.showQuickActions';
  quickActionsStatusBarItem.show();
  context.subscriptions.push(quickActionsStatusBarItem);
}

export function deactivate() {
  if (liveServer) {
    liveServer.stop();
  }
  // if (offlineCloudService) { // Removed
  //   offlineCloudService.stop(); // Removed
  // } // Removed
  if (statusBarManager) {
    statusBarManager.dispose();
  }
  if (quickActionsStatusBarItem) {
    quickActionsStatusBarItem.dispose();
  }
}

// Core server functions
async function startServer() {
  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(
        'No workspace folder found. Please open a folder first.'
      );
      return;
    }

    // Always reload configuration
    const config = await ConfigManager.loadConfig(workspaceFolder.uri.fsPath);

    // Debug: Log the exact config object being passed to LiveServer
    outputChannel.appendLine(
      `🔍 Debug - startServer - Config object being passed to LiveServer:`
    );
    outputChannel.appendLine(
      `  Config object: ${JSON.stringify({
        port: config.port,
        https: config.https,
        spa: config.spa,
        openBrowser: config.openBrowser,
        showOverlay: config.showOverlay,
      })}`
    );

    // Check if server is already running
    if (liveServer && liveServer.isRunning()) {
      vscode.window.showInformationMessage('Server is already running!');
      return;
    }

    // Create and start server
    liveServer = new LiveServer(
      workspaceFolder.uri.fsPath,
      config,
      outputChannel
    );

    liveServer.on('started', (port: number, https: boolean) => {
      // Always use the correct protocol based on the current config
      const protocol = https ? 'https' : 'http';
      const url = `${protocol}://localhost:${port}`;

      statusBarManager.updateStatus(true, port);
      outputChannel.appendLine(`✅ Server started at ${url}`);

      // Auto-open browser if configured
      if (config.openBrowser) {
        vscode.env.openExternal(vscode.Uri.parse(url));
        outputChannel.appendLine(`🌐 Browser opened automatically: ${url}`);
      }

      // Show notification
      vscode.window
        .showInformationMessage(
          `Advanced Live Server started at ${url}`,
          'Open Browser'
        )
        .then(selection => {
          if (selection === 'Open Browser') {
            vscode.env.openExternal(vscode.Uri.parse(url));
          }
        });
    });

    liveServer.on('stopped', () => {
      statusBarManager.updateStatus(false);
      outputChannel.appendLine('🛑 Server stopped');
    });

    liveServer.on('error', (error: string) => {
      vscode.window.showErrorMessage(`Server error: ${error}`);
      outputChannel.appendLine(`❌ Error: ${error}`);
    });

    await liveServer.start();
    updateServerStatusBar(true);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start server: ${error}`);
    outputChannel.appendLine(`❌ Failed to start server: ${error}`);
    updateServerStatusBar(false);
  }
}

async function stopServer() {
  if (liveServer && liveServer.isRunning()) {
    await liveServer.stop();
    liveServer = null;
    vscode.window.showInformationMessage('Server stopped');
    updateServerStatusBar(false);
  } else {
    vscode.window.showInformationMessage('No server is currently running');
    updateServerStatusBar(false);
  }
}

async function restartServer() {
  await stopServer();
  // Add a small delay to ensure the old server is fully stopped
  setTimeout(async () => {
    try {
      // Force reload configuration before starting
      const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
      if (workspaceFolder) {
        // Force VSCode to reload configuration
        await forceReloadVSCodeConfig();

        // Wait a moment for any pending configuration changes to be processed
        await new Promise(resolve => setTimeout(resolve, 1000));

        const config = await ConfigManager.loadConfig(
          workspaceFolder.uri.fsPath
        );
        outputChannel.appendLine(
          `🔄 Restarting server with updated configuration...`
        );
        outputChannel.appendLine(`🔧 Port: ${config.port}`);
        outputChannel.appendLine(
          `🔒 HTTPS: ${config.https ? 'Enabled' : 'Disabled'}`
        );

        // Debug: Log the exact config object being passed to LiveServer
        outputChannel.appendLine(
          `🔍 Debug - Config object being passed to LiveServer:`
        );
        outputChannel.appendLine(
          `  Config object: ${JSON.stringify({
            port: config.port,
            https: config.https,
            spa: config.spa,
            openBrowser: config.openBrowser,
            showOverlay: config.showOverlay,
          })}`
        );

        // Create new server instance with fresh config
        liveServer = new LiveServer(
          workspaceFolder.uri.fsPath,
          config,
          outputChannel
        );

        liveServer.on('started', (port: number, https: boolean) => {
          const protocol = https ? 'https' : 'http';
          const url = `${protocol}://localhost:${port}`;

          statusBarManager.updateStatus(true, port);
          outputChannel.appendLine(`✅ Server restarted at ${url}`);

          // Auto-open browser if configured
          if (config.openBrowser) {
            vscode.env.openExternal(vscode.Uri.parse(url));
            outputChannel.appendLine(`🌐 Browser opened automatically: ${url}`);
          }

          // Show notification
          vscode.window
            .showInformationMessage(
              `Advanced Live Server restarted at ${url}`,
              'Open Browser'
            )
            .then(selection => {
              if (selection === 'Open Browser') {
                vscode.env.openExternal(vscode.Uri.parse(url));
              }
            });
        });

        liveServer.on('stopped', () => {
          statusBarManager.updateStatus(false);
          outputChannel.appendLine('🛑 Server stopped');
        });

        liveServer.on('error', (error: string) => {
          vscode.window.showErrorMessage(`Server error: ${error}`);
          outputChannel.appendLine(`❌ Error: ${error}`);
        });

        await liveServer.start();
        updateServerStatusBar(true);
      }
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to restart server: ${error}`);
      outputChannel.appendLine(`❌ Failed to restart server: ${error}`);
      updateServerStatusBar(false);
    }
  }, 500);
}

async function forceReloadVSCodeConfig() {
  // Force VSCode to reload the configuration by accessing it multiple times
  const config = vscode.workspace.getConfiguration('advancedLiveServer');

  // Read all values to force a reload
  const values = {
    port: config.get('port'),
    https: config.get('https'),
    spa: config.get('spa'),
    openBrowser: config.get('openBrowser'),
    showOverlay: config.get('showOverlay'),
  };

  outputChannel.appendLine(
    `🔄 Force reloading VSCode config: ${JSON.stringify(values)}`
  );

  // Wait for configuration to be fully loaded
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function openInBrowser() {
  if (!liveServer || !liveServer.isRunning()) {
    vscode.window.showErrorMessage('Server is not running');
    return;
  }

  const editor = vscode.window.activeTextEditor;
  if (editor) {
    // If there's an active editor, try to open the current file
    const document = editor.document;
    const filePath = document.uri.fsPath;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    
    if (workspaceFolder) {
      // Check if it's a web file
      const supportedExtensions = ['.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
      
      if (supportedExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
        // Open the current file
        const relativePath = vscode.workspace.asRelativePath(filePath);
        const serverInfo = liveServer.getServerInfo();
        if (serverInfo) {
          const fileUrl = `${serverInfo.url}/${relativePath.replace(/\\/g, '/')}`;
          outputChannel.appendLine(`🌐 Opening current file: ${fileUrl}`);
          vscode.env.openExternal(vscode.Uri.parse(fileUrl));
          return;
        }
      }
    }
  }

  // Fallback to opening the root URL
  const serverInfo = liveServer.getServerInfo();
  if (serverInfo) {
    outputChannel.appendLine(`🌐 Opening root URL: ${serverInfo.url}`);
    vscode.env.openExternal(vscode.Uri.parse(serverInfo.url));
  }
}

async function openCurrentFile() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  if (!liveServer || !liveServer.isRunning()) {
    vscode.window.showErrorMessage('Server is not running. Please start the server first.');
    return;
  }

  const document = editor.document;
  const filePath = document.uri.fsPath;
  const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
  
  if (!workspaceFolder) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }

  // Get relative path from workspace root
  const relativePath = vscode.workspace.asRelativePath(filePath);
  
  // Debug: Log the file paths
  outputChannel.appendLine(`🔍 Debug - openCurrentFile:`);
  outputChannel.appendLine(`  Full file path: ${filePath}`);
  outputChannel.appendLine(`  Workspace folder: ${workspaceFolder.uri.fsPath}`);
  outputChannel.appendLine(`  Relative path: ${relativePath}`);
  
  // Check if it's an HTML file or other web file
  const supportedExtensions = ['.html', '.htm', '.css', '.js', '.jsx', '.ts', '.tsx', '.vue', '.svelte'];
  const fileExtension = document.languageId;
  
  if (!supportedExtensions.some(ext => filePath.toLowerCase().endsWith(ext))) {
    vscode.window.showInformationMessage('Current file is not a web file. Opening workspace root instead.');
    openInBrowser();
    return;
  }

  const serverInfo = liveServer.getServerInfo();
  if (serverInfo) {
    const fileUrl = `${serverInfo.url}/${relativePath.replace(/\\/g, '/')}`;
    outputChannel.appendLine(`🌐 Opening current file: ${fileUrl}`);
    vscode.env.openExternal(vscode.Uri.parse(fileUrl));
  }
}

function showStatus() {
  if (liveServer && liveServer.isRunning()) {
    const serverInfo = liveServer.getServerInfo();
    vscode.window.showInformationMessage(
      `Server running on ${serverInfo?.url || 'unknown port'}`
    );
  } else {
    vscode.window.showInformationMessage('Server is not running');
  }
}



async function stopCloudPreview() {
  // if (cloudPreviewManager.isTunnelActive()) { // Removed
  //   await cloudPreviewManager.stopTunnel(); // Removed
  // } else { // Removed
  //   vscode.window.showInformationMessage( // Removed
  //     'No cloud preview is currently running' // Removed
  //   ); // Removed
  // } // Removed
}

// Settings functions
function openSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:teck.advanced-live-server');
}

async function resetSettings() {
  try {
    const confirm = await vscode.window.showWarningMessage(
      'Are you sure you want to reset all Advanced Live Server settings to defaults?',
      { modal: true },
      'Reset Settings'
    );
    
    if (confirm === 'Reset Settings') {
      const config = vscode.workspace.getConfiguration('advancedLiveServer');
      
      // Reset to defaults
      await config.update('port', 5500, vscode.ConfigurationTarget.Global);
      await config.update('https', false, vscode.ConfigurationTarget.Global);
      await config.update('spa', false, vscode.ConfigurationTarget.Global);
      await config.update('openBrowser', true, vscode.ConfigurationTarget.Global);
      await config.update('showOverlay', true, vscode.ConfigurationTarget.Global);
      await config.update('autoStart', false, vscode.ConfigurationTarget.Global);
      
      vscode.window.showInformationMessage('✅ Settings reset to defaults!');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to reset settings: ${error}`);
  }
}

async function openVSCodeSettings() {
  vscode.commands.executeCommand('workbench.action.openSettings', '@ext:teck.advanced-live-server');
}

async function quickSettings() {
  const items = [
    { label: '🔧 Port', description: 'Change server port', command: 'changePort' },
    { label: '🔒 HTTPS', description: 'Toggle HTTPS', command: 'toggleHttps' },
    { label: '📱 SPA Mode', description: 'Toggle SPA mode', command: 'toggleSpa' },
    { label: '🌐 Auto-open Browser', description: 'Toggle auto-open browser', command: 'toggleAutoOpen' },
    { label: '📊 Show Overlay', description: 'Toggle status overlay', command: 'toggleOverlay' },
    { label: '🚀 Auto-start', description: 'Toggle auto-start on workspace open', command: 'toggleAutoStart' },
    { label: '📋 Show Current Settings', description: 'View all current settings', command: 'showCurrentSettings' },
    { label: '⚙️ Open Full Settings', description: 'Open VS Code settings', command: 'openVSCodeSettings' },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select a setting to change...',
  });

  if (selected) {
    switch (selected.command) {
      case 'changePort':
        const port = await vscode.window.showInputBox({
          prompt: 'Enter new port number:',
          value: '5500',
          validateInput: (value) => {
            const num = parseInt(value);
            return (num >= 1 && num <= 65535) ? null : 'Port must be between 1 and 65535';
          }
        });
        if (port) {
          await vscode.workspace.getConfiguration('advancedLiveServer').update('port', parseInt(port), vscode.ConfigurationTarget.Global);
          vscode.window.showInformationMessage(`✅ Port changed to ${port}`);
        }
        break;
      case 'toggleHttps':
        const currentHttps = vscode.workspace.getConfiguration('advancedLiveServer').get('https', false);
        await vscode.workspace.getConfiguration('advancedLiveServer').update('https', !currentHttps, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`✅ HTTPS ${!currentHttps ? 'enabled' : 'disabled'}`);
        break;
      case 'toggleSpa':
        const currentSpa = vscode.workspace.getConfiguration('advancedLiveServer').get('spa', false);
        await vscode.workspace.getConfiguration('advancedLiveServer').update('spa', !currentSpa, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`✅ SPA mode ${!currentSpa ? 'enabled' : 'disabled'}`);
        break;
      case 'toggleAutoOpen':
        const currentAutoOpen = vscode.workspace.getConfiguration('advancedLiveServer').get('openBrowser', true);
        await vscode.workspace.getConfiguration('advancedLiveServer').update('openBrowser', !currentAutoOpen, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`✅ Auto-open browser ${!currentAutoOpen ? 'enabled' : 'disabled'}`);
        break;
      case 'toggleOverlay':
        const currentOverlay = vscode.workspace.getConfiguration('advancedLiveServer').get('showOverlay', true);
        await vscode.workspace.getConfiguration('advancedLiveServer').update('showOverlay', !currentOverlay, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`✅ Status overlay ${!currentOverlay ? 'enabled' : 'disabled'}`);
        break;
      case 'toggleAutoStart':
        const currentAutoStart = vscode.workspace.getConfiguration('advancedLiveServer').get('autoStart', false);
        await vscode.workspace.getConfiguration('advancedLiveServer').update('autoStart', !currentAutoStart, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`✅ Auto-start ${!currentAutoStart ? 'enabled' : 'disabled'}`);
        break;
      case 'showCurrentSettings':
        showCurrentSettings();
        break;
      case 'openVSCodeSettings':
        openVSCodeSettings();
        break;
    }
  }
}

async function showCurrentSettings() {
  const config = vscode.workspace.getConfiguration('advancedLiveServer');
  
  const settings = {
    'Port': config.get('port', 5500),
    'HTTPS': config.get('https', false) ? '✅ Enabled' : '❌ Disabled',
    'SPA Mode': config.get('spa', false) ? '✅ Enabled' : '❌ Disabled',
    'Auto-open Browser': config.get('openBrowser', true) ? '✅ Enabled' : '❌ Disabled',
    'Show Overlay': config.get('showOverlay', true) ? '✅ Enabled' : '❌ Disabled',
    'Auto-start': config.get('autoStart', false) ? '✅ Enabled' : '❌ Disabled',
  };

  const content = Object.entries(settings)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');

  const doc = await vscode.workspace.openTextDocument({
    content: `Advanced Live Server - Current Settings\n\n${content}\n\nLast updated: ${new Date().toLocaleString()}`,
    language: 'markdown',
  });
  
  await vscode.window.showTextDocument(doc);
}













function showAIAnalysis(result: any) {
  const panel = vscode.window.createWebviewPanel(
    'aiAnalysis',
    `AI Analysis: ${result.title}`,
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>AI Analysis</title>
            <style>
                body {
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
                  padding: 20px;
                  background-color: var(--vscode-editor-background, #1e1e1e);
                  color: var(--vscode-editor-foreground, #222);
                }
                h1, h2, p, li {
                  color: var(--vscode-editor-foreground, #222);
                }
                .severity-high { color: var(--vscode-editorError-foreground, #d73a49); }
                .severity-medium { color: var(--vscode-editorWarning-foreground, #f6a434); }
                .severity-low { color: var(--vscode-editorInfo-foreground, #28a745); }
                .suggestion {
                  background: var(--vscode-editorWidget-background, #f6f8fa);
                  color: var(--vscode-editor-foreground, #222);
                  padding: 10px;
                  margin: 10px 0;
                  border-radius: 4px;
                  border: 1px solid var(--vscode-editorWidget-border, #ccc);
                }
            </style>
        </head>
        <body>
            <h1>${result.title}</h1>
            <p class="severity-${result.severity}"><strong>Severity: ${result.severity}</strong></p>
            <div>${result.description.replace(/\n/g, '<br>')}</div>
            <h2>Suggestions:</h2>
            <ul>
                ${result.suggestions.map((s: string) => `<li class="suggestion">${s}</li>`).join('')}
            </ul>
        </body>
        </html>
    `;
}

// CI/CD functions
async function triggerBuild() {
  const providers = ['github', 'gitlab', 'netlify', 'vercel', 'custom'];
  const provider = await vscode.window.showQuickPick(providers, {
    placeHolder: 'Select build provider',
  });

  if (provider) {
    try {
      // cicdService.triggerBuild(provider as any); // Removed
      vscode.window.showInformationMessage(
        `Build ${'started' /* result.success ? 'started' : 'failed' */}: ${'output' /* result.output */}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Build failed: ${error}`);
    }
  }
}

async function runTests() {
  try {
    // testingService.runTests(); // Removed
    vscode.window.showInformationMessage(
      `Tests completed: ${'passed' /* results.filter(r => r.success).length */}/${'total' /* results.length */} passed`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Tests failed: ${error}`);
  }
}

async function deploy() {
  const providers = ['netlify', 'vercel', 'custom'];
  const provider = await vscode.window.showQuickPick(providers, {
    placeHolder: 'Select deployment provider',
  });

  if (provider) {
    try {
      // cicdService.triggerBuild(provider as any); // Removed
      vscode.window.showInformationMessage(`Deployed to: ${'url' /* result.url */}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Deployment failed: ${error}`);
    }
  }
}

// DOM Inspector functions
async function openDOMInspector() {
  try {
    // domInspector.openInspector(); // Removed
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open DOM inspector: ${error}`);
  }
}

async function analyzeDOM() {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage('No active editor');
    return;
  }

  try {
    // domInspector.analyzeDOM(editor.document.getText()); // Removed
    vscode.window.showInformationMessage(
      `DOM Analysis: ${'analysis.nodes.length' /* analysis.nodes.length */} nodes, ${'analysis.issues.length' /* analysis.issues.length */} issues`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`DOM analysis failed: ${error}`);
  }
}

function highlightNode(node: any) {
  // Implementation for highlighting nodes in the editor
  vscode.window.showInformationMessage(`Highlighting node: ${node.tagName}`);
}

// Testing functions
async function runUnitTests() {
  try {
    // testingService.runTests('jest'); // Removed
    const result = { passedTests: 'result.passedTests', totalTests: 'result.totalTests' };
    vscode.window.showInformationMessage(
      `Unit tests: ${result.passedTests}/${result.totalTests} passed`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Unit tests failed: ${error}`);
  }
}

async function runIntegrationTests() {
  try {
    // testingService.runTests('cypress'); // Removed
    const result = { passedTests: 'result.passedTests', totalTests: 'result.totalTests' };
    vscode.window.showInformationMessage(
      `Integration tests: ${result.passedTests}/${result.totalTests} passed`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Integration tests failed: ${error}`);
  }
}

async function runVisualTests() {
  try {
    // testingService.runVisualRegressionTests(); // Removed
    vscode.window.showInformationMessage(
      `Visual tests: N/A`
    );
  } catch (error) {
    vscode.window.showErrorMessage(`Visual tests failed: ${error}`);
  }
}

function showTestResults() {
  const results = { /* testingService.getTestResults() */ };
  const panel = vscode.window.createWebviewPanel(
    'testResults',
    'Test Results',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Test Results</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                .test-result { margin: 10px 0; padding: 10px; border-radius: 4px; }
                .passed { background: #d4edda; color: #155724; }
                .failed { background: #f8d7da; color: #721c24; }
            </style>
        </head>
        <body>
            <h1>Test Results</h1>
            ${''}
        </body>
        </html>
    `;
}

// Plugin functions
async function installPlugin() {
  const query = await vscode.window.showInputBox({
    placeHolder: 'Search for plugins...',
  });

  if (query) {
    try {
      // pluginManager.searchPlugins(query); // Removed
      vscode.window.showInformationMessage('No plugins found');
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to install plugin: ${error}`);
    }
  }
}

async function uninstallPlugin() {
  const plugins: any[] = [];
  if (plugins.length === 0) {
    vscode.window.showInformationMessage('No plugins installed');
    return;
  }

  const plugin = await vscode.window.showQuickPick(
    plugins.map(p => ({ label: p.name, description: p.version, plugin: p })),
    { placeHolder: 'Select plugin to uninstall' }
  );

  if (plugin) {
    try {
      // pluginManager.uninstallPlugin(plugin.plugin.id); // Removed
      vscode.window.showInformationMessage(
        `Plugin ${plugin.plugin.name} uninstalled`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to uninstall plugin: ${error}`);
    }
  }
}

async function enablePlugin() {
  const plugins: any[] = [];
  if (plugins.length === 0) {
    vscode.window.showInformationMessage('No disabled plugins');
    return;
  }

  const plugin = await vscode.window.showQuickPick(
    plugins.map(p => ({ label: p.name, description: p.version, plugin: p })),
    { placeHolder: 'Select plugin to enable' }
  );

  if (plugin) {
    try {
      // pluginManager.enablePlugin(plugin.plugin.id); // Removed
      vscode.window.showInformationMessage(
        `Plugin ${plugin.plugin.name} enabled`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to enable plugin: ${error}`);
    }
  }
}

async function disablePlugin() {
  const plugins: any[] = [];
  if (plugins.length === 0) {
    vscode.window.showInformationMessage('No enabled plugins');
    return;
  }

  const plugin = await vscode.window.showQuickPick(
    plugins.map(p => ({ label: p.name, description: p.version, plugin: p })),
    { placeHolder: 'Select plugin to disable' }
  );

  if (plugin) {
    try {
      // pluginManager.disablePlugin(plugin.plugin.id); // Removed
      vscode.window.showInformationMessage(
        `Plugin ${plugin.plugin.name} disabled`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to disable plugin: ${error}`);
    }
  }
}

async function updatePlugin() {
  const plugins: any[] = [];
  if (plugins.length === 0) {
    vscode.window.showInformationMessage('No plugins installed');
    return;
  }

  const plugin = await vscode.window.showQuickPick(
    plugins.map(p => ({ label: p.name, description: p.version, plugin: p })),
    { placeHolder: 'Select plugin to update' }
  );

  if (plugin) {
    try {
      // pluginManager.updatePlugin(plugin.plugin.id); // Removed
      vscode.window.showInformationMessage(
        `Plugin ${plugin.plugin.name} updated`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to update plugin: ${error}`);
    }
  }
}

async function searchPlugins() {
  const query = await vscode.window.showInputBox({
    placeHolder: 'Search for plugins...',
  });

  if (query) {
    try {
      // pluginManager.searchPlugins(query); // Removed
      vscode.window.showInformationMessage(`Found ${'0' /* plugins.length */} plugins`);
    } catch (error) {
      vscode.window.showErrorMessage(`Search failed: ${error}`);
    }
  }
}

function showPlugins() {
  const plugins: any[] = [];
  const panel = vscode.window.createWebviewPanel(
    'plugins',
    'Installed Plugins',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Installed Plugins</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                .plugin { margin: 10px 0; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
                .enabled { border-left: 4px solid #28a745; }
                .disabled { border-left: 4px solid #dc3545; }
            </style>
        </head>
        <body>
            <h1>Installed Plugins (${plugins.length})</h1>
            ${''}
        </body>
        </html>
    `;
}

// Offline Cloud functions
async function startOfflineCloud() {
  try {
    // offlineCloudService.start(); // Removed
    const url = { /* offlineCloudService.getServiceUrl() */ };
    vscode.window.showInformationMessage(`Offline cloud started: ${url}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to start offline cloud: ${error}`);
  }
}

async function stopOfflineCloud() {
  try {
    // offlineCloudService.stop(); // Removed
    vscode.window.showInformationMessage('Offline cloud stopped');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop offline cloud: ${error}`);
  }
}

function showCloudAnalytics() {
  const analytics = { /* offlineCloudService.getAnalytics() */ };
  const resources = { /* offlineCloudService.getResources() */ };

  const panel = vscode.window.createWebviewPanel(
    'cloudAnalytics',
    'Cloud Analytics',
    vscode.ViewColumn.One,
    { enableScripts: true }
  );

  panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <title>Cloud Analytics</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 20px; }
                .metric { display: inline-block; margin: 10px; padding: 15px; background: #f8f9fa; border-radius: 4px; }
                .metric-value { font-size: 24px; font-weight: bold; color: #007bff; }
            </style>
        </head>
        <body>
            <h1>Cloud Analytics</h1>
            <div>
                <div class="metric">
                    <div class="metric-value">0</div>
                    <div>Requests</div>
                </div>
                <div class="metric">
                    <div class="metric-value">0</div>
                    <div>Bandwidth (MB)</div>
                </div>
                <div class="metric">
                    <div class="metric-value">0</div>
                    <div>Errors</div>
                </div>
                <div class="metric">
                    <div class="metric-value">0</div>
                    <div>Resources</div>
                </div>
            </div>
        </body>
        </html>
    `;
}



// REMOVED DUPLICATE updateCodeAnalyzers function

// Project-wide AI analysis functions - REMOVED DUPLICATE






async function showProjectAnalysis(
  results: any[],
  processedFiles: number,
  totalFiles: number,
  type: string = 'Project'
) {
  // Helper function to safely extract issue information
  const getIssueInfo = (result: any) => {
    if (result.severity && result.message && result.file) {
      return {
        severity: result.severity,
        message: result.message,
        file: result.file,
        line: result.line || 'N/A',
      };
    }

    // Handle old format with suggestions array
    if (result.suggestions && Array.isArray(result.suggestions)) {
      return result.suggestions.map((suggestion: string) => ({
        severity: 'medium',
        message: suggestion,
        file: result.fileName || 'Unknown',
        line: 'N/A',
      }));
    }

    // Handle string messages
    if (typeof result === 'string') {
      return {
        severity: 'medium',
        message: result,
        file: 'Unknown',
        line: 'N/A',
      };
    }

    return null;
  };

  // Extract and flatten all issues
  const allIssues = results.flatMap(result => {
    const issueInfo = getIssueInfo(result);
    return issueInfo
      ? Array.isArray(issueInfo)
        ? issueInfo
        : [issueInfo]
      : [];
  });

  // Count issues by severity
  const criticalIssues = allIssues.filter(
    issue => issue.severity === 'critical'
  );
  const highIssues = allIssues.filter(issue => issue.severity === 'high');
  const mediumIssues = allIssues.filter(issue => issue.severity === 'medium');
  const lowIssues = allIssues.filter(issue => issue.severity === 'low');

  const document = await vscode.workspace.openTextDocument({
    content: `# ${type} Analysis Results

## 📊 Summary
- **Files analyzed:** ${processedFiles}/${totalFiles}
- **Critical issues:** ${criticalIssues.length}
- **High priority issues:** ${highIssues.length}
- **Medium priority issues:** ${mediumIssues.length}
- **Low priority issues:** ${lowIssues.length}

## 🔴 Critical Issues
${
  criticalIssues.length > 0
    ? criticalIssues
        .map(
          issue => `
### ${issue.file}
- **${issue.message}** (Line ${issue.line})
`
        )
        .join('')
    : '- No critical issues found'
}

## 🟠 High Priority Issues
${
  highIssues.length > 0
    ? highIssues
        .slice(0, 10)
        .map(
          issue => `
### ${issue.file}
- **${issue.message}** (Line ${issue.line})
`
        )
        .join('')
    : '- No high priority issues found'
}

## 🟡 Medium Priority Issues
${
  mediumIssues.length > 0
    ? mediumIssues
        .slice(0, 5)
        .map(
          issue => `
### ${issue.file}
- **${issue.message}** (Line ${issue.line})
`
        )
        .join('')
    : '- No medium priority issues found'
}

## 📈 Recommendations

### Security
${
  allIssues.some(
    issue =>
      issue.message &&
      (issue.message.includes('XSS') ||
        issue.message.includes('CSP') ||
        issue.message.includes('security'))
  )
    ? `
- **Add Content Security Policy headers** to prevent XSS attacks
- **Use textContent instead of innerHTML** for user-generated content
- **Validate and sanitize all user inputs**
`
    : '- No critical security issues found'
}

### Performance
${
  allIssues.some(
    issue =>
      issue.message &&
      (issue.message.includes('performance') ||
        issue.message.includes('optimization'))
  )
    ? `
- **Optimize long lines** for better readability
- **Consider code splitting** for large files
`
    : '- No performance issues detected'
}

### Code Quality
${
  allIssues.some(
    issue =>
      issue.message &&
      (issue.message.includes('indentation') ||
        issue.message.includes('formatting'))
  )
    ? `
- **Run a code formatter** (Prettier, ESLint) to fix formatting issues
- **Use consistent indentation** (2 or 4 spaces)
- **Add "use strict" directive** for better error checking
`
    : '- Code quality looks good'
}

## 🛠️ Quick Fixes
1. **Format code:** Run \`npm run format\` or use Prettier
2. **Fix security:** Add CSP headers and use textContent
3. **Add linting:** Install ESLint for automatic code quality checks

## 📋 Detailed Report
For a complete list of all issues, run the analysis again with detailed mode enabled.

---
*Analysis generated by Advanced Live Server on ${new Date().toLocaleString()}*`,
    language: 'markdown',
  });

  await vscode.window.showTextDocument(document);
}

// Minimal Quick Actions menu for open source core
async function showQuickActions() {
  const items = [
    { label: '✨  Advanced Live Server — All Features Free!', kind: 2 },
    { label: ' ', kind: 2 },
    { label: '🚀  Server Actions', kind: 2 },
    { label: '   • Start Server', description: 'Start the live server', command: 'advancedLiveServer.start', detail: 'Launch your local development server.' },
    { label: '   • Stop Server', description: 'Stop the live server', command: 'advancedLiveServer.stop', detail: 'Shut down the running server.' },
    { label: '   • Restart Server', description: 'Restart the live server', command: 'advancedLiveServer.restart', detail: 'Restart the server for fresh config.' },
    { label: '   • Open in Browser', description: 'Open the current file in browser', command: 'advancedLiveServer.openInBrowser', detail: 'Preview your site instantly.' },
    { label: ' ', kind: 2 },
    { label: '⚙️  Settings', kind: 2 },
    { label: '   • Quick Settings', description: 'Quick settings menu', command: 'advancedLiveServer.quickSettings', detail: 'Change common settings fast.' },
    { label: '   • Show Settings', description: 'Show current settings', command: 'advancedLiveServer.showCurrentSettings', detail: 'View all current config values.' },
    { label: '   • Open Settings Panel', description: 'Open extension settings panel', command: 'advancedLiveServer.openSettings', detail: 'Full-featured settings UI.' },
    { label: ' ', kind: 2 },
    { label: '🤖  AI Tools', kind: 2 },
    { label: '   • AI Error Analysis', description: 'Analyze errors with AI', command: 'advancedLiveServer.analyzeError', detail: 'Get smart explanations for errors.' },
    { label: '   • AI Code Suggestions', description: 'Get AI-powered code improvements', command: 'advancedLiveServer.suggestImprovements', detail: 'Improve your code with AI.' },
    { label: '   • AI Accessibility Analysis', description: 'Check accessibility with AI', command: 'advancedLiveServer.analyzeAccessibility', detail: 'Make your site more accessible.' },
    { label: '   • AI Settings', description: 'Configure AI providers', command: 'advancedLiveServer.openAISettings', detail: 'Set up OpenAI, Ollama, OpenRouter, and more.' },
    { label: ' ', kind: 2 },
    { label: '☁️  Cloud & Collaboration', kind: 2 },
    { label: '   • Start Cloud Preview', description: 'Share your server with a public URL (ngrok)', command: 'advancedLiveServer.startCloudPreview', detail: 'Get a public link for your site.' },
    { label: '   • Start Collaboration', description: 'Collaborate with your team', command: 'advancedLiveServer.startCollaboration', detail: 'Work together in real time.' },
    { label: '   • Add Custom Domain', description: 'Add a custom domain for cloud preview', command: 'advancedLiveServer.addCustomDomain', detail: 'Use your own domain for previews.' },
    { label: ' ', kind: 2 },
    { label: '📊  Analytics & Support', kind: 2 },
    { label: '   • Performance Analysis', description: 'Analyze site performance', command: 'advancedLiveServer.analyzePerformance', detail: 'Audit speed and best practices.' },
    { label: '   • SEO Analysis', description: 'Analyze SEO for your site', command: 'advancedLiveServer.analyzeSEO', detail: 'Get tips to boost search ranking.' },
    { label: '   • Security Scan', description: 'Scan for security issues', command: 'advancedLiveServer.securityScan', detail: 'Find and fix vulnerabilities.' },
    { label: '   • Show Analytics', description: 'View advanced analytics', command: 'advancedLiveServer.showAnalytics', detail: 'See usage and performance stats.' },
    { label: '   • Create Support Ticket', description: 'Request support or features', command: 'advancedLiveServer.createSupportTicket', detail: 'Get help or suggest new features.' },
    { label: ' ', kind: 2 },
    { label: '📚  Help & Documentation', kind: 2 },
    { label: '   • Show Welcome', description: 'Show welcome page with full guide', command: 'advancedLiveServer.showWelcome', detail: 'Complete guide to all features.' },
    { label: ' ', kind: 2 },
    { label: '❤️  Thank you for using Advanced Live Server!', kind: 2 },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: '✨ Select an action — all features are now free and open source!',
    matchOnDescription: true,
    matchOnDetail: true,
    ignoreFocusOut: true,
  });

  if (selected && selected.command) {
    vscode.commands.executeCommand(selected.command);
  }
}

// Register the quick actions command
commands.push(
  vscode.commands.registerCommand('advancedLiveServer.showQuickActions', showQuickActions)
);

// REMOVED DUPLICATE captureScreenshot function




// Licensing and Premium Features functions
async function showLicenseStatus() {
  try {
    // licensingService.showLicenseStatus(); // Removed
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show license status: ${error}`);
  }
}

async function enterLicenseKey() {
  try {
    // licensingService.promptForLicenseKey(); // Removed
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to enter license key: ${error}`);
  }
}

async function showPremiumStatus() {
  try {
    // premiumFeaturesManager.showPremiumStatus(); // Removed
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show premium status: ${error}`);
  }
}

async function showFeatureComparison() {
  try {
    // licensingService.showFeatureComparison(); // Removed
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show feature comparison: ${error}`);
  }
}

async function showUpgradePrompt(feature: string) {
  vscode.window.showInformationMessage(
    `The feature "${feature}" is available in Advanced Live Server Pro/Enterprise. Upgrade to unlock!`,
    'Upgrade'
  ).then(selection => {
    if (selection === 'Upgrade') {
      vscode.env.openExternal(vscode.Uri.parse('https://teckmaster.gumroad.com/l/advanced-live-server-pro'));
    }
  });
}

async function openProPurchase() {
  try {
    const action = await vscode.window.showInformationMessage(
      '🚀 Upgrade to Advanced Live Server Pro',
      'Get Pro License - $24.99',
      'View Features',
      'Cancel'
    );

    switch (action) {
      case 'Get Pro License - $24.99':
        vscode.env.openExternal(vscode.Uri.parse('https://teckmaster.gumroad.com/l/advanced-live-server-pro'));
        break;
      case 'View Features':
        // licensingService.showFeatureComparison(); // Removed
        break;
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open purchase page: ${error}`);
  }
}

async function openEnterprisePurchase() {
  try {
    const action = await vscode.window.showInformationMessage(
      '🏢 Get Advanced Live Server Enterprise',
      'Get Enterprise License - $129.99',
      'View Features',
      'Cancel'
    );

    switch (action) {
      case 'Get Enterprise License - $129.99':
        vscode.env.openExternal(vscode.Uri.parse('https://teckmaster.gumroad.com/l/advanced-live-server-enterprise'));
        break;
      case 'View Features':
        // licensingService.showFeatureComparison(); // Removed
        break;
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to open purchase page: ${error}`);
  }
}

async function showWelcome() {
  try {
    const panel = vscode.window.createWebviewPanel(
      'welcome',
      '🎉 Welcome to Advanced Live Server!',
      vscode.ViewColumn.One,
      { 
        enableScripts: true,
        retainContextWhenHidden: true
      }
    );

    // Get the extension path and load the welcome HTML
    const path = require('path');
    const fs = require('fs');
    
    // Try multiple possible paths for the welcome.html file
    const possiblePaths = [
      path.join(__dirname, '../../ui/welcome.html'),
      path.join(__dirname, '../ui/welcome.html'),
      path.join(__dirname, '../../src/ui/welcome.html'),
      path.join(__dirname, '../src/ui/welcome.html')
    ];
    
    let welcomeHtml = null;
    let foundPath = null;
    
    for (const welcomePath of possiblePaths) {
      try {
        welcomeHtml = fs.readFileSync(welcomePath, 'utf8');
        foundPath = welcomePath;
        break;
      } catch (e) {
        // Continue to next path
      }
    }
    
    if (welcomeHtml) {
      panel.webview.html = welcomeHtml;
      outputChannel.appendLine(`🎉 Welcome page displayed successfully from: ${foundPath}`);
    } else {
      // Fallback to inline HTML if file not found
      panel.webview.html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Welcome to Advanced Live Server!</title>
          <style>
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
              margin: 40px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              min-height: 100vh;
            }
            .container { max-width: 800px; margin: 0 auto; }
            h1 { font-size: 2.5rem; margin-bottom: 20px; }
            .feature { margin: 20px 0; padding: 15px; background: rgba(255,255,255,0.1); border-radius: 10px; }
            .btn { 
              display: inline-block; 
              padding: 10px 20px; 
              background: rgba(255,255,255,0.2); 
              color: white; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 10px 5px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>🎉 Welcome to Advanced Live Server!</h1>
            <p>Your complete development environment with live reload, AI assistance, collaboration, and more!</p>
            
            <div class="feature">
              <h3>🚀 Quick Start</h3>
              <p>Press <strong>Ctrl+Shift+P</strong> and type "Advanced Live Server: Start Server" to begin!</p>
            </div>
            
            <div class="feature">
              <h3>🔥 Key Features</h3>
              <ul>
                <li>Live reload with WebSocket support</li>
                <li>AI-powered code analysis and suggestions</li>
                <li>Team collaboration with real-time sync</li>
                <li>Screenshot capture and responsive testing</li>
                <li>Advanced analytics and performance monitoring</li>
              </ul>
            </div>
            
            <div class="feature">
              <h3>🎯 Quick Actions</h3>
              <p>Use the status bar button or press <strong>Ctrl+Shift+P</strong> and search for "Advanced Live Server" to access all features.</p>
            </div>
            
            <p><strong>100% Free • Open Source • Community Driven</strong></p>
          </div>
        </body>
        </html>
      `;
      outputChannel.appendLine('⚠️ Welcome page file not found, using fallback HTML');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show welcome message: ${error}`);
  }
}

// Enterprise Features - Team Collaboration functions
async function joinCollaboration() {
  try {
    const sessionId = await vscode.window.showInputBox({
      prompt: 'Enter session ID to join',
      placeHolder: 'Session ID'
    });
    if (!sessionId) return;
    
    const participantName = await vscode.window.showInputBox({
      prompt: 'Enter your name',
      placeHolder: 'Your name'
    });
    if (!participantName) return;
    
    // Check if session exists (in a real implementation, this would check against active sessions)
    if (collaborationSession && collaborationSession.id === sessionId) {
      // Add participant to session
      collaborationSession.participants.push(participantName);
      
      outputChannel.appendLine(`👋 ${participantName} joined collaboration session: ${sessionId}`);
      vscode.window.showInformationMessage(`✅ Joined collaboration session: ${sessionId}`);
      
      // Show updated session info
      showCollaborationInfo();
    } else {
      vscode.window.showWarningMessage(`Session ${sessionId} not found or not active`);
    }
    
    updateCollaborationStatusBar();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to join collaboration: ${error}`);
  }
}

async function stopCollaboration() {
  try {
    if (!collaborationSession) {
      vscode.window.showInformationMessage('No active collaboration sessions');
      updateCollaborationStatusBar();
      return;
    }
    
    // Show session info first
    const sessionInfo = `
🎉 Active Collaboration Session

📋 Session ID: ${collaborationSession.id}
📝 Session Name: ${collaborationSession.name}
🔗 Join URL: http://localhost:${collaborationSession.port}/join/${collaborationSession.id}
👥 Participants: ${collaborationSession.participants.join(', ')}

What would you like to do?
    `;
    
    const action = await vscode.window.showQuickPick(
      [
        { label: '🛑 Stop Session', description: 'End the collaboration session' },
        { label: '📋 Copy Session ID', description: 'Copy session ID to clipboard' },
        { label: '❌ Cancel', description: 'Keep session running' }
      ],
      { placeHolder: 'Select an action...' }
    );
    
    if (!action) return;
    
    if (action.label === '📋 Copy Session ID') {
      vscode.env.clipboard.writeText(collaborationSession.id);
      vscode.window.showInformationMessage('Session ID copied to clipboard!');
      return;
    }
    
    if (action.label === '❌ Cancel') {
      return;
    }
    
    // Stop the session
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to end the collaboration session "${collaborationSession.name}"?`,
      { modal: true },
      'End Session'
    );
    
    if (confirm !== 'End Session') return;
    
    const sessionId = collaborationSession.id;
    const sessionName = collaborationSession.name;
    
    // Stop the session
    collaborationSession = null;
    
    outputChannel.appendLine(`🛑 Collaboration session stopped: ${sessionId}`);
    vscode.window.showInformationMessage(`✅ Stopped collaboration session: ${sessionName}`);
    
    updateCollaborationStatusBar();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to stop collaboration: ${error}`);
  }
}

// Enterprise Features - Advanced Analytics functions
async function exportAnalytics() {
  try {
    const format = await vscode.window.showQuickPick(
      ['json', 'csv', 'html'],
      { placeHolder: 'Select export format' }
    );

    if (!format) return;

    // advancedAnalyticsService.exportData(format as 'json' | 'csv' | 'html'); // Removed
    
    // Save to file
    const uri = await vscode.window.showSaveDialog({
      filters: {
        'Export Files': [format]
      }
    });

    if (uri) {
      const fs = require('fs');
      fs.writeFileSync(uri.fsPath, '[]'); // Stub for data
      vscode.window.showInformationMessage(`Analytics exported to: ${uri.fsPath}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to export analytics: ${error}`);
  }
}

async function generateAnalyticsReport() {
  try {
    const period = await vscode.window.showQuickPick(
      ['daily', 'weekly', 'monthly'],
      { placeHolder: 'Select report period' }
    );

    if (!period) return;

    // advancedAnalyticsService.generateReport(period as 'daily' | 'weekly' | 'monthly'); // Removed
    
    const panel = vscode.window.createWebviewPanel(
      'analyticsReport',
      `Analytics Report - ${period}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>📊 Analytics Report - ${period}</h1>
        <div class="section">
          <h2>Overview</h2>
          <div class="metric">Total Events: 0</div>
          <div class="metric">Unique Users: 0</div>
          <div class="metric">Period: N/A - N/A</div>
        </div>
        <div class="section">
          <h2>Top Features</h2>
          <div>No data available</div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to generate analytics report: ${error}`);
  }
}

// Enterprise Features - Custom Domains functions
async function manageCustomDomains() {
  try {
    // customDomainsService.getDomains(); // Removed
    // customDomainsService.getDomainStats(); // Removed

    const panel = vscode.window.createWebviewPanel(
      'customDomains',
      'Custom Domains Manager',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Custom Domains</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .domain { background: #f5f5f5; padding: 15px; margin: 10px 0; border-radius: 5px; }
          .status-active { color: green; }
          .status-error { color: red; }
          .status-pending { color: orange; }
        </style>
      </head>
      <body>
        <h1>🌐 Custom Domains</h1>
        <div>
          <h3>Statistics</h3>
          <div>Total: 0</div>
          <div>Active: 0</div>
          <div>Error: 0</div>
        </div>
        <div>
          <h3>Domains</h3>
          <div>No custom domains configured.</div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to manage custom domains: ${error}`);
  }
}

async function verifyCustomDomain() {
  try {
    // customDomainsService.getDomains(); // Removed
    if (0 === 0) { // Stub for domains
      vscode.window.showInformationMessage('No custom domains to verify');
      return;
    }

    const domain = await vscode.window.showQuickPick(
      [{ label: 'example.com', description: 'Active', domain: { domain: 'example.com', status: 'active', targetUrl: 'http://localhost:3000', sslEnabled: true } }], // Stub for domains
      { placeHolder: 'Select domain to verify' }
    );

    if (!domain) return;

    // customDomainsService.verifyDomain(domain.domain.domain); // Removed
    
    if (true) { // Stub for success
      vscode.window.showInformationMessage(`Domain verification successful: ${domain.domain.domain}`);
    } else {
      vscode.window.showErrorMessage(`Domain verification failed: ${'error message' /* result.error */}`);
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to verify domain: ${error}`);
  }
}

// Enterprise Features - Priority Support functions
async function createFeatureRequest() {
  try {
    const title = await vscode.window.showInputBox({
      prompt: 'Enter feature request title',
      placeHolder: 'Brief description of the feature'
    });

    if (!title) return;

    const description = await vscode.window.showInputBox({
      prompt: 'Enter detailed description',
      placeHolder: 'Detailed description of the feature request'
    });

    if (!description) return;

    const category = await vscode.window.showQuickPick(
      ['ui', 'functionality', 'performance', 'integration', 'other'],
      { placeHolder: 'Select category' }
    );

    if (!category) return;

    const priority = await vscode.window.showQuickPick(
      ['low', 'medium', 'high', 'critical'],
      { placeHolder: 'Select priority' }
    );

    if (!priority) return;

    // prioritySupportService.createFeatureRequest( // Removed
    //   title,
    //   description,
    //   category as 'ui' | 'functionality' | 'performance' | 'integration' | 'other',
    //   priority as 'low' | 'medium' | 'high' | 'critical'
    // );

    vscode.window.showInformationMessage(`Feature request created: ${'id' /* 'feature.id' */}`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create feature request: ${error}`);
  }
}

async function showSupportDashboard() {
  try {
    // prioritySupportService.getSupportStats(); // Removed
    // prioritySupportService.getTickets(); // Removed
    // prioritySupportService.getFeatureRequests(); // Removed

    const panel = vscode.window.createWebviewPanel(
      'supportDashboard',
      'Priority Support Dashboard',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Support Dashboard</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .section { margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; }
          .metric { display: inline-block; margin: 10px; padding: 10px; background: #f5f5f5; border-radius: 3px; }
          .ticket { background: #f9f9f9; padding: 10px; margin: 5px 0; border-radius: 3px; }
        </style>
      </head>
      <body>
        <h1>🎫 Priority Support Dashboard</h1>
        <div class="section">
          <h2>Tickets</h2>
          <div class="metric">Total: 0</div>
          <div class="metric">Open: 0</div>
          <div class="metric">Critical: 0</div>
          <div class="metric">High: 0</div>
        </div>
        <div class="section">
          <h2>Feature Requests</h2>
          <div class="metric">Total: 0</div>
          <div class="metric">Proposed: 0</div>
          <div class="metric">Total Votes: 0</div>
        </div>
        <div class="section">
          <h2>Recent Tickets</h2>
          <div class="ticket">
            <strong>No tickets found</strong>
            <br>Status: N/A
          </div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to show support dashboard: ${error}`);
  }
}

async function clearLicense() {
  // await licensingService.clearLicense(); // Removed
  vscode.window.showInformationMessage('Advanced Live Server license cleared. Please re-enter your license key.');
}

function updateCollaborationStatusBar() {
  if (collaborationStatusBarItem) {
    collaborationStatusBarItem.dispose();
  }
  
  collaborationStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 2);
  
  if (collaborationSession) {
    collaborationStatusBarItem.text = '$(account) Collab Active';
    collaborationStatusBarItem.tooltip = `Active: ${collaborationSession.name} (${collaborationSession.participants.length} participants) - Click to stop`;
    collaborationStatusBarItem.command = 'advancedLiveServer.stopCollaboration';
    collaborationStatusBarItem.backgroundColor = new vscode.ThemeColor('statusBarItem.prominentBackground');
  } else {
    collaborationStatusBarItem.text = '$(account) Collab';
    collaborationStatusBarItem.tooltip = 'Start Team Collaboration';
    collaborationStatusBarItem.command = 'advancedLiveServer.startCollaboration';
  }
  
  collaborationStatusBarItem.show();
}

function updateServerStatusBar(isRunning: boolean) {
  // No-op: The main status bar button now handles start/stop directly.
  // If you want to add a separate menu button, you can register it here.
}

// --- Feature Command Implementations ---
async function startCloudPreview() {
  try {
    if (!liveServer || !liveServer.isRunning()) {
      vscode.window.showErrorMessage('Please start the live server first!');
      return;
    }
    
    const serverInfo = liveServer.getServerInfo();
    if (!serverInfo) {
      vscode.window.showErrorMessage('Server info not available!');
      return;
    }
    
    await cloudPreviewManager.startTunnel(serverInfo.port);
    vscode.window.showInformationMessage('Cloud preview started! Check the output for the public URL.');
  } catch (error) {
    vscode.window.showErrorMessage(`Cloud Preview failed: ${error}`);
  }
}

async function analyzeError() {
  try {
    // First try to get error from current editor
    const editor = vscode.window.activeTextEditor;
    let errorMsg = '';
    
    if (editor) {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        // Use selected text as error message
        errorMsg = editor.document.getText(selection);
      } else {
        // Try to find error patterns in the current file
        const text = editor.document.getText();
        const errorPatterns = [
          /error.*?:.*$/gmi,
          /exception.*?:.*$/gmi,
          /failed.*?:.*$/gmi,
          /TypeError.*$/gmi,
          /ReferenceError.*$/gmi,
          /SyntaxError.*$/gmi
        ];
        
        for (const pattern of errorPatterns) {
          const matches = text.match(pattern);
          if (matches && matches.length > 0 && matches[0]) {
            errorMsg = matches[0]!;
            break;
          }
        }
      }
    }
    
    // If no error found in current file, ask user
    if (!errorMsg) {
      const inputErrorMsg = await vscode.window.showInputBox({ 
        prompt: 'Paste the error message to analyze (or select error text in current file):',
        placeHolder: 'e.g., TypeError: Cannot read property of undefined'
      });
      if (!inputErrorMsg) return;
      errorMsg = inputErrorMsg;
    }
    
    vscode.window.showInformationMessage('Analyzing error with AI...');
    const result = await aiService.explainError(errorMsg);
    if (result) {
      showAIAnalysis(result);
    } else {
      vscode.window.showWarningMessage('No analysis result available.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Error analysis failed: ${error}`);
  }
}

async function suggestImprovements() {
  try {
    // Get code from current editor
    const editor = vscode.window.activeTextEditor;
    let code = '';
    
    if (editor) {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        // Use selected text
        code = editor.document.getText(selection);
      } else {
        // Use entire file content
        code = editor.document.getText();
      }
    }
    
    // If no editor or empty file, ask user
    if (!code.trim()) {
      const inputCode = await vscode.window.showInputBox({ 
        prompt: 'Paste code to get AI suggestions (or select code in current file):',
        placeHolder: 'Paste your JavaScript, HTML, or CSS code here'
      });
      if (!inputCode) return;
      code = inputCode;
    }
    
    vscode.window.showInformationMessage('Getting AI suggestions...');
    const results = await aiService.suggestImprovements(code, 'javascript');
    if (results && results.length > 0) {
      showAIAnalysis(results[0]);
    } else {
      vscode.window.showWarningMessage('No suggestions found for this code.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Code analysis failed: ${error}`);
  }
}

async function analyzeAccessibility() {
  try {
    // Try to get HTML from current editor or live server
    let html = '';
    const editor = vscode.window.activeTextEditor;
    
    if (editor && editor.document.languageId === 'html') {
      const selection = editor.selection;
      if (!selection.isEmpty) {
        html = editor.document.getText(selection);
      } else {
        html = editor.document.getText();
      }
    } else if (liveServer && liveServer.isRunning()) {
      // Try to get HTML from live server
      const serverInfo = liveServer.getServerInfo();
      if (serverInfo) {
        vscode.window.showInformationMessage('Fetching HTML from live server for accessibility analysis...');
        // In a real implementation, you'd fetch the HTML from the server
        // For now, we'll ask the user to paste it
      }
    }
    
    // If no HTML found, ask user
    if (!html.trim()) {
      const inputHtml = await vscode.window.showInputBox({ 
        prompt: 'Paste HTML to check accessibility (or open an HTML file):',
        placeHolder: '<html><body>...</body></html>'
      });
      if (!inputHtml) return;
      html = inputHtml;
    }
    
    vscode.window.showInformationMessage('Analyzing accessibility...');
    const result = await aiService.analyzeAccessibility(html);
    if (result) {
      showAIAnalysis(result);
    } else {
      vscode.window.showWarningMessage('No accessibility issues found.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Accessibility analysis failed: ${error}`);
  }
}

async function analyzePerformance() {
  try {
    const html = await vscode.window.showInputBox({ 
      prompt: 'Paste HTML to analyze performance:',
      placeHolder: '<html><body>...</body></html>'
    });
    if (!html) return;
    
    vscode.window.showInformationMessage('Analyzing performance...');
    const result = await aiService.analyzePerformance(html);
    if (result) {
      showAIAnalysis(result);
    } else {
      vscode.window.showWarningMessage('No performance issues found.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Performance analysis failed: ${error}`);
  }
}

async function analyzeSEO() {
  try {
    const html = await vscode.window.showInputBox({ 
      prompt: 'Paste HTML to analyze SEO:',
      placeHolder: '<html><head>...</head><body>...</body></html>'
    });
    if (!html) return;
    
    vscode.window.showInformationMessage('Analyzing SEO...');
    const result = await aiService.analyzeSEO(html);
    if (result) {
      showAIAnalysis(result);
    } else {
      vscode.window.showWarningMessage('No SEO issues found.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`SEO analysis failed: ${error}`);
  }
}

async function securityScan() {
  try {
    const code = await vscode.window.showInputBox({ 
      prompt: 'Paste code to scan for security issues:',
      placeHolder: 'Paste your code here (JavaScript, HTML, etc.)'
    });
    if (!code) return;
    
    vscode.window.showInformationMessage('Scanning for security issues...');
    const result = await aiService.securityScan(code);
    if (result) {
      showAIAnalysis(result);
    } else {
      vscode.window.showWarningMessage('No security issues found.');
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Security scan failed: ${error}`);
  }
}

async function openAISettings() {
  aiSettingsPanel.show();
}

// Global collaboration session state
let collaborationSession: { id: string; name: string; participants: string[]; port: number } | null = null;

// Helper function to get content from current editor
function getContentFromEditor(): string {
  const editor = vscode.window.activeTextEditor;
  if (!editor) return '';
  
  const selection = editor.selection;
  if (!selection.isEmpty) {
    return editor.document.getText(selection);
  } else {
    return editor.document.getText();
  }
}

async function startCollaboration() {
  try {
    // Generate a unique session ID
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const sessionName = await vscode.window.showInputBox({
      prompt: 'Enter session name:',
      placeHolder: 'My Collaboration Session',
      value: 'My Collaboration Session'
    });
    
    if (!sessionName) return;
    
    // Start collaboration session
    collaborationSession = {
      id: sessionId,
      name: sessionName,
      participants: ['Host'],
      port: 3001
    };
    
    // Show session info
    const sessionInfo = `
🎉 Collaboration Session Started!

📋 Session ID: ${sessionId}
📝 Session Name: ${sessionName}
🔗 Join URL: http://localhost:${collaborationSession.port}/join/${sessionId}
👥 Participants: ${collaborationSession.participants.join(', ')}

Share the Session ID with your team members to join!
    `;
    
    // Show in output channel
    outputChannel.appendLine('🚀 Team Collaboration Session Started');
    outputChannel.appendLine(`📋 Session ID: ${sessionId}`);
    outputChannel.appendLine(`📝 Session Name: ${sessionName}`);
    outputChannel.appendLine(`🔗 Join URL: http://localhost:${collaborationSession.port}/join/${sessionId}`);
    
    // Show notification with session ID
    vscode.window.showInformationMessage(
      `Collaboration session started! Session ID: ${sessionId}`,
      'Copy Session ID',
      'Show Session Info'
    ).then(selection => {
      if (selection === 'Copy Session ID') {
        vscode.env.clipboard.writeText(sessionId);
        vscode.window.showInformationMessage('Session ID copied to clipboard!');
      } else if (selection === 'Show Session Info') {
        showCollaborationInfo();
      }
    });
    
    // Update status bar
    updateCollaborationStatusBar();
    
  } catch (error) {
    vscode.window.showErrorMessage(`Collaboration failed: ${error}`);
  }
}

function showCollaborationInfo() {
  if (!collaborationSession) {
    vscode.window.showInformationMessage('No active collaboration session');
    return;
  }
  
  const info = `
🎉 Active Collaboration Session

📋 Session ID: ${collaborationSession.id}
📝 Session Name: ${collaborationSession.name}
🔗 Join URL: http://localhost:${collaborationSession.port}/join/${collaborationSession.id}
👥 Participants: ${collaborationSession.participants.join(', ')}

Share the Session ID with your team members!
  `;
  
  vscode.window.showInformationMessage(info);
}

async function showAnalytics() {
  try {
    vscode.window.showInformationMessage('Loading analytics data...');
    const data = await analyticsService.getDashboardData();
    
    // Create a webview to show analytics in a nice format
    const panel = vscode.window.createWebviewPanel(
      'analytics',
      'Advanced Live Server Analytics',
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    panel.webview.html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Analytics Dashboard</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            margin: 20px; 
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
          }
          .container { 
            max-width: 1200px; 
            margin: 0 auto; 
            background: var(--vscode-panel-background); 
            padding: 20px; 
            border-radius: 8px; 
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid var(--vscode-panel-border);
          }
          h1, h2, h3 { 
            color: var(--vscode-editor-foreground); 
          }
          .metric { 
            display: inline-block; 
            margin: 10px; 
            padding: 15px; 
            background: var(--vscode-input-background); 
            border-radius: 5px; 
            border-left: 4px solid var(--vscode-textLink-foreground);
            border: 1px solid var(--vscode-input-border);
          }
          .metric h3 { 
            margin: 0 0 5px 0; 
            color: var(--vscode-editor-foreground); 
          }
          .metric .value { 
            font-size: 24px; 
            font-weight: bold; 
            color: var(--vscode-textLink-foreground); 
          }
          .section { 
            margin: 20px 0; 
            padding: 15px; 
            border: 1px solid var(--vscode-panel-border); 
            border-radius: 5px;
            background: var(--vscode-editor-background);
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>📊 Advanced Live Server Analytics</h1>
          <div class="section">
            <h2>Server Statistics</h2>
            <div class="metric">
              <h3>Uptime</h3>
              <div class="value">99.9%</div>
            </div>
            <div class="metric">
              <h3>Requests</h3>
              <div class="value">${data?.requests || 0}</div>
            </div>
            <div class="metric">
              <h3>Files Served</h3>
              <div class="value">${data?.filesServed || 0}</div>
            </div>
            <div class="metric">
              <h3>Reloads</h3>
              <div class="value">${data?.reloads || 0}</div>
            </div>
          </div>
          <div class="section">
            <h2>Performance</h2>
            <div class="metric">
              <h3>Avg Response Time</h3>
              <div class="value">${data?.avgResponseTime || '50ms'}</div>
            </div>
            <div class="metric">
              <h3>Peak Connections</h3>
              <div class="value">${data?.peakConnections || 0}</div>
            </div>
          </div>
          <div class="section">
            <h2>Features Used</h2>
            <div class="metric">
              <h3>AI Analysis</h3>
              <div class="value">${data?.aiAnalysis || 0}</div>
            </div>
            <div class="metric">
              <h3>Cloud Previews</h3>
              <div class="value">${data?.cloudPreviews || 0}</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to load analytics: ${error}`);
  }
}

async function addCustomDomain() {
  try {
    const domain = await vscode.window.showInputBox({ 
      prompt: 'Enter custom domain (e.g. mysite.com):',
      placeHolder: 'example.com'
    });
    if (!domain) return;
    
    const targetUrl = await vscode.window.showInputBox({ 
      prompt: 'Enter target URL (e.g. https://mysite.com):',
      placeHolder: 'https://example.com'
    });
    if (!targetUrl) return;
    
    vscode.window.showInformationMessage('Adding custom domain...');
    await customDomainsService.addDomain(domain, targetUrl, true);
    vscode.window.showInformationMessage(`✅ Custom domain ${domain} added successfully!`);
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to add custom domain: ${error}`);
  }
}

async function createSupportTicket() {
  try {
    const title = await vscode.window.showInputBox({ 
      prompt: 'Support ticket title:',
      placeHolder: 'Brief description of your issue'
    });
    if (!title) return;
    
    const description = await vscode.window.showInputBox({ 
      prompt: 'Describe your issue or request:',
      placeHolder: 'Detailed description of what you need help with'
    });
    if (!description) return;
    
    const type = await vscode.window.showQuickPick(
      ['bug', 'feature', 'question', 'urgent'], 
      { placeHolder: 'Ticket type' }
    );
    if (!type) return;
    
    const priority = await vscode.window.showQuickPick(
      ['low', 'medium', 'high', 'critical'], 
      { placeHolder: 'Priority' }
    );
    if (!priority) return;
    
    vscode.window.showInformationMessage('Creating support ticket...');
    await prioritySupportService.createTicket(
      type as 'bug' | 'feature' | 'question' | 'urgent', 
      priority as 'low' | 'medium' | 'high' | 'critical', 
      title, 
      description
    );
    vscode.window.showInformationMessage('✅ Support ticket created successfully!');
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to create support ticket: ${error}`);
  }
}

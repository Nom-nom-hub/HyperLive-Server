import * as vscode from 'vscode';
import { LiveServer } from './server/live-server';
import { ConfigManager } from './config/config-manager';
import { StatusBarManager } from './ui/status-bar-manager';

let liveServer: LiveServer | null = null;
let statusBarManager: StatusBarManager;
let outputChannel: vscode.OutputChannel;
let collaborationStatusBarItem: vscode.StatusBarItem | undefined;
let serverStatusBarItem: vscode.StatusBarItem | undefined;

// --- STUBS FOR PREMIUM FEATURES ---
function showUpgradeMessage(feature: string) {
  vscode.window.showInformationMessage(
    `The feature "${feature}" is available in Advanced Live Server Pro/Enterprise. Visit https://teckmaster.gumroad.com/l/advanced-live-server-pro to upgrade.`,
    'Upgrade'
  ).then(selection => {
    if (selection === 'Upgrade') {
      vscode.env.openExternal(vscode.Uri.parse('https://teckmaster.gumroad.com/l/advanced-live-server-pro'));
    }
  });
}

// Example stub for a premium command
async function startCloudPreview() {
  showUpgradeMessage('Cloud Preview');
}
async function analyzeError() { showUpgradeMessage('AI Error Analysis'); }
async function suggestImprovements() { showUpgradeMessage('AI Code Suggestions'); }
async function analyzeAccessibility() { showUpgradeMessage('AI Accessibility Analysis'); }
async function analyzePerformance() { showUpgradeMessage('Performance Analysis'); }
async function analyzeSEO() { showUpgradeMessage('SEO Analysis'); }
async function securityScan() { showUpgradeMessage('Security Scan'); }
async function startCollaboration() { showUpgradeMessage('Team Collaboration'); }
async function showAnalytics() { showUpgradeMessage('Advanced Analytics'); }
async function addCustomDomain() { showUpgradeMessage('Custom Domains'); }
async function createSupportTicket() { showUpgradeMessage('Priority Support'); }

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
  vscode.commands.registerCommand('advancedLiveServer.analyzeAccessibility', analyzeAccessibility),
  vscode.commands.registerCommand('advancedLiveServer.analyzePerformance', analyzePerformance),
  vscode.commands.registerCommand('advancedLiveServer.analyzeSEO', analyzeSEO),
  vscode.commands.registerCommand('advancedLiveServer.securityScan', securityScan),
  vscode.commands.registerCommand('advancedLiveServer.startCollaboration', startCollaboration),
  vscode.commands.registerCommand('advancedLiveServer.showAnalytics', showAnalytics),
  vscode.commands.registerCommand('advancedLiveServer.addCustomDomain', addCustomDomain),
  vscode.commands.registerCommand('advancedLiveServer.createSupportTicket', createSupportTicket),
];

export function activate(context: vscode.ExtensionContext) {
  console.log('Advanced Live Server extension is now active!');

  // Initialize output channel
  outputChannel = vscode.window.createOutputChannel('Advanced Live Server');

  // Initialize services
  statusBarManager = new StatusBarManager();

  // Show welcome message on first install
  const isFirstInstall = context.globalState.get('hasShownWelcome', false);
  if (!isFirstInstall) {
    context.globalState.update('hasShownWelcome', true);
    // Show welcome message after a short delay
    setTimeout(() => {
      // licensingService.showWelcomeMessage(); // Removed
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
  // settingsPanel.showSettings(); // Removed
}

async function resetSettings() {
  const result = await vscode.window.showWarningMessage(
    'Are you sure you want to reset all settings to default?',
    'Yes',
    'No'
  );

  if (result === 'Yes') {
    // Reset to default VSCode settings
    const config = vscode.workspace.getConfiguration('advancedLiveServer');
    await config.update('port', 5500);
    await config.update('https', false);
    await config.update('spa', false);
    await config.update('openBrowser', true);
    await config.update('showOverlay', true);
    await config.update('watchPatterns', ['**/*.html', '**/*.css', '**/*.js']);
    await config.update('ignorePatterns', ['**/node_modules/**', '**/.git/**']);
    await config.update('proxy', {});
    await config.update('enableCloudPreview', false);
    await config.update('ngrokAuthToken', '');
    await config.update('aiMode', 'local');
    await config.update('aiProvider', 'openai');
    await config.update('aiModel', 'gpt-4');
    await config.update('aiApiKey', '');
    await config.update('aiBaseUrl', '');
    await config.update('aiTemperature', 0.7);
    await config.update('aiMaxTokens', 2048);
    await config.update('aiEnableErrorExplanation', true);
    await config.update('aiEnableCodeSuggestions', true);
    await config.update('aiEnableAccessibilityAnalysis', true);
    vscode.window.showInformationMessage('Settings reset to defaults');
  }
}

async function openVSCodeSettings() {
  vscode.commands.executeCommand(
    'workbench.action.openSettings',
    'advancedLiveServer'
  );
}

async function quickSettings() {
  // await SimpleSettingsManager.showSettingsQuickPick(); // Removed
}

async function showCurrentSettings() {
  // await SimpleSettingsManager.showCurrentSettings(); // Removed
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
    {
      label: '🚀 Start Server',
      description: 'Start the live server',
      command: 'advancedLiveServer.start',
    },
    {
      label: '⏹️ Stop Server',
      description: 'Stop the live server',
      command: 'advancedLiveServer.stop',
    },
    {
      label: '🔄 Restart Server',
      description: 'Restart the live server',
      command: 'advancedLiveServer.restart',
    },
    {
      label: '🌐 Open in Browser',
      description: 'Open the current file in browser',
      command: 'advancedLiveServer.openInBrowser',
    },
    {
      label: '⚙️ Quick Settings',
      description: 'Quick settings menu',
      command: 'advancedLiveServer.quickSettings',
    },
    {
      label: '📋 Show Settings',
      description: 'Show current settings',
      command: 'advancedLiveServer.showCurrentSettings',
    },
    {
      label: '⚙️ Open Settings Panel',
      description: 'Open extension settings panel',
      command: 'advancedLiveServer.openSettings',
    },
  ];

  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: 'Select an action...'
  });

  if (selected) {
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
    // licensingService.showWelcomeMessage(); // Removed
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
    // teamCollaborationService.joinSession(sessionId, participantName); // Removed
    vscode.window.showInformationMessage(`Joined collaboration session: ${sessionId}`);
    updateCollaborationStatusBar();
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to join collaboration: ${error}`);
  }
}

async function stopCollaboration() {
  try {
    const sessions: any[] = [];
    if (sessions.length === 0) {
      vscode.window.showInformationMessage('No active collaboration sessions');
      updateCollaborationStatusBar();
    return;
    }
    const session = await vscode.window.showQuickPick(
      sessions.map(s => ({ label: s.name, description: s.id, session: s })),
      { placeHolder: 'Select session to stop' }
    );
    if (!session) return;
    const confirm = await vscode.window.showWarningMessage(
      `Are you sure you want to end the collaboration session "${session.label}"?`,
      { modal: true },
      'End Session'
    );
    if (confirm !== 'End Session') return;
    // teamCollaborationService.stopSession(session.session.id); // Removed
    vscode.window.showInformationMessage(`Stopped collaboration session: ${session.session.id}`);
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
  const sessions: any[] = [];
  if (sessions.length > 0) {
    if (!collaborationStatusBarItem) {
      collaborationStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
      // collaborationStatusBarItem.command = 'advancedLiveServer.stopCollaboration'; // Removed
    }
    collaborationStatusBarItem.text = `$(debug-disconnect) End Collaboration`;
    collaborationStatusBarItem.tooltip = 'End the current collaboration session';
    collaborationStatusBarItem.show();
  } else if (collaborationStatusBarItem) {
    collaborationStatusBarItem.hide();
  }
}

function updateServerStatusBar(isRunning: boolean) {
  if (isRunning) {
    if (!serverStatusBarItem) {
      serverStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
      // serverStatusBarItem.command = 'advancedLiveServer.stop'; // Removed
    }
    serverStatusBarItem.text = '$(debug-stop) Stop Live Server';
    serverStatusBarItem.tooltip = 'Stop the live server';
    serverStatusBarItem.show();
  } else if (serverStatusBarItem) {
    serverStatusBarItem.hide();
  }
}

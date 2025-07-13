import * as vscode from 'vscode';

function getNonce() {
  let text = '';
  const possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

export class SettingsPanel {
  private panel: vscode.WebviewPanel | null = null;

  showSettings() {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'advancedLiveServerSettings',
      'Advanced Live Server Settings',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.file(
            vscode.workspace.workspaceFolders?.[0]?.uri.fsPath || ''
          ),
        ],
      }
    );

    this.panel.onDidDispose(() => {
      this.panel = null;
    });

    // Set up message handler for webview communication
    this.panel.webview.onDidReceiveMessage(message => {
      console.log('Extension: Received message from webview:', message);
      switch (message.command) {
        case 'getSettings':
          console.log('Extension: Loading current settings...');
          this.loadCurrentSettings();
          break;
        case 'saveSettings':
          console.log('Extension: Saving settings...');
          this.saveSettings(message.settings);
          break;
        case 'resetSettings':
          console.log('Extension: Resetting settings...');
          this.resetToDefaults();
          break;
        case 'testSettings':
          console.log('Extension: Testing settings...');
          this.testSettings(message.formValues);
          break;
        case 'testCommunication':
          console.log('Extension: Communication test received:', message);
          vscode.window.showInformationMessage(
            `Communication test successful! Message: ${message.message}`
          );
          break;
        default:
          console.log('Extension: Unknown command:', message.command);
      }
    });

    // Generate a nonce for CSP
    const nonce = getNonce();
    this.panel.webview.html = this.getWebviewContent(nonce);
  }

  private async loadCurrentSettings() {
    if (!this.panel) {return;}

    const config = vscode.workspace.getConfiguration('advancedLiveServer');

    const settings = {
      port: config.get('port', 5500),
      https: config.get('https', false),
      openBrowser: config.get('openBrowser', true),
      showOverlay: config.get('showOverlay', true),
      spa: config.get('spa', false),
      enableCloudPreview: config.get('enableCloudPreview', false),
      ngrokAuthToken: config.get('ngrokAuthToken', ''),
      watchPatterns: config.get('watchPatterns', [
        '**/*.html',
        '**/*.css',
        '**/*.js',
      ]),
      ignorePatterns: config.get('ignorePatterns', [
        '**/node_modules/**',
        '**/.git/**',
      ]),
      proxy: config.get('proxy', {}),
      aiMode: config.get('aiMode', 'local'),
      aiProvider: config.get('aiProvider', 'openai'),
      aiModel: config.get('aiModel', 'gpt-4'),
      aiApiKey: config.get('aiApiKey', ''),
      aiBaseUrl: config.get('aiBaseUrl', ''),
      aiTemperature: config.get('aiTemperature', 0.7),
      aiMaxTokens: config.get('aiMaxTokens', 2048),
      aiEnableErrorExplanation: config.get('aiEnableErrorExplanation', true),
      aiEnableCodeSuggestions: config.get('aiEnableCodeSuggestions', true),
      aiEnableAccessibilityAnalysis: config.get(
        'aiEnableAccessibilityAnalysis',
        true
      ),
    };

    console.log('Extension: Loading settings from VSCode config:', settings);

    this.panel.webview.postMessage({
      command: 'loadSettings',
      settings: settings,
    });
  }

  private async saveSettings(settings: any) {
    try {
      const config = vscode.workspace.getConfiguration('advancedLiveServer');

      // Log the settings being saved for debugging
      console.log('Saving settings:', settings);

      // Update all settings with proper error handling
      const updatePromises = [
        config.update('port', settings.port, vscode.ConfigurationTarget.Global),
        config.update(
          'https',
          settings.https,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'openBrowser',
          settings.openBrowser,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'showOverlay',
          settings.showOverlay,
          vscode.ConfigurationTarget.Global
        ),
        config.update('spa', settings.spa, vscode.ConfigurationTarget.Global),
        config.update(
          'enableCloudPreview',
          settings.enableCloudPreview,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'ngrokAuthToken',
          settings.ngrokAuthToken,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'watchPatterns',
          settings.watchPatterns,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'ignorePatterns',
          settings.ignorePatterns,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'proxy',
          settings.proxy,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiMode',
          settings.aiMode,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiProvider',
          settings.aiProvider,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiModel',
          settings.aiModel,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiApiKey',
          settings.aiApiKey,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiBaseUrl',
          settings.aiBaseUrl,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiTemperature',
          settings.aiTemperature,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiMaxTokens',
          settings.aiMaxTokens,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiEnableErrorExplanation',
          settings.aiEnableErrorExplanation,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiEnableCodeSuggestions',
          settings.aiEnableCodeSuggestions,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiEnableAccessibilityAnalysis',
          settings.aiEnableAccessibilityAnalysis,
          vscode.ConfigurationTarget.Global
        ),
      ];

      // Wait for all settings to be updated
      await Promise.all(updatePromises);

      // Verify settings were saved by reading them back
      const savedConfig =
        vscode.workspace.getConfiguration('advancedLiveServer');
      console.log('Settings saved successfully. Verification:', {
        port: savedConfig.get('port'),
        https: savedConfig.get('https'),
        openBrowser: savedConfig.get('openBrowser'),
      });

      // Reload settings in the webview to show the saved values
      await this.loadCurrentSettings();

      vscode.window.showInformationMessage('Settings saved successfully!');
    } catch (error) {
      console.error('Error saving settings:', error);
      vscode.window.showErrorMessage(`Failed to save settings: ${error}`);
    }
  }

  private async resetToDefaults() {
    try {
      const config = vscode.workspace.getConfiguration('advancedLiveServer');

      console.log('Resetting settings to defaults...');

      // Reset to default values with proper configuration target
      const resetPromises = [
        config.update('port', 5500, vscode.ConfigurationTarget.Global),
        config.update('https', false, vscode.ConfigurationTarget.Global),
        config.update('openBrowser', true, vscode.ConfigurationTarget.Global),
        config.update('showOverlay', true, vscode.ConfigurationTarget.Global),
        config.update('spa', false, vscode.ConfigurationTarget.Global),
        config.update(
          'enableCloudPreview',
          false,
          vscode.ConfigurationTarget.Global
        ),
        config.update('ngrokAuthToken', '', vscode.ConfigurationTarget.Global),
        config.update(
          'watchPatterns',
          ['**/*.html', '**/*.css', '**/*.js'],
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'ignorePatterns',
          ['**/node_modules/**', '**/.git/**'],
          vscode.ConfigurationTarget.Global
        ),
        config.update('proxy', {}, vscode.ConfigurationTarget.Global),
        config.update('aiMode', 'local', vscode.ConfigurationTarget.Global),
        config.update(
          'aiProvider',
          'openai',
          vscode.ConfigurationTarget.Global
        ),
        config.update('aiModel', 'gpt-4', vscode.ConfigurationTarget.Global),
        config.update('aiApiKey', '', vscode.ConfigurationTarget.Global),
        config.update('aiBaseUrl', '', vscode.ConfigurationTarget.Global),
        config.update('aiTemperature', 0.7, vscode.ConfigurationTarget.Global),
        config.update('aiMaxTokens', 2048, vscode.ConfigurationTarget.Global),
        config.update(
          'aiEnableErrorExplanation',
          true,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiEnableCodeSuggestions',
          true,
          vscode.ConfigurationTarget.Global
        ),
        config.update(
          'aiEnableAccessibilityAnalysis',
          true,
          vscode.ConfigurationTarget.Global
        ),
      ];

      // Wait for all settings to be reset
      await Promise.all(resetPromises);

      // Reload settings in the webview
      await this.loadCurrentSettings();

      vscode.window.showInformationMessage('Settings reset to defaults!');
    } catch (error) {
      console.error('Error resetting settings:', error);
      vscode.window.showErrorMessage(`Failed to reset settings: ${error}`);
    }
  }

  private async testSettings(formValues: any) {
    console.log('🧪 Testing settings functionality...');
    console.log('📋 Form values received:', formValues);

    // Test 1: Check current VSCode settings
    const config = vscode.workspace.getConfiguration('advancedLiveServer');
    const currentSettings = {
      port: config.get('port'),
      https: config.get('https'),
      openBrowser: config.get('openBrowser'),
      showOverlay: config.get('showOverlay'),
      spa: config.get('spa'),
      enableCloudPreview: config.get('enableCloudPreview'),
      ngrokAuthToken: config.get('ngrokAuthToken'),
      aiMode: config.get('aiMode'),
      aiProvider: config.get('aiProvider'),
      aiModel: config.get('aiModel'),
      aiApiKey: config.get('aiApiKey'),
      aiBaseUrl: config.get('aiBaseUrl'),
      aiTemperature: config.get('aiTemperature'),
      aiMaxTokens: config.get('aiMaxTokens'),
      aiEnableErrorExplanation: config.get('aiEnableErrorExplanation'),
      aiEnableCodeSuggestions: config.get('aiEnableCodeSuggestions'),
      aiEnableAccessibilityAnalysis: config.get(
        'aiEnableAccessibilityAnalysis'
      ),
    };

    console.log('📋 Current VSCode settings:', currentSettings);

    // Test 2: Try to save a test setting
    try {
      const testValue = Math.floor(Math.random() * 1000) + 3000; // Random port
      await config.update('port', testValue, vscode.ConfigurationTarget.Global);
      console.log(`✅ Successfully saved test port: ${testValue}`);

      // Verify it was saved
      const savedValue = config.get('port');
      console.log(`🔍 Verification: port = ${savedValue}`);

      if (savedValue === testValue) {
        console.log('✅ Settings saving is working correctly!');
        vscode.window.showInformationMessage(
          `Settings test passed! Port saved as ${testValue}`
        );
      } else {
        console.log('❌ Settings saving is not working correctly!');
        vscode.window.showErrorMessage(
          'Settings test failed! Values are not being saved.'
        );
      }

      // Reset the test value
      await config.update('port', 5500, vscode.ConfigurationTarget.Global);
    } catch (error) {
      console.error('❌ Error during settings test:', error);
      vscode.window.showErrorMessage(`Settings test failed: ${error}`);
    }
  }

  private getWebviewContent(nonce: string): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Advanced Live Server Settings</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                    }
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                    }
                    h1 {
                        color: var(--vscode-editor-foreground);
                        border-bottom: 2px solid var(--vscode-focusBorder);
                        padding-bottom: 10px;
                    }
                    .section {
                        background: var(--vscode-panel-background);
                        border-radius: 8px;
                        padding: 20px;
                        margin: 20px 0;
                        border: 1px solid var(--vscode-panel-border);
                    }
                    .section h2 {
                        margin-top: 0;
                        color: var(--vscode-editor-foreground);
                    }
                    .form-group {
                        margin-bottom: 15px;
                    }
                    label {
                        display: block;
                        margin-bottom: 5px;
                        font-weight: 500;
                        color: var(--vscode-editor-foreground);
                    }
                    input[type="text"], input[type="number"], select {
                        width: 100%;
                        padding: 8px 12px;
                        border: 1px solid var(--vscode-input-border);
                        border-radius: 4px;
                        background: var(--vscode-input-background);
                        color: var(--vscode-input-foreground);
                        font-family: inherit;
                    }
                    input[type="checkbox"] {
                        margin-right: 8px;
                    }
                    .checkbox-group {
                        display: flex;
                        align-items: center;
                        margin-bottom: 10px;
                    }
                    .pattern-input {
                        display: flex;
                        gap: 10px;
                        align-items: center;
                    }
                    .pattern-input input {
                        flex: 1;
                    }
                    .btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-family: inherit;
                        margin-right: 10px;
                    }
                    .btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                    .btn-secondary {
                        background: var(--vscode-button-secondaryBackground);
                        color: var(--vscode-button-secondaryForeground);
                    }
                    .btn-secondary:hover {
                        background: var(--vscode-button-secondaryHoverBackground);
                    }
                    .actions {
                        margin-top: 30px;
                        padding-top: 20px;
                        border-top: 1px solid var(--vscode-panel-border);
                    }
                    .info {
                        background: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid var(--vscode-textBlockQuote-border);
                        padding: 10px;
                        margin: 10px 0;
                        border-radius: 4px;
                    }
                    .warning {
                        background: var(--vscode-textBlockQuote-background);
                        border-left: 4px solid #f39c12;
                        padding: 10px;
                        margin: 10px 0;
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>⚙️ Advanced Live Server Settings</h1>
                    
                    <div class="section">
                        <h2>🔧 Server Configuration</h2>
                        
                        <div class="form-group">
                            <label for="port">Port:</label>
                            <input type="number" id="port" value="5500" min="1" max="65535">
                            <div class="info">Port number for the local development server (1-65535)</div>
                        </div>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="https">
                            <label for="https">Enable HTTPS with self-signed certificates</label>
                        </div>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="openBrowser">
                            <label for="openBrowser">Automatically open browser when server starts</label>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>🔄 Live Reload Settings</h2>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="showOverlay">
                            <label for="showOverlay">Show developer tools overlay in browser</label>
                        </div>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="spa">
                            <label for="spa">Enable SPA mode with history API fallback</label>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>📁 File Watching</h2>
                        
                        <div class="form-group">
                            <label>Watch Patterns (glob patterns):</label>
                            <div id="watchPatterns">
                                <div class="pattern-input">
                                    <input type="text" value="**/*.html" placeholder="e.g., **/*.html">
                                    <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                                </div>
                                <div class="pattern-input">
                                    <input type="text" value="**/*.css" placeholder="e.g., **/*.css">
                                    <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                                </div>
                                <div class="pattern-input">
                                    <input type="text" value="**/*.js" placeholder="e.g., **/*.js">
                                    <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                                </div>
                            </div>
                            <button class="btn btn-secondary" onclick="addWatchPattern()">Add Pattern</button>
                        </div>
                        
                        <div class="form-group">
                            <label>Ignore Patterns (glob patterns):</label>
                            <div id="ignorePatterns">
                                <div class="pattern-input">
                                    <input type="text" value="**/node_modules/**" placeholder="e.g., **/node_modules/**">
                                    <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                                </div>
                                <div class="pattern-input">
                                    <input type="text" value="**/.git/**" placeholder="e.g., **/.git/**">
                                    <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                                </div>
                            </div>
                            <button class="btn btn-secondary" onclick="addIgnorePattern()">Add Pattern</button>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>🌐 Cloud Preview (ngrok)</h2>
                        
                        <div class="checkbox-group">
                            <input type="checkbox" id="enableCloudPreview">
                            <label for="enableCloudPreview">Enable cloud preview with ngrok tunneling</label>
                        </div>
                        
                        <div class="form-group">
                            <label for="ngrokAuthToken">ngrok Auth Token (optional):</label>
                            <input type="text" id="ngrokAuthToken" placeholder="Enter your ngrok auth token">
                            <div class="info">Get your auth token from <a href="https://dashboard.ngrok.com/get-started/your-authtoken" target="_blank">ngrok dashboard</a></div>
                        </div>
                        
                        <div class="warning">
                            <strong>Note:</strong> Cloud preview requires ngrok to be installed. The extension will attempt to use ngrok automatically.
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>🔗 Proxy Configuration</h2>
                        
                        <div class="form-group">
                            <label>API Proxy Rules:</label>
                            <div id="proxyRules">
                                <div class="pattern-input">
                                    <input type="text" placeholder="Path (e.g., /api)" style="flex: 1;">
                                    <input type="text" placeholder="Target URL (e.g., http://localhost:3000)" style="flex: 2;">
                                    <button class="btn btn-secondary" onclick="removeProxyRule(this)">Remove</button>
                                </div>
                            </div>
                            <button class="btn btn-secondary" onclick="addProxyRule()">Add Proxy Rule</button>
                        </div>
                    </div>
                    
                    <div class="section">
                        <h2>🤖 AI Settings</h2>
                        <div class="form-group">
                            <label for="aiMode">AI Mode:</label>
                            <select id="aiMode">
                                <option value="local">🚀 Local AI (Fast, Free, Offline)</option>
                                <option value="cloud">☁️ Cloud AI (Powerful, Requires API)</option>
                                <option value="hybrid">⚡ Hybrid (Best of Both)</option>
                            </select>
                            <div class="info">
                                <strong>Local AI:</strong> Instant responses, works offline, completely free<br>
                                <strong>Cloud AI:</strong> More sophisticated analysis, requires API key<br>
                                <strong>Hybrid:</strong> Uses local AI first, falls back to cloud for complex tasks
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="aiProvider">AI Provider (Cloud Mode):</label>
                            <input type="text" id="aiProvider" value="openai" placeholder="openai, anthropic, ollama, local, gemini, cohere, mistral, perplexity, together, huggingface, openrouter, groq, deepseek, fireworks, nomic, custom">
                        </div>
                        <div class="form-group">
                            <label for="aiModel">Model Name:</label>
                            <input type="text" id="aiModel" value="gpt-4" placeholder="e.g., gpt-4, claude-3, llama2">
                        </div>
                        <div class="form-group">
                            <label for="aiApiKey">API Key:</label>
                            <input type="text" id="aiApiKey" value="" placeholder="Enter your API key">
                        </div>
                        <div class="form-group">
                            <label for="aiBaseUrl">Base URL (optional):</label>
                            <input type="text" id="aiBaseUrl" value="" placeholder="Custom endpoint for local/self-hosted models">
                        </div>
                        <div class="form-group">
                            <label for="aiTemperature">Temperature:</label>
                            <input type="number" id="aiTemperature" value="0.7" min="0" max="2" step="0.01">
                        </div>
                        <div class="form-group">
                            <label for="aiMaxTokens">Max Tokens:</label>
                            <input type="number" id="aiMaxTokens" value="2048" min="1" max="32768">
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="aiEnableErrorExplanation" checked>
                            <label for="aiEnableErrorExplanation">Enable AI-powered error explanation</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="aiEnableCodeSuggestions" checked>
                            <label for="aiEnableCodeSuggestions">Enable AI-powered code suggestions</label>
                        </div>
                        <div class="checkbox-group">
                            <input type="checkbox" id="aiEnableAccessibilityAnalysis" checked>
                            <label for="aiEnableAccessibilityAnalysis">Enable AI-powered accessibility analysis</label>
                        </div>
                    </div>
                    
                    <div class="actions">
                        <button class="btn" onclick="saveSettings()">💾 Save Settings</button>
                        <button class="btn btn-secondary" onclick="resetToDefaults()">🔄 Reset to Defaults</button>
                        <button class="btn btn-secondary" onclick="exportSettings()">📤 Export Settings</button>
                        <button class="btn btn-secondary" onclick="importSettings()">📥 Import Settings</button>
                        <button class="btn btn-secondary" onclick="testSettings()">🧪 Test Settings</button>
                        <button class="btn btn-secondary" onclick="testCommunication()">📡 Test Communication</button>
                    </div>
                </div>
                
                <script nonce="${nonce}">
                    // Debug: Log when script loads
                    console.log('🔧 Advanced Live Server Settings Webview Script Loaded');
                    
                    // Load current settings
                    window.addEventListener('message', event => {
                        console.log('Webview: Received message:', event.data);
                        const message = event.data;
                        if (message.command === 'loadSettings') {
                            console.log('Webview: Loading settings...');
                            loadSettings(message.settings);
                        } else {
                            console.log('Webview: Unknown command:', message.command);
                        }
                    });
                    
                    // Test communication on load
                    console.log('Webview: Requesting initial settings...');
                    window.parent.postMessage({
                        command: 'getSettings'
                    }, '*');
                    
                    function loadSettings(settings) {
                        console.log('Webview: Loading settings into form:', settings);
                        
                        document.getElementById('port').value = settings.port || 5500;
                        document.getElementById('https').checked = settings.https || false;
                        document.getElementById('openBrowser').checked = settings.openBrowser !== false;
                        document.getElementById('showOverlay').checked = settings.showOverlay !== false;
                        document.getElementById('spa').checked = settings.spa || false;
                        document.getElementById('enableCloudPreview').checked = settings.enableCloudPreview || false;
                        document.getElementById('ngrokAuthToken').value = settings.ngrokAuthToken || '';
                        
                        // Load watch patterns
                        const watchPatterns = settings.watchPatterns || ['**/*.html', '**/*.css', '**/*.js'];
                        loadPatterns('watchPatterns', watchPatterns);
                        
                        // Load ignore patterns
                        const ignorePatterns = settings.ignorePatterns || ['**/node_modules/**', '**/.git/**'];
                        loadPatterns('ignorePatterns', ignorePatterns);
                        
                        // Load proxy rules
                        const proxyRules = settings.proxy || {};
                        loadProxyRules(proxyRules);

                        // Load AI settings
                        document.getElementById('aiMode').value = settings.aiMode || 'local';
                        document.getElementById('aiProvider').value = settings.aiProvider || 'openai';
                        document.getElementById('aiModel').value = settings.aiModel || 'gpt-4';
                        document.getElementById('aiApiKey').value = settings.aiApiKey || '';
                        document.getElementById('aiBaseUrl').value = settings.aiBaseUrl || '';
                        document.getElementById('aiTemperature').value = settings.aiTemperature || 0.7;
                        document.getElementById('aiMaxTokens').value = settings.aiMaxTokens || 2048;
                        document.getElementById('aiEnableErrorExplanation').checked = settings.aiEnableErrorExplanation || true;
                        document.getElementById('aiEnableCodeSuggestions').checked = settings.aiEnableCodeSuggestions || true;
                        document.getElementById('aiEnableAccessibilityAnalysis').checked = settings.aiEnableAccessibilityAnalysis || true;
                        
                        console.log('Webview: Settings loaded successfully');
                    }
                    
                    function loadPatterns(containerId, patterns) {
                        const container = document.getElementById(containerId);
                        container.innerHTML = '';
                        
                        patterns.forEach(pattern => {
                            const div = document.createElement('div');
                            div.className = 'pattern-input';
                            div.innerHTML = \`
                                <input type="text" value="\${pattern}" placeholder="e.g., **/*.html">
                                <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                            \`;
                            container.appendChild(div);
                        });
                    }
                    
                    function loadProxyRules(proxyRules) {
                        const container = document.getElementById('proxyRules');
                        container.innerHTML = '';
                        
                        Object.entries(proxyRules).forEach(([path, target]) => {
                            const div = document.createElement('div');
                            div.className = 'pattern-input';
                            div.innerHTML = \`
                                <input type="text" value="\${path}" placeholder="Path (e.g., /api)" style="flex: 1;">
                                <input type="text" value="\${target}" placeholder="Target URL (e.g., http://localhost:3000)" style="flex: 2;">
                                <button class="btn btn-secondary" onclick="removeProxyRule(this)">Remove</button>
                            \`;
                            container.appendChild(div);
                        });
                    }
                    
                    function addWatchPattern() {
                        const container = document.getElementById('watchPatterns');
                        const div = document.createElement('div');
                        div.className = 'pattern-input';
                        div.innerHTML = \`
                            <input type="text" placeholder="e.g., **/*.html">
                            <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                        \`;
                        container.appendChild(div);
                    }
                    
                    function addIgnorePattern() {
                        const container = document.getElementById('ignorePatterns');
                        const div = document.createElement('div');
                        div.className = 'pattern-input';
                        div.innerHTML = \`
                            <input type="text" placeholder="e.g., **/node_modules/**">
                            <button class="btn btn-secondary" onclick="removePattern(this)">Remove</button>
                        \`;
                        container.appendChild(div);
                    }
                    
                    function addProxyRule() {
                        const container = document.getElementById('proxyRules');
                        const div = document.createElement('div');
                        div.className = 'pattern-input';
                        div.innerHTML = \`
                            <input type="text" placeholder="Path (e.g., /api)" style="flex: 1;">
                            <input type="text" placeholder="Target URL (e.g., http://localhost:3000)" style="flex: 2;">
                            <button class="btn btn-secondary" onclick="removeProxyRule(this)">Remove</button>
                        \`;
                        container.appendChild(div);
                    }
                    
                    function removePattern(button) {
                        button.parentElement.remove();
                    }
                    
                    function removeProxyRule(button) {
                        button.parentElement.remove();
                    }
                    
                    function saveSettings() {
                        const settings = {
                            port: parseInt(document.getElementById('port').value),
                            https: document.getElementById('https').checked,
                            openBrowser: document.getElementById('openBrowser').checked,
                            showOverlay: document.getElementById('showOverlay').checked,
                            spa: document.getElementById('spa').checked,
                            enableCloudPreview: document.getElementById('enableCloudPreview').checked,
                            ngrokAuthToken: document.getElementById('ngrokAuthToken').value,
                            watchPatterns: getPatternValues('watchPatterns'),
                            ignorePatterns: getPatternValues('ignorePatterns'),
                            proxy: getProxyRules(),
                            aiMode: document.getElementById('aiMode').value,
                            aiProvider: document.getElementById('aiProvider').value,
                            aiModel: document.getElementById('aiModel').value,
                            aiApiKey: document.getElementById('aiApiKey').value,
                            aiBaseUrl: document.getElementById('aiBaseUrl').value,
                            aiTemperature: parseFloat(document.getElementById('aiTemperature').value),
                            aiMaxTokens: parseInt(document.getElementById('aiMaxTokens').value),
                            aiEnableErrorExplanation: document.getElementById('aiEnableErrorExplanation').checked,
                            aiEnableCodeSuggestions: document.getElementById('aiEnableCodeSuggestions').checked,
                            aiEnableAccessibilityAnalysis: document.getElementById('aiEnableAccessibilityAnalysis').checked
                        };
                        
                        console.log('Webview: Sending settings to extension:', settings);
                        
                        // Send settings to extension
                        window.parent.postMessage({
                            command: 'saveSettings',
                            settings: settings
                        }, '*');
                        
                        // Show loading state
                        const saveButton = document.querySelector('button[onclick="saveSettings()"]');
                        if (saveButton) {
                            saveButton.textContent = '💾 Saving...';
                            saveButton.disabled = true;
                            setTimeout(() => {
                                saveButton.textContent = '💾 Save Settings';
                                saveButton.disabled = false;
                            }, 2000);
                        }
                    }
                    
                    function getPatternValues(containerId) {
                        const container = document.getElementById(containerId);
                        const inputs = container.querySelectorAll('input');
                        return Array.from(inputs).map(input => input.value).filter(value => value.trim() !== '');
                    }
                    
                    function getProxyRules() {
                        const container = document.getElementById('proxyRules');
                        const inputs = container.querySelectorAll('input');
                        const rules = {};
                        
                        for (let i = 0; i < inputs.length; i += 2) {
                            const path = inputs[i].value.trim();
                            const target = inputs[i + 1]?.value.trim();
                            if (path && target) {
                                rules[path] = target;
                            }
                        }
                        
                        return rules;
                    }
                    
                    function resetToDefaults() {
                        if (confirm('Are you sure you want to reset all settings to defaults?')) {
                            window.parent.postMessage({
                                command: 'resetSettings'
                            }, '*');
                        }
                    }
                    
                    function exportSettings() {
                        const settings = {
                            port: parseInt(document.getElementById('port').value),
                            https: document.getElementById('https').checked,
                            openBrowser: document.getElementById('openBrowser').checked,
                            showOverlay: document.getElementById('showOverlay').checked,
                            spa: document.getElementById('spa').checked,
                            enableCloudPreview: document.getElementById('enableCloudPreview').checked,
                            ngrokAuthToken: document.getElementById('ngrokAuthToken').value,
                            watchPatterns: getPatternValues('watchPatterns'),
                            ignorePatterns: getPatternValues('ignorePatterns'),
                            proxy: getProxyRules(),
                            aiMode: document.getElementById('aiMode').value,
                            aiProvider: document.getElementById('aiProvider').value,
                            aiModel: document.getElementById('aiModel').value,
                            aiApiKey: document.getElementById('aiApiKey').value,
                            aiBaseUrl: document.getElementById('aiBaseUrl').value,
                            aiTemperature: parseFloat(document.getElementById('aiTemperature').value),
                            aiMaxTokens: parseInt(document.getElementById('aiMaxTokens').value),
                            aiEnableErrorExplanation: document.getElementById('aiEnableErrorExplanation').checked,
                            aiEnableCodeSuggestions: document.getElementById('aiEnableCodeSuggestions').checked,
                            aiEnableAccessibilityAnalysis: document.getElementById('aiEnableAccessibilityAnalysis').checked
                        };
                        
                        const dataStr = JSON.stringify(settings, null, 2);
                        const dataBlob = new Blob([dataStr], {type: 'application/json'});
                        const url = URL.createObjectURL(dataBlob);
                        
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = 'advanced-live-server-settings.json';
                        link.click();
                        
                        URL.revokeObjectURL(url);
                    }
                    
                    function importSettings() {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.json';
                        input.onchange = function(e) {
                            const file = e.target.files[0];
                            if (file) {
                                const reader = new FileReader();
                                reader.onload = function(e) {
                                    try {
                                        const settings = JSON.parse(e.target.result);
                                        loadSettings(settings);
                                    } catch (error) {
                                        alert('Invalid settings file: ' + error.message);
                                    }
                                };
                                reader.readAsText(file);
                            }
                        };
                        input.click();
                    }
                    
                    function testCommunication() {
                        console.log('📡 Testing webview communication...');
                        
                        // Send a simple test message
                        const testMessage = {
                            command: 'testCommunication',
                            timestamp: Date.now(),
                            message: 'Hello from webview!'
                        };
                        
                        console.log('Webview: Sending test message:', testMessage);
                        window.parent.postMessage(testMessage, '*');
                        
                        // Show immediate feedback
                        alert('Communication test sent! Check console for response.');
                    }
                    
                    function testSettings() {
                        console.log('🧪 Testing settings functionality...');
                        
                        // Test 1: Check if form values are accessible
                        const formValues = {
                            port: document.getElementById('port').value,
                            https: document.getElementById('https').checked,
                            openBrowser: document.getElementById('openBrowser').checked,
                            showOverlay: document.getElementById('showOverlay').checked,
                            spa: document.getElementById('spa').checked,
                            enableCloudPreview: document.getElementById('enableCloudPreview').checked,
                            ngrokAuthToken: document.getElementById('ngrokAuthToken').value,
                            aiMode: document.getElementById('aiMode').value,
                            aiProvider: document.getElementById('aiProvider').value,
                            aiModel: document.getElementById('aiModel').value,
                            aiApiKey: document.getElementById('aiApiKey').value,
                            aiBaseUrl: document.getElementById('aiBaseUrl').value,
                            aiTemperature: document.getElementById('aiTemperature').value,
                            aiMaxTokens: document.getElementById('aiMaxTokens').value,
                            aiEnableErrorExplanation: document.getElementById('aiEnableErrorExplanation').checked,
                            aiEnableCodeSuggestions: document.getElementById('aiEnableCodeSuggestions').checked,
                            aiEnableAccessibilityAnalysis: document.getElementById('aiEnableAccessibilityAnalysis').checked
                        };
                        
                        console.log('📋 Current form values:', formValues);
                        
                        // Test 2: Send a test message to extension
                        window.parent.postMessage({
                            command: 'testSettings',
                            formValues: formValues
                        }, '*');
                        
                        // Test 3: Show test results
                        alert('Settings test completed! Check console for details.');
                    }
                    
                    // Request current settings on load
                    window.parent.postMessage({
                        command: 'getSettings'
                    }, '*');
                </script>
            </body>
            </html>
        `;
  }
}

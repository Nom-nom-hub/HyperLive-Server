import * as vscode from 'vscode';
import { AIConfigManager } from '../config/ai-config';

export class AISettingsPanel {
  private panel: vscode.WebviewPanel | undefined;
  private configManager: AIConfigManager;

  constructor(private context: vscode.ExtensionContext) {
    this.configManager = new AIConfigManager(context);
    // Debug: Log config path on construction
    console.log('[AISettingsPanel] Config path:', (this.configManager as any).configPath);
  }

  show(): void {
    if (this.panel) {
      this.panel.reveal();
      return;
    }

    this.panel = vscode.window.createWebviewPanel(
      'aiSettings',
      'AI Settings - Advanced Live Server',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    this.panel.webview.html = this.getWebviewContent();
    this.panel.webview.onDidReceiveMessage((message) => this.handleMessage(message));
    this.panel.onDidDispose(() => {
      this.panel = undefined;
    });
  }

  private getWebviewContent(): string {
    const config = this.configManager.getConfig();
    const providers = [
      { value: 'openai', label: 'OpenAI', description: 'GPT-3.5, GPT-4, and other OpenAI models' },
      { value: 'ollama', label: 'Ollama', description: 'Local AI models (requires Ollama installation)' },
      { value: 'openrouter', label: 'OpenRouter', description: 'Access to multiple AI models through one API' },
      { value: 'anthropic', label: 'Anthropic', description: 'Claude models for advanced reasoning' },
      { value: 'gemini', label: 'Google Gemini', description: 'Google\'s latest AI models' },
      { value: 'cohere', label: 'Cohere', description: 'Command and other Cohere models' },
      { value: 'mistral', label: 'Mistral AI', description: 'Mistral 7B and other models' },
      { value: 'perplexity', label: 'Perplexity', description: 'Perplexity AI models' },
      { value: 'together', label: 'Together AI', description: 'Open source models and fine-tuning' },
      { value: 'huggingface', label: 'Hugging Face', description: 'Thousands of open source models' },
      { value: 'groq', label: 'Groq', description: 'Ultra-fast inference API' },
      { value: 'deepseek', label: 'DeepSeek', description: 'DeepSeek models for coding and reasoning' },
      { value: 'fireworks', label: 'Fireworks AI', description: 'Fast and cost-effective AI models' },
      { value: 'nomic', label: 'Nomic', description: 'Embeddings and text generation' },
      { value: 'custom', label: 'Custom', description: 'Custom API endpoint' },
      { value: 'local', label: 'Local', description: 'Basic local analysis (no API key required)' },
    ];

    const models = this.getModelsForProvider(config.modelConfig.provider);

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>AI Settings</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }

          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            padding: 20px;
          }

          .container {
            max-width: 800px;
            margin: 0 auto;
          }

          .header {
            margin-bottom: 30px;
            text-align: center;
          }

          .header h1 {
            font-size: 2rem;
            margin-bottom: 10px;
            color: var(--vscode-textLink-foreground);
          }

          .header p {
            color: var(--vscode-descriptionForeground);
          }

          .section {
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-input-border);
            border-radius: 8px;
            padding: 20px;
            margin-bottom: 20px;
          }

          .section h2 {
            font-size: 1.3rem;
            margin-bottom: 15px;
            color: var(--vscode-textLink-foreground);
          }

          .form-group {
            margin-bottom: 20px;
          }

          .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 600;
            color: var(--vscode-foreground);
          }

                  .form-group input,
        .form-group select,
        .form-group textarea {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid var(--vscode-input-border);
          border-radius: 4px;
          background: var(--vscode-input-background);
          color: var(--vscode-input-foreground);
          font-size: 14px;
        }

        .form-group select option {
          background: var(--vscode-dropdown-background);
          color: var(--vscode-dropdown-foreground);
        }

          .form-group input:focus,
          .form-group select:focus,
          .form-group textarea:focus {
            outline: none;
            border-color: var(--vscode-focusBorder);
          }

          .form-group textarea {
            resize: vertical;
            min-height: 80px;
          }

          .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 15px;
          }

          .checkbox-group input[type="checkbox"] {
            width: auto;
          }

          .provider-option {
            border: 1px solid var(--vscode-input-border);
            border-radius: 6px;
            padding: 15px;
            margin-bottom: 10px;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .provider-option:hover {
            border-color: var(--vscode-focusBorder);
            background: var(--vscode-list-hoverBackground);
          }

          .provider-option.selected {
            border-color: var(--vscode-textLink-foreground);
            background: var(--vscode-list-activeSelectionBackground);
          }

          .provider-option input[type="radio"] {
            margin-right: 10px;
          }

          .provider-name {
            font-weight: 600;
            margin-bottom: 5px;
          }

          .provider-description {
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
          }

          .button-group {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 30px;
          }

          .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 4px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }

          .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
          }

          .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
          }

          .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
          }

          .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
          }

          .status {
            padding: 10px;
            border-radius: 4px;
            margin-bottom: 20px;
            display: none;
          }

          .status.success {
            background: var(--vscode-notificationsInfoBackground);
            color: var(--vscode-notificationsInfoForeground);
            border: 1px solid var(--vscode-notificationsInfoBorder);
          }

          .status.error {
            background: var(--vscode-notificationsErrorBackground);
            color: var(--vscode-notificationsErrorForeground);
            border: 1px solid var(--vscode-notificationsErrorBorder);
          }

          .help-text {
            font-size: 0.9rem;
            color: var(--vscode-descriptionForeground);
            margin-top: 5px;
          }

          .api-key-field {
            position: relative;
          }

          .api-key-field input {
            padding-right: 40px;
          }

          .toggle-password {
            position: absolute;
            right: 10px;
            top: 50%;
            transform: translateY(-50%);
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            cursor: pointer;
            font-size: 12px;
          }

          .model-info {
            background: var(--vscode-textBlockQuote-background);
            border-left: 3px solid var(--vscode-textBlockQuote-border);
            padding: 10px;
            margin-top: 10px;
            font-size: 0.9rem;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🤖 AI Settings</h1>
            <p>Configure AI providers for code analysis, error explanation, and more</p>
          </div>

          <div id="status" class="status"></div>

          <form id="aiSettingsForm">
            <div class="section">
              <h2>General Settings</h2>
              
              <div class="checkbox-group">
                <input type="checkbox" id="enabled" ${config.enabled ? 'checked' : ''}>
                <label for="enabled">Enable AI Features</label>
              </div>

              <div class="form-group">
                <label for="mode">AI Mode</label>
                <select id="mode">
                  <option value="local" ${config.mode === 'local' ? 'selected' : ''}>Local Only</option>
                  <option value="cloud" ${config.mode === 'cloud' ? 'selected' : ''}>Cloud Only</option>
                  <option value="hybrid" ${config.mode === 'hybrid' ? 'selected' : ''}>Hybrid (Local + Cloud)</option>
                </select>
                <div class="help-text">Choose how AI features should work</div>
              </div>
            </div>

            <div class="section">
              <h2>AI Provider</h2>
              <div class="help-text">Select your preferred AI provider and configure its settings</div>
              
              <div id="providerOptions">
                ${providers.map(provider => `
                  <div class="provider-option ${config.modelConfig.provider === provider.value ? 'selected' : ''}">
                    <input type="radio" name="provider" value="${provider.value}" id="provider_${provider.value}" ${config.modelConfig.provider === provider.value ? 'checked' : ''}>
                    <label for="provider_${provider.value}">
                      <div class="provider-name">${provider.label}</div>
                      <div class="provider-description">${provider.description}</div>
                    </label>
                  </div>
                `).join('')}
              </div>
            </div>

            <div class="section">
              <h2>Provider Configuration</h2>
              
              <div class="form-group">
                <label for="model">Model</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                  <select id="model" style="flex: 1;">
                    ${models.map(model => `
                      <option value="${model.value}" ${config.modelConfig.model === model.value ? 'selected' : ''}>${model.label}</option>
                    `).join('')}
                    <option value="custom" ${!models.find(m => m.value === config.modelConfig.model) ? 'selected' : ''}>Custom Model</option>
                  </select>
                  <button type="button" class="btn btn-secondary" onclick="refreshOllamaModels()" id="refreshModelsBtn" style="display: none;">🔄 Refresh</button>
                </div>
                <div class="help-text">Select a model or choose "Custom Model" to enter your own</div>
              </div>

              <div class="form-group" id="customModelGroup" style="display: none;">
                <label for="customModel">Custom Model Name</label>
                <input type="text" id="customModel" value="${config.modelConfig.model}" placeholder="Enter your model name (e.g., gpt-4, claude-3-opus, gemini-pro)">
                <div class="help-text">Enter the exact model name from your provider</div>
              </div>

              <div class="form-group" id="apiKeyGroup" style="display: ${this.shouldShowApiKey(config.modelConfig.provider) ? 'block' : 'none'};">
                <label for="apiKey">API Key</label>
                <div class="api-key-field">
                  <input type="password" id="apiKey" value="${config.modelConfig.apiKey || ''}" placeholder="Enter your API key">
                  <button type="button" class="toggle-password" onclick="togglePassword()">👁️</button>
                </div>
                <div class="help-text">Your API key for the selected provider</div>
              </div>

              <div class="form-group" id="baseUrlGroup" style="display: ${this.shouldShowBaseUrl(config.modelConfig.provider) ? 'block' : 'none'};">
                <label for="baseUrl">Base URL</label>
                <input type="url" id="baseUrl" value="${config.modelConfig.baseUrl || ''}" placeholder="Enter the base URL">
                <div class="help-text">Base URL for the API (leave empty for default)</div>
              </div>

              <div class="form-group">
                <label for="temperature">Temperature</label>
                <input type="range" id="temperature" min="0" max="2" step="0.1" value="${config.modelConfig.temperature || 0.7}">
                <span id="temperatureValue">${config.modelConfig.temperature || 0.7}</span>
                <div class="help-text">Controls randomness in responses (0 = focused, 2 = creative)</div>
              </div>

              <div class="form-group">
                <label for="maxTokens">Max Tokens</label>
                <input type="number" id="maxTokens" min="100" max="4000" value="${config.modelConfig.maxTokens || 1000}">
                <div class="help-text">Maximum number of tokens in the response</div>
              </div>

              <div class="form-group">
                <label for="timeout">Timeout (ms)</label>
                <input type="number" id="timeout" min="5000" max="120000" step="1000" value="${config.modelConfig.timeout || 30000}">
                <div class="help-text">Request timeout in milliseconds</div>
              </div>
            </div>

            <div class="section">
              <h2>Feature Settings</h2>
              <div class="help-text">Enable or disable specific AI features</div>
              
              <div class="checkbox-group">
                <input type="checkbox" id="errorExplanation" ${config.errorExplanation ? 'checked' : ''}>
                <label for="errorExplanation">Error Explanation</label>
              </div>

              <div class="checkbox-group">
                <input type="checkbox" id="accessibilityAnalysis" ${config.accessibilityAnalysis ? 'checked' : ''}>
                <label for="accessibilityAnalysis">Accessibility Analysis</label>
              </div>

              <div class="checkbox-group">
                <input type="checkbox" id="codeImprovements" ${config.codeImprovements ? 'checked' : ''}>
                <label for="codeImprovements">Code Improvements</label>
              </div>

              <div class="checkbox-group">
                <input type="checkbox" id="performanceAnalysis" ${config.performanceAnalysis ? 'checked' : ''}>
                <label for="performanceAnalysis">Performance Analysis</label>
              </div>

              <div class="checkbox-group">
                <input type="checkbox" id="seoOptimization" ${config.seoOptimization ? 'checked' : ''}>
                <label for="seoOptimization">SEO Optimization</label>
              </div>

              <div class="checkbox-group">
                <input type="checkbox" id="securityScan" ${config.securityScan ? 'checked' : ''}>
                <label for="securityScan">Security Scan</label>
              </div>
            </div>

            <div class="button-group">
              <button type="button" class="btn btn-secondary" onclick="testConnection()">Test Connection</button>
              <button type="button" class="btn btn-secondary" onclick="resetToDefaults()">Reset to Defaults</button>
              <button type="submit" class="btn btn-primary">Save Settings</button>
            </div>
          </form>
        </div>

        <script>
          const vscode = acquireVsCodeApi();
          
          // Provider change handler
          document.querySelectorAll('input[name="provider"]').forEach(radio => {
            radio.addEventListener('change', function() {
              updateProviderOptions();
              updateModelOptions(this.value);
              updateFieldVisibility(this.value);
              updateCustomModelVisibility();
            });
          });

          // Model change handler
          document.getElementById('model').addEventListener('change', function() {
            updateCustomModelVisibility();
          });

          // Temperature slider
          const temperatureSlider = document.getElementById('temperature');
          const temperatureValue = document.getElementById('temperatureValue');
          temperatureSlider.addEventListener('input', function() {
            temperatureValue.textContent = this.value;
          });

          // Form submission
          document.getElementById('aiSettingsForm').addEventListener('submit', function(e) {
            e.preventDefault();
            saveSettings();
          });

          function updateProviderOptions() {
            document.querySelectorAll('.provider-option').forEach(option => {
              option.classList.remove('selected');
            });
            const selectedRadio = document.querySelector('input[name="provider"]:checked');
            if (selectedRadio) {
              selectedRadio.closest('.provider-option').classList.add('selected');
            }
          }

          function updateModelOptions(provider) {
            const modelSelect = document.getElementById('model');
            const models = getModelsForProvider(provider);
            
            modelSelect.innerHTML = models.map(model => 
              \`<option value="\${model.value}">\${model.label}</option>\`
            ).join('');
          }

          function updateFieldVisibility(provider) {
            const apiKeyGroup = document.getElementById('apiKeyGroup');
            const baseUrlGroup = document.getElementById('baseUrlGroup');
            const refreshBtn = document.getElementById('refreshModelsBtn');
            
            const needsApiKey = ['openai', 'anthropic', 'gemini', 'cohere', 'mistral', 'perplexity', 'together', 'huggingface', 'openrouter', 'groq', 'deepseek', 'fireworks', 'nomic', 'custom'].includes(provider);
            const needsBaseUrl = ['ollama', 'local', 'custom'].includes(provider);
            const isOllama = provider === 'ollama';
            
            apiKeyGroup.style.display = needsApiKey ? 'block' : 'none';
            baseUrlGroup.style.display = needsBaseUrl ? 'block' : 'none';
            refreshBtn.style.display = isOllama ? 'block' : 'none';
          }

          function updateCustomModelVisibility() {
            const modelSelect = document.getElementById('model');
            const customModelGroup = document.getElementById('customModelGroup');
            
            if (modelSelect.value === 'custom') {
              customModelGroup.style.display = 'block';
            } else {
              customModelGroup.style.display = 'none';
            }
          }

          function getModelsForProvider(provider) {
            const modelMap = {
              openai: [
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
                { value: 'gpt-4o', label: 'GPT-4o' }
              ],
              ollama: [
                { value: 'llama2', label: 'Llama 2' },
                { value: 'llama2:13b', label: 'Llama 2 13B' },
                { value: 'llama2:70b', label: 'Llama 2 70B' },
                { value: 'codellama', label: 'Code Llama' },
                { value: 'mistral', label: 'Mistral' },
                { value: 'gemma', label: 'Gemma' },
                { value: 'phi', label: 'Phi' }
              ],
              openrouter: [
                { value: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' },
                { value: 'openai/gpt-4', label: 'OpenAI GPT-4' },
                { value: 'anthropic/claude-3-opus', label: 'Anthropic Claude 3 Opus' },
                { value: 'anthropic/claude-3-sonnet', label: 'Anthropic Claude 3 Sonnet' },
                { value: 'google/gemini-pro', label: 'Google Gemini Pro' },
                { value: 'meta-llama/llama-2-70b-chat', label: 'Meta Llama 2 70B' },
                { value: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B Instruct' }
              ],
              anthropic: [
                { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
                { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
                { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
                { value: 'claude-2.1', label: 'Claude 2.1' },
                { value: 'claude-2.0', label: 'Claude 2.0' }
              ],
              gemini: [
                { value: 'gemini-pro', label: 'Gemini Pro' },
                { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
              ],
              cohere: [
                { value: 'command', label: 'Command' },
                { value: 'command-light', label: 'Command Light' },
                { value: 'command-nightly', label: 'Command Nightly' }
              ],
              mistral: [
                { value: 'mistral-tiny', label: 'Mistral Tiny' },
                { value: 'mistral-small', label: 'Mistral Small' },
                { value: 'mistral-medium', label: 'Mistral Medium' },
                { value: 'mistral-large', label: 'Mistral Large' }
              ],
              perplexity: [
                { value: 'llama-2-70b-chat', label: 'Llama 2 70B Chat' },
                { value: 'codellama-34b-instruct', label: 'Code Llama 34B Instruct' },
                { value: 'mixtral-8x7b-instruct', label: 'Mixtral 8x7B Instruct' },
                { value: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' }
              ],
              together: [
                { value: 'togethercomputer/llama-2-70b-chat', label: 'Llama 2 70B Chat' },
                { value: 'togethercomputer/llama-2-13b-chat', label: 'Llama 2 13B Chat' },
                { value: 'togethercomputer/falcon-40b-chat', label: 'Falcon 40B Chat' },
                { value: 'togethercomputer/falcon-7b-chat', label: 'Falcon 7B Chat' }
              ],
              huggingface: [
                { value: 'gpt2', label: 'GPT-2' },
                { value: 'microsoft/DialoGPT-medium', label: 'DialoGPT Medium' },
                { value: 'EleutherAI/gpt-neo-125M', label: 'GPT-Neo 125M' }
              ],
              groq: [
                { value: 'llama2-70b-4096', label: 'Llama 2 70B' },
                { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
                { value: 'gemma-7b-it', label: 'Gemma 7B' }
              ],
              deepseek: [
                { value: 'deepseek-chat', label: 'DeepSeek Chat' },
                { value: 'deepseek-coder', label: 'DeepSeek Coder' }
              ],
              fireworks: [
                { value: 'accounts/fireworks/models/llama-v2-7b-chat', label: 'Llama v2 7B Chat' },
                { value: 'accounts/fireworks/models/llama-v2-13b-chat', label: 'Llama v2 13B Chat' },
                { value: 'accounts/fireworks/models/llama-v2-70b-chat', label: 'Llama v2 70B Chat' }
              ],
              nomic: [
                { value: 'nomic-embed-text-v1', label: 'Nomic Embed Text v1' },
                { value: 'nomic-embed-text-v1.5', label: 'Nomic Embed Text v1.5' }
              ],
              custom: [
                { value: 'custom', label: 'Custom Model' }
              ],
              local: [
                { value: 'local', label: 'Local Analysis' }
              ]
            };
            
            return modelMap[provider] || [{ value: 'default', label: 'Default' }];
          }

          function togglePassword() {
            const apiKeyInput = document.getElementById('apiKey');
            const toggleButton = document.querySelector('.toggle-password');
            
            if (apiKeyInput.type === 'password') {
              apiKeyInput.type = 'text';
              toggleButton.textContent = '🙈';
            } else {
              apiKeyInput.type = 'password';
              toggleButton.textContent = '👁️';
            }
          }

          function saveSettings() {
            // Show immediate feedback
            showStatus('Saving settings...', 'success');
            
            // Get the actual model name
            let modelName = document.getElementById('model').value;
            if (modelName === 'custom') {
              modelName = document.getElementById('customModel').value;
            }
            
            const formData = {
              enabled: document.getElementById('enabled').checked,
              mode: document.getElementById('mode').value,
              provider: document.querySelector('input[name="provider"]:checked').value,
              model: modelName,
              apiKey: document.getElementById('apiKey').value,
              baseUrl: document.getElementById('baseUrl').value,
              temperature: parseFloat(document.getElementById('temperature').value),
              maxTokens: parseInt(document.getElementById('maxTokens').value),
              timeout: parseInt(document.getElementById('timeout').value),
              errorExplanation: document.getElementById('errorExplanation').checked,
              accessibilityAnalysis: document.getElementById('accessibilityAnalysis').checked,
              codeImprovements: document.getElementById('codeImprovements').checked,
              performanceAnalysis: document.getElementById('performanceAnalysis').checked,
              seoOptimization: document.getElementById('seoOptimization').checked,
              securityScan: document.getElementById('securityScan').checked
            };

            vscode.postMessage({
              command: 'saveSettings',
              data: formData
            });
          }

          function testConnection() {
            // Show immediate feedback
            showStatus('Testing connection...', 'success');
            
            const provider = document.querySelector('input[name="provider"]:checked').value;
            const apiKey = document.getElementById('apiKey').value;
            const baseUrl = document.getElementById('baseUrl').value;
            const model = document.getElementById('model').value;

            vscode.postMessage({
              command: 'testConnection',
              data: { provider, apiKey, baseUrl, model }
            });
          }

          function resetToDefaults() {
            if (confirm('Are you sure you want to reset all settings to defaults?')) {
              // Show immediate feedback
              showStatus('Resetting to defaults...', 'success');
              
              vscode.postMessage({
                command: 'resetToDefaults'
              });
            }
          }

          function showStatus(message, type = 'success') {
            const status = document.getElementById('status');
            status.textContent = message;
            status.className = \`status \${type}\`;
            status.style.display = 'block';
            
            setTimeout(() => {
              status.style.display = 'none';
            }, 5000);
          }

          // Listen for messages from the extension
          window.addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
              case 'showStatus':
                showStatus(message.message, message.type);
                break;
            }
          });

          async function refreshOllamaModels() {
            showStatus('Fetching Ollama models...', 'success');
            
            const baseUrl = document.getElementById('baseUrl').value || 'http://localhost:11434';
            
            try {
              const response = await fetch(\`\${baseUrl}/api/tags\`);
              if (!response.ok) {
                throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
              }
              
              const data = await response.json();
              const models = data.models || [];
              
              if (models.length === 0) {
                showStatus('No models found in Ollama. Make sure Ollama is running and you have models installed.', 'error');
                return;
              }
              
              // Update the model select with detected models
              const modelSelect = document.getElementById('model');
              const currentValue = modelSelect.value;
              
              // Clear existing options except "Custom Model"
              const customOption = modelSelect.querySelector('option[value="custom"]');
              modelSelect.innerHTML = '';
              
              // Add detected models
              models.forEach(model => {
                const option = document.createElement('option');
                option.value = model.name;
                option.textContent = \`\${model.name} (\${(model.size / 1024 / 1024 / 1024).toFixed(1)}GB)\`;
                modelSelect.appendChild(option);
              });
              
              // Add back the custom option
              if (customOption) {
                modelSelect.appendChild(customOption);
              }
              
              // Try to restore the previous selection
              if (currentValue && currentValue !== 'custom') {
                const option = modelSelect.querySelector(\`option[value="\${currentValue}"]\`);
                if (option) {
                  option.selected = true;
                }
              }
              
              showStatus(\`Found \${models.length} Ollama models!\`, 'success');
            } catch (error) {
              console.error('Failed to fetch Ollama models:', error);
              showStatus(\`Failed to fetch Ollama models: \${error.message}\`, 'error');
            }
          }

          // Initialize
          updateFieldVisibility('${config.modelConfig.provider}');
          updateCustomModelVisibility();
        </script>
      </body>
      </html>
    `;
  }

  private shouldShowApiKey(provider: string): boolean {
    return ['openai', 'anthropic', 'gemini', 'cohere', 'mistral', 'perplexity', 'together', 'huggingface', 'openrouter', 'groq', 'deepseek', 'fireworks', 'nomic', 'custom'].includes(provider);
  }

  private shouldShowBaseUrl(provider: string): boolean {
    return ['ollama', 'local', 'custom'].includes(provider);
  }

  private getModelsForProvider(provider: string): Array<{ value: string; label: string }> {
    const modelMap: Record<string, Array<{ value: string; label: string }>> = {
      openai: [
        { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        { value: 'gpt-3.5-turbo-16k', label: 'GPT-3.5 Turbo 16K' },
        { value: 'gpt-4', label: 'GPT-4' },
        { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
        { value: 'gpt-4o', label: 'GPT-4o' }
      ],
      ollama: [
        { value: 'llama2', label: 'Llama 2' },
        { value: 'llama2:13b', label: 'Llama 2 13B' },
        { value: 'llama2:70b', label: 'Llama 2 70B' },
        { value: 'codellama', label: 'Code Llama' },
        { value: 'mistral', label: 'Mistral' },
        { value: 'gemma', label: 'Gemma' },
        { value: 'phi', label: 'Phi' }
      ],
      openrouter: [
        { value: 'openai/gpt-3.5-turbo', label: 'OpenAI GPT-3.5 Turbo' },
        { value: 'openai/gpt-4', label: 'OpenAI GPT-4' },
        { value: 'anthropic/claude-3-opus', label: 'Anthropic Claude 3 Opus' },
        { value: 'anthropic/claude-3-sonnet', label: 'Anthropic Claude 3 Sonnet' },
        { value: 'google/gemini-pro', label: 'Google Gemini Pro' },
        { value: 'meta-llama/llama-2-70b-chat', label: 'Meta Llama 2 70B' },
        { value: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B Instruct' }
      ],
      anthropic: [
        { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
        { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
        { value: 'claude-2.1', label: 'Claude 2.1' },
        { value: 'claude-2.0', label: 'Claude 2.0' }
      ],
      gemini: [
        { value: 'gemini-pro', label: 'Gemini Pro' },
        { value: 'gemini-pro-vision', label: 'Gemini Pro Vision' }
      ],
      cohere: [
        { value: 'command', label: 'Command' },
        { value: 'command-light', label: 'Command Light' },
        { value: 'command-nightly', label: 'Command Nightly' }
      ],
      mistral: [
        { value: 'mistral-tiny', label: 'Mistral Tiny' },
        { value: 'mistral-small', label: 'Mistral Small' },
        { value: 'mistral-medium', label: 'Mistral Medium' },
        { value: 'mistral-large', label: 'Mistral Large' }
      ],
      perplexity: [
        { value: 'llama-2-70b-chat', label: 'Llama 2 70B Chat' },
        { value: 'codellama-34b-instruct', label: 'Code Llama 34B Instruct' },
        { value: 'mixtral-8x7b-instruct', label: 'Mixtral 8x7B Instruct' },
        { value: 'mistral-7b-instruct', label: 'Mistral 7B Instruct' }
      ],
      together: [
        { value: 'togethercomputer/llama-2-70b-chat', label: 'Llama 2 70B Chat' },
        { value: 'togethercomputer/llama-2-13b-chat', label: 'Llama 2 13B Chat' },
        { value: 'togethercomputer/falcon-40b-chat', label: 'Falcon 40B Chat' },
        { value: 'togethercomputer/falcon-7b-chat', label: 'Falcon 7B Chat' }
      ],
      huggingface: [
        { value: 'gpt2', label: 'GPT-2' },
        { value: 'microsoft/DialoGPT-medium', label: 'DialoGPT Medium' },
        { value: 'EleutherAI/gpt-neo-125M', label: 'GPT-Neo 125M' }
      ],
      groq: [
        { value: 'llama2-70b-4096', label: 'Llama 2 70B' },
        { value: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B' },
        { value: 'gemma-7b-it', label: 'Gemma 7B' }
      ],
      deepseek: [
        { value: 'deepseek-chat', label: 'DeepSeek Chat' },
        { value: 'deepseek-coder', label: 'DeepSeek Coder' }
      ],
      fireworks: [
        { value: 'accounts/fireworks/models/llama-v2-7b-chat', label: 'Llama v2 7B Chat' },
        { value: 'accounts/fireworks/models/llama-v2-13b-chat', label: 'Llama v2 13B Chat' },
        { value: 'accounts/fireworks/models/llama-v2-70b-chat', label: 'Llama v2 70B Chat' }
      ],
      nomic: [
        { value: 'nomic-embed-text-v1', label: 'Nomic Embed Text v1' },
        { value: 'nomic-embed-text-v1.5', label: 'Nomic Embed Text v1.5' }
      ],
      custom: [
        { value: 'custom', label: 'Custom Model' }
      ],
      local: [
        { value: 'local', label: 'Local Analysis' }
      ]
    };

    return modelMap[provider] || [{ value: 'default', label: 'Default' }];
  }

  private async handleMessage(message: any): Promise<void> {
    console.log('[AISettingsPanel] Received message:', message);
    
    switch (message.command) {
      case 'saveSettings':
        console.log('[AISettingsPanel] Handling saveSettings');
        await this.saveSettings(message.data);
        break;
      case 'testConnection':
        console.log('[AISettingsPanel] Handling testConnection');
        await this.testConnection(message.data);
        break;
      case 'resetToDefaults':
        console.log('[AISettingsPanel] Handling resetToDefaults');
        await this.resetToDefaults();
        break;
      default:
        console.log('[AISettingsPanel] Unknown command:', message.command);
    }
  }

  private async saveSettings(data: any): Promise<void> {
    try {
      console.log('[AISettingsPanel] saveSettings called with:', data);
      this.configManager.updateConfig({
        enabled: data.enabled,
        mode: data.mode,
        errorExplanation: data.errorExplanation,
        accessibilityAnalysis: data.accessibilityAnalysis,
        codeImprovements: data.codeImprovements,
        performanceAnalysis: data.performanceAnalysis,
        seoOptimization: data.seoOptimization,
        securityScan: data.securityScan,
      });

      this.configManager.updateModelConfig({
        provider: data.provider,
        model: data.model,
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        temperature: data.temperature,
        maxTokens: data.maxTokens,
        timeout: data.timeout,
      });

      // Debug: Log after saving
      console.log('[AISettingsPanel] Settings saved.');
      this.showStatus('Settings saved successfully!', 'success');
      
      // Refresh the panel to show updated values
      if (this.panel) {
        this.panel.webview.html = this.getWebviewContent();
      }
    } catch (error) {
      console.error('[AISettingsPanel] Failed to save settings:', error);
      this.showStatus(`Failed to save settings: ${error}`, 'error');
    }
  }

  private async testConnection(data: any): Promise<void> {
    try {
      // Create a temporary config for testing
      const testConfig = {
        provider: data.provider,
        model: data.model,
        apiKey: data.apiKey,
        baseUrl: data.baseUrl,
        temperature: 0.7,
        maxTokens: 100,
        timeout: 10000,
      };

      // Test the connection based on provider
      let success = false;
      let error = '';

      switch (data.provider) {
        case 'openai':
          success = await this.testOpenAIConnection(testConfig);
          break;
        case 'ollama':
          success = await this.testOllamaConnection(testConfig);
          break;
        case 'openrouter':
          success = await this.testOpenRouterConnection(testConfig);
          break;
        case 'local':
          success = true; // Local always works
          break;
        default:
          error = 'Provider not implemented for testing';
      }

      if (success) {
        this.showStatus('Connection test successful!', 'success');
      } else {
        this.showStatus(`Connection test failed: ${error}`, 'error');
      }
    } catch (error) {
      this.showStatus(`Connection test failed: ${error}`, 'error');
    }
  }

  private async testOpenAIConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl || 'https://api.openai.com/v1'}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testOllamaConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl || 'http://localhost:11434'}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async testOpenRouterConnection(config: any): Promise<boolean> {
    try {
      const response = await fetch(`${config.baseUrl || 'https://openrouter.ai/api/v1'}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async resetToDefaults(): Promise<void> {
    try {
      this.configManager.updateConfig({
        enabled: false,
        mode: 'local',
        errorExplanation: true,
        accessibilityAnalysis: true,
        codeImprovements: true,
        performanceAnalysis: false,
        seoOptimization: false,
        securityScan: false,
      });

      this.configManager.updateModelConfig({
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        temperature: 0.7,
        maxTokens: 1000,
        timeout: 30000,
      });

      this.showStatus('Settings reset to defaults!', 'success');
      
      // Reload the panel
      if (this.panel) {
        this.panel.webview.html = this.getWebviewContent();
      }
    } catch (error) {
      this.showStatus(`Failed to reset settings: ${error}`, 'error');
    }
  }

  private showStatus(message: string, type: 'success' | 'error'): void {
    if (this.panel) {
      this.panel.webview.postMessage({
        command: 'showStatus',
        message,
        type
      });
    }
  }
} 
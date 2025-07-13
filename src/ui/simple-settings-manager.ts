import * as vscode from 'vscode';

export class SimpleSettingsManager {
  static async showSettingsQuickPick() {
    const config = vscode.workspace.getConfiguration('advancedLiveServer');

    const currentSettings = {
      port: config.get('port', 5500),
      https: config.get('https', false),
      openBrowser: config.get('openBrowser', true),
      showOverlay: config.get('showOverlay', true),
      spa: config.get('spa', false),
    };

    const items = [
      {
        label: `🔧 Port: ${currentSettings.port}`,
        description: 'Change server port',
        command: 'changePort',
      },
      {
        label: `🔒 HTTPS: ${currentSettings.https ? '✅ Enabled' : '❌ Disabled'}`,
        description: 'Toggle HTTPS with self-signed certificates',
        command: 'toggleHttps',
      },
      {
        label: `🌐 Auto-Open Browser: ${currentSettings.openBrowser ? '✅ Enabled' : '❌ Disabled'}`,
        description: 'Toggle automatic browser opening',
        command: 'toggleAutoOpen',
      },
      {
        label: `🔄 Show Overlay: ${currentSettings.showOverlay ? '✅ Enabled' : '❌ Disabled'}`,
        description: 'Toggle developer tools overlay',
        command: 'toggleOverlay',
      },
      {
        label: `📱 SPA Mode: ${currentSettings.spa ? '✅ Enabled' : '❌ Disabled'}`,
        description: 'Toggle SPA mode with history API fallback',
        command: 'toggleSpa',
      },
      {
        label: '🔄 Reset All Settings',
        description: 'Reset all settings to defaults',
        command: 'resetAll',
      },
      {
        label: '⚙️ Open VSCode Settings',
        description: 'Open full VSCode settings UI',
        command: 'openVSCodeSettings',
      },
    ];

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a setting to change...',
    });

    if (selected) {
      await this.handleSettingChange(selected.command, currentSettings);
    }
  }

  private static async handleSettingChange(
    command: string,
    currentSettings: any
  ) {
    const config = vscode.workspace.getConfiguration('advancedLiveServer');

    switch (command) {
      case 'changePort': {
        const newPort = await vscode.window.showInputBox({
          prompt: 'Enter new port number (1-65535)',
          value: currentSettings.port.toString(),
          validateInput: value => {
            const port = parseInt(value);
            if (isNaN(port) || port < 1 || port > 65535) {
              return 'Port must be a number between 1 and 65535';
            }
            return null;
          },
        });
        if (newPort) {
          const portNum = parseInt(newPort);
          console.log(`🔧 Debug - Saving port: ${portNum}`);
          await config.update(
            'port',
            portNum,
            vscode.ConfigurationTarget.Global
          );
          console.log(`🔧 Debug - Port saved successfully`);
          vscode.window.showInformationMessage(
            `Port changed to ${portNum}. Server will restart automatically.`
          );
          await this.restartServerIfRunning();
        }
        break;
      }

      case 'toggleHttps': {
        const newHttps = !currentSettings.https;
        console.log(`🔒 Debug - Saving HTTPS: ${newHttps}`);
        await config.update(
          'https',
          newHttps,
          vscode.ConfigurationTarget.Global
        );
        console.log(`🔒 Debug - HTTPS saved successfully`);
        vscode.window.showInformationMessage(
          `HTTPS ${newHttps ? 'enabled' : 'disabled'}. Server will restart automatically.`
        );
        await this.restartServerIfRunning();
        break;
      }

      case 'toggleAutoOpen': {
        const newAutoOpen = !currentSettings.openBrowser;
        console.log(`🌐 Debug - Saving auto-open: ${newAutoOpen}`);
        await config.update(
          'openBrowser',
          newAutoOpen,
          vscode.ConfigurationTarget.Global
        );
        console.log(`🌐 Debug - Auto-open saved successfully`);
        vscode.window.showInformationMessage(
          `Auto-open browser ${newAutoOpen ? 'enabled' : 'disabled'}`
        );
        break;
      }

      case 'toggleOverlay': {
        const newOverlay = !currentSettings.showOverlay;
        console.log(`🔄 Debug - Saving overlay: ${newOverlay}`);
        await config.update(
          'showOverlay',
          newOverlay,
          vscode.ConfigurationTarget.Global
        );
        console.log(`🔄 Debug - Overlay saved successfully`);
        vscode.window.showInformationMessage(
          `Show overlay ${newOverlay ? 'enabled' : 'disabled'}. Server will restart automatically.`
        );
        await this.restartServerIfRunning();
        break;
      }

      case 'toggleSpa': {
        const newSpa = !currentSettings.spa;
        console.log(`📱 Debug - Saving SPA: ${newSpa}`);
        await config.update('spa', newSpa, vscode.ConfigurationTarget.Global);
        console.log(`📱 Debug - SPA saved successfully`);
        vscode.window.showInformationMessage(
          `SPA mode ${newSpa ? 'enabled' : 'disabled'}. Server will restart automatically.`
        );
        await this.restartServerIfRunning();
        break;
      }

      case 'resetAll': {
        const result = await vscode.window.showWarningMessage(
          'Are you sure you want to reset all settings to defaults?',
          'Yes',
          'No'
        );
        if (result === 'Yes') {
          await this.resetAllSettings();
          vscode.window.showInformationMessage(
            'All settings reset to defaults. Server will restart automatically.'
          );
          await this.restartServerIfRunning();
        }
        break;
      }

      case 'openVSCodeSettings':
        vscode.commands.executeCommand(
          'workbench.action.openSettings',
          'advancedLiveServer'
        );
        break;
    }
  }

  private static async restartServerIfRunning() {
    try {
      // Force reload configuration to ensure we have the latest values
      await this.forceReloadConfig();

      // Check if server is running by trying to execute the restart command
      await vscode.commands.executeCommand('advancedLiveServer.restart');
    } catch {
      // If restart fails, try to start the server
      try {
        await vscode.commands.executeCommand('advancedLiveServer.start');
      } catch {
        vscode.window.showWarningMessage(
          'Settings saved, but server restart failed. Please restart manually.'
        );
      }
    }
  }

  private static async forceReloadConfig() {
    // Force VSCode to reload the configuration
    const config = vscode.workspace.getConfiguration('advancedLiveServer');

    // Read all current values to ensure they're loaded
    const currentValues = {
      port: config.get('port'),
      https: config.get('https'),
      spa: config.get('spa'),
      openBrowser: config.get('openBrowser'),
      showOverlay: config.get('showOverlay'),
    };

    console.log('🔄 Force reloaded config values:', currentValues);

    // Wait longer for any pending configuration changes
    await new Promise(resolve => setTimeout(resolve, 500));

    // Read again after the delay
    const finalValues = {
      port: config.get('port'),
      https: config.get('https'),
      spa: config.get('spa'),
      openBrowser: config.get('openBrowser'),
      showOverlay: config.get('showOverlay'),
    };

    console.log('🔄 Final config values after delay:', finalValues);
  }

  private static async resetAllSettings() {
    const config = vscode.workspace.getConfiguration('advancedLiveServer');

    const defaultSettings = {
      port: 5500,
      https: false,
      openBrowser: true,
      showOverlay: true,
      spa: false,
      enableCloudPreview: false,
      ngrokAuthToken: '',
      watchPatterns: ['**/*.html', '**/*.css', '**/*.js'],
      ignorePatterns: ['**/node_modules/**', '**/.git/**'],
      proxy: {},
      aiMode: 'local',
      aiProvider: 'openai',
      aiModel: 'gpt-4',
      aiApiKey: '',
      aiBaseUrl: '',
      aiTemperature: 0.7,
      aiMaxTokens: 2048,
      aiEnableErrorExplanation: true,
      aiEnableCodeSuggestions: true,
      aiEnableAccessibilityAnalysis: true,
    };

    for (const [key, value] of Object.entries(defaultSettings)) {
      await config.update(key, value, vscode.ConfigurationTarget.Global);
    }
  }

  static async showCurrentSettings() {
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

    const settingsText = JSON.stringify(settings, null, 2);

    const document = await vscode.workspace.openTextDocument({
      content: `# Advanced Live Server Settings

Current settings as of ${new Date().toLocaleString()}:

\`\`\`json
${settingsText}
\`\`\`

## How to Change Settings

1. Use the command palette (Ctrl+Shift+P) and search for "Advanced Live Server"
2. Select "Advanced Live Server: Quick Settings" for common settings
3. Select "Advanced Live Server: Open VSCode Settings" for full settings UI
4. Or edit settings directly in your VSCode settings.json file

## Settings Reference

- **port**: Server port (1-65535)
- **https**: Enable HTTPS with self-signed certificates
- **openBrowser**: Automatically open browser when server starts
- **showOverlay**: Show developer tools overlay in browser
- **spa**: Enable SPA mode with history API fallback
- **enableCloudPreview**: Enable cloud preview with ngrok
- **ngrokAuthToken**: ngrok authentication token
- **watchPatterns**: File patterns to watch for changes
- **ignorePatterns**: File patterns to ignore
- **proxy**: API proxy rules
- **aiMode**: AI mode (local/cloud/hybrid)
- **aiProvider**: AI provider (openai/anthropic/etc.)
- **aiModel**: AI model name
- **aiApiKey**: API key for cloud AI
- **aiBaseUrl**: Custom base URL for AI
- **aiTemperature**: AI response creativity (0-2)
- **aiMaxTokens**: Maximum tokens for AI responses
- **aiEnableErrorExplanation**: Enable AI error explanation
- **aiEnableCodeSuggestions**: Enable AI code suggestions
- **aiEnableAccessibilityAnalysis**: Enable AI accessibility analysis`,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(document);
  }
}

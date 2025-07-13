// Debug script to test Advanced Live Server settings
// Run this in the VSCode Developer Console (Help > Toggle Developer Tools)

console.log('🔧 Advanced Live Server Settings Debug Script');
console.log('============================================');

// Function to check current settings
function checkSettings() {
  const config = vscode.workspace.getConfiguration('advancedLiveServer');

  console.log('📋 Current Settings:');
  console.log('Port:', config.get('port'));
  console.log('HTTPS:', config.get('https'));
  console.log('Open Browser:', config.get('openBrowser'));
  console.log('Show Overlay:', config.get('showOverlay'));
  console.log('SPA Mode:', config.get('spa'));
  console.log('Cloud Preview:', config.get('enableCloudPreview'));
  console.log('Watch Patterns:', config.get('watchPatterns'));
  console.log('Ignore Patterns:', config.get('ignorePatterns'));
  console.log('Proxy:', config.get('proxy'));
  console.log('AI Mode:', config.get('aiMode'));
  console.log('AI Provider:', config.get('aiProvider'));
  console.log('AI Model:', config.get('aiModel'));
  console.log('AI Temperature:', config.get('aiTemperature'));
  console.log('AI Max Tokens:', config.get('aiMaxTokens'));
  console.log('AI Error Explanation:', config.get('aiEnableErrorExplanation'));
  console.log('AI Code Suggestions:', config.get('aiEnableCodeSuggestions'));
  console.log('AI Accessibility:', config.get('aiEnableAccessibilityAnalysis'));
}

// Function to test saving a setting
async function testSaveSetting(key, value) {
  console.log(`🧪 Testing save: ${key} = ${value}`);
  const config = vscode.workspace.getConfiguration('advancedLiveServer');

  try {
    await config.update(key, value, vscode.ConfigurationTarget.Global);
    console.log(`✅ Successfully saved ${key} = ${value}`);

    // Verify it was saved
    const savedValue = config.get(key);
    console.log(`🔍 Verification: ${key} = ${savedValue}`);

    return savedValue === value;
  } catch (error) {
    console.error(`❌ Failed to save ${key}:`, error);
    return false;
  }
}

// Function to test multiple settings
async function testMultipleSettings() {
  console.log('🧪 Testing multiple settings...');

  const testSettings = {
    port: 3000,
    https: true,
    openBrowser: false,
    showOverlay: false,
    spa: true,
    aiMode: 'cloud',
    aiProvider: 'anthropic',
    aiModel: 'claude-3',
    aiTemperature: 0.5,
    aiMaxTokens: 4096,
  };

  const results = {};

  for (const [key, value] of Object.entries(testSettings)) {
    results[key] = await testSaveSetting(key, value);
  }

  console.log('📊 Test Results:', results);

  const successCount = Object.values(results).filter(Boolean).length;
  const totalCount = Object.keys(results).length;

  console.log(
    `🎯 Success Rate: ${successCount}/${totalCount} (${Math.round((successCount / totalCount) * 100)}%)`
  );

  return results;
}

// Function to reset all settings to defaults
async function resetAllSettings() {
  console.log('🔄 Resetting all settings to defaults...');

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

  console.log('✅ All settings reset to defaults');
}

// Function to check configuration scopes
function checkConfigurationScopes() {
  console.log('🔍 Checking configuration scopes...');

  const config = vscode.workspace.getConfiguration('advancedLiveServer');

  // Check if we have a workspace
  if (
    vscode.workspace.workspaceFolders &&
    vscode.workspace.workspaceFolders.length > 0
  ) {
    console.log(
      '📁 Workspace folder:',
      vscode.workspace.workspaceFolders[0].name
    );
  } else {
    console.log('⚠️ No workspace folder found');
  }

  // Check configuration targets
  console.log('🎯 Available configuration targets:');
  console.log('- Global:', vscode.ConfigurationTarget.Global);
  console.log('- Workspace:', vscode.ConfigurationTarget.Workspace);
  console.log('- WorkspaceFolder:', vscode.ConfigurationTarget.WorkspaceFolder);
}

// Export functions for manual testing
window.advancedLiveServerDebug = {
  checkSettings,
  testSaveSetting,
  testMultipleSettings,
  resetAllSettings,
  checkConfigurationScopes,
};

console.log('🚀 Debug functions available as: window.advancedLiveServerDebug');
console.log('📝 Usage examples:');
console.log('- window.advancedLiveServerDebug.checkSettings()');
console.log('- window.advancedLiveServerDebug.testSaveSetting("port", 3000)');
console.log('- window.advancedLiveServerDebug.testMultipleSettings()');
console.log('- window.advancedLiveServerDebug.resetAllSettings()');
console.log('- window.advancedLiveServerDebug.checkConfigurationScopes()');

// Auto-run initial check
checkSettings();

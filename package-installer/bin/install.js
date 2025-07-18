#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const os = require('os');

console.log('🚀 Installing Advanced Live Server Extension for VS Code / Cursor...');

async function installExtension() {
  try {
    // Get possible extension directories for VS Code and Cursor
    const extensionDirs = getEditorExtensionsDirs();
    const foundDir = extensionDirs.find(dir => fs.existsSync(dir));
    if (!foundDir) {
      console.warn('⚠️  Could not find a supported editor extensions directory (VS Code, Cursor, etc).');
      console.warn('   Supported editors: VS Code, Cursor.');
      console.warn('   If you are using a compatible editor, please ensure it is installed.');
      console.warn('   Skipping extension installation.');
      return;
    }

    // Source extension directory - use the extension files included in this package
    const sourceDir = path.join(__dirname, '../extension');
    const extensionName = 'advanced-live-server';
    const targetDir = path.join(foundDir, extensionName);

    // Check if extension already exists
    if (await fs.pathExists(targetDir)) {
      console.log('⚠️  Extension already exists. Updating...');
      await fs.remove(targetDir);
    }

    // Copy extension files
    console.log('📦 Copying extension files...');
    await fs.copy(sourceDir, targetDir, {
      filter: (src) => {
        // Skip node_modules, .git, and other unnecessary files
        const skipPatterns = [
          'node_modules',
          '.git',
          '.vscode',
          'package-installer',
          'test-project',
          '*.log',
          '.DS_Store',
          'Thumbs.db'
        ];
        
        return !skipPatterns.some(pattern => {
          if (pattern.includes('*')) {
            return src.endsWith(pattern.replace('*', ''));
          }
          return src.includes(pattern);
        });
      }
    });

    // Create package.json for the extension
    const extensionPackageJson = {
      name: "advanced-live-server",
      displayName: "Advanced Live Server",
      description: "A modern, open source live server for VSCode. Free core features, with Pro/Enterprise upgrade for AI, cloud, and team tools.",
      version: "1.0.0",
      publisher: "teck",
      license: "MIT",
      engines: { "vscode": "^1.75.0" },
      categories: ["Web", "Debuggers", "Other"],
      activationEvents: ["workspaceContains:**/*.html"],
      main: "./out/services/extension.js",
      repository: {
        type: "git",
        url: "https://github.com/Nom-nom-hub/HyperLive-Server"
      },
      bugs: {
        url: "https://github.com/Nom-nom-hub/HyperLive-Server/issues"
      },
      homepage: "https://github.com/Nom-nom-hub/HyperLive-Server",
      icon: "hyper-logo.png",
      contributes: {
        commands: [
          {
            command: "advancedLiveServer.start",
            title: "Advanced Live Server: Start Server"
          },
          {
            command: "advancedLiveServer.stop",
            title: "Advanced Live Server: Stop Server"
          },
          {
            command: "advancedLiveServer.openCurrentFile",
            title: "Advanced Live Server: Open Current File"
          },
          {
            command: "advancedLiveServer.openInBrowser",
            title: "Advanced Live Server: Open in Browser"
          },
          {
            command: "advancedLiveServer.showStatus",
            title: "Advanced Live Server: Show Status"
          },
          {
            command: "advancedLiveServer.openSettings",
            title: "Advanced Live Server: Open Settings"
          },
          {
            command: "advancedLiveServer.showWelcome",
            title: "Advanced Live Server: Show Welcome"
          },
          {
            command: "advancedLiveServer.openAISettings",
            title: "Advanced Live Server: Open AI Settings"
          },
          {
            command: "advancedLiveServer.stopCollaboration",
            title: "Advanced Live Server: Stop Collaboration"
          }
        ],
        configuration: {
          properties: {
            "advancedLiveServer.port": {
              type: "number",
              default: 5500,
              description: "Port to run the server on."
            },
            "advancedLiveServer.https": {
              type: "boolean",
              default: false,
              description: "Enable HTTPS with self-signed certificates."
            },
            "advancedLiveServer.spa": {
              type: "boolean",
              default: false,
              description: "Enable SPA mode with history API fallback."
            }
          }
        }
      }
    };

    await fs.writeJson(path.join(targetDir, 'package.json'), extensionPackageJson, { spaces: 2 });

    console.log('✅ Extension installed successfully!');
    console.log('');
    console.log('🎉 Next steps:');
    console.log('1. Restart VS Code or Cursor');
    console.log('2. Open any HTML file or project folder');
    console.log('3. Press Ctrl+Shift+P and type "Advanced Live Server: Start Server"');
    console.log('');
    console.log('📚 For help, run "Advanced Live Server: Show Welcome" in your editor');

  } catch (error) {
    console.error('❌ Installation failed:', error.message);
    process.exit(1);
  }
}

function getEditorExtensionsDirs() {
  const platform = os.platform();
  const homeDir = os.homedir();
  // Common extension directories for VS Code, Cursor, and open source builds
  const dirs = [
    path.join(homeDir, '.vscode', 'extensions'),
    path.join(homeDir, '.vscode-oss', 'extensions'),
    path.join(homeDir, '.cursor', 'extensions'),
    path.join(homeDir, '.vscodium', 'extensions'),
    path.join(homeDir, '.windsurf', 'extensions'), // Windsurf support
  ];
  return dirs;
}

// Run installer
installExtension(); 
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');

// Utility to copy files recursively
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest);
    fs.readdirSync(src).forEach(childItemName => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else {
    fs.copyFileSync(src, dest);
  }
}

// Get VSCode extensions directory
function getVSCodeExtensionsDir() {
  const home = os.homedir();
  if (process.platform === 'win32') {
    return path.join(home, '.vscode', 'extensions');
  } else {
    return path.join(home, '.vscode', 'extensions');
  }
}

// Find installed extension directory
function findExtensionDir(extensionsDir, publisher, extensionName) {
  const dirs = fs.readdirSync(extensionsDir);
  const match = dirs.find(d => d.startsWith(`${publisher}.${extensionName}`));
  if (!match) return null;
  return path.join(extensionsDir, match);
}

// Prompt user for input
function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

(async () => {
  console.log('=== Advanced Live Server: Premium Feature Installer ===');
  const premiumPackPath = await prompt('Enter the path to your premium pack folder: ');
  if (!fs.existsSync(premiumPackPath)) {
    console.error('❌ The specified premium pack folder does not exist.');
    process.exit(1);
  }

  const extensionsDir = getVSCodeExtensionsDir();
  const extDir = findExtensionDir(extensionsDir, 'teck', 'advanced-live-server');
  if (!extDir) {
    console.error('❌ Could not find the installed Advanced Live Server extension. Make sure it is installed in VSCode.');
    process.exit(1);
  }

  console.log(`Copying premium files from: ${premiumPackPath}`);
  console.log(`To extension directory: ${extDir}`);
  copyRecursiveSync(premiumPackPath, extDir);
  console.log('✅ Premium features installed! Please reload VSCode to activate them.');
})(); 
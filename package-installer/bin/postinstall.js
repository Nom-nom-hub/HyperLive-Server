#!/usr/bin/env node

const fs = require('fs-extra');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 Running post-install setup...');

async function postInstall() {
  try {
    // Compile TypeScript if needed
    const tsConfigPath = path.join(__dirname, '../../tsconfig.json');
    if (await fs.pathExists(tsConfigPath)) {
      console.log('📦 Compiling TypeScript...');
      try {
        execSync('npm run compile', { 
          cwd: path.join(__dirname, '../../'),
          stdio: 'inherit' 
        });
      } catch (error) {
        console.log('⚠️  TypeScript compilation failed, but continuing...');
      }
    }

    console.log('✅ Post-install setup complete!');
  } catch (error) {
    console.error('❌ Post-install setup failed:', error.message);
  }
}

postInstall(); 
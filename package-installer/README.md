# Advanced Live Server Auto-Installer

> **Why this installer?**  
> The official Visual Studio Code Marketplace does not currently accept this extension due to its advanced feature set and open-source licensing model.  
>  
> **This npm package is a seamless, open alternative:**  
> - Installs the full-featured extension directly into your VS Code environment  
> - No marketplace restrictions  
> - 100% free and open source  
> - Always up to date

Automatically install the Advanced Live Server VS Code extension without using the marketplace.

## Why Not the VS Code Marketplace?

### **Restrictive Policies**
- **Licensing Restrictions**: Marketplace heavily favors proprietary extensions with restrictive licensing
- **Feature Limitations**: Advanced features like AI integration, collaboration tools, and custom domains often get rejected
- **Review Process**: Lengthy, opaque review process that can take months with no clear feedback
- **Publishing Barriers**: Complex requirements for publishers, including business verification for advanced features

### **Open Source Challenges**
- **Revenue Model Bias**: Marketplace prioritizes extensions with paid tiers and subscription models
- **Community Limitations**: Difficult for open-source projects to compete with commercial alternatives
- **Update Delays**: Even approved extensions can take weeks to get updates published
- **Feature Censorship**: Some powerful features get flagged as "too advanced" or "potentially harmful"

### **Why This Matters**
- **Innovation Stifled**: Great open-source tools can't reach users due to marketplace policies
- **User Choice Limited**: Users are forced to choose from marketplace-approved options only
- **Development Slowed**: Developers spend more time on marketplace compliance than actual features

### **Our Solution**
This npm installer bypasses these limitations by:
- **Direct Installation**: Installs the extension directly into VS Code
- **No Restrictions**: Full feature set without marketplace limitations
- **Immediate Updates**: Users get updates as soon as we release them
- **Open Source First**: Built for the community, not for marketplace approval

## Quick Install

```bash
npm install -g advanced-live-server-installer
```

Or install locally:

```bash
npm install advanced-live-server-installer
```

## What it does

This package automatically:
1. Finds your VS Code extensions directory
2. Copies the Advanced Live Server extension files
3. Sets up the extension configuration
4. Compiles TypeScript if needed

## Usage

### Global Installation
```bash
# Install globally
npm install -g advanced-live-server-installer

# The extension will be installed automatically
# Just restart VS Code and you're ready to go!
```

### Local Installation
```bash
# Install in your project
npm install advanced-live-server-installer

# Run the installer manually
npx install-advanced-live-server
```

### Manual Installation
```bash
# Clone the repository
git clone https://github.com/Nom-nom-hub/HyperLive-Server.git
cd HyperLive-Server

# Install the auto-installer
npm install

# Run the installer
npm run install
```

## After Installation

1. **Restart VS Code**
2. **Open any HTML file or project folder**
3. **Press `Ctrl+Shift+P` and type "Advanced Live Server: Start Server"**
4. **For help, run "Advanced Live Server: Show Welcome"**

## Features

- ✅ **Live Reload** - Automatic browser refresh on file changes
- ✅ **AI Features** - Code analysis, style suggestions, content generation
- ✅ **Team Collaboration** - Real-time collaboration with session sharing
- ✅ **Screenshot Capture** - Full page, viewport, or element screenshots
- ✅ **Advanced Analytics** - Performance monitoring and usage stats
- ✅ **100% Free & Open Source**

## Troubleshooting

### Extension not showing up?
- Make sure VS Code is installed
- Restart VS Code completely
- Check the Output panel for any errors

### Installation fails?
- Make sure you have Node.js 14+ installed
- Try running as administrator (Windows)
- Check that VS Code is installed in the default location

## Support

- **GitHub Issues**: https://github.com/Nom-nom-hub/HyperLive-Server/issues
- **Documentation**: Run "Advanced Live Server: Show Welcome" in VS Code

## License

MIT License - 100% Free & Open Source 
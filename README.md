# Advanced Live Server

A modern, open source live server for VSCode with AI assistance, team collaboration, and advanced development tools. 100% free and open source.

---

## 🚀 Overview
Advanced Live Server brings instant, secure, and powerful live reloading to your VSCode workflow. Packed with AI features, team collaboration, screenshot capture, and advanced analytics - all completely free and open source.

---

## ✨ Features

### 🎯 Core Features
- **Live Reload** - Automatic browser refresh on file changes
- **HTTPS Support** - Secure local development with self-signed certificates
- **SPA Support** - History API fallback for single-page applications
- **Developer Overlay** - Real-time server status and controls
- **Quick Settings** - Fast configuration changes

### 🤖 AI Features
- **Code Analysis** - AI-powered code review and suggestions
- **Error Explanation** - Intelligent error analysis and fixes
- **Accessibility Analysis** - Automated accessibility improvements
- **Style Suggestions** - CSS and design recommendations
- **Content Generation** - AI-powered placeholder content

### 👥 Team Collaboration
- **Real-time Sync** - Collaborate with your team in real-time
- **Session Sharing** - Share development sessions with session IDs
- **File Synchronization** - Automatic file change synchronization
- **Multi-user Support** - Multiple developers can join sessions

### 📸 Advanced Tools
- **Screenshot Capture** - Full page, viewport, or element screenshots
- **Analytics Dashboard** - Performance monitoring and usage stats
- **Custom Domains** - Use your own domains for previews
- **Cloud Preview** - Public URLs with ngrok integration

---

## 🛠️ Installation

### Option 1: NPM Auto-Installer (Recommended)
```bash
npm install -g advanced-live-server-installer
```
Then restart VS Code and you're ready to go!

### Option 2: Manual Installation
1. **Clone** this repository
2. **Install dependencies**: `npm install`
3. **Compile**: `npm run compile`
4. **Run installer**: `cd package-installer && node bin/install.js`
5. **Restart** VS Code

### Option 3: Direct Download
Download the latest `.vsix` from [Releases](https://github.com/Nom-nom-hub/HyperLive-Server/releases) and install manually.

---

## 🚦 Usage

### Quick Start
1. **Open** your project folder in VS Code
2. **Start server**: Command Palette → `Advanced Live Server: Start Server`
3. **Or right-click** an HTML file and select "Open with Advanced Live Server"

### AI Features
- **Analyze Code**: Command Palette → `Advanced Live Server: Analyze Code with AI`
- **Improve Styles**: Command Palette → `Advanced Live Server: Improve Styles with AI`
- **Generate Content**: Command Palette → `Advanced Live Server: Generate Content with AI`

### Team Collaboration
- **Start Session**: Command Palette → `Advanced Live Server: Start Collaboration`
- **Join Session**: Command Palette → `Advanced Live Server: Join Collaboration`
- **Share Session ID** with your team

### Screenshots & Analytics
- **Take Screenshot**: Command Palette → `Advanced Live Server: Take Screenshot`
- **View Analytics**: Command Palette → `Advanced Live Server: Show Analytics`

---

## ⚙️ Configuration

Configure settings in VS Code settings under "Advanced Live Server":

```json
{
  "advancedLiveServer.port": 5500,
  "advancedLiveServer.https": false,
  "advancedLiveServer.spa": false,
  "advancedLiveServer.openBrowser": true
}
```

---

## 🔒 Privacy & Security
- **No telemetry or tracking**
- **No remote code execution**
- **All features run locally**
- **No user data collection**
- **100% open source and transparent**

See [SECURITY.md](./SECURITY.md) for full details.

---

## 🖼️ Screenshots
<!-- Add screenshots or animated GIFs here -->
![Live Reload Demo](https://raw.githubusercontent.com/Nom-nom-hub/HyperLive-Server/main/screenshots/demo.gif)

---

## 🆘 Support & Links
- **Source Code:** [GitHub](https://github.com/Nom-nom-hub/HyperLive-Server)
- **Report Issues:** [GitHub Issues](https://github.com/Nom-nom-hub/HyperLive-Server/issues)
- **Documentation:** Run "Advanced Live Server: Show Welcome" in VS Code
- **Security Policy:** [SECURITY.md](./SECURITY.md)

---

## 🤝 Contributing
We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

---

## 📜 License
MIT License - 100% Free & Open Source. See [LICENSE](./LICENSE) for details.

---

## 📋 Changelog
See [CHANGELOG.md](./CHANGELOG.md) for release notes.

---

## ❤️ Support the Project
If you find this extension helpful, please:
- ⭐ Star this repository
- 🐛 Report bugs and request features
- 💬 Share with your developer friends
- 🤝 Contribute code or documentation

**Made with ❤️ by the open source community**




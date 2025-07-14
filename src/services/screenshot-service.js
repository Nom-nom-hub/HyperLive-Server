"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotService = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class ScreenshotService {
    constructor(outputChannel) {
        this.outputChannel = outputChannel;
    }
    async captureScreenshot(url, options = {}) {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            return {
                success: false,
                error: 'No workspace folder found',
                timestamp: new Date(),
                options
            };
        }
        // Create screenshots directory
        const screenshotsDir = path.join(workspaceFolder.uri.fsPath, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = options.filename || `screenshot-guide-${timestamp}.html`;
        const outputPath = options.outputPath || path.join(screenshotsDir, filename);
        try {
            this.outputChannel.appendLine(`📸 Creating screenshot guide for: ${url}`);
            this.outputChannel.appendLine(`📁 Output: ${outputPath}`);
            // Create a simple HTML file with instructions
            const htmlContent = this.generateScreenshotGuide(url, options);
            fs.writeFileSync(outputPath, htmlContent);
            this.outputChannel.appendLine(`✅ Screenshot guide created: ${outputPath}`);
            // Open the guide in the browser
            vscode.env.openExternal(vscode.Uri.parse(`file://${outputPath}`));
            return {
                success: true,
                filePath: outputPath,
                url,
                timestamp: new Date(),
                options
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                url,
                timestamp: new Date(),
                options
            };
        }
    }
    async captureFullPageScreenshot(url, options = {}) {
        return this.captureScreenshot(url, { ...options, fullPage: true });
    }
    async captureElementScreenshot(url, selector, options = {}) {
        return this.captureScreenshot(url, { ...options, selector });
    }
    async captureResponsiveScreenshots(url, devices) {
        const results = [];
        for (const device of devices) {
            const result = await this.captureScreenshot(url, {
                width: device.width,
                height: device.height,
                filename: `screenshot-${device.name}-${new Date().toISOString().replace(/[:.]/g, '-')}.html`
            });
            results.push(result);
        }
        return results;
    }
    async openScreenshotManager() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found');
            return;
        }
        const screenshotsDir = path.join(workspaceFolder.uri.fsPath, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }
        // Open the screenshots folder in VSCode
        const uri = vscode.Uri.file(screenshotsDir);
        await vscode.commands.executeCommand('vscode.openFolder', uri);
        vscode.window.showInformationMessage('Screenshot manager opened');
    }
    getScreenshotHistory() {
        // This would typically read from a log file
        // For now, return empty array
        return [];
    }
    async createScreenshotGallery() {
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
            throw new Error('No workspace folder found');
        }
        const screenshotsDir = path.join(workspaceFolder.uri.fsPath, 'screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            throw new Error('No screenshots directory found');
        }
        const files = fs.readdirSync(screenshotsDir)
            .filter(file => /\.(png|jpeg|jpg|webp)$/i.test(file))
            .sort((a, b) => {
            const statA = fs.statSync(path.join(screenshotsDir, a));
            const statB = fs.statSync(path.join(screenshotsDir, b));
            return statB.mtime.getTime() - statA.mtime.getTime();
        });
        if (files.length === 0) {
            throw new Error('No screenshot files found');
        }
        const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Screenshot Gallery</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        h1 {
            text-align: center;
            color: #333;
            margin-bottom: 30px;
        }
        .gallery {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
            gap: 20px;
        }
        .screenshot {
            background: white;
            border-radius: 8px;
            padding: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .screenshot:hover {
            transform: translateY(-2px);
        }
        .screenshot img {
            width: 100%;
            height: auto;
            border-radius: 4px;
            cursor: pointer;
        }
        .screenshot-info {
            margin-top: 10px;
            font-size: 14px;
            color: #666;
        }
        .modal {
            display: none;
            position: fixed;
            z-index: 1000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.9);
        }
        .modal-content {
            margin: auto;
            display: block;
            max-width: 90%;
            max-height: 90%;
            margin-top: 5%;
        }
        .close {
            position: absolute;
            top: 15px;
            right: 35px;
            color: #f1f1f1;
            font-size: 40px;
            font-weight: bold;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📸 Screenshot Gallery</h1>
        <div class="gallery">
            ${files.map(file => `
                <div class="screenshot">
                    <img src="screenshots/${file}" alt="${file}" onclick="openModal(this.src, '${file}')">
                    <div class="screenshot-info">
                        <strong>${file}</strong><br>
                        <small>${new Date(fs.statSync(path.join(screenshotsDir, file)).mtime).toLocaleString()}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>

    <div id="imageModal" class="modal">
        <span class="close" onclick="closeModal()">&times;</span>
        <img class="modal-content" id="modalImage">
    </div>

    <script>
        function openModal(src, filename) {
            const modal = document.getElementById('imageModal');
            const modalImg = document.getElementById('modalImage');
            modal.style.display = "block";
            modalImg.src = src;
            document.title = filename;
        }

        function closeModal() {
            document.getElementById('imageModal').style.display = "none";
        }

        // Close modal when clicking outside
        document.getElementById('imageModal').onclick = function(e) {
            if (e.target === this) {
                closeModal();
            }
        }
    </script>
</body>
</html>`;
        const galleryPath = path.join(workspaceFolder.uri.fsPath, 'screenshot-gallery.html');
        fs.writeFileSync(galleryPath, htmlContent);
        return galleryPath;
    }
    generateScreenshotGuide(url, options) {
        const timestamp = new Date().toLocaleString();
        const selector = options.selector || '';
        const fullPage = options.fullPage || false;
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📸 Screenshot Guide - Advanced Live Server</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #667eea;
        }
        .header h1 {
            color: #667eea;
            margin-bottom: 10px;
        }
        .step {
            background: #f8f9fa;
            padding: 20px;
            margin: 20px 0;
            border-radius: 8px;
            border-left: 4px solid #667eea;
        }
        .step h3 {
            color: #667eea;
            margin-top: 0;
        }
        .code {
            background: #2d3748;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 5px;
            font-family: 'Monaco', 'Menlo', monospace;
            margin: 10px 0;
            overflow-x: auto;
        }
        .highlight {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 24px;
            text-decoration: none;
            border-radius: 5px;
            margin: 10px 5px;
            transition: background 0.3s;
        }
        .button:hover {
            background: #5a67d8;
        }
        .info {
            background: #d1ecf1;
            border: 1px solid #bee5eb;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
        .warning {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📸 Screenshot Guide</h1>
            <p>Advanced Live Server Extension - Manual Screenshot Instructions</p>
            <p><strong>Generated:</strong> ${timestamp}</p>
        </div>

        <div class="info">
            <h3>🎯 Target URL</h3>
            <p><strong>${url}</strong></p>
            ${selector ? `<p><strong>Element Selector:</strong> <code>${selector}</code></p>` : ''}
            ${fullPage ? '<p><strong>Type:</strong> Full Page Screenshot</p>' : '<p><strong>Type:</strong> Viewport Screenshot</p>'}
        </div>

        <div class="step">
            <h3>Step 1: Open the Target Page</h3>
            <p>Click the button below to open the page you want to screenshot:</p>
            <a href="${url}" target="_blank" class="button">🌐 Open Target Page</a>
        </div>

        <div class="step">
            <h3>Step 2: Take the Screenshot</h3>
            <p>Use your browser's built-in screenshot tools:</p>
            
            <div class="highlight">
                <h4>Chrome/Edge:</h4>
                <ul>
                    <li><strong>Full Page:</strong> F12 → Ctrl+Shift+P → "Capture full size screenshot"</li>
                    <li><strong>Element:</strong> Right-click element → "Inspect" → Right-click in dev tools → "Capture node screenshot"</li>
                    <li><strong>Viewport:</strong> F12 → Ctrl+Shift+P → "Capture screenshot"</li>
                </ul>
            </div>

            <div class="highlight">
                <h4>Firefox:</h4>
                <ul>
                    <li><strong>Full Page:</strong> F12 → ⋮ menu → "Take a Screenshot" → "Save full page"</li>
                    <li><strong>Element:</strong> Right-click element → "Take a Screenshot" → "Save visible"</li>
                    <li><strong>Viewport:</strong> F12 → ⋮ menu → "Take a Screenshot" → "Save visible"</li>
                </ul>
            </div>

            <div class="highlight">
                <h4>Safari:</h4>
                <ul>
                    <li><strong>Full Page:</strong> Develop → "Capture Screenshot of Full Page"</li>
                    <li><strong>Element:</strong> Right-click element → "Inspect Element" → Screenshot button</li>
                    <li><strong>Viewport:</strong> Develop → "Capture Screenshot of Viewport"</li>
                </ul>
            </div>
        </div>

        <div class="step">
            <h3>Step 3: Save Your Screenshot</h3>
            <p>Save the screenshot to your project's <code>screenshots/</code> folder with a descriptive name:</p>
            <div class="code">
screenshots/
├── extension-interface.png
├── settings-panel.png
├── server-running.png
├── feature-cards.png
└── command-palette.png
            </div>
        </div>

        ${selector ? `
        <div class="warning">
            <h3>🎯 Element-Specific Instructions</h3>
            <p>You requested a screenshot of: <code>${selector}</code></p>
            <ol>
                <li>Open the target page</li>
                <li>Right-click on the element matching <code>${selector}</code></li>
                <li>Select "Inspect" or "Inspect Element"</li>
                <li>Right-click on the highlighted element in dev tools</li>
                <li>Choose "Capture node screenshot" (Chrome) or similar option</li>
            </ol>
        </div>
        ` : ''}

        <div class="step">
            <h3>Step 4: Use in Documentation</h3>
            <p>Once you have your screenshots, you can use them in:</p>
            <ul>
                <li>📖 README files</li>
                <li>📚 Documentation</li>
                <li>🎯 Bug reports</li>
                <li>📊 Presentations</li>
                <li>📱 Social media posts</li>
            </ul>
        </div>

        <div class="info">
            <h3>💡 Pro Tips</h3>
            <ul>
                <li><strong>Consistent sizing:</strong> Use the same viewport size for all screenshots</li>
                <li><strong>High quality:</strong> Use PNG format for UI elements, JPEG for photos</li>
                <li><strong>Descriptive names:</strong> Use clear, descriptive filenames</li>
                <li><strong>Organization:</strong> Group related screenshots in subfolders</li>
            </ul>
        </div>

        <div class="step">
            <h3>🔄 Alternative: Browser Extensions</h3>
            <p>For even better screenshots, consider these browser extensions:</p>
            <ul>
                <li><strong>Nimbus Screenshot</strong> - Full page, scrolling, and annotation</li>
                <li><strong>Lightshot</strong> - Quick and easy screenshots</li>
                <li><strong>Awesome Screenshot</strong> - Advanced editing and annotation</li>
                <li><strong>FireShot</strong> - Professional screenshot tool</li>
            </ul>
        </div>
    </div>

    <script>
        // Add some interactivity
        document.addEventListener('DOMContentLoaded', function() {
            // Add click tracking for the target URL
            const targetLink = document.querySelector('a[href="${url}"]');
            if (targetLink) {
                targetLink.addEventListener('click', function() {
                    console.log('Target page opened for screenshot');
                });
            }
        });
    </script>
</body>
</html>`;
    }
}
exports.ScreenshotService = ScreenshotService;
//# sourceMappingURL=screenshot-service.js.map
import * as vscode from 'vscode';
import * as QRCode from 'qrcode';

export class QRCodeManager {
  private panel: vscode.WebviewPanel | null = null;

  async showQRCode(url: string): Promise<void> {
    try {
      // Generate QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Create or reveal webview panel
      if (this.panel) {
        this.panel.reveal();
      } else {
        this.panel = vscode.window.createWebviewPanel(
          'qrCode',
          'Mobile Access QR Code',
          vscode.ViewColumn.One,
          {
            enableScripts: true,
            retainContextWhenHidden: true,
          }
        );

        this.panel.onDidDispose(() => {
          this.panel = null;
        });
      }

      // Set webview content
      this.panel.webview.html = this.getWebviewContent(qrDataUrl, url);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate QR code: ${error}`);
    }
  }

  private getWebviewContent(qrDataUrl: string, url: string): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Mobile Access QR Code</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        margin: 0;
                        padding: 20px;
                        background: var(--vscode-editor-background);
                        color: var(--vscode-editor-foreground);
                        text-align: center;
                    }
                    .container {
                        max-width: 400px;
                        margin: 0 auto;
                        background: var(--vscode-panel-background);
                        border-radius: 8px;
                        padding: 20px;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                    }
                    h2 {
                        margin-top: 0;
                        color: var(--vscode-editor-foreground);
                    }
                    .qr-code {
                        margin: 20px 0;
                        padding: 20px;
                        background: white;
                        border-radius: 8px;
                        display: inline-block;
                    }
                    .url {
                        font-family: 'Courier New', monospace;
                        background: var(--vscode-input-background);
                        padding: 10px;
                        border-radius: 4px;
                        margin: 10px 0;
                        word-break: break-all;
                    }
                    .instructions {
                        margin-top: 20px;
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                    }
                    .copy-btn {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 10px;
                    }
                    .copy-btn:hover {
                        background: var(--vscode-button-hoverBackground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>📱 Mobile Access</h2>
                    <p>Scan this QR code with your mobile device to access your site:</p>
                    
                    <div class="qr-code">
                        <img src="${qrDataUrl}" alt="QR Code for ${url}" />
                    </div>
                    
                    <div class="url">${url}</div>
                    
                    <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
                    
                    <div class="instructions">
                        <p><strong>Instructions:</strong></p>
                        <ul style="text-align: left;">
                            <li>Open your camera app on your mobile device</li>
                            <li>Point it at the QR code above</li>
                            <li>Tap the notification to open the website</li>
                            <li>Make sure your mobile device is on the same network</li>
                        </ul>
                    </div>
                </div>
                
                <script>
                    function copyUrl() {
                        navigator.clipboard.writeText('${url}').then(() => {
                            // Show feedback
                            const btn = document.querySelector('.copy-btn');
                            const originalText = btn.textContent;
                            btn.textContent = 'Copied!';
                            setTimeout(() => {
                                btn.textContent = originalText;
                            }, 2000);
                        });
                    }
                </script>
            </body>
            </html>
        `;
  }

  dispose() {
    if (this.panel) {
      this.panel.dispose();
      this.panel = null;
    }
  }
}

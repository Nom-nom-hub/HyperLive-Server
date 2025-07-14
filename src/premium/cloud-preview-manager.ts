import * as vscode from 'vscode';
import * as ngrok from 'ngrok';

export interface CloudPreviewInfo {
  publicUrl: string;
  localUrl: string;
  tunnelId: string;
}

export class CloudPreviewManager {
  private tunnel: any = null;
  private outputChannel: vscode.OutputChannel;

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
  }

  async startTunnel(localPort: number): Promise<CloudPreviewInfo | null> {
    try {
      this.outputChannel.appendLine('🌐 Starting cloud preview tunnel...');

      // Start ngrok tunnel
      this.tunnel = await ngrok.connect({
        addr: localPort,
        authtoken: this.getAuthToken(),
      });

      const publicUrl = this.tunnel.publicURL || this.tunnel.url();
      const tunnelId = this.tunnel.id || 'unknown';

      this.outputChannel.appendLine(`✅ Cloud preview started: ${publicUrl}`);
      this.outputChannel.appendLine(`🔗 Local: http://localhost:${localPort}`);
      this.outputChannel.appendLine(`🌍 Public: ${publicUrl}`);

      // Show notification with options
      vscode.window
        .showInformationMessage(
          `Cloud preview ready: ${publicUrl}`,
          'Copy URL',
          'Open Browser',
          'Show QR Code'
        )
        .then(selection => {
          if (selection === 'Copy URL') {
            vscode.env.clipboard.writeText(publicUrl);
            vscode.window.showInformationMessage('URL copied to clipboard!');
          } else if (selection === 'Open Browser') {
            vscode.env.openExternal(vscode.Uri.parse(publicUrl));
          } else if (selection === 'Show QR Code') {
            this.showQRCode(publicUrl);
          }
        });

      return {
        publicUrl,
        localUrl: `http://localhost:${localPort}`,
        tunnelId,
      };
    } catch (error) {
      this.outputChannel.appendLine(
        `❌ Failed to start cloud preview: ${error}`
      );
      vscode.window.showErrorMessage(`Failed to start cloud preview: ${error}`);
      return null;
    }
  }

  async stopTunnel(): Promise<void> {
    if (this.tunnel) {
      try {
        await ngrok.kill();
        this.tunnel = null;
        this.outputChannel.appendLine('🛑 Cloud preview tunnel stopped');
      } catch (error) {
        this.outputChannel.appendLine(`❌ Error stopping tunnel: ${error}`);
      }
    }
  }

  isTunnelActive(): boolean {
    return this.tunnel !== null;
  }

  getTunnelInfo(): CloudPreviewInfo | null {
    if (!this.tunnel) {
      return null;
    }

    const publicUrl = this.tunnel.publicURL || this.tunnel.url();
    const tunnelId = this.tunnel.id || 'unknown';

    return {
      publicUrl,
      localUrl: `http://localhost:${this.tunnel.config.addr}`,
      tunnelId,
    };
  }

  private getAuthToken(): string | undefined {
    // Get auth token from VSCode settings
    const config = vscode.workspace.getConfiguration('advancedLiveServer');
    return config.get('ngrokAuthToken');
  }

  private async showQRCode(url: string): Promise<void> {
    // Import QRCode dynamically to avoid issues
    const QRCode = require('qrcode');

    try {
      const qrDataUrl = await QRCode.toDataURL(url, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });

      // Create webview panel for QR code
      const panel = vscode.window.createWebviewPanel(
        'cloudPreviewQR',
        'Cloud Preview QR Code',
        vscode.ViewColumn.One,
        {
          enableScripts: true,
          retainContextWhenHidden: true,
        }
      );

      panel.webview.html = this.getQRWebviewContent(qrDataUrl, url);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to generate QR code: ${error}`);
    }
  }

  private getQRWebviewContent(qrDataUrl: string, url: string): string {
    return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Cloud Preview QR Code</title>
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
                    .info {
                        margin-top: 20px;
                        font-size: 14px;
                        color: var(--vscode-descriptionForeground);
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>🌍 Cloud Preview</h2>
                    <p>Scan this QR code to access your site from anywhere:</p>
                    
                    <div class="qr-code">
                        <img src="${qrDataUrl}" alt="QR Code for ${url}" />
                    </div>
                    
                    <div class="url">${url}</div>
                    
                    <button class="copy-btn" onclick="copyUrl()">Copy URL</button>
                    
                    <div class="info">
                        <p><strong>Features:</strong></p>
                        <ul style="text-align: left;">
                            <li>Accessible from any device with internet</li>
                            <li>Real-time file changes sync to all devices</li>
                            <li>Secure HTTPS connection</li>
                            <li>No firewall configuration needed</li>
                        </ul>
                    </div>
                </div>
                
                <script>
                    function copyUrl() {
                        navigator.clipboard.writeText('${url}').then(() => {
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
}

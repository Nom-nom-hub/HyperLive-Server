import express from 'express';
import * as http from 'http';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';
import * as WebSocket from 'ws';
import * as chokidar from 'chokidar';
import * as mime from 'mime-types';
import cors from 'cors';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { EventEmitter } from 'events';
import * as vscode from 'vscode';
import { ServerConfig } from '../config/config-manager';
import { injectReloadScript } from '../client/reload-script';
import { spawn, ChildProcess } from 'child_process';

export interface ServerInfo {
  url: string;
  port: number;
  https: boolean;
}

export class LiveServer extends EventEmitter {
  private app: express.Application;
  private server: http.Server | https.Server | null = null;
  private wss: WebSocket.Server | null = null;
  private watcher: chokidar.FSWatcher | null = null;
  private rootPath: string;
  private config: ServerConfig;
  private outputChannel: vscode.OutputChannel;
  private clients: Set<WebSocket> = new Set();
  private collabClients: Set<WebSocket> = new Set();
  private collabDocs: Map<
    string,
    { content: string; cursors: Record<string, any>; comments: any[] }
  > = new Map();
  private isServerRunning: boolean = false;
  private hmrProcess: ChildProcess | null = null;
  private hmrProxyTarget: string | null = null;

  constructor(
    rootPath: string,
    config: ServerConfig,
    outputChannel: vscode.OutputChannel
  ) {
    super();
    this.rootPath = rootPath;
    this.config = config;
    this.outputChannel = outputChannel;

    // Debug: Log the configuration received by the server
    this.outputChannel.appendLine(
      `🔍 LiveServer constructor - Received config:`
    );
    this.outputChannel.appendLine(`  Port: ${this.config.port}`);
    this.outputChannel.appendLine(`  HTTPS: ${this.config.https}`);
    this.outputChannel.appendLine(`  SPA: ${this.config.spa}`);
    this.outputChannel.appendLine(`  OpenBrowser: ${this.config.openBrowser}`);
    this.outputChannel.appendLine(`  ShowOverlay: ${this.config.showOverlay}`);

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
  }

  private setupMiddleware() {
    // CORS
    this.app.use(cors());

    // Proxy middleware
    if (this.config.proxy) {
      Object.entries(this.config.proxy).forEach(([path, target]) => {
        this.app.use(
          path,
          createProxyMiddleware({
            target,
            changeOrigin: true,
            logLevel: 'silent',
          })
        );
      });
    }

    // Static file serving
    this.app.use(
      express.static(this.rootPath, {
        index: false, // We'll handle index files manually
        setHeaders: (res, filePath) => {
          // Set cache headers for static assets
          const ext = path.extname(filePath);
          if (
            [
              '.css',
              '.js',
              '.png',
              '.jpg',
              '.jpeg',
              '.gif',
              '.svg',
              '.ico',
            ].includes(ext)
          ) {
            res.setHeader('Cache-Control', 'public, max-age=31536000');
          } else {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      })
    );
  }

  private setupRoutes() {
    // Handle root path specifically
    this.app.get('/', (req, res) => {
      const indexPath = path.join(this.rootPath, 'index.html');
      this.outputChannel.appendLine(
        `🔍 Root path requested, checking for: ${indexPath}`
      );

      if (fs.existsSync(indexPath)) {
        this.outputChannel.appendLine(`✅ Found index.html, serving...`);
        this.serveFile(indexPath, res);
      } else {
        this.outputChannel.appendLine(
          `❌ index.html not found at: ${indexPath}`
        );
        this.serve404(res);
      }
    });

    // Main route handler for all other paths
    this.app.get('*', (req, res) => {
      const requestPath = req.path;
      const fullPath = path.join(this.rootPath, requestPath);

      this.outputChannel.appendLine(
        `🔍 Request: ${requestPath} -> ${fullPath}`
      );

      // Check if file exists
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        this.outputChannel.appendLine(`✅ File found, serving: ${fullPath}`);
        this.serveFile(fullPath, res);
      } else {
        this.outputChannel.appendLine(`❌ File not found: ${fullPath}`);
        
        // Check if it's a directory and has an index.html
        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory()) {
          const dirIndexPath = path.join(fullPath, 'index.html');
          if (fs.existsSync(dirIndexPath)) {
            this.outputChannel.appendLine(`✅ Found index.html in directory, serving: ${dirIndexPath}`);
            this.serveFile(dirIndexPath, res);
            return;
          }
        }
        
        // SPA fallback or 404
        if (this.config.spa) {
          this.outputChannel.appendLine(`📱 SPA mode enabled, serving index.html for: ${requestPath}`);
          this.serveSPA(res);
        } else {
          this.outputChannel.appendLine(`❌ File not found and SPA mode disabled: ${requestPath}`);
          this.serve404(res);
        }
      }
    });
  }

  private serveFile(filePath: string, res: express.Response) {
    const ext = path.extname(filePath);
    const contentType = mime.lookup(ext) || 'application/octet-stream';

    this.outputChannel.appendLine(`📄 Serving file: ${filePath} (${contentType})`);
    res.setHeader('Content-Type', contentType);

    // Inject reload script for HTML files
    if (ext === '.html') {
      let content = fs.readFileSync(filePath, 'utf8');
      content = injectReloadScript(content, this.config.showOverlay);
      this.outputChannel.appendLine(`✅ HTML file served with reload script: ${filePath}`);
      res.send(content);
    } else {
      this.outputChannel.appendLine(`✅ Static file served: ${filePath}`);
      res.sendFile(filePath);
    }
  }

  private serveSPA(res: express.Response) {
    const indexPath = path.join(this.rootPath, 'index.html');
    if (fs.existsSync(indexPath)) {
      let content = fs.readFileSync(indexPath, 'utf8');
      content = injectReloadScript(content, this.config.showOverlay);
      res.setHeader('Content-Type', 'text/html');
      res.send(content);
    } else {
      this.serve404(res);
    }
  }

  private serve404(res: express.Response) {
    res.status(404).send(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>404 - File Not Found</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
                    .error { color: #e74c3c; font-size: 72px; margin-bottom: 20px; }
                    .message { font-size: 18px; color: #7f8c8d; }
                </style>
            </head>
            <body>
                <div class="error">404</div>
                <div class="message">File not found</div>
                <p>Advanced Live Server</p>
            </body>
            </html>
        `);
  }

  async start(): Promise<void> {
    try {
      this.outputChannel.appendLine(`🚀 Starting Advanced Live Server...`);
      this.outputChannel.appendLine(`📁 Root path: ${this.rootPath}`);
      this.outputChannel.appendLine(`🔧 Port: ${this.config.port}`);
      this.outputChannel.appendLine(
        `🔒 HTTPS: ${this.config.https ? 'Enabled' : 'Disabled'}`
      );
      this.outputChannel.appendLine(
        `🌐 Auto-open browser: ${this.config.openBrowser ? 'Enabled' : 'Disabled'}`
      );
      this.outputChannel.appendLine(
        `📱 SPA mode: ${this.config.spa ? 'Enabled' : 'Disabled'}`
      );

      // HMR Adapter: auto-detect and start dev server if needed
      const projectType: string | undefined = this.config.projectType;
      if (
        projectType &&
        ['vite', 'snowpack', 'webpack'].includes(projectType)
      ) {
        await this.startHMRAdapter(projectType);
      }

      // Create server (HTTP or HTTPS)
      if (this.config.https) {
        this.outputChannel.appendLine(`🔒 Generating HTTPS certificates...`);
        const certs = await this.generateCertificates();
        this.outputChannel.appendLine(
          `✅ HTTPS certificates generated successfully`
        );
        this.server = https.createServer(
          {
            key: (certs.key ?? '') as string,
            cert: (certs.cert ?? '') as string,
          },
          this.app
        );
        this.outputChannel.appendLine(`🔒 HTTPS server created`);
      } else {
        this.server = http.createServer(this.app);
        this.outputChannel.appendLine(`🌐 HTTP server created`);
      }

      // Start server
      this.outputChannel.appendLine(
        `🚀 Starting server on port ${this.config.port}...`
      );
      await new Promise<void>((resolve, reject) => {
        this.server!.listen(this.config.port, () => {
          this.isServerRunning = true;
          this.outputChannel.appendLine(
            `✅ Server started successfully on port ${this.config.port}`
          );
          resolve();
        });
        this.server!.on('error', error => {
          this.outputChannel.appendLine(
            `❌ Server startup error: ${error.message}`
          );
          reject(error);
        });
      });

      // Setup HMR proxy if needed
      if (this.hmrProxyTarget) {
        this.app.use(
          '/',
          createProxyMiddleware({
            target: this.hmrProxyTarget,
            changeOrigin: true,
            ws: true,
            logLevel: 'silent',
            onProxyReq: () => {
              // Optionally log or modify requests
            },
          })
        );
        this.outputChannel.appendLine(
          `🔗 HMR proxy enabled: ${this.hmrProxyTarget}`
        );
      }

      // Setup WebSocket server
      this.setupWebSocket();

      // Setup file watcher
      this.setupFileWatcher();

      // Emit started event
      this.emit('started', this.config.port, this.config.https);
    } catch (error) {
      this.outputChannel.appendLine(`❌ Failed to start server: ${error}`);
      this.emit('error', `Failed to start server: ${error}`);
      throw error;
    }
  }

  private async startHMRAdapter(projectType: string) {
    // Check if dev server is running, otherwise start it
    let devPort = 5173; // Vite default
    let devCmd = '';
    let devArgs: string[] = [];
    let devTarget = '';
    if (projectType === 'vite') {
      devCmd = 'npx';
      devArgs = ['vite'];
      devPort = 5173;
      devTarget = `http://localhost:${devPort}`;
    } else if (projectType === 'snowpack') {
      devCmd = 'npx';
      devArgs = ['snowpack', 'dev'];
      devPort = 8080;
      devTarget = `http://localhost:${devPort}`;
    } else if (projectType === 'webpack') {
      devCmd = 'npx';
      devArgs = ['webpack', 'serve'];
      devPort = 8080;
      devTarget = `http://localhost:${devPort}`;
    }
    // Check if port is open
    const isRunning = await this.checkPortOpen(devPort);
    if (!isRunning) {
      this.outputChannel.appendLine(`🚀 Starting ${projectType} dev server...`);
      this.hmrProcess = spawn(devCmd, devArgs, {
        cwd: this.rootPath,
        shell: true,
        stdio: 'inherit',
      });
      // Wait for server to start
      await this.waitForPort(devPort, 15000);
    }
    this.hmrProxyTarget = devTarget;
  }

  private checkPortOpen(port: number): Promise<boolean> {
    return new Promise(resolve => {
      const net = require('net');
      const tester = net.createConnection({ port }, () => {
        tester.end();
        resolve(true);
      });
      tester.on('error', () => resolve(false));
    });
  }

  private waitForPort(port: number, timeout: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const check = async () => {
        if (await this.checkPortOpen(port)) {
          return resolve();
        }
        if (Date.now() - start > timeout) {
          return reject(new Error('Dev server did not start in time'));
        }
        setTimeout(check, 500);
      };
      check();
    });
  }

  private setupWebSocket() {
    if (!this.server) {
      this.outputChannel.appendLine(
        `❌ Cannot setup WebSocket: server is null`
      );
      return;
    }

    this.wss = new WebSocket.Server({ server: this.server });
    this.outputChannel.appendLine(`🔧 WebSocket server created`);

    this.wss.on('connection', (ws: WebSocket) => {
      this.clients.add(ws);
      this.collabClients.add(ws);
      this.outputChannel.appendLine(
        `🔗 Client connected (${this.clients.size} total)`
      );

      ws.on('message', data => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg && msg.type && msg.channel === 'collab') {
            this.handleCollabMessage(ws, msg);
          }
        } catch (e) {
          this.outputChannel.appendLine(`❌ WebSocket message error: ${e}`);
        }
      });

      ws.on('close', () => {
        this.clients.delete(ws);
        this.collabClients.delete(ws);
        this.outputChannel.appendLine(
          `🔌 Client disconnected (${this.clients.size} total)`
        );
      });

      ws.on('error', error => {
        this.outputChannel.appendLine(`❌ WebSocket error: ${error}`);
      });
    });

    this.wss.on('error', error => {
      this.outputChannel.appendLine(`❌ WebSocket server error: ${error}`);
    });
  }

  private handleCollabMessage(ws: WebSocket, msg: any) {
    // msg: { type, docId, userId, ... }
    const { type, docId, userId, content, cursor, comment } = msg;
    if (!docId) {
      return;
    }
    if (!this.collabDocs.has(docId)) {
      this.collabDocs.set(docId, { content: '', cursors: {}, comments: [] });
    }
    const doc = this.collabDocs.get(docId)!;
    if (type === 'doc-sync') {
      doc.content = content;
      this.broadcastCollab({ type: 'doc-sync', docId, userId, content }, ws);
    } else if (type === 'cursor-sync') {
      doc.cursors[userId] = cursor;
      this.broadcastCollab({ type: 'cursor-sync', docId, userId, cursor }, ws);
    } else if (type === 'comment-add') {
      doc.comments.push(comment);
      this.broadcastCollab({ type: 'comment-add', docId, userId, comment }, ws);
    } else if (type === 'comment-remove') {
      doc.comments = doc.comments.filter((c: any) => c.id !== comment.id);
      this.broadcastCollab(
        { type: 'comment-remove', docId, userId, comment },
        ws
      );
    } else if (type === 'get-state') {
      ws.send(
        JSON.stringify({
          channel: 'collab',
          type: 'state',
          docId,
          content: doc.content,
          cursors: doc.cursors,
          comments: doc.comments,
        })
      );
    }
  }

  private broadcastCollab(msg: any, exceptWs?: WebSocket) {
    const data = JSON.stringify({ ...msg, channel: 'collab' });
    this.collabClients.forEach(client => {
      if (client !== exceptWs && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  private setupFileWatcher() {
    this.outputChannel.appendLine(
      `🔧 Setting up file watcher for: ${this.rootPath}`
    );
    this.outputChannel.appendLine(
      `🔧 Ignore patterns: ${JSON.stringify(this.config.ignorePatterns)}`
    );

    this.watcher = chokidar.watch(this.rootPath, {
      ignored: this.config.ignorePatterns,
      persistent: true,
      ignoreInitial: true,
    });

    this.watcher.on('ready', () => {
      this.outputChannel.appendLine(`✅ File watcher ready`);
    });

    this.watcher.on('change', filePath => {
      this.outputChannel.appendLine(`📝 File change detected: ${filePath}`);
      this.handleFileChange(filePath);
    });

    this.watcher.on('add', filePath => {
      this.outputChannel.appendLine(
        `📁 File added: ${path.relative(this.rootPath, filePath)}`
      );
    });

    this.watcher.on('unlink', filePath => {
      this.outputChannel.appendLine(
        `🗑️ File deleted: ${path.relative(this.rootPath, filePath)}`
      );
    });

    this.watcher.on('error', error => {
      this.outputChannel.appendLine(`❌ File watcher error: ${error}`);
    });
  }

  private handleFileChange(filePath: string) {
    const relativePath = path.relative(this.rootPath, filePath);
    const ext = path.extname(filePath);

    this.outputChannel.appendLine(`📝 File changed: ${relativePath}`);
    this.emit('fileChanged', relativePath);

    // Notify all connected clients
    this.notifyClients({
      type: 'reload',
      file: relativePath,
      extension: ext,
    });
  }

  private notifyClients(message: any) {
    const messageStr = JSON.stringify(message);
    this.outputChannel.appendLine(
      `📤 Notifying ${this.clients.size} clients: ${messageStr}`
    );

    let clientIndex = 0;
    this.clients.forEach(client => {
      clientIndex++;
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
        this.outputChannel.appendLine(
          `✅ Message sent to client ${clientIndex}`
        );
      } else {
        this.outputChannel.appendLine(
          `❌ Client ${clientIndex} not ready (state: ${client.readyState})`
        );
      }
    });
  }

  private async generateCertificates(): Promise<{ key: string; cert: string }> {
    // Try to use mkcert for trusted local certificates if available
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const { execSync } = require('child_process');
    const certDir = path.join(os.homedir(), '.advanced-live-server', 'certs');
    const keyPath = path.join(certDir, 'localhost-key.pem');
    const certPath = path.join(certDir, 'localhost-cert.pem');

    // Check if mkcert is installed
    let mkcertAvailable = false;
    try {
      execSync('mkcert --version', { stdio: 'ignore' });
      mkcertAvailable = true;
    } catch {
      mkcertAvailable = false;
    }

    if (mkcertAvailable) {
      this.outputChannel.appendLine(
        `🔒 Attempting to use mkcert for trusted certificates...`
      );
      // Ensure cert directory exists
      if (!fs.existsSync(certDir)) {
        fs.mkdirSync(certDir, { recursive: true });
        this.outputChannel.appendLine(`📁 Created directory: ${certDir}`);
      }
      // Generate certs if not present
      if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
        try {
          this.outputChannel.appendLine(
            `🔒 Generating new mkcert certificates...`
          );
          execSync(
            `mkcert -key-file "${keyPath}" -cert-file "${certPath}" localhost 127.0.0.1 ::1`,
            { stdio: 'inherit' }
          );
          this.outputChannel.appendLine(
            `✅ mkcert certificates generated successfully.`
          );
        } catch (e) {
          const errorMessage = e instanceof Error ? e.message : String(e);
          this.outputChannel.appendLine(
            `❌ mkcert failed to generate certificates: ${errorMessage}`
          );
          this.outputChannel.appendLine(
            `🔒 Falling back to self-signed certificate.`
          );
        }
      } else {
        this.outputChannel.appendLine(
          `🔒 mkcert certificates already exist at: ${certDir}`
        );
      }
      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        this.outputChannel.appendLine(
          `🔒 Using trusted local certificate from mkcert.`
        );
        return {
          key: fs.readFileSync(keyPath, 'utf8') || '',
          cert: fs.readFileSync(certPath, 'utf8') || '',
        };
      }
    } else {
      this.outputChannel.appendLine(
        `🔒 mkcert is not installed. Falling back to self-signed certificate.`
      );
    }

    // Fallback: use self-signed certificate
    this.outputChannel.appendLine(
      `🔒 Using self-signed certificate. For trusted certs, install mkcert.`
    );
    const selfsigned = require('selfsigned');
    const attrs = [{ name: 'commonName', value: 'localhost' }];
    const pems = selfsigned.generate(attrs, { days: 365 });
    return {
      key: pems.private || '',
      cert: pems.cert || '',
    };
  }

  async stop(): Promise<void> {
    this.isServerRunning = false;

    // Close WebSocket server
    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    // Close file watcher
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }

    // Close HTTP/HTTPS server
    if (this.server) {
      await new Promise<void>(resolve => {
        this.server!.close(() => resolve());
      });
      this.server = null;
    }

    // Clear clients
    this.clients.clear();

    this.emit('stopped');
  }

  isRunning(): boolean {
    return this.isServerRunning;
  }

  getServerInfo(): ServerInfo | null {
    if (!this.isServerRunning) {
      return null;
    }

    const protocol = this.config.https ? 'https' : 'http';
    const url = `${protocol}://localhost:${this.config.port}`;

    // Debug: Log the server info being generated
    this.outputChannel.appendLine(`🔍 getServerInfo - Generating URL:`);
    this.outputChannel.appendLine(`  Config HTTPS: ${this.config.https}`);
    this.outputChannel.appendLine(`  Protocol: ${protocol}`);
    this.outputChannel.appendLine(`  Port: ${this.config.port}`);
    this.outputChannel.appendLine(`  Final URL: ${url}`);

    return {
      url: url,
      port: this.config.port,
      https: this.config.https,
    };
  }
}

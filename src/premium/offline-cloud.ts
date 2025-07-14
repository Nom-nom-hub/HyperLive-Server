import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as http from 'http';
import * as https from 'https';
import * as crypto from 'crypto';
import * as child_process from 'child_process';

export interface OfflineCloudConfig {
  enabled: boolean;
  port: number;
  domain: string;
  ssl: {
    enabled: boolean;
    certPath: string;
    keyPath: string;
  };
  features: {
    cdn: boolean;
    analytics: boolean;
    caching: boolean;
    compression: boolean;
    security: boolean;
  };
  storage: {
    maxSize: number; // MB
    cleanupInterval: number; // hours
  };
}

export interface CloudResource {
  id: string;
  path: string;
  type: 'file' | 'directory' | 'api';
  size: number;
  mimeType: string;
  lastModified: Date;
  etag: string;
  cacheControl: string;
  headers: { [key: string]: string };
}

export interface CloudAnalytics {
  requests: number;
  bandwidth: number;
  errors: number;
  uniqueVisitors: number;
  topResources: { path: string; hits: number }[];
  responseTimes: number[];
}

export class OfflineCloudService {
  private config: OfflineCloudConfig;
  private server: http.Server | https.Server | undefined;
  private resources: Map<string, CloudResource> = new Map();
  private analytics: CloudAnalytics;
  private context: vscode.ExtensionContext;
  private outputChannel: vscode.OutputChannel;
  private isRunning: boolean = false;

  constructor(context: vscode.ExtensionContext) {
    this.context = context;
    this.outputChannel = vscode.window.createOutputChannel(
      'Advanced Live Server - Offline Cloud'
    );
    this.config = this.loadConfig();
    this.analytics = this.initializeAnalytics();
  }

  private loadConfig(): OfflineCloudConfig {
    const workspaceConfig = vscode.workspace.getConfiguration(
      'advancedLiveServer.offlineCloud'
    );

    return {
      enabled: workspaceConfig.get('enabled', false),
      port: workspaceConfig.get('port', 8443),
      domain: workspaceConfig.get('domain', 'localhost'),
      ssl: {
        enabled: workspaceConfig.get('ssl.enabled', true),
        certPath: workspaceConfig.get('ssl.certPath', ''),
        keyPath: workspaceConfig.get('ssl.keyPath', ''),
      },
      features: {
        cdn: workspaceConfig.get('features.cdn', true),
        analytics: workspaceConfig.get('features.analytics', true),
        caching: workspaceConfig.get('features.caching', true),
        compression: workspaceConfig.get('features.compression', true),
        security: workspaceConfig.get('features.security', true),
      },
      storage: {
        maxSize: workspaceConfig.get('storage.maxSize', 100),
        cleanupInterval: workspaceConfig.get('storage.cleanupInterval', 24),
      },
    };
  }

  private initializeAnalytics(): CloudAnalytics {
    return {
      requests: 0,
      bandwidth: 0,
      errors: 0,
      uniqueVisitors: 0,
      topResources: [],
      responseTimes: [],
    };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Offline cloud service is already running');
    }

    if (!this.config.enabled) {
      throw new Error('Offline cloud service is not enabled');
    }

    this.outputChannel.appendLine('Starting offline cloud service...');

    try {
      // Create SSL certificates if needed
      if (this.config.ssl.enabled) {
        await this.generateSSLCertificates();
      }

      // Initialize storage
      await this.initializeStorage();

      // Start server
      if (this.config.ssl.enabled) {
        this.server = https.createServer(
          {
            cert: fs.readFileSync(this.config.ssl.certPath),
            key: fs.readFileSync(this.config.ssl.keyPath),
          },
          this.handleRequest.bind(this)
        );
      } else {
        this.server = http.createServer(this.handleRequest.bind(this));
      }

      this.server.listen(this.config.port, () => {
        this.isRunning = true;
        const protocol = this.config.ssl.enabled ? 'https' : 'http';
        const url = `${protocol}://${this.config.domain}:${this.config.port}`;
        this.outputChannel.appendLine(
          `✅ Offline cloud service started at ${url}`
        );

        vscode.window
          .showInformationMessage(
            `Offline cloud service started at ${url}`,
            'Open in Browser'
          )
          .then(selection => {
            if (selection === 'Open in Browser') {
              vscode.env.openExternal(vscode.Uri.parse(url));
            }
          });
      });

      // Start cleanup interval
      this.startCleanupInterval();
    } catch (error) {
      this.outputChannel.appendLine(
        `❌ Failed to start offline cloud service: ${error}`
      );
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.outputChannel.appendLine('Stopping offline cloud service...');

    if (this.server) {
      this.server.close();
      this.server = undefined;
    }

    this.isRunning = false;
    this.outputChannel.appendLine('✅ Offline cloud service stopped');
  }

  private async generateSSLCertificates(): Promise<void> {
    const certDir = path.join(this.context.globalStorageUri.fsPath, 'ssl');

    if (!fs.existsSync(certDir)) {
      fs.mkdirSync(certDir, { recursive: true });
    }

    this.config.ssl.certPath = path.join(certDir, 'cert.pem');
    this.config.ssl.keyPath = path.join(certDir, 'key.pem');

    // Generate self-signed certificate if it doesn't exist
    if (
      !fs.existsSync(this.config.ssl.certPath) ||
      !fs.existsSync(this.config.ssl.keyPath)
    ) {
      this.outputChannel.appendLine('Generating SSL certificates...');

      const certScript = `
        const forge = require('node-forge');
        
        const keys = forge.pki.rsa.generateKeyPair(2048);
        const cert = forge.pki.createCertificate();
        
        cert.publicKey = keys.publicKey;
        cert.serialNumber = '01';
        cert.validity.notBefore = new Date();
        cert.validity.notAfter = new Date();
        cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);
        
        const attrs = [
          { name: 'commonName', value: '${this.config.domain}' },
          { name: 'countryName', value: 'US' },
          { shortName: 'ST', value: 'State' },
          { name: 'localityName', value: 'City' },
          { name: 'organizationName', value: 'Advanced Live Server' },
          { shortName: 'OU', value: 'Development' }
        ];
        
        cert.setSubject(attrs);
        cert.setIssuer(attrs);
        cert.sign(keys.privateKey);
        
        const certPem = forge.pki.certificateToPem(cert);
        const keyPem = forge.pki.privateKeyToPem(keys.privateKey);
        
        require('fs').writeFileSync('${this.config.ssl.certPath}', certPem);
        require('fs').writeFileSync('${this.config.ssl.keyPath}', keyPem);
      `;

      const scriptPath = path.join(
        this.context.globalStorageUri.fsPath,
        'generate-cert.js'
      );
      fs.writeFileSync(scriptPath, certScript);

      return new Promise((resolve, reject) => {
        child_process.exec(`node ${scriptPath}`, error => {
          if (error) {
            reject(
              new Error(`Failed to generate SSL certificates: ${error.message}`)
            );
          } else {
            this.outputChannel.appendLine('✅ SSL certificates generated');
            resolve();
          }
        });
      });
    }
  }

  private async initializeStorage(): Promise<void> {
    const storageDir = path.join(
      this.context.globalStorageUri.fsPath,
      'cloud-storage'
    );

    if (!fs.existsSync(storageDir)) {
      fs.mkdirSync(storageDir, { recursive: true });
    }

    // Create subdirectories
    const subdirs = ['cdn', 'cache', 'uploads', 'analytics'];
    for (const dir of subdirs) {
      const dirPath = path.join(storageDir, dir);
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
    }

    // Load existing resources
    await this.scanStorage();
  }

  private async scanStorage(): Promise<void> {
    const storageDir = path.join(
      this.context.globalStorageUri.fsPath,
      'cloud-storage'
    );

    const scanDirectory = (dir: string, prefix: string = '') => {
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        const resourcePath = prefix + '/' + item.name;

        if (item.isDirectory()) {
          scanDirectory(fullPath, resourcePath);
        } else {
          const stats = fs.statSync(fullPath);
          const content = fs.readFileSync(fullPath);
          const etag = crypto.createHash('md5').update(content).digest('hex');

          const resource: CloudResource = {
            id: crypto.randomUUID(),
            path: resourcePath,
            type: 'file',
            size: stats.size,
            mimeType: this.getMimeType(item.name),
            lastModified: stats.mtime,
            etag: etag,
            cacheControl: 'public, max-age=3600',
            headers: {},
          };

          this.resources.set(resourcePath, resource);
        }
      }
    };

    scanDirectory(storageDir);
  }

  private getMimeType(filename: string): string {
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject',
    };

    return mimeTypes[ext] || 'application/octet-stream';
  }

  private handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    const startTime = Date.now();
    const url = req.url || '/';

    // Update analytics
    this.analytics.requests++;

    try {
      // Security headers
      if (this.config.features.security) {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
      }

      // Handle different request types
      if (req.method === 'GET') {
        this.handleGetRequest(url, req, res);
      } else if (req.method === 'POST') {
        this.handlePostRequest(url, req, res);
      } else if (req.method === 'PUT') {
        this.handlePutRequest(url, req, res);
      } else if (req.method === 'DELETE') {
        this.handleDeleteRequest(url, req, res);
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }

      // Update response time analytics
      const responseTime = Date.now() - startTime;
      this.analytics.responseTimes.push(responseTime);
      if (this.analytics.responseTimes.length > 100) {
        this.analytics.responseTimes.shift();
      }
    } catch {
      this.analytics.errors++;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  }

  private handleGetRequest(
    url: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // Check cache first
    if (this.config.features.caching) {
      const cached = this.getCachedResource();
      if (cached) {
        res.writeHead(200, cached.headers);
        res.end(cached.content);
        return;
      }
    }

    // Handle API endpoints
    if (url.startsWith('/api/')) {
      this.handleAPIRequest(url, req, res);
      return;
    }

    // Handle static files
    const resource = this.resources.get(url);
    if (resource) {
      const filePath = path.join(
        this.context.globalStorageUri.fsPath,
        'cloud-storage',
        resource.path
      );

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath);

        // Apply compression if enabled
        if (
          this.config.features.compression &&
          this.isCompressible(resource.mimeType)
        ) {
          const zlib = require('zlib');
          const compressed = zlib.gzipSync(content);
          res.writeHead(200, {
            'Content-Type': resource.mimeType,
            'Content-Encoding': 'gzip',
            'Content-Length': compressed.length,
            ETag: resource.etag,
            'Cache-Control': resource.cacheControl,
          });
          res.end(compressed);
        } else {
          res.writeHead(200, {
            'Content-Type': resource.mimeType,
            'Content-Length': content.length,
            ETag: resource.etag,
            'Cache-Control': resource.cacheControl,
          });
          res.end(content);
        }

        // Update bandwidth analytics
        this.analytics.bandwidth += content.length;

        // Cache the resource
        if (this.config.features.caching) {
          this.cacheResource();
        }
      } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Resource not found' }));
      }
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Resource not found' }));
    }
  }

  private handleAPIRequest(
    url: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    if (url === '/api/analytics') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(this.analytics));
    } else if (url === '/api/resources') {
      const resources = Array.from(this.resources.values());
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(resources));
    } else if (url.startsWith('/api/upload')) {
      this.handleUpload(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'API endpoint not found' }));
    }
  }

  private handlePostRequest(
    url: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    if (url.startsWith('/api/upload')) {
      this.handleUpload(req, res);
    } else {
      res.writeHead(405, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Method not allowed' }));
    }
  }

  private handlePutRequest(
    url: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // Handle file updates
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not implemented' }));
  }

  private handleDeleteRequest(
    url: string,
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // Handle file deletion
    res.writeHead(501, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not implemented' }));
  }

  private handleUpload(
    req: http.IncomingMessage,
    res: http.ServerResponse
  ): void {
    // Simple file upload handling
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { filename, content, type } = data;

        const uploadDir = path.join(
          this.context.globalStorageUri.fsPath,
          'cloud-storage',
          'uploads'
        );
        const filePath = path.join(uploadDir, filename);

        fs.writeFileSync(filePath, Buffer.from(content, 'base64'));

        const stats = fs.statSync(filePath);
        const etag = crypto.createHash('md5').update(content).digest('hex');

        const resource: CloudResource = {
          id: crypto.randomUUID(),
          path: '/uploads/' + filename,
          type: 'file',
          size: stats.size,
          mimeType: type || this.getMimeType(filename),
          lastModified: stats.mtime,
          etag: etag,
          cacheControl: 'public, max-age=3600',
          headers: {},
        };

        this.resources.set(resource.path, resource);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, resource }));
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid upload data' }));
      }
    });
  }

  private isCompressible(mimeType: string): boolean {
    const compressibleTypes = [
      'text/',
      'application/json',
      'application/javascript',
      'application/xml',
      'application/xhtml+xml',
    ];

    return compressibleTypes.some(type => mimeType.startsWith(type));
  }

  private getCachedResource(): any {
    // Simple in-memory cache implementation
    return null; // Placeholder
  }

  private cacheResource(): void {
    // Simple in-memory cache implementation
    // In a real implementation, you'd use a proper caching mechanism
  }

  private startCleanupInterval(): void {
    setInterval(
      () => {
        this.cleanupStorage();
      },
      this.config.storage.cleanupInterval * 60 * 60 * 1000
    ); // Convert hours to milliseconds
  }

  private cleanupStorage(): void {
    this.outputChannel.appendLine('Running storage cleanup...');

    const storageDir = path.join(
      this.context.globalStorageUri.fsPath,
      'cloud-storage'
    );
    let totalSize = 0;

    const calculateSize = (dir: string): number => {
      let size = 0;
      const items = fs.readdirSync(dir, { withFileTypes: true });

      for (const item of items) {
        const fullPath = path.join(dir, item.name);
        if (item.isDirectory()) {
          size += calculateSize(fullPath);
        } else {
          size += fs.statSync(fullPath).size;
        }
      }

      return size;
    };

    totalSize = calculateSize(storageDir);
    const maxSizeBytes = this.config.storage.maxSize * 1024 * 1024; // Convert MB to bytes

    if (totalSize > maxSizeBytes) {
      this.outputChannel.appendLine(
        `Storage cleanup needed: ${totalSize} bytes > ${maxSizeBytes} bytes`
      );
      // Implement cleanup logic here
    }
  }

  getAnalytics(): CloudAnalytics {
    return { ...this.analytics };
  }

  getResources(): CloudResource[] {
    return Array.from(this.resources.values());
  }

  isServiceRunning(): boolean {
    return this.isRunning;
  }

  getServiceUrl(): string {
    const protocol = this.config.ssl.enabled ? 'https' : 'http';
    return `${protocol}://${this.config.domain}:${this.config.port}`;
  }

  updateConfig(updates: Partial<OfflineCloudConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update workspace configuration
    const config = vscode.workspace.getConfiguration(
      'advancedLiveServer.offlineCloud'
    );

    if (updates.enabled !== undefined) {
      config.update('enabled', updates.enabled);
    }
    if (updates.port !== undefined) {
      config.update('port', updates.port);
    }
    if (updates.domain !== undefined) {
      config.update('domain', updates.domain);
    }
  }
}

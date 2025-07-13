import express from 'express';
import multer from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';

export interface MockEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  response: any;
  statusCode?: number;
  headers?: Record<string, string>;
  delay?: number;
}

export interface MockAPIConfig {
  basePath: string;
  endpoints: MockEndpoint[];
  enableFileUpload: boolean;
  uploadDir: string;
  enableLogging: boolean;
}

export class MockAPIServer {
  private app: express.Application;
  private config: MockAPIConfig;
  private outputChannel: vscode.OutputChannel;
  private uploadStorage!: multer.StorageEngine;

  constructor(config: MockAPIConfig, outputChannel: vscode.OutputChannel) {
    this.config = config;
    this.outputChannel = outputChannel;
    this.app = express();
    this.setupMiddleware();
    this.setupEndpoints();
  }

  private setupMiddleware() {
    // JSON parsing
    this.app.use(express.json());
    this.app.use(express.urlencoded({ extended: true }));

    // CORS
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header(
        'Access-Control-Allow-Methods',
        'GET, POST, PUT, DELETE, PATCH, OPTIONS'
      );
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Request logging
    if (this.config.enableLogging) {
      this.app.use((req, res, next) => {
        this.logRequest(req);
        next();
      });
    }

    // File upload setup
    if (this.config.enableFileUpload) {
      this.setupFileUpload();
    }
  }

  private setupFileUpload() {
    // Ensure upload directory exists
    if (!fs.existsSync(this.config.uploadDir)) {
      fs.mkdirSync(this.config.uploadDir, { recursive: true });
    }

    // Configure multer for file uploads
    this.uploadStorage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, this.config.uploadDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(
          null,
          file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname)
        );
      },
    });

    const upload = multer({ storage: this.uploadStorage });

    // File upload endpoint
    this.app.post('/api/upload', upload.single('file'), (req, res) => {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const fileInfo = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype,
        path: req.file.path,
        url: `/uploads/${req.file.filename}`,
      };

      this.outputChannel.appendLine(
        `📁 File uploaded: ${fileInfo.originalName} (${fileInfo.size} bytes)`
      );
      res.json({
        success: true,
        file: fileInfo,
      });
    });

    // Serve uploaded files
    this.app.use('/uploads', express.static(this.config.uploadDir));
  }

  private setupEndpoints() {
    // Setup configured endpoints
    this.config.endpoints.forEach(endpoint => {
      const fullPath = path.join(this.config.basePath, endpoint.path);

      switch (endpoint.method) {
        case 'GET':
          this.app.get(fullPath, this.createHandler(endpoint));
          break;
        case 'POST':
          this.app.post(fullPath, this.createHandler(endpoint));
          break;
        case 'PUT':
          this.app.put(fullPath, this.createHandler(endpoint));
          break;
        case 'DELETE':
          this.app.delete(fullPath, this.createHandler(endpoint));
          break;
        case 'PATCH':
          this.app.patch(fullPath, this.createHandler(endpoint));
          break;
      }
    });

    // Default endpoints for common use cases
    this.setupDefaultEndpoints();
  }

  private createHandler(endpoint: MockEndpoint) {
    return async (req: express.Request, res: express.Response) => {
      try {
        // Add delay if specified
        if (endpoint.delay) {
          await new Promise(resolve => setTimeout(resolve, endpoint.delay));
        }

        // Set custom headers
        if (endpoint.headers) {
          Object.entries(endpoint.headers).forEach(([key, value]) => {
            res.setHeader(key, value);
          });
        }

        // Send response
        const statusCode = endpoint.statusCode || 200;
        res.status(statusCode).json(endpoint.response);

        this.outputChannel.appendLine(
          `✅ Mock API: ${endpoint.method} ${endpoint.path} → ${statusCode}`
        );
      } catch (error) {
        this.outputChannel.appendLine(`❌ Mock API Error: ${error}`);
        res.status(500).json({ error: 'Internal server error' });
      }
    };
  }

  private setupDefaultEndpoints() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // Echo endpoint for testing
    this.app.post('/api/echo', (req, res) => {
      res.json({
        method: req.method,
        url: req.url,
        headers: req.headers,
        body: req.body,
        query: req.query,
        timestamp: new Date().toISOString(),
      });
    });

    // Users endpoint (common mock data)
    this.app.get('/api/users', (req, res) => {
      const users = [
        { id: 1, name: 'John Doe', email: 'john@example.com' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com' },
      ];
      res.json(users);
    });

    // Posts endpoint
    this.app.get('/api/posts', (req, res) => {
      const posts = [
        {
          id: 1,
          title: 'First Post',
          content: 'This is the first post',
          authorId: 1,
        },
        {
          id: 2,
          title: 'Second Post',
          content: 'This is the second post',
          authorId: 2,
        },
        {
          id: 3,
          title: 'Third Post',
          content: 'This is the third post',
          authorId: 1,
        },
      ];
      res.json(posts);
    });

    // Error simulation endpoints
    this.app.get('/api/error/400', (req, res) => {
      res
        .status(400)
        .json({
          error: 'Bad Request',
          message: 'This is a simulated 400 error',
        });
    });

    this.app.get('/api/error/404', (req, res) => {
      res
        .status(404)
        .json({ error: 'Not Found', message: 'This is a simulated 404 error' });
    });

    this.app.get('/api/error/500', (req, res) => {
      res
        .status(500)
        .json({
          error: 'Internal Server Error',
          message: 'This is a simulated 500 error',
        });
    });
  }

  private logRequest(req: express.Request) {
    const method = req.method;
    const url = req.url;
    const userAgent = req.get('User-Agent') || 'Unknown';
    const ip = req.ip || req.connection.remoteAddress || 'Unknown';

    this.outputChannel.appendLine(
      `📡 Mock API Request: ${method} ${url} from ${ip} (${userAgent})`
    );

    if (req.body && Object.keys(req.body).length > 0) {
      this.outputChannel.appendLine(
        `📦 Request Body: ${JSON.stringify(req.body, null, 2)}`
      );
    }
  }

  getApp(): express.Application {
    return this.app;
  }

  getConfig(): MockAPIConfig {
    return this.config;
  }

  updateConfig(newConfig: MockAPIConfig) {
    this.config = newConfig;
    this.outputChannel.appendLine('🔄 Mock API configuration updated');
  }

  getEndpoints(): MockEndpoint[] {
    return this.config.endpoints;
  }

  addEndpoint(endpoint: MockEndpoint) {
    this.config.endpoints.push(endpoint);
    this.setupEndpoints(); // Re-setup endpoints
    this.outputChannel.appendLine(
      `➕ Added mock endpoint: ${endpoint.method} ${endpoint.path}`
    );
  }

  removeEndpoint(method: string, path: string) {
    this.config.endpoints = this.config.endpoints.filter(
      ep => !(ep.method === method && ep.path === path)
    );
    this.outputChannel.appendLine(
      `➖ Removed mock endpoint: ${method} ${path}`
    );
  }
}

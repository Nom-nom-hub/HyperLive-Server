import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as child_process from 'child_process';

export interface TestConfig {
  enabled: boolean;
  frameworks: {
    jest?: JestConfig;
    mocha?: MochaConfig;
    cypress?: CypressConfig;
    playwright?: PlaywrightConfig;
    puppeteer?: PuppeteerConfig;
  };
  autoRun: boolean;
  coverage: boolean;
  visualRegression: boolean;
  performance: boolean;
}

export interface JestConfig {
  configFile: string;
  testPattern: string;
  coverageThreshold: number;
}

export interface MochaConfig {
  testFiles: string;
  reporter: string;
  timeout: number;
}

export interface CypressConfig {
  configFile: string;
  browser: string;
  headless: boolean;
}

export interface PlaywrightConfig {
  configFile: string;
  browsers: string[];
  headless: boolean;
}

export interface PuppeteerConfig {
  headless: boolean;
  viewport: { width: number; height: number };
  timeout: number;
}

export interface TestResult {
  framework: string;
  success: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration: number;
  coverage?: CoverageReport;
  output: string;
  timestamp: Date;
}

export interface CoverageReport {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  uncovered: string[];
}

export interface VisualRegressionResult {
  success: boolean;
  screenshots: ScreenshotComparison[];
  output: string;
}

export interface ScreenshotComparison {
  name: string;
  baseline: string;
  current: string;
  diff: string;
  passed: boolean;
  threshold: number;
}

export class TestingService {
  private config: TestConfig;
  private outputChannel: vscode.OutputChannel;
  private testResults: TestResult[] = [];

  constructor(private context: vscode.ExtensionContext) {
    this.outputChannel = vscode.window.createOutputChannel(
      'Advanced Live Server - Testing'
    );
    this.config = this.loadConfig();
  }

  private loadConfig(): TestConfig {
    const workspaceConfig = vscode.workspace.getConfiguration(
      'advancedLiveServer.testing'
    );

    return {
      enabled: workspaceConfig.get('enabled', false),
      frameworks: {
        jest: workspaceConfig.get('jest'),
        mocha: workspaceConfig.get('mocha'),
        cypress: workspaceConfig.get('cypress'),
        playwright: workspaceConfig.get('playwright'),
        puppeteer: workspaceConfig.get('puppeteer'),
      },
      autoRun: workspaceConfig.get('autoRun', false),
      coverage: workspaceConfig.get('coverage', true),
      visualRegression: workspaceConfig.get('visualRegression', false),
      performance: workspaceConfig.get('performance', false),
    };
  }

  async runTests(
    framework?: keyof TestConfig['frameworks']
  ): Promise<TestResult[]> {
    if (!this.config.enabled) {
      throw new Error('Testing is not enabled');
    }

    const results: TestResult[] = [];
    const frameworks = framework
      ? [framework]
      : (Object.keys(
          this.config.frameworks
        ) as (keyof TestConfig['frameworks'])[]);

    for (const fw of frameworks) {
      const config = this.config.frameworks[fw];
      if (config) {
        try {
          const result = await this.runFrameworkTests(fw, config);
          results.push(result);
        } catch (error) {
          results.push({
            framework: fw,
            success: false,
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            skippedTests: 0,
            duration: 0,
            output: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date(),
          });
        }
      }
    }

    this.testResults = results;
    this.displayResults(results);
    return results;
  }

  private async runFrameworkTests(
    framework: string,
    config: any
  ): Promise<TestResult> {
    const startTime = Date.now();
    this.outputChannel.appendLine(`Running ${framework} tests...`);

    let command: string;
    let args: string[] = [];

    switch (framework) {
      case 'jest':
        command = 'npx';
        args = ['jest', '--json', '--coverage'];
        if (config.configFile) {
          args.push('--config', config.configFile);
        }
        break;

      case 'mocha':
        command = 'npx';
        args = ['mocha', '--reporter', 'json'];
        if (config.testFiles) {
          args.push(config.testFiles);
        }
        break;

      case 'cypress':
        command = 'npx';
        args = ['cypress', 'run', '--headless'];
        if (config.configFile) {
          args.push('--config-file', config.configFile);
        }
        break;

      case 'playwright':
        command = 'npx';
        args = ['playwright', 'test', '--reporter=json'];
        if (config.configFile) {
          args.push('--config', config.configFile);
        }
        break;

      case 'puppeteer':
        // Custom Puppeteer test runner
        return this.runPuppeteerTests(config);

      default:
        throw new Error(`Unsupported test framework: ${framework}`);
    }

    return new Promise(resolve => {
      child_process.exec(
        `${command} ${args.join(' ')}`,
        {
          cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        },
        (error, stdout) => {
          const duration = Date.now() - startTime;

          try {
            const output = JSON.parse(stdout);
            const result: TestResult = {
              framework,
              success: !error,
              totalTests: output.numTotalTests || output.total || 0,
              passedTests: output.numPassedTests || output.passed || 0,
              failedTests: output.numFailedTests || output.failed || 0,
              skippedTests: output.numPendingTests || output.skipped || 0,
              duration,
              output: stdout,
              timestamp: new Date(),
            };

            // Extract coverage if available
            if (output.coverage) {
              result.coverage = this.parseCoverage(output.coverage);
            }

            resolve(result);
          } catch {
            // Fallback to simple parsing
            const result: TestResult = {
              framework,
              success: !error,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              skippedTests: 0,
              duration,
              output: stdout,
              timestamp: new Date(),
            };

            // Try to extract test counts from output
            const passedMatch = stdout.match(/(\d+) passing/);
            const failedMatch = stdout.match(/(\d+) failing/);

            if (passedMatch) {
              result.passedTests = parseInt(passedMatch[1]);
              result.totalTests += result.passedTests;
            }
            if (failedMatch) {
              result.failedTests = parseInt(failedMatch[1]);
              result.totalTests += result.failedTests;
            }

            resolve(result);
          }
        }
      );
    });
  }

  private async runPuppeteerTests(
    config: PuppeteerConfig
  ): Promise<TestResult> {
    const startTime = Date.now();

    // Create a simple Puppeteer test script
    const testScript = `
      const puppeteer = require('puppeteer');
      
      (async () => {
        const browser = await puppeteer.launch({ 
          headless: ${config.headless},
          defaultViewport: { width: ${config.viewport.width}, height: ${config.viewport.height} }
        });
        
        const page = await browser.newPage();
        await page.goto('http://localhost:${this.getServerPort()}', { 
          waitUntil: 'networkidle0',
          timeout: ${config.timeout}
        });
        
        // Basic tests
        const title = await page.title();
        const bodyText = await page.$eval('body', el => el.textContent);
        
        console.log(JSON.stringify({
          success: true,
          tests: [
            { name: 'Page loads', passed: !!title },
            { name: 'Body content exists', passed: !!bodyText }
          ]
        }));
        
        await browser.close();
      })();
    `;

    const scriptPath = path.join(
      this.context.globalStorageUri.fsPath,
      'puppeteer-test.js'
    );
    fs.writeFileSync(scriptPath, testScript);

    return new Promise(resolve => {
      child_process.exec(
        `node ${scriptPath}`,
        {
          cwd: vscode.workspace.workspaceFolders?.[0]?.uri.fsPath,
        },
        (error, stdout) => {
          const duration = Date.now() - startTime;

          try {
            const output = JSON.parse(stdout);
            const passedTests = output.tests.filter(
              (t: any) => t.passed
            ).length;

            resolve({
              framework: 'puppeteer',
              success: !error && passedTests === output.tests.length,
              totalTests: output.tests.length,
              passedTests,
              failedTests: output.tests.length - passedTests,
              skippedTests: 0,
              duration,
              output: stdout,
              timestamp: new Date(),
            });
          } catch {
            resolve({
              framework: 'puppeteer',
              success: !error,
              totalTests: 0,
              passedTests: 0,
              failedTests: 0,
              skippedTests: 0,
              duration,
              output: stdout,
              timestamp: new Date(),
            });
          }
        }
      );
    });
  }

  private parseCoverage(coverage: any): CoverageReport {
    if (typeof coverage === 'object' && coverage.total) {
      return {
        statements: coverage.total.statements.pct || 0,
        branches: coverage.total.branches.pct || 0,
        functions: coverage.total.functions.pct || 0,
        lines: coverage.total.lines.pct || 0,
        uncovered: [],
      };
    }

    return {
      statements: 0,
      branches: 0,
      functions: 0,
      lines: 0,
      uncovered: [],
    };
  }

  async runVisualRegressionTests(): Promise<VisualRegressionResult> {
    if (!this.config.visualRegression) {
      throw new Error('Visual regression testing is not enabled');
    }

    this.outputChannel.appendLine('Running visual regression tests...');

    // Create baseline and current screenshots
    const baselineDir = path.join(
      this.context.globalStorageUri.fsPath,
      'baseline'
    );
    const currentDir = path.join(
      this.context.globalStorageUri.fsPath,
      'current'
    );
    const diffDir = path.join(this.context.globalStorageUri.fsPath, 'diff');

    // Ensure directories exist
    [baselineDir, currentDir, diffDir].forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });

    const screenshots: ScreenshotComparison[] = [];
    const testPages = ['/', '/about', '/contact']; // Example pages

    for (const page of testPages) {
      try {
        const baselinePath = path.join(
          baselineDir,
          `${page.replace('/', '') || 'index'}.png`
        );
        const currentPath = path.join(
          currentDir,
          `${page.replace('/', '') || 'index'}.png`
        );
        const diffPath = path.join(
          diffDir,
          `${page.replace('/', '') || 'index'}.png`
        );

        // Take current screenshot
        await this.takeScreenshot(page, currentPath);

        // Compare with baseline if it exists
        if (fs.existsSync(baselinePath)) {
          const passed = await this.compareScreenshots(
            baselinePath,
            currentPath,
            diffPath
          );
          screenshots.push({
            name: page,
            baseline: baselinePath,
            current: currentPath,
            diff: diffPath,
            passed,
            threshold: 0.1,
          });
        } else {
          // Create baseline
          fs.copyFileSync(currentPath, baselinePath);
          screenshots.push({
            name: page,
            baseline: baselinePath,
            current: currentPath,
            diff: '',
            passed: true,
            threshold: 0.1,
          });
        }
      } catch {
        screenshots.push({
          name: page,
          baseline: '',
          current: '',
          diff: '',
          passed: false,
          threshold: 0.1,
        });
      }
    }

    const success = screenshots.every(s => s.passed);
    const result: VisualRegressionResult = {
      success,
      screenshots,
      output: `Visual regression tests ${success ? 'passed' : 'failed'}`,
    };

    this.outputChannel.appendLine(result.output);
    return result;
  }

  private async takeScreenshot(
    page: string,
    outputPath: string
  ): Promise<void> {
    const puppeteerScript = `
      const puppeteer = require('puppeteer');
      
      (async () => {
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 720 });
        await page.goto('http://localhost:${this.getServerPort()}${page}', { 
          waitUntil: 'networkidle0' 
        });
        await page.screenshot({ path: '${outputPath}', fullPage: true });
        await browser.close();
      })();
    `;

    const scriptPath = path.join(
      this.context.globalStorageUri.fsPath,
      'screenshot.js'
    );
    fs.writeFileSync(scriptPath, puppeteerScript);

    return new Promise((resolve, reject) => {
      child_process.exec(`node ${scriptPath}`, error => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private async compareScreenshots(
    baseline: string,
    current: string,
    diff: string
  ): Promise<boolean> {
    // Simple image comparison using pixelmatch
    const comparisonScript = `
      const fs = require('fs');
      const PNG = require('pngjs').PNG;
      const pixelmatch = require('pixelmatch');
      
      const img1 = PNG.sync.read(fs.readFileSync('${baseline}'));
      const img2 = PNG.sync.read(fs.readFileSync('${current}'));
      const { width, height } = img1;
      
      const diff = new PNG({ width, height });
      const numDiffPixels = pixelmatch(img1.data, img2.data, diff.data, width, height, { threshold: 0.1 });
      
      fs.writeFileSync('${diff}', PNG.sync.write(diff));
      console.log(numDiffPixels);
    `;

    const scriptPath = path.join(
      this.context.globalStorageUri.fsPath,
      'compare.js'
    );
    fs.writeFileSync(scriptPath, comparisonScript);

    return new Promise(resolve => {
      child_process.exec(`node ${scriptPath}`, (error, stdout) => {
        if (error) {
          resolve(false);
        } else {
          const diffPixels = parseInt(stdout.trim());
          resolve(diffPixels < 100); // Threshold for acceptable differences
        }
      });
    });
  }

  private getServerPort(): number {
    // Get the current server port from the live server
    return 9000; // Default port
  }

  private displayResults(results: TestResult[]): void {
    this.outputChannel.appendLine('\n=== Test Results ===');

    for (const result of results) {
      const status = result.success ? '✅ PASSED' : '❌ FAILED';
      this.outputChannel.appendLine(
        `${status} ${result.framework.toUpperCase()}`
      );
      this.outputChannel.appendLine(
        `  Tests: ${result.passedTests}/${result.totalTests} passed`
      );
      this.outputChannel.appendLine(`  Duration: ${result.duration}ms`);

      if (result.coverage) {
        this.outputChannel.appendLine(
          `  Coverage: ${result.coverage.lines}% lines`
        );
      }
    }
  }

  getTestResults(): TestResult[] {
    return this.testResults;
  }

  getOutputChannel(): vscode.OutputChannel {
    return this.outputChannel;
  }

  updateConfig(updates: Partial<TestConfig>): void {
    this.config = { ...this.config, ...updates };

    // Update workspace configuration
    const config = vscode.workspace.getConfiguration(
      'advancedLiveServer.testing'
    );

    if (updates.enabled !== undefined) {
      config.update('enabled', updates.enabled);
    }
    if (updates.autoRun !== undefined) {
      config.update('autoRun', updates.autoRun);
    }
    if (updates.coverage !== undefined) {
      config.update('coverage', updates.coverage);
    }
    if (updates.visualRegression !== undefined) {
      config.update('visualRegression', updates.visualRegression);
    }
    if (updates.performance !== undefined) {
      config.update('performance', updates.performance);
    }
  }
}

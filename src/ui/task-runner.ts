import * as vscode from 'vscode';
import * as cp from 'child_process';

export interface TaskDefinition {
  id: string;
  name: string;
  command: string;
  args?: string[];
  cwd?: string;
  group?: 'npm' | 'git' | 'custom' | 'build' | 'test';
  description?: string;
  icon?: string;
}

export interface TaskResult {
  success: boolean;
  output: string;
  error?: string;
  duration: number;
}

export class TaskRunner {
  private outputChannel: vscode.OutputChannel;
  private tasks: Map<string, TaskDefinition> = new Map();
  private runningTasks: Set<string> = new Set();

  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel;
    this.initializeDefaultTasks();
  }

  private initializeDefaultTasks() {
    const defaultTasks: TaskDefinition[] = [
      // NPM Tasks
      {
        id: 'npm-install',
        name: 'npm install',
        command: 'npm',
        args: ['install'],
        group: 'npm',
        description: 'Install project dependencies',
        icon: '$(package)',
      },
      {
        id: 'npm-start',
        name: 'npm start',
        command: 'npm',
        args: ['start'],
        group: 'npm',
        description: 'Start the development server',
        icon: '$(play)',
      },
      {
        id: 'npm-build',
        name: 'npm run build',
        command: 'npm',
        args: ['run', 'build'],
        group: 'build',
        description: 'Build the project for production',
        icon: '$(gear)',
      },
      {
        id: 'npm-test',
        name: 'npm test',
        command: 'npm',
        args: ['test'],
        group: 'test',
        description: 'Run tests',
        icon: '$(testing)',
      },
      {
        id: 'npm-lint',
        name: 'npm run lint',
        command: 'npm',
        args: ['run', 'lint'],
        group: 'test',
        description: 'Run linting',
        icon: '$(check)',
      },

      // Git Tasks
      {
        id: 'git-status',
        name: 'git status',
        command: 'git',
        args: ['status'],
        group: 'git',
        description: 'Check git status',
        icon: '$(git-branch)',
      },
      {
        id: 'git-add',
        name: 'git add .',
        command: 'git',
        args: ['add', '.'],
        group: 'git',
        description: 'Stage all changes',
        icon: '$(plus)',
      },
      {
        id: 'git-commit',
        name: 'git commit',
        command: 'git',
        args: ['commit', '-m', 'Update'],
        group: 'git',
        description: 'Commit changes',
        icon: '$(check)',
      },
      {
        id: 'git-push',
        name: 'git push',
        command: 'git',
        args: ['push'],
        group: 'git',
        description: 'Push to remote',
        icon: '$(arrow-up)',
      },
      {
        id: 'git-pull',
        name: 'git pull',
        command: 'git',
        args: ['pull'],
        group: 'git',
        description: 'Pull from remote',
        icon: '$(arrow-down)',
      },

      // Build Tasks
      {
        id: 'build-prod',
        name: 'Build Production',
        command: 'npm',
        args: ['run', 'build'],
        group: 'build',
        description: 'Build for production',
        icon: '$(rocket)',
      },
      {
        id: 'build-dev',
        name: 'Build Development',
        command: 'npm',
        args: ['run', 'build:dev'],
        group: 'build',
        description: 'Build for development',
        icon: '$(tools)',
      },

      // Custom Tasks
      {
        id: 'clear-cache',
        name: 'Clear Cache',
        command: 'npm',
        args: ['cache', 'clean', '--force'],
        group: 'custom',
        description: 'Clear npm cache',
        icon: '$(trash)',
      },
      {
        id: 'update-deps',
        name: 'Update Dependencies',
        command: 'npm',
        args: ['update'],
        group: 'custom',
        description: 'Update all dependencies',
        icon: '$(refresh)',
      },
    ];

    defaultTasks.forEach(task => {
      this.tasks.set(task.id, task);
    });
  }

  async showTaskPicker(): Promise<void> {
    const taskGroups = this.groupTasksByCategory();
    const items: vscode.QuickPickItem[] = [];

    // Add grouped tasks
    Object.entries(taskGroups).forEach(([group, tasks]) => {
      items.push({
        label: `$(folder) ${group.toUpperCase()}`,
        kind: vscode.QuickPickItemKind.Separator,
      });

      tasks.forEach(task => {
        items.push({
          label: `${task.icon || '$(terminal)'} ${task.name}`,
          description: task.description,
          detail: `${task.command} ${task.args?.join(' ') || ''}`,
        });
      });

      items.push({
        label: '',
        kind: vscode.QuickPickItemKind.Separator,
      });
    });

    // Add custom task option
    items.push({
      label: '$(plus) Add Custom Task',
      description: 'Create a new custom task',
    });

    const selection = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select a task to run',
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selection) {
      if (selection.label.includes('Add Custom Task')) {
        await this.addCustomTask();
      } else {
        const taskName = selection.label.replace(/^\$\([^)]+\)\s/, '');
        const task = Array.from(this.tasks.values()).find(
          t => t.name === taskName
        );
        if (task) {
          await this.runTask(task);
        }
      }
    }
  }

  private groupTasksByCategory(): Record<string, TaskDefinition[]> {
    const groups: Record<string, TaskDefinition[]> = {};

    this.tasks.forEach(task => {
      const group = task.group || 'custom';
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(task);
    });

    return groups;
  }

  async runTask(task: TaskDefinition): Promise<TaskResult> {
    if (this.runningTasks.has(task.id)) {
      vscode.window.showWarningMessage(
        `Task "${task.name}" is already running`
      );
      return {
        success: false,
        output: '',
        error: 'Task already running',
        duration: 0,
      };
    }

    this.runningTasks.add(task.id);
    const startTime = Date.now();

    try {
      this.outputChannel.appendLine(`🚀 Running task: ${task.name}`);
      this.outputChannel.appendLine(
        `📝 Command: ${task.command} ${task.args?.join(' ') || ''}`
      );

      const result = await this.executeCommand(task);
      const duration = Date.now() - startTime;

      if (result.success) {
        this.outputChannel.appendLine(
          `✅ Task completed successfully in ${duration}ms`
        );
        vscode.window.showInformationMessage(
          `Task "${task.name}" completed successfully`
        );
      } else {
        this.outputChannel.appendLine(`❌ Task failed after ${duration}ms`);
        vscode.window.showErrorMessage(
          `Task "${task.name}" failed: ${result.error}`
        );
      }

      return { ...result, duration };
    } finally {
      this.runningTasks.delete(task.id);
    }
  }

  private executeCommand(
    task: TaskDefinition
  ): Promise<{ success: boolean; output: string; error?: string }> {
    return new Promise(resolve => {
      const cwd =
        task.cwd ||
        vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ||
        process.cwd();

      const child = cp.spawn(task.command, task.args || [], {
        cwd,
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      let output = '';
      let error = '';

      child.stdout?.on('data', data => {
        const text = data.toString();
        output += text;
        this.outputChannel.append(text);
      });

      child.stderr?.on('data', data => {
        const text = data.toString();
        error += text;
        this.outputChannel.append(text);
      });

      child.on('close', code => {
        if (code === 0) {
          resolve({ success: true, output });
        } else {
          resolve({
            success: false,
            output,
            error: error || `Process exited with code ${code}`,
          });
        }
      });

      child.on('error', err => {
        resolve({ success: false, output, error: err.message });
      });
    });
  }

  async addCustomTask(): Promise<void> {
    const name = await vscode.window.showInputBox({
      prompt: 'Enter task name',
      placeHolder: 'e.g., Deploy to Production',
    });

    if (!name) {
      return;
    }

    const command = await vscode.window.showInputBox({
      prompt: 'Enter command',
      placeHolder: 'e.g., npm',
    });

    if (!command) {
      return;
    }

    const argsInput = await vscode.window.showInputBox({
      prompt: 'Enter arguments (space-separated)',
      placeHolder: 'e.g., run deploy',
    });

    const description = await vscode.window.showInputBox({
      prompt: 'Enter description (optional)',
      placeHolder: 'What does this task do?',
    });

    const group = await vscode.window.showQuickPick(
      ['custom', 'build', 'test', 'npm', 'git'],
      {
        placeHolder: 'Select task group',
      }
    );

    const task: TaskDefinition = {
      id: `custom-${Date.now()}`,
      name,
      command,
      args: argsInput ? argsInput.split(' ') : [],
      description,
      group: group as any,
      icon: '$(terminal)',
    };

    this.tasks.set(task.id, task);
    this.outputChannel.appendLine(`➕ Added custom task: ${name}`);

    const runNow = await vscode.window.showQuickPick(['Yes', 'No'], {
      placeHolder: 'Run this task now?',
    });

    if (runNow === 'Yes') {
      await this.runTask(task);
    }
  }

  getTasks(): TaskDefinition[] {
    return Array.from(this.tasks.values());
  }

  getTask(id: string): TaskDefinition | undefined {
    return this.tasks.get(id);
  }

  removeTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (task && task.group === 'custom') {
      this.tasks.delete(id);
      this.outputChannel.appendLine(`➖ Removed custom task: ${task.name}`);
      return true;
    }
    return false;
  }

  isTaskRunning(id: string): boolean {
    return this.runningTasks.has(id);
  }

  getRunningTasks(): string[] {
    return Array.from(this.runningTasks);
  }
}

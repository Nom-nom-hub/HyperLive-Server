import * as vscode from 'vscode';

export class StatusBarManager {
  private statusBarItem: vscode.StatusBarItem;
  private isRunning: boolean = false;

  constructor() {
    this.statusBarItem = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Right,
      100
    );
    this.statusBarItem.text = '$(rocket) Live Server';
    this.statusBarItem.tooltip = 'Advanced Live Server: Click for menu';
    this.statusBarItem.command = 'advancedLiveServer.showQuickActions';
    this.statusBarItem.show();
  }

  updateStatus(running: boolean, port?: number) {
    this.isRunning = running;

    if (running && port) {
      this.statusBarItem.text = `$(rocket) Live Server (${port})`;
      this.statusBarItem.command = 'advancedLiveServer.showQuickActions';
      this.statusBarItem.tooltip = `Advanced Live Server running on port ${port}. Click for menu.`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.prominentBackground'
      );
    } else {
      this.statusBarItem.text = '$(rocket) Live Server';
      this.statusBarItem.command = 'advancedLiveServer.showQuickActions';
      this.statusBarItem.tooltip = 'Advanced Live Server: Click for menu';
      this.statusBarItem.backgroundColor = undefined;
    }

    this.statusBarItem.show();
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}

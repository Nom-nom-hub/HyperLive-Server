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
      this.statusBarItem.text = `$(debug-stop) Stop Live Server (${port})`;
      this.statusBarItem.command = 'advancedLiveServer.stop';
      this.statusBarItem.tooltip = `Click to stop the server on port ${port}`;
      this.statusBarItem.backgroundColor = new vscode.ThemeColor(
        'statusBarItem.prominentBackground'
      );
    } else {
      this.statusBarItem.text = '$(rocket) Start Live Server';
      this.statusBarItem.command = 'advancedLiveServer.start';
      this.statusBarItem.tooltip = 'Click to start the live server';
      this.statusBarItem.backgroundColor = undefined;
    }

    this.statusBarItem.show();
  }

  dispose() {
    this.statusBarItem.dispose();
  }
}

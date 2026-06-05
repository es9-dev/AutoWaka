import * as vscode from 'vscode';

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Initialize the status bar item. Call once during activation.
 */
export function initStatusBar(context: vscode.ExtensionContext): void {
    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        50
    );
    statusBarItem.tooltip = 'Current WakaTime project name (managed by AutoWaka)';
    context.subscriptions.push(statusBarItem);
}

/**
 * Update the status bar to display the given project name.
 * Pass null to hide the status bar.
 */
export function updateStatusBar(projectName: string | null): void {
    if (!statusBarItem) {
        return;
    }

    const config = vscode.workspace.getConfiguration('autowaka');
    const showStatusBar = config.get<boolean>('showStatusBar', true);

    if (!showStatusBar || !projectName) {
        statusBarItem.hide();
        return;
    }

    statusBarItem.text = `$(clock) ${projectName}`;
    statusBarItem.show();
}

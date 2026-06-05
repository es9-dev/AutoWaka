import * as vscode from 'vscode';
import { evaluateRules, RuleConfig } from './rules';
import { syncGitExcludes } from './sync';
import { readWakaTimeProject, createWakaTimeProject, wakaTimeProjectExists } from './project-file';
import { initStatusBar, updateStatusBar } from './status-bar';

export function activate(context: vscode.ExtensionContext) {
    console.log('[AutoWaka] Activating');

    // Initialize status bar
    initStatusBar(context);

    // Register the "Sync Now" command
    const syncNowCmd = vscode.commands.registerCommand(
        'autowaka.syncNow',
        async () => {
            await processAllFolders(context);
            vscode.window.showInformationMessage('[AutoWaka] Sync complete.');
        }
    );
    context.subscriptions.push(syncNowCmd);

    // Watch for .gitignore and .git/info/exclude changes
    const gitIgnoreWatcher = vscode.workspace.createFileSystemWatcher('**/.gitignore');
    const gitExcludeWatcher = vscode.workspace.createFileSystemWatcher('**/.git/info/exclude');

    const handleGitFileChange = async () => {
        await processAllFolders(context);
    };

    context.subscriptions.push(
        gitIgnoreWatcher.onDidCreate(handleGitFileChange),
        gitIgnoreWatcher.onDidChange(handleGitFileChange),
        gitExcludeWatcher.onDidCreate(handleGitFileChange),
        gitExcludeWatcher.onDidChange(handleGitFileChange),
        gitIgnoreWatcher,
        gitExcludeWatcher
    );

    // Re-evaluate when workspace folders change
    context.subscriptions.push(
        vscode.workspace.onDidChangeWorkspaceFolders(async () => {
            await processAllFolders(context);
        })
    );

    // Re-evaluate when configuration changes
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(async (e) => {
            if (e.affectsConfiguration('autowaka')) {
                await processAllFolders(context);
            }
        })
    );

    // Initial evaluation
    processAllFolders(context);
}

/**
 * Process all workspace folders against the configured rules.
 */
async function processAllFolders(context: vscode.ExtensionContext): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
        updateStatusBar(null);
        return;
    }

    const config = vscode.workspace.getConfiguration('autowaka');
    const rules = config.get<RuleConfig[]>('rules', []);
    const existingBehavior = config.get<string>('existingFileBehavior', 'skip');

    if (rules.length === 0) {
        console.log('[AutoWaka] No rules configured, skipping.');
        updateStatusBar(null);
        return;
    }

    // Track the project name of the first workspace folder for the status bar
    let primaryProjectName: string | null = null;

    for (const folder of workspaceFolders) {
        const folderPath = folder.uri.fsPath;
        const result = evaluateRules(folderPath, rules);

        if (!result) {
            console.log(`[AutoWaka] No rule matched for: ${folderPath}`);
            continue;
        }

        // Handle .wakatime-project creation
        const alreadyExists = wakaTimeProjectExists(folderPath);

        if (alreadyExists) {
            const existingName = await readWakaTimeProject(folderPath);

            if (existingName === result.resolvedName) {
                // Already correct, nothing to do
                console.log(`[AutoWaka] .wakatime-project already correct in ${folderPath}`);
            } else {
                // File exists with a different name — apply existingFileBehavior
                await handleExistingFile(folderPath, existingName, result.resolvedName, existingBehavior);
            }
        } else {
            // Create new .wakatime-project
            await createWakaTimeProject(folderPath, result.resolvedName);
            vscode.window.showInformationMessage(
                `[AutoWaka] Created .wakatime-project → "${result.resolvedName}"`
            );
        }

        // Handle gitignore sync
        if (result.syncGitExcludes) {
            await syncGitExcludes(folderPath);
        }

        // Track the first folder's project name for status bar
        if (!primaryProjectName) {
            const currentName = await readWakaTimeProject(folderPath);
            primaryProjectName = currentName;
        }
    }

    updateStatusBar(primaryProjectName);
}

/**
 * Handle the case where .wakatime-project already exists with a different name.
 */
async function handleExistingFile(
    folderPath: string,
    existingName: string | null,
    newName: string,
    behavior: string
): Promise<void> {
    switch (behavior) {
        case 'overwrite':
            await createWakaTimeProject(folderPath, newName);
            vscode.window.showInformationMessage(
                `[AutoWaka] Updated .wakatime-project: "${existingName}" → "${newName}"`
            );
            break;

        case 'prompt': {
            const choice = await vscode.window.showInformationMessage(
                `[AutoWaka] .wakatime-project exists with name "${existingName}". Update to "${newName}"?`,
                'Update',
                'Skip'
            );
            if (choice === 'Update') {
                await createWakaTimeProject(folderPath, newName);
            }
            break;
        }

        case 'skip':
        default:
            console.log(
                `[AutoWaka] Skipping ${folderPath}: .wakatime-project already exists with "${existingName}"`
            );
            break;
    }
}

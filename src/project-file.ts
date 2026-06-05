import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Read the project name from an existing `.wakatime-project` file.
 * Returns null if the file doesn't exist.
 */
export async function readWakaTimeProject(folderPath: string): Promise<string | null> {
    const filePath = path.join(folderPath, '.wakatime-project');
    if (!fs.existsSync(filePath)) {
        return null;
    }

    try {
        const content = await fs.promises.readFile(filePath, 'utf8');
        // First line is the project name
        const firstLine = content.split(/\r?\n/)[0]?.trim() ?? '';
        return firstLine || null;
    } catch {
        return null;
    }
}

/**
 * Write a `.wakatime-project` file with the given project name.
 * The file format is plain text: line 1 = project name, line 2 = branch (optional).
 */
export async function createWakaTimeProject(folderPath: string, projectName: string): Promise<void> {
    const filePath = path.join(folderPath, '.wakatime-project');
    await fs.promises.writeFile(filePath, `${projectName}\n`, 'utf8');
    console.log(`[AutoWaka] Created .wakatime-project → "${projectName}" in ${folderPath}`);
}

/**
 * Check if a `.wakatime-project` file exists in the given folder.
 */
export function wakaTimeProjectExists(folderPath: string): boolean {
    return fs.existsSync(path.join(folderPath, '.wakatime-project'));
}

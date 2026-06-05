import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as ini from 'ini';

/**
 * Convert a single gitignore glob line to a WakaTime-compatible regex string.
 * Returns null for comments, blank lines, and negation patterns.
 */
export function convertGitLineToRegex(line: string): string | null {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
        return null;
    }

    // Negation patterns are too complex for V1 — skip them
    if (trimmed.startsWith('!')) {
        return null;
    }

    try {
        const globToRegExp = require('glob-to-regexp');
        const regex: RegExp = globToRegExp(trimmed, { extended: true });
        return regex.source;
    } catch (e) {
        console.error(`[AutoWaka] Failed to convert glob "${trimmed}" to regex:`, e);
        return null;
    }
}

/**
 * Read git exclusion sources (.gitignore and .git/info/exclude) from a folder
 * and write the converted regex patterns into a `.wakatime` INI config file.
 *
 * This writes to `.wakatime` (INI format with [settings].exclude),
 * NOT to `.wakatime-project` (which is plain-text project name).
 */
export async function syncGitExcludes(folderPath: string): Promise<void> {
    const gitIgnorePath = path.join(folderPath, '.gitignore');
    const gitExcludePath = path.join(folderPath, '.git', 'info', 'exclude');
    const wakaConfigPath = path.join(folderPath, '.wakatime');

    const newRegexes: string[] = [];

    // Read .gitignore
    if (fs.existsSync(gitIgnorePath)) {
        const content = await fs.promises.readFile(gitIgnorePath, 'utf8');
        const converted = content.split('\n')
            .map(convertGitLineToRegex)
            .filter((x): x is string => Boolean(x));
        newRegexes.push(...converted);
    }

    // Read .git/info/exclude
    if (fs.existsSync(gitExcludePath)) {
        const content = await fs.promises.readFile(gitExcludePath, 'utf8');
        const converted = content.split('\n')
            .map(convertGitLineToRegex)
            .filter((x): x is string => Boolean(x));
        newRegexes.push(...converted);
    }

    if (newRegexes.length === 0) {
        return;
    }

    // Read existing .wakatime config if present
    let wakaConfig: Record<string, any> = { settings: {} };
    if (fs.existsSync(wakaConfigPath)) {
        try {
            const existing = await fs.promises.readFile(wakaConfigPath, 'utf8');
            wakaConfig = ini.parse(existing) || wakaConfig;
            if (!wakaConfig.settings) {
                wakaConfig.settings = {};
            }
        } catch (e) {
            console.error('[AutoWaka] Failed to parse existing .wakatime file:', e);
        }
    }

    // Read global ~/.wakatime.cfg to prevent overwriting global exclusions
    const globalWakaConfigPath = path.join(os.homedir(), '.wakatime.cfg');
    let globalExcludes: string[] = [];
    if (fs.existsSync(globalWakaConfigPath)) {
        try {
            const globalContent = await fs.promises.readFile(globalWakaConfigPath, 'utf8');
            const globalWakaConfig = ini.parse(globalContent);
            if (globalWakaConfig.settings && globalWakaConfig.settings.exclude) {
                globalExcludes = String(globalWakaConfig.settings.exclude).split('\n').filter(Boolean);
            }
        } catch (e) {
            console.error('[AutoWaka] Failed to parse global ~/.wakatime.cfg:', e);
        }
    }

    // Merge: combine existing excludes with new ones, deduplicating
    const existingExcludes: string[] = wakaConfig.settings.exclude
        ? String(wakaConfig.settings.exclude).split('\n').filter(Boolean)
        : [];

    const combined = Array.from(new Set([...globalExcludes, ...existingExcludes, ...newRegexes]));

    // Write back using newline-separated multi-value format (WakaTime CLI style)
    wakaConfig.settings.exclude = combined.join('\n');
    await fs.promises.writeFile(wakaConfigPath, ini.stringify(wakaConfig));

    console.log(`[AutoWaka] Synced ${combined.length} exclusion patterns to ${wakaConfigPath}`);
}

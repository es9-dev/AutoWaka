import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Configuration for a single auto-creation rule, as defined in settings.json.
 */
export interface RuleConfig {
    pathPattern?: string;
    requireGitRepo?: boolean;
    projectName?: string;
    syncGitExcludes?: boolean;
    scanNestedGitRepos?: boolean;
}

/**
 * The result of a successful rule match.
 */
export interface MatchResult {
    resolvedName: string;
    syncGitExcludes: boolean;
    rule: RuleConfig;
}

/**
 * Evaluate a list of rules against a workspace folder path.
 * Returns the first matching rule's result, or null if no rule matches.
 */
export function evaluateRules(folderPath: string, rules: RuleConfig[], isNested: boolean = false): MatchResult | null {
    // Find all rules that match the folder conditions
    const matchingRules = rules.filter(rule => {
        // If this folder was found via a nested scan, ONLY apply rules that explicitly opted-in
        if (isNested && !rule.scanNestedGitRepos) {
            return false;
        }
        return matchesConditions(folderPath, rule);
    });

    if (matchingRules.length === 0) {
        return null;
    }

    // Sort matching rules by proximity: smallest distance from the end of the targeted path to the folder
    matchingRules.sort((a, b) => {
        const distA = getDistanceToEnd(a.pathPattern, folderPath);
        const distB = getDistanceToEnd(b.pathPattern, folderPath);
        return distA - distB; // ascending order (smallest distance wins)
    });

    const bestMatch = matchingRules[0];

    const resolvedName = resolveProjectName(
        bestMatch.projectName ?? '{folder}',
        folderPath
    );

    return {
        resolvedName,
        syncGitExcludes: bestMatch.syncGitExcludes ?? false,
        rule: bestMatch,
    };
}

/**
 * Calculates the distance from the end of the rule's explicit target directory
 * to the end of the opened folder path. Smaller distances mean the rule is "closer"
 * to the current directory and therefore more specific.
 */
function getDistanceToEnd(pattern: string | undefined, folderPath: string): number {
    if (!pattern) {
        return Infinity;
    }
    
    // Strip .* and .+ and ^ and $ to find the literal directory target
    const literalOnly = pattern.replace(/\.\*|\.\+|\^|\$/g, '');
    
    if (!literalOnly) {
        return Infinity;
    }

    const index = folderPath.lastIndexOf(literalOnly);
    if (index === -1) {
        // Fallback for complex regexes where literal matching fails
        return folderPath.length;
    }

    const matchEnd = index + literalOnly.length;
    return folderPath.length - matchEnd;
}

/**
 * Check whether a folder matches all conditions of a rule.
 */
function matchesConditions(folderPath: string, rule: RuleConfig): boolean {
    // Normalize path to use forward slashes so users can easily write regex rules
    const normalizedPath = folderPath.replace(/\\/g, '/');

    // Check pathPattern regex
    const pattern = rule.pathPattern ?? '.*';
    try {
        const regex = new RegExp(pattern, 'i');
        if (!regex.test(normalizedPath)) {
            return false;
        }
    } catch {
        console.error(`[AutoWaka] Invalid pathPattern regex: ${pattern}`);
        return false;
    }

    // Check requireGitRepo
    if (rule.requireGitRepo !== false) {
        const gitDir = path.join(folderPath, '.git');
        if (!fs.existsSync(gitDir)) {
            return false;
        }
    }

    return true;
}

/**
 * Resolve a project name template with placeholders.
 *
 * Supported placeholders:
 *   {folder}  - basename of the folder
 *   {parent}  - parent directory name
 *   {parent2} - grandparent directory name
 */
export function resolveProjectName(
    template: string,
    folderPath: string
): string {
    let name = template;

    // Replace {folder}
    name = name.replace(/\{folder\}/gi, path.basename(folderPath));

    // Replace standard {parent} (equivalent to {parent1})
    name = name.replace(/\{parent\}/gi, path.basename(path.dirname(folderPath)));

    // Replace infinite {parentN} (e.g., {parent2}, {parent5})
    name = name.replace(/\{parent(\d+)\}/gi, (match, numStr) => {
        const level = parseInt(numStr, 10);
        if (isNaN(level) || level < 1) {
            return match;
        }
        
        let currentPath = folderPath;
        for (let i = 0; i < level; i++) {
            currentPath = path.dirname(currentPath);
        }
        
        const dirname = path.basename(currentPath);
        // If we hit the top-level drive root on Windows, basename might be empty or just the drive letter
        return dirname || currentPath;
    });

    return name;
}

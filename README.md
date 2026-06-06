# AutoWaka

Rule-driven Wakatime Projects Extension for VSCode

## Why?

Using [WakaTime](https://wakatime.com/) with the `include_only_with_project_file = true` setting in its global `~/.wakatime.cfg` file is a great way to control what gets tracked, but while this prevents WakaTime from aggressively tracking every random folder you open, it creates a tedious workflow: every time you start a new coding project, you have to manually create a `.wakatime-project` file in the root directory just so WakaTime knows to start tracking your time.

AutoWaka automates this process, while offering more granular control than what the standard project detection features provided out of the box by the [wakatime-cli](https://github.com/wakatime/wakatime-cli/blob/develop/USAGE.md) does. It evaluates your opened folders and automatically populates WakaTime project files for you based on configurable regex rules, Git repository presence, and naming placeholders.

## Features

- **Automated `.wakatime-project` Creation**: Define rules to automatically generate project files when you open specific directories.
- **Dynamic Naming Templates**: Use `{folder}`, `{parent}`, and `{parent2}` placeholders to dynamically generate your project names.
- **`.gitignore` Syncing**: Automatically convert your project's `.gitignore` and `.git/info/exclude` patterns into WakaTime's INI format, so your ignored files are never tracked.
- **Global Config Merging**: Seamlessly parses your global `~/.wakatime.cfg` and merges your global `exclude` settings so you never lose your system-wide tracking exclusions.
- **Status Bar Integration**: Instantly see your active WakaTime project name in the VS Code status bar.

## Getting Started

Once installed, open your VS Code `settings.json` and configure your rules:

```jsonc
"autowaka.existingFileBehavior": "skip",
"autowaka.showStatusBar": true,
"autowaka.rules": [
    // Rule 1: Matches ONLY folders inside a "Projects" directory
    {
        "pathPattern": ".*/Projects/.*",
        "requireGitRepo": true,
        "projectName": "{folder}",
        "syncGitExcludes": true
    },
    // Rule 2: Takes priority for a special project folder, overriding Rule 1
    {
        "pathPattern": ".*/Projects/special-project-folder/.*",
        "requireGitRepo": true,
        "projectName": "{folder}",
        "syncGitExcludes": true
    }
]
```

### Rule Evaluation (Most Specific Wins)
Rules are **not** evaluated top-to-bottom. Instead, AutoWaka evaluates rules by **proximity**. 

If a folder matches multiple rules in your settings, the rule whose target path is **closest** to the opened directory will be applied, regardless of the array order. 
*(Note: Regex wildcards like `.*` and `.+` are stripped out so the engine can measure the distance from the literal target directory to your current workspace)*.

### Configuration Options
- `pathPattern`: (Optional) A regular expression string to limit the rule to specific directory paths on your machine (e.g. `".*/Projects/.*"`). If omitted, it defaults to `.*` (matches all paths). Note: Windows backslashes are automatically converted to forward slashes before evaluation, so you can always use clean forward slashes in your config!
- `requireGitRepo`: If set to `true`, the rule will only trigger if a `.git/` directory exists in the folder root.
- `scanNestedGitRepos`: If set to `true`, AutoWaka will recursively search for nested Git repositories (e.g., submodules or monorepo packages) within the matching folder, and apply this rule to them as well.
- `projectName`: The template for the generated name. Placeholders include `{folder}` (the current folder's name), `{parent}` (the immediate parent directory), and `{parentN}` where N is any number (e.g., `{parent2}` for grandparent, `{parent5}` for 5 levels up). For example, `Projects/{parent2}/{folder}`.
- `syncGitExcludes`: If set to `true`, the extension reads your `.gitignore` and `.git/info/exclude` files, merges them with your global `~/.wakatime.cfg` exclusions, and writes them to a local `.wakatime` file so WakaTime won't track your ignored files.

### Handling Existing Files
If a `.wakatime-project` file already exists, the `autowaka.existingFileBehavior` setting determines the extension's behavior:
- `"skip"`: (Default) Do nothing.
- `"prompt"`: Ask you via a UI popup whether you want to update the project name.
- `"overwrite"`: Forcibly overwrite the existing file with the new rule-generated name.

## Manual Sync
You can force the extension to re-evaluate all open workspace folders at any time by running the **AutoWaka: Sync Now** command from the Command Palette.

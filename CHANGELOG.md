# Change Log

## [0.1.0] - 2026-06-05

### Added
- **Dynamic Rules Engine**: Automatically generate `.wakatime-project` files based on workspace paths using regex.
- **Template Variables**: Support for `{folder}`, `{parent}`, and `{parent2}` to dynamically construct project names.
- **Git Exclusion Syncing**: Optionally sync your project's `.gitignore` and `.git/info/exclude` files into WakaTime's `.wakatime` INI configuration so they aren't tracked.
- **File Behavior Control**: Configure how to handle existing `.wakatime-project` files (skip, prompt, or overwrite).
- **Status Bar Integration**: A toggleable status bar item that explicitly shows the WakaTime project name assigned to your current workspace.
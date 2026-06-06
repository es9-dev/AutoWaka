# Change Log

## [0.1.0] - 2026-06-05

### Added
- **Dynamic Rules Engine**: Automatically generate `.wakatime-project` files based on workspace paths using regex.
- **Template Variables**: Support for `{folder}`, `{parent}`, and `{parent2}` to dynamically construct project names.
- **Git Exclusion Syncing**: Optionally sync your project's `.gitignore` and `.git/info/exclude` files into WakaTime's `.wakatime` INI configuration so they aren't tracked.
- **File Behavior Control**: Configure how to handle existing `.wakatime-project` files (skip, prompt, or overwrite).
- **Status Bar Integration**: A toggleable status bar item that explicitly shows the WakaTime project name assigned to your current workspace.

## [0.2.0] - 2026-06-06

### Added
- **Nested Git Repo Support**: AutoWaka now has a `scanNestedGitRepos` option that recursively searches for nested Git repositories within any workspace folder that matches a rule's `pathPattern`, and applies that rule to each nested repo as well.
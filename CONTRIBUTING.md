# Contributing to Stillnote

Thanks for helping improve Stillnote. Please open an issue first for larger changes so the scope can be discussed before you spend time on an implementation.

## Before opening an issue

- Search existing issues for the same problem or suggestion.
- Include the Stillnote version, operating system, architecture, and package type when reporting a desktop issue.
- Describe the steps that led to a bug and what you expected to happen.
- Do not attach a workspace backup, note export, or other private content. Backups can contain all of your notes and media.

## Development

See the [README](README.md) for prerequisites and Linux build details. The browser app is in the repository root; the GitHub Pages site is authored in `site/` and assembled with `scripts/prepare-pages-site.sh`.

```bash
npm ci
npm run dev
```

Please keep changes focused, explain user-facing behavior in the pull request, and update the README or website when installation steps or supported packages change. Stillnote is local-first: changes should preserve device-local storage and avoid adding network access or telemetry without a clear user-facing need.

## Pull requests

1. Describe the problem and the proposed change.
2. Note the package and operating systems affected.
3. Include screenshots for visible interface changes when practical, with private note content removed.
4. Confirm that you have the right to contribute the code under the project's MIT license.

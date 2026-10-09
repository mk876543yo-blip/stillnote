# Stillnote

[![Latest release](https://img.shields.io/github/v/release/mk876543yo-blip/stillnote?label=latest%20release)](https://github.com/mk876543yo-blip/stillnote/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Stillnote is a quiet, local-first workspace for notes and focused study. It runs in a browser or as an Android app, with no account or cloud sync.

## Download

- [Download the latest Android APK](https://github.com/mk876543yo-blip/stillnote/releases/latest/download/Stillnote-1.0.1.apk)
- [View all releases](https://github.com/mk876543yo-blip/stillnote/releases)

## Features

- Notes with autosave, collections, tags, pinning, search, Markdown preview, templates, and recently deleted items.
- Flashcards made on-device from note definitions and key sentences, with spaced review.
- Focus timer, session history, and study insights.
- Dictation, light and dark themes, keyboard shortcuts, and JSON backup import/export.
- Offline access to the app shell after it has loaded once in a supported browser.

## Privacy and storage

Notes, preferences, flashcards, and study history stay in the browser's local storage on that device. Stillnote has no account, analytics, cloud sync, or remote AI connection. Export a backup from **Settings** before changing browsers, clearing app data, or uninstalling the Android app.

Dictation is handled by the browser or Android speech recognition service installed on the device. That service's availability and network behavior depend on the browser or provider.

## Use in a browser

Stillnote is a static app with no package installation or build step. From the repository root, run:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Open <http://127.0.0.1:8000>. Supported browsers can install it as an app and cache its shell for offline use.

## Build for Android

Requirements: Java 17 and Android SDK Platform 36.

```bash
cd android
./gradlew :app:assembleDebug
```

The debug APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. Release APKs are built from tagged source and published on the [GitHub Releases page](https://github.com/mk876543yo-blip/stillnote/releases). Each release APK is signed; keep its signing key backed up to publish compatible updates.

To make a release build, run `./gradlew :app:assembleRelease` from `android/`, then sign `app-release-unsigned.apk` with the Android SDK's `apksigner` and the release keystore. Keep the keystore and its password outside the repository; the same key is required for future app updates.

## Keyboard shortcuts

- `Ctrl/⌘ + K` — search notes
- `Ctrl/⌘ + N` — create a note
- `Ctrl/⌘ + S` — save now
- `Space` — reveal a flashcard answer during review

## Repository layout

- `app.js`, `styles.css`, `index.html` — browser app
- `android/` — Android wrapper and app configuration
- `fastlane/metadata/` — Android store listing metadata
- `service-worker.js` — browser offline shell cache

See [LICENSE](LICENSE) for the MIT license.

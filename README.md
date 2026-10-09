# Stillnote

[![Latest release](https://img.shields.io/github/v/release/mk876543yo-blip/stillnote?label=latest%20release)](https://github.com/mk876543yo-blip/stillnote/releases/latest)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Stillnote is a private, local-first place for notes and focused study. It has separate interfaces for Android phones and desktop PCs. There is no account, analytics, or cloud sync.

## Android

Install the [latest Android release](https://github.com/mk876543yo-blip/stillnote/releases/latest). The phone interface uses a full-screen note editor, touch-sized controls, bottom navigation, Android back navigation, native dictation, and Android's file picker for backups.

Build a debug APK from source with Java 17 and Android SDK Platform 36:

```bash
cd android
./gradlew :app:assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## PC

Use Stillnote in a current desktop browser, or install it as a Progressive Web App from the browser's install control. The PC interface keeps the notes list, editor, and study tools side by side and includes keyboard shortcuts.

Run it locally without a build step:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000>. After its first load, the browser app shell can work offline in supported browsers.

## Features

- Notes with autosave, collections, tags, pinning, search, Markdown preview, templates, and recently deleted items.
- Flashcards created on-device from definitions and key sentences, with spaced review.
- Focus timer, session history, and study insights.
- Dictation, light and dark themes, keyboard shortcuts, and JSON backup import/export.

## Privacy and storage

Notes, preferences, flashcards, and study history stay in that app's local storage on that device. Android and PC data are separate; export a backup in **Settings** to move notes between devices, browsers, or app installs. Export a backup before clearing browser data or uninstalling Stillnote.

Dictation uses Android's speech recognition service in the Android app, or the browser's speech service on PC. Availability and network behavior depend on the installed service.

## Keyboard shortcuts

- `Ctrl/⌘ + K` — search notes
- `Ctrl/⌘ + N` — create a note
- `Ctrl/⌘ + S` — save now
- `Space` — reveal a flashcard answer during review

## Repository layout

- `app.js`, `styles.css`, `index.html` — PC browser/PWA app and shared app logic
- `android/` — Android app wrapper and build configuration
- `fastlane/metadata/` — Android store listing metadata
- `service-worker.js` — browser offline shell cache

See [LICENSE](LICENSE) for the MIT license.

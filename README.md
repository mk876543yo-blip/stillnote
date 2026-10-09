# Stillnote

Stillnote is a local-first notes and study app. It has no build step or package dependencies.

## Open it

From this folder, start a small local web server:

```bash
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open <http://127.0.0.1:8000>. The app shell can be cached for offline use after the first visit. In a supported browser, use its install option to add Stillnote as a desktop app.

## What is included

- Notes with autosave, collections, tags, pinning, search, Markdown preview, templates, trash, and note downloads.
- Dictation through the browser's speech recognition support. Availability and permission prompts depend on the browser.
- Flashcards with recall ratings and spaced review dates. Cards can be created from a note while offline, and edited by deleting and regenerating them.
- A configurable focus timer, completed session history, and study insights.
- Light and dark themes, keyboard shortcuts, and JSON backup export/import.
- Optional summaries, explanations, quizzes, study guides, and generated flashcards using a local Ollama model.

## Local AI setup

The app does not contain or ask for an API key. For generated AI responses, [install Ollama](https://ollama.com/download/linux), then in a terminal run:

```bash
ollama pull llama3.2
```

Ollama usually runs its server automatically; if it is not running, start it with `ollama serve`. In Stillnote, open **Settings → Connect local model**, then choose the model shown by Ollama. Stillnote sends note text only to the Ollama server on your own computer. AI features are optional; quick summaries and recall tools remain available without a model.

Ollama's local API uses `http://localhost:11434`, with `/api/tags` for installed models and `/api/generate` for text generation. See the [Ollama API documentation](https://docs.ollama.com/api) and its [CORS settings](https://github.com/ollama/ollama/blob/main/docs/faq.mdx#how-can-i-allow-additional-web-origins-to-access-ollama) if the browser cannot connect. For the web app, Ollama must allow `http://127.0.0.1:8000`; for Android, it must allow `https://appassets.androidplatform.net`.

## Data and backups

Notes, settings, cards, and study history are stored in this browser's local storage. They are not synced between browsers or devices. Use **Settings → Export backup** regularly if the notes matter to you; importing a backup replaces the current workspace after confirmation.

## Keyboard shortcuts

- `Ctrl/⌘ + K` — search
- `Ctrl/⌘ + N` — new note
- `Ctrl/⌘ + S` — save now
- `Space` — reveal a flashcard answer during review

## Android app

The native Android app is in [`android/`](android/). It bundles the same Stillnote interface as app assets, keeps notes in the app's local browser storage, and uses Android's speech recognition service for dictation. The app itself does not request microphone access; audio is handled by the speech service installed on the device, whose network behavior depends on that service. Import and export use Android's file picker. App data is excluded from Android backup, so export a backup before uninstalling or moving the app.

With Java 17 and Android SDK API 36 installed, build a debug APK with:

```bash
cd android
./gradlew :app:assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`. This debug APK is for local installation. F-Droid builds and signs releases from the public source repository after its metadata merge request is reviewed; a direct APK upload does not add an app to the official F-Droid repository.

The optional AI connection is restricted to a local Ollama-compatible service at `localhost`. In the Android app, that means the service must run on the phone itself; the app does not send note text to a cloud AI provider or use an API key. All note and study features work without AI.

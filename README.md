# Stillnote 1.0.0

Stillnote is a private notes app for Windows and Linux. Write and organize notes, attach images and videos, browse everything with **Ctrl+K**, and choose from six color themes. Your notes stay in this browser on this computer.

Python 3 is required to run the local app server.

## Windows

1. Download and extract the repository.
2. Open PowerShell in the extracted folder and run:

   ```powershell
   py -m http.server 8000 --bind 127.0.0.1
   ```

3. Open <http://127.0.0.1:8000> in Chrome or Edge. Use the install icon in the address bar to add Stillnote to your desktop.

## Linux

1. Download and extract the repository.
2. Open a terminal in the extracted folder and run:

   ```bash
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

3. Open <http://127.0.0.1:8000> in Chrome or Edge. Use the install icon in the address bar to add Stillnote to your desktop.

Keep the terminal open while using Stillnote. After the first visit, the app can reopen offline in supported browsers.

## Using Stillnote

- Select **New note** to write. Notes save as you type.
- Create collections to organize notes.
- Select **Browse notes** or press **Ctrl+K** to search note text, titles, tags, collections, and attached file names.
- Select **Media** in a note to add images or videos.
- Open **Settings** to choose a theme or import and export a backup.

Notes and attached media stay in your browser on this computer. Backups include your notes, settings, and media. Export a backup before clearing browser data or moving to another computer.

See [LICENSE](LICENSE) for the license.

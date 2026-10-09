# Stillnote

<p align="center">
  <img src="icon.svg" width="72" height="72" alt="Stillnote icon"><br>
  <strong>A quiet, private workspace for notes, study, and focus.</strong><br>
  Write things down, turn ideas into flashcards, and make room to concentrate.<br><br>
  <a href="https://mk876543yo-blip.github.io/stillnote/">Website</a> ·
  <a href="https://mk876543yo-blip.github.io/stillnote/app/">Open the web app</a> ·
  <a href="https://mk876543yo-blip.github.io/stillnote/downloads/">Download packages</a> ·
  <a href="https://github.com/mk876543yo-blip/stillnote/releases/latest">Latest release</a>
</p>

<p align="center">
  <a href="https://github.com/mk876543yo-blip/stillnote/releases/latest"><img alt="Latest release" src="https://img.shields.io/github/v/release/mk876543yo-blip/stillnote?label=latest%20release"></a>
  <a href="https://mk876543yo-blip.github.io/stillnote/"><img alt="Website status" src="https://img.shields.io/website?url=https%3A%2F%2Fmk876543yo-blip.github.io%2Fstillnote%2F&label=website"></a>
  <a href="LICENSE"><img alt="MIT license" src="https://img.shields.io/badge/license-MIT-6658d3.svg"></a>
</p>

Stillnote runs as a browser/PWA workspace and a native Tauri 2 desktop app for Linux. It is local-first: notes and attachments stay in the browser or desktop profile on your device. Stillnote does not create an account or sync your workspace to a cloud service.

## What you can do

- Write and organize Markdown notes in collections, with search, tags, and media attachments.
- Turn notes into flashcards and review them on a spaced schedule.
- Work in focused sessions and see your study activity on this device.
- Choose a theme, use keyboard shortcuts, and export or restore a complete workspace backup.
- Open the browser app on desktop or mobile, or install the Linux desktop package that fits your system.

## Privacy and storage

Notes, collections, flashcards, themes, study settings, and focus statistics use browser storage. Images and videos are stored in IndexedDB. The desktop WebKit profile persists in the operating system's per-user application data directory; neither notes nor media are written into the installation directory. The web app and desktop app have separate workspaces, so export a backup in one and import it into the other to move your notes. Dictation depends on the browser's speech-recognition support and may use an online speech provider.

The browser app needs an internet connection for its first load. After it has loaded, its app shell is cached for offline use. The desktop app works offline and does not require a Python or Node server.

## Download Stillnote

**[Get the latest Linux packages](https://mk876543yo-blip.github.io/stillnote/downloads/)** · [Browse release notes and all assets](https://github.com/mk876543yo-blip/stillnote/releases/latest)

The download page always follows the latest stable GitHub Release and offers matching packages for x86_64 and ARM64 where available. Every release includes SHA-256 checksums.

## Linux support

Release builds target x86_64 and ARM64 for AppImage, `.deb`, `.rpm`, and Flatpak. The Arch/Garuda package currently targets x86_64:

- AppImage for a broad range of Linux desktops.
- `.deb` for Debian, Ubuntu, Linux Mint, and compatible systems.
- `.rpm` for Fedora and compatible RPM systems. The package declares WebKitGTK 4.1 and GTK 3 dependencies; openSUSE package naming can differ, so install the matching WebKitGTK 4.1 runtime if the package manager does not resolve it automatically.
- Arch `PKGBUILD`, which makes a normal Pacman package for Arch and Garuda Linux.
- Flatpak built against the maintained GNOME 50 runtime and SDK.
- Optional Snapcraft package definition for strict confinement. Snap packages are not built or uploaded by the release workflow.

Tauri's Linux AppImage tooling cannot cross-compile ARM, so CI builds ARM64 natively on GitHub's ARM runners. The AppImage bundles its application libraries and, for video playback, its media framework. The `.deb`, `.rpm`, Arch, Snap, and development builds use WebKitGTK 4.1 and GTK 3 supplied by their host/runtime packages. AppImage builds use Ubuntu 22.04 as the compatibility baseline. Older systems need glibc 2.35 or newer. The AppImage runtime may also need FUSE 2 (`libfuse2` on Debian/Ubuntu); if FUSE is unavailable, try `./Stillnote-*-Linux-x86_64.AppImage --appimage-extract` and launch the extracted `AppRun`.

Video playback depends on the WebKitGTK/GStreamer codecs available in the package or on the host. Dictation depends on WebKitGTK's support for the browser speech-recognition API and may require an online speech provider; notes, editing, search, attachments, flashcards, focus sessions, themes, and backups work offline.

## Install from a release

Choose your distribution and architecture on the [Stillnote download page](https://mk876543yo-blip.github.io/stillnote/downloads/), or open [GitHub Releases](https://github.com/mk876543yo-blip/stillnote/releases/latest). Tagged builds publish installable packages and a `SHA256SUMS` file there. Verify a download from the directory containing the package with `sha256sum -c SHA256SUMS`.

### AppImage

```bash
chmod +x Stillnote-1.1.0-Linux-x86_64.AppImage
./Stillnote-1.1.0-Linux-x86_64.AppImage
```

AppImage is portable and does not install files into the system. It bundles its application libraries and media framework, but still relies on a compatible Linux desktop, glibc, and (for normal mounting) FUSE 2.

### Debian, Ubuntu, and Linux Mint

```bash
sudo apt install ./Stillnote-1.1.0-Linux-x86_64.deb
```

APT resolves the declared WebKitGTK 4.1 and GTK 3 dependencies. To remove it later, run `sudo apt remove stillnote`.

### Fedora and RPM systems

Fedora:

```bash
sudo dnf install ./Stillnote-1.1.0-Linux-x86_64.rpm
```

openSUSE:

```bash
sudo zypper install ./Stillnote-1.1.0-Linux-x86_64.rpm
```

The package manager handles upgrades and removal. WebKitGTK 4.1 is packaged under different names across RPM distributions; Fedora uses `webkit2gtk4.1`, while openSUSE uses `libwebkit2gtk-4_1-0`.

### Arch Linux and Garuda Linux

From the Stillnote repository root, run:

```bash
makepkg -si
```

`makepkg` builds the checked-out source tree and creates an installable `.pkg.tar.zst` package. When used with only the PKGBUILD, it fetches the matching versioned official Git tag. Pacman tracks the package for upgrades and removal. Install a locally built package with `pacman -U`; remove it with:

```bash
sudo pacman -U ./stillnote-1.1.0-1-x86_64.pkg.tar.zst
sudo pacman -R stillnote
```

Later builds can be upgraded with another `pacman -U`.

Build prerequisites on Arch/Garuda are `base-devel`, `rust`, `gtk3`, `webkit2gtk-4.1`, and `hicolor-icon-theme`. For example:

```bash
sudo pacman -S --needed base-devel rust gtk3 webkit2gtk-4.1 hicolor-icon-theme
makepkg -si
```

### Flatpak

Add Flathub and install the GNOME 50 runtime once, then install the downloaded bundle for the current user:

```bash
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.gnome.Platform//50
flatpak install --user ./Stillnote-1.1.0-Linux-x86_64.flatpak
flatpak run io.github.mk876543yoblip.stillnote
```

Remove it with `flatpak uninstall --user io.github.mk876543yoblip.stillnote`. The sandbox has no network access. It can use Wayland or X11, audio playback, the user's Downloads folder for backup export, and desktop file-picker portals; application data remains in Flatpak's persistent per-app data directory.

### Snap (optional)

Snapcraft must be installed and configured on the build machine. Build and locally install the strict-confinement package with:

```bash
snapcraft
sudo snap install --dangerous ./stillnote_1.1.0_amd64.snap
```

Remove it with `sudo snap remove stillnote`. Snapcraft packaging is an optional manual build path and is not built by the tag workflow.

## Build from source

### Prerequisites

- Rust stable 1.90 or newer and Cargo.
- Tauri 2 Linux development packages.
- Node.js 22 and npm for the pinned Tauri CLI wrapper. Node is a development/build dependency only.
- For AppImage video support, GStreamer base and good plugins on the Ubuntu 22.04 build host.

Arch/Garuda prerequisites:

```bash
sudo pacman -Syu --needed base-devel curl file gtk3 hicolor-icon-theme \
  openssl librsvg rust webkit2gtk-4.1 xdotool
```

Debian/Ubuntu prerequisites:

```bash
sudo apt update
sudo apt install build-essential curl file libayatana-appindicator3-dev \
  libfuse2 librsvg2-dev libssl-dev libwebkit2gtk-4.1-dev libxdo-dev \
  pkg-config gstreamer1.0-plugins-base gstreamer1.0-plugins-good
```

### Run and build the desktop app

```bash
npm ci
npm run dev
```

The Tauri CLI stages the local files and runs the desktop development session; no separate Python or Node server is needed. Build the native executable and the three Tauri bundles with:

```bash
npm run build
npm run build:linux
```

Build one Linux bundle at a time if needed:

```bash
npm run tauri -- build --bundles appimage
npm run tauri -- build --bundles deb
npm run tauri -- build --bundles rpm
```

To also copy the bundles into consistently named files under `artifacts/`:

```bash
./scripts/build-linux-artifacts.sh
```

The script writes `Stillnote-1.1.0-Linux-x86_64.AppImage`, `.deb`, and `.rpm` on x86_64. Tauri places the original bundles under `src-tauri/target/release/bundle/`.

### Build Arch package locally

From the repository root:

```bash
makepkg -si
```

To build without installing it, use `makepkg -s`. The resulting package is `stillnote-1.1.0-1-x86_64.pkg.tar.zst`.

### Build Flatpak locally

Install Flatpak Builder and the matching GNOME runtime, SDK, and Rust extension. The Rust extension branch matches the Freedesktop SDK branch used by GNOME 50:

```bash
sudo apt install flatpak flatpak-builder
flatpak remote-add --user --if-not-exists flathub https://flathub.org/repo/flathub.flatpakrepo
flatpak install --user flathub org.gnome.Platform//50 org.gnome.Sdk//50 \
  org.freedesktop.Sdk.Extension.rust-stable//25.08
flatpak-builder --user --force-clean --repo=flatpak-repo flatpak-build \
  packaging/flatpak/io.github.mk876543yoblip.stillnote.yml
flatpak build-bundle --arch=x86_64 flatpak-repo \
  Stillnote-1.1.0-Linux-x86_64.flatpak \
  io.github.mk876543yoblip.stillnote stable
```

The committed Cargo lockfile and generated `cargo-sources.json` pin Rust crate versions and source checksums. After changing Rust dependencies, regenerate the source list with `./scripts/update-flatpak-cargo-sources.sh`, then build again. The script uses the official `flatpak-cargo-generator.py` from [flatpak-builder-tools](https://github.com/flatpak/flatpak-builder-tools/tree/master/cargo) at a pinned revision. This helper is only used during packaging; it is not part of Stillnote.

### Build Snap locally

With Snapcraft installed, use:

```bash
snapcraft
```

The Snap definition builds the same locked Rust source, stages WebKitGTK/GTK, and uses strict confinement. The `home` interface is used for user-selected attachments and backup files; Stillnote does not request network access.

## Safe migration from the browser version

Browser and desktop storage use different origins and are not shared. To move existing notes safely:

1. Open the current browser/PWA Stillnote and go to **Settings → Export backup**.
2. Keep the downloaded JSON backup somewhere safe. It contains notes, collections, flashcards, settings, study statistics, and attached image/video data.
3. Open Stillnote Desktop and choose **Settings → Import backup**.
4. Select the JSON file and confirm. Import replaces the desktop workspace, so export a desktop backup first if it already contains notes you want to keep.

Export another backup before switching computers, clearing browser data, changing package formats, or removing the app. Removing the `.deb`, `.rpm`, or Arch package leaves Stillnote's per-user data in place. Flatpak and Snap keep data in sandbox-specific locations and may apply their own removal policy. Export/import is the supported way to move data between these installs.

The [browser/PWA app](https://mk876543yo-blip.github.io/stillnote/app/) remains available. For local development, serve the repository root over HTTP using any static file server (for example, `python3 -m http.server 8000`) and open `http://127.0.0.1:8000`; the installed desktop app itself does not use that server.

## Troubleshooting and limitations

- If a `.deb`, `.rpm`, Arch package, Snap, or development build fails with a missing `libwebkit2gtk-4.1` or GTK library, install the distribution's WebKitGTK 4.1/GTK 3 runtime.
- If an AppImage reports a missing FUSE library, install `libfuse2` where available or use its `--appimage-extract` option.
- Older Linux releases can lack the required glibc symbols. The portable AppImage and native packages are built on Ubuntu 22.04 to keep the baseline low; they cannot run on glibc older than that baseline.
- If video attachments show a black frame or no audio, install compatible GStreamer codecs for the host's WebKitGTK. AppImage includes the base/good media framework, but codec coverage varies.
- Dictation support varies by WebKitGTK version and speech service availability.
- Flatpak needs a working desktop portal for file selection. Its sandbox intentionally does not have general home-directory or network access.
- The web/PWA and desktop app have separate storage. Do not remove browser data until a backup has been exported and restored in Desktop.

See [LICENSE](LICENSE) for the project license.

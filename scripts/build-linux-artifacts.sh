#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

version="$(sed -n 's/^version = "\([^"]*\)"/\1/p' src-tauri/Cargo.toml | head -n 1)"
arch="$(uname -m)"
case "$arch" in
  x86_64|aarch64) ;;
  *) printf 'Unsupported build architecture: %s\n' "$arch" >&2; exit 2 ;;
esac

npm run build:linux

bundle_dir="src-tauri/target/release/bundle"
appimage="$(find "$bundle_dir/appimage" -maxdepth 1 -type f -name '*.AppImage' -print -quit)"
deb="$(find "$bundle_dir/deb" -maxdepth 1 -type f -name '*.deb' -print -quit)"
rpm="$(find "$bundle_dir/rpm" -maxdepth 1 -type f -name '*.rpm' -print -quit)"
for artifact in "$appimage" "$deb" "$rpm"; do
  if [[ -z "$artifact" || ! -f "$artifact" ]]; then
    printf 'Tauri did not produce all Linux bundles in %s\n' "$bundle_dir" >&2
    exit 1
  fi
done

mkdir -p artifacts
cp "$appimage" "artifacts/Stillnote-${version}-Linux-${arch}.AppImage"
cp "$deb" "artifacts/Stillnote-${version}-Linux-${arch}.deb"
cp "$rpm" "artifacts/Stillnote-${version}-Linux-${arch}.rpm"
printf 'Built artifacts:\n'
printf '  %s\n' "$repo_root"/artifacts/Stillnote-"$version"-Linux-"$arch".*

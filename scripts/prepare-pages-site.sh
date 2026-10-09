#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
site_root="$repo_root/_site"

rm -rf -- "$site_root"
mkdir -p "$site_root/app"
cp -a "$repo_root/site/." "$site_root/"
cp "$repo_root/index.html" \
  "$repo_root/app.js" \
  "$repo_root/styles.css" \
  "$repo_root/manifest.webmanifest" \
  "$repo_root/service-worker.js" \
  "$repo_root/icon.svg" \
  "$site_root/app/"
cp "$repo_root/icon.svg" "$site_root/icon.svg"

printf 'Prepared GitHub Pages site in %s\n' "$site_root"

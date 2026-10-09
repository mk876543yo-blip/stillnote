#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
stage_dir="$repo_root/src-tauri/frontend-dist"
mkdir -p "$stage_dir"
for asset in index.html app.js styles.css manifest.webmanifest icon.svg service-worker.js; do
  install -m 0644 "$repo_root/$asset" "$stage_dir/$asset"
done

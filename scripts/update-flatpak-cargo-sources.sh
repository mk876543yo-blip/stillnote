#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
generator_revision="74697c75b630d7330e77250fc13cb5ea688d9479"
temporary_dir="$(mktemp -d)"
trap 'rm -rf "$temporary_dir"' EXIT

curl --fail --location --silent --show-error \
  "https://raw.githubusercontent.com/flatpak/flatpak-builder-tools/${generator_revision}/cargo/flatpak-cargo-generator.py" \
  --output "$temporary_dir/flatpak-cargo-generator.py"
python3 -m venv "$temporary_dir/venv"
"$temporary_dir/venv/bin/pip" install --quiet aiohttp tomlkit
"$temporary_dir/venv/bin/python" "$temporary_dir/flatpak-cargo-generator.py" \
  --output "$repo_root/packaging/flatpak/cargo-sources.json" \
  "$repo_root/src-tauri/Cargo.lock"

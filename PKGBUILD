pkgname=stillnote
pkgver=1.1.0
pkgrel=1
pkgdesc='Private local notes and study workspace'
arch=('x86_64')
url='https://github.com/mk876543yo-blip/stillnote'
license=('MIT')
depends=('gtk3' 'hicolor-icon-theme' 'webkit2gtk-4.1')
makedepends=('rust')

if [[ -f "${startdir}/src-tauri/Cargo.toml" ]]; then
  _source_root="${startdir}"
  source=()
  sha256sums=()
else
  _source_root="${srcdir}/stillnote"
  source=("git+https://github.com/mk876543yo-blip/stillnote.git#tag=v${pkgver}")
  sha256sums=('SKIP')
fi

prepare() {
  cd "${_source_root}"
  ./scripts/stage-frontend.sh
}

build() {
  cd "${_source_root}"
  cargo build --manifest-path src-tauri/Cargo.toml --release --locked
}

package() {
  cd "${_source_root}"

  install -Dm755 src-tauri/target/release/stillnote "${pkgdir}/usr/bin/stillnote"
  install -Dm644 packaging/linux/stillnote.desktop "${pkgdir}/usr/share/applications/stillnote.desktop"
  install -Dm644 icon.svg "${pkgdir}/usr/share/icons/hicolor/scalable/apps/stillnote.svg"
  install -Dm644 src-tauri/icons/32x32.png "${pkgdir}/usr/share/icons/hicolor/32x32/apps/stillnote.png"
  install -Dm644 src-tauri/icons/128x128.png "${pkgdir}/usr/share/icons/hicolor/128x128/apps/stillnote.png"
  install -Dm644 src-tauri/icons/128x128@2x.png "${pkgdir}/usr/share/icons/hicolor/256x256/apps/stillnote.png"
  install -Dm644 LICENSE "${pkgdir}/usr/share/licenses/${pkgname}/LICENSE"
}

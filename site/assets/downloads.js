const repository = 'mk876543yo-blip/stillnote';
const releasePage = `https://github.com/${repository}/releases/latest`;
const releaseApi = `https://api.github.com/repos/${repository}/releases/latest`;

const packageDefinitions = {
  appimage: { extension: '.AppImage', architecture: /Linux-(x86_64|aarch64)/i },
  deb: { extension: '.deb', architecture: /Linux-(x86_64|aarch64)/i },
  rpm: { extension: '.rpm', architecture: /Linux-(x86_64|aarch64)/i },
  arch: { extension: '.pkg.tar.zst', architecture: /Arch-(x86_64)/i },
  flatpak: { extension: '.flatpak', architecture: /Linux-(x86_64|aarch64)/i }
};

const status = document.querySelector('#release-status');
const architectureName = value => value.toLowerCase() === 'aarch64' ? 'ARM64' : 'x86_64';

function setFallback(message) {
  status.textContent = message;
  for (const container of document.querySelectorAll('.package-links')) {
    const link = document.createElement('a');
    link.className = 'button button-small button-secondary';
    link.href = releasePage;
    link.textContent = 'Open latest release';
    link.rel = 'noopener';
    container.replaceChildren(link);
  }
}

function makeDownloadLink(asset, label) {
  const url = new URL(asset.browser_download_url);
  if (url.origin !== 'https://github.com') return null;
  const link = document.createElement('a');
  link.className = 'download-link';
  link.href = url.href;
  link.download = '';
  link.setAttribute('aria-label', `Download ${label}: ${asset.name}`);
  const name = document.createElement('span');
  name.className = 'download-architecture';
  name.textContent = label;
  const arrow = document.createElement('span');
  arrow.className = 'download-arrow';
  arrow.setAttribute('aria-hidden', 'true');
  arrow.textContent = '↓';
  link.append(name, arrow);
  return link;
}

function showPackages(release) {
  const assets = release.assets || [];
  status.replaceChildren();
  const releaseLabel = document.createElement('span');
  const releasedAt = new Date(release.published_at);
  releaseLabel.textContent = `Latest stable · ${release.tag_name}${Number.isNaN(releasedAt.getTime()) ? '' : ` · ${releasedAt.toLocaleDateString()}`}`;
  status.append(releaseLabel);

  const releaseLink = document.createElement('a');
  releaseLink.href = release.html_url;
  releaseLink.textContent = 'Release notes';
  releaseLink.rel = 'noopener';
  status.append(releaseLink);

  const checksum = assets.find(asset => asset.name === 'SHA256SUMS');
  if (checksum) {
    const checksumLink = document.createElement('a');
    checksumLink.href = checksum.browser_download_url;
    checksumLink.textContent = 'SHA256 checksums';
    checksumLink.rel = 'noopener';
    status.append(checksumLink);
  }

  for (const [key, definition] of Object.entries(packageDefinitions)) {
    const card = document.querySelector(`[data-package="${key}"] .package-links`);
    const matching = assets
      .filter(asset => asset.name.endsWith(definition.extension) && definition.architecture.test(asset.name))
      .sort((a, b) => a.name.localeCompare(b.name));
    const links = matching.map(asset => {
      const architecture = asset.name.match(definition.architecture)?.[1] || '';
      return makeDownloadLink(asset, architectureName(architecture));
    }).filter(Boolean);

    if (links.length) card.replaceChildren(...links);
    else {
      const missing = document.createElement('span');
      missing.className = 'download-missing';
      missing.textContent = 'Not available in this release';
      card.replaceChildren(missing);
    }
  }
}

fetch(releaseApi, { headers: { Accept: 'application/vnd.github+json' } })
  .then(response => {
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    return response.json();
  })
  .then(showPackages)
  .catch(() => setFallback('Package links are temporarily unavailable. Open the releases page to browse downloads.'));

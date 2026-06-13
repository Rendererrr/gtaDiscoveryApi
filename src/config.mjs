// Central config for the GTA Discovery API build.
// Every generated URL is derived from these values, so moving the repo or
// branch only needs a change here.

export const GH_OWNER = 'Rendererrr';
export const GH_REPO = 'gtaDiscoveryApi';
export const GH_BRANCH = 'main';

export const CDN_BASE = `https://cdn.jsdelivr.net/gh/${GH_OWNER}/${GH_REPO}@${GH_BRANCH}`;
export const RAW_BASE = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}`;

// Shared meta block embedded in every generated index/manifest.
export function baseMeta() {
  return {
    generatedFrom: `github.com/${GH_OWNER}/${GH_REPO}`,
    cdnBase: CDN_BASE,
    rawBase: RAW_BASE,
  };
}

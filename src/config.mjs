// Central config for the GTA Discovery API build.
// Every generated URL is derived from these values, so moving the repo, branch,
// or hosting target only needs a change here.

export const GH_OWNER = 'Rendererrr';
export const GH_REPO = 'gtaDiscoveryApi';
export const GH_BRANCH = 'main';

// The two hosting targets the generated JSON can point at:
export const JSDELIVR_BASE = `https://cdn.jsdelivr.net/gh/${GH_OWNER}/${GH_REPO}@${GH_BRANCH}`;
// GitHub Pages project URL (the github.io host is always lowercase).
export const PAGES_BASE = `https://${GH_OWNER.toLowerCase()}.github.io/${GH_REPO}`;
export const RAW_BASE = `https://raw.githubusercontent.com/${GH_OWNER}/${GH_REPO}/${GH_BRANCH}`;

// Pick the base used in generated URLs. Precedence:
//   1. API_BASE_URL=<url>            explicit override (any host / custom domain)
//   2. --pages / --jsdelivr / --target=<t>   build flag
//   3. API_TARGET=pages|jsdelivr     env var
//   4. default: jsdelivr
function flagTarget() {
  const argv = process.argv.slice(2);
  if (argv.includes('--pages')) return 'pages';
  if (argv.includes('--jsdelivr')) return 'jsdelivr';
  const t = argv.find((a) => a.startsWith('--target='));
  return t ? t.slice('--target='.length) : null;
}

function resolveBase() {
  const explicit = process.env.API_BASE_URL;
  if (explicit) return explicit.replace(/\/+$/, '');

  const target = (flagTarget() || process.env.API_TARGET || 'jsdelivr').toLowerCase();
  if (target === 'pages') return PAGES_BASE;
  if (target === 'jsdelivr') return JSDELIVR_BASE;
  throw new Error(`Unknown target "${target}". Use --pages | --jsdelivr, API_TARGET=pages|jsdelivr, or API_BASE_URL=<url>.`);
}

// Base for every generated URL (image urls, cdnBase, urlPattern).
export const CDN_BASE = resolveBase();

// Shared meta block embedded in every generated index/manifest.
export function baseMeta() {
  return {
    generatedFrom: `github.com/${GH_OWNER}/${GH_REPO}`,
    cdnBase: CDN_BASE,
    rawBase: RAW_BASE,
  };
}

// Entry point for the GTA Discovery API client.
// Exposes the discovery root (list of domains) and re-exports each domain's
// helpers under a namespace.
//
//   import discovery, { clothing } from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/index.js';
//   const domains = await discovery.getDomains();
//   const url = await clothing.getTexture({ componentId: 11, gender: 'male', drawable: 0 });

import * as clothing from './clothing.js';
import peds from './peds.js';
import vehicles from './vehicles.js';
import weapons from './weapons.js';
import objects from './objects.js';
import explosions from './explosions.js';
import particles from './particles.js';
import animations from './animations.js';

// Self-locating: resolve the API root relative to this module's own URL, so it
// works wherever it's served from (jsDelivr, GitHub Pages, or a custom host).
const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');

/** The top-level discovery index (api/index.json) listing every domain. */
export async function getDomains() {
  const res = await fetch(`${BASE}/api/index.json`);
  if (!res.ok) throw new Error(`GTA Discovery API: api/index.json -> HTTP ${res.status}`);
  return res.json();
}

/**
 * Search the flat domains at once. Returns { <domain>: item[] } per searched domain.
 * Defaults to peds/vehicles/weapons; `objects` is opt-in (it loads a ~2.3 MB index)
 * via e.g. search('door', { domains: ['objects'] }).
 *
 *   const { vehicles } = await search('adder');
 *   const img = vehicles[0]?.url;
 */
export async function search(query, { limit = 25, domains = ['peds', 'vehicles', 'weapons'] } = {}) {
  const clients = { peds, vehicles, weapons, objects, explosions, particles, animations };
  const out = {};
  await Promise.all(domains.map(async (d) => { out[d] = await clients[d].search(query, { limit }); }));
  return out;
}

let _hashesPromise = null;
/** The combined cross-domain hash -> { domain, id, name } map (api/hashes.json). */
export function getHashes() {
  if (!_hashesPromise) {
    _hashesPromise = fetch(`${BASE}/api/hashes.json`).then((res) => {
      if (!res.ok) throw new Error(`GTA Discovery API: api/hashes.json -> HTTP ${res.status}`);
      return res.json();
    }).then((j) => j.hashes);
  }
  return _hashesPromise;
}

/** Resolve any joaat hash across all domains -> { domain, id, name } (or null). */
export async function byHash(hash) {
  return (await getHashes())[String(hash)] ?? null;
}

export { clothing, peds, vehicles, weapons, objects, explosions, particles, animations };

export default { getDomains, search, getHashes, byHash, clothing, peds, vehicles, weapons, objects, explosions, particles, animations };

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
 * Search the flat domains (peds, vehicles, weapons) at once.
 * Returns { peds, vehicles, weapons } each an array of matching items.
 * Pass { domains: ['vehicles'] } to limit which are searched.
 *
 *   const { vehicles } = await search('adder');
 *   const img = vehicles[0]?.url;
 */
export async function search(query, { limit = 25, domains = ['peds', 'vehicles', 'weapons'] } = {}) {
  const clients = { peds, vehicles, weapons };
  const out = {};
  await Promise.all(domains.map(async (d) => { out[d] = await clients[d].search(query, { limit }); }));
  return out;
}

export { clothing, peds, vehicles, weapons };

export default { getDomains, search, clothing, peds, vehicles, weapons };

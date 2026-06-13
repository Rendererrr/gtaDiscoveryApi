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

const BASE = 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main';

/** The top-level discovery index (api/index.json) listing every domain. */
export async function getDomains() {
  const res = await fetch(`${BASE}/api/index.json`);
  if (!res.ok) throw new Error(`GTA Discovery API: api/index.json -> HTTP ${res.status}`);
  return res.json();
}

export { clothing, peds, vehicles, weapons };

export default { getDomains, clothing, peds, vehicles, weapons };

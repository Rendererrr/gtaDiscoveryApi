// Build orchestrator for the GTA Discovery API.
//
// Runs every registered domain builder, then writes the top-level discovery
// index (api/index.json) that lists the domains available in this repo.
//
// Adding a new domain (e.g. vehicles, peds):
//   1. Drop its files under assets/<domain>/
//   2. Create src/build/<domain>.mjs exporting `build({ assetsDir, apiDir, log })`
//      that returns a descriptor { domain, label, index, ... }
//   3. Import it and add it to DOMAINS below.

import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { baseMeta, CDN_BASE } from '../config.mjs';

import * as clothing from './clothing.mjs';
import * as peds from './peds.mjs';
import * as vehicles from './vehicles.mjs';
import * as weapons from './weapons.mjs';

const DOMAINS = [
  clothing,
  peds,
  vehicles,
  weapons,
];

const ROOT = join(import.meta.dirname, '..', '..');
const ASSETS_DIR = join(ROOT, 'assets');
const API_DIR = join(ROOT, 'api');

async function main() {
  await mkdir(API_DIR, { recursive: true });

  console.log(`Base URL: ${CDN_BASE}`);

  const domains = [];
  for (const mod of DOMAINS) {
    console.log(`\n# Building domain: ${mod.DOMAIN}`);
    const descriptor = await mod.build({ assetsDir: ASSETS_DIR, apiDir: API_DIR, log: console.log });
    domains.push(descriptor);
  }

  domains.sort((a, b) => (a.domain < b.domain ? -1 : a.domain > b.domain ? 1 : 0));

  const root = {
    meta: {
      ...baseMeta(),
      name: 'GTA Discovery API',
      note: 'A static JSON API for GTA 5 / FiveM game assets, split by domain. Pick a domain, then read its index for endpoints.',
    },
    domains,
  };

  await writeFile(join(API_DIR, 'index.json'), JSON.stringify(root, null, 2), 'utf-8');

  console.log(`\n✓ Wrote api/index.json — ${domains.length} domain(s): ${domains.map((d) => d.domain).join(', ')}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

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

import { writeFile, readFile, mkdir } from 'fs/promises';
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

  // Combined cross-domain listings of every category and every DLC, merged from
  // each flat domain's by-category/by-dlc index files (static API -> no query params).
  // DLCs are merged by friendly NAME, so alias codes for the same update collapse
  // into one row (TitleUpdate+basegame -> "Base Game"; mpsum2+mpg9ec -> "The Criminal
  // Enterprises"; mp2024_02+mp2024_02_g9ec -> "Agents of Sabotage").
  const catsByDomain = {};
  const dlcMap = new Map(); // name -> { name, ids:Set, releaseDate, domains:{}, paths:{}, total }
  for (const d of domains) {
    if (d.byCategory) {
      const { groups } = JSON.parse(await readFile(join(ROOT, d.byCategory), 'utf-8'));
      catsByDomain[d.domain] = groups.map((g) => ({ name: g.name, slug: g.slug, count: g.count, path: g.path }));
    }
    if (d.byDlc) {
      const { groups } = JSON.parse(await readFile(join(ROOT, d.byDlc), 'utf-8'));
      for (const g of groups) {
        if (!dlcMap.has(g.name)) dlcMap.set(g.name, { name: g.name, ids: new Set(), releaseDate: g.releaseDate ?? null, domains: {}, paths: {}, total: 0 });
        const e = dlcMap.get(g.name);
        e.ids.add(g.id);
        if (g.releaseDate && !e.releaseDate) e.releaseDate = g.releaseDate;
        e.domains[d.domain] = (e.domains[d.domain] ?? 0) + g.count;
        e.paths[d.domain] = g.path;
        e.total += g.count;
      }
    }
  }
  const dlcs = [...dlcMap.values()]
    .map((e) => ({ name: e.name, ids: [...e.ids], releaseDate: e.releaseDate, domains: e.domains, paths: e.paths, total: e.total }))
    .sort((a, b) => (a.releaseDate ?? '￿').localeCompare(b.releaseDate ?? '￿') || a.name.localeCompare(b.name));

  await writeFile(
    join(API_DIR, 'categories.json'),
    JSON.stringify({
      meta: { ...baseMeta(), note: 'Every category in each flat domain. Each entry -> a by-category slice at `path`.' },
      domains: catsByDomain,
    }, null, 2),
    'utf-8',
  );
  await writeFile(
    join(API_DIR, 'dlc.json'),
    JSON.stringify({
      meta: { ...baseMeta(), note: 'Every GTA DLC that introduced a tagged item, merged across domains and ordered by releaseDate (a content timeline). `domains` = item count per domain; `paths` = the by-dlc slice per domain.' },
      count: dlcs.length,
      dlcs,
    }, null, 2),
    'utf-8',
  );

  const root = {
    meta: {
      ...baseMeta(),
      name: 'GTA Discovery API',
      note: 'A static JSON API for GTA 5 / FiveM game assets, split by domain. Pick a domain, then read its index for endpoints.',
    },
    endpoints: {
      hashes: 'api/hashes.json',
      categories: 'api/categories.json',
      dlc: 'api/dlc.json',
    },
    domains,
  };

  await writeFile(join(API_DIR, 'index.json'), JSON.stringify(root, null, 2), 'utf-8');

  // Combined cross-domain hash -> { domain, id, name } reverse-lookup, merged from
  // each flat domain's hashes.json. Lets a consumer resolve any joaat hash in one file.
  const combined = {};
  let collisions = 0;
  for (const d of domains) {
    if (!d.hashes) continue;
    const { hashes } = JSON.parse(await readFile(join(ROOT, d.hashes), 'utf-8'));
    for (const [hash, info] of Object.entries(hashes)) {
      if (combined[hash]) collisions++;
      combined[hash] = { domain: d.domain, id: info.id, name: info.name };
    }
  }
  await writeFile(
    join(API_DIR, 'hashes.json'),
    JSON.stringify({
      meta: { ...baseMeta(), note: 'Combined joaat hash -> { domain, id, name } across all hashed domains.' },
      count: Object.keys(combined).length,
      hashes: combined,
    }, null, 2),
    'utf-8',
  );

  console.log(`\n✓ Wrote api/index.json — ${domains.length} domain(s): ${domains.map((d) => d.domain).join(', ')}`);
  console.log(`✓ Wrote api/hashes.json — ${Object.keys(combined).length} hashes${collisions ? ` (${collisions} cross-domain collision(s))` : ''}.`);
  console.log(`✓ Wrote api/categories.json (${Object.values(catsByDomain).reduce((n, a) => n + a.length, 0)} categories) and api/dlc.json (${dlcs.length} DLCs).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

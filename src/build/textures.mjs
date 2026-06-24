// Textures domain builder.
//
// GTA V texture dictionaries (.ytd) and the textures inside them, extracted from
// the game RPFs. Data-only (no images). Because there are tens of thousands of
// dictionaries, this uses a CUSTOM layout (not writeFlatDomain) to keep the root
// index light:
//   api/textures/index.json            light catalog: one row per dict, NO texture arrays
//   api/textures/by-category/<slug>.json  full slices (per source archive) WITH textures
//   api/textures/by-category/index.json   group listing (folded into api/categories.json)
//   api/textures/hashes.json           reverse joaat lookup for BOTH dict names and texture names
//   api/textures/dicthashes.json       lean dict-only reverse (hash -> name); Legacy + Enhanced keys
//
// dict id = ytd name without .ytd; texture names carry no format extension.
// Source: src/data/textures.json (produced by tools/import_ytd_textures.mjs).

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';
import { slugify } from '../lib/catalog.mjs';

export const DOMAIN = 'textures';
export const LABEL = 'Textures';

const ROOT = join(import.meta.dirname, '..', '..');

export async function build({ apiDir, log = console.log }) {
  const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'textures.json'), 'utf-8'));
  const dicts = SRC.dicts ?? [];

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL, urlPattern: null,
    note: 'GTA V texture dictionaries (.ytd) and their textures. dict id = ytd name without .ytd; '
        + 'texture names without format extension. index.json is light (no texture arrays) — full '
        + 'texture lists live in by-category/<archive>.json. hashes.json reverse-maps joaat(dict) AND '
        + 'joaat(texture) -> { type, id, name }.',
  };

  // Light catalog rows + grouping by category (source archive).
  const items = [];
  const groups = new Map(); // category -> { slug, items:[fullDict] }
  const hashes = {};        // joaat -> { type, id, name, category? }
  const dictHashes = {};    // lean dict-only reverse: hash -> name (both joaat variants); for the in-game menu
  let textureCount = 0;

  // The Enhanced (GTA5_Enhanced) grcTextureStore keys core txds by joaat of the virtual mount PATH
  // ("platform:/textures/<id>"), not the bare id the Legacy store uses. e.g.
  //   joaat("skydome")                    = 0x9D63C9B9   (Legacy store key)
  //   joaat("platform:/textures/skydome") = 0xF9016035   (Enhanced store key)
  // Verified live (rope/skydome/water). So reverse-map BOTH variants -> name. (Non-platform DLC txds use
  // other mount roots on Enhanced and won't reverse from this prefix -- acceptable; covers resident core.)
  const ENH_PREFIX = 'platform:/textures/';

  for (const d of dicts) {
    const category = d.category ?? 'unknown';
    const slug = slugify(category);
    const hash = joaat(d.id);
    const row = {
      id: d.id,
      name: d.id,
      hash,
      category,
      textureCount: d.textures.length,
      sourceCount: d.sources?.length ?? 1,
      path: `api/${DOMAIN}/by-category/${slug}.json`,
    };
    items.push(row);

    // dict reverse-hash entries: Legacy (bare joaat) + Enhanced (joaat of the platform mount path)
    hashes[hash] = { type: 'dict', id: d.id, name: d.id, category };
    const pathHash = joaat(ENH_PREFIX + d.id);
    if (!hashes[pathHash]) hashes[pathHash] = { type: 'dict', id: d.id, name: d.id, category, enhanced: true };
    dictHashes[hash] = d.id;
    dictHashes[pathHash] = d.id;

    // texture reverse-hash entries
    for (const t of d.textures) {
      textureCount++;
      const th = joaat(t);
      if (!hashes[th]) hashes[th] = { type: 'texture', id: t, name: t };
    }

    if (!groups.has(category)) groups.set(category, { slug, items: [] });
    groups.get(category).items.push({ ...row, sources: d.sources ?? [], textures: d.textures });
  }

  items.sort((a, b) => a.id.localeCompare(b.id));

  const categories = [...groups.entries()]
    .map(([name, g]) => ({ name, count: g.items.length }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  // by-category slices (full, with textures) + group index
  const byCatDir = join(domainApi, 'by-category');
  await mkdir(byCatDir, { recursive: true });
  const groupIndex = [];
  for (const [name, g] of [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    g.items.sort((a, b) => a.id.localeCompare(b.id));
    await writeFile(
      join(byCatDir, `${g.slug}.json`),
      JSON.stringify({ meta, group: { name, slug: g.slug, count: g.items.length }, count: g.items.length, items: g.items }, null, 2),
      'utf-8',
    );
    groupIndex.push({ name, slug: g.slug, count: g.items.length, path: `api/${DOMAIN}/by-category/${g.slug}.json` });
  }
  await writeFile(
    join(byCatDir, 'index.json'),
    JSON.stringify({ meta, count: groupIndex.length, groups: groupIndex }, null, 2),
    'utf-8',
  );

  // Light root catalog
  await writeFile(
    join(domainApi, 'index.json'),
    JSON.stringify({ meta, categories, dictCount: items.length, textureCount, count: items.length, items }, null, 2),
    'utf-8',
  );

  // Reverse-hash map (dicts + textures)
  await writeFile(
    join(domainApi, 'hashes.json'),
    JSON.stringify({ meta, count: Object.keys(hashes).length, hashes }, null, 2),
    'utf-8',
  );

  // Lean dict-only reverse map (hash -> name, both Legacy + Enhanced variants). This is what the in-game
  // Custom Textures menu downloads to turn a live store dict hash into a friendly txd name -- a fraction
  // of hashes.json (no texture entries, no objects).
  await writeFile(
    join(domainApi, 'dicthashes.json'),
    JSON.stringify({ meta, count: Object.keys(dictHashes).length, hashes: dictHashes }, null, 2),
    'utf-8',
  );

  log(`Done ${DOMAIN}: ${items.length} dicts, ${textureCount} textures across ${categories.length} archives (${Object.keys(hashes).length} hashes, ${Object.keys(dictHashes).length} dict hashes).`);

  return {
    domain: DOMAIN,
    label: LABEL,
    itemCount: items.length,
    categoryCount: categories.length,
    textureCount,
    index: `api/${DOMAIN}/index.json`,
    hashes: `api/${DOMAIN}/hashes.json`,
    dictHashes: `api/${DOMAIN}/dicthashes.json`,
    byCategory: `api/${DOMAIN}/by-category/index.json`,
  };
}

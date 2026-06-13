// Explosions domain builder.
//
// GTA explosion types from DurtyFree explosionTypesCompact.json, curated in
// src/data/explosions.json with friendly names + categories. No images.
//
// Each item: { index, id, name, category, tag, hash }
//   - hash = joaat(tag): the stable, cross-version identifier (use this in scripts).
//   - index = catalog position (0-based); NOT the in-game ADD_EXPLOSION enum integer.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'explosions';
export const LABEL = 'Explosions';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'explosions.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.explosions.map((e) => ({
    index: e.index,
    id: e.id,
    name: e.name,
    category: e.category,
    tag: e.tag,
    hash: e.hash,
  }));

  log(`  ${items.length} explosion types across ${SRC.categories.length} categories.`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Explosion types (no images). hash = joaat(tag) — the stable identifier to use in scripts. index = catalog position, NOT the in-game ADD_EXPLOSION enum integer. category groups are under by-category/.',
    items, log,
  });
}

// Teleports domain builder.
//
// Named teleport destinations — the world coords passed to SET_ENTITY_COORDS to
// warp the player. id = the location name; hash = joaat(id); x/y/z are world
// coords (no heading — teleport keeps the player's current heading). Grouped by
// area type (High Sky, Indoor, Interiors, Landmark, Outdoor, Safe House,
// Underwater). Curated in src/data/teleports.json (a nested
// { Category: { "Name": [x,y,z] } } object). No images.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'teleports';
export const LABEL = 'Teleports';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'teleports.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = [];
  for (const [category, locs] of Object.entries(SRC)) {
    for (const [name, c] of Object.entries(locs)) {
      if (!Array.isArray(c) || c.length < 3) continue;
      items.push({ id: name, name, hash: joaat(name), category, x: +c[0], y: +c[1], z: +c[2] });
    }
  }
  log(`  ${items.length} teleports across ${Object.keys(SRC).length} categories.`);
  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Named teleport locations; x/y/z are world coords (SET_ENTITY_COORDS). id = location name; hash = joaat(id). No heading. No images. category groups under by-category/.',
    items, log,
  });
}

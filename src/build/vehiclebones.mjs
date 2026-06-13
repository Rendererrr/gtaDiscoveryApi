// Vehicle bones domain builder.
//
// GTA vehicle bone names with hash = joaat(id) — the value that
// GET_ENTITY_BONE_INDEX_BY_NAME resolves. Categorized by vehicle area with
// friendly display names. Curated in src/data/vehiclebones.json. No images.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'vehiclebones';
export const LABEL = 'Vehicle Bones';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'vehiclebones.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.bones.map((b) => ({ id: b.id, name: b.name, hash: b.hash, category: b.category }));
  log(`  ${items.length} vehicle bones across ${SRC.categories.length} categories.`);
  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Vehicle bone names. hash = joaat(id) (resolves via GET_ENTITY_BONE_INDEX_BY_NAME). No images. category groups under by-category/; reverse hash -> { id, name, category } in hashes.json.',
    items, log,
  });
}

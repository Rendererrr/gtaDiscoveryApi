// Damage packs domain builder.
//
// GTA ped damage/blood packs used with APPLY_PED_DAMAGE_PACK(ped, name, damage, mult).
// id = the pack name string; hash = joaat(id). Friendly display names + categories.
// No images. Curated in src/data/damagepacks.json.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'damagepacks';
export const LABEL = 'Damage Packs';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'damagepacks.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.damagepacks.map((d) => ({ id: d.id, name: d.name, hash: joaat(d.id), category: d.category }));

  log(`  ${items.length} damage packs across ${SRC.categories.length} categories.`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Ped damage/blood packs for APPLY_PED_DAMAGE_PACK(ped, name, damage, mult). id = the pack name; hash = joaat(id). No images. category groups under by-category/.',
    items, log,
  });
}

// Vehicle weapons domain builder.
//
// GTA vehicle weapon archetype names (VEHICLE_WEAPON_*) with their authoritative
// joaat archetype hash — the value GET_HASH_KEY resolves for use with vehicle
// weapon natives. Categorized by weapon type with friendly display names. Curated
// in src/data/vehicleweapons.json. No images.
//
// hash is stored explicitly (not recomputed): it is the authoritative game hash,
// and for two entries the exact VEHICLE_WEAPON_* string is a best guess where
// hash != joaat(id), so the stored hash is the source of truth.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'vehicleweapons';
export const LABEL = 'Vehicle Weapons';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'vehicleweapons.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.vehicleweapons.map((w) => ({ id: w.id, name: w.name, hash: w.hash, category: w.category }));
  log(`  ${items.length} vehicle weapons across ${SRC.categories.length} categories.`);
  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'GTA vehicle weapons (VEHICLE_WEAPON_*). id = the archetype string; hash = the authoritative joaat archetype hash (resolves via GET_HASH_KEY). No images. category groups under by-category/; reverse hash -> { id, name, category } in hashes.json.',
    items, log,
  });
}

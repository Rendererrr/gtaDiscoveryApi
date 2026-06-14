// Tattoos domain builder.
//
// GTA ped tattoos (decorations, TYPE_TATTOO) applied with
// ADD_PED_DECORATION_FROM_HASHES(ped, joaat(collection), joaat(id)). Each item carries the
// owning ped model hash (filter by selected ped) + body-zone category. Friendly captions.
// No images. Curated in src/data/tattoos.json (generated from MenyooSP PedDecalOverlays.xml).

import { readFile } from 'fs/promises';
import { join } from 'path';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'tattoos';
export const LABEL = 'Tattoos';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'tattoos.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.tattoos.map((t) => ({
    id: t.id,
    name: t.name,
    collection: t.collection,
    category: t.category,
    model: t.model,
    zone: t.zone,
  }));

  log(`  ${items.length} tattoos across ${SRC.categories.length} body zones.`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Ped tattoos (decorations) for ADD_PED_DECORATION_FROM_HASHES(ped, joaat(collection), joaat(id)). model = owning ped model hash (filter by selected ped). category = body zone. No images. category groups under by-category/.',
    items, log,
  });
}

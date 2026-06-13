// Vehicles domain builder.
//
// Flat catalog: one image per vehicle model, keyed by model_name.
// Source metadata: src/data/vehicles.json (model_name, display_name, hash, category).
// Images:         assets/vehicles/images/<model_name>.webp
// Hash:           archive's hash, verified against joaat(model_name).

import { readFile } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain, fileExists } from '../lib/catalog.mjs';

export const DOMAIN = 'vehicles';
export const LABEL = 'Vehicles';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'vehicles.json'), 'utf-8'));

export async function build({ assetsDir, apiDir, log = console.log }) {
  const imagesDir = join(assetsDir, DOMAIN, 'images');

  let missing = 0;
  let mismatches = 0;
  const items = [];
  for (const veh of SRC) {
    const id = veh.model_name;
    // joaat(model_name) is authoritative. The archive's `hash` is informational
    // only: most of its "differences" are just signed-int32 encodings of the same
    // value (normalise with >>> 0), and a couple are outright data errors.
    const computed = joaat(id);
    const declared = Number(veh.hash);
    if (Number.isFinite(declared) && (declared >>> 0) !== computed) {
      mismatches++;
      log(`  ! archive hash for "${id}" (${declared}) disagrees with joaat ${computed} — using joaat.`);
    }
    const hasImage = await fileExists(join(imagesDir, `${id}.webp`));
    if (!hasImage) missing++;
    items.push({
      id,
      name: veh.display_name,
      hash: computed,
      category: veh.category,
      url: hasImage ? `${CDN_BASE}/assets/${DOMAIN}/images/${id}.webp` : null,
    });
  }

  if (missing) log(`  ! ${missing} vehicle(s) have no image (url: null).`);
  if (mismatches) log(`  note: ${mismatches} archive hash(es) overridden by joaat (data errors in source).`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{model_name}.webp`,
    note: 'Flat catalog keyed by model_name. hash = joaat(model_name).',
    items, log,
  });
}

// Peds domain builder.
//
// Flat catalog: one image per ped model, keyed by model_name.
// Source metadata: src/data/peds.json (model_name, category, props, components).
// Images:         assets/peds/images/<model_name>.webp
// Hash:           joaat(model_name) — peds.json ships no hash, so we compute it.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain, fileExists } from '../lib/catalog.mjs';

export const DOMAIN = 'peds';
export const LABEL = 'Peds';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'peds.json'), 'utf-8'));
// model name (lowercased) -> internal DLC code (DurtyFree), resolved to { id, name, releaseDate }.
const DLC_BY_MODEL = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'peds.dlc.json'), 'utf-8')).models;
const DLC_LABELS = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'dlc.labels.json'), 'utf-8')).labels;
function dlcFor(model) {
  const id = DLC_BY_MODEL[model.toLowerCase()];
  if (!id) return null;
  const l = DLC_LABELS[id];
  return { id, name: l?.name ?? id, releaseDate: l?.releaseDate ?? null };
}

export async function build({ assetsDir, apiDir, log = console.log }) {
  const imagesDir = join(assetsDir, DOMAIN, 'images');

  let missing = 0;
  let dupes = 0;
  let withDlc = 0;
  const seen = new Set();
  const items = [];
  for (const ped of SRC) {
    const id = ped.model_name;
    if (seen.has(id)) { dupes++; continue; }   // source has a duplicate model_name
    seen.add(id);
    const hasImage = await fileExists(join(imagesDir, `${id}.webp`));
    if (!hasImage) missing++;
    const dlc = dlcFor(id);
    if (dlc) withDlc++;
    items.push({
      id,
      name: id,
      hash: joaat(id),
      category: ped.category,
      dlc,
      props: ped.props,
      components: ped.components,
      url: hasImage ? `${CDN_BASE}/assets/${DOMAIN}/images/${id}.webp` : null,
    });
  }

  if (dupes) log(`  ! skipped ${dupes} duplicate model_name(s) in source.`);
  if (missing) log(`  ! ${missing} ped(s) have no image (url: null).`);
  log(`  dlc: ${withDlc}/${items.length} peds tagged with source DLC (DurtyFree + dlc.labels).`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{model_name}.webp`,
    note: 'Flat catalog keyed by model_name. hash = joaat(model_name). dlc = { id, name, releaseDate } (source update; releaseDate null for patch-day additions).',
    items, log,
  });
}

// Voices domain builder.
//
// GTA ped ambient voice names used with SET_AMBIENT_VOICE_NAME(ped, name).
// id = the voice name; hash = joaat(id). Friendly display names + categories.
// No images. Curated in src/data/voices.json.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'voices';
export const LABEL = 'Voices';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'voices.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.voices.map((v) => ({ id: v.id, name: v.name, hash: joaat(v.id), category: v.category }));

  log(`  ${items.length} voices across ${SRC.categories.length} categories.`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Ped ambient voice names for SET_AMBIENT_VOICE_NAME(ped, name). id = the voice name; hash = joaat(id). No images. category groups under by-category/.',
    items, log,
  });
}

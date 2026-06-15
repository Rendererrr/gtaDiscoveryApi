// Speeches domain builder.
//
// GTA ambient speech names for PLAY_PED_AMBIENT_SPEECH_NATIVE(ped, id, "SPEECH_PARAMS_FORCE", 0)
// (played in the ped's current voice). Distinct, recognizable ambient speeches only, categorized
// by name-prefix theme. id = the speech name; hash = joaat(id). No images.
// Curated in src/data/speeches.json (generated from PedSpeechList.txt).

import { readFile } from 'fs/promises';
import { join } from 'path';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'speeches';
export const LABEL = 'Speeches';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'speeches.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.speeches.map((s) => ({ id: s.id, name: s.name, hash: joaat(s.id), category: s.category }));

  log(`  ${items.length} speeches across ${SRC.categories.length} categories.`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Ambient speech names for PLAY_PED_AMBIENT_SPEECH_NATIVE(ped, id, "SPEECH_PARAMS_FORCE", 0), played in the ped\'s current voice. id = the speech name; hash = joaat(id). No images. category groups under by-category/.',
    items, log,
  });
}

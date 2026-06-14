// Scenarios domain builder.
//
// GTA ped/world scenarios — the string names passed to natives like
// TASK_START_SCENARIO_IN_PLACE / TASK_START_SCENARIO_AT_POSITION. id = the
// scenario string; hash = joaat(id). Categorized by activity type with friendly
// display names. Curated in src/data/scenarios.json. No images.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'scenarios';
export const LABEL = 'Scenarios';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'scenarios.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.scenarios.map((s) => ({ id: s.id, name: s.name, hash: joaat(s.id), category: s.category }));
  log(`  ${items.length} scenarios across ${SRC.categories.length} categories.`);
  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'GTA ped/world scenarios (TASK_START_SCENARIO_IN_PLACE / _AT_POSITION). id = the scenario string; hash = joaat(id). No images. category groups under by-category/; reverse hash -> { id, name, category } in hashes.json.',
    items, log,
  });
}

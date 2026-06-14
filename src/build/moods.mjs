// Facial moods domain builder.
//
// GTA ped facial mood overrides used with SET_FACIAL_IDLE_ANIM_OVERRIDE(ped, id, "").
// id = the mood token string; hash = joaat(id) for reverse lookup. Friendly display
// names, no categories, no images. Curated in src/data/moods.json.

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';

export const DOMAIN = 'moods';
export const LABEL = 'Facial Moods';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'moods.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.moods.map((m) => ({ id: m.id, name: m.name, hash: joaat(m.id) }));

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'Ped facial mood overrides for SET_FACIAL_IDLE_ANIM_OVERRIDE(ped, id, ""). id = the mood token string; hash = joaat(id). Friendly display names, no categories, no images. Reverse hash -> { id, name } in hashes.json.',
  };

  await writeFile(join(domainApi, 'index.json'),
    JSON.stringify({ meta, count: items.length, items }, null, 2), 'utf-8');

  // hash -> { id, name } reverse lookup (folds into the combined api/hashes.json).
  const hashes = {};
  for (const it of items) hashes[it.hash] = { id: it.id, name: it.name };
  await writeFile(join(domainApi, 'hashes.json'),
    JSON.stringify({ meta, count: Object.keys(hashes).length, hashes }, null, 2), 'utf-8');

  log(`  ${items.length} facial moods.`);
  log(`Done ${DOMAIN}: ${items.length} items.`);

  return {
    domain: DOMAIN, label: LABEL,
    itemCount: items.length,
    index: `api/${DOMAIN}/index.json`,
    hashes: `api/${DOMAIN}/hashes.json`,
  };
}

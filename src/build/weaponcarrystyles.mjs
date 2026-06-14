// Weapon carry styles domain builder.
//
// GTA ped weapon carry/holding clipsets used with SET_PED_WEAPON_MOVEMENT_CLIPSET
// (load the clipset first with REQUEST_CLIP_SET). id = the clipset string;
// hash = joaat(id) for reverse lookup. Friendly display names, no categories,
// no images. Curated in src/data/weaponcarrystyles.json.

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';

export const DOMAIN = 'weaponcarrystyles';
export const LABEL = 'Weapon Carry Styles';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'weaponcarrystyles.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.weaponcarrystyles.map((w) => ({ id: w.id, name: w.name, hash: joaat(w.id) }));

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'Ped weapon carry/holding clipsets for SET_PED_WEAPON_MOVEMENT_CLIPSET (load with REQUEST_CLIP_SET first). id = the clipset string; hash = joaat(id). Friendly display names, no categories, no images. Reverse hash -> { id, name } in hashes.json.',
  };

  await writeFile(join(domainApi, 'index.json'),
    JSON.stringify({ meta, count: items.length, items }, null, 2), 'utf-8');

  const hashes = {};
  for (const it of items) hashes[it.hash] = { id: it.id, name: it.name };
  await writeFile(join(domainApi, 'hashes.json'),
    JSON.stringify({ meta, count: Object.keys(hashes).length, hashes }, null, 2), 'utf-8');

  log(`  ${items.length} weapon carry styles.`);
  log(`Done ${DOMAIN}: ${items.length} items.`);

  return {
    domain: DOMAIN, label: LABEL,
    itemCount: items.length,
    index: `api/${DOMAIN}/index.json`,
    hashes: `api/${DOMAIN}/hashes.json`,
  };
}

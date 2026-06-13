// Ped bones domain builder.
//
// GTA ped skeleton bones with bone IDs (boneId — the value used as the bone tag
// with GET_PED_BONE_INDEX). Categorized by body region with friendly display
// names. Curated in src/data/pedbones.json. No images.
//
// boneId is NOT a joaat hash, so it is exposed as its own field (and a boneId ->
// bone reverse map in byid.json) rather than folded into the combined hashes.json.

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { slugify, summariseCategories } from '../lib/catalog.mjs';

export const DOMAIN = 'pedbones';
export const LABEL = 'Ped Bones';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'pedbones.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = SRC.bones.map((b) => ({ id: b.id, name: b.name, boneId: b.boneId, type: b.type, category: b.category }));

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const categories = summariseCategories(items);
  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'Ped skeleton bones. boneId = the bone tag used with GET_PED_BONE_INDEX (not a joaat hash). type = bone kind (Skeleton/Facial/IK/Roll/Physics/Helper). No images. category groups under by-category/; reverse boneId -> bone in byid.json.',
  };

  await writeFile(join(domainApi, 'index.json'),
    JSON.stringify({ meta, categories, count: items.length, items }, null, 2), 'utf-8');

  // boneId -> { id, name, category } reverse lookup.
  const byId = {};
  for (const b of items) byId[b.boneId] = { id: b.id, name: b.name, category: b.category };
  await writeFile(join(domainApi, 'byid.json'),
    JSON.stringify({ meta, count: Object.keys(byId).length, bones: byId }, null, 2), 'utf-8');

  // by-category slices.
  const byCatDir = join(domainApi, 'by-category');
  await mkdir(byCatDir, { recursive: true });
  const listed = [];
  for (const { name } of categories) {
    const slug = slugify(name);
    const gi = items.filter((i) => i.category === name);
    await writeFile(join(byCatDir, `${slug}.json`),
      JSON.stringify({ meta, group: { name, slug, count: gi.length }, count: gi.length, items: gi }, null, 2), 'utf-8');
    listed.push({ name, slug, count: gi.length, path: `api/${DOMAIN}/by-category/${slug}.json` });
  }
  await writeFile(join(byCatDir, 'index.json'),
    JSON.stringify({ meta, count: listed.length, groups: listed }, null, 2), 'utf-8');

  log(`  ${items.length} ped bones across ${categories.length} categories.`);
  log(`Done ${DOMAIN}: ${items.length} items.`);

  return {
    domain: DOMAIN, label: LABEL,
    itemCount: items.length, categoryCount: categories.length,
    index: `api/${DOMAIN}/index.json`,
    byCategory: `api/${DOMAIN}/by-category/index.json`,
    byId: `api/${DOMAIN}/byid.json`,
  };
}

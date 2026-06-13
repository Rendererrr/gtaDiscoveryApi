// Animations domain builder.
//
// Two sources:
//   - src/data/animations.curated.json : a curated subset with friendly names + categories
//     (parsed from InfamousSrc animationList.cpp). Joined as the browsable catalog.
//   - src/data/animations.all.json     : every animation, grouped by dictionary (DurtyFree
//     animDictsCompact.json) — 20k+ dictionaries, 269k+ animations.
//
// An animation is a (dict, anim) pair: REQUEST_ANIM_DICT(dict) then TASK_PLAY_ANIM(dict, anim).
// No images, no joaat hash — identity is the pair.
//
// Because the full list is huge, the domain's index.json holds the CURATED set (with
// categories); the full list is served as:
//   - dictionaries.json : every dictionary name + its animation count
//   - all.json          : every dictionary with its full animation array

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { slugify, summariseCategories } from '../lib/catalog.mjs';

export const DOMAIN = 'animations';
export const LABEL = 'Animations';

const ROOT = join(import.meta.dirname, '..', '..');
const CURATED = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'animations.curated.json'), 'utf-8'));
const ALL = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'animations.all.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const items = CURATED.animations.map((a) => ({
    id: `${a.dict}/${a.anim}`,
    name: a.name,
    dict: a.dict,
    anim: a.anim,
    category: a.category,
    curated: true,
  }));
  items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const categories = summariseCategories(items);
  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'An animation is a (dict, anim) pair: REQUEST_ANIM_DICT(dict) then TASK_PLAY_ANIM(dict, anim). index.json = the CURATED set with friendly names + categories (browse via by-category/). The FULL list lives in dictionaries.json (names + counts) and all.json (every dictionary + animations). No images, no hash.',
  };

  // index.json — curated animations + categories.
  await writeFile(
    join(domainApi, 'index.json'),
    JSON.stringify({ meta, categories, count: items.length, curatedCount: items.length,
      full: { dictionaryCount: ALL.dictionaryCount, animationCount: ALL.animationCount,
        dictionaries: `api/${DOMAIN}/dictionaries.json`, all: `api/${DOMAIN}/all.json` },
      items }, null, 2),
    'utf-8',
  );

  // by-category/<slug>.json for each curated category + index.
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

  // Full list: a lightweight dictionary index (names + counts) and the complete data.
  const dictIndex = ALL.dictionaries
    .map((d) => ({ dict: d.dict, count: d.animations.length }))
    .sort((a, b) => a.dict.localeCompare(b.dict));
  await writeFile(join(domainApi, 'dictionaries.json'),
    JSON.stringify({ meta, count: dictIndex.length, animationCount: ALL.animationCount, dictionaries: dictIndex }), 'utf-8');
  await writeFile(join(domainApi, 'all.json'),
    JSON.stringify({ meta, dictionaryCount: ALL.dictionaryCount, animationCount: ALL.animationCount, dictionaries: ALL.dictionaries }), 'utf-8');

  log(`  curated: ${items.length} animations across ${categories.length} categories.`);
  log(`  full: ${ALL.dictionaryCount} dictionaries, ${ALL.animationCount} animations (dictionaries.json + all.json).`);
  log(`Done ${DOMAIN}: ${items.length} curated items.`);

  return {
    domain: DOMAIN,
    label: LABEL,
    itemCount: items.length,
    categoryCount: categories.length,
    index: `api/${DOMAIN}/index.json`,
    byCategory: `api/${DOMAIN}/by-category/index.json`,
    dictionaries: `api/${DOMAIN}/dictionaries.json`,
    all: `api/${DOMAIN}/all.json`,
  };
}

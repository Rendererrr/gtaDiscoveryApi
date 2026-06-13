// Objects (props) domain builder.
//
// Two sources, joined by model name:
//   - src/data/objects.all.json    : every object name (DurtyFree ObjectList.ini)
//   - src/data/objects.known.json  : a curated subset with display name + category
//     (parsed from InfamousSrc objectList.cpp)
//
// Every object gets hash = joaat(name). Known objects also get a friendly `name`
// and a `category` (and `known: true`); the rest have `name === id`, `category: null`.
//
// Objects have no images, so items carry no `url`. The catalog is large (~21.6k),
// so index.json is written compact; per-category slices are pre-generated for the
// curated categories (unknown objects are reachable via index.json / search).

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';
import { slugify, summariseCategories } from '../lib/catalog.mjs';

export const DOMAIN = 'objects';
export const LABEL = 'Objects';

const ROOT = join(import.meta.dirname, '..', '..');
const ALL = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'objects.all.json'), 'utf-8'));
const KNOWN = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'objects.known.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  // model (lowercased) -> { name, category }
  const knownByModel = new Map(KNOWN.objects.map((o) => [o.model.toLowerCase(), o]));

  // Union: every ini name, plus any known model missing from the ini.
  const names = [...ALL.models];
  const haveLower = new Set(names.map((n) => n.toLowerCase()));
  for (const o of KNOWN.objects) {
    if (!haveLower.has(o.model.toLowerCase())) { names.push(o.model); haveLower.add(o.model.toLowerCase()); }
  }

  let knownCount = 0;
  const items = names.map((id) => {
    const k = knownByModel.get(id.toLowerCase());
    if (k) knownCount++;
    return {
      id,
      name: k?.name ?? id,
      hash: joaat(id),
      category: k?.category ?? null,
      known: !!k,
    };
  });
  items.sort((a, b) => a.id.localeCompare(b.id));

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  // Categories cover only the curated (known) objects.
  const categories = summariseCategories(items.filter((i) => i.category));
  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'Flat catalog of GTA object/prop models. hash = joaat(id). Curated objects carry a display `name` + `category` (known: true); the rest have name === id and category: null. No images. index.json is compact due to size; per-category slices live under by-category/.',
  };

  // index.json — every object (compact: this domain is ~21.6k items).
  await writeFile(
    join(domainApi, 'index.json'),
    JSON.stringify({ meta, categories, count: items.length, knownCount, items }),
    'utf-8',
  );

  // hashes.json — joaat -> { id, name, category }
  const hashes = {};
  for (const it of items) hashes[it.hash] = { id: it.id, name: it.name, category: it.category };
  await writeFile(
    join(domainApi, 'hashes.json'),
    JSON.stringify({ meta, count: Object.keys(hashes).length, hashes }),
    'utf-8',
  );

  // by-category/<slug>.json for each curated category, + an index of the groups.
  const byCatDir = join(domainApi, 'by-category');
  await mkdir(byCatDir, { recursive: true });
  const listed = [];
  for (const { name } of categories) {
    const slug = slugify(name);
    const gi = items.filter((i) => i.category === name);
    await writeFile(
      join(byCatDir, `${slug}.json`),
      JSON.stringify({ meta, group: { name, slug, count: gi.length }, count: gi.length, items: gi }),
      'utf-8',
    );
    listed.push({ name, slug, count: gi.length, path: `api/${DOMAIN}/by-category/${slug}.json` });
  }
  await writeFile(
    join(byCatDir, 'index.json'),
    JSON.stringify({ meta, count: listed.length, groups: listed }, null, 2),
    'utf-8',
  );

  log(`  ${items.length} objects (${knownCount} curated) across ${categories.length} categories.`);
  log(`  by-category: ${listed.length} groups written.`);
  log(`Done ${DOMAIN}: ${items.length} items, ${Object.keys(hashes).length} hashed.`);

  return {
    domain: DOMAIN,
    label: LABEL,
    itemCount: items.length,
    categoryCount: categories.length,
    index: `api/${DOMAIN}/index.json`,
    hashes: `api/${DOMAIN}/hashes.json`,
    byCategory: `api/${DOMAIN}/by-category/index.json`,
  };
}

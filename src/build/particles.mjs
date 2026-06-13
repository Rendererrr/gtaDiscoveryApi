// Particles (PTFX) domain builder.
//
// Two sources, joined by dict + effect:
//   - src/data/particles.all.json      : every effect, grouped by dictionary (DurtyFree)
//   - src/data/particles.curated.json  : a curated subset with friendly names
//
// A particle is used in-game as a (dictionary, effect) pair: REQUEST_NAMED_PTFX_ASSET(dict)
// then START_PARTICLE_FX_*(effect). So there is no joaat hash here — identity is the pair,
// and the `category` is the dictionary (the asset you load). Curated effects get a friendly
// `name` + curated: true; the rest have name === effect.

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';
import { slugify, summariseCategories } from '../lib/catalog.mjs';

export const DOMAIN = 'particles';
export const LABEL = 'Particles';

const ROOT = join(import.meta.dirname, '..', '..');
const ALL = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'particles.all.json'), 'utf-8'));
const CURATED = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'particles.curated.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  // "dict|effect" (lowercased) -> friendly name
  const curatedByKey = new Map(CURATED.particles.map((p) => [`${p.dict}|${p.effect}`.toLowerCase(), p.name]));

  let curatedCount = 0;
  const items = [];
  for (const d of ALL.dictionaries) {
    for (const effect of d.effects) {
      const name = curatedByKey.get(`${d.dict}|${effect}`.toLowerCase());
      if (name) curatedCount++;
      items.push({
        id: `${d.dict}/${effect}`,
        name: name ?? effect,
        dict: d.dict,
        effect,
        category: d.dict,        // the dictionary is the natural grouping / "category"
        curated: !!name,
      });
    }
  }
  items.sort((a, b) => a.id.localeCompare(b.id));

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const categories = summariseCategories(items); // one per dictionary
  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'Flat catalog of particle (PTFX) effects. A particle is a (dict, effect) pair: REQUEST_NAMED_PTFX_ASSET(dict) then START_PARTICLE_FX_*(effect). category = dictionary. Curated effects carry a friendly name (curated: true); the rest have name === effect. No images, no hash. index.json is compact; per-dictionary slices live under by-category/.',
  };

  // index.json — every effect (compact: ~2.9k items).
  await writeFile(
    join(domainApi, 'index.json'),
    JSON.stringify({ meta, categories, count: items.length, curatedCount, dictionaryCount: categories.length, items }),
    'utf-8',
  );

  // by-category/<dict-slug>.json + an index listing every dictionary (= "list all categories").
  const byCatDir = join(domainApi, 'by-category');
  await mkdir(byCatDir, { recursive: true });
  const seenSlug = new Map();
  const listed = [];
  for (const { name } of categories) {
    let slug = slugify(name);
    if (seenSlug.has(slug)) { slug = `${slug}-${seenSlug.get(slug)}`; }   // guard rare slug collisions
    seenSlug.set(slugify(name), (seenSlug.get(slugify(name)) ?? 0) + 1);
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

  log(`  ${items.length} particle effects (${curatedCount} curated) across ${categories.length} dictionaries.`);
  log(`  by-category: ${listed.length} dictionaries written.`);
  log(`Done ${DOMAIN}: ${items.length} items.`);

  return {
    domain: DOMAIN,
    label: LABEL,
    itemCount: items.length,
    categoryCount: categories.length,
    index: `api/${DOMAIN}/index.json`,
    byCategory: `api/${DOMAIN}/by-category/index.json`,
  };
}

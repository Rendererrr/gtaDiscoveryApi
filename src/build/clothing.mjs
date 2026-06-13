// Clothing domain builder.
//
// Scans assets/clothing/<category>/... and writes the clothing slice of the API:
//   api/clothing/index.json              -> catalog of components for this domain
//   api/clothing/<type>/<componentId>.json
//   api/clothing/manifest.json           -> every component in one file
//
// On-disk layout:
//   gendered:  assets/clothing/<category>/<gender>/<drawableId>/<textureId>.webp
//   no-gender: assets/clothing/<category>/<drawableId>/<textureId>.webp  (+ a `.no-genders` marker)

import { readdir, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE, baseMeta } from '../config.mjs';
import { isDir, readDrawables } from '../lib/fs.mjs';

export const DOMAIN = 'clothing';
export const LABEL = 'Clothing';

// Maps an on-disk asset folder name to its GTA component metadata.
// type "clothes" => SetPedComponentVariation, type "props" => SetPedPropIndex.
// Add new folders here as the clothing dataset grows.
const CATEGORY_MAP = {
  // --- Clothes (component variation) ---
  head:        { type: 'clothes', componentId: 0,  label: 'Head' },
  masks:       { type: 'clothes', componentId: 1,  label: 'Masks' },
  hair:        { type: 'clothes', componentId: 2,  label: 'Hair Styles' },
  torsos:      { type: 'clothes', componentId: 3,  label: 'Torsos' },
  legs:        { type: 'clothes', componentId: 4,  label: 'Legs' },
  bags:        { type: 'clothes', componentId: 5,  label: 'Bags & Parachutes' },
  shoes:       { type: 'clothes', componentId: 6,  label: 'Shoes' },
  accessories: { type: 'clothes', componentId: 7,  label: 'Accessories' },
  undershirts: { type: 'clothes', componentId: 8,  label: 'Undershirts' },
  armor:       { type: 'clothes', componentId: 9,  label: 'Body Armor' },
  decals:      { type: 'clothes', componentId: 10, label: 'Decals' },
  tops:        { type: 'clothes', componentId: 11, label: 'Tops' },
  // --- Props ---
  hats:        { type: 'props',   componentId: 0,  label: 'Hats' },
  glasses:     { type: 'props',   componentId: 1,  label: 'Glasses' },
  ears:        { type: 'props',   componentId: 2,  label: 'Ears' },
  watches:     { type: 'props',   componentId: 6,  label: 'Watches' },
  bracelets:   { type: 'props',   componentId: 7,  label: 'Bracelets' },
};

// Builds the clothing domain. Returns a descriptor for the root api/index.json.
export async function build({ assetsDir, apiDir, log = console.log }) {
  const domainAssets = join(assetsDir, DOMAIN);
  const domainApi = join(apiDir, DOMAIN);

  await rm(domainApi, { recursive: true, force: true });
  await mkdir(join(domainApi, 'clothes'), { recursive: true });
  await mkdir(join(domainApi, 'props'), { recursive: true });

  const catalog = [];                            // light entries for index.json
  const fullByType = { clothes: {}, props: {} }; // for manifest.json
  let domainDrawables = 0;
  let domainTextures = 0;

  const categoryFolders = (await readdir(domainAssets)).sort();

  for (const category of categoryFolders) {
    const categoryDir = join(domainAssets, category);
    if (!(await isDir(categoryDir))) continue;

    const meta = CATEGORY_MAP[category];
    if (!meta) {
      log(`! Skipping "${category}": no entry in CATEGORY_MAP. Add one to include it.`);
      continue;
    }

    const entries = await readdir(categoryDir);
    const gendered = !entries.includes('.no-genders');

    const component = {
      domain: DOMAIN,
      type: meta.type,
      componentId: meta.componentId,
      category,
      label: meta.label,
      gendered,
    };

    let totalDrawables = 0;
    let totalTextures = 0;

    if (gendered) {
      const genders = entries.filter((e) => !e.startsWith('.'));
      component.genders = {};
      for (const gender of genders) {
        const { drawables, drawableCount, textureTotal } = await readDrawables(
          join(categoryDir, gender),
          `assets/${DOMAIN}/${category}/${gender}`,
          CDN_BASE,
        );
        component.genders[gender] = { drawableCount, textureCount: textureTotal, drawables };
        totalDrawables += drawableCount;
        totalTextures += textureTotal;
      }
    } else {
      const { drawables, drawableCount, textureTotal } = await readDrawables(
        categoryDir,
        `assets/${DOMAIN}/${category}`,
        CDN_BASE,
      );
      component.drawableCount = drawableCount;
      component.textureCount = textureTotal;
      component.drawables = drawables;
      totalDrawables += drawableCount;
      totalTextures += textureTotal;
    }

    const outPath = join(domainApi, meta.type, `${meta.componentId}.json`);
    await writeFile(outPath, JSON.stringify(component, null, 2), 'utf-8');

    fullByType[meta.type][meta.componentId] = component;

    catalog.push({
      type: meta.type,
      componentId: meta.componentId,
      category,
      label: meta.label,
      gendered,
      genders: gendered ? Object.keys(component.genders) : [],
      drawableCount: totalDrawables,
      textureCount: totalTextures,
      endpoint: `api/${DOMAIN}/${meta.type}/${meta.componentId}.json`,
    });

    domainDrawables += totalDrawables;
    domainTextures += totalTextures;

    log(`  ✓ ${meta.type}/${meta.componentId} ${category} — ${totalDrawables} drawables, ${totalTextures} textures`);
  }

  catalog.sort((a, b) => (a.type < b.type ? -1 : a.type > b.type ? 1 : a.componentId - b.componentId));

  const meta = {
    ...baseMeta(),
    domain: DOMAIN,
    label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/{category}/[{gender}/]{drawableId}/{textureId}.webp`,
    note: 'Look up category from componentId+type via this index, then build the image URL or read the per-component endpoint.',
  };

  await writeFile(join(domainApi, 'index.json'),
    JSON.stringify({ meta, components: catalog }, null, 2), 'utf-8');
  await writeFile(join(domainApi, 'manifest.json'),
    JSON.stringify({ meta, ...fullByType }, null, 2), 'utf-8');

  log(`Done ${DOMAIN}: ${catalog.length} components, ${domainDrawables} drawables, ${domainTextures} textures.`);

  // Descriptor for the top-level discovery index.
  return {
    domain: DOMAIN,
    label: LABEL,
    componentCount: catalog.length,
    drawableCount: domainDrawables,
    textureCount: domainTextures,
    index: `api/${DOMAIN}/index.json`,
    manifest: `api/${DOMAIN}/manifest.json`,
  };
}

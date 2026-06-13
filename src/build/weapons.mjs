// Weapons domain builder.
//
// Flat catalog: one icon per weapon. The archive ships only PNG icons (display
// names), no metadata — so we match each icon to src/data/weapons.json (a curated
// codename + category reference) and compute hash = joaat(codename).
//
// Images: assets/weapons/images/<File>-icon.png
// Match:  icon stem (without `-icon.png`, lowercased) === entry.file (lowercased)
// Unmatched icon -> name from filename, codename/hash null, category "Misc".

import { readFile } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain, listImages } from '../lib/catalog.mjs';

export const DOMAIN = 'weapons';
export const LABEL = 'Weapons';

const ROOT = join(import.meta.dirname, '..', '..');
const REF = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'weapons.json'), 'utf-8'));

// stem -> reference entry
const BY_FILE = new Map(REF.weapons.map((w) => [w.file.toLowerCase(), w]));

const stemOf = (filename) => filename.replace(/-icon\.png$/i, '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
// Strip the weapon_/gadget_ prefix for a friendly id.
const idFromCodename = (cn) => cn.replace(/^(weapon|gadget)_/, '');

export async function build({ assetsDir, apiDir, log = console.log }) {
  const imagesDir = join(assetsDir, DOMAIN, 'images');
  const files = await listImages(imagesDir, 'png');

  let matched = 0;
  const unmatched = [];
  const items = [];

  for (const file of files) {
    const stem = stemOf(file);
    const ref = BY_FILE.get(stem.toLowerCase());
    const url = `${CDN_BASE}/assets/${DOMAIN}/images/${file}`;

    if (ref && ref.codename) {
      matched++;
      items.push({
        id: idFromCodename(ref.codename),
        name: ref.name,
        codename: ref.codename,
        hash: joaat(ref.codename),
        category: ref.category,
        url,
      });
    } else {
      // Known-but-codenameless (e.g. Acid Package), or no reference entry at all.
      if (!ref) unmatched.push(stem);
      items.push({
        id: slug(stem),
        name: ref?.name ?? titleCase(stem),
        codename: null,
        hash: null,
        category: ref?.category ?? 'Misc',
        url,
      });
    }
  }

  log(`  matched ${matched}/${files.length} icons to canonical codenames.`);
  if (unmatched.length) log(`  ! no reference entry for: ${unmatched.join(', ')}`);

  items.sort((a, b) => a.name.localeCompare(b.name));

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{File}-icon.png`,
    note: 'Flat catalog. hash = joaat(codename); null when the internal codename is unknown.',
    items, log,
  });
}

// Weapons domain builder.
//
// Flat catalog: one icon per weapon. The archive ships only PNG icons (display
// names), no metadata — so we match each icon to src/data/weapons.json (a curated
// codename + category reference) and compute hash = joaat(codename).
//
// Stats + components are left-joined from src/data/weapons.stats.json (a snapshot
// of vespura.com/fivem/weapons/weapons.json) by SpawnName === codename.
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
const STATS = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'weapons.stats.json'), 'utf-8'));
// Supplementary stats (gtabase) for newer guns missing from the vespura snapshot.
const EXTRA = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'weapons.stats.extra.json'), 'utf-8')).stats;
const EXTRA_BY_CODE = new Map(Object.entries(EXTRA).map(([cn, s]) => [cn.toLowerCase(), { ...s, maxAmmo: null }]));
// Components + tints from DurtyFree (superset of the vespura component coverage,
// plus tints for every weapon). Keyed by uppercase codename.
const COMP = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'weapons.components.json'), 'utf-8')).weapons;
const COMP_BY_CODE = new Map(Object.entries(COMP).map(([cn, v]) => [cn.toUpperCase(), v]));
// Internal DLC code -> friendly marketing name.
const DLC_LABELS = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'dlc.labels.json'), 'utf-8')).labels;

// stem -> reference entry
const BY_FILE = new Map(REF.weapons.map((w) => [w.file.toLowerCase(), w]));

// codename (lowercased) -> { stats, components } from the vespura snapshot.
const BY_SPAWN = new Map(STATS.map((w) => {
  const stats = {
    damage: w.Damage,
    fireRate: w.Speed,        // vespura's "Speed" is the weapon-wheel Rate of fire bar
    accuracy: w.Accuracy,
    range: w.Range,
    maxAmmo: w.GetMaxAmmo,
  };
  const components = Object.entries(w.Components || {}).map(([id, c]) => ({
    id,
    label: c.Key,
    hash: c.Value,
  }));
  return [String(w.SpawnName).toLowerCase(), { stats, components }];
}));

const stemOf = (filename) => filename.replace(/-icon\.png$/i, '');
const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const titleCase = (s) => s.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
// Strip the weapon_/gadget_ prefix for a friendly id.
const idFromCodename = (cn) => cn.replace(/^(weapon|gadget)_/, '');

export async function build({ assetsDir, apiDir, log = console.log }) {
  const imagesDir = join(assetsDir, DOMAIN, 'images');
  const files = await listImages(imagesDir, 'png');

  let matched = 0;
  let withStats = 0;
  let withComponents = 0;
  let withTints = 0;
  let withDlc = 0;
  const unmatched = [];
  const items = [];

  for (const file of files) {
    const stem = stemOf(file);
    const ref = BY_FILE.get(stem.toLowerCase());
    const url = `${CDN_BASE}/assets/${DOMAIN}/images/${file}`;

    if (ref && ref.codename) {
      matched++;
      const ves = BY_SPAWN.get(ref.codename.toLowerCase());
      // vespura stats first; fall back to the gtabase supplement for newer guns.
      const stats = ves?.stats ?? EXTRA_BY_CODE.get(ref.codename.toLowerCase()) ?? null;
      if (stats) withStats++;
      // DurtyFree components (superset) preferred; vespura's as fallback. Tints from DurtyFree.
      const df = COMP_BY_CODE.get(ref.codename.toUpperCase());
      const components = df?.components?.length ? df.components : (ves?.components ?? []);
      const tints = df?.tints ?? [];
      const dlc = df?.dlc ? { id: df.dlc, name: DLC_LABELS[df.dlc] ?? df.dlc } : null;
      if (components.length) withComponents++;
      if (tints.length) withTints++;
      if (dlc) withDlc++;
      items.push({
        id: idFromCodename(ref.codename),
        name: ref.name,
        codename: ref.codename,
        hash: joaat(ref.codename),
        category: ref.category,
        url,
        dlc,
        stats,
        components,
        tints,
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
        dlc: null,
        stats: null,
        components: [],
        tints: [],
      });
    }
  }

  log(`  matched ${matched}/${files.length} icons to canonical codenames.`);
  log(`  stats: ${withStats}/${files.length} weapons have stats (vespura + gtabase); remaining are melee/gadget with no weapon-wheel stats.`);
  log(`  components: ${withComponents}/${files.length}, tints: ${withTints}/${files.length}, dlc: ${withDlc}/${files.length} (DurtyFree).`);
  if (unmatched.length) log(`  ! no reference entry for: ${unmatched.join(', ')}`);

  items.sort((a, b) => a.name.localeCompare(b.name));

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{File}-icon.png`,
    note: 'Flat catalog. hash = joaat(codename). dlc = { id, name } (source DLC; null when unknown). stats are 0-100 weapon-wheel values (damage, fireRate, accuracy, range) + maxAmmo; null when unavailable. components[] = { id, label, hash, default }; tints[] = { index, label }.',
    items, log,
  });
}

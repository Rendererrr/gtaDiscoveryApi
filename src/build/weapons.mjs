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
// Shop "WT_*" token per weapon codename (Ammu-Nation purchase). Absent => not purchasable.
const WT = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'weapons.wt.json'), 'utf-8')).wt;

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
      const dlc = df?.dlc
        ? { id: df.dlc, name: DLC_LABELS[df.dlc]?.name ?? df.dlc, releaseDate: DLC_LABELS[df.dlc]?.releaseDate ?? null }
        : null;
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
        wt: WT[ref.codename.toLowerCase()] ?? null,
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
        wt: null,
        components: [],
        tints: [],
      });
    }
  }

  log(`  matched ${matched}/${files.length} icons to canonical codenames.`);
  log(`  stats: ${withStats}/${files.length} weapons have stats (vespura + gtabase); remaining are melee/gadget with no weapon-wheel stats.`);
  log(`  components: ${withComponents}/${files.length}, tints: ${withTints}/${files.length}, dlc: ${withDlc}/${files.length} (DurtyFree).`);
  if (unmatched.length) log(`  ! no reference entry for: ${unmatched.join(', ')}`);

  // --- Expansion: ownable weapons in the DurtyFree dump that ship no icon. The flat catalog is
  // icon-driven, so a weapon with no art is otherwise dropped entirely. We append the remaining
  // *ownable* ones (url=null) so the API covers the full hand-held weapon set, excluding classes that
  // are not buyable/holdable player weapons: vehicle weapons (their own `vehicleweapons` domain),
  // animals, environmental damage sources, and world objects. Category is derived from the codename.
  const EXCLUDE = new Set([
    'WEAPON_ANIMAL', 'WEAPON_ANIMAL_RETRIEVER', 'WEAPON_SMALL_DOG', 'WEAPON_TIGER_SHARK',
    'WEAPON_HAMMERHEAD_SHARK', 'WEAPON_KILLER_WHALE', 'WEAPON_BOAR', 'WEAPON_PIG', 'WEAPON_COYOTE',
    'WEAPON_DEER', 'WEAPON_HEN', 'WEAPON_RABBIT', 'WEAPON_CAT', 'WEAPON_COW', 'WEAPON_BIRD_CRAP',
    'WEAPON_COUGAR', 'WEAPON_DROWNING', 'WEAPON_DROWNING_IN_VEHICLE', 'WEAPON_BLEEDING',
    'WEAPON_ELECTRIC_FENCE', 'WEAPON_EXPLOSION', 'WEAPON_FALL', 'WEAPON_EXHAUSTION',
    'WEAPON_HIT_BY_WATER_CANNON', 'WEAPON_RAMMED_BY_CAR', 'WEAPON_RUN_OVER_BY_CAR', 'WEAPON_HELI_CRASH',
    'WEAPON_FIRE', 'WEAPON_BARBED_WIRE', 'WEAPON_PASSENGER_ROCKET', 'WEAPON_AIRSTRIKE_ROCKET',
    'WEAPON_VEHICLE_ROCKET', 'WEAPON_AIR_DEFENCE_GUN', 'WEAPON_ARENA_MACHINE_GUN',
    'WEAPON_ARENA_HOMING_MISSILE', 'OBJECT', 'GADGET_NIGHTVISION', 'WEAPON_DIGISCANNER',
  ]);
  const catFor = (cn) => {
    if (/SNIPER/.test(cn)) return 'Sniper';
    if (/SHOTGUN/.test(cn)) return 'Shotgun';
    if (/(RPG|LAUNCHER|RAILGUN|MINIGUN|HOMING|FIREWORK|STINGER|EMPLAUNCHER)/.test(cn)) return 'Heavy';
    if (/(SMG|MACHINEPISTOL)/.test(cn)) return 'SMG';
    if (/(RIFLE|CARBINE)/.test(cn)) return 'Rifle';
    if (/(PISTOL|REVOLVER|TRANQUILIZER)/.test(cn)) return 'Handgun';
    if (/(COMBATMG|^WEAPON_MG$)/.test(cn)) return 'MG';
    if (/(GRENADE|MOLOTOV|STICKY|PROXMINE|PIPEBOMB|SNOWBALL|FLARE|BALL)/.test(cn)) return 'Thrown';
    if (/(KNIFE|BAT|HAMMER|CROWBAR|MACHETE|HATCHET|DAGGER|KNUCKLE|BOTTLE|GOLFCLUB|POOLCUE|WRENCH|BATTLEAXE|SWITCHBLADE|NIGHTSTICK|STONE)/.test(cn)) return 'Melee';
    return 'Misc';
  };
  // Friendly display names for the icon-less additions (titleCase of the codename is unreadable for
  // these). Anything not listed falls back to the title-cased codename.
  const NAME_OVERRIDES = {
    weapon_railgunxm3: 'Railgun XM3',
    weapon_remotesniper: 'Remote Sniper',
    weapon_grenadelauncher_smoke: 'Tear Gas Launcher',
    weapon_stinger: 'Stinger',
    weapon_stungun_mp: 'Stun Gun (MP)',
    weapon_tranquilizer: 'Tranquilizer',
    weapon_fertilizercan: 'Fertilizer Can',
    weapon_hazardcan: 'Hazardous Jerry Can',
    weapon_fireextinguisher: 'Fire Extinguisher',
    weapon_garbagebag: 'Garbage Bag',
    weapon_hackingdevice: 'Hacking Device',
    weapon_handcuffs: 'Handcuffs',
    weapon_metaldetector: 'Metal Detector',
    weapon_newspaper: 'Newspaper',
    weapon_briefcase: 'Briefcase',
    weapon_briefcase_02: 'Briefcase 2',
    weapon_briefcase_03: 'Briefcase 3',
  };
  const have = new Set(items.map((it) => (it.codename || '').toUpperCase()).filter(Boolean));
  let expanded = 0;
  for (const cnUpper of Object.keys(COMP)) {
    if (have.has(cnUpper) || EXCLUDE.has(cnUpper) || cnUpper.startsWith('VEHICLE_WEAPON_')) continue;
    const codename = cnUpper.toLowerCase();
    const ves = BY_SPAWN.get(codename);
    const stats = ves?.stats ?? EXTRA_BY_CODE.get(codename) ?? null;
    const df = COMP_BY_CODE.get(cnUpper);
    const components = df?.components?.length ? df.components : (ves?.components ?? []);
    const tints = df?.tints ?? [];
    const dlc = df?.dlc
      ? { id: df.dlc, name: DLC_LABELS[df.dlc]?.name ?? df.dlc, releaseDate: DLC_LABELS[df.dlc]?.releaseDate ?? null }
      : null;
    if (stats) withStats++;
    if (components.length) withComponents++;
    if (tints.length) withTints++;
    if (dlc) withDlc++;
    items.push({
      id: idFromCodename(codename),
      name: NAME_OVERRIDES[codename] ?? titleCase(idFromCodename(codename)),
      codename,
      hash: joaat(codename),
      category: catFor(cnUpper),
      url: null,
      dlc,
      stats,
      wt: WT[codename] ?? null,
      components,
      tints,
    });
    expanded++;
  }
  log(`  expansion: +${expanded} ownable weapons from DurtyFree without icons (url=null); total ${items.length}.`);

  items.sort((a, b) => a.name.localeCompare(b.name));

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{File}-icon.png`,
    note: 'Flat catalog. hash = joaat(codename). dlc = { id, name, releaseDate } (source DLC; null when unknown). stats are 0-100 weapon-wheel values (damage, fireRate, accuracy, range) + maxAmmo; null when unavailable. wt = Ammu-Nation shop token (build transaction WP_<wt>_t{t}_v{v}); null = not purchasable. components[] = { id, label, hash, default }; tints[] = { index, label }.',
    items, log,
  });
}

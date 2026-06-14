// Explosions domain builder.
//
// GTA explosion types from DurtyFree explosionTypesCompact.json, curated in
// src/data/explosions.json with friendly names + categories. No images.
//
// Each item: { index, id, name, category, tag, hash, type }
//   - hash = joaat(tag): the stable, cross-version identifier (use this in scripts).
//   - index = catalog position (0-based); NOT the in-game ADD_EXPLOSION enum integer.
//   - type = the in-game ADD_EXPLOSION explosionType enum integer (GRENADE=0, ...); -1 when
//            the tag has no known enum value (a handful of newest vehicle-cannon explosions).

import { readFile } from 'fs/promises';
import { join } from 'path';
import { writeFlatDomain } from '../lib/catalog.mjs';

export const DOMAIN = 'explosions';
export const LABEL = 'Explosions';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'explosions.json'), 'utf-8'));

// eExplosionTag -> ADD_EXPLOSION explosionType integer (DONTCARE=-1, GRENADE=0, ...).
// Source: citizenfx/natives FIRE/AddExplosion.md eExplosionTag enum (value = listed slot - 1).
// Tags absent here (newest DLC vehicle cannons) get -1 and are not fireable via ADD_EXPLOSION.
const TAG_TO_TYPE = {
  EXP_TAG_GRENADE: 0, EXP_TAG_GRENADELAUNCHER: 1, EXP_TAG_STICKYBOMB: 2, EXP_TAG_MOLOTOV: 3,
  EXP_TAG_ROCKET: 4, EXP_TAG_TANKSHELL: 5, EXP_TAG_HI_OCTANE: 6, EXP_TAG_CAR: 7, EXP_TAG_PLANE: 8,
  EXP_TAG_PETROL_PUMP: 9, EXP_TAG_BIKE: 10, EXP_TAG_DIR_STEAM: 11, EXP_TAG_DIR_FLAME: 12,
  EXP_TAG_DIR_WATER_HYDRANT: 13, EXP_TAG_DIR_GAS_CANISTER: 14, EXP_TAG_BOAT: 15, EXP_TAG_SHIP_DESTROY: 16,
  EXP_TAG_TRUCK: 17, EXP_TAG_BULLET: 18, EXP_TAG_SMOKEGRENADELAUNCHER: 19, EXP_TAG_SMOKEGRENADE: 20,
  EXP_TAG_BZGAS: 21, EXP_TAG_FLARE: 22, EXP_TAG_GAS_CANISTER: 23, EXP_TAG_EXTINGUISHER: 24,
  EXP_TAG_PROGRAMMABLEAR: 25, EXP_TAG_TRAIN: 26, EXP_TAG_BARREL: 27, EXP_TAG_PROPANE: 28, EXP_TAG_BLIMP: 29,
  EXP_TAG_DIR_FLAME_EXPLODE: 30, EXP_TAG_TANKER: 31, EXP_TAG_PLANE_ROCKET: 32, EXP_TAG_VEHICLE_BULLET: 33,
  EXP_TAG_GAS_TANK: 34, EXP_TAG_BIRD_CRAP: 35, EXP_TAG_RAILGUN: 36, EXP_TAG_BLIMP2: 37, EXP_TAG_FIREWORK: 38,
  EXP_TAG_SNOWBALL: 39, EXP_TAG_PROXMINE: 40, EXP_TAG_VALKYRIE_CANNON: 41, EXP_TAG_AIR_DEFENCE: 42,
  EXP_TAG_PIPEBOMB: 43, EXP_TAG_VEHICLEMINE: 44, EXP_TAG_EXPLOSIVEAMMO: 45, EXP_TAG_APCSHELL: 46,
  EXP_TAG_BOMB_CLUSTER: 47, EXP_TAG_BOMB_GAS: 48, EXP_TAG_BOMB_INCENDIARY: 49, EXP_TAG_BOMB_STANDARD: 50,
  EXP_TAG_TORPEDO: 51, EXP_TAG_TORPEDO_UNDERWATER: 52, EXP_TAG_BOMBUSHKA_CANNON: 53,
  EXP_TAG_BOMB_CLUSTER_SECONDARY: 54, EXP_TAG_HUNTER_BARRAGE: 55, EXP_TAG_HUNTER_CANNON: 56,
  EXP_TAG_ROGUE_CANNON: 57, EXP_TAG_MINE_UNDERWATER: 58, EXP_TAG_ORBITAL_CANNON: 59,
  EXP_TAG_BOMB_STANDARD_WIDE: 60, EXP_TAG_EXPLOSIVEAMMO_SHOTGUN: 61, EXP_TAG_OPPRESSOR2_CANNON: 62,
  EXP_TAG_MORTAR_KINETIC: 63, EXP_TAG_VEHICLEMINE_KINETIC: 64, EXP_TAG_VEHICLEMINE_EMP: 65,
  EXP_TAG_VEHICLEMINE_SPIKE: 66, EXP_TAG_VEHICLEMINE_SLICK: 67, EXP_TAG_VEHICLEMINE_TAR: 68,
  EXP_TAG_SCRIPT_DRONE: 69, EXP_TAG_RAYGUN: 70, EXP_TAG_BURIEDMINE: 71, EXP_TAG_SCRIPT_MISSILE: 72,
  EXP_TAG_RCTANK_ROCKET: 73, EXP_TAG_BOMB_WATER: 74, EXP_TAG_BOMB_WATER_SECONDARY: 75,
  EXP_TAG_SCRIPT_MISSILE_LARGE: 81, EXP_TAG_SUBMARINE_BIG: 82, EXP_TAG_EMPLAUNCHER_EMP: 83,
};

export async function build({ apiDir, log = console.log }) {
  const items = SRC.explosions.map((e) => ({
    index: e.index,
    id: e.id,
    name: e.name,
    category: e.category,
    tag: e.tag,
    hash: e.hash,
    type: TAG_TO_TYPE[e.tag] ?? -1,
  }));

  const fireable = items.filter((it) => it.type >= 0).length;
  log(`  ${items.length} explosion types across ${SRC.categories.length} categories (${fireable} with ADD_EXPLOSION enum).`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: null,
    note: 'Explosion types (no images). hash = joaat(tag) — the stable identifier to use in scripts. type = the in-game ADD_EXPLOSION explosionType enum integer (GRENADE=0, ...), -1 when unknown. index = catalog position, NOT the enum. category groups are under by-category/.',
    items, log,
  });
}

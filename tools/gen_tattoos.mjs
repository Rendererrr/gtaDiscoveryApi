// One-off: convert project-native-gui's spooner_tattoo_data.hpp (g_tats[]) into
// src/data/tattoos.json (type 0 = tattoos only; badges (type 1) stay in-menu).
// Run from the gtaDiscoveryApi repo root: node tools/gen_tattoos.mjs
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';

const HPP = 'C:/Users/navjo/Documents/GitHub/project-native-gui/src/spooner/spooner_tattoo_data.hpp';
const OUT = join(import.meta.dirname, '..', 'src', 'data', 'tattoos.json');

const ZONES = ['Torso', 'Back', 'Left Arm', 'Right Arm', 'Left Leg', 'Right Leg', 'Neck', 'Head'];

const text = await readFile(HPP, 'utf-8');
// { 0xMODEL , type , zone , "coll" , "overlay" , "caption" }
const re = /\{\s*(0x[0-9a-fA-F]+)\s*,\s*(\d+)\s*,\s*(-?\d+)\s*,\s*"([^"]*)"\s*,\s*"([^"]*)"\s*,\s*"((?:[^"\\]|\\.)*)"\s*\}/g;

const tattoos = [];
const catsSeen = new Set();
let m;
while ((m = re.exec(text)) !== null) {
  const model = parseInt(m[1], 16) >>> 0;
  const type = parseInt(m[2], 10);
  const zone = parseInt(m[3], 10);
  const coll = m[4];
  const overlay = m[5];
  const cap = m[6].replace(/\\"/g, '"');
  if (type !== 0) continue; // tattoos only
  const category = (zone >= 0 && zone < ZONES.length) ? ZONES[zone] : 'Other';
  catsSeen.add(category);
  tattoos.push({ id: overlay, collection: coll, name: cap || overlay, category, model, zone });
}

// categories ordered by ZONES order, only those present
const categories = ZONES.filter((z) => catsSeen.has(z));
if (catsSeen.has('Other')) categories.push('Other');

const out = {
  note: 'GTA ped tattoos (decorations, TYPE_TATTOO) from MenyooSP PedDecalOverlays.xml. Applied with ADD_PED_DECORATION_FROM_HASHES(ped, joaat(collection), joaat(id)). model = the ped model hash this overlay belongs to (filter by selected ped). category = body zone. No images. Badges (TYPE_BADGE) are not included.',
  source: 'MenyooSP PedDecalOverlays.xml (via project spooner_tattoo_data.hpp).',
  categories,
  tattoos,
};
await writeFile(OUT, JSON.stringify(out, null, 2), 'utf-8');
console.log(`Wrote ${tattoos.length} tattoos across ${categories.length} categories -> ${OUT}`);

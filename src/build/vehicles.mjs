// Vehicles domain builder.
//
// Flat catalog: one image per vehicle model, keyed by model_name.
// Source metadata: src/data/vehicles.json (model_name, display_name, hash, category).
// Performance stats left-joined from src/data/vehicles.handling.json (a snapshot of
// DurtyFree gta-v-data-dumps/vehicleHandlings.json) by model name.
// Images:         assets/vehicles/images/<model_name>.webp
// Hash:           archive's hash, verified against joaat(model_name).

import { readFile } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE } from '../config.mjs';
import { joaat } from '../lib/joaat.mjs';
import { writeFlatDomain, fileExists } from '../lib/catalog.mjs';

export const DOMAIN = 'vehicles';
export const LABEL = 'Vehicles';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'vehicles.json'), 'utf-8'));
const HANDLING = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'vehicles.handling.json'), 'utf-8'));
// model name (lowercased) -> internal DLC code (DurtyFree), resolved to { id, name, releaseDate }.
const DLC_BY_MODEL = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'vehicles.dlc.json'), 'utf-8')).models;
const DLC_LABELS = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'dlc.labels.json'), 'utf-8')).labels;
function dlcFor(model) {
  const id = DLC_BY_MODEL[model.toLowerCase()];
  if (!id) return null;
  const l = DLC_LABELS[id];
  return { id, name: l?.name ?? id, releaseDate: l?.releaseDate ?? null };
}

// model name (lowercased) -> curated performance stats.
// One handling can be shared by several models (the VehicleModels array).
const round = (n, p = 2) => (typeof n === 'number' ? Number(n.toFixed(p)) : n);
const drivetrain = (b) => (b <= 0 ? 'RWD' : b >= 1 ? 'FWD' : 'AWD'); // derived from DriveBiasFront
function statsFromHandling(h) {
  return {
    handlingId: h.Id,
    mass: round(h.Mass),
    topSpeed: round(h.InitialDriveMaxFlatVel),   // game max flat velocity
    driveForce: round(h.InitialDriveForce, 3),   // acceleration proxy
    brakeForce: round(h.BrakeForce, 3),
    handBrakeForce: round(h.HandBrakeForce, 3),
    gears: h.InitialDriveGears,
    driveBiasFront: round(h.DriveBiasFront, 2),
    drivetrain: drivetrain(h.DriveBiasFront),
    traction: { max: round(h.TractionCurveMax), min: round(h.TractionCurveMin), lateral: round(h.TractionCurveLateral) },
    suspensionForce: round(h.SuspensionForce, 3),
    steeringLock: round(h.SteeringLock),
    monetaryValue: h.MonetaryValue,              // in-game price
  };
}
const STATS_BY_MODEL = new Map();
for (const h of HANDLING) {
  for (const m of h.VehicleModels || []) {
    if (!STATS_BY_MODEL.has(String(m).toLowerCase())) STATS_BY_MODEL.set(String(m).toLowerCase(), statsFromHandling(h));
  }
}

export async function build({ assetsDir, apiDir, log = console.log }) {
  const imagesDir = join(assetsDir, DOMAIN, 'images');

  let missing = 0;
  let mismatches = 0;
  let withStats = 0;
  let withDlc = 0;
  const items = [];
  for (const veh of SRC) {
    const id = veh.model_name;
    // joaat(model_name) is authoritative. The archive's `hash` is informational
    // only: most of its "differences" are just signed-int32 encodings of the same
    // value (normalise with >>> 0), and a couple are outright data errors.
    const computed = joaat(id);
    const declared = Number(veh.hash);
    if (Number.isFinite(declared) && (declared >>> 0) !== computed) {
      mismatches++;
      log(`  ! archive hash for "${id}" (${declared}) disagrees with joaat ${computed} — using joaat.`);
    }
    const hasImage = await fileExists(join(imagesDir, `${id}.webp`));
    if (!hasImage) missing++;
    const stats = STATS_BY_MODEL.get(id.toLowerCase()) ?? null;
    if (stats) withStats++;
    const dlc = dlcFor(id);
    if (dlc) withDlc++;
    items.push({
      id,
      name: veh.display_name,
      hash: computed,
      category: veh.category,
      url: hasImage ? `${CDN_BASE}/assets/${DOMAIN}/images/${id}.webp` : null,
      dlc,
      stats,
    });
  }

  if (missing) log(`  ! ${missing} vehicle(s) have no image (url: null).`);
  if (mismatches) log(`  note: ${mismatches} archive hash(es) overridden by joaat (data errors in source).`);
  log(`  stats: ${withStats}/${items.length} vehicles have performance stats (handling snapshot).`);
  log(`  dlc: ${withDlc}/${items.length} vehicles tagged with source DLC + release date (DurtyFree + dlc.labels).`);

  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{model_name}.webp`,
    note: 'Flat catalog keyed by model_name. hash = joaat(model_name). dlc = { id, name, releaseDate } (source update; releaseDate is the DLC launch date). stats = curated handling values (topSpeed, driveForce, brakeForce, traction, mass, drivetrain, monetaryValue, …).',
    items, log,
  });
}

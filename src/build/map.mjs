// World map domain builder.
//
// Ships the GTA V world map in several visual styles (satellite, atlas, road, …)
// plus the linear world->image coordinate transform needed to draw markers
// (players, blips, arbitrary positions) on any of them. All styles share one
// coordinate system (gtamap.xyz Leaflet CRS), so a marker's normalized position
// (UV / CSS percent) is identical on every style — only pixel sizes differ.
//
// Unlike the flat catalogs this is a single descriptive object: a styles[] list
// of image variants + a shared calibration block (UV transform + inverse +
// world bounds) + example landmarks (with pre-computed uv/percent so the
// calibration is verifiable at a glance). No joaat hash, no categories.
//
// Source data: src/data/map.json. The only authoritative input is
// calibration.pixel on the reference image; everything else (UV, inverse, world
// bounds, per-style pixel calibration, per-landmark positions) is derived here.

import { readFile, writeFile, mkdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { baseMeta, CDN_BASE } from '../config.mjs';

export const DOMAIN = 'map';
export const LABEL = 'World Map';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'map.json'), 'utf-8'));

const round = (n, d = 6) => {
  const f = 10 ** d;
  return Math.round(n * f) / f;
};

export async function build({ assetsDir, apiDir, log = console.log }) {
  const ref = SRC.calibration.reference;
  const { scaleX, offsetX, scaleY, offsetY } = SRC.calibration.pixel;

  // Normalized UV transform — the pixel transform divided by the reference image
  // size. This is image-size independent: every style shares it.
  const uv = {
    scaleX: scaleX / ref.width, offsetX: offsetX / ref.width,
    scaleY: scaleY / ref.height, offsetY: offsetY / ref.height,
  };
  const toUV = (x, y) => ({ u: uv.scaleX * x + uv.offsetX, v: uv.scaleY * y + uv.offsetY });

  // World extents at the image edges (inverse UV transform at u/v = 0 and 1).
  const xAtU = (u) => (u - uv.offsetX) / uv.scaleX;
  const yAtV = (v) => (v - uv.offsetY) / uv.scaleY;
  const xs = [xAtU(0), xAtU(1)];
  const ys = [yAtV(0), yAtV(1)];
  const worldBounds = {
    minX: round(Math.min(...xs), 2), maxX: round(Math.max(...xs), 2),
    minY: round(Math.min(...ys), 2), maxY: round(Math.max(...ys), 2),
  };

  // One entry per visual style — its own URL, dimensions, byte size, and the
  // pixel-space calibration for that exact image (UV transform * its size).
  const styles = [];
  for (const s of SRC.styles) {
    const url = `${CDN_BASE}/assets/${DOMAIN}/${s.file}`;
    let bytes = null;
    try { bytes = (await stat(join(assetsDir, DOMAIN, s.file))).size; } catch {}
    styles.push({
      id: s.id, name: s.name,
      url, file: s.file,
      width: s.width, height: s.height,
      format: s.format,
      bytes,
      default: s.id === SRC.defaultStyle,
      description: s.description,
      // pixel = uv * this image's dimensions
      pixelCalibration: {
        scaleX: round(uv.scaleX * s.width, 8), offsetX: round(uv.offsetX * s.width, 4),
        scaleY: round(uv.scaleY * s.height, 8), offsetY: round(uv.offsetY * s.height, 4),
      },
    });
  }

  const landmarks = (SRC.landmarks ?? []).map((m) => {
    const u = toUV(m.x, m.y);
    return {
      id: m.id, name: m.name,
      world: { x: m.x, y: m.y, z: m.z ?? null },
      uv: { u: round(u.u), v: round(u.v) },
      percent: { left: round(u.u * 100, 3), top: round(u.v * 100, 3) },
    };
  });

  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note:
      'GTA V world map in several styles + the linear world->image transform for placing markers. ' +
      'All styles share one coordinate system, so a marker\'s normalized position is identical on every style. ' +
      'world (x,y) -> UV: u = calibration.uv.scaleX*x + offsetX ; v = scaleY*y + offsetY ' +
      '(scaleY is negative: game Y is north-up, image Y is down). Multiply UV by 100 for a CSS left/top %, ' +
      'or by a style\'s width/height for pixels (or use that style\'s pixelCalibration directly). ' +
      'Inverse: x = (u - uv.offsetX)/uv.scaleX ; y = (v - uv.offsetY)/uv.scaleY. ' +
      'landmarks[] carry pre-computed uv/percent so the calibration is verifiable.',
  };

  const index = {
    meta,
    defaultStyle: SRC.defaultStyle,
    styleCount: styles.length,
    styles,
    calibration: {
      note: 'Authoritative input is `pixel` on the reference image. `uv` is the same transform normalized to 0..1 (shared by every style). Per-style pixel constants live on each style as `pixelCalibration`. `inverse` recovers world coords from UV.',
      reference: ref,
      pixel: { scaleX, offsetX, scaleY, offsetY },
      uv: {
        scaleX: round(uv.scaleX, 10), offsetX: round(uv.offsetX, 10),
        scaleY: round(uv.scaleY, 10), offsetY: round(uv.offsetY, 10),
      },
      inverse: { formulaX: 'x = (u - uv.offsetX) / uv.scaleX', formulaY: 'y = (v - uv.offsetY) / uv.scaleY' },
    },
    worldBounds,
    landmarkCount: landmarks.length,
    landmarks,
  };

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });
  await writeFile(join(domainApi, 'index.json'), JSON.stringify(index, null, 2), 'utf-8');

  const totalMB = styles.reduce((n, s) => n + (s.bytes ?? 0), 0) / 1048576;
  log(`  ${styles.length} style(s) [${styles.map((s) => s.id).join(', ')}], ${landmarks.length} landmarks, ${totalMB.toFixed(1)} MB total.`);
  log(`Done ${DOMAIN}: world map + calibration.`);

  return {
    domain: DOMAIN, label: LABEL,
    styles: styles.map((s) => ({ id: s.id, image: `assets/${DOMAIN}/${s.file}` })),
    index: `api/${DOMAIN}/index.json`,
  };
}

// Client helper for the World Map domain of the GTA Discovery API.
//   import map from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/map.js';
//   await map.getStyles();                       // [{ id:'satellite', url, width, ... }, { id:'atlas', ... }]
//   await map.imageUrl('atlas');                 // the atlas image URL (defaults to defaultStyle)
//   await map.worldToPercent(-75, -825);         // { left, top } in 0..100 — CSS position over the <img>
//   await map.worldToUV(-75, -825);              // { u, v } in 0..1
//   await map.worldToPixel(-75, -825, 'atlas');  // { x, y } pixels on the atlas image
//   await map.pixelToWorld(3704, 6071, 'satellite'); // { x, y } back to game coords
//   await map.marker(-75, -825, { label: 'Maze Bank' }); // ready-to-render marker (uv + percent + your props)
//
// All styles share one coordinate system, so uv/percent are style-independent;
// only worldToPixel/pixelToWorld depend on which style's pixel grid you use.

const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');

let _indexPromise = null;
/** The full map index (api/map/index.json): styles, calibration, landmarks. */
export function getIndex() {
  if (!_indexPromise) {
    _indexPromise = fetch(`${BASE}/api/map/index.json`).then((res) => {
      if (!res.ok) throw new Error(`GTA Discovery API: api/map/index.json -> HTTP ${res.status}`);
      return res.json();
    });
  }
  return _indexPromise;
}

/** All visual styles: [{ id, name, url, width, height, format, bytes, default, pixelCalibration }]. */
export async function getStyles() {
  return (await getIndex()).styles;
}

/** One style by id (defaults to the index's defaultStyle), or null. */
export async function getStyle(id) {
  const idx = await getIndex();
  const wanted = id ?? idx.defaultStyle;
  return idx.styles.find((s) => s.id === wanted) ?? null;
}

/** The image URL for a style (defaults to defaultStyle). */
export async function imageUrl(id) {
  return (await getStyle(id))?.url ?? null;
}

/** The shared calibration block { reference, pixel, uv, inverse }. */
export async function getCalibration() {
  return (await getIndex()).calibration;
}

/** world (x,y) -> normalized UV { u, v } in 0..1 (style-independent). */
export async function worldToUV(x, y) {
  const { uv } = (await getIndex()).calibration;
  return { u: uv.scaleX * x + uv.offsetX, v: uv.scaleY * y + uv.offsetY };
}

/** world (x,y) -> CSS percentage { left, top } in 0..100 (style-independent). */
export async function worldToPercent(x, y) {
  const { u, v } = await worldToUV(x, y);
  return { left: u * 100, top: v * 100 };
}

/** world (x,y) -> pixel { x, y } on a given style's image (defaults to defaultStyle). */
export async function worldToPixel(x, y, styleId) {
  const s = await getStyle(styleId);
  if (!s) throw new Error(`map: unknown style ${styleId}`);
  const c = s.pixelCalibration;
  return { x: c.scaleX * x + c.offsetX, y: c.scaleY * y + c.offsetY };
}

/** pixel (px,py) on a style's image -> world { x, y } (defaults to defaultStyle). */
export async function pixelToWorld(px, py, styleId) {
  const s = await getStyle(styleId);
  if (!s) throw new Error(`map: unknown style ${styleId}`);
  const c = s.pixelCalibration;
  return { x: (px - c.offsetX) / c.scaleX, y: (py - c.offsetY) / c.scaleY };
}

/** True if a world (x,y) falls within the mapped area (worldBounds). */
export async function inBounds(x, y) {
  const b = (await getIndex()).worldBounds;
  return x >= b.minX && x <= b.maxX && y >= b.minY && y <= b.maxY;
}

/**
 * Build a render-ready marker for a world position. Returns the input world
 * coords, the style-independent uv + percent placement, and whatever extra
 * props you pass (label, color, id, …). Drop a div at { percent.left%, percent.top% }
 * over the map <img> and you have a blip.
 *
 *   const m = await map.marker(player.x, player.y, { label: player.name, color: '#3df' });
 *   // -> { world:{x,y}, uv:{u,v}, percent:{left,top}, inBounds, label, color }
 */
export async function marker(x, y, props = {}) {
  const { u, v } = await worldToUV(x, y);
  return {
    world: { x, y },
    uv: { u, v },
    percent: { left: u * 100, top: v * 100 },
    inBounds: await inBounds(x, y),
    ...props,
  };
}

/** Map many world positions to markers at once. items: [{ x, y, ...props }]. */
export async function markers(items) {
  return Promise.all(items.map(({ x, y, ...props }) => marker(x, y, props)));
}

/** The example landmarks (with pre-computed uv/percent) for calibration checks. */
export async function getLandmarks() {
  return (await getIndex()).landmarks;
}

export default {
  getIndex, getStyles, getStyle, imageUrl, getCalibration,
  worldToUV, worldToPercent, worldToPixel, pixelToWorld, inBounds,
  marker, markers, getLandmarks,
};

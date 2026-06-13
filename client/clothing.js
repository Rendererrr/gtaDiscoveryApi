// Browser/Node ESM helper for the Clothing domain of the GTA Discovery API.
// Fetches the per-component JSON (cached) and resolves image URLs by
// component ID + gender + drawable + texture. Covers both clothes and props.
//
//   import { getTexture, getDrawable }
//     from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/clothing.js';

// Self-locating: resolve the API root relative to this module's own URL, so it
// works wherever it's served from (jsDelivr, GitHub Pages, or a custom host).
const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');
const DOMAIN = 'clothing';

const _cache = new Map();
async function _fetchJson(path) {
  if (_cache.has(path)) return _cache.get(path);
  const res = await fetch(`${BASE}/${path}`);
  if (!res.ok) throw new Error(`GTA Discovery API: ${path} -> HTTP ${res.status}`);
  const json = await res.json();
  _cache.set(path, json);
  return json;
}

/** The clothing catalog (api/clothing/index.json). */
export function getIndex() {
  return _fetchJson(`api/${DOMAIN}/index.json`);
}

/** Full data for one component, e.g. getComponent('clothes', 11) or getComponent('props', 0). */
export function getComponent(type, componentId) {
  return _fetchJson(`api/${DOMAIN}/${type}/${componentId}.json`);
}

function _drawablesFor(component, gender) {
  if (component.gendered) {
    if (!gender) throw new Error(`Component ${component.componentId} is gendered — pass { gender: 'male' | 'female' }`);
    const g = component.genders[gender];
    if (!g) throw new Error(`Unknown gender "${gender}" for component ${component.componentId}`);
    return g.drawables;
  }
  return component.drawables;
}

/**
 * All texture entries for a drawable.
 * @returns {Promise<Array<{ texture: number, url: string, size: number }>>}
 */
export async function getDrawable({ type = 'clothes', componentId, gender, drawable }) {
  const component = await getComponent(type, componentId);
  const drawables = _drawablesFor(component, gender);
  const entry = drawables[String(drawable)];
  if (!entry) throw new Error(`No drawable ${drawable} for ${type}/${componentId}${gender ? `/${gender}` : ''}`);
  return entry.textures;
}

/**
 * A single image URL by component + gender + drawable + texture.
 * @returns {Promise<string>}
 */
export async function getTexture({ type = 'clothes', componentId, gender, drawable, texture = 0 }) {
  const textures = await getDrawable({ type, componentId, gender, drawable });
  const hit = textures.find((t) => t.texture === Number(texture));
  if (!hit) throw new Error(`No texture ${texture} for drawable ${drawable} (${type}/${componentId})`);
  return hit.url;
}

export default { getIndex, getComponent, getDrawable, getTexture };

// Shared client factory for flat domains (peds, vehicles, weapons).
// Fetches api/<domain>/index.json once (cached) and exposes lookups over it.

// Self-locating: resolve the API root relative to this module's own URL, so the
// client works wherever it's served from — jsDelivr, GitHub Pages, or a custom host.
// (client/_flat.js -> repo root is one level up.)
const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');

export function makeFlatClient(domain) {
  let _indexPromise = null;
  let _hashesPromise = null;

  function _fetchJson(path) {
    return fetch(`${BASE}/${path}`).then((res) => {
      if (!res.ok) throw new Error(`GTA Discovery API: ${path} -> HTTP ${res.status}`);
      return res.json();
    });
  }

  function getIndex() {
    if (!_indexPromise) _indexPromise = _fetchJson(`api/${domain}/index.json`);
    return _indexPromise;
  }

  /** The compact hash -> { id, name, category } map (api/<domain>/hashes.json). */
  function getHashes() {
    if (!_hashesPromise) _hashesPromise = _fetchJson(`api/${domain}/hashes.json`).then((j) => j.hashes);
    return _hashesPromise;
  }

  /** Resolve a joaat hash to its name (or null). Uses the compact hashes file. */
  async function nameForHash(hash) {
    return (await getHashes())[String(hash)]?.name ?? null;
  }

  /** All items (the `items` array). */
  async function getItems() {
    return (await getIndex()).items;
  }

  /** The category summary ([{ name, count }]). */
  async function getCategories() {
    return (await getIndex()).categories;
  }

  /** Items in a category (case-insensitive). */
  async function byCategory(category) {
    const c = String(category).toLowerCase();
    return (await getItems()).filter((i) => (i.category ?? '').toLowerCase() === c);
  }

  /** One item by its id (model_name / weapon id). */
  async function byId(id) {
    return (await getItems()).find((i) => i.id === id) ?? null;
  }

  /** One item by its joaat hash (number or numeric string). */
  async function byHash(hash) {
    const h = Number(hash);
    return (await getItems()).find((i) => i.hash === h) ?? null;
  }

  /** The image URL for an id (or null if the item has no image). */
  async function imageUrl(id) {
    return (await byId(id))?.url ?? null;
  }

  /**
   * Fuzzy substring search over id, name and category (case-insensitive),
   * ranked exact > prefix > substring > category. Each result is a full item
   * (so result.url is the image). Runs client-side over the cached catalog.
   *
   *   const hits = await vehicles.search('adder');   // [{ id:'adder', url, ... }]
   */
  async function search(query, { limit = 25 } = {}) {
    const q = String(query ?? '').trim().toLowerCase();
    if (!q) return [];
    const scored = [];
    for (const it of await getItems()) {
      const id = (it.id ?? '').toLowerCase();
      const name = (it.name ?? '').toLowerCase();
      const cat = (it.category ?? '').toLowerCase();
      let score = 0;
      if (id === q || name === q) score = 100;
      else if (id.startsWith(q) || name.startsWith(q)) score = 75;
      else if (id.includes(q) || name.includes(q)) score = 50;
      else if (cat.includes(q)) score = 25;
      if (score) scored.push({ it, score });
    }
    scored.sort((a, b) => b.score - a.score || (a.it.name ?? '').localeCompare(b.it.name ?? ''));
    return scored.slice(0, limit).map((s) => s.it);
  }

  return { domain, getIndex, getItems, getCategories, byCategory, byId, byHash, imageUrl, search, getHashes, nameForHash };
}

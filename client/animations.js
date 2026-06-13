// Client helper for the Animations domain of the GTA Discovery API.
//
// An animation is a (dict, anim) pair — REQUEST_ANIM_DICT(dict) then
// TASK_PLAY_ANIM(dict, anim). No images, no hash; identity is the pair.
//
//   import animations from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/animations.js';
//   // curated set (friendly names + categories):
//   await animations.byCategory('Dance');         // curated dances
//   await animations.getCategories();             // the curated categories
//   await animations.byId('anim@mp_player_intcelebrationmale@thumbs_up/thumbs_up');
//   // full list (20k+ dictionaries):
//   await animations.getDictionaries();           // [{ dict, count }] for every dictionary
//   await animations.byDictionary('missheist');   // every anim name in a dictionary (loads all.json once)

import { makeFlatClient } from './_flat.js';

const animations = makeFlatClient('animations');           // curated catalog (index.json)
const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');

let _dictPromise = null;
let _allPromise = null;

/** Every animation dictionary as [{ dict, count }] (the lightweight full-list index). */
function getDictionaries() {
  if (!_dictPromise) {
    _dictPromise = fetch(`${BASE}/api/animations/dictionaries.json`).then((r) => {
      if (!r.ok) throw new Error(`animations/dictionaries.json -> HTTP ${r.status}`);
      return r.json();
    }).then((j) => j.dictionaries);
  }
  return _dictPromise;
}

/** The complete dict -> animations[] data (one ~0.8 MB gzipped fetch, cached). */
function getAll() {
  if (!_allPromise) {
    _allPromise = fetch(`${BASE}/api/animations/all.json`).then((r) => {
      if (!r.ok) throw new Error(`animations/all.json -> HTTP ${r.status}`);
      return r.json();
    }).then((j) => j.dictionaries);
  }
  return _allPromise;
}

/** Every animation name in a dictionary (case-insensitive). Loads all.json once, then cached. */
async function byDictionary(dict) {
  const d = String(dict).toLowerCase();
  return (await getAll()).find((x) => x.dict.toLowerCase() === d)?.animations ?? [];
}

export const { getIndex, getItems, getCategories, byCategory, byId, search } = animations;
export { getDictionaries, getAll, byDictionary };
export default { ...animations, getDictionaries, getAll, byDictionary };

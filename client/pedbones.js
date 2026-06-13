// Client helper for the Ped Bones domain of the GTA Discovery API.
//   import pedbones from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/pedbones.js';
//   await pedbones.byId('SKEL_Head');        // { name:'Head', boneId:31086, type, category }
//   await pedbones.byBoneId(31086);          // reverse boneId -> { id:'SKEL_Head', name:'Head', category }
//   await pedbones.byCategory('Left Hand');  // bones in a body region
//   await pedbones.getCategories();          // the 9 categories
//
// boneId is the bone tag used with GET_PED_BONE_INDEX (not a joaat hash), so it has
// its own reverse map (byBoneId) instead of byHash.

import { makeFlatClient } from './_flat.js';

const pedbones = makeFlatClient('pedbones');
const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');

let _byIdPromise = null;
function _byIdMap() {
  if (!_byIdPromise) {
    _byIdPromise = fetch(`${BASE}/api/pedbones/byid.json`).then((r) => {
      if (!r.ok) throw new Error(`pedbones/byid.json -> HTTP ${r.status}`);
      return r.json();
    }).then((j) => j.bones);
  }
  return _byIdPromise;
}

/** Resolve a ped bone id (e.g. 31086) -> { id, name, category } (or null). */
async function byBoneId(boneId) {
  return (await _byIdMap())[String(boneId)] ?? null;
}

export const { getIndex, getItems, getCategories, byCategory, byId, search } = pedbones;
export { byBoneId };
export default { ...pedbones, byBoneId };

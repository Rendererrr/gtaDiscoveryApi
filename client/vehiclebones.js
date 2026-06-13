// Client helper for the Vehicle Bones domain of the GTA Discovery API.
//   import vehiclebones from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/vehiclebones.js';
//   await vehiclebones.byId('seat_dside_f');      // { name:'Seat Driver Front', hash, category }
//   await vehiclebones.byHash(3570590826);        // reverse joaat -> the bone
//   await vehiclebones.byCategory('Wheels & Suspension');
//   await vehiclebones.getCategories();           // the 13 categories
//
// hash = joaat(id) — the value GET_ENTITY_BONE_INDEX_BY_NAME resolves.

import { makeFlatClient } from './_flat.js';

const vehiclebones = makeFlatClient('vehiclebones');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, search, getHashes, nameForHash } = vehiclebones;
export default vehiclebones;

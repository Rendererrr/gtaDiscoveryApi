// Client helper for the Weapon Carry Styles domain of the GTA Discovery API.
//   import weaponcarrystyles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/weaponcarrystyles.js';
//   await weaponcarrystyles.byId('move_ped_wpn_bucket');  // { name:'Bucket', hash }
//   await weaponcarrystyles.byHash(123456789);            // reverse joaat -> the style
//   await weaponcarrystyles.getItems();                   // all carry styles
//   await weaponcarrystyles.search('tennis');             // fuzzy over names + clipset ids
//
// id = the clipset string for SET_PED_WEAPON_MOVEMENT_CLIPSET (load with REQUEST_CLIP_SET
// first); hash = joaat(id). No categories, no images.

import { makeFlatClient } from './_flat.js';

const weaponcarrystyles = makeFlatClient('weaponcarrystyles');

export const { getIndex, getItems, byId, byHash, search, getHashes, nameForHash } = weaponcarrystyles;
export default weaponcarrystyles;

// Client helper for the Aim Styles domain of the GTA Discovery API.
//   import aimstyles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/aimstyles.js';
//   await aimstyles.byId('Gang1H');         // { name:'Gangster', hash }
//   await aimstyles.byHash(123456789);      // reverse joaat -> the style
//   await aimstyles.getItems();             // all aim styles
//   await aimstyles.search('first person'); // fuzzy over names + style ids
//
// id = the style string for SET_WEAPON_ANIMATION_OVERRIDE; hash = joaat(id).
// No categories, no images.

import { makeFlatClient } from './_flat.js';

const aimstyles = makeFlatClient('aimstyles');

export const { getIndex, getItems, byId, byHash, search, getHashes, nameForHash } = aimstyles;
export default aimstyles;

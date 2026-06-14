// Client helper for the Walk Styles domain of the GTA Discovery API.
//   import walkstyles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/walkstyles.js';
//   await walkstyles.byId('move_m@gangster@generic');  // { name:'Gangster', hash }
//   await walkstyles.byHash(123456789);                 // reverse joaat -> the walk style
//   await walkstyles.getItems();                        // all 96 walk styles
//   await walkstyles.search('drunk');                   // fuzzy over names + clipset ids
//
// id = the movement clipset string for SET_PED_MOVEMENT_CLIPSET (load with REQUEST_CLIP_SET
// first); hash = joaat(id). No categories, no images.

import { makeFlatClient } from './_flat.js';

const walkstyles = makeFlatClient('walkstyles');

export const { getIndex, getItems, byId, byHash, search, getHashes, nameForHash } = walkstyles;
export default walkstyles;

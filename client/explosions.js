// Client helper for the Explosions domain of the GTA Discovery API.
//   import explosions from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/explosions.js';
//   await explosions.byId('grenade');           // { name:'Grenade', category:'Thrown', tag, hash, index }
//   await explosions.byHash(2323771015);         // reverse hash -> the explosion item
//   await explosions.byCategory('Mines');        // explosions in a category
//   await explosions.getCategories();            // the 9 categories
//
// `hash` (joaat of the EXP_TAG_ string) is the stable id to use in scripts;
// `index` is a catalog position, NOT the in-game ADD_EXPLOSION enum integer.

import { makeFlatClient } from './_flat.js';

const explosions = makeFlatClient('explosions');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, byDlc, getDlcs, imageUrl, search, getHashes, nameForHash } = explosions;
export default explosions;

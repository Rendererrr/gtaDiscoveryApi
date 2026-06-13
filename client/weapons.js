// Client helper for the Weapons domain of the GTA Discovery API.
//   import { byId, byHash, byCategory, imageUrl }
//     from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/weapons.js';

import { makeFlatClient } from './_flat.js';

const weapons = makeFlatClient('weapons');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, imageUrl, search, getHashes, nameForHash } = weapons;
export default weapons;

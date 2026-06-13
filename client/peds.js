// Client helper for the Peds domain of the GTA Discovery API.
//   import { byId, byHash, byCategory, imageUrl }
//     from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/peds.js';

import { makeFlatClient } from './_flat.js';

const peds = makeFlatClient('peds');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, imageUrl, search } = peds;
export default peds;

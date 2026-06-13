// Client helper for the Vehicles domain of the GTA Discovery API.
//   import { byId, byHash, byCategory, imageUrl }
//     from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/vehicles.js';

import { makeFlatClient } from './_flat.js';

const vehicles = makeFlatClient('vehicles');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, imageUrl } = vehicles;
export default vehicles;

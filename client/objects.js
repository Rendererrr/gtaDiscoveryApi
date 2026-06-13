// Client helper for the Objects (props) domain of the GTA Discovery API.
//   import objects from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/objects.js';
//   await objects.byId('prop_beachball_01');     // { name: 'Beach Ball', category: 'Beach', hash, curated: true }
//   await objects.byHash(1574107526);            // reverse hash -> the object item
//   await objects.nameForHash(1574107526);       // 'Beach Ball'  (loads the compact hashes.json, not the 2.3MB index)
//   await objects.byCategory('Beach');           // curated objects in a category
//
// Note: this domain is large (~21.6k objects). byHash/nameForHash use the compact
// api/objects/hashes.json; byId/byCategory/search load the full index once.

import { makeFlatClient } from './_flat.js';

const objects = makeFlatClient('objects');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, byDlc, getDlcs, imageUrl, search, getHashes, nameForHash } = objects;
export default objects;

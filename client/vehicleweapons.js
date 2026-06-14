// Client helper for the Vehicle Weapons domain of the GTA Discovery API.
//   import vehicleweapons from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/vehicleweapons.js';
//   await vehicleweapons.byId('VEHICLE_WEAPON_TANK');   // { name:'Tank Cannon', hash, category }
//   await vehicleweapons.byHash(1945616459);            // reverse joaat -> the weapon
//   await vehicleweapons.byCategory('Missiles & Rockets');
//   await vehicleweapons.getCategories();               // the 7 categories
//
// id = the VEHICLE_WEAPON_* archetype string; hash = joaat(id) (resolves via GET_HASH_KEY).

import { makeFlatClient } from './_flat.js';

const vehicleweapons = makeFlatClient('vehicleweapons');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, search, getHashes, nameForHash } = vehicleweapons;
export default vehicleweapons;

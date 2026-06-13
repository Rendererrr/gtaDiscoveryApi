// Client helper for the Particles (PTFX) domain of the GTA Discovery API.
//   import particles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/particles.js';
//   await particles.byId('core/ent_sht_flame');     // one effect { name, dict, effect, category, curated }
//   await particles.byCategory('scr_rcbarry2');     // all effects in a dictionary
//   await particles.getCategories();                // every dictionary (= "list all categories")
//   await particles.search('firework');             // fuzzy search over names/effects
//
// A particle is a (dict, effect) pair — REQUEST_NAMED_PTFX_ASSET(dict) then
// START_PARTICLE_FX_*(effect). There is no joaat hash, so byHash/nameForHash
// don't apply here; identify effects by their dict + effect strings.

import { makeFlatClient } from './_flat.js';

const particles = makeFlatClient('particles');

export const { getIndex, getItems, getCategories, byCategory, byId, search } = particles;
export default particles;

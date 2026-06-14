// Client helper for the Scenarios domain of the GTA Discovery API.
//   import scenarios from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/scenarios.js';
//   await scenarios.byId('WORLD_HUMAN_YOGA');     // { name:'Yoga', hash, category }
//   await scenarios.byHash(1234567890);            // reverse joaat -> the scenario
//   await scenarios.byCategory('Animals & Wildlife');
//   await scenarios.getCategories();               // the 9 categories
//
// id = the scenario string passed to TASK_START_SCENARIO_* natives; hash = joaat(id).

import { makeFlatClient } from './_flat.js';

const scenarios = makeFlatClient('scenarios');

export const { getIndex, getItems, getCategories, byCategory, byId, byHash, search, getHashes, nameForHash } = scenarios;
export default scenarios;

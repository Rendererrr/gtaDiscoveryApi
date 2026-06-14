// Client helper for the Animation Flags domain of the GTA Discovery API.
//   import animflags from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/animflags.js';
//   await animflags.getFlags();                                   // the 31 AF_* bit flags
//   await animflags.getPresets();                                 // curated named combinations
//   await animflags.combine('AF_UPPERBODY', 'AF_LOOPING');        // -> 17  (bitwise OR by id)
//   await animflags.decode(48);                                   // -> [{id:'AF_UPPERBODY',...},{id:'AF_SECONDARY',...}]
//   await animflags.valueForPreset('Cancelable Animation');       // -> 130
//
// These are eScriptedAnimFlags bitmask values for TASK_PLAY_ANIM etc. No joaat hash.

const BASE = new URL('..', import.meta.url).href.replace(/\/$/, '');

let _indexPromise = null;
export function getIndex() {
  if (!_indexPromise) {
    _indexPromise = fetch(`${BASE}/api/animflags/index.json`).then((res) => {
      if (!res.ok) throw new Error(`GTA Discovery API: api/animflags/index.json -> HTTP ${res.status}`);
      return res.json();
    });
  }
  return _indexPromise;
}

/** The 31 individual bit flags: [{ id, name, value, bit }]. */
export async function getFlags() {
  return (await getIndex()).flags;
}

/** The curated named combinations: [{ name, value, flags: [id] }]. */
export async function getPresets() {
  return (await getIndex()).presets;
}

/** One flag by its AF_* id (or null). */
export async function flagById(id) {
  return (await getFlags()).find((f) => f.id === id) ?? null;
}

/** Bitwise-OR a set of flag ids into a single value (throws on unknown id). */
export async function combine(...ids) {
  const list = ids.flat();
  const flags = await getFlags();
  let value = 0;
  for (const id of list) {
    const f = flags.find((x) => x.id === id);
    if (!f) throw new Error(`animflags: unknown flag ${id}`);
    value |= f.value;
  }
  return value >>> 0;
}

/** Decode a numeric flag value into the individual flags it sets: [{ id, name, value, bit }]. */
export async function decode(value) {
  const v = Number(value) >>> 0;
  return (await getFlags()).filter((f) => (v & f.value) === f.value);
}

/** The computed value for a curated preset, by name (case-insensitive), or null. */
export async function valueForPreset(name) {
  const n = String(name).toLowerCase();
  return (await getPresets()).find((p) => p.name.toLowerCase() === n)?.value ?? null;
}

export default { getIndex, getFlags, getPresets, flagById, combine, decode, valueForPreset };

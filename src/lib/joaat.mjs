// joaat — GTA's "Jenkins one-at-a-time" hash, lowercased input.
// Used by FiveM/GTA to key models, vehicles and weapons by name.
// Verified against known values: joaat('asbo') === 1118611807,
// joaat('weapon_assaultrifle_mk2') === 961495388.

export function joaat(str) {
  const s = String(str).toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h + s.charCodeAt(i)) >>> 0;
    h = (h + (h << 10)) >>> 0;
    h = (h ^ (h >>> 6)) >>> 0;
  }
  h = (h + (h << 3)) >>> 0;
  h = (h ^ (h >>> 11)) >>> 0;
  h = (h + (h << 15)) >>> 0;
  return h >>> 0;
}

export default joaat;

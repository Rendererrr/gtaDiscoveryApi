// Outfits domain builder.
//
// Premade GTA Online outfits scraped from the bbfas community gallery (see tools/scrape_outfits.mjs).
// Each outfit carries its gender (m/f), a decoded component/prop slot table, and a preview image.
// The in-game wardrobe applies an outfit by writing each slot via SET_PED_COMPONENT_VARIATION /
// SET_PED_PROP_INDEX. Re-run `npm run scrape:outfits` to refresh src/data/outfits.json with new
// submissions, then rebuild.

import { readFile } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE } from '../config.mjs';
import { writeFlatDomain } from '../lib/catalog.mjs';
import { keyOf } from '../../tools/outfit_key.mjs';

export const DOMAIN = 'outfits';
export const LABEL = 'Outfits';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'outfits.json'), 'utf-8'));
// AI vision names + style categories (id -> { name, category }); produced by tools/scrape -> agents ->
// tools/merge_outfit_names.mjs. Optional: falls back to a derived name + "Other" when absent.
let NAMES = {};
try { NAMES = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'outfit_names.json'), 'utf-8')); } catch {}

// The in-menu font is ASCII-only, but most source names are Chinese (often "中文/English"). Derive a
// clean Latin display name: prefer the Latin part (after a "/" or "|"), strip non-ASCII, and fall back
// to "<author> outfit N" when there is nothing Latin to show.
function displayName(o, n) {
  const raw = (o.name || '').trim();
  let cand = raw;
  for (const seg of raw.split(/[\/|]/).map((s) => s.trim())) {
    if (/[a-zA-Z]/.test(seg)) { cand = seg; break; }
  }
  cand = cand.replace(/[^\x20-\x7E]/g, '').replace(/\s+/g, ' ').trim();
  if (cand.length >= 2) return cand;
  const who = (o.author || '').replace(/[^\x20-\x7E]/g, '').trim();
  return (who ? `${who} ` : '') + `outfit ${n}`;
}

export async function build({ apiDir, log = console.log }) {
  let mi = 0, fi = 0;
  const items = SRC.map((o) => {
    // Names/categories are keyed by the stable content key (re-scrape safe); fall back to id for any
    // pre-key data, then to a derived name.
    const nm = NAMES[o.key || keyOf(o)] || NAMES[o.id] || {};
    return {
    id: o.id,
    name: nm.name || displayName(o, o.gender === 'f' ? ++fi : ++mi),
    hash: null,
    // category = the style/theme group (Police, Military, ...); gender is a separate field. The in-game
    // wardrobe filters by gender, then groups by this category into sub-pages.
    category: nm.category || 'Other',
    gender: o.gender,                       // 'm' | 'f'
    author: o.author || '',
    image: o.image || null,                 // filename under assets/outfits/images/
    url: o.image ? `${CDN_BASE}/assets/${DOMAIN}/images/${o.image}` : null,
    comps: o.comps,                         // [12] component drawable (-1 = leave default)
    comp_tex: o.comp_tex,                   // [12] component texture
    props: o.props,                         // [8] prop drawable (-1 = none)
    prop_tex: o.prop_tex,                   // [8] prop texture
    };
  });
  const m = items.filter((i) => i.gender === 'm').length;
  log(`  ${items.length} outfits (${m} male, ${items.length - m} female).`);
  return writeFlatDomain({
    apiDir, domain: DOMAIN, label: LABEL,
    urlPattern: `{cdnBase}/assets/${DOMAIN}/images/{image}`,
    note: 'Premade outfits. gender = "m"|"f". category = style group (Police, Military, ...). comps/comp_tex = 12 component slots; props/prop_tex = 8 prop slots (-1 = none). Apply with SET_PED_COMPONENT_VARIATION / SET_PED_PROP_INDEX.',
    items, log,
  });
}

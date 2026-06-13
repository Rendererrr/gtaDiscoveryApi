# GTA Discovery API

A **static JSON API** for GTA 5 / FiveM game assets, served straight from the [jsDelivr](https://www.jsdelivr.com/) CDN — no server, no rate limits, free hosting on GitHub.

The API is split into **domains**: **clothing**, **peds**, **vehicles**, and **weapons**. More slot in alongside without disturbing the existing endpoints.

```
api/index.json                 # discovery root — lists every domain
api/<domain>/index.json        # one domain's catalog
assets/<domain>/...            # the raw images for that domain
```

There are two domain shapes:
- **Folder-derived** (clothing): the catalog is generated from the `assets/` folder tree (category/gender/drawable/texture).
- **Metadata-driven flat** (peds, vehicles, weapons): one image per item, keyed by a model name / weapon id, with per-item metadata and a `hash`.

## Domains

| Domain   | Contents                          | Catalog                          |
|----------|-----------------------------------|----------------------------------|
| clothing | Clothes + props (16 components)   | [`api/clothing/index.json`](./api/clothing/index.json) |
| peds     | Ped models (848)                  | [`api/peds/index.json`](./api/peds/index.json) |
| vehicles | Vehicle models (861)              | [`api/vehicles/index.json`](./api/vehicles/index.json) |
| weapons  | Weapon icons (104)                | [`api/weapons/index.json`](./api/weapons/index.json) |
| objects  | Object/prop models (21,634; 3,050 categorized) | [`api/objects/index.json`](./api/objects/index.json) |
| explosions | Explosion types (88, 9 categories) | [`api/explosions/index.json`](./api/explosions/index.json) |
| particles | Particle (PTFX) effects (2,907; 81 named) in 360 dictionaries | [`api/particles/index.json`](./api/particles/index.json) |
| animations | 204 curated (6 categories) + full list (269,414 anims in 20,179 dicts) | [`api/animations/index.json`](./api/animations/index.json) |
| pedbones | Ped skeleton bones (98, 9 body regions) with bone IDs | [`api/pedbones/index.json`](./api/pedbones/index.json) |
| vehiclebones | Vehicle bones (449, 13 categories) with joaat hashes | [`api/vehiclebones/index.json`](./api/vehiclebones/index.json) |

Read the discovery root to enumerate what's available:

```
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/api/index.json
```

---

## Clothing domain

Indexed by **component ID**, **gender**, and **drawable ID**. Covers both clothes and props.

### Asset layout

```
assets/clothing/<category>/<gender>/<drawableId>/<textureId>.webp   # gendered (tops, legs, …)
assets/clothing/<category>/<drawableId>/<textureId>.webp            # no-gender (masks)
```

### Component IDs

A GTA outfit slot is identified by a **type** (`clothes` or `props`) + a **component ID**.

| Type    | Component ID | Category          | Gendered | Image granularity |
|---------|--------------|-------------------|----------|-------------------|
| clothes | 1            | Masks             | no       | per-texture (.webp) |
| clothes | 2            | Hair Styles       | yes      | per-drawable (.jpg) |
| clothes | 3            | Torsos            | yes      | per-drawable (.jpg) |
| clothes | 4            | Legs              | yes      | per-texture (.webp) |
| clothes | 5            | Bags & Parachutes | no       | per-drawable (.jpg) |
| clothes | 6            | Shoes             | yes      | per-texture (.webp) |
| clothes | 7            | Accessories       | yes      | per-texture (.webp) |
| clothes | 8            | Undershirts       | yes      | per-texture (.webp) |
| clothes | 9            | Body Armor        | yes      | per-drawable (.jpg) |
| clothes | 10           | Decals            | yes      | per-drawable (.jpg) |
| clothes | 11           | Tops              | yes      | per-texture (.webp) |
| props   | 0            | Hats              | yes      | per-drawable (.jpg) |
| props   | 1            | Glasses           | yes      | per-drawable (.jpg) |
| props   | 2            | Ears              | yes      | per-drawable (.jpg) |
| props   | 6            | Watches           | yes      | per-drawable (.jpg) |
| props   | 7            | Bracelets         | yes      | per-drawable (.jpg) |

> **Props are part of the clothing domain.** Both `clothes/*` and `props/*` live under `api/clothing/`. Component ID 0 (Head/Face) is not included — heads are heritage/face data, not clothing drawables.

### Using the clothing API

**1. Direct image URL (no JSON needed)** — if you know the category, gender and ids:

```
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/clothing/{category}/{gender}/{drawableId}/{textureId}.webp
```

Example — Tops, male, drawable 0, texture 0:

```
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/clothing/tops/male/0/0.webp
```

Masks (no gender) — drawable 5, texture 0:

```
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/clothing/masks/5/0.webp
```

**2. Catalog / index** — [`api/clothing/index.json`](./api/clothing/index.json) lists every component with counts and an endpoint link.

**3. Per-component data** — `api/clothing/{type}/{componentId}.json` holds every drawable + texture with ready-made URLs:

```
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/api/clothing/clothes/11.json   # Tops
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/api/clothing/props/0.json       # Hats
```

Shape (gendered):

```jsonc
{
  "domain": "clothing",
  "type": "clothes",
  "componentId": 11,
  "category": "tops",
  "label": "Tops",
  "gendered": true,
  "genders": {
    "male": {
      "drawableCount": 1132,
      "textureCount": 10152,
      "drawables": {
        "0": { "textures": [ { "texture": 0, "url": "https://.../assets/clothing/tops/male/0/0.webp", "size": 1234 } ] }
      }
    },
    "female": { "...": "..." }
  }
}
```

For non-gendered components (masks) `drawables` sits at the top level and `gendered` is `false`.

**4. Everything at once** — [`api/clothing/manifest.json`](./api/clothing/manifest.json) bundles all clothing components into one file for bulk consumers.

### Quick start (JavaScript)

```js
import { getTexture, getDrawable }
  from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/clothing.js';

// One image URL by componentId + gender + drawable + texture
const url = await getTexture({ type: 'clothes', componentId: 11, gender: 'male', drawable: 0, texture: 0 });

// A prop works the same way
const hat = await getTexture({ type: 'props', componentId: 0, gender: 'male', drawable: 0 });

// All textures for a drawable
const textures = await getDrawable({ type: 'clothes', componentId: 11, gender: 'male', drawable: 0 });
```

Or start from the discovery root and walk into a domain:

```js
import discovery, { clothing }
  from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/index.js';

const { domains } = await discovery.getDomains();      // [{ domain: 'clothing', ... }]
const catalog = await clothing.getIndex();             // clothing components
```

---

## Peds, Vehicles & Weapons domains

These three are **flat catalogs**: one image per item, each `api/<domain>/index.json` holding
the whole domain in one file:

```jsonc
{
  "meta": { "domain": "vehicles", "label": "Vehicles", "cdnBase": "…", "urlPattern": "…" },
  "categories": [ { "name": "Sports", "count": 112 }, … ],
  "count": 861,
  "items": [
    { "id": "asbo", "name": "Asbo", "hash": 1118611807, "category": "Compacts",
      "url": "https://.../assets/vehicles/images/asbo.webp" }
  ]
}
```

| Domain   | `id` is…            | `hash`                              | Image format | Extra fields            |
|----------|---------------------|-------------------------------------|--------------|-------------------------|
| peds     | model name          | `joaat(model_name)`                 | `.webp`      | `props`, `components`   |
| vehicles | spawn name          | `joaat(model_name)`                 | `.webp`      | `stats`                 |
| weapons  | weapon id           | `joaat(codename)` (or `null`)       | `.png`       | `codename`, `stats`, `components` |

- **`hash`** is GTA's joaat (Jenkins-one-at-a-time) hash — the same value the game/FiveM uses.
  For vehicles it is computed from the model name and matches the official hashes; for weapons it
  is computed from the internal `codename` (e.g. `weapon_assaultrifle`). A weapon whose codename
  is unknown gets `hash: null` (currently only "Acid Package").
- **Vehicle `stats`** — all 861 vehicles carry curated performance stats from the game's handling
  data (source: [DurtyFree gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps),
  joined by model name):
  ```jsonc
  // GET api/vehicles/index.json -> items[]
  { "id": "adder", "name": "Adder", "hash": 3078201489, "category": "Super", "url": "…",
    "dlc": { "id": "TitleUpdate", "name": "Base Game", "releaseDate": "2013-09-17" },
    "stats": { "handlingId": "ADDER", "mass": 1800, "topSpeed": 160, "driveForce": 0.32,
               "brakeForce": 1, "handBrakeForce": 0.7, "gears": 6, "driveBiasFront": 0.2,
               "drivetrain": "AWD", "traction": { "max": 2.5, "min": 2.38, "lateral": 22.5 },
               "suspensionForce": 2.4, "steeringLock": 42, "monetaryValue": 80000 } }
  ```
  `topSpeed` is the game's max flat velocity (not mph/kmh), `driveForce` is the acceleration
  proxy, `monetaryValue` is the in-game price, and `drivetrain` is derived from `driveBiasFront`
  (0 → RWD, 1 → FWD, between → AWD).
- **Vehicle `dlc`** — all 861 vehicles carry `dlc` (`{ id, name, releaseDate }`) — the update
  they shipped in and its **launch date** (ISO `yyyy-mm-dd`). 43 distinct DLCs, 861/861 tagged.
  The DLC code comes from [DurtyFree](https://github.com/DurtyFree/gta-v-data-dumps) (joined by
  model name); `name` + `releaseDate` come from `src/data/dlc.labels.json` (shared with weapons).
  Note: vehicles that drip-fed weekly within a DLC share that DLC's launch date, not their exact
  drip date. Filter the same way as weapons:
  ```js
  const tuners = items.filter(v => v.dlc?.id === 'mptuner');               // by code
  const recent = items.filter(v => v.dlc?.releaseDate >= '2023-01-01');    // by date (ISO sorts lexically)
  ```
- **Vehicle `details`** — all 861 vehicles carry a `details` object from
  [DurtyFree](https://github.com/DurtyFree/gta-v-data-dumps) (joined by model name) with the
  physical/spec data that isn't handling: `manufacturer`, `type` (CAR/BIKE/HELI/…), `seats`,
  `doors` (counted from the model's door bones), `wheels`, `modKits`, `weaponized` + `weapons[]`
  (vehicle-weapon names), `features` (convertibleRoof, sirens, armoredWindows, parachute, kers),
  `dimensions` (metres — `length`=Y, `width`=X, `height`=Z, plus raw `min`/`max` and
  `boundingRadius`), `defaultColors[]` (factory colour combos as **GTA palette indices** —
  primary/secondary/pearl/wheels/interior/dashboard), and the raw vehicle `flags[]`.
  ```jsonc
  "details": {
    "manufacturer": "Truffade", "type": "CAR", "seats": 2, "doors": 2, "wheels": 4,
    "modKits": ["0_hiend_modkit"], "weaponized": false, "weapons": [],
    "features": { "convertibleRoof": false, "sirens": false, "armoredWindows": false,
                  "parachute": false, "kers": false },
    "dimensions": { "length": 4.496, "width": 2.145, "height": 1.227, "boundingRadius": 2.439,
                    "min": { "x": -1.072, "y": -2.209, "z": -0.596 },
                    "max": { "x":  1.072, "y":  2.287, "z":  0.631 } },
    "defaultColors": [ { "primary": 0, "secondary": 41, "pearl": 3, "wheels": 156,
                         "interior": 0, "dashboard": 0 } /* … */ ],
    "flags": [ "FLAG_SPORTS", "FLAG_CAN_HAVE_NEONS" /* … */ ]
  }
  ```
  ```js
  const armed     = items.filter(v => v.details?.weaponized);            // weaponized vehicles
  const fourSeat  = items.filter(v => v.details?.seats >= 4);            // by seat count
  const truffade  = items.filter(v => v.details?.manufacturer === 'Truffade'); // by brand
  ```
  `defaultColors` are palette **indices**, not names/hex (mapping them needs the GTA colour table).
- **Weapon `dlc`, `stats`, `components` + `tints`** — each weapon carries `dlc`
  (`{ id, name, releaseDate }` — the update it shipped in, e.g. `{ "id": "mpheist4", "name":
  "The Cayo Perico Heist", "releaseDate": "2020-12-15" }`; `null` for a few codenameless items),
  `stats` (0–100 weapon-wheel values
  `{ damage, fireRate, accuracy, range }` plus `maxAmmo`), `components[]`
  (`{ id, label, hash, default }` attachments/clips/finishes) and `tints[]`
  (`{ index, label }` weapon-wheel tint slots). Coverage: **104/104** have `dlc` and `tints`,
  **99/104** have `stats` (the other 5 — Fist, Parachute, Acid Package, Candy Cane, The
  Shocker — are melee/gadget items with no weapon-wheel stats in-game, so `stats: null`),
  **74/104** have `components` (the rest take no attachments). Stats sourced from
  [vespura.com/fivem/weapons](https://vespura.com/fivem/weapons/) with newer DLC guns filled from
  [gtabase.com](https://www.gtabase.com/grand-theft-auto-v/weapons/) (same 0–100 scale, verified
  identical on overlapping weapons); `dlc`, components + tints from
  [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps). All joined by
  `codename`. (gtabase-sourced stat entries have `maxAmmo: null`.)
  ```jsonc
  // GET api/weapons/index.json -> items[]
  { "id": "advancedrifle", "name": "Advanced Rifle", "codename": "weapon_advancedrifle",
    "hash": 2937143193, "category": "Rifle", "url": "…",
    "dlc": { "id": "TitleUpdate", "name": "Base Game", "releaseDate": "2013-09-17" },
    "stats": { "damage": 34, "fireRate": 70, "accuracy": 50, "range": 45, "maxAmmo": 250 },
    "components": [ { "id": "COMPONENT_AT_AR_SUPP", "label": "Suppressor", "hash": 2205435306, "default": false } ],
    "tints": [ { "index": 0, "label": "Black tint" } ] }
  ```
  Filter by DLC with either the stable `dlc.id` or the friendly `dlc.name`:
  ```js
  const cayo = items.filter(w => w.dlc?.id === 'mpheist4');          // by internal code
  const byUpdate = items.filter(w => w.dlc?.name === 'The Contract'); // by marketing name
  ```
- **Image URL** — build it directly or read `item.url`:
  ```
  https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/vehicles/images/{model_name}.webp
  https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/peds/images/{model_name}.webp
  https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/weapons/images/{File}-icon.png
  ```

### How weapon enrichment works

The weapons catalog is assembled at build time (`src/build/weapons.mjs`) by **left-joining
several independent sources onto one canonical key — the in-game `codename`** (e.g.
`weapon_advancedrifle`). Nothing is fetched at runtime; every join happens during `npm run build`
and is frozen into `api/weapons/index.json`.

1. **Catalog + identity** — the build walks the weapon icons in `assets/weapons/images/` and
   matches each to a curated entry in `src/data/weapons.json` by filename. That entry supplies
   the canonical `codename` and `category`; the `hash` is then computed locally as
   `joaat(codename)` (`src/lib/joaat.mjs`) — the same one-way hash the game uses. **Because every
   downstream join keys on `codename`, a wrong codename silently produces a wrong hash and breaks
   every join for that weapon — so codenames are verified against DurtyFree's hashes.**
2. **Stats (0–100 weapon-wheel)** — joined from `weapons.stats.json` (a
   [vespura](https://vespura.com/fivem/weapons/) snapshot). Newer DLC guns missing from that
   snapshot fall back to `weapons.stats.extra.json` ([gtabase](https://www.gtabase.com/grand-theft-auto-v/weapons/),
   verified to use the identical 0–100 scale). Weapons with no weapon-wheel stats in-game
   (melee/gadget) stay `stats: null`.
3. **`dlc`, `components`, `tints`** — joined from `weapons.components.json`, a lean snapshot
   distilled from [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps)
   (English labels only). DurtyFree is a superset of vespura's component coverage, so its
   components win when present; its `tints` and raw `DlcName` are applied to every weapon.
4. **DLC labels** — the raw `DlcName` code (e.g. `mpheist4`) is mapped to a friendly marketing
   name + launch date via `dlc.labels.json`, producing `dlc: { id, name, releaseDate }`. The same
   map is shared by the vehicles builder. Unknown codes fall back to the raw id as the name.

To refresh the DurtyFree-sourced snapshot (new DLC weapons, components, tints), regenerate
`weapons.components.json` from the upstream `weapons.json` dump and add any new DLC codes to
`dlc.labels.json`, then `npm run build`. The build logs per-field coverage
(`components: N/104, tints: N/104, dlc: N/104`) so regressions are visible.

### Quick start (JavaScript)

```js
import vehicles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/vehicles.js';

const all      = await vehicles.getItems();              // every vehicle
const sports   = await vehicles.byCategory('Sports');    // filter by category
const adder    = await vehicles.byId('adder');           // one item
const byHashed = await vehicles.byHash(1118611807);      // look up by joaat hash
const url      = await vehicles.imageUrl('adder');       // its image URL
const hits     = await vehicles.search('adder');         // fuzzy search -> [{ id, url, ... }]
const img      = hits[0]?.url;                            // the adder image

// DLC + release date
const tuners   = await vehicles.byDlc('mptuner');                  // by code OR name (case-insensitive)
const named    = await vehicles.byDlc('Los Santos Tuners');        // same result
const dlcs     = await vehicles.getDlcs();                         // [{ id, name, releaseDate }], oldest→newest
const recent   = (await vehicles.getItems())                       // released since 2023 (ISO dates sort lexically)
  .filter((v) => v.dlc?.releaseDate >= '2023-01-01');

// peds and weapons expose the same helpers — all three domains carry dlc
import weapons from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/weapons.js';
const ar    = await weapons.byId('assaultrifle_mk2');    // { hash: 961495388, codename, category, dlc, stats, ... }
const cayo  = await weapons.byDlc('The Cayo Perico Heist'); // weapons added in that DLC

import peds from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/peds.js';
const tunerPeds = await peds.byDlc('Los Santos Tuners');  // peds added in that DLC
```
(Peds added via technical title-update patches use a `dlc` like
`{ id: "patchday7ng", name: "Patch Day 7", releaseDate: null }` — name present, date unknown.)

### Search

This is a **static** API — there's no server, so there is no `?q=` endpoint. "Search" means
fetching a domain catalog once (one small JSON file) and filtering it. The client does this for
you with `search()` (ranked exact > prefix > substring > category); each result is a full item,
so `result.url` is the image.

```js
import vehicles from 'https://rendererrr.github.io/gtaDiscoveryApi/client/vehicles.js';
const [adder] = await vehicles.search('adder');
console.log(adder.url);   // the adder image URL

// search every flat domain at once
import discovery from 'https://rendererrr.github.io/gtaDiscoveryApi/client/index.js';
const { peds, vehicles: v, weapons } = await discovery.search('police');
```

No JavaScript? Fetch the catalog and filter it yourself:
`GET https://rendererrr.github.io/gtaDiscoveryApi/api/vehicles/index.json` → filter `items[]`
where `id`/`name`/`category` contains your query.

### Hash → name reverse lookup

Have a joaat hash (e.g. from a FiveM/Lua script) and want the name? Each flat domain ships a
**compact reverse-lookup map**, plus a **combined** one across all domains:

```
api/<domain>/hashes.json    # { hashes: { "<hash>": { id, name, category } } }
api/hashes.json             # { hashes: { "<hash>": { domain, id, name } } }   (all domains)
```

```jsonc
// GET api/vehicles/hashes.json
{ "hashes": { "3078201489": { "id": "adder", "name": "Adder", "category": "Super" } } }

// GET api/hashes.json   (resolve any hash, any domain)
{ "hashes": { "3078201489": { "domain": "vehicles", "id": "adder", "name": "Adder" } } }
```

```js
import vehicles from 'https://rendererrr.github.io/gtaDiscoveryApi/client/vehicles.js';
await vehicles.nameForHash(3078201489);   // 'Adder'  (loads the compact map, not the full catalog)

import discovery from 'https://rendererrr.github.io/gtaDiscoveryApi/client/index.js';
await discovery.byHash(3078201489);        // { domain: 'vehicles', id: 'adder', name: 'Adder' }
```

The reverse map covers everything with a `hash` (peds 848, vehicles 861, weapons 103, objects
21,634 — only the one weapon with an unknown codename is omitted; the combined `api/hashes.json`
is ~23.4k entries). Going the other way (name → hash) is already in the catalog: every item
carries its own `hash`.

### List by category or DLC (static endpoints)

Because the API is static (no query params), the build pre-generates one JSON file per category
and per DLC, so you can fetch exactly the slice you want instead of downloading the full catalog
and filtering. Available for **all three flat domains** — peds, vehicles and weapons — by
category **and** by DLC.

```
api/<domain>/by-category/index.json        # { groups: [{ name, slug, count, path }] }
api/<domain>/by-category/<slug>.json       # { group, count, items[] }   e.g. .../by-category/super.json
api/<domain>/by-dlc/index.json             # { groups: [{ id, name, releaseDate, slug, count, path }] }
api/<domain>/by-dlc/<slug>.json            # { group, count, items[] }    e.g. .../by-dlc/mptuner.json
```

The `slug` is a lowercased, hyphenated form of the category name or DLC code
(`Sports Classics` → `sports-classics`, `mp2023_02` → `mp2023-02`). The `by-dlc/index.json`
groups are sorted oldest → newest by `releaseDate`, so it doubles as a DLC timeline. Discover the
paths from the root: each domain descriptor in `api/index.json` carries `byCategory` and (where
applicable) `byDlc`.

```jsonc
// GET api/vehicles/by-dlc/mptuner.json
{ "group": { "id": "mptuner", "name": "Los Santos Tuners", "releaseDate": "2021-07-20", "count": 18 },
  "count": 18, "items": [ { "id": "comet5", "name": "Comet S2", ... }, ... ] }

// GET api/weapons/by-category/rifle.json
{ "group": { "name": "Rifle", "slug": "rifle", "count": 9 }, "count": 9, "items": [ ... ] }
```

```js
// fetch just one DLC's vehicles (no full-catalog download)
const tuners = await fetch(`${BASE}/api/vehicles/by-dlc/mptuner.json`).then((r) => r.json());
// list the available DLC slices (a release-ordered timeline)
const dlcs = await fetch(`${BASE}/api/vehicles/by-dlc/index.json`).then((r) => r.json());
```

The client helpers `byCategory()` / `byDlc()` / `getDlcs()` give the same results from the cached
full catalog; the static files above are for fetching a single slice directly (smaller payload,
cacheable per slice).

**Global listings (all categories / all DLCs at once).** Two top-level files aggregate across
every domain — linked from `api/index.json` → `endpoints`:

```
api/categories.json   # { domains: { peds:[…], vehicles:[…], weapons:[…] } }  — each entry { name, slug, count, path }
api/dlc.json          # { dlcs: [ { name, ids[], releaseDate, domains, paths, total } ] }  — release-ordered
```

`api/dlc.json` merges DLCs by **name**, so alias codes for the same update collapse into one row
— e.g. `Base Game` combines `TitleUpdate` (vehicles/weapons) + `basegame` (peds) and reports
`domains: { peds: 506, vehicles: 298, weapons: 38 }` with a `paths` map to each domain's slice. It
reads as a single GTA content timeline across cars, weapons and peds (patch-day ped additions have
`releaseDate: null` and sort last).

```jsonc
// GET api/dlc.json
{ "count": 59, "dlcs": [
  { "name": "Base Game", "ids": ["basegame","TitleUpdate"], "releaseDate": "2013-09-17",
    "domains": { "peds": 506, "vehicles": 298, "weapons": 38 }, "total": 842,
    "paths": { "vehicles": "api/vehicles/by-dlc/titleupdate.json", "...": "..." } },
  { "name": "Los Santos Tuners", "ids": ["mptuner"], "releaseDate": "2021-07-20",
    "domains": { "vehicles": 18 }, "total": 18, "paths": { "vehicles": "api/vehicles/by-dlc/mptuner.json" } }
] }
```

> **Future stats.** Each flat item reserves an optional `stats` object (vehicle stats, weapon
> stats). It's absent today; when stat data is added it merges in under `item.stats` keyed by the
> existing `id` — no URL or shape changes.

---

## Objects domain

A flat catalog of every GTA **object/prop model** (`prop_…`, `p_…`, map props, etc.). Two sources
joined by model name:

- **All objects** — 21,634 model names from
  [DurtyFree `ObjectList.ini`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/ObjectList.ini).
- **Curated objects** — 3,050 of them carry a friendly `name` and a `category` (71 categories like
  *Bags*, *Beach*, *Doors*, *Weaponry*), parsed from a hand-maintained list. These have
  `curated: true`; the rest have `name === id`, `category: null`, `curated: false`.

Objects have **no images** (so no `url`). `hash = joaat(id)`, like every other domain.

```jsonc
// GET api/objects/index.json   (compact — ~21.6k items; meta + categories[] + items[])
{ "count": 21634, "curatedCount": 3050,
  "items": [ { "id": "prop_beachball_01", "name": "Beach Ball", "hash": 1574107526,
               "category": "Beach", "curated": true },
             { "id": "apa_ch2_04_armco02", "name": "apa_ch2_04_armco02", "hash": 2291838436,
               "category": null, "curated": false } ] }
```

**List categories / list by category.** Same static layout as the other domains — covering the
71 curated categories (unknown objects aren't grouped; reach them via `index.json` or search):

```
api/objects/by-category/index.json     # { groups: [{ name, slug, count, path }] }  — list all categories
api/objects/by-category/<slug>.json    # { group, count, items[] }   e.g. .../by-category/weaponry.json
```

**Reverse hash lookup.** `api/objects/hashes.json` maps `joaat -> { id, name, category }` for all
21,634 objects, and they're also folded into the combined `api/hashes.json` (domain-tagged). So a
prop hash resolves either per-domain or globally:

```js
import objects from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/objects.js';
await objects.nameForHash(1574107526);   // 'Beach Ball'   (loads the compact hashes.json, not the 2.3 MB index)
await objects.byHash(1574107526);        // { id:'prop_beachball_01', name:'Beach Ball', category:'Beach', ... }
await objects.byId('prop_beachball_01'); // same item, by model name
await objects.byCategory('Weaponry');    // curated objects in that category
await objects.getCategories();           // the 71 categories

import discovery from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/index.js';
await discovery.byHash(1574107526);      // { domain:'objects', id:'prop_beachball_01', name:'Beach Ball' }
```

`objects` is the same flat client as the others, so `search()`, `getItems()` etc. all work; it's
left out of the default `discovery.search()` domains because its index is large — opt in with
`discovery.search('door', { domains: ['objects'] })`.

---

## Explosions domain

The 88 GTA explosion types from
[DurtyFree `explosionTypesCompact.json`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/explosionTypesCompact.json),
given friendly names and sorted into **9 categories** (Vehicle Weapons, Environment, Aircraft
Bombs, Thrown, Vehicles, Firearms & Ammo, Mines, Launchers, Naval). No images.

```jsonc
// GET api/explosions/index.json -> items[]
{ "index": 47, "id": "grenade", "name": "Grenade", "category": "Thrown",
  "tag": "EXP_TAG_GRENADE", "hash": 2323771015 }
```

| Field | Meaning |
|---|---|
| `hash` | `joaat(tag)` — **the stable identifier to use in scripts** (survives game updates) |
| `tag` | the raw `EXP_TAG_…` string |
| `id` | clean slug (`grenade`, `vehiclemine_kinetic`) |
| `name` | friendly name (`Grenade`, `Vehicle Mine Kinetic`) |
| `category` | one of the 9 groups |
| `index` | catalog position (0-based) |

> **Heads-up on `index`:** DurtyFree ships this list **alphabetical with no game integer**, because
> the real `ADD_EXPLOSION` enum value shifts between game versions — so `index` here is a *catalog*
> position, **not** the in-game explosionType integer. The reliable cross-version reference is
> `hash` (and `tag`). If you specifically need the live enum integers, say so and I'll source them
> from an authoritative native reference.

Same endpoints + client as every flat domain — list categories, list by category, reverse hash:
```
api/explosions/by-category/index.json     # list all 9 categories
api/explosions/by-category/<slug>.json    # e.g. .../by-category/mines.json
api/explosions/hashes.json                # reverse joaat -> { id, name, category }
```
```js
import explosions from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/explosions.js';
await explosions.byCategory('Mines');     // all mine-type explosions
await explosions.byHash(2323771015);      // → Grenade
await explosions.getCategories();         // the 9 categories
```

---

## Particles domain

Every GTA **particle (PTFX) effect** from
[DurtyFree `particleEffectsCompact.json`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/particleEffectsCompact.json):
**2,907 effects across 360 dictionaries**. A particle is used as a **(dict, effect) pair** —
`REQUEST_NAMED_PTFX_ASSET(dict)` then `START_PARTICLE_FX_LOOPED_AT_COORD(effect, …)` — so there's
**no joaat hash**; identity is the pair. The **dictionary is the category** (it's the asset you
load). A curated **81** effects carry a friendly `name` (`curated: true`); the rest have
`name === effect`.

```jsonc
// GET api/particles/index.json   (compact; meta + categories[] + items[])
{ "count": 2907, "curatedCount": 81, "dictionaryCount": 360,
  "items": [ { "id": "scr_rcbarry2/scr_clown_appears", "name": "Purple Cloud 1",
               "dict": "scr_rcbarry2", "effect": "scr_clown_appears",
               "category": "scr_rcbarry2", "curated": true },
             { "id": "core/bang_snow", "name": "bang_snow", "dict": "core",
               "effect": "bang_snow", "category": "core", "curated": false } ] }
```

**List categories / list by category** — the category is the dictionary:
```
api/particles/by-category/index.json      # list ALL 360 dictionaries { name, slug, count, path }
api/particles/by-category/<slug>.json     # every effect in a dictionary  e.g. .../by-category/scr_rcbarry2.json
```
```js
import particles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/particles.js';
await particles.getCategories();              // all 360 dictionaries
await particles.byCategory('scr_rcbarry2');   // every effect in that dictionary
await particles.byId('core/ent_sht_flame');   // one effect
await particles.search('firework');           // fuzzy over names + effect strings
```
(No hash, so `byHash`/`nameForHash` don't apply here — reference effects by their dict + effect
strings.)

---

## Animations domain

An animation is a **(dict, anim) pair** — `REQUEST_ANIM_DICT(dict)` then
`TASK_PLAY_ANIM(dict, anim, …)`. No images, no joaat hash. This domain has two halves:

**1. Curated** — **204** animations with friendly names, in **6 categories** (Dance, Gestures,
Common, Idle, Animal, Bike Tricks), from a hand-maintained list (`animationList.cpp`). This is
the browsable catalog at `index.json`, with the usual `by-category` slices:
```jsonc
// GET api/animations/index.json -> items[]
{ "id": "anim@mp_player_intcelebrationmale@thumbs_up/thumbs_up", "name": "Thumbs Up",
  "dict": "anim@mp_player_intcelebrationmale@thumbs_up", "anim": "thumbs_up",
  "category": "Gestures", "curated": true }
```
```
api/animations/by-category/index.json     # list the 6 curated categories
api/animations/by-category/<slug>.json    # e.g. .../by-category/dance.json
```

**2. Full list** — the complete **269,414 animations across 20,179 dictionaries** from
[DurtyFree `animDictsCompact.json`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/animDictsCompact.json).
Too large to inline in `index.json`, so it's served as two files (linked from `index.json` →
`full`):
```
api/animations/dictionaries.json   # { dictionaries: [ { dict, count } ] }  — every dictionary name (≈94 KB gz)
api/animations/all.json            # { dictionaries: [ { dict, animations: [...] } ] }  — everything (≈0.8 MB gz)
```

```js
import animations from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/animations.js';
// curated
await animations.byCategory('Dance');          // curated dances
await animations.getCategories();              // the 6 curated categories
// full list
await animations.getDictionaries();            // [{ dict, count }] for all 20,179 dictionaries
await animations.byDictionary('missheist');    // every anim name in a dictionary (loads all.json once, cached)
```

---

## Bones domains

Two skeleton/rig domains, each categorized with friendly display names. No images.

### Ped bones (`pedbones`)
98 ped skeleton bones in **9 body regions** (Face, Left/Right Arm, Left/Right Hand, Left/Right Leg,
Spine & Root, Head & Neck). Each carries `boneId` — the bone tag used with `GET_PED_BONE_INDEX`
(this is **not** a joaat hash, so it has its own reverse map rather than `hashes.json`).
```jsonc
// GET api/pedbones/index.json -> items[]
{ "id": "SKEL_Head", "name": "Head", "boneId": 31086, "type": "Skeleton", "category": "Head & Neck" }
```
```
api/pedbones/by-category/index.json   # list the 9 body regions
api/pedbones/by-category/<slug>.json  # bones in a region  e.g. .../left-hand.json
api/pedbones/byid.json                # reverse boneId -> { id, name, category }
```
```js
import pedbones from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/pedbones.js';
await pedbones.byId('SKEL_Head');     // the bone by name
await pedbones.byBoneId(31086);       // reverse: → { id:'SKEL_Head', name:'Head', category:'Head & Neck' }
await pedbones.byCategory('Left Hand');
```

### Vehicle bones (`vehiclebones`)
449 vehicle bones in **13 categories** (Seats, Windows & Glass, Doors & Roof, Wheels & Suspension,
Lights, Sirens, Weapons, Engine & Drivetrain, Aircraft, Boat, Body, Industrial & Special, Misc).
Each carries `hash = joaat(id)` — what `GET_ENTITY_BONE_INDEX_BY_NAME` resolves — so reverse hash
lookup works (per-domain `hashes.json` and the combined `api/hashes.json`).
```jsonc
// GET api/vehiclebones/index.json -> items[]
{ "id": "seat_dside_f", "name": "Seat Driver Front", "hash": 3570590826, "category": "Seats" }
```
```js
import vehiclebones from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/vehiclebones.js';
await vehiclebones.byId('wheel_lf');                 // { name:'Wheel Left Front', hash, category }
await vehiclebones.byHash(3570590826);               // reverse → seat_dside_f
await vehiclebones.byCategory('Wheels & Suspension');
```

---

## Repository layout

```
.nojekyll                      # lets GitHub Pages serve _-prefixed files (don't delete)
regenerate.bat                 # double-click rebuild (jsDelivr); regenerate-pages.bat for Pages
assets/<domain>/...            # raw images (jsDelivr serves these directly)
api/index.json                 # discovery root
api/<domain>/...               # generated JSON per domain
src/
  config.mjs                   # base URL target (jsDelivr/Pages/custom) — single source of truth
  data/                        # build inputs (see "How weapon enrichment works"):
                               #   peds/vehicles/weapons.json (curated codename refs)
                               #   weapons.stats.json (vespura) + weapons.stats.extra.json (gtabase)
                               #   weapons.components.json (DurtyFree: dlc + components + tints)
                               #   vehicles.handling.json (DurtyFree performance)
                               #   vehicles.details.json (DurtyFree: manufacturer/seats/doors/colors/…)
                               #   vehicles.dlc.json / peds.dlc.json (DurtyFree: model -> DLC code)
                               #   dlc.labels.json (DLC code -> { name, releaseDate }; shared)
                               #   objects.all.json (DurtyFree ObjectList.ini: all object names)
                               #   objects.curated.json (curated objects: name + category, 71 cats)
                               #   explosions.json (DurtyFree explosion tags: name + category, 9 cats)
                               #   particles.all.json (DurtyFree PTFX: all effects by dict)
                               #   particles.curated.json (curated effects: friendly names)
                               #   animations.all.json (DurtyFree: all anims by dictionary)
                               #   animations.curated.json (curated anims: name + category)
                               #   pedbones.json (ped bones: name + boneId + category)
                               #   vehiclebones.json (vehicle bones: name + hash + category)
  lib/fs.mjs                   # shared fs helpers (folder-derived domains)
  lib/joaat.mjs                # GTA joaat hash
  lib/catalog.mjs              # shared writer for flat domains (+ slugify, groupings)
  build/index.mjs              # orchestrator: runs each domain, writes api/index.json + global lists
  build/clothing.mjs           # clothing builder (CATEGORY_MAP lives here)
  build/peds.mjs               # peds builder
  build/vehicles.mjs           # vehicles builder
  build/weapons.mjs            # weapons builder (matches icons to src/data/weapons.json)
  build/objects.mjs            # objects builder (joins ObjectList.ini + curated categories)
  build/explosions.mjs         # explosions builder (categorized explosion types)
  build/particles.mjs          # particles builder (effects grouped by dictionary)
  build/animations.mjs         # animations builder (curated + full dictionary list)
  build/pedbones.mjs           # ped bones builder (boneId reverse map)
  build/vehiclebones.mjs       # vehicle bones builder (joaat hashes)
client/
  index.js                     # discovery + namespaced domain helpers
  clothing.js                  # clothing helpers
  objects.js                   # objects helpers (byHash/nameForHash/byCategory)
  explosions.js                # explosions helpers (byHash/byCategory)
  particles.js                 # particles helpers (byCategory/byId, by dictionary)
  animations.js                # animations helpers (curated byCategory + getDictionaries/byDictionary)
  pedbones.js                  # ped bones helpers (byCategory/byBoneId)
  vehiclebones.js              # vehicle bones helpers (byCategory/byHash)
  _flat.js                     # shared flat-domain client factory
  peds.js  vehicles.js  weapons.js
```

## Rebuilding

After adding/removing images under `assets/`, regenerate all JSON:

```bash
npm run build   # node src/build/index.mjs
```

Folder → component-ID mapping for clothing lives in the `CATEGORY_MAP` at the top of `src/build/clothing.mjs`.

## Hosting & base URL

The API can be served two ways, and the base URL baked into the generated JSON (image `url`s,
`meta.cdnBase`) is configurable:

| Target | Base URL | Build command |
|--------|----------|---------------|
| **jsDelivr** (default) | `https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main` | `npm run build` |
| **GitHub Pages** | `https://rendererrr.github.io/gtaDiscoveryApi` | `npm run build:pages` |
| **Custom / domain** | whatever you pass | `API_BASE_URL=https://my.cdn node src/build/index.mjs` |

On Windows you can double-click `regenerate.bat` (jsDelivr) or `regenerate-pages.bat` (Pages).

### GitHub Pages

**Enable it:**

1. (Optional, for self-contained URLs) run `regenerate-pages.bat` / `npm run build:pages`, so the
   image `url`s in the JSON point at Pages instead of jsDelivr.
2. Commit and push to `main` (this includes `.nojekyll`, `api/`, `assets/`, `client/`).
3. On GitHub: **Settings → Pages → Build and deployment → Source: _Deploy from a branch_**,
   pick **`main`** + **`/ (root)`**, Save.
4. Wait ~1 min for the first deploy. The site is then live at
   `https://rendererrr.github.io/gtaDiscoveryApi/` and every file is reachable, e.g.
   `…/api/vehicles/index.json` and `…/assets/vehicles/images/adder.webp`.

It works out of the box — the repo is all static files. Two notes:

- **`.nojekyll`** (included) disables Jekyll so files like `client/_flat.js` (leading `_`) are
  actually published. Don't delete it.
- The **client is self-locating**: `client/*.js` resolve the API root from their own URL
  (`import.meta.url`), so importing them from your Pages domain makes them fetch the catalogs
  from Pages automatically — no config needed.

  ```js
  import vehicles from 'https://rendererrr.github.io/gtaDiscoveryApi/client/vehicles.js';
  const adder = await vehicles.byId('adder');   // fetches from the Pages origin
  ```

- For a **fully self-contained Pages deployment** (no jsDelivr dependency, image `url`s point at
  Pages too), build with `npm run build:pages` before pushing. Otherwise the catalogs are served
  from Pages but the embedded image URLs still resolve via jsDelivr (also fine — both are backed
  by this repo).

> Heads-up: Pages has soft limits (~1 GB repo, 100 GB/month bandwidth) and this repo is ~460 MB
> of images. jsDelivr has no such limits and a faster CDN, so it's the better backend for the
> actual image files even if you host the site on Pages.

## Adding a new domain (vehicles, peds, …)

Full step-by-step guide with a worked example and a builder template: **[docs/ADDING_A_DOMAIN.md](./docs/ADDING_A_DOMAIN.md)**. In short:

1. Drop the raw files under `assets/<domain>/`.
2. Create `src/build/<domain>.mjs` exporting `DOMAIN`, `LABEL`, and an async
   `build({ assetsDir, apiDir, log })` that writes `api/<domain>/...` and returns
   a descriptor `{ domain, label, index, ... }`.
3. Import it and add it to the `DOMAINS` array in `src/build/index.mjs`.
4. (Optional) add `client/<domain>.js` helpers and re-export them from `client/index.js`.
5. `npm run build`.

Existing domains and their URLs are unaffected.

## Credits

- Per-texture `.webp` sets (masks, legs, shoes, accessories, undershirts, tops) originally collected by [ShortByte / Enneken Solutions](https://github.com/ShortByte/GTA5-Cloth-Assets).
- Per-drawable previews (hair, torsos, bags, armor, decals, and all props) sourced from the [RAGE Multiplayer Wiki](https://wiki.rage.mp/wiki/Clothes).
- Ped & vehicle images sourced from the [FiveM docs image archive](https://docs.fivem.net/).
- Weapon stats from [vespura.com/fivem/weapons](https://vespura.com/fivem/weapons/) (snapshot in `src/data/weapons.stats.json`), with newer DLC guns supplemented from [gtabase.com](https://www.gtabase.com/grand-theft-auto-v/weapons/) (`src/data/weapons.stats.extra.json`). Weapon DLC, components & tints from [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps) (snapshot in `src/data/weapons.components.json`; DLC code→name map in `src/data/dlc.labels.json`).
- Vehicle performance stats from [DurtyFree/gta-v-data-dumps](https://github.com/DurtyFree/gta-v-data-dumps) (snapshot in `src/data/vehicles.handling.json`). Vehicle DLC tags from the same dump (`src/data/vehicles.dlc.json`); DLC names & launch dates in `src/data/dlc.labels.json` (cross-checked against [gtacars.net](https://gtacars.net/gta5)).
- Object/prop model list from [DurtyFree `ObjectList.ini`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/ObjectList.ini) (`src/data/objects.all.json`); curated object display names + categories in `src/data/objects.curated.json`.
- Explosion types from [DurtyFree `explosionTypesCompact.json`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/explosionTypesCompact.json), categorized with friendly names in `src/data/explosions.json`.
- Particle (PTFX) effects from [DurtyFree `particleEffectsCompact.json`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/particleEffectsCompact.json) (`src/data/particles.all.json`); curated friendly names in `src/data/particles.curated.json`.
- Animations from [DurtyFree `animDictsCompact.json`](https://github.com/DurtyFree/gta-v-data-dumps/blob/master/animDictsCompact.json) (`src/data/animations.all.json`); curated names + categories in `src/data/animations.curated.json`.
- Ped & vehicle bone lists curated with categories + friendly names in `src/data/pedbones.json` and `src/data/vehiclebones.json`.

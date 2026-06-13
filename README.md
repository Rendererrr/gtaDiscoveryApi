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
| vehicles | spawn name          | `joaat(model_name)`                 | `.webp`      | —                       |
| weapons  | weapon id           | `joaat(codename)` (or `null`)       | `.png`       | `codename`              |

- **`hash`** is GTA's joaat (Jenkins-one-at-a-time) hash — the same value the game/FiveM uses.
  For vehicles it is computed from the model name and matches the official hashes; for weapons it
  is computed from the internal `codename` (e.g. `weapon_assaultrifle`). A weapon whose codename
  is unknown gets `hash: null` (currently only "Acid Package").
- **Image URL** — build it directly or read `item.url`:
  ```
  https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/vehicles/images/{model_name}.webp
  https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/peds/images/{model_name}.webp
  https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/weapons/images/{File}-icon.png
  ```

### Quick start (JavaScript)

```js
import vehicles from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/vehicles.js';

const all      = await vehicles.getItems();              // every vehicle
const sports   = await vehicles.byCategory('Sports');    // filter by category
const adder    = await vehicles.byId('adder');           // one item
const byHashed = await vehicles.byHash(1118611807);      // look up by joaat hash
const url      = await vehicles.imageUrl('adder');       // its image URL

// peds and weapons expose the same helpers
import weapons from 'https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/client/weapons.js';
const ar = await weapons.byId('assaultrifle_mk2');       // { hash: 961495388, codename, category, url }
```

> **Future stats.** Each flat item reserves an optional `stats` object (vehicle stats, weapon
> stats). It's absent today; when stat data is added it merges in under `item.stats` keyed by the
> existing `id` — no URL or shape changes.

---

## Repository layout

```
assets/<domain>/...            # raw images (jsDelivr serves these directly)
api/index.json                 # discovery root
api/<domain>/...               # generated JSON per domain
src/
  config.mjs                   # GH owner/repo/branch -> CDN base (single source of truth)
  data/                        # build inputs for flat domains (peds.json, vehicles.json, weapons.json)
  lib/fs.mjs                   # shared fs helpers (folder-derived domains)
  lib/joaat.mjs                # GTA joaat hash
  lib/catalog.mjs              # shared writer for flat domains
  build/index.mjs              # orchestrator: runs each domain, writes api/index.json
  build/clothing.mjs           # clothing builder (CATEGORY_MAP lives here)
  build/peds.mjs               # peds builder
  build/vehicles.mjs           # vehicles builder
  build/weapons.mjs            # weapons builder (matches icons to src/data/weapons.json)
client/
  index.js                     # discovery + namespaced domain helpers
  clothing.js                  # clothing helpers
  _flat.js                     # shared flat-domain client factory
  peds.js  vehicles.js  weapons.js
```

## Rebuilding

After adding/removing images under `assets/`, regenerate all JSON:

```bash
npm run build   # node src/build/index.mjs
```

Folder → component-ID mapping for clothing lives in the `CATEGORY_MAP` at the top of `src/build/clothing.mjs`.

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

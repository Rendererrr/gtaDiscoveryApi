# GTA Discovery API

A **static JSON API** for GTA 5 / FiveM game assets, served straight from the [jsDelivr](https://www.jsdelivr.com/) CDN — no server, no rate limits, free hosting on GitHub.

The API is split into **domains**. Today there is one — **clothing** (clothes + props). Vehicles, peds and more are planned and slot in alongside it without disturbing the existing endpoints.

```
api/index.json                 # discovery root — lists every domain
api/<domain>/index.json        # one domain's catalog
assets/<domain>/...            # the raw images for that domain
```

## Domains

| Domain   | Contents                          | Catalog                          |
|----------|-----------------------------------|----------------------------------|
| clothing | Clothes + props (16 components)   | [`api/clothing/index.json`](./api/clothing/index.json) |

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

## Repository layout

```
assets/<domain>/...            # raw images (jsDelivr serves these directly)
api/index.json                 # discovery root
api/<domain>/...               # generated JSON per domain
src/
  config.mjs                   # GH owner/repo/branch -> CDN base (single source of truth)
  lib/fs.mjs                   # shared filesystem helpers
  build/index.mjs              # orchestrator: runs each domain, writes api/index.json
  build/clothing.mjs           # clothing domain builder (CATEGORY_MAP lives here)
client/
  index.js                     # discovery + namespaced domain helpers
  clothing.js                  # clothing helpers
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

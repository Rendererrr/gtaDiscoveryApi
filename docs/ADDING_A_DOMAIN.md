# Adding a new domain to the GTA Discovery API

This guide walks through adding a brand-new data domain (e.g. **vehicles**, **peds**, **weapons**) to the API. The repo is built so a new domain **never touches existing endpoints** — you drop assets, add one builder module, register it, and rebuild.

> The generic walkthrough below is framed around a hypothetical domain. Swap the name for
> whatever you're adding.

## Two domain shapes (copy the closest one)

There are already real, working examples of both shapes — start by copying the closest:

- **Metadata-driven flat** — one image per item keyed by an id, with per-item metadata
  (peds, vehicles, weapons). Reuse `src/lib/catalog.mjs` (`writeFlatDomain`, `listImages`,
  `fileExists`, `summariseCategories`) and copy **`src/build/vehicles.mjs`** as the template.
  Source metadata lives in `src/data/<domain>.json`. This is almost certainly the shape you
  want for a new GTA data set. Client: copy `client/vehicles.js` (built on `client/_flat.js`).
- **Folder-derived** — the catalog is generated from the `assets/` folder tree (clothing's
  category/gender/drawable/texture). Copy **`src/build/clothing.mjs`** and reuse `src/lib/fs.mjs`.

`src/lib/joaat.mjs` gives you GTA's `joaat(name)` hash if your items are keyed by model/codename.

---

## The mental model

The API is just files in this repo served by jsDelivr. The build is a fan-out:

```
src/build/index.mjs   (orchestrator)
        │  runs every registered domain builder
        ├── src/build/clothing.mjs  → writes api/clothing/...  → returns a descriptor
        └── src/build/vehicles.mjs  → writes api/vehicles/...  → returns a descriptor
        │
        └── collects descriptors → writes api/index.json (discovery root)
```

Each domain owns:
- `assets/<domain>/...` — its raw images
- `api/<domain>/...` — its generated JSON
- `src/build/<domain>.mjs` — its builder
- `client/<domain>.js` — (optional) its fetch helpers

Nothing about clothing's URLs or files changes when you add a domain.

---

## Step 1 — Put the raw files on disk

Create `assets/<domain>/` and lay out the images however suits the domain. You decide the internal structure — the builder you write is the only thing that has to understand it.

```
assets/vehicles/<class>/<modelId>/<liveryId>.webp
```

> Keep file/folder names URL-safe (no spaces). Reuse the existing `.webp`/`.jpg`/`.png` convention so the shared helpers in `src/lib/fs.mjs` work as-is.

If a domain has no per-image variants, a flat `assets/vehicles/<modelId>.webp` is fine too — the builder defines the meaning.

## Step 2 — Write the builder module

Create `src/build/<domain>.mjs`. It must export:

- `DOMAIN` — the folder/url slug (e.g. `'vehicles'`)
- `LABEL` — a human label (e.g. `'Vehicles'`)
- `build({ assetsDir, apiDir, log })` — async; writes `api/<domain>/...` and **returns a descriptor** for the discovery root.

Minimal template:

```js
// src/build/vehicles.mjs
import { readdir, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { CDN_BASE, baseMeta } from '../config.mjs';
import { isDir } from '../lib/fs.mjs';

export const DOMAIN = 'vehicles';
export const LABEL = 'Vehicles';

export async function build({ assetsDir, apiDir, log = console.log }) {
  const domainAssets = join(assetsDir, DOMAIN);   // assets/vehicles
  const domainApi = join(apiDir, DOMAIN);         // api/vehicles

  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const catalog = [];
  let itemCount = 0;

  for (const entry of (await readdir(domainAssets)).sort()) {
    const dir = join(domainAssets, entry);
    if (!(await isDir(dir))) continue;

    // ...scan `dir`, build URLs like:
    //   `${CDN_BASE}/assets/${DOMAIN}/${entry}/${file}`
    // ...write a per-item file: api/vehicles/<id>.json
    // ...push a light entry into `catalog`
    itemCount++;
  }

  // Domain catalog
  const meta = { ...baseMeta(), domain: DOMAIN, label: LABEL };
  await writeFile(join(domainApi, 'index.json'),
    JSON.stringify({ meta, items: catalog }, null, 2), 'utf-8');

  log(`Done ${DOMAIN}: ${itemCount} items.`);

  // Descriptor the orchestrator puts into api/index.json
  return {
    domain: DOMAIN,
    label: LABEL,
    itemCount,
    index: `api/${DOMAIN}/index.json`,
  };
}
```

> **Reuse what's there.** `src/lib/fs.mjs` already has `isDir`, `numericSort`, `readDrawable`, and `readDrawables` (the drawable/texture folder pattern). If your domain looks like clothing (numeric folders of image variants), call `readDrawables(dir, urlPath, CDN_BASE)` instead of rolling your own.
>
> **Always build URLs from `CDN_BASE`** (imported from `src/config.mjs`) — never hardcode the owner/repo. That's what makes a repo/branch move a one-line change.

### Descriptor contract

The object you return is what shows up in `api/index.json`. Required keys:

| Key      | Meaning                                            |
|----------|----------------------------------------------------|
| `domain` | url slug, must equal `DOMAIN`                       |
| `label`  | human label                                        |
| `index`  | repo-relative path to the domain's `index.json`    |

Add any extra counts you like (`itemCount`, `drawableCount`, …) — consumers just read them.

## Step 3 — Register the builder

In `src/build/index.mjs`, import the module and add it to the `DOMAINS` array:

```js
import * as clothing from './clothing.mjs';
import * as vehicles from './vehicles.mjs';   // NEW

const DOMAINS = [
  clothing,
  vehicles,                                    // NEW
];
```

That's the only edit to the orchestrator. It will run your builder and fold your descriptor into `api/index.json` automatically.

## Step 4 — (Optional) add a client helper

Create `client/<domain>.js` with fetch helpers (copy the shape of `client/clothing.js`), then re-export it from `client/index.js`:

```js
import * as vehicles from './vehicles.js';     // NEW
export { clothing, vehicles };
export default { getDomains, clothing, vehicles };
```

## Step 5 — Build and verify

```bash
npm run build
```

Check:

```bash
# discovery root now lists your domain
node -e "console.log(require('./api/index.json').domains.map(d=>d.domain))"

# your domain's catalog exists
cat api/vehicles/index.json

# a generated URL points at THIS repo + your domain
node -e "console.log(require('./api/vehicles/index.json').items[0])"
```

A URL should read:

```
https://cdn.jsdelivr.net/gh/Rendererrr/gtaDiscoveryApi@main/assets/vehicles/...
```

## Step 6 — Document it

- Add a row to the **Domains** table in `README.md`.
- If the domain has its own ID scheme (like clothing's component IDs), add a short table for it under a `## <Domain> domain` heading.

---

## Checklist

- [ ] `assets/<domain>/...` added
- [ ] `src/build/<domain>.mjs` exports `DOMAIN`, `LABEL`, `build()`
- [ ] URLs built from `CDN_BASE`, not hardcoded
- [ ] Registered in `DOMAINS` in `src/build/index.mjs`
- [ ] (optional) `client/<domain>.js` + re-export from `client/index.js`
- [ ] `npm run build` clean; `api/index.json` lists the domain
- [ ] README updated

---

## Conventions worth keeping

- **One source of truth for the repo location:** `src/config.mjs`. Never paste `cdn.jsdelivr.net/gh/...` literals into builders.
- **Idempotent builds:** each builder `rm`s its own `api/<domain>` dir first, so rebuilds are clean and never leak stale files.
- **Domains are isolated:** a builder only reads `assets/<its-domain>` and only writes `api/<its-domain>`. Don't reach across domains.
- **Static only:** there's no server. Everything a consumer needs must end up as a committed file under `api/` or `assets/`.

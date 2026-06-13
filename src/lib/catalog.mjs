// Shared writer for "flat" domains (peds, vehicles, weapons): one served image
// per item plus light per-item metadata, emitted as a single api/<domain>/index.json.
//
// Item shape (per domain, extra fields allowed — passed through verbatim):
//   { id, name, hash, category, url, ... , stats? }
// `stats` is reserved for future per-item stats (vehicle/weapon stats); items
// are written as-is, so adding it later needs no change here.

import { readdir, writeFile, mkdir, rm, stat } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';

// Summarise items into a sorted [{ name, count }] list of categories.
export function summariseCategories(items) {
  const counts = new Map();
  for (const it of items) {
    const c = it.category ?? 'Uncategorized';
    counts.set(c, (counts.get(c) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

// URL/file-safe slug (e.g. "Sports Classics" -> "sports-classics").
export function slugify(s) {
  return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'unknown';
}

// Write one sub-listing folder: api/<domain>/<sub>/<slug>.json per group, plus
// an index.json listing the groups. `groups` is [{ key, slug, label, extra, items }].
async function writeGrouping({ domainApi, domain, sub, meta, groups, log }) {
  if (!groups.length) return null;
  const dir = join(domainApi, sub);
  await mkdir(dir, { recursive: true });

  const listed = [];
  for (const g of groups) {
    await writeFile(
      join(dir, `${g.slug}.json`),
      JSON.stringify({ meta, group: { ...g.extra, key: g.key, slug: g.slug, count: g.items.length }, count: g.items.length, items: g.items }, null, 2),
      'utf-8',
    );
    listed.push({ ...g.extra, key: g.key, slug: g.slug, count: g.items.length, path: `api/${domain}/${sub}/${g.slug}.json` });
  }
  await writeFile(
    join(dir, 'index.json'),
    JSON.stringify({ meta, count: listed.length, groups: listed }, null, 2),
    'utf-8',
  );
  log(`  ${sub}: ${listed.length} groups written.`);
  return `api/${domain}/${sub}/index.json`;
}

// True if a file exists at `path`.
export async function fileExists(path) {
  try { await stat(path); return true; } catch { return false; }
}

// List image files (by extension) in a directory, sorted.
export async function listImages(dir, ext) {
  const re = new RegExp(`\\.${ext}$`, 'i');
  return (await readdir(dir)).filter((f) => re.test(f)).sort();
}

// Writes api/<domain>/index.json and returns the discovery-root descriptor.
export async function writeFlatDomain({ apiDir, domain, label, urlPattern, note, items, log = console.log }) {
  const domainApi = join(apiDir, domain);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const categories = summariseCategories(items);
  const meta = { ...baseMeta(), domain, label, urlPattern, note };

  await writeFile(
    join(domainApi, 'index.json'),
    JSON.stringify({ meta, categories, count: items.length, items }, null, 2),
    'utf-8',
  );

  // Compact hash -> { id, name, category } reverse-lookup map, for consumers who
  // have a joaat hash and just want the name. Items without a hash are skipped.
  const hashes = {};
  let withHash = 0;
  for (const it of items) {
    if (it.hash == null) continue;
    hashes[it.hash] = { id: it.id, name: it.name, category: it.category };
    withHash++;
  }
  await writeFile(
    join(domainApi, 'hashes.json'),
    JSON.stringify({ meta, count: withHash, hashes }, null, 2),
    'utf-8',
  );

  // Pre-generated "list by …" groupings (static API has no query params).
  // by-category: every flat domain. by-dlc: only domains whose items carry dlc.
  const catGroups = categories.map(({ name }) => ({
    key: name,
    slug: slugify(name),
    label: name,
    extra: { name },
    items: items.filter((it) => (it.category ?? 'Uncategorized') === name),
  }));

  const dlcMap = new Map(); // id -> { dlc, items }
  for (const it of items) {
    if (!it.dlc) continue;
    if (!dlcMap.has(it.dlc.id)) dlcMap.set(it.dlc.id, { dlc: it.dlc, items: [] });
    dlcMap.get(it.dlc.id).items.push(it);
  }
  const dlcGroups = [...dlcMap.values()]
    .sort((a, b) => (a.dlc.releaseDate ?? '').localeCompare(b.dlc.releaseDate ?? ''))
    .map(({ dlc, items: gi }) => ({
      key: dlc.id,
      slug: slugify(dlc.id),
      label: dlc.name,
      extra: { id: dlc.id, name: dlc.name, releaseDate: dlc.releaseDate ?? null },
      items: gi,
    }));

  const byCategory = await writeGrouping({ domainApi, domain, sub: 'by-category', meta, groups: catGroups, log });
  const byDlc = await writeGrouping({ domainApi, domain, sub: 'by-dlc', meta, groups: dlcGroups, log });

  log(`Done ${domain}: ${items.length} items across ${categories.length} categories (${withHash} hashed).`);

  return {
    domain,
    label,
    itemCount: items.length,
    categoryCount: categories.length,
    index: `api/${domain}/index.json`,
    hashes: `api/${domain}/hashes.json`,
    ...(byCategory ? { byCategory } : {}),
    ...(byDlc ? { byDlc } : {}),
  };
}

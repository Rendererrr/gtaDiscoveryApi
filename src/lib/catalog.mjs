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

  log(`Done ${domain}: ${items.length} items across ${categories.length} categories.`);

  return {
    domain,
    label,
    itemCount: items.length,
    categoryCount: categories.length,
    index: `api/${domain}/index.json`,
  };
}

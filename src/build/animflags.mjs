// Animation flags domain builder.
//
// GTA scripted animation flags (eScriptedAnimFlags) used with TASK_PLAY_ANIM etc.
// Two lists, both in index.json (no joaat hash, no images, no categories):
//   flags   — the 31 individual bit flags (id = AF_* enum name, value = bit, bit = index)
//   presets — curated friendly combinations; each value is the bitwise OR of its
//             member flags, computed here (not trusted from source comments).
// Curated in src/data/animflags.json.

import { readFile, writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { baseMeta } from '../config.mjs';

export const DOMAIN = 'animflags';
export const LABEL = 'Animation Flags';

const ROOT = join(import.meta.dirname, '..', '..');
const SRC = JSON.parse(await readFile(join(ROOT, 'src', 'data', 'animflags.json'), 'utf-8'));

export async function build({ apiDir, log = console.log }) {
  const valueById = new Map(SRC.flags.map((f) => [f.id, f.value]));

  const flags = SRC.flags.map((f) => {
    if ((f.value & (f.value - 1)) !== 0 || f.value === 0) {
      throw new Error(`animflags: ${f.id} value ${f.value} is not a single power-of-two bit`);
    }
    return { id: f.id, name: f.name, value: f.value, bit: Math.log2(f.value) };
  });

  const presets = SRC.presets.map((p) => {
    let value = 0;
    for (const id of p.flags) {
      if (!valueById.has(id)) throw new Error(`animflags: preset "${p.name}" references unknown flag ${id}`);
      value |= valueById.get(id);
    }
    return { name: p.name, value: value >>> 0, flags: p.flags };
  });

  const domainApi = join(apiDir, DOMAIN);
  await rm(domainApi, { recursive: true, force: true });
  await mkdir(domainApi, { recursive: true });

  const meta = {
    ...baseMeta(), domain: DOMAIN, label: LABEL,
    note: 'Scripted animation flags (eScriptedAnimFlags) for TASK_PLAY_ANIM etc. `flags` = the 31 individual bit flags (id = AF_* enum name, value = bit, bit = bit index). `presets` = curated friendly combinations; value = bitwise OR of member flags (computed). No joaat hash, no images, no categories. Build a value by OR-ing flag values, or pick a preset.',
  };

  await writeFile(
    join(domainApi, 'index.json'),
    JSON.stringify({ meta, flagCount: flags.length, presetCount: presets.length, flags, presets }, null, 2),
    'utf-8',
  );

  log(`  ${flags.length} flags + ${presets.length} presets.`);
  log(`Done ${DOMAIN}: ${flags.length} flags, ${presets.length} presets.`);

  return {
    domain: DOMAIN, label: LABEL,
    itemCount: flags.length,
    flagCount: flags.length,
    presetCount: presets.length,
    index: `api/${DOMAIN}/index.json`,
  };
}

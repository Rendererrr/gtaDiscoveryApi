// Generic filesystem helpers shared by domain builders.

import { readdir, stat } from 'fs/promises';
import { join } from 'path';

export const isDir = async (p) => (await stat(p)).isDirectory();
export const numericSort = (a, b) => Number(a) - Number(b);

const IMAGE_RE = /\.(webp|jpe?g|png)$/i;

// Reads a <drawableId> folder -> sorted list of texture entries.
// `urlPath` is the repo-relative path to the folder (used to build CDN urls).
export async function readDrawable(dirPath, urlPath, cdnBase) {
  const files = (await readdir(dirPath)).filter((f) => IMAGE_RE.test(f));
  const textures = [];
  for (const file of files) {
    const textureId = parseInt(file.split('.')[0], 10);
    const { size } = await stat(join(dirPath, file));
    textures.push({ texture: textureId, url: `${cdnBase}/${urlPath}/${file}`, size });
  }
  textures.sort((a, b) => a.texture - b.texture);
  return textures;
}

// Reads a folder of numeric <drawableId> subfolders ->
//   { drawables: { id: { textures } }, drawableCount, textureTotal }
export async function readDrawables(baseDir, baseUrlPath, cdnBase) {
  const drawableDirs = (await readdir(baseDir)).filter((d) => /^\d+$/.test(d));
  drawableDirs.sort(numericSort);
  const drawables = {};
  let textureTotal = 0;
  for (const d of drawableDirs) {
    const textures = await readDrawable(join(baseDir, d), `${baseUrlPath}/${d}`, cdnBase);
    drawables[d] = { textures };
    textureTotal += textures.length;
  }
  return { drawables, drawableCount: drawableDirs.length, textureTotal };
}

// Turns downloaded originals into small WebP files and writes the catalogue JSON.
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile, readdir, copyFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, parse } from 'node:path';
import sharp from 'sharp';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const SRC_IMG = join(ROOT, 'assets', 'img');
const OUT = join(ROOT, 'public', 'img');
for (const d of ['categories', 'brands', 'products']) await mkdir(join(OUT, d), { recursive: true });

// Category photography
for (const f of await readdir(join(SRC_IMG, 'categories'))) {
  const { name } = parse(f);
  const img = sharp(join(SRC_IMG, 'categories', f));
  await img.clone().resize({ width: 1920, withoutEnlargement: true }).webp({ quality: 74 }).toFile(join(OUT, 'categories', `${name}.webp`));
  await img.clone().resize({ width: 900 }).webp({ quality: 70 }).toFile(join(OUT, 'categories', `${name}-sm.webp`));
}

await sharp(join(SRC_IMG, 'koas-foods-factory.png')).webp({ quality: 80 }).toFile(join(OUT, 'warehouse.webp'));

// Brand logos
for (const f of await readdir(join(SRC_IMG, 'brands'))) {
  await sharp(join(SRC_IMG, 'brands', f)).flatten({ background: '#ffffff' }).resize(200).webp({ quality: 88 }).toFile(join(OUT, 'brands', `${parse(f).name}.webp`));
}

await copyFile(join(SRC_IMG, 'koas-logo.svg'), join(ROOT, 'public', 'img', 'koas-logo.svg'));
await copyFile(join(SRC_IMG, 'kf-favicon.png'), join(ROOT, 'public', 'favicon.png'));

// Product images
const products = JSON.parse(await readFile(join(ROOT, '.cache', 'products.json'), 'utf8'));
const hashes = new Map();
const out = [];
const queue = [...products];
let bad = 0;
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    const rec = { id: p.id, n: p.name, s: p.sku, c: p.cats, img: 0 };
    out.push(rec);
    if (!p.hasImage) continue;
    try {
      const buf = await readFile(join(ROOT, '.cache', 'products', `${p.id}.bin`));
      const h = createHash('md5').update(buf).digest('hex');
      hashes.set(h, (hashes.get(h) || 0) + 1);
      rec.h = h;
      const file = join(OUT, 'products', `${p.id}.webp`);
      try { await access(file); } catch {
        await sharp(buf).flatten({ background: '#ffffff' }).resize(360, 360, { fit: 'contain', background: '#ffffff' }).webp({ quality: 72 }).toFile(file);
      }
      rec.img = 1;
    } catch { bad++; }
  }
}
await Promise.all(Array.from({ length: 6 }, worker));

// An image shared by many products is a placeholder, not a product photo.
const placeholders = new Set([...hashes].filter(([, n]) => n >= 5).map(([h]) => h));
for (const r of out) { if (placeholders.has(r.h)) r.img = 0; delete r.h; }
out.sort((a, b) => a.n.localeCompare(b.n));
await writeFile(join(ROOT, 'public', 'catalogue.json'), JSON.stringify(out));
console.log(`catalogue ${out.length}, with photo ${out.filter((r) => r.img).length}, unreadable ${bad}, placeholder groups ${placeholders.size}`);

// Contact sheet for review
const sample = out.filter((r) => r.img).filter((_, i) => i % 21 === 0).slice(0, 24);
const tiles = await Promise.all(sample.map((r, i) => sharp(join(OUT, 'products', `${r.id}.webp`)).resize(180, 180).toBuffer().then((input) => ({ input, left: (i % 6) * 184, top: Math.floor(i / 6) * 184 }))));
await sharp({ create: { width: 1104, height: 736, channels: 3, background: '#888' } }).composite(tiles).png().toFile(join(ROOT, '.cache', 'sheet.png'));
await sharp(join(SRC_IMG, 'koas-logo.svg')).resize(500).flatten({ background: '#ffffff' }).png().toFile(join(ROOT, '.cache', 'logo.png'));

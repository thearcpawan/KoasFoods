// Pulls the live catalogue from koasfoods.com's public WooCommerce Store API
// and downloads each product's original image. Safe to re-run.
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const RAW = join(ROOT, '.cache', 'products');
const API = 'https://koasfoods.com/wp-json/wc/store/v1';
const headers = { 'User-Agent': 'Mozilla/5.0 (koas-foods site build)' };

const clean = (s = '') =>
  s.replace(/&amp;/g, '&').replace(/&#0?38;/g, '&').replace(/&#8217;/g, '’').replace(/&#8211;/g, '–').trim();

async function json(url) {
  const r = await fetch(url, { headers });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return { data: await r.json(), pages: Number(r.headers.get('x-wp-totalpages') || 1) };
}

await mkdir(RAW, { recursive: true });
await mkdir(join(ROOT, 'src', 'data'), { recursive: true });

const first = await json(`${API}/products?per_page=100&page=1`);
let all = first.data;
for (let p = 2; p <= first.pages; p++) all = all.concat((await json(`${API}/products?per_page=100&page=${p}`)).data);

const cats = (await json(`${API}/products/categories?per_page=100`)).data.map((c) => ({
  id: c.id, name: clean(c.name), slug: c.slug, parent: c.parent, count: c.count,
}));

const products = all.map((p) => ({
  id: p.id,
  name: clean(p.name),
  sku: p.sku,
  cats: (p.categories || []).map((c) => c.slug),
  src: p.images?.[0]?.src || null,
}));

// Download originals, a few at a time.
let ok = 0, failed = [];
const queue = products.filter((p) => p.src);
async function worker() {
  while (queue.length) {
    const p = queue.shift();
    const file = join(RAW, `${p.id}.bin`);
    try {
      await access(file); ok++; p.hasImage = true; continue;
    } catch {}
    try {
      const r = await fetch(p.src, { headers });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || !type.startsWith('image/')) throw new Error(`${r.status} ${type}`);
      await writeFile(file, Buffer.from(await r.arrayBuffer()));
      p.hasImage = true; ok++;
    } catch (e) { failed.push(`${p.id} ${p.name}: ${e.message}`); p.hasImage = false; }
  }
}
await Promise.all(Array.from({ length: 8 }, worker));

await writeFile(join(ROOT, '.cache', 'products.json'), JSON.stringify(products, null, 1));
await writeFile(join(ROOT, 'src', 'data', 'categories.json'), JSON.stringify(cats, null, 1));
console.log(`products ${products.length}, images ok ${ok}, failed ${failed.length}, no src ${products.filter((p) => !p.src).length}`);
if (failed.length) console.log(failed.slice(0, 10).join('\n'));
console.log(cats.map((c) => `${c.slug}(${c.count}${c.parent ? ',p' + c.parent : ''})`).join(' '));

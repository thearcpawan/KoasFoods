// Keeps the legal wording exactly as published: strips markup down to safe tags, no rewriting.
// Usage: node scripts/build-legal.mjs <dir containing terms-conditions.html and privacy-policy.html>
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const dir = process.argv[2];
const out = {};
for (const page of ['terms-conditions', 'privacy-policy']) {
  let h = await readFile(join(dir, `${page}.html`), 'utf8');
  h = (h.match(/<main[\s\S]*?<\/main>/i) || [h])[0]
    .replace(/<(script|style|svg|noscript|form|nav|header|footer)[\s\S]*?<\/\1>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '');
  const start = h.search(page === 'terms-conditions' ? /GENERAL SALES AND DELIVERY/ : /Who we are/);
  h = h.slice(Math.max(0, h.lastIndexOf('<', start)));
  const end = h.search(/&gt;5700 products/);
  if (end > 0) h = h.slice(0, h.lastIndexOf('<h', end) > 0 ? h.lastIndexOf('<h', end) : end);
  h = h.replace(/<(\/?)(h[1-6]|p|ol|ul|li|strong|em|br)\b[^>]*>/gi, '\u0001$1$2\u0002')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\u0001/g, '<').replace(/\u0002/g, '>')
    .replace(/<p>\s*<\/p>/g, '').replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();
  out[page] = h;
  console.log(page, h.length, JSON.stringify(h.slice(-160)));
}
await writeFile(join(ROOT, 'src/data/legal.json'), JSON.stringify(out));

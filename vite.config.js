import { defineConfig } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const read = (p) => readFileSync(resolve(root, p), 'utf8');
const json = (p) => JSON.parse(read(p));

const pages = ['index', 'assortment/index', 'about-us/index', 'become-a-customer/index', 'contact/index', 'terms-conditions/index', 'privacy-policy/index'];

const counts = Object.fromEntries(json('src/data/categories.json').map((c) => [c.slug, c.count]));
const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const homeCats = [
  ['rice-grains', 'Rice & Grains', 'rice'],
  ['herbs-spices', 'Herbs & Spices', 'spices'],
  ['cooking-oils', 'Cooking Oils', 'oils'],
  ['dried-salted-fish', 'Dried & Salted Fish', 'dried-fish'],
  ['frozen-fish', 'Frozen Fish', 'frozen-fish'],
  ['frozen-meat', 'Frozen Meat', 'frozen-meat'],
  ['smoked-foods', 'Smoked Foods', 'smoked'],
  ['canned-foods', 'Canned Foods', 'canned'],
  ['beans', 'Beans', 'beans'],
  ['sauces-seasonings', 'Sauces & Seasonings', 'sauces'],
];

function categoryCards() {
  return homeCats.map(([slug, name, img], i) => `
    <a class="cat-card" href="/assortment/?cat=${slug}">
      <span class="cat-card__media"><img src="/img/categories/${img}-sm.webp" alt="" loading="lazy" width="900" height="506"></span>
      <span class="cat-card__index">${String(i + 1).padStart(2, '0')}</span>
      <span class="cat-card__text"><span class="cat-card__name">${esc(name)}</span><span class="cat-card__count">${counts[slug]} products</span></span>
    </a>`).join('');
}

function mapSvg() {
  const m = json('src/data/map.json');
  const arcs = m.origins.map((o) => {
    const mx = (o.x + m.hub.x) / 2;
    const my = Math.min(o.y, m.hub.y) - Math.abs(o.x - m.hub.x) * 0.18 - 16;
    return `<path class="map-arc" pathLength="1" d="M${o.x} ${o.y}Q${mx.toFixed(1)} ${my.toFixed(1)} ${m.hub.x} ${m.hub.y}"/>`;
  }).join('');
  const dots = m.origins.map((o) => {
    const left = o.name === 'Ghana' || o.name === 'Suriname';
    return `<g class="map-dot" transform="translate(${o.x} ${o.y})"><circle r="9" class="map-dot__halo"/><circle r="3.4"/><text x="${left ? -11 : 11}" y="${o.name === 'Ghana' ? 12 : 4}" text-anchor="${left ? 'end' : 'start'}">${o.name}</text></g>`;
  }).join('');
  return `<svg class="map-svg" viewBox="150 0 760 440" role="img" aria-label="World map showing routes from Ghana, Nigeria, Suriname, India, China and Indonesia to Krimpen aan den IJssel in the Netherlands">
    <path class="map-land" d="${m.d}"/>${arcs}${dots}
    <g class="map-hub" transform="translate(${m.hub.x} ${m.hub.y})"><circle r="13" class="map-hub__halo"/><circle r="5"/><text x="-10" y="-11" text-anchor="end">Krimpen aan den IJssel</text></g>
  </svg>`;
}

function productTile(p) {
  return `<a class="pack" href="/assortment/?q=${encodeURIComponent(p.n)}"><img src="/img/products/${p.id}.webp" alt="${esc(p.n)}" loading="lazy" width="360" height="360"><span>${esc(p.n)}</span></a>`;
}

function productRows() {
  const all = json('public/catalogue.json').filter((p) => p.img);
  const wanted = [/zomi/i, /ghana heritage/i, /spicity/i, /suya/i, /turkey/i, /kaolin/i, /ewedu/i, /palm nectar/i, /heaven/i, /sardines/i, /hibiscus|bissap/i, /soumbala/i, /aboniki/i, /tom brown/i, /yam flour/i, /fawaka/i, /fioretto|corn starch/i, /mackerel/i, /malt/i];
  const picked = [];
  for (const re of wanted) {
    const m = all.find((p) => re.test(p.n) && !picked.includes(p));
    if (m) picked.push(m);
  }
  const half = Math.ceil(picked.length / 2);
  const row = (items) => `<div class="packs__row"><div class="packs__track">${[...items, ...items].map(productTile).join('')}</div></div>`;
  return row(picked.slice(0, half)) + row(picked.slice(half));
}

function brandTiles() {
  const logos = [['fawaka', 'Fawaka Foods'], ['shito', 'Oh! Shito'], ['peak', 'Peak'], ['maltina', 'Maltina'], ['sw', 'Schweppes'], ['br', 'Bonnet Rouge']];
  const names = ['Maggi', 'Omni', 'African Beauty', 'Coca-Cola', 'Kupila', 'Jarabaka', 'Dudu Osun', 'Fanta'];
  const tiles = [];
  names.forEach((n, i) => {
    tiles.push(`<span class="brand brand--word">${n}</span>`);
    if (logos[i]) tiles.push(`<span class="brand"><img src="/img/brands/${logos[i][0]}.webp" alt="${logos[i][1]}" loading="lazy" width="200" height="200"></span>`);
  });
  return `<div class="marquee__track">${[...tiles, ...tiles].join('')}</div>`;
}

function koasPages() {
  const legal = json('src/data/legal.json');
  const parts = { head: read('src/partials/head.html'), header: read('src/partials/header.html'), footer: read('src/partials/footer.html') };
  return {
    name: 'koas-pages',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        const here = ctx.path.replace(/index\.html$/, '');
        const header = parts.header.replace(/href="([^"]+)"( data-nav)/g, (m, href, flag) => (href === here ? `href="${href}" aria-current="page"${flag}` : m));
        return html
          .replace('<!--@head-->', parts.head)
          .replace('<!--@header-->', header)
          .replace('<!--@footer-->', parts.footer)
          .replace('<!--@categories-->', categoryCards)
          .replace('<!--@map-->', mapSvg)
          .replace('<!--@packs-->', productRows)
          .replace('<!--@brands-->', brandTiles)
          .replace('<!--@terms-->', () => legal['terms-conditions'])
          .replace('<!--@privacy-->', () => legal['privacy-policy']);
      },
    },
  };
}

export default defineConfig({
  plugins: [koasPages()],
  // Fixed ports: fail loudly instead of silently moving to 5174/4174 when a server is already running.
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: {
    chunkSizeWarningLimit: 800,
    rollupOptions: { input: Object.fromEntries(pages.map((p) => [p, resolve(root, `${p}.html`)])) },
  },
});

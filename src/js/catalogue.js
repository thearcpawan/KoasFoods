import gsap from 'gsap';
import { Flip } from 'gsap/Flip';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import categories from '../data/categories.json';

gsap.registerPlugin(Flip);

const PAGE = 48;
const GROUPS = [
  ['Dry Foods', ['dry-foods', 'beans', 'breakfast-cereals', 'canned-foods', 'cooking-oils', 'dairy-products', 'dried-salted-fish', 'herbs-spices', 'rice-grains', 'sauces-seasonings', 'smoked-foods']],
  ['Frozen Foods', ['frozen-foods', 'frozen-fish', 'frozen-meat', 'frozen-vegetables']],
  ['Non Foods', ['non-foods', 'beverages']],
];

// Category photos in public/img/categories/, used when a product has no photo of its own.
// Most specific category first, so a product tagged dried fish + dry foods gets the fish photo.
const CAT_PHOTO = {
  'frozen-meat': 'frozen-meat', 'frozen-fish': 'frozen-fish', 'dried-salted-fish': 'dried-fish',
  'smoked-foods': 'smoked', 'herbs-spices': 'spices', 'sauces-seasonings': 'sauces', 'cooking-oils': 'oils',
  'canned-foods': 'canned', 'dairy-products': 'dairy', 'beans': 'beans', 'breakfast-cereals': 'breakfast',
  'beverages': 'beverages', 'rice-grains': 'rice', 'dry-foods': 'dry-foods',
};

const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export async function initCatalogue({ reduced, lenis }) {
  const grid = document.querySelector('[data-grid]');
  const status = document.querySelector('[data-status]');
  const empty = document.querySelector('[data-empty]');
  const search = document.querySelector('[data-search]');
  const filters = document.querySelector('[data-filters]');
  const sentinel = document.querySelector('[data-sentinel]');

  let products;
  try {
    const r = await fetch('/catalogue.json');
    if (!r.ok) throw new Error(r.status);
    products = await r.json();
  } catch {
    status.innerHTML = 'The catalogue could not load. Please refresh, or email <a href="mailto:koasfoods@koasfoods.com">koasfoods@koasfoods.com</a>.';
    return;
  }
  products.forEach((p) => { p.key = norm(`${p.n} ${p.s}`); });

  const params = new URLSearchParams(location.search);
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c]));
  const state = {
    cat: catBySlug[params.get('cat')] ? params.get('cat') : '',
    q: params.get('q') || '',
    shown: PAGE,
  };
  search.value = state.q;

  const button = (slug, label, count) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filter';
    b.dataset.cat = slug;
    b.setAttribute('aria-pressed', String(slug === state.cat));
    const name = document.createElement('span');
    name.textContent = label;
    const c = document.createElement('small');
    c.textContent = count;
    b.append(name, c);
    return b;
  };
  filters.append(button('', 'All products', products.length));
  GROUPS.forEach(([title, slugs]) => {
    const h = document.createElement('h2');
    h.textContent = title;
    filters.append(h);
    slugs.forEach((s) => catBySlug[s] && filters.append(button(s, catBySlug[s].name, catBySlug[s].count)));
  });

  const cards = new Map();
  function card(p) {
    if (cards.has(p.id)) return cards.get(p.id);
    const el = document.createElement('article');
    el.className = 'product';
    el.dataset.flipId = p.id;
    const media = document.createElement('div');
    media.className = 'product__img';
    if (p.img) {
      const img = new Image(360, 360);
      img.src = `/img/products/${p.id}.webp`;
      img.alt = '';
      img.loading = 'lazy';
      media.append(img);
    } else {
      // koasfoods.com has no photo for this product: show its category photo, clearly labelled.
      const slug = Object.keys(CAT_PHOTO).find((s) => p.c.includes(s));
      const fallback = slug && CAT_PHOTO[slug];
      if (fallback) {
        media.classList.add('product__img--fallback');
        const img = new Image(360, 203);
        img.src = `/img/categories/${fallback}-sm.webp`;
        img.alt = '';
        img.loading = 'lazy';
        media.append(img);
      } else {
        media.innerHTML = '<span class="product__blank"><i></i></span>';
      }
      const note = document.createElement('span');
      note.className = 'product__nophoto';
      note.textContent = 'Photo not available';
      media.append(note);
    }
    const h = document.createElement('h3');
    h.textContent = p.n;
    const sku = document.createElement('span');
    sku.className = 'product__sku';
    sku.textContent = p.s;
    const ask = document.createElement('a');
    ask.className = 'product__ask';
    ask.href = `mailto:koasfoods@koasfoods.com?subject=${encodeURIComponent(`Product enquiry: ${p.n} (${p.s})`)}`;
    ask.textContent = 'Ask for a quote';
    ask.setAttribute('aria-label', `Ask for a quote on ${p.n}`);
    el.append(media, h, sku, ask);
    cards.set(p.id, el);
    return el;
  }

  const matches = () => {
    const terms = norm(state.q).split(/\s+/).filter(Boolean);
    return products.filter((p) => (!state.cat || p.c.includes(state.cat)) && terms.every((t) => p.key.includes(t)));
  };

  function render({ animate = true } = {}) {
    const list = matches();
    const visible = list.slice(0, state.shown).map(card);
    const flipState = animate && !reduced ? Flip.getState(grid.children) : null;
    grid.replaceChildren(...visible);
    empty.hidden = list.length > 0;
    const catName = state.cat ? catBySlug[state.cat].name : 'all categories';
    status.textContent = `${list.length} ${list.length === 1 ? 'product' : 'products'} in ${catName}${state.q ? ` matching “${state.q}”` : ''}`;
    filters.querySelectorAll('.filter').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cat === state.cat)));
    if (flipState) {
      Flip.from(flipState, {
        targets: visible, duration: 0.55, ease: 'power3.inOut', stagger: { amount: 0.12 }, simple: true,
        onEnter: (els) => gsap.fromTo(els, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.5, stagger: { amount: 0.2 }, ease: 'power3.out', clearProps: 'all' }),
      });
    }
    lenis?.resize();
    ScrollTrigger.refresh();
  }

  function syncUrl() {
    const p = new URLSearchParams();
    if (state.cat) p.set('cat', state.cat);
    if (state.q) p.set('q', state.q);
    history.replaceState(null, '', `${location.pathname}${p.size ? `?${p}` : ''}`);
  }

  filters.addEventListener('click', (e) => {
    const b = e.target.closest('.filter');
    if (!b) return;
    state.cat = b.dataset.cat;
    state.shown = PAGE;
    syncUrl();
    render();
    const top = grid.getBoundingClientRect().top + scrollY - 150;
    if (scrollY > top) { if (lenis) lenis.scrollTo(top, { duration: 0.7 }); else scrollTo(0, top); }
    b.scrollIntoView({ block: 'nearest', inline: 'center' });
  });

  let t;
  search.addEventListener('input', () => {
    clearTimeout(t);
    t = setTimeout(() => {
      state.q = search.value.trim();
      state.shown = PAGE;
      syncUrl();
      render();
    }, 140);
  });

  new IntersectionObserver(([e]) => {
    if (!e.isIntersecting || state.shown >= matches().length) return;
    state.shown += PAGE;
    render({ animate: false });
  }, { rootMargin: '700px' }).observe(sentinel);

  render();
}

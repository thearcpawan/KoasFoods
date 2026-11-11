import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger, SplitText);

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const page = document.body.dataset.page;

/* Smooth scrolling */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.11, anchors: { offset: -80 } });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}
export { lenis, reduced };

/* Page curtain */
const curtain = $('.curtain');
if (document.documentElement.classList.contains('arriving')) {
  curtain.style.animation = 'none';
  if (reduced) gsap.set(curtain, { yPercent: 0, y: '101%' });
  else gsap.fromTo(curtain, { y: 0 }, { y: '-101%', duration: 0.75, ease: 'power4.inOut', delay: 0.12, clearProps: 'transform', onComplete: () => document.documentElement.classList.remove('arriving') });
}
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href]');
  if (!a || reduced || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
  const url = new URL(a.href, location.href);
  if (url.origin !== location.origin || (url.pathname === location.pathname && url.search === location.search)) return;
  e.preventDefault();
  try { sessionStorage.setItem('koas-nav', '1'); } catch {}
  gsap.fromTo(curtain, { y: '101%' }, { y: 0, duration: 0.55, ease: 'power4.inOut', onComplete: () => { location.href = url.href; } });
});
// Coming back through browser history restores the page exactly as it was left.
addEventListener('pageshow', (e) => { if (e.persisted) gsap.set(curtain, { y: '101%' }); });

/* Header */
const header = $('[data-header]');
let last = 0;
function onScroll() {
  const y = scrollY;
  header.classList.toggle('is-stuck', y > 40);
  header.classList.toggle('is-hidden', y > last && y > 500 && !document.body.classList.contains('menu-open'));
  last = y;
}
addEventListener('scroll', onScroll, { passive: true });
onScroll();

const toggle = $('.menu-toggle');
const menu = $('#mobile-menu');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  if (open) {
    menu.hidden = false;
    lenis?.stop();
    if (!reduced) gsap.from($$('nav a', menu), { y: 34, autoAlpha: 0, duration: 0.55, stagger: 0.05, ease: 'power3.out' });
  } else {
    menu.hidden = true;
    lenis?.start();
  }
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
addEventListener('keydown', (e) => { if (e.key === 'Escape' && !menu.hidden) { setMenu(false); toggle.focus(); } });

/* Motion shared by every page */
function splitLines(el, vars = {}) {
  const split = SplitText.create(el, {
    type: 'lines', mask: 'lines', linesClass: 'line', autoSplit: true,
    onSplit: (s) => gsap.from(s.lines, { yPercent: 112, duration: 1.05, stagger: 0.09, ease: 'power4.out', ...vars }),
  });
  return split;
}

function sharedMotion() {
  $$('[data-split]').forEach((el) => splitLines(el, { scrollTrigger: { trigger: el, start: 'top 86%', once: true } }));

  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 90%', once: true,
    onEnter: (els) => gsap.from(els, { y: 34, autoAlpha: 0, duration: 0.9, stagger: 0.09, ease: 'power3.out', clearProps: 'transform,opacity,visibility' }),
  });

  $$('[data-parallax]').forEach((el) => gsap.fromTo(el, { yPercent: -7 }, { yPercent: 7, ease: 'none', scrollTrigger: { trigger: el.parentElement, start: 'top top', end: 'bottom top', scrub: true } }));

  $$('[data-scrub-words]').forEach((el) => {
    const s = SplitText.create(el, { type: 'words', wordsClass: 'word' });
    gsap.fromTo(s.words, { opacity: 0.16 }, { opacity: 1, stagger: 0.05, ease: 'none', scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 55%', scrub: 0.4 } });
  });

  $$('[data-count]').forEach((el) => {
    const to = Number(el.dataset.count);
    const o = { v: 0 };
    el.textContent = '0';
    gsap.to(o, { v: to, duration: 1.7, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onUpdate: () => { el.textContent = Math.round(o.v); } });
  });

  if (matchMedia('(hover: hover)').matches) {
    $$('[data-magnetic]').forEach((el) => {
      const x = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3.out' });
      const y = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3.out' });
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        x((e.clientX - r.left - r.width / 2) * 0.22);
        y((e.clientY - r.top - r.height / 2) * 0.3);
      });
      el.addEventListener('mouseleave', () => { x(0); y(0); });
    });
  }

  $$('[data-stack-card]').forEach((card, i, all) => {
    if (i === all.length - 1) return;
    gsap.to(card, { scale: 0.93, filter: 'brightness(.4)', ease: 'none', scrollTrigger: { trigger: all[i + 1], start: 'top 95%', end: 'top 84px', scrub: true } });
  });
}

async function boot() {
  // Line splitting has to measure the final font.
  await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]);

  // Pinned sections first: triggers further down must measure the space pins add.
  if (page === 'home') (await import('./home.js')).initHome({ reduced, lenis, splitLines });
  if (page === 'about') (await import('./home.js')).initOrigins({ reduced });
  if (page === 'assortment') (await import('./catalogue.js')).initCatalogue({ reduced, lenis });

  if (!reduced) sharedMotion();
  ScrollTrigger.sort();
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
}
boot();

import gsap from 'gsap';

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];

function heroIntro(splitLines) {
  gsap.set(['[data-hero-title]', '[data-hero-in]'], { visibility: 'visible', animation: 'none' });
  splitLines($('[data-hero-title]'), { delay: 0.25, duration: 1.25, stagger: 0.1 });
  gsap.from('[data-hero-in]', { y: 26, autoAlpha: 0, duration: 1, stagger: 0.12, delay: 0.75, ease: 'power3.out', clearProps: 'transform,opacity' });
  gsap.from('[data-hero-stage]', { scale: 1.12, duration: 2.1, ease: 'power3.out' });
  gsap.to('[data-hero-stage]', { yPercent: 16, ease: 'none', scrollTrigger: { trigger: '[data-hero]', start: 'top top', end: 'bottom top', scrub: true } });
}

async function heroScene() {
  const canvas = $('[data-hero-canvas]');
  try {
    const { createHeroScene } = await import('./hero-gl.js');
    await createHeroScene(canvas, '/img/warehouse.webp');
    gsap.to('.hero__fallback', { opacity: 0, duration: 0.3, delay: 2 });
  } catch (err) {
    // No WebGL: the still photo stays in place.
    console.info('Hero running without WebGL:', err.message);
    canvas.remove();
  }
}

function marquee(track, speed) {
  const tween = gsap.to(track, { xPercent: -50, duration: speed, ease: 'none', repeat: -1 });
  return tween;
}

function scrollLinkedMarquees(lenis) {
  const tweens = [];
  $$('[data-marquee] .marquee__track').forEach((t) => tweens.push(marquee(t, 44)));
  $$('[data-packs] .packs__track').forEach((t, i) => {
    const tw = marquee(t, 58 + i * 10);
    if (i % 2) tw.progress(1).timeScale(-1);
    tweens.push(tw);
  });
  // Scrolling speeds the rows up, then they settle back.
  let boost = { v: 1 };
  lenis?.on('scroll', ({ velocity }) => {
    gsap.to(boost, {
      v: 1 + Math.min(Math.abs(velocity) * 0.22, 5), duration: 0.25, overwrite: true,
      onUpdate: () => tweens.forEach((t) => t.timeScale(Math.sign(t.timeScale() || 1) * boost.v)),
      onComplete: () => gsap.to(boost, { v: 1, duration: 0.9, ease: 'power2.out', onUpdate: () => tweens.forEach((t) => t.timeScale(Math.sign(t.timeScale() || 1) * boost.v)) }),
    });
  });
}

function horizontalCategories() {
  const section = $('[data-hscroll]');
  const viewport = $('[data-hscroll-viewport]');
  const track = $('[data-hscroll-track]');
  gsap.matchMedia().add('(min-width: 861px)', () => {
    viewport.style.overflow = 'visible';
    const distance = () => Math.max(0, track.scrollWidth - innerWidth);
    const tween = gsap.to(track, {
      x: () => -distance(), ease: 'none',
      scrollTrigger: { trigger: section, start: 'top top', end: () => `+=${distance()}`, pin: true, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true },
    });
    $$('.cat-card__media img', track).forEach((img) => {
      gsap.fromTo(img, { xPercent: -5 }, { xPercent: 5, ease: 'none', scrollTrigger: { trigger: img.closest('.cat-card'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true } });
    });
    return () => { viewport.style.overflow = ''; };
  });
}

export function initOrigins({ reduced }) {
  const section = $('[data-origins]');
  if (!section) return;
  const arcs = $$('.map-arc', section);
  const dots = $$('.map-dot', section);
  const items = $$('[data-origins-list] li', section);
  if (reduced) { items.forEach((li) => li.classList.add('is-on')); return; }

  gsap.set(arcs, { strokeDasharray: 1, strokeDashoffset: 1 });
  gsap.set(dots, { autoAlpha: 0 });
  const build = (tl) => {
    arcs.forEach((arc, i) => {
      tl.to(dots[i], { autoAlpha: 1, duration: 0.2 }, i)
        .to(arc, { strokeDashoffset: 0, duration: 0.85, ease: 'none', onStart: () => items[i].classList.add('is-on'), onReverseComplete: () => items[i].classList.remove('is-on') }, i);
    });
  };
  gsap.matchMedia()
    .add('(min-width: 1041px)', () => {
      build(gsap.timeline({ scrollTrigger: { trigger: section, start: 'top top', end: '+=170%', pin: '[data-origins-inner]', scrub: 0.5 } }));
    })
    .add('(max-width: 1040px)', () => {
      build(gsap.timeline({ scrollTrigger: { trigger: '.origins__map', start: 'top 82%', end: 'bottom 45%', scrub: 0.5 } }));
    });
  gsap.to($$('.map-dot__halo, .map-hub__halo', section), { attr: { r: 16 }, opacity: 0, duration: 1.8, repeat: -1, ease: 'power1.out', stagger: { each: 0.25, repeat: -1 } });
}

export function initHome({ reduced, lenis, splitLines }) {
  if (reduced) {
    gsap.set(['[data-hero-title]', '[data-hero-in]'], { visibility: 'visible', animation: 'none' });
    return initOrigins({ reduced });
  }
  heroIntro(splitLines);
  heroScene();
  scrollLinkedMarquees(lenis);
  horizontalCategories();
  initOrigins({ reduced });
}

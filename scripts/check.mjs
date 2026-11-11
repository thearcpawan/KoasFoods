// Drives the built site in real Chrome: captures errors, overflow and screenshots.
// Usage: node scripts/check.mjs <baseUrl> <outDir>
import { chromium } from 'playwright-core';
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

const [base = 'http://localhost:4173', out = '.cache/shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const problems = [];

async function open(vp, path, tag) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, hasTouch: vp.width < 600 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => problems.push(`[${tag}] pageerror ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') problems.push(`[${tag}] console ${m.text()}`); });
  page.on('response', (r) => { if (r.status() >= 400) problems.push(`[${tag}] ${r.status()} ${r.url()}`); });
  await page.goto(base + path, { waitUntil: 'load' });
  await page.waitForTimeout(2600);
  return { ctx, page };
}
async function scrollTo(page, y) {
  await page.evaluate((v) => window.scrollTo(0, v), y);
  await page.waitForTimeout(1300);
}
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - innerWidth);

// Home, desktop: walk through the whole page
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, '/', 'home-d');
  await page.screenshot({ path: join(out, 'd-00-hero.png') });
  const h = await page.evaluate(() => document.documentElement.scrollHeight);
  console.log('home height', h, 'overflow', await overflow(page));
  const mark = async (sel) => page.evaluate((s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top + scrollY : -1; }, sel);
  const stops = { statement: await mark('.statement'), hscroll: await mark('.pin-spacer:has(.hscroll), .hscroll'), origins: await mark('.origins'), why: await mark('.why'), packs: await mark('.packs'), cta: await mark('.cta') };
  console.log(stops);
  await scrollTo(page, stops.statement + 250); await page.screenshot({ path: join(out, 'd-01-statement.png') });
  await scrollTo(page, stops.hscroll + 500); await page.screenshot({ path: join(out, 'd-02-hscroll.png') });
  await scrollTo(page, stops.origins + 900); await page.screenshot({ path: join(out, 'd-03-origins.png') });
  await scrollTo(page, stops.why + 500); await page.screenshot({ path: join(out, 'd-04-why.png') });
  await scrollTo(page, stops.why + 1500); await page.screenshot({ path: join(out, 'd-05-stack.png') });
  await scrollTo(page, stops.packs + 80); await page.screenshot({ path: join(out, 'd-06-packs.png') });
  await scrollTo(page, stops.cta + 40); await page.screenshot({ path: join(out, 'd-07-cta.png') });
  await ctx.close();
}

// Hero transition mid-way
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, '/', 'hero-t');
  await page.evaluate(() => { window.__fb = getComputedStyle(document.querySelector('.hero__fallback')).visibility; });
  console.log('fallback hidden', await page.evaluate(() => window.__fb), 'canvas present', await page.locator('[data-hero-canvas]').count());
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, 't-settled.png') });
  await ctx.close();
}

// Inner pages, desktop and mobile
for (const [slug, path] of [['assortment', '/assortment/'], ['about', '/about-us/'], ['customer', '/become-a-customer/'], ['contact', '/contact/'], ['terms', '/terms-conditions/'], ['privacy', '/privacy-policy/']]) {
  const d = await open({ width: 1440, height: 900 }, path, `${slug}-d`);
  await d.page.screenshot({ path: join(out, `p-${slug}-d.png`) });
  console.log(slug, 'd overflow', await overflow(d.page));
  await d.ctx.close();
  const m = await open({ width: 390, height: 844 }, path, `${slug}-m`);
  await m.page.screenshot({ path: join(out, `p-${slug}-m.png`) });
  console.log(slug, 'm overflow', await overflow(m.page));
  await m.ctx.close();
}

// Home, mobile
{
  const { ctx, page } = await open({ width: 390, height: 844 }, '/', 'home-m');
  await page.screenshot({ path: join(out, 'm-00-hero.png') });
  console.log('home m overflow', await overflow(page));
  for (const [i, s] of ['.statement', '.hscroll', '.origins', '.why', '.packs', '.cta'].entries()) {
    const y = await page.evaluate((q) => document.querySelector(q).getBoundingClientRect().top + scrollY, s);
    await scrollTo(page, y + (s === '.origins' ? 260 : 100));
    await page.screenshot({ path: join(out, `m-0${i + 1}.png`) });
  }
  await ctx.close();
}

// Catalogue behaviour
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, '/assortment/', 'cat-fn');
  const statusAll = await page.textContent('[data-status]');
  const firstCount = await page.locator('.product').count();
  await page.fill('[data-search]', 'palm oil');
  await page.waitForTimeout(900);
  const statusSearch = await page.textContent('[data-status]');
  await page.fill('[data-search]', 'zzzzqq');
  await page.waitForTimeout(600);
  const emptyVisible = await page.isVisible('[data-empty]');
  await page.fill('[data-search]', '');
  await page.click('.filter[data-cat="frozen-fish"]');
  await page.waitForTimeout(1000);
  const statusCat = await page.textContent('[data-status]');
  const url = page.url();
  await page.screenshot({ path: join(out, 'p-assortment-filter.png') });
  await page.evaluate(() => scrollTo(0, 0));
  await page.goto(base + '/assortment/?cat=rice-grains');
  await page.waitForTimeout(1500);
  const deep = await page.textContent('[data-status]');
  console.log({ statusAll, firstCount, statusSearch, emptyVisible, statusCat, url, deep });
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(1500);
  console.log('after scroll cards', await page.locator('.product').count());
  await ctx.close();
}

// Curtain navigation, mobile menu, form validation, reduced motion
{
  const { ctx, page } = await open({ width: 1440, height: 900 }, '/contact/', 'nav');
  await page.click('.site-footer a[href="/about-us/"]');
  await page.waitForURL('**/about-us/', { timeout: 6000 });
  await page.waitForTimeout(1600);
  const box = await page.locator('.curtain').boundingBox();
  console.log('curtain y after nav', box?.y, 'title', await page.title());
  await ctx.close();

  const m = await open({ width: 390, height: 844 }, '/contact/', 'menu');
  await m.page.click('.menu-toggle');
  await m.page.waitForTimeout(800);
  await m.page.screenshot({ path: join(out, 'm-menu.png') });
  console.log('menu visible', await m.page.isVisible('#mobile-menu'));
  await m.ctx.close();

  const f = await open({ width: 1440, height: 900 }, '/become-a-customer/', 'form');
  console.log('customer contact links:', await f.page.$$eval('.contact-list a', (as) => as.map((a) => a.getAttribute('href').split('?')[0])));
  await f.ctx.close();

  const rctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
  const r = await rctx.newPage();
  r.on('pageerror', (e) => problems.push(`[reduced] ${e.message}`));
  await r.goto(base + '/');
  await r.waitForTimeout(1500);
  await r.screenshot({ path: join(out, 'r-hero.png') });
  console.log('reduced title visible', await r.isVisible('[data-hero-title]'));
  await rctx.close();
}

await browser.close();
console.log(problems.length ? 'PROBLEMS\n' + [...new Set(problems)].join('\n') : 'no console/page/network problems');

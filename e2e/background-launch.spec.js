// The iPhone home-screen app can be rebuilt while it's asleep. Home's cards
// must still show once it's back on screen (they used to stay hidden until you
// switched tabs), and still fade in on a normal visit.
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, isKnownNoise } = require('./config');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

// Is the "Total saved" card painted: nothing above it hidden or see-through?
const totalCardShows = (page) =>
  page.evaluate(() => {
    const label = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Total saved');
    if (!label) return 'no card';
    for (let el = label; el; el = el.parentElement) {
      const s = getComputedStyle(el);
      if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) < 0.99) return 'hidden by ' + (el.className || el.tagName);
    }
    return 'ok';
  });

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  await page.setViewport({ width: 390, height: 844 });
  // Headless Chrome asks for reduced motion by default, which would skip the fade.
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1000);
  await page.click('::-p-text(Try the demo)');
  await sleep(1500);

  const animated = await page.evaluate(() =>
    [...document.querySelectorAll('div')].some((e) => getComputedStyle(e).animationName !== 'none'),
  );
  check('cards still fade in on a normal visit', animated);
  check('Home cards show on a normal visit', (await totalCardShows(page)) === 'ok');

  // Rebuild Home while the page is in the background, then come back to it.
  const other = await browser.newPage();
  await other.bringToFront();
  await page.evaluate(() => location.reload());
  await sleep(4000);
  check('page really was in the background', (await page.evaluate(() => document.visibilityState)) === 'hidden');
  await page.bringToFront();
  await sleep(800);
  const state = await totalCardShows(page);
  check('Home cards show after coming back', state === 'ok', state);

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

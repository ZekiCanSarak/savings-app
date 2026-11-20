// Landing page, demo mode, and screenshots of the demo for the landing page.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'demo');
const SHOTS = path.join(OUTPUT, 'shots', 'landing-shots');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
const MODE = process.env.SCHEME || 'light';

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); if (process.env.WHERE) console.log('ERR at', page.url()); });
  page.on('dialog', (d) => d.accept());
  const phone = { viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' };
  await page.emulate(phone);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: MODE }]);
  const text = () => page.evaluate(() => document.body.innerText);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  const shot = (n, full = false) => page.screenshot({ path: path.join(OUT, `${n}-${MODE}.png`), fullPage: full });
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(700); return; }
    }
    throw new Error('no visible ' + t);
  };

  // ---- Landing ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  let t = await text();
  await shot('01-landing');
  check('landing shows to a first-time visitor', t.includes('Save for the things you want.') && t.includes('Try the demo'));
  check('landing explains privacy and home screen', t.includes('Private by design') && t.includes('Add it to your home screen'));
  await click('Get started');
  t = await text();
  check('Get started opens the welcome flow', t.includes('Welcome') && t.includes('Try the demo with sample data'));

  // ---- Demo ----
  await click('Try the demo with sample data');
  await sleep(1500);
  t = await text();
  await shot('02-demo-home');
  check('demo opens Home with sample data', t.includes('Hi Alex') && t.includes('Japan trip'));
  check('demo banner shows', t.includes('You’re looking at sample data') && t.includes('Start for real'));
  let s = await stored();
  check('demo flag saved', s.state.demo === true && s.state.onboardingComplete === true && s.version === STORAGE_VERSION);
  check('demo has a streak', /🔥 \d+ months in a row/.test(t), t.match(/🔥[^\n]*/)?.[0]);
  await click('Goals');
  await sleep(900);
  t = await text();
  check('demo goals list has a reached goal', t.includes('Reached 🎉 (1)'));
  check('banner on Goals tab too', t.includes('Start for real'));
  await click('Budget');
  await sleep(900);
  check('banner on Budget', (await text()).includes('Start for real'));

  // ---- Start for real ----
  await click('Start for real');
  await sleep(1500);
  t = await text();
  s = await stored();
  check('Start for real clears demo and opens the welcome flow (not the landing)', t.includes('Welcome') && !t.includes('Save for the things you want.') && s.state.goals.length === 0 && s.state.demo === false);

  // ---- Installed (home screen) skips the landing ----
  await page.evaluate(() => localStorage.clear());
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'standalone', { get: () => true }); });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  check('opened from the home screen: no landing', t.includes('Welcome') && !t.includes('Save for the things you want.'));

  // ---- Screenshots for the landing page (demo data, without the banner) ----
  await page.click('::-p-text(Try the demo with sample data)');
  await sleep(1500);
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('savings-app-data'));
    d.state.demo = false;
    d.state.feedbackPromptDismissed = true;
    localStorage.setItem('savings-app-data', JSON.stringify(d));
  });
  const capture = async (url, name, after) => {
    await page.goto(BASE + url, { waitUntil: 'networkidle0' });
    await sleep(2200);
    if (after) await after();
    await page.screenshot({ path: path.join(SHOTS, `${name}-${MODE}.png`) });
  };
  await capture('/', 'home');
  await capture('/goals', 'goals');
  await capture('/goals', 'goal-detail', async () => { await click('Japan trip'); await sleep(2200); });
  await capture('/budget', 'budget');

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

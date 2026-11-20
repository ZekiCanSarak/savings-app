// Landing screenshots + feedback card/button.
const path = require('path');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'demo');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  const opened = [];
  browser.on('targetcreated', (t) => opened.push(t.url()));
  const text = () => page.evaluate(() => document.body.innerText);
  const imgs = () => page.evaluate(() => [...document.images].filter((i) => i.alt.startsWith('Screenshot')).map((i) => i.complete && i.naturalWidth));

  // Laptop
  await page.setViewport({ width: 1366, height: 900 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(2000);
  let loaded = await imgs();
  check('4 screenshots load on laptop', loaded.length === 4 && loaded.every((w) => w > 0), JSON.stringify(loaded));
  check('landing feedback link', (await text()).includes('Got thoughts? Send feedback'));
  await page.screenshot({ path: path.join(OUT, 'landing-laptop.png'), fullPage: true });

  // Phone
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(2000);
  loaded = await imgs();
  check('screenshots load on phone', loaded.length === 4 && loaded.every((w) => w > 0));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  check('no sideways page scroll on phone', !overflow);
  await page.screenshot({ path: path.join(OUT, 'landing-phone-full.png'), fullPage: true });

  // Feedback card: a user who started 6 days ago
  await page.evaluate(() => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version: 5, state: {
      onboardingComplete: true, profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 200000 },
      startedAt: new Date(Date.now() - 6 * 864e5).toISOString(), feedbackPromptDismissed: false, demo: false,
      about: { askedAt: '2026-11-01T10:00:00.000Z' }, goals: [], contributions: [] } }));
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  let t = await text();
  check('feedback card after 5+ days', t.includes('What do you think so far?'));
  await page.screenshot({ path: path.join(OUT, 'feedback-card.png') });
  await page.click('::-p-text(Share feedback)');
  await sleep(1500);
  check('opens the form in a new tab', opened.some((u) => u.includes('forms.gle') || u.includes('docs.google.com/forms')), opened.join(','));
  const s = await page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  check('card answered for good', s.state.feedbackPromptDismissed === true && !(await text()).includes('What do you think so far?'));

  // New user (started today): no card. Old v4 data: clock starts now.
  await page.evaluate(() => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version: 4, state: {
      onboardingComplete: true, profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 200000 },
      about: { askedAt: '2026-11-01T10:00:00.000Z' }, goals: [], contributions: [] } }));
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  const s2 = await page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  check('v4 user upgraded: clock starts now, no card yet', s2.version === STORAGE_VERSION && s2.state.startedAt && Date.now() - Date.parse(s2.state.startedAt) < 60000 && !(await text()).includes('What do you think so far?'));
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle0' });
  await sleep(1500);
  check('Settings has Send feedback', (await text()).includes('Help improve Goalpot') && (await text()).includes('Send feedback'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

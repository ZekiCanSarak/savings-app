// One-tap quick save on the goal page and Home, with Undo.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');

const SHOTS = path.join(OUTPUT, 'shots', 'quick-save');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')).state);
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const clickLabel = async (label) => {
    for (const el of (await page.$$(`[aria-label="${label}"]`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(800); return; }
    }
    throw new Error('no visible ' + label);
  };
  const clickText = async (t) => {
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(800); return; }
    }
    throw new Error('no visible ' + t);
  };
  const savedFor = async (goalId) => (await stored()).contributions.filter((c) => c.goalId === goalId).reduce((s, c) => s + c.amount, 0);

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate((version) => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version, state: {
      onboardingComplete: true,
      profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 250000 },
      about: { askedAt: '2026-10-01T10:00:00.000Z' },
      reminderPromptDismissed: true, installPromptDismissed: true, feedbackPromptDismissed: true,
      goals: [{ id: 'g', name: 'Bike', emoji: '🚲', targetAmount: 3000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z' }],
      contributions: [{ id: 'c1', goalId: 'g', amount: 1500, date: '2026-10-03' }],
    } }));
  }, STORAGE_VERSION);

  // ---- Goal page ----
  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await clickText('Bike');
  await sleep(1200);
  let t = await text();
  await shot('01-goal-page');
  // £15 left: £5, £10, then one button that finishes it (£15), no £20.
  check('goal page offers +£5, +£10 and a £15 finisher', t.includes('+£5') && t.includes('+£10') && t.includes('+£15') && !t.includes('+£20'));
  await clickLabel('Save £5 to Bike');
  t = await text();
  await shot('02-saved');
  check('a tap logs £5 straight away', (await savedFor('g')) === 2000);
  const entry = (await stored()).contributions.find((c) => c.note === 'Quick save');
  check('it is noted "Quick save" and dated today', Boolean(entry) && entry.date === new Date().toISOString().slice(0, 10), JSON.stringify(entry));
  check('shows "Saved £5" with Undo', t.includes('Saved £5') && t.includes('Undo'));
  check('the total on the page updates', t.includes('£20') && t.includes('£10 left to save'));
  await clickText('Undo');
  t = await text();
  check('Undo removes it again', (await savedFor('g')) === 1500 && t.includes('£15 left to save'));

  // ---- Home ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  await shot('03-home');
  check('Home shows a Quick save card for the goal', t.includes('Quick save') && t.includes('Bike'));
  await clickLabel('Save £10 to Bike');
  check('Home quick save logs it', (await savedFor('g')) === 2500);
  await sleep(6500);
  t = await text();
  check('Undo goes away after a few seconds and the buttons come back', !t.includes('Undo') && t.includes('+£5'));
  await clickLabel('Save £5 to Bike');
  await sleep(6500);
  t = await text();
  check('a reached goal gets no quick-save buttons', (await savedFor('g')) === 3000 && !t.includes('Quick save'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

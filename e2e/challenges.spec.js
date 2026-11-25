// Savings challenges: start one, tick and untick steps, see it on Home and the goal page, delete the goal.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');

const SHOTS = path.join(OUTPUT, 'shots', 'challenges');
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  page.on('dialog', (d) => d.accept());
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')).state);
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const clickLabel = async (label) => {
    for (const el of (await page.$$(`[aria-label^="${label}"]`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(700); return; }
    }
    throw new Error('no visible ' + label);
  };
  const clickText = async (t) => {
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(900); return; }
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
      goals: [{ id: 'h', name: 'Holiday', emoji: '✈️', targetAmount: 200000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z' }],
      contributions: [],
    } }));
  }, STORAGE_VERSION);

  // ---- Home invites ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  check('Home invites you to try a challenge', (await text()).includes('Try a savings challenge'));
  await clickText('See challenges');
  await sleep(1200);
  let t = await text();
  await shot('01-start');
  check('the challenges screen lists all three', t.includes('52-week challenge') && t.includes('100 envelopes') && t.includes('30-day challenge'));
  check('the 52-week total at £1 a step is £1,378', t.includes('£1,378 in all'));
  check('Start waits for a goal', t.includes('Choose a goal to start'));
  await clickLabel('Holiday');
  await clickText('Start for Holiday');
  await sleep(1200);
  t = await text();
  await shot('02-grid');
  check('starting opens the challenge grid', t.includes('Saving for') && t.includes('Holiday') && t.includes('0 of 52 done'));

  // ---- Tick weeks 1–3, untick week 3 ----
  await clickLabel('Week 1,');
  await clickLabel('Week 2,');
  await clickLabel('Week 3,');
  t = await text();
  await shot('03-ticked');
  check('ticking weeks 1–3 saves £6 to the goal', (await savedFor('h')) === 600 && t.includes('3 of 52 done'));
  const notes = (await stored()).contributions.map((c) => c.note);
  check('each saving is labelled with its week', notes.includes('52-week challenge · Week 3'), notes.join(' | '));
  check('it suggests the next week', t.includes('Next up: Week 4 (£4)'));
  await clickLabel('Week 3,');
  check('unticking week 3 takes its £3 back out', (await savedFor('h')) === 300 && (await text()).includes('2 of 52 done'));

  // ---- Home and goal page ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  check('Home shows the running challenge', t.includes('Your challenge') && t.includes('2 of 52 done') && t.includes('next: Week 3 (£3)'));
  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await clickText('Holiday');
  await sleep(1200);
  t = await text();
  await shot('04-goal-page');
  check('the goal page shows its challenge', t.includes('52-week challenge') && t.includes('Open challenge'));

  // Deleting a ticked saving from the goal's history unticks its week.
  const week2 = (await stored()).contributions.find((c) => c.note === '52-week challenge · Week 2');
  await page.evaluate((id) => {
    const d = JSON.parse(localStorage.getItem('savings-app-data'));
    d.state.contributions = d.state.contributions.filter((c) => c.id !== id);
    localStorage.setItem('savings-app-data', JSON.stringify(d));
  }, week2.id);
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  check('a saving deleted from the history no longer counts', (await text()).includes('1 of 52 done'));

  // ---- Deleting the goal removes the challenge ----
  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await clickText('Holiday');
  await sleep(1200);
  await clickText('Delete goal');
  await sleep(1200);
  check('deleting the goal removes its challenge', (await stored()).challenges.length === 0);

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

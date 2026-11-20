// Editing a saving, and archiving / restoring a goal.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, OUTPUT, isKnownNoise } = require('./config');

const SHOTS = path.join(OUTPUT, 'shots', 'edit-archive');
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
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(700); return; }
    }
    throw new Error('no visible ' + t);
  };
  const clickLabel = async (label) => {
    const el = await page.waitForSelector(`[aria-label^="${label}"]`, { timeout: 8000 });
    await el.click();
    await sleep(800);
  };
  const typeInto = async (placeholder, value) => {
    for (const h of await page.$$(`input[placeholder="${placeholder}"]`)) {
      const b = await h.boundingBox();
      if (b && b.width > 0) { await h.click({ clickCount: 3 }); await page.keyboard.press('Backspace'); await h.type(value); await sleep(300); return; }
    }
    throw new Error('no input ' + placeholder);
  };

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version: 7, state: {
      onboardingComplete: true,
      profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 250000 },
      about: { askedAt: '2026-10-01T10:00:00.000Z' },
      reminderPromptDismissed: true, installPromptDismissed: true, feedbackPromptDismissed: true,
      goals: [
        { id: 'h', name: 'Holiday', emoji: '✈️', targetAmount: 100000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z' },
        { id: 'b', name: 'Bike', emoji: '🚲', targetAmount: 50000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z' },
      ],
      contributions: [
        { id: 'c1', goalId: 'h', amount: 5000, date: '2026-10-03', note: 'Typo' },
        { id: 'c2', goalId: 'h', amount: 2000, date: '2026-10-10', withdrawal: true },
        { id: 'c3', goalId: 'b', amount: 10000, date: '2026-10-05' },
      ],
    } }));
  });

  // ---- Edit a saving ----
  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await click('Holiday');
  await sleep(1500);
  await clickLabel('Edit £50 saved');
  let t = await text();
  await shot('01-edit-saving');
  const amount = await page.$eval('input[placeholder="e.g. 50"]', (e) => e.value);
  const note = await page.$eval('input[placeholder="e.g. Birthday money"]', (e) => e.value);
  check('edit screen opens filled in', t.includes('Edit saving') && amount === '50' && note === 'Typo', `${amount} / ${note}`);
  // Without this £50, the goal holds £0 (it can't go below 0), so £1,000 is left.
  check('edit screen leaves this entry out of "left to save"', t.includes('£1,000 left to save'), t.match(/£[\d,]+ left to save/)?.[0]);
  await typeInto('e.g. 50', '75');
  await typeInto('e.g. Birthday money', 'Fixed');
  await click('Save changes');
  await sleep(1000);
  let s = await stored();
  const c1 = s.state.contributions.find((c) => c.id === 'c1');
  check('saving updated in place', c1.amount === 7500 && c1.note === 'Fixed' && s.state.contributions.length === 3, JSON.stringify(c1));
  t = await text();
  check('history and total show the new amount', t.includes('+£75') && t.includes('Fixed') && t.includes('£55'));

  // Money taken out can't be edited above what the goal holds (£75, not counting this entry).
  await clickLabel('Edit £20 taken out');
  t = await text();
  check('withdrawals open as "Edit money taken out"', t.includes('Edit money taken out') && t.includes('£75 in this goal'));
  await typeInto('e.g. 50', '80');
  await click('Save changes');
  check('can’t take out more than the goal holds', (await text()).includes('You can take out up to'));
  await click('Cancel');
  await sleep(800);

  // ---- Archive and restore ----
  await click('Archive goal');
  await sleep(1000);
  t = await text();
  s = await stored();
  await shot('02-archived');
  check('archived goal shows a banner with Restore', t.includes('Archived') && t.includes('Restore goal') && !t.includes('+ Add money') && !!s.state.goals[0].archivedAt);
  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  check('goals list: hidden, in a closed "Archived" section', t.includes('Archived (1)') && t.includes('Bike') && !t.includes('Holiday') && t.includes('1 archived'));
  await click('Archived (1)');
  check('archived section opens', (await text()).includes('Holiday'));
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  check('Home totals leave the archived goal out', t.includes('£100') && t.includes('across 1 goal'), t.match(/Total saved[^A-Z]*/)?.[0]);

  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await click('Archived (1)');
  await click('Holiday');
  await sleep(1500);
  await click('Restore goal');
  await sleep(1000);
  s = await stored();
  t = await text();
  check('restore brings it back', !s.state.goals[0].archivedAt && t.includes('+ Add money') && !t.includes('Restore goal'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

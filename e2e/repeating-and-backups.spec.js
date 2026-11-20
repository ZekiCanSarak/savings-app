// Repeating savings + data protection (install card, backup reminder, last backup).
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'repeating');
const DL = path.join(OUTPUT, 'downloads-rep');
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(DL, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

const pad = (n) => String(n).padStart(2, '0');
const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const now = new Date();
const today = iso(now);
const dayIn = (monthsAgo, day) => {
  const last = new Date(now.getFullYear(), now.getMonth() - monthsAgo + 1, 0).getDate();
  return iso(new Date(now.getFullYear(), now.getMonth() - monthsAgo, Math.min(day, last)));
};
// Expected dates for "day 5", logged through 3 months ago.
const expectedA = [2, 1, 0].map((m) => dayIn(m, 5)).filter((d) => d <= today);
const nextA = dayIn(0, 5) > today ? dayIn(0, 5) : dayIn(-1, 5);
const afterNextA = dayIn(0, 5) > today ? dayIn(-1, 5) : dayIn(-2, 5);
const fmt = (d) => { const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };

const seed = {
  version: 5,
  state: {
    onboardingComplete: true,
    profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 250000 },
    about: { askedAt: '2026-10-01T10:00:00.000Z' },
    reminderPromptDismissed: true,
    startedAt: new Date(Date.now() - 40 * 864e5).toISOString(),
    feedbackPromptDismissed: true,
    goals: [
      { id: 'a', name: 'Holiday', emoji: '✈️', targetAmount: 200000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z', repeating: { amount: 10000, dayOfMonth: 5, loggedThrough: dayIn(3, 5) } },
      { id: 'b', name: 'Laptop', emoji: '💻', targetAmount: 30000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z', repeating: { amount: 10000, dayOfMonth: 1, loggedThrough: dayIn(2, 1) } },
      { id: 'c', name: 'Phone', emoji: '📱', targetAmount: 60000, targetDate: dayIn(-5, 28), createdAt: '2026-06-01T09:00:00.000Z' },
    ],
    contributions: [{ id: 'x1', goalId: 'b', amount: 25000, date: dayIn(3, 10) }],
  },
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  page.on('dialog', (d) => d.accept());
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const text = () => page.evaluate(() => document.body.innerText);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(700); return; }
    }
    throw new Error('no visible ' + t);
  };
  const repeatingOf = (s, id) => s.state.contributions.filter((c) => c.goalId === id && c.note === 'Repeating');

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate((s) => localStorage.setItem('savings-app-data', JSON.stringify(s)), seed);
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1800);
  let s = await stored();
  let a = repeatingOf(s, 'a');
  check('missed months caught up, on the right days', JSON.stringify(a.map((c) => c.date)) === JSON.stringify(expectedA) && a.every((c) => c.amount === 10000), JSON.stringify(a.map((c) => c.date)));
  let b = repeatingOf(s, 'b');
  check('last payment capped at what the goal needs, then stops', b.length === 1 && b[0].amount === 5000, JSON.stringify(b.map((c) => [c.date, c.amount])));
  check('loggedThrough moves on (also past a reached goal)', s.state.goals[1].repeating.loggedThrough === dayIn(0, 1) && s.state.goals[0].repeating.loggedThrough === expectedA.at(-1));
  check('storage upgraded to the current version', s.version === STORAGE_VERSION);

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  s = await stored();
  check('no duplicates after reopening', repeatingOf(s, 'a').length === expectedA.length && repeatingOf(s, 'b').length === 1);

  // A deleted repeating entry doesn't come back.
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('savings-app-data'));
    const i = d.state.contributions.findIndex((c) => c.goalId === 'a' && c.note === 'Repeating');
    d.state.contributions.splice(i, 1);
    localStorage.setItem('savings-app-data', JSON.stringify(d));
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  s = await stored();
  check('deleted entry is not logged again', repeatingOf(s, 'a').length === expectedA.length - 1);

  // ---- Home cards ----
  let t = await text();
  await shot('01-home');
  check('install card on web, iPhone steps', t.includes('Keep your savings safe') && t.includes('On iPhone') && t.includes('Add to Home Screen'));
  check('backup reminder after a month', t.includes('Back up your savings') && t.includes('You haven’t') === false);
  await click('Got it');
  check('install card closes for good', !(await text()).includes('Keep your savings safe') && (await stored()).state.installPromptDismissed === true);
  await click('Later');
  s = await stored();
  check('backup "Later" snoozes it', !(await text()).includes('Back up your savings') && s.state.backupPromptSnoozedAt);

  // ---- Goal detail: repeating card, skip ----
  await page.goto(BASE + '/goals/a', { waitUntil: 'networkidle0' });
  await sleep(1800);
  t = await text();
  await shot('02-detail-repeating');
  check('detail shows the repeating saving', t.includes('£100 on the 5th of every month') && t.includes(`Next one: ${fmt(nextA)}`), t.match(/Next one:[^\n]*/)?.[0]);
  check('history marks entries as Repeating', t.includes('Repeating'));
  await click('Skip next');
  t = await text();
  check('skip next moves to the month after', t.includes(`Next one: ${fmt(afterNextA)}`), t.match(/Next one:[^\n]*/)?.[0]);
  check('says which payment is skipped, with Undo skip', t.includes(`Skipping ${fmt(nextA)}.`) && t.includes('Undo skip'));
  const countBefore = (await stored()).state.contributions.length;
  await click('Skip next');
  t = await text();
  const thirdA = dayIn(0, 5) > today ? dayIn(-2, 5) : dayIn(-3, 5);
  check('skip twice', t.includes(`Next one: ${fmt(thirdA)}`) && t.includes(`Skipping ${fmt(nextA)} and ${fmt(afterNextA)}.`), t.match(/Skipping[^\n]*/)?.[0]);
  await click('Undo skip');
  t = await text();
  check('undo brings back the latest skip', t.includes(`Next one: ${fmt(afterNextA)}`) && t.includes(`Skipping ${fmt(nextA)}.`), t.match(/Next one:[^\n]*/)?.[0]);
  await click('Undo skip');
  t = await text();
  s = await stored();
  check('undo again: back to normal, Undo button gone', t.includes(`Next one: ${fmt(nextA)}`) && !t.includes('Skipping') && !t.includes('Undo skip'), t.match(/Next one:[^\n]*/)?.[0]);
  check('undoing logs nothing early', s.state.contributions.length === countBefore && s.state.goals[0].repeating.loggedThrough <= today, s.state.goals[0].repeating.loggedThrough);
  await shot('02b-after-undo');
  await click('Skip next');
  await shot('02c-skipped');

  // ---- Set up on a goal without one: today's day logs straight away ----
  await page.goto(BASE + '/goals/c', { waitUntil: 'networkidle0' });
  await sleep(1800);
  await click('Set up a repeating saving');
  await sleep(800);
  t = await text();
  await shot('03-setup');
  const prefill = await page.$eval('input[placeholder="e.g. 100"]', (e) => e.value);
  check('amount starts at the monthly plan', prefill !== '' && t.includes('First one: Today'), `prefill=${prefill}`);
  check('shows when it would finish', /reach it in about [A-Z][a-z]+ \d{4}/.test(t));
  await click('Start repeating saving');
  await sleep(1200);
  s = await stored();
  const c = repeatingOf(s, 'c');
  check('set up for today: logged straight away', c.length === 1 && c[0].date === today && s.state.goals[2].repeating.loggedThrough === today, JSON.stringify(c));
  t = await text();
  check('card shows next month', t.includes('Repeating saving') && t.includes('Next one:'));

  await click('Change');
  await sleep(800);
  await click('Stop repeating saving');
  await sleep(1000);
  s = await stored();
  t = await text();
  check('stop removes it but keeps logged savings', !s.state.goals[2].repeating && repeatingOf(s, 'c').length === 1 && t.includes('Save automatically'));

  // ---- Backup now (computer: downloads a file) and Settings ----
  await page.emulate({ viewport: { width: 1200, height: 900, deviceScaleFactor: 1, isMobile: false, hasTouch: false }, userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36' });
  const cdp = await page.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  // Change stored data where the app isn't running, so it can't save over the change.
  await page.goto(BASE + '/manifest.json', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    const d = JSON.parse(localStorage.getItem('savings-app-data'));
    d.state.backupPromptSnoozedAt = null;
    localStorage.setItem('savings-app-data', JSON.stringify(d));
  });
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle0' });
  await sleep(1500);
  check('Settings: no backup yet', (await text()).includes('You haven’t made a backup yet.'));
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  const newest = () => Math.max(0, ...fs.readdirSync(DL).map((f) => fs.statSync(path.join(DL, f)).mtimeMs));
  const before = newest();
  await click('Back up now');
  await sleep(2000);
  s = await stored();
  check('Back up now downloads a file and hides the card', newest() > before && s.state.lastBackupAt && !(await text()).includes('Back up your savings'), `files ${before}->${fs.readdirSync(DL).length} last=${s.state.lastBackupAt} cardStill=${(await text()).includes('Back up your savings')} failMsg=${(await text()).includes('Couldn')}`);
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle0' });
  await sleep(1500);
  check('Settings shows the last backup', (await text()).includes('Last backup: Today.'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

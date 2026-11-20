// End-to-end check of the nine new features on the built web app.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'features');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const monthsAgo = (n, day = 5) => {
  const d = new Date(now.getFullYear(), now.getMonth() - n, day);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

// Saved before this update (storage version 2): no appearance, appLock, payWeekday, withdrawals…
const seed = {
  version: 2,
  state: {
    onboardingComplete: true,
    profile: { name: 'Can', currency: 'GBP', monthlyIncome: 200000 },
    reminders: { enabled: false, frequency: 'weekly', weekday: 1, dayOfMonth: 1, hour: 18, minute: 0 },
    about: { focus: 'travel', payFrequency: 'monthly', payday: now.getDate(), emergencyFund: 'covered', budgetStyle: '50-30-20', guidance: 'brief', celebrations: true, askedAt: '2026-11-01T10:00:00.000Z', emergencyPromptDismissed: false },
    reminderPromptDismissed: true,
    goals: [
      { id: 'hol', name: 'Holiday', targetAmount: 150000, targetDate: '2027-08-31', emoji: '✈️', createdAt: '2026-07-01T09:00:00.000Z' },
      { id: 'lap', name: 'Laptop', targetAmount: 90000, targetDate: null, emoji: '💻', createdAt: '2026-06-01T09:00:00.000Z' },
      { id: 'pho', name: 'Phone', targetAmount: 60000, targetDate: null, emoji: '📱', createdAt: '2026-08-01T09:00:00.000Z' },
    ],
    contributions: [
      { id: 'c1', goalId: 'lap', amount: 50000, date: monthsAgo(3) },
      { id: 'c2', goalId: 'lap', amount: 40000, date: monthsAgo(2) },
      { id: 'c3', goalId: 'hol', amount: 20000, date: monthsAgo(1) },
      { id: 'c4', goalId: 'pho', amount: 10000, date: monthsAgo(0, 1) },
    ],
  },
};

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  page.on('dialog', (d) => d.accept());
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
  const text = () => page.evaluate(() => document.body.innerText);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(700); return; }
    }
    throw new Error('no visible ' + t);
  };
  const visibleInputs = () => page.$$eval('input', (els) => els.filter((e) => e.getBoundingClientRect().width > 0).map((e) => e.placeholder));
  const typeInto = async (placeholder, value, nth = 0) => {
    const handles = [];
    for (const h of await page.$$(`input[placeholder="${placeholder}"]`)) {
      const b = await h.boundingBox();
      if (b && b.width > 0) handles.push(h);
    }
    await handles[nth].click({ clickCount: 3 });
    await handles[nth].type(value);
    await sleep(300);
  };

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate((s) => localStorage.setItem('savings-app-data', JSON.stringify(s)), seed);
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  let t = await text();
  await shot('01-home');
  check('old (v2) data loads', t.includes('Hi Can') && t.includes('Holiday'));

  // ---- Payday check-in ----
  check('payday card shows', t.includes('It’s payday!'));
  const saveBtn = t.match(/Save £[\d,]+ to [A-Za-z]+/)?.[0];
  check('quick save suggests the monthly 20% (£400)', saveBtn?.startsWith('Save £400 to'), saveBtn);
  await click(saveBtn);
  await sleep(800);
  t = await text();
  let s = await stored();
  check('quick save logs a "Payday" saving', s.state.contributions.some((c) => c.note === 'Payday' && c.amount === 40000 && c.date === today));
  check('check-in remembered, storage upgraded', s.state.paydayCheckIn === today && s.version === STORAGE_VERSION);
  check('thank-you message', t.includes('Nice one!'));
  await click('Done');
  check('payday card gone after answering', !(await text()).includes('It’s payday!'));

  // ---- Streak ----
  t = await text();
  check('streak card (4 months in a row)', t.includes('🔥 4 months in a row'), t.match(/🔥[^\n]*/)?.[0]);

  // ---- Split money ----
  await click('Split money');
  await sleep(800);
  await shot('02-split');
  await typeInto('e.g. 300', '300');
  t = await text();
  check('split fills shares automatically', t.includes('All £300 shared out ✓'));
  await click('Evenly');
  t = await text();
  check('evenly also adds up', t.includes('All £300 shared out ✓'));
  const before = (await stored()).state.contributions.length;
  await click('Save');
  await sleep(800);
  s = await stored();
  const added = s.state.contributions.slice(before);
  check('split saves one saving per goal, totalling £300', added.length === 2 && added.reduce((a, c) => a + c.amount, 0) === 30000 && added.every((c) => c.note === 'Split'), JSON.stringify(added.map((c) => [c.goalId, c.amount])));

  // ---- Reached shelf ----
  await click('Goals');
  await sleep(900);
  t = await text();
  await shot('03-goals');
  check('reached shelf collapsed', t.includes('Reached 🎉 (1)') && !t.includes('Laptop'));
  check('split button on goals list', t.includes('Split money between goals'));
  await click('Reached 🎉 (1)');
  check('reached shelf opens', (await text()).includes('Laptop'));

  // ---- What if + take money out ----
  await click('Holiday');
  await sleep(1200);
  t = await text();
  await shot('04-detail');
  check('what-if planner shows', t.includes('What if?') && /You’d reach it in [A-Z][a-z]+ \d{4}/.test(t), t.match(/You’d reach it[^\n]*/)?.[0]);
  const firstResult = t.match(/You’d reach it[^\n]*/)?.[0];
  await page.click('[aria-label="More (If I save each month)"]');
  await sleep(400);
  const secondResult = (await text()).match(/You’d reach it[^\n]*/)?.[0];
  check('planner updates when the amount changes', firstResult !== secondResult, secondResult);
  const savedBefore = t.match(/Saved\n(£[\d,]+)/)?.[1];
  await click('Take money out');
  await sleep(800);
  await typeInto('e.g. 50', '99999');
  await click('Save');
  t = await text();
  check('cannot take out more than the goal holds', t.includes('You can take out up to'));
  await typeInto('e.g. 50', '50');
  await click('Save');
  await sleep(1000);
  t = await text();
  await shot('05-after-withdraw');
  check('withdrawal shows in history', t.includes('−£50 taken out'));
  const savedAfter = t.match(/Saved\n(£[\d,]+)/)?.[1];
  check('total goes down by £50', savedBefore && savedAfter && Number(savedBefore.replace(/[£,]/g, '')) - Number(savedAfter.replace(/[£,]/g, '')) === 50, `${savedBefore} → ${savedAfter}`);

  // ---- Budget: your months ----
  await click('Budget');
  await sleep(1000);
  t = await text();
  await shot('06-budget');
  const monthNow = now.toLocaleDateString('en-GB', { month: 'long' });
  const monthPrev = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleDateString('en-GB', { month: 'long' });
  check('Your months card: right month names and ticks', t.includes('Your months') && t.includes(`${monthNow} (so far)`) && t.includes(monthPrev) && t.includes('✓'));
  check('Budget streak subtitle', t.includes('🔥 4 months in a row'));

  // ---- Year in review ----
  await click('Year in review');
  await sleep(1000);
  t = await text();
  await shot('07-year-review');
  check('year review shows total and reached goal', t.includes(`In ${now.getFullYear()} you saved`) && t.includes('Goals you reached') && t.includes('Laptop'));
  await click('Close');

  // ---- Settings: appearance, privacy hidden on web, pay weekday ----
  await click('Settings');
  await sleep(1000);
  t = await text();
  check('privacy lock hidden on web', !t.includes('Lock with Face ID'));
  check('look back button', t.includes(`Your ${now.getFullYear()} in review`));
  const bg = () => page.evaluate(() => {
    const el = [...document.querySelectorAll('div')].find((d) => d.innerText?.startsWith('Settings') && getComputedStyle(d).backgroundColor !== 'rgba(0, 0, 0, 0)');
    return el ? getComputedStyle(el).backgroundColor : null;
  });
  const lightBg = await bg();
  await click('🌙 Dark');
  await sleep(500);
  const darkBg = await bg();
  await shot('08-settings-dark');
  check('dark mode applies', lightBg === 'rgb(255, 255, 255)' && darkBg === 'rgb(0, 0, 0)', `${lightBg} → ${darkBg}`);
  check('appearance saved', (await stored()).state.appearance === 'dark');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
  await click('☀️ Light');
  await sleep(500);
  check('light overrides a dark system setting', (await bg()) === 'rgb(255, 255, 255)');
  await click('System');
  await sleep(500);
  check('system follows the browser again', (await bg()) === 'rgb(0, 0, 0)');

  await click('Change your answers');
  await sleep(1000);
  await click('Weekly');
  t = await text();
  check('weekly pay asks which day', t.includes('Which day are you paid?'));
  await page.click('[aria-label="Friday"]');
  await sleep(400);
  s = await stored();
  check('pay weekday saved, reminder the day after', s.state.about.payWeekday === 6 && s.state.reminders.weekday === 7, `payWeekday=${s.state.about.payWeekday} reminderWeekday=${s.state.reminders.weekday}`);
  await click('Done');

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

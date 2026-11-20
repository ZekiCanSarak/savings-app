// "It varies" pay schedules: set dates and patterns.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'varies');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
const now = new Date();
const day = now.getDate();
const weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const todayName = weekdayNames[now.getDay()];
const weekOfMonth = Math.ceil(day / 7); // which "First/Second/…" today is
const weekLabel = ['First', 'Second', 'Third', 'Fourth'][weekOfMonth - 1];

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const text = () => page.evaluate(() => document.body.innerText);
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(500); return; }
    }
    throw new Error('no visible ' + t);
  };
  const clickLabel = async (label) => {
    for (const el of await page.$$(`[aria-label="${label}"]`)) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(300); return; }
    }
    throw new Error('no visible label ' + label);
  };
  const ord = (n) => n + ({ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10 > 3 || [11, 12, 13].includes(n % 100) ? 0 : n % 10] || 'th');

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.setItem('savings-app-data', JSON.stringify({ version: 3, state: {
    onboardingComplete: true, profile: { name: 'Can', currency: 'GBP', monthlyIncome: 300000 },
    reminders: { enabled: false, frequency: 'weekly', weekday: 1, dayOfMonth: 1, hour: 18, minute: 0 },
    about: { focus: 'travel', payFrequency: 'monthly', payday: 1, payWeekday: null, emergencyFund: 'covered', budgetStyle: '50-30-20', guidance: 'brief', celebrations: true, askedAt: '2026-11-01T10:00:00.000Z', emergencyPromptDismissed: false },
    appearance: 'system', appLock: false, paydayCheckIn: null, yearReviewDismissed: null, reminderPromptDismissed: true,
    goals: [{ id: 'hol', name: 'Holiday', targetAmount: 150000, targetDate: '2027-08-31', emoji: '✈️', createdAt: '2026-07-01T09:00:00.000Z' }],
    contributions: [] } })));
  await page.goto(BASE + '/about-you', { waitUntil: 'networkidle0' });
  await sleep(1500);

  // ---- Set dates ----
  await click('It varies');
  let t = await text();
  check('"It varies" asks when you usually get paid', t.includes('When do you usually get paid?'));
  await click('On set dates');
  await clickLabel('1st of the month');
  await clickLabel('15th of the month');
  await clickLabel(`${ord(day)} of the month`);
  await shot('01-dates');
  t = await text();
  const expected = [1, 15, day].filter((v, i, a) => a.indexOf(v) === i).sort((a, b) => a - b).map(ord);
  const list = expected.length > 1 ? `${expected.slice(0, -1).join(', ')} and ${expected.at(-1)}` : expected[0];
  check('summary of set dates', t.includes(`Paid on the ${list} of every month.`), list);
  let s = await stored();
  check('dates saved', JSON.stringify(s.state.about.paySchedule) === JSON.stringify({ kind: 'dates', days: [...new Set([1, 15, day])].sort((a, b) => a - b) }), JSON.stringify(s.state.about.paySchedule));
  check('reminder default: day after the first date (the 2nd)', s.state.reminders.frequency === 'monthly' && s.state.reminders.dayOfMonth === 2);
  await click('Done');
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  await shot('02-home-dates');
  const perPay = Math.round(60000 / expected.length) / 100;
  check('payday card on a set date', t.includes('It’s payday!'));
  check('suggestion shared between paydays', t.includes(`Save £${perPay.toLocaleString('en-GB', { maximumFractionDigits: 2 })}`) || t.includes(`Save £${perPay}`), t.match(/Save £[\d.,]+/)?.[0]);
  await page.goto(BASE + '/settings', { waitUntil: 'networkidle0' });
  await sleep(1200);
  check('settings summary for dates', (await text()).includes(`It varies, usually on the ${list}`));

  // ---- Pattern matching today ----
  if (weekOfMonth <= 4) {
    await page.goto(BASE + '/about-you', { waitUntil: 'networkidle0' });
    await sleep(1500);
    await click('On a pattern');
    await click(weekLabel);
    await clickLabel(todayName);
    t = await text();
    await shot('03-pattern');
    check('pattern summary', t.includes(`Paid on the ${weekLabel.toLowerCase()} ${todayName} of every month.`));
    s = await stored();
    check('pattern saved', s.state.about.paySchedule.kind === 'pattern' && s.state.about.paySchedule.week === weekOfMonth && s.state.about.paySchedule.weekday === now.getDay() + 1, JSON.stringify(s.state.about.paySchedule));
    await click('Done');
    await page.evaluate(() => {
      const d = JSON.parse(localStorage.getItem('savings-app-data'));
      d.state.paydayCheckIn = null;
      localStorage.setItem('savings-app-data', JSON.stringify(d));
    });
    await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
    await sleep(1500);
    t = await text();
    check(`payday card on the ${weekLabel.toLowerCase()} ${todayName}`, t.includes('It’s payday!') && t.includes('Save £600'), t.match(/Save £[\d.,]+/)?.[0]);
  }

  // ---- Last Friday wording, then "No set days" ----
  await page.goto(BASE + '/about-you', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await click('Last');
  await clickLabel('Friday');
  t = await text();
  check('last Friday summary', t.includes('Paid on the last Friday of every month.'));
  await click('No set days');
  s = await stored();
  t = await text();
  check('no set days clears the schedule', s.state.about.paySchedule === null && t.includes('No problem.'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

// Opening a goal's link directly, and Budget's collapsible tips on web.
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, isKnownNoise } = require('./config');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const text = () => page.evaluate(() => document.body.innerText);

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version: 1, state: {
      onboardingComplete: true,
      profile: { name: 'Tester', currency: 'GBP', monthlyIncome: 200000 },
      reminders: { enabled: false, frequency: 'weekly', weekday: 1, dayOfMonth: 1, hour: 18, minute: 0 },
      reminderPromptDismissed: true,
      goals: [{ id: 'g1', name: 'New laptop', targetAmount: 90000, targetDate: null, emoji: '💻', createdAt: '2026-06-01T09:00:00.000Z' }],
      contributions: [{ id: 'c3', goalId: 'g1', amount: 12000, date: '2026-11-02', note: 'Bonus' }],
    } }));
  });

  // A refreshed or shared goal link lands on the right screen (or a clear "not found").
  await page.goto(BASE + '/goals/g1', { waitUntil: 'networkidle0' });
  await sleep(2000);
  let t = await text();
  check('a goal link opens that goal', t.includes('New laptop') && t.includes('£120'));
  await page.goto(BASE + '/goals/missing', { waitUntil: 'networkidle0' });
  await sleep(2000);
  t = await text();
  check('a missing goal says so, with a way back', t.includes('Goal not found') && t.includes('Back to goals'));

  // Budget tips start closed on web and open on tap.
  await page.goto(BASE + '/budget', { waitUntil: 'networkidle0' });
  await sleep(1500);
  const tipCount = () => page.evaluate(() => document.querySelectorAll('[aria-label^="Tip: "]').length);
  const header = await page.waitForSelector('[aria-label^="Tips for you"]');
  const expanded = () => header.evaluate((e) => e.getAttribute('aria-expanded'));
  check('tips start closed', (await tipCount()) === 0 && (await expanded()) === 'false');
  await header.click();
  await sleep(600);
  check('tapping opens the tips', (await tipCount()) > 0 && (await expanded()) === 'true');
  await header.click();
  await sleep(600);
  check('tapping again closes them', (await tipCount()) === 0 && (await expanded()) === 'false');

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

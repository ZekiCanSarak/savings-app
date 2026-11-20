// Short welcome flow + "Complete your profile" card, and goal interest rates.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'interest');
fs.mkdirSync(OUT, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
const pad = (n) => String(n).padStart(2, '0');
const now = new Date();
const endOfMonthIn = (m) => { const d = new Date(now.getFullYear(), now.getMonth() + m + 1, 0); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

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
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(600); return; }
    }
    throw new Error('no visible ' + t);
  };
  const typeInto = async (placeholder, value) => {
    for (const h of await page.$$(`input[placeholder="${placeholder}"]`)) {
      const b = await h.boundingBox();
      if (b && b.width > 0) { await h.click({ clickCount: 3 }); await page.keyboard.press('Backspace'); await h.type(value); await sleep(300); return; }
    }
    throw new Error('no input ' + placeholder);
  };

  // ---- Short welcome flow ----
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await click('Get started');
  const steps = await page.$eval('[aria-label^="Step "]', (e) => e.getAttribute('aria-label'));
  check('welcome flow has 3 steps', steps === 'Step 1 of 3', steps);
  await typeInto('e.g. Sam', 'Jo');
  await click('Next');
  await click('Next');
  let t = await text();
  check('income step is generic (no pay question first)', t.includes('If it changes from month to') && t.includes('Monthly income after tax'));
  await typeInto('e.g. 1850', '2000');
  await click('Finish');
  await sleep(1500);
  t = await text();
  await shot('01-home-after-welcome');
  let s = await stored();
  check('straight into the app after 3 steps', t.includes('Hi Jo') && s.state.onboardingComplete === true);
  check('Home asks to complete the profile', t.includes('Complete your profile') && t.includes('more accurate for you') && s.state.about.askedAt === null);
  await click('Answer now');
  await sleep(800);
  t = await text();
  check('Complete profile opens the questions', t.includes('What are you mainly saving for?') || t.includes('About you'));
  await click('Done');
  await sleep(800);
  check('card gone once the questions were opened', !(await text()).includes('Complete your profile'));

  // ---- Interest ----
  await page.evaluate((target) => {
    const d = JSON.parse(localStorage.getItem('savings-app-data'));
    d.state.goals = [{ id: 'h', name: 'House deposit', emoji: '🏠', targetAmount: 1000000, targetDate: target, createdAt: '2026-06-01T09:00:00.000Z' }];
    d.state.contributions = [{ id: 'c1', goalId: 'h', amount: 200000, date: '2026-10-01' }];
    d.state.installPromptDismissed = true;
    localStorage.setItem('savings-app-data', JSON.stringify(d));
  }, endOfMonthIn(23));
  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await click('House deposit');
  await sleep(1500);
  t = await text();
  const before = Number(t.match(/You need to save £([\d,.]+) per month/)?.[1].replace(/,/g, ''));
  check('plan without interest: £8,000 over 24 months = £333.34', before === 333.34, String(before));
  await click('Earning interest on this? Add your rate');
  await sleep(800);
  t = await text();
  await shot('02-editor-rate');
  check('editor explains the rate comes from their bank', t.includes('Interest rate (optional)') && t.includes('% a year') && t.includes('your\nown bank') === false && t.includes('own bank pays') && t.includes('doesn’t hold'));
  await typeInto('e.g. 4.5', '45');
  await click('Save changes');
  t = await text();
  check('too-high rate is caught', t.includes('That looks too high'));
  await typeInto('e.g. 4.5', '4');
  t = await text();
  check('editor preview mentions interest', /a month to reach it by [A-Z][a-z]+ \d{4}, including interest\./.test(t.replace(/\s+/g, ' ')), t.match(/That’s about[^\n]*/)?.[0]);
  await click('Save changes');
  await sleep(1200);
  s = await stored();
  check('rate saved as 400 (4%)', s.state.goals[0].interestRate === 400 && s.version === STORAGE_VERSION);
  t = await text();
  await shot('03-detail-interest');
  const after = Number(t.match(/You need to save £([\d,.]+) per month/)?.[1].replace(/,/g, ''));
  check('monthly plan goes down with interest', after > 0 && after < before && t.includes('This includes the interest your bank pays.'), `${before} → ${after}`);
  check('interest card with estimate', t.includes('Interest (estimate)') && /At 4% a year, about £[\d,.]+ of this goal should come from interest/.test(t.replace(/\s+/g, ' ')) && t.includes('rate you entered from your bank'));
  check('no "add your rate" link once set', !t.includes('Earning interest on this?'));

  // Removing the rate goes back to the plain plan.
  await click('Change');
  await sleep(800);
  const rateNow = await page.$eval('input[placeholder="e.g. 4.5"]', (e) => e.value);
  check('editor shows the saved rate', rateNow === '4', rateNow);
  await typeInto('e.g. 4.5', '');
  await click('Save changes');
  await sleep(1200);
  s = await stored();
  t = await text();
  check('clearing the rate removes it', s.state.goals[0].interestRate === undefined && !t.includes('Interest (estimate)') && t.includes('£333.34'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

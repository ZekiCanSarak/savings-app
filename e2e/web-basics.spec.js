// Core web checks: PWA tags, the welcome flow, export / import and wide screens.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, isKnownNoise } = require('./config');

const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots');
fs.mkdirSync(OUT, { recursive: true });
const DL = path.join(OUTPUT, 'downloads');
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });

const backup = {
  app: 'goalpot',
  version: 1,
  exportedAt: '2026-11-01T10:00:00.000Z',
  data: {
    profile: { name: 'Tester', currency: 'GBP', monthlyIncome: 200000 },
    goals: [
      { id: 'g1', name: 'New laptop', targetAmount: 90000, targetDate: '2027-03-31', emoji: '💻', createdAt: '2026-06-01T09:00:00.000Z' },
      { id: 'g2', name: 'Holiday', targetAmount: 150000, targetDate: '2027-08-31', emoji: '🏖️', createdAt: '2026-07-01T09:00:00.000Z' },
    ],
    contributions: [
      { id: 'c1', goalId: 'g1', amount: 10000, date: '2026-07-01' },
      { id: 'c2', goalId: 'g1', amount: 15000, date: '2026-09-01' },
      { id: 'c3', goalId: 'g1', amount: 12000, date: '2026-11-02', note: 'Bonus' },
      { id: 'c4', goalId: 'g2', amount: 20000, date: '2026-08-15' },
      { id: 'c5', goalId: 'bogus', amount: 5, date: '2026-08-15' },
    ],
  },
};
const backupPath = path.join(OUTPUT, 'test-backup.json');
fs.mkdirSync(OUTPUT, { recursive: true });
fs.writeFileSync(backupPath, JSON.stringify(backup));
const badPath = path.join(OUTPUT, 'not-a-backup.json');
fs.writeFileSync(badPath, '{"hello": 1}');

const results = [];
const check = (name, ok, extra = '') => {
  results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: true,
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' && !isKnownNoise(m.text())) errors.push(m.text());
  });
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push('PAGEERROR ' + e.message); });
  let dialogs = [];
  page.on('dialog', async (d) => {
    dialogs.push(d.message());
    await d.accept();
  });
  await page.emulate({
    viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const text = () => page.evaluate(() => document.body.innerText);
  const click = async (t) => {
    try {
      await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    } catch (e) {
      await page.screenshot({ path: path.join(OUT, 'fail.png') });
      console.log('FAILED looking for', t, 'page text:', JSON.stringify((await page.evaluate(() => document.body.innerText)).slice(0, 300)));
      throw e;
    }
    const els = await page.$$(`::-p-text(${t})`);
    for (const el of els.reverse()) {
      const box = await el.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        await el.click();
        await sleep(700);
        return;
      }
    }
    throw new Error('no visible ' + t);
  };

  // --- PWA head tags
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  const head = await page.evaluate(() => ({
    manifest: document.querySelector('link[rel=manifest]')?.getAttribute('href'),
    capable: document.querySelector('meta[name=apple-mobile-web-app-capable]')?.content,
    title: document.title,
    touchIcon: document.querySelector('link[rel=apple-touch-icon]')?.getAttribute('href'),
  }));
  check('PWA tags in page head', head.manifest === '/manifest.json' && head.capable === 'yes' && !!head.touchIcon, JSON.stringify(head));
  const manifest = await (await fetch(BASE + '/manifest.json')).json();
  check('manifest served', manifest.name === 'Goalpot' && manifest.display === 'standalone');
  for (const icon of ['/icon-192.png', '/icon-512.png', '/apple-touch-icon.png']) {
    const r = await fetch(BASE + icon);
    check('icon served ' + icon, r.ok && r.headers.get('content-type')?.includes('png'));
  }

  // --- Onboarding
  await sleep(1500);
  check('landing shows first', (await text()).includes('Save for the things you want.'));
  await page.click('::-p-text(Get started)');
  await sleep(800);
  await shot('01-onboarding');
  check('onboarding after Get started', (await text()).includes('Your name'));
  await page.type('input[placeholder="e.g. Sam"]', 'Sam');
  await click('Next');
  await shot('02-currency');
  await click('Next'); // currency
  await page.type('input[placeholder="e.g. 1850"]', '1850');
  await click('Finish'); // the welcome flow is name, currency, income
  await sleep(1000);
  await shot('03-home-empty');
  check('home after onboarding', (await text()).includes('Hi Sam'));

  // --- Settings: no Reminders card on web
  await click('Settings');
  await sleep(800);
  let t = await text();
  check('Settings hides Reminders on web', !t.includes('Reminders') && t.includes('Export my data') && t.includes('Import my data'));
  await shot('04-settings');

  // --- Import: wrong file shows an error, no dialog
  dialogs = [];
  let [chooser] = await Promise.all([page.waitForFileChooser(), click('Import my data')]);
  await chooser.accept([badPath]);
  await sleep(800);
  t = await text();
  check('bad file rejected with message', t.includes('isn’t a Goalpot backup') && dialogs.length === 0);

  // --- Import: real backup asks first, then replaces
  [chooser] = await Promise.all([page.waitForFileChooser(), click('Import my data')]);
  await chooser.accept([backupPath]);
  await sleep(1000);
  check('import asks for confirmation', dialogs.length === 1 && dialogs[0].includes('2 goals') && dialogs[0].includes('4 savings'), dialogs[0]);
  t = await text();
  check('import success message', t.includes('Imported 2 goals and 4 savings'));
  const nameVal = await page.$eval('input', (i) => i.value);
  check('form shows imported name', nameVal === 'Tester', nameVal);
  await shot('05-settings-imported');

  // --- Home
  await click('Home');
  await sleep(1000);
  t = await text();
  check('home shows imported goals', t.includes('Hi Tester') && t.includes('New laptop') && t.includes('Holiday'));
  check('home shows reminders card on web', t.includes('Check back here for your reminders'));
  check('home shows no notification prompt on web', !t.includes('gentle nudge'));
  await shot('06-home');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: path.join(OUT, '06b-home-full.png'), fullPage: true });

  // --- Goals + detail chart
  await click('Goals');
  await sleep(800);
  await shot('07-goals');
  await click('New laptop');
  await sleep(1500);
  const svgCount = await page.evaluate(() => document.querySelectorAll('svg path').length);
  check('goal detail chart renders (svg)', svgCount > 0, `${svgCount} paths`);
  t = await text();
  check('goal detail shows history', t.includes('Bonus'));
  await shot('08-goal-detail');

  // --- Add money
  await click('Add money');
  await sleep(800);
  await page.type('input[placeholder="e.g. 50"]', '25');
  await click('Save');
  await sleep(1200);
  t = await text();
  check('add money updates total (£395 saved)', t.includes('£395'), '');
  await shot('09-after-add-money');

  // --- Budget
  await click('Budget');
  await sleep(1000);
  t = await text();
  check('budget renders', t.includes('50/30/20') || t.toLowerCase().includes('needs'));
  await shot('10-budget');

  // --- Persistence across reload
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  check('data survives reload', t.includes('Hi Tester') && t.includes('New laptop'));

  // --- Deep link refresh on a goal page
  await page.goto(BASE + '/goals/g1', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  check('refresh on /goals/g1 works', t.includes('New laptop') && t.includes('Bonus'));
  await page.goto(BASE + '/goals/missing', { waitUntil: 'networkidle0' });
  await sleep(1500);
  check('missing goal shows not found', (await text()).toLowerCase().includes('not found') || (await text()).toLowerCase().includes('couldn'));

  // --- Export on a computer-style page (mouse pointer => download)
  const desk = await browser.newPage();
  await desk.setViewport({ width: 1200, height: 900 });
  desk.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push('PAGEERROR(desk) ' + e.message); });
  const cdp = await desk.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  await desk.goto(BASE + '/settings', { waitUntil: 'networkidle0' });
  await sleep(1500);
  const el = await desk.waitForSelector('::-p-text(Export my data)');
  await el.click();
  await sleep(2500);
  const files = fs.readdirSync(DL);
  let exported = null;
  if (files.length) exported = JSON.parse(fs.readFileSync(path.join(DL, files[0]), 'utf8'));
  check('export downloads a backup file', !!exported && /^goalpot-backup-\d{4}-\d{2}-\d{2}\.json$/.test(files[0]), files.join(','));
  check('export contains 2 goals and 5 savings', exported && exported.data.goals.length === 2 && exported.data.contributions.length === 5);
  await desk.screenshot({ path: path.join(OUT, '11-desktop-settings.png') });

  check('no console errors', errors.length === 0, errors.slice(0, 5).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => {
  console.log(results.join('\n'));
  console.error('SCRIPT ERROR', e);
  process.exit(1);
});

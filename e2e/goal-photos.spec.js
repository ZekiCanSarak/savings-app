// Goal photos: add one in the goal editor, see it on the card and goal page, keep it after a reload, remove it.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');

const SHOTS = path.join(OUTPUT, 'shots', 'goal-photos');
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
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')).state);
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const clickText = async (t) => {
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(800); return; }
    }
    throw new Error('no visible ' + t);
  };
  const photos = () => page.evaluate(() => [...document.querySelectorAll('img')].filter((i) => i.src.startsWith('data:image/jpeg') && i.getBoundingClientRect().width > 0).length);

  // A landscape test photo (wider than tall, so it has to be cropped square).
  const photoPath = path.join(OUTPUT, 'test-photo.png');
  await page.goto('about:blank');
  const png = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 900; c.height = 600;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 900, 600); grad.addColorStop(0, '#2aa7ff'); grad.addColorStop(1, '#ffd166');
    g.fillStyle = grad; g.fillRect(0, 0, 900, 600);
    g.fillStyle = '#e5484d'; g.beginPath(); g.arc(450, 300, 160, 0, Math.PI * 2); g.fill();
    return c.toDataURL('image/png').split(',')[1];
  });
  fs.writeFileSync(photoPath, Buffer.from(png, 'base64'));

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate((version) => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version, state: {
      onboardingComplete: true,
      profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 250000 },
      about: { askedAt: '2026-10-01T10:00:00.000Z' },
      reminderPromptDismissed: true, installPromptDismissed: true, feedbackPromptDismissed: true,
      goals: [{ id: 'g', name: 'Ibiza', emoji: '🏖️', targetAmount: 50000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z' }],
      contributions: [],
    } }));
  }, STORAGE_VERSION);

  await page.goto(BASE + '/goal-editor?id=g', { waitUntil: 'networkidle0' });
  await sleep(1200);
  check('the editor offers "Add a photo"', (await page.evaluate(() => document.body.innerText)).includes('Add a photo'));
  const [chooser] = await Promise.all([page.waitForFileChooser({ timeout: 8000 }), clickText('Add a photo')]);
  await chooser.accept([photoPath]);
  await sleep(2500);
  await shot('01-editor');
  check('the chosen photo shows in the editor', (await photos()) === 1);
  check('the editor now offers Change and Remove', await page.evaluate(() => document.body.innerText.includes('Change photo') && document.body.innerText.includes('Remove photo')));
  await clickText('Save changes');
  await sleep(1200);

  const image = (await stored()).goals[0].image || '';
  check('the photo is saved with the goal as a small JPEG', image.startsWith('data:image/jpeg;base64,') && image.length < 90000, `${image.length} chars`);
  const size = await page.evaluate((src) => new Promise((res) => { const i = new Image(); i.onload = () => res([i.naturalWidth, i.naturalHeight]); i.src = src; }), image);
  check('it is cropped square and shrunk to 320px', size[0] === 320 && size[1] === 320, String(size));

  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await shot('02-list');
  check('the goal card shows the photo', (await photos()) >= 1);
  await clickText('Ibiza');
  await sleep(1500);
  await shot('03-goal-page');
  check('the goal page shows the photo', (await photos()) >= 1);

  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1500);
  check('the photo is still there after a reload', (await photos()) >= 1);

  await page.goto(BASE + '/goal-editor?id=g', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await clickText('Remove photo');
  await clickText('Save changes');
  await sleep(1000);
  check('Remove photo goes back to the emoji', !('image' in (await stored()).goals[0]));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

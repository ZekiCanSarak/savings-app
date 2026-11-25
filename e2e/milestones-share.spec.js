// Milestones (25/50/75%) and the "Share my progress" image.
const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');

const SHOTS = path.join(OUTPUT, 'shots', 'milestones-share');
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
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  const text = () => page.evaluate(() => document.body.innerText.replace(/\s+/g, ' '));
  const shot = (n) => page.screenshot({ path: path.join(SHOTS, n + '.png') });
  const clickLabel = async (label) => {
    for (const el of (await page.$$(`[aria-label="${label}"]`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(900); return; }
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
  const previewLabel = () => page.evaluate(() => [...document.querySelectorAll('[aria-label^="Progress image"]')].map((e) => e.getAttribute('aria-label'))[0] || '');

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate((version) => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version, state: {
      onboardingComplete: true,
      profile: { name: 'Sam', currency: 'GBP', monthlyIncome: 250000 },
      about: { askedAt: '2026-10-01T10:00:00.000Z' },
      reminderPromptDismissed: true, installPromptDismissed: true, feedbackPromptDismissed: true,
      goals: [{ id: 'g', name: 'Ibiza', emoji: '🏖️', targetAmount: 10000, targetDate: null, createdAt: '2026-06-01T09:00:00.000Z' }],
      contributions: [{ id: 'c1', goalId: 'g', amount: 4000, date: '2026-10-03' }],
    } }));
  }, STORAGE_VERSION);

  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await clickText('Ibiza');
  await sleep(1200);
  let t = await text();
  check('no milestone banner when just opening the goal', !t.includes('Halfway there'));
  // £40 of £100 → +£10 = 50%.
  await clickLabel('Save £10 to Ibiza');
  t = await text();
  await shot('01-halfway');
  check('passing 50% shows "Halfway there!"', t.includes('Halfway there!') && t.includes('£50 of £100 saved for Ibiza'));
  check('the quick save message mentions it too', t.includes('You’re halfway!'));
  await clickText('Nice!');
  check('"Nice!" closes the banner', !(await text()).includes('Halfway there!'));
  await sleep(6000); // the quick-save Undo shows for 6s
  await clickLabel('Save £5 to Ibiza');
  check('no banner without passing a milestone (50% → 55%)', !(await text()).includes('Halfway there!') && !(await text()).includes('Three quarters'));

  // ---- Share screen ----
  await clickText('Share my progress');
  await sleep(1500);
  t = await text();
  await shot('02-share');
  check('the share screen opens with a preview', t.includes('Share progress') && (await previewLabel()).includes('Ibiza, 55% of the way there'));
  check('amounts are hidden by default', !(await previewLabel()).includes('£'));
  await page.waitForFunction(() => document.body.innerText.includes('Share image'), { timeout: 8000 }).catch(() => {});
  check('the image gets made, ready to share', (await text()).includes('Share image'));
  await page.click('[aria-label="Show amounts on the image"]');
  await sleep(1200);
  check('"Show amounts" adds them', (await previewLabel()).includes('£55 of £100'));
  await page.waitForFunction(() => document.body.innerText.includes('Share image'), { timeout: 8000 }).catch(() => {});
  await shot('03-share-amounts');
  // Stand in for the phone's share sheet and keep what it was given.
  await page.evaluate(() => {
    navigator.canShare = () => true;
    navigator.share = async (data) => { window.__shared = data.files[0]; };
  });
  await clickText('Share image');
  await sleep(1200);
  const shared = await page.evaluate(async () => {
    const f = window.__shared;
    if (!f) return null;
    const bmp = await createImageBitmap(f);
    const dataUrl = await new Promise((r) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.readAsDataURL(f); });
    return { name: f.name, type: f.type, width: bmp.width, height: bmp.height, dataUrl };
  });
  check('Share hands the phone a PNG file', Boolean(shared) && shared.type === 'image/png' && shared.name === 'goalpot-ibiza.png', shared && `${shared.name} ${shared.type}`);
  check('the image is 1080 × 1350', Boolean(shared) && shared.width === 1080 && shared.height === 1350, shared && `${shared.width}x${shared.height}`);
  if (shared) fs.writeFileSync(path.join(SHOTS, '04-shared.png'), Buffer.from(shared.dataUrl.split(',')[1], 'base64'));
  check('no error message', !(await text()).includes('didn’t work'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

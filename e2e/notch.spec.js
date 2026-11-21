// Opened from the iPhone home screen, nothing may sit under the notch or the
// home indicator. Chrome pretends to have a 47px notch and 34px home indicator.
const puppeteer = require('puppeteer-core');
const { CHROME, BASE, isKnownNoise } = require('./config');

const TOP = 47;
const BOTTOM = 34;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
  await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  const cdp = await page.createCDPSession();
  try {
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: TOP, bottom: BOTTOM, left: 0, right: 0 } });
  } catch {
    check('this Chrome can pretend to have a notch (update Chrome)', false);
    console.log(results.join('\n'));
    await browser.close();
    return;
  }
  // Opened from the home screen.
  await page.evaluateOnNewDocument(() => Object.defineProperty(navigator, 'standalone', { get: () => true }));
  const topOf = (text) =>
    page.evaluate((t) => {
      const el = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim().startsWith(t) && e.getBoundingClientRect().height > 0);
      return el ? el.getBoundingClientRect().top : null;
    }, text);

  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => localStorage.clear());
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1200);
  let top = await topOf('Welcome');
  check('welcome screen starts below the notch', top !== null && top >= TOP, String(top));

  await page.click('::-p-text(Try the demo with sample data)');
  await sleep(1500);
  top = await topOf('Demo');
  check('Home: demo banner below the notch', top !== null && top >= TOP, String(top));
  const tabGap = await page.evaluate(() => {
    const tab = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && e.textContent.trim() === 'Settings' && e.getBoundingClientRect().height > 0);
    return window.innerHeight - tab.getBoundingClientRect().bottom;
  });
  check('tab bar clear of the home indicator', tabGap >= BOTTOM, String(Math.round(tabGap)));

  await page.goto(BASE + '/goals', { waitUntil: 'networkidle0' });
  await sleep(1500);
  await page.click('::-p-text(Japan trip)');
  await sleep(1500);
  top = await page.evaluate(() => {
    const back = [...document.querySelectorAll('[aria-label]')].find((e) => /back/i.test(e.getAttribute('aria-label')) && e.getBoundingClientRect().height > 0);
    return back ? back.getBoundingClientRect().top : null;
  });
  check('goal page: back button below the notch', top !== null && top >= TOP, String(top));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

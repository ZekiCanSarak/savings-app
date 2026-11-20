// Personalisation end-to-end on the built web app.
const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');
const { CHROME, BASE: SITE, OUTPUT, STORAGE_VERSION, isKnownNoise } = require('./config');
const BASE = SITE;
const OUT = path.join(OUTPUT, 'shots', 'personal');
fs.mkdirSync(OUT, { recursive: true });
const DL = path.join(OUTPUT, 'downloads2');
fs.rmSync(DL, { recursive: true, force: true });
fs.mkdirSync(DL, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
const check = (name, ok, extra = '') => results.push(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);

(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
  const errors = [];
  const newPage = async () => {
    const page = await browser.newPage();
    page.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push(e.message); });
    page.on('dialog', (d) => d.accept());
    await page.emulate({ viewport: { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    return page;
  };
  let page = await newPage();
  const text = () => page.evaluate(() => document.body.innerText);
  const shot = (n) => page.screenshot({ path: path.join(OUT, n + '.png') });
  const click = async (t) => {
    await page.waitForSelector(`::-p-text(${t})`, { timeout: 8000 });
    for (const el of (await page.$$(`::-p-text(${t})`)).reverse()) {
      const b = await el.boundingBox();
      if (b && b.width > 0) { await el.click(); await sleep(600); return; }
    }
    throw new Error('no visible ' + t);
  };
  const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('savings-app-data')));

  // ---------- New user: welcome flow ----------
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await page.click('::-p-text(Get started)');
  await sleep(800);
  await page.type('input[placeholder="e.g. Sam"]', 'Sam');
  await click('Next');
  await click('Next'); // currency
  await page.type('input[placeholder="e.g. 1850"]', '2000');
  await click('Finish');
  await sleep(1200);
  // The questions now come after the short welcome flow, from Home's card.
  check('Home asks to complete the profile', (await text()).includes('Complete your profile'));
  await click('Answer now');
  await sleep(1000);
  check('profile asks how you get paid', (await text()).includes('How do you get paid?'));
  await click('Weekly');
  await shot('01-pay');
  check('profile asks what you save for', (await text()).includes('What are you mainly saving for?'));
  await click('Travel');
  await shot('02-focus');
  await click('Not yet');
  await click('60/20/20 · High rent or bills');
  await shot('03-budget');
  await click('I know the basics');
  await page.click('input[role="switch"], [role="switch"]');
  await sleep(300);
  await shot('04-guidance');
  await click('Done');
  await sleep(1200);
  let s = await stored();
  const a = s.state.about;
  check('answers saved', a.payFrequency === 'weekly' && a.focus === 'travel' && a.emergencyFund === 'none' && a.budgetStyle === '60-20-20' && a.guidance === 'brief' && a.celebrations === false && !!a.askedAt, JSON.stringify(a));
  check('reminder default follows weekly pay', s.state.reminders.frequency === 'weekly');
  check('storage at the current version', s.version === STORAGE_VERSION);

  // ---------- Home ----------
  let t = await text();
  await shot('05-home');
  check('home offers starter goal', t.includes('Create “Holiday”') && t.includes('saving for travel'));
  check('home emergency card with 3 months of needs (£3,600)', t.includes('Start an emergency fund') && t.includes('£3,600'));
  check('no "Complete your profile" once answered', !t.includes('Complete your profile'));
  await click('Create “Holiday”');
  await sleep(800);
  const goalName = await page.$eval('input', (i) => i.value);
  check('goal editor prefilled', goalName === 'Holiday', goalName);
  await page.type('input[placeholder="£ e.g. 900"], input[inputmode="decimal"]', '900');
  await click('Add goal');
  await sleep(1000);

  // ---------- Budget ----------
  await click('Budget');
  await sleep(1000);
  t = await text();
  await shot('06-budget');
  check('budget uses 60/20/20', t.includes('60/20/20: 60% on needs, 20% on wants and 20% on savings') && t.includes('£1,200'));
  check('budget shows weekly amount (£92.31 a week)', t.includes('about £92.31 a week'), t.match(/Suggested:[^\n]*/)?.[0]);
  check('brief: no Good to know card', !t.includes('Good to know'));
  check('brief: 3 tips', t.includes('3 ideas to help you save'));
  await click('Tips for you');
  const visibleTips = await page.evaluate(() =>
    [...document.querySelectorAll('[aria-label^="Tip: "]')]
      .filter((e) => e.getClientRects().length > 0 && e.getBoundingClientRect().width > 0)
      .map((e) => e.getAttribute('aria-label').slice(5, 45)));
  console.log('visible budget tips:', visibleTips);
  const firstTip = visibleTips[0];
  check('first tip matches answers (travel/emergency)', /trip|emergency|holiday|yearly|big purchases/i.test(firstTip || ''), firstTip);

  // ---------- Settings summary ----------
  await click('Settings');
  await sleep(1000);
  t = await text();
  await shot('07-settings');
  check('settings summary', ['Travel', 'Weekly', 'Not yet', '60/20/20 (high rent or bills)', 'I know the basics'].every((x) => t.includes(x)) && /Confetti\s*Off/.test(t));

  // ---------- Export includes answers (computer-style page) ----------
  const desk = await browser.newPage();
  desk.on('pageerror', (e) => { if (!isKnownNoise(e.message)) errors.push('desk ' + e.message); });
  await desk.setViewport({ width: 1200, height: 900 });
  const cdp = await desk.createCDPSession();
  await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL });
  await desk.goto(BASE + '/settings', { waitUntil: 'networkidle0' });
  await sleep(1200);
  await (await desk.waitForSelector('::-p-text(Export my data)')).click();
  await sleep(2500);
  const f = fs.readdirSync(DL)[0];
  const exported = f && JSON.parse(fs.readFileSync(path.join(DL, f), 'utf8'));
  check('export includes answers', exported?.data?.about?.focus === 'travel');
  await desk.close();

  // ---------- Existing user (saved before this feature) ----------
  await page.close();
  page = await newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await page.evaluate(() => {
    localStorage.setItem('savings-app-data', JSON.stringify({ version: 1, state: {
      onboardingComplete: true, profile: { name: 'Can', currency: 'GBP', monthlyIncome: 250000 },
      reminders: { enabled: false, frequency: 'weekly', weekday: 1, dayOfMonth: 1, hour: 18, minute: 0 }, reminderPromptDismissed: false,
      goals: [{ id: 'g1', name: 'New laptop', targetAmount: 90000, targetDate: '2027-03-31', emoji: '💻', createdAt: '2026-06-01T09:00:00.000Z' }],
      contributions: [{ id: 'c1', goalId: 'g1', amount: 34000, date: '2026-11-02' }] } }));
  });
  await page.goto(BASE + '/', { waitUntil: 'networkidle0' });
  await sleep(1500);
  t = await text();
  await shot('08-existing-home');
  check('old data still loads', t.includes('Hi Can') && t.includes('New laptop'));
  check('existing user sees "Complete your profile"', t.includes('Complete your profile'));
  check('no emergency card before answering', !t.includes('Start an emergency fund'));
  await click('Answer now');
  await sleep(1000);
  await shot('09-about-you');
  t = await text();
  check('About you screen opens', t.includes('What are you mainly saving for?') && t.includes('How much help would you like?'));
  await click('A home');
  await click('Monthly');
  await sleep(300);
  await click('Choose a day');
  await page.click('[aria-label="Later day (What day is payday?)"]');
  await sleep(200);
  for (let i = 0; i < 24; i++) await page.click('[aria-label="Later day (What day is payday?)"]');
  await sleep(300);
  await click('A little');
  await shot('10-about-you-answered');
  await click('Done');
  await sleep(1000);
  t = await text();
  await shot('11-existing-home-after');
  check('prompt gone after answering', !t.includes('Complete your profile'));
  check('greeting uses focus (£340 closer to your new home)', t.includes('£340 closer to your new home'));
  check('emergency card for "A little"', t.includes('Start an emergency fund') && t.includes('£3,750'));
  s = await stored();
  check('payday 25 → monthly reminder on the 26th', s.state.about.payday === 25 && s.state.reminders.frequency === 'monthly' && s.state.reminders.dayOfMonth === 26, `payday=${s.state.about.payday} day=${s.state.reminders.dayOfMonth}`);
  await click('No thanks');
  await sleep(500);
  check('emergency card dismissible', !(await text()).includes('Start an emergency fund'));

  await click('Budget');
  await sleep(1000);
  t = await text();
  await shot('12-budget-guided');
  check('skipped help = guided: Good to know + all tips', t.includes('Good to know') && /\d{2} ideas to help you save/.test(t));
  check('default budget 50/30/20', t.includes('50/30/20: 50% on needs'));

  check('no page errors', errors.length === 0, errors.slice(0, 3).join(' | '));
  console.log(results.join('\n'));
  await browser.close();
})().catch((e) => { console.log(results.join('\n')); console.error('SCRIPT ERROR', e.message); process.exit(1); });

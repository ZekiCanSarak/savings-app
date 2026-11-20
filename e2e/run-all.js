// Runs every e2e/*.spec.js against the web build. `npm run test:e2e` builds
// first; set BASE=https://goalpot.expo.app to test the live site instead.
// Exits with an error if any check fails.
const { execFile } = require('child_process');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');

const { BASE, CHROME } = require('./config');
const { startServer } = require('./server');

(async () => {
  if (!CHROME) {
    console.error('Chrome not found. Install Google Chrome or set CHROME_PATH.');
    process.exit(1);
  }
  const local = !process.env.BASE;
  const dist = path.join(__dirname, '..', 'dist');
  if (local && !fs.existsSync(dist)) {
    console.error('No web build in dist/. Run `npm run test:e2e` (it builds first).');
    process.exit(1);
  }
  const server = local ? await startServer(dist, Number(new URL(BASE).port)) : null;

  const only = process.argv[2];
  const specs = fs
    .readdirSync(__dirname)
    .filter((f) => f.endsWith('.spec.js') && (!only || f.includes(only)))
    .sort();
  let passed = 0;
  let failed = 0;
  for (const spec of specs) {
    let output;
    try {
      // Asynchronous, so the local server in this process keeps answering requests.
      const { stdout } = await promisify(execFile)(process.execPath, [path.join(__dirname, spec)], {
        env: { ...process.env, BASE },
        timeout: 5 * 60 * 1000,
        maxBuffer: 10 * 1024 * 1024,
      });
      output = stdout;
    } catch (error) {
      output = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
      if (!/FAIL|SCRIPT ERROR/.test(output)) output += '\nFAIL  script exited with an error';
    }
    const lines = output.split('\n');
    const pass = lines.filter((l) => l.startsWith('PASS')).length;
    const fail = lines.filter((l) => l.startsWith('FAIL') || l.startsWith('SCRIPT ERROR'));
    passed += pass;
    failed += fail.length;
    console.log(`${fail.length ? '✗' : '✓'} ${spec}: ${pass} passed${fail.length ? `, ${fail.length} failed` : ''}`);
    for (const line of fail) console.log(`    ${line}`);
  }
  console.log(`\n${passed} checks passed, ${failed} failed (${BASE})`);
  server?.close();
  process.exit(failed ? 1 : 0);
})();

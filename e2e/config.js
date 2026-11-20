// Shared settings for the browser tests in this folder (see e2e/README.md).
const fs = require('fs');
const path = require('path');

/** Where Chrome is. Set CHROME_PATH if it's somewhere else. */
const CHROME =
  process.env.CHROME_PATH ||
  [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
  ].find((p) => fs.existsSync(p));

/** The site under test: the local build by default, or e.g. BASE=https://goalpot.expo.app. */
const BASE = process.env.BASE || 'http://localhost:8092';

/** Screenshots, downloads and temporary files (ignored by git). */
const OUTPUT = path.join(__dirname, '.output');

/**
 * Messages that are expected and harmless: opening a goal's link directly
 * (e.g. /goals/abc) gets the host's 404 page first, and React then rebuilds
 * the page on the right screen (error #418). See "Web version" in CLAUDE.md.
 */
function isKnownNoise(message) {
  return (
    /Minified React error #418/.test(message) ||
    /Failed to load resource: the server responded with a status of 404/.test(message)
  );
}

/** The app's current saved-data version, read from the store, so tests don't need bumping. */
const STORAGE_VERSION = Number(
  fs
    .readFileSync(path.join(__dirname, '..', 'src', 'storage', 'app-store.ts'), 'utf8')
    .match(/const STORAGE_VERSION = (\d+);/)[1],
);

module.exports = { CHROME, BASE, OUTPUT, STORAGE_VERSION, isKnownNoise };

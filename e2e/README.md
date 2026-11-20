# Browser tests

End-to-end checks of the web version in a hidden Chrome, sized like an iPhone
(and a computer where it matters). Each `*.spec.js` prints `PASS` / `FAIL` lines.

```bash
npm run test:e2e                              # build the site, serve it locally, run every spec
node e2e/run-all.js                           # run every spec against the existing dist/ build
node e2e/run-all.js repeating                 # only specs whose file name contains "repeating"
BASE=https://goalpot.expo.app node e2e/run-all.js   # test the live site
```

- Needs Google Chrome. Set `CHROME_PATH` if it isn't in the usual place.
- Screenshots and downloads go to `e2e/.output/` (ignored by git), handy for checking a screen by eye.
- Shared settings are in `config.js`. `STORAGE_VERSION` is read from the app, so specs don't need
  updating when the saved data shape changes.
- `isKnownNoise` ignores the expected 404 and React #418 messages from opening a goal's link
  directly (the host serves `+not-found.html` first; see "Web version" in CLAUDE.md).
- Tests seed data straight into `localStorage` (key `savings-app-data`). Change stored data on a
  page where the app isn't running (e.g. `/manifest.json`), or the running app may save over it.

The pure calculations in `src/utils` have fast unit tests too: `npm test` (Jest, `*.test.ts`).

@AGENTS.md

# Savings — personal savings & budgeting app

A personal savings and budgeting app for one user, on their own phone. No accounts and no backend: all data stays on the device.

## What the app does

- The user enters their **monthly income after tax**.
- The user creates **savings goals**, each with a name, a target amount and a target date (e.g. "New laptop, £900, by March 2027").
- The user **logs money saved** toward a goal (amount + date). Logs are the source of truth: a goal's "saved so far" is the sum of its logs and is never stored separately.
- **Charts** show progress per goal and over time.
- **Budgeting tips and suggested savings amounts** are based on income and goals, e.g. "save £75/month to hit New laptop by March 2027".
- **Reminders** such as "You have £340 left to save for New laptop".

The default currency is GBP (£), and the user can pick another one in Settings (see `src/constants/currencies.ts`). Text and dates are UK English (`en-GB`). Money is formatted in its own currency's style ('£340', '$50', '₹1,23,456.50', '₺1.234,50'). Dates are shown like "March 2027" or "11 Nov 2026".

## Status

- [x] Project setup, bottom tab bar with 4 tabs (Home, Goals, Budget, Settings)
- [x] Design polish: shared Screen/Card/Button components, type scale, radii, dark-mode navigation colours, animated progress bars and card fade-ins, accessibility labels
- [x] Data model + local storage (Zustand + AsyncStorage) + goal helper functions
- [x] Onboarding (first launch only): name → currency → monthly income after tax
- [x] Settings: edit name, currency, monthly income; delete all data
- [x] Goals: list with progress cards, empty state, create / edit / delete (with confirmation), detail screen
- [x] Log savings: "Add money" modal (amount, date, note), history with delete, monthly plan, celebration (banner + confetti) at 100%
- [x] Charts: Home summary (total saved, still to save, goals reached) + ranked progress bars; goal detail line chart of saved over time with dashed target line
- [x] Budget: 50/30/20 split chart, suggested vs saved this month, what goals need per month, income-based tips; tip of the day on Home; "not financial advice" note
- [x] Reminders: local notifications (weekly/monthly at a chosen time), explained before asking permission, about the goal furthest behind schedule; rescheduled on every data change; same messages on Home
- [x] Web version as a PWA ("Goalpot"): static web build, manifest + icons, full screen from the iPhone home screen, deployed with EAS Hosting. Notifications are phone-only; on web the Reminders section is hidden and reminders show on Home
- [x] Export / import data (Settings, all platforms): JSON backup file; import asks before replacing

Update this list as features land.

## Tech stack

- **Expo SDK 58** (React Native 0.88, React 19.3). The app must keep running in **Expo Go**, so only use libraries that Expo Go supports. Install them with `npx expo install <pkg>` (not plain `npm install`) so versions match the SDK.
- **TypeScript**, strict mode.
- **Expo Router** for navigation, with file-based routes in `src/app/`. The root is a `Stack` that uses **protected routes** (`Stack.Protected guard={...}`): the user sees `onboarding` until `onboardingComplete` is true, and after that only the `(tabs)` group. When the flag changes, the router redirects by itself, so you never call `router.replace` for this. The tab bar uses `NativeTabs` from `expo-router/native-tabs` on iOS/Android, and `expo-router/ui` tabs on web.
- Styling: React Native `StyleSheet` plus the theme tokens in `src/constants/theme.ts`. Light and dark mode are both supported.
- React Compiler and typed routes are enabled (`app.json` → `experiments`).
- **State + storage:** Zustand (`zustand`) with its `persist` middleware, which saves to `@react-native-async-storage/async-storage`. See "Data layer" below.
- **Charts:** `react-native-gifted-charts`, which draws with `react-native-svg` and uses `expo-linear-gradient` for area fills. Both are in Expo Go, and it renders the same on iOS, Android and web. We chose it over `victory-native` (Skia-based), which would need fonts loaded for axis labels and CanvasKit set up for web: more setup for no benefit at our data sizes. Simple bars (like Home's progress-by-goal) are plain `View`s, which give full control over labels and accessibility.
- **Files (export/import):** `expo-file-system` (`File`, `Paths`), `expo-sharing`, `expo-document-picker`, all in Expo Go.
- **Notifications:** `expo-notifications`, used for **local** scheduled notifications only. There's no server and no push tokens: remote push doesn't work in Expo Go on Android since SDK 53, while local notifications do. Don't call push-token APIs (`getExpoPushTokenAsync`, `getDevicePushTokenAsync`), because they throw in Expo Go on Android. The two yellow "not fully supported in Expo Go" warnings at startup are expected.

## Web version (PWA "Goalpot")

- The same app also runs in a browser and can be added to the iPhone home screen from Safari, where it opens full screen as **Goalpot**. Keep iOS/Android working: web-only changes go behind `Platform.OS === 'web'` or in `.web.ts(x)` files.
- `app.json` → `web.output: "static"`: every route is built to its own HTML file, so any free static host works. Dynamic routes (`goals/[id]`) can't be built ahead (ids live on the device); a fresh load of `/goals/<id>` relies on the host serving `+not-found.html`, after which the app hydrates onto the right screen. The installed PWA always starts at `/`.
- PWA files: `src/app/+html.tsx` (web-only HTML shell: manifest link, Apple meta tags, `viewport-fit=cover`, `black-translucent` status bar, page background), `public/manifest.json`, and `public/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`. Everything in `public/` is copied to the site root. The theme colour is `tint` (`#1F7A52`).
- `services/notifications.web.ts` has the same exports as `notifications.ts` but does nothing, which keeps expo-notifications out of the web bundle. Keep the two in sync.
- The web tab bar (`app-tabs.web.tsx`) sits below the screens, not over them, and pads for the home indicator, so `BottomTabInset` is 0 on web.
- Commands: `npm run preview:web` (build + serve at http://localhost:8081), `npm run deploy:web` (build + `eas deploy --prod` to EAS Hosting; needs `npx eas-cli login` once).

## Export / import

- Settings → "Export my data" / "Import my data". `utils/backup.ts` builds and checks the file (`{ app: 'goalpot', version, exportedAt, data: { profile, goals, contributions } }`). Reminder settings are not included: they depend on this device's notification permission, so an import keeps the current device's.
- An imported file goes through the same sanitising as saved data (`sanitizeProfile` / `sanitizeGoals` / `sanitizeContributions`), and the user confirms before `importBackup` replaces anything. A new saved field that belongs in backups needs adding to `BackupData` and `parseBackup`; bump the backup `version` if the shape changes, and keep reading older versions.
- `services/backup-file.ts` (phone: writes to the cache folder and opens the share sheet, picks with expo-document-picker) and `backup-file.web.ts` (share sheet on touch devices, download on computers, `<input type=file>` to pick). Web only allows these straight after a tap, so pick the file *before* showing the confirmation.

## Data layer

- **Types** are in `src/types/models.ts`: `UserProfile`, `SavingsGoal`, `Contribution`, and `AppData` (everything that gets saved, including `onboardingComplete`).
- **Store:** `src/storage/app-store.ts` is a single Zustand store holding `AppData` plus actions (`addGoal`, `addContribution`, `updateProfile`, `deleteGoal`, `resetAllData`, …). Every change is saved automatically to AsyncStorage under the key `savings-app-data`.
- **Screens use the hooks in `src/hooks/use-app-data.ts`**, such as `useGoals()`, `useGoal(id)`, `useGoalProgress(id)`, `useCurrency()` and `useAppActions()`. Screens don't import `useAppStore` or AsyncStorage directly.
- **Calculations** live in `src/utils/goals.ts` (`totalSaved`, `amountRemaining`, `percentComplete`, `monthlyAmountNeeded`). They're pure functions, and the hooks call them.
- **Saved-so-far is never stored.** It's always calculated from contributions, which avoids the two disagreeing.
- `deleteGoal` also deletes that goal's contributions.
- **Startup:** `src/app/_layout.tsx` keeps the splash screen up until saved data has loaded (`isReady`). If loading fails, the app starts with empty data instead of hanging. `isReady` is set one tick after loading finishes, because storage can answer synchronously.
- **Web server rendering:** on web, Expo Router first renders pages in Node, where there's no `window`. The store uses a no-op storage there (`isServerRender` in `app-store.ts`). Any other browser-only API must be guarded the same way.
- **Changing the saved shape:** bump `STORAGE_VERSION` in `app-store.ts` and convert old data in `migrate`, otherwise existing users' data breaks. A new field also needs a default in `initialData` **and** a line in `src/storage/sanitize.ts`, because `merge` rebuilds the loaded data through `sanitizeAppData()` and drops any field it doesn't know about.
- **Loaded data is always sanitised** (`sanitize.ts`): unknown currencies fall back to GBP, invalid amounts and dates are dropped, duplicate goals are removed, savings whose goal no longer exists are removed, and reminder settings are clamped to their ranges. Code can rely on the stored data being valid.
- **Zustand selector rule:** a selector must return existing state, e.g. `(s) => s.goals`. Never build a new array or object inside a selector (`(s) => s.goals.filter(...)`): that re-renders forever. Select the raw data, then compute outside the selector, or wrap the selector in `useShallow`.
- Amounts handed to the store must already be valid integer minor units. **Validate forms with `src/utils/validation.ts`.** Each validator returns `{ ok: true, value }` or `{ ok: false, error }`, and the screen shows `error` under the field.
  - Money input rejects negatives and stray letters ('12abc34', '1e5'). It accepts a currency symbol or code, and a comma as the decimal point ('12,50').
  - Limits: income up to `MAX_MONTHLY_INCOME`, goal targets and single savings up to `MAX_GOAL_TARGET`. Every money field sets `maxLength={MONEY_INPUT_MAX_LENGTH}`.
  - **Income may be 0** (between jobs, studying). Goal targets and savings must be above 0. Anything that divides by income or the suggested savings must handle 0; the Budget tab shows a "No income right now" card instead of the split.
  - `amountToInputText` turns a stored amount back into input text.
- **Past target dates:** a goal can keep a date that has passed. Editing it doesn't force a new date unless the user changes it, and the month picker's first step forward jumps to the current month. Overdue goals show "Target date passed" in `danger`, rank first for reminders, and are excluded from "what your goals need per month".
- **Reset all data** (Settings) calls `cancelAllReminders()` *before* `resetAllData()`, because the reminder scheduler stops running once onboarding resets. `resetAllData` also resets `onboardingComplete`, so the welcome flow shows again.
- For a date in the middle of a sentence, use `relativeDayInSentence()` ('today', 'on 11 Nov 2026'). Don't lower-case `formatRelativeDay()`, which would give '11 nov 2026'.

Expo APIs changed a lot in recent SDKs. Before using an Expo API, check the SDK 58 docs (see AGENTS.md) or the type definitions in `node_modules`, and don't rely on memory.

## Folder structure

```
src/
  app/                  Screens. Each file is a route (Expo Router).
    _layout.tsx         Root: theme, splash, Stack with onboarding guard
    +html.tsx           Web only: HTML shell with the PWA tags
    onboarding.tsx      First-launch welcome flow (3 steps)
    goal-editor.tsx     Modal: add a goal, or edit one with ?id=<goalId>
    add-money.tsx       Modal: log money saved, opened with ?goalId=<goalId>
    reminder-setup.tsx  Modal: explains reminders, then asks for notification permission
    (tabs)/             Group for the tab screens ("(tabs)" isn't in the URL)
      _layout.tsx       Renders the tab bar
      index.tsx         Home tab
      goals/            Goals tab (its own Stack)
        _layout.tsx     Stack: list → detail
        index.tsx       Goal list + empty state
        [id].tsx        Goal detail: progress, add money, monthly plan, history, edit, delete, celebration
      budget.tsx        Budget tab: split, this month's savings, tips
      settings.tsx      Settings tab
  components/           Reusable UI pieces
    ui/                 Design system: screen.tsx, card.tsx, button.tsx, text-button.tsx,
                        modal-header.tsx, empty-state.tsx, text-field.tsx, progress-bar.tsx,
                        day-stepper.tsx, value-stepper.tsx, choice-chips.tsx, confetti.tsx
    profile/            currency-picker.tsx, after-tax-explainer.tsx
    goals/              goal-card.tsx, emoji-picker.tsx, month-picker.tsx,
                        contribution-row.tsx, goal-celebration.tsx
    charts/             savings-line-chart.tsx (gifted-charts), goal-progress-bars.tsx (Views)
    budget/             budget-split-chart.tsx, tip-card.tsx, advice-note.tsx
    reminders/          reminder-settings.tsx (Settings section), reminder-messages.tsx (Home),
                        reminder-preview.tsx, reminder-scheduler.tsx (invisible, in root layout)
    home/               savings-summary.tsx (hero total + stat tiles)
    app-tabs.tsx        Tab bar for iOS/Android (NativeTabs)
    app-tabs.web.tsx    Tab bar for web, kept in sync with app-tabs.tsx
    themed-text.tsx     Text that follows light/dark theme
    themed-view.tsx     View that follows light/dark theme
  data/
    tips.ts             Saving tips + income levels per currency (edit freely)
  constants/
    theme.ts            Colours, spacing, fonts
    currencies.ts       Currencies the user can choose
    goal-emojis.ts      Emojis offered for goals
  hooks/
    use-app-data.ts     Hooks screens use to read/change app data
    use-reminder-scheduler.ts   Reschedules the reminder when data changes
    use-notification-permission.ts  Current permission, re-checked on foreground
    use-theme.ts        Current theme colours
  services/
    notifications.ts    The ONLY file that imports expo-notifications
    notifications.web.ts  Web stand-in with the same exports (does nothing)
    backup-file.ts      Save/pick a backup file (share sheet, document picker)
    backup-file.web.ts  Same for web (share sheet / download, file input)
  storage/
    app-store.ts        Zustand store, saved to AsyncStorage
    sanitize.ts         Repairs loaded data so a bad save can't crash the app
  types/
    models.ts           UserProfile, SavingsGoal, Contribution, AppData
  utils/                Pure functions (no React) — easy to test
    goals.ts            Saved / remaining / % / per-month calculations
    charts.ts           Chart data: savingsOverTime, niceAxis, formatCompactMoney, summariseGoals
    budget.ts           budgetSplit, savedThisMonth, incomeLevel, tipsFor, tipOfTheDay, labelColourOn
    reminders.ts        behindSchedule, goalsNeedingAttention, reminder messages, describeSchedule
    money.ts            formatMoney (per-currency locale), parseMoneyInput
    dates.ts            ISO date helpers and formatting
    validation.ts       Form validators (name, income, goal, contribution amount/date/note)
    backup.ts           createBackup / parseBackup for export and import
    id.ts               createId
assets/                 Images, icons, splash
public/                 Copied to the web site root: manifest.json, PWA icons
```

Add `src/components/<feature>/` for components used by one feature only (e.g. `components/goals/goal-card.tsx`). Use the shared `Button` and `TextField` from `components/ui/` for forms, rather than making new ones.

Non-route files must **not** go in `src/app/`, because every file there becomes a screen. For a screen that needs sub-pages (e.g. goal details), turn it into a folder with its own `_layout.tsx` (a `Stack`), as the Goals tab does. Screens that should cover the tab bar (like `goal-editor.tsx`) go at the root and are registered in `src/app/_layout.tsx` inside the `isOnboarded` guard, usually with `presentation: 'modal'`.

Navigation patterns:
- Push with an object href, e.g. `router.push({ pathname: '/goals/[id]', params: { id } })`. Typed routes check the path.
- Read params with `useLocalSearchParams<{ id: string }>()`. Any screen that takes an id must handle a missing item (it may have been deleted, or the web page refreshed) by showing "not found" with a way back.
- Close or go back with `router.canGoBack() ? router.back() : router.replace(...)`, so a web refresh doesn't leave the user stuck.
- When deleting the item a screen shows, navigate away first and delete second.
- Set a page's header title from inside it with `<Stack.Screen options={{ title }} />`.
- Goal target dates are months: the month picker stores the last day of the chosen month.
- Contributions can't be dated in the future, and can be back-dated up to 5 years. A mistake is fixed by deleting the entry (no editing, and no negative amounts).

Charts (follow these for every new chart):
- **Pick the form first.** One headline number → a stat tile or hero figure, not a chart. Comparing goals → ranked horizontal bars on one shared scale, most complete first. Change over time → a line. Avoid donuts and pies, and never use two y-axes.
- **Colour:** chart marks use the `chart` theme token. It's a separate token from `tint` because the dark-mode green had to be stepped down to pass the chart colour checks. It was validated against `backgroundElement`, the card colour charts sit on. A single series uses one colour, with no per-bar colours and no legend box (the card title names it). Text is never drawn in the series colour; it uses `text` / `textSecondary`. The unfilled part of a bar uses `chartTrack`, and gridlines use `chartGrid`. Any new chart colour needs light and dark values checked with the dataviz palette validator.
- **Marks:** 2px lines; area fill at about 10% opacity; end dot of at least 8px with a 2px ring in the card colour; bars at most 24px thick, square at the baseline and 4px-rounded at the data end; solid 1px gridlines (dashed only for the target line); no y-axis line.
- **Money in charts:** the chart library works in whole units (pounds), so divide minor units by 100. Axis labels use `formatCompactMoney` (£1.5K) and `niceAxis` for tidy steps. Tooltips and labels use `formatMoney`.
- **Time:** gifted-charts spaces points evenly, so `savingsOverTime` resamples onto evenly spaced dates to keep time to scale. Don't plot one point per contribution.
- **Empty data:** every chart has an empty state that explains what will appear and how to make it appear.
- **Accessibility:** give the chart container `accessible`, `accessibilityRole="image"` and a summary `accessibilityLabel`. Every value must also be readable without the chart: the history list on goal detail, and the labelled rows on Home. Tooltips add to that, but are never the only way to read a value. Turn off `isAnimated` when `useReducedMotion()` is true.
- Measure the width with `onLayout`, and only render the chart once the width is known.

- **Several series:** when a chart needs several colours (like the 50/30/20 split), use fixed theme tokens (`budgetNeeds` / `budgetWants` / `budgetSavings`) whose order was checked together with the validator. Don't reorder or reuse them for other meanings. A label printed inside a coloured block uses `labelColourOn(hex)` (white or near-black). Every coloured part also gets a text label, so colour is never the only cue.

Budget & tips:
- The 50/30/20 amounts come from `budgetSplit()`, which always adds up exactly to the income (any rounding goes to needs). "Saved this month" means contributions dated in the current calendar month, across all goals.
- **Tips live in `src/data/tips.ts`.** To add one, copy a block, give it a new unique `id` and set `for: [...]` income levels. Never reuse or rename ids, because they decide which tip shows on which day. Tips stay general: no specific products, providers, tax rules or amounts in a particular currency.
- Income levels (`lower` / `middle` / `higher`) use rough monthly take-home thresholds per currency in `INCOME_BANDS`. A new currency must be added there too.
- The tip of the day is picked from the date, so it stays the same all day and cycles through every matching tip before repeating.
- **Any screen that suggests amounts or gives tips shows `<AdviceNote />`** (use `short` in small spaces). It says this is general guidance, not professional financial advice.

Reminders & notifications:
- **Never ask for notification permission on first launch, or without explaining first.** Always send the user to `/reminder-setup`, which explains reminders and shows a real preview, then calls `requestPermission()`. If permission was denied, offer `Linking.openSettings()` instead of asking again.
- Only `src/services/notifications.ts` imports `expo-notifications`. It creates the Android channel before asking (Android 13+ needs that), uses one fixed id (`savings-reminder`) so scheduling again replaces the old reminder, and does nothing on web.
- A scheduled notification's text is fixed when it's scheduled. `useReminderScheduler` (mounted in the root layout after onboarding) reschedules, debounced, whenever goals, contributions, currency or reminder settings change, and each time the app comes to the foreground. Don't schedule from screens.
- "Furthest behind schedule" means saving evenly from the goal's creation to its target date (`behindSchedule`). Overdue goals rank first, then dated goals furthest behind, then undated goals with the least progress. Home's Reminders card uses the same `reminderMessages`, so the app and the notifications always agree.
- Weekdays use expo's numbering, 1 = Sunday. Monthly days are limited to 1–28. Reminder settings save straight away (no Save button). Tapping a notification opens its goal (via `data.goalId`).

Animation & effects:
- Use `react-native-reanimated` (already installed). Use `.get()` / `.set()` on shared values rather than `.value`, because the React Compiler is on.
- Skip decorative motion (like confetti) when `useReducedMotion()` is true. Layout animations such as `ZoomIn` respect that setting by themselves.
- Don't call `setState` synchronously inside `useEffect` (the linter flags it). To react to a value changing, use the "store the previous value in state and compare during render" pattern, as the celebration does in `goals/[id].tsx`.
- Randomness in a component goes in a lazy `useState(() => ...)` initialiser, so it runs once.

## Coding conventions

- **File names:** kebab-case (`goal-card.tsx`). **Components:** PascalCase, as named exports. The exceptions are route files in `src/app/` and the `app-tabs` files, which use `export default`.
- Platform-specific files use the suffixes `.web.tsx` / `.ios.tsx` / `.android.tsx`.
- Import with the `@/` alias (`@/components/...` → `src/...`) rather than long `../../` paths.
- Function components and hooks only, no classes. Type props with a `type XProps = {...}`.
- No `any`. Model data with explicit types in `src/types/`.
- **Money is stored as whole minor units (pence/cents, integers)**, e.g. £9.99 → `999`, to avoid floating-point rounding errors. Only display it through `formatMoney(amount, currency)` from `src/utils/money.ts`, using the user's currency from `useCurrency()`. Each currency is formatted with its own locale (`locale` in `CURRENCIES`). By default whole amounts drop the decimals ('£340') and others show two ('£340.50'). Pass `{ decimals: 'always' }` for columns of numbers that must line up. `parseMoneyInput` accepts '1,234.56', '1.234,56', '12,50' and "1'234.50". Every supported currency has 2 decimal places, so don't add zero-decimal currencies like JPY without updating the money helpers. A new currency needs a `locale` and a symbol.
- **Calendar dates are stored as `'YYYY-MM-DD'` strings** and **timestamps as full ISO strings**. Use the helpers in `src/utils/dates.ts`. Don't use `new Date('2027-03-31')`, because it reads the date as UTC and can show the wrong day.
- IDs: use `createId()` from `src/utils/id.ts`.
- Styles: `StyleSheet.create` at the bottom of the file. Take colours from `useTheme()` / `ThemedText` / `ThemedView`, spacing from `Spacing` and corners from `Radius`, and don't hard-code hex colours, pixel gaps or font sizes in screens. Theme colours: `text`, `textSecondary`, `background`, `backgroundElement`, `backgroundSelected`, `tint` (green accent) with `onTint` for text on top of it, `danger`, `border`, plus the chart and budget tokens. Any new colour needs both a light and a dark value.
- Forms: use `<Screen keyboard>`, or for modals a `KeyboardAvoidingView` (`behavior="padding"` on iOS) around a `ScrollView` with `keyboardShouldPersistTaps="handled"`. Use `keyboardType="decimal-pad"` for money fields.
- Confirmation dialogs: `Alert.alert` buttons don't work on web, so use `window.confirm` when `Platform.OS === 'web'`. Destructive actions (deleting a goal, deleting a saving, deleting all data) always ask first.
- Accessibility: give interactive elements an `accessibilityRole` (and an `accessibilityState` where it applies), and an `accessibilityHint` when the result isn't obvious ("Opens Settings"). Keep tap targets at least `MinTapSize` (44pt). Screen and card titles use `accessibilityRole="header"`, which `Screen` and `Card` do for you. Group a number with its label into one `accessible` view with a combined `accessibilityLabel` ("Total saved: £560"). Hide decorative emoji from screen readers (`importantForAccessibility="no"`). Text must scale with the system font size: don't fix the height of text containers, and use `adjustsFontSizeToFit` on big single-line numbers.

## Design system (use these; don't rebuild them per screen)

- **Layout:** tab screens use `<Screen title subtitle headerRight inTabs keyboard>` (`components/ui/screen.tsx`). It handles safe areas, `ScreenPadding` (20) sides, the tab-bar inset, centring on wide screens (`MaxContentWidth` 640) and the title. Modals use `<ModalHeader title onClose closeLabel>`.
- **Surfaces:** every section is a `<Card title subtitle action index tone>` (`Radius.card` = 20, continuous corners, 20px padding). `index` staggers its fade-in; `tone="accent"` is the green fill. Don't hand-build cards with `ThemedView type="backgroundElement"`.
- **Inputs inside cards:** form controls (text fields, steppers, pickers, chips) use the `background` colour plus a `border`, so they read as inset fields on both the page and a card. Radius is `Radius.control` (14).
- **Buttons:** `<Button variant>`: `primary` (one main action per area), `secondary` (grey; visible on page and cards), `danger` (red outline, destructive only). They're 52pt tall; use `compact` in headers. Text links use `<TextButton>` (44pt tap area). Empty screens use `<EmptyState emoji title message actionTitle onAction>`.
- **Type scale** (`ThemedText type`): `hero` (one per screen), `title`, `heading`, `default`/`defaultBold`, `small`/`smallBold`, `caption` (the minimum size), `emoji`/`emojiLarge`. The old `subtitle`/`link`/`code` types are gone.
- **Motion:** `ProgressBar` animates its fill (700ms ease-out), and `Card` / `GoalCard` fade in, staggered. Every animation must respect reduce motion (`ReduceMotion.System` on layout animations, `useReducedMotion()` elsewhere). Keep motion small and purposeful: no looping or decorative animation besides the goal confetti.
- **Navigation colours:** the root layout passes our palette to the navigation theme (`navigationThemes`), and the Goals stack sets `headerTintColor: tint`. The tab bar uses `tint` for the selected tab. The status bar follows light/dark mode.
- Screens add `BottomTabInset` to their bottom padding so content isn't hidden behind the tab bar.
- Keep screens thin: calculations go in `src/utils/`, storage access in `src/storage/`.
- User-facing text is in UK English ("colour", "organise").
- Comments explain *why*, not *what*. Keep them short.

## Commands

```bash
npx expo start          # start dev server; scan QR code with Expo Go
npx expo start --tunnel # same, if phone and PC can't see each other on the network
npx tsc --noEmit        # type-check
npx eslint src          # lint (`npm run lint` / `expo lint` wrongly rejects ESLint 9.39, so run eslint directly)
npx expo install <pkg>  # add a library at the SDK-compatible version
npm run preview:web     # build the web version and serve it at http://localhost:8081
npm run deploy:web      # build and deploy the web version to EAS Hosting
```

Before committing: run `npx tsc --noEmit` and make sure the app still opens in Expo Go.

`npx tsc --noEmit` and `npx eslint src` both pass with **zero** errors; keep it that way. On a fresh clone, `tsc` reports a `*.css` error and doesn't check route names until `npx expo start` has run once, because that's what generates `expo-env.d.ts` and `.expo/types/`.

To see onboarding again while developing, use Settings → Reset all data.

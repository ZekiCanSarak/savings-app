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

Currency is GBP (£) and locale is `en-GB`. Dates are shown like "March 2027" or "11 Nov 2026".

## Status

- [x] Project setup, bottom tab bar with 4 placeholder tabs (Home, Goals, Budget, Settings)
- [ ] Data model + local storage
- [ ] Settings: monthly income
- [ ] Goals: create / edit / delete, log savings
- [ ] Home: summary + charts
- [ ] Budget: suggestions + tips
- [ ] Reminders (local notifications)

Update this list as features land.

## Tech stack

- **Expo SDK 58** (React Native 0.88, React 19.3). The app must keep running in **Expo Go**, so only use libraries that Expo Go supports. Install them with `npx expo install <pkg>` (not plain `npm install`) so versions match the SDK.
- **TypeScript**, strict mode.
- **Expo Router** for navigation, with file-based routes in `src/app/`. The tab bar uses `NativeTabs` from `expo-router/native-tabs` on iOS/Android, and `expo-router/ui` tabs on web.
- Styling: React Native `StyleSheet` plus the theme tokens in `src/constants/theme.ts`. Light and dark mode are both supported.
- React Compiler and typed routes are enabled (`app.json` → `experiments`).
- Planned, not installed yet (choose and confirm when the feature is built): on-device storage (e.g. `@react-native-async-storage/async-storage`), charts, and `expo-notifications` for local reminders.

Expo APIs changed a lot in recent SDKs. Before using an Expo API, check the SDK 58 docs (see AGENTS.md) or the type definitions in `node_modules`, and don't rely on memory.

## Folder structure

```
src/
  app/                  Screens. Each file is a route (Expo Router).
    _layout.tsx         Root layout: theme provider, splash, tab bar
    index.tsx           Home tab
    goals.tsx           Goals tab
    budget.tsx          Budget tab
    settings.tsx        Settings tab
  components/           Reusable UI pieces
    app-tabs.tsx        Tab bar for iOS/Android (NativeTabs)
    app-tabs.web.tsx    Tab bar for web, kept in sync with app-tabs.tsx
    themed-text.tsx     Text that follows light/dark theme
    themed-view.tsx     View that follows light/dark theme
    placeholder-screen.tsx  Temporary "coming soon" screen
  constants/theme.ts    Colours, spacing, fonts
  hooks/                Reusable hooks (e.g. use-theme)
assets/                 Images, icons, splash
```

Folders to add as features arrive:

- `src/types/` — shared TypeScript types (`Goal`, `SavingsEntry`, `Budget`…)
- `src/storage/` — reading and writing device storage. Screens never touch storage directly.
- `src/utils/` — pure functions such as money formatting, date maths and savings suggestions. Keep these free of React so they are easy to test.
- `src/components/<feature>/` — components used by one feature only (e.g. `components/goals/goal-card.tsx`)

Non-route files must **not** go in `src/app/`, because every file there becomes a screen. For a screen that needs sub-pages (e.g. goal details), turn it into a folder: `src/app/goals/index.tsx` and `src/app/goals/[id].tsx`.

## Coding conventions

- **File names:** kebab-case (`goal-card.tsx`). **Components:** PascalCase, as named exports. The exceptions are route files in `src/app/` and the `app-tabs` files, which use `export default`.
- Platform-specific files use the suffixes `.web.tsx` / `.ios.tsx` / `.android.tsx`.
- Import with the `@/` alias (`@/components/...` → `src/...`) rather than long `../../` paths.
- Function components and hooks only, no classes. Type props with a `type XProps = {...}`.
- No `any`. Model data with explicit types in `src/types/`.
- **Money is stored as whole pence (integers)**, e.g. £9.99 → `999`, to avoid floating-point rounding errors. Convert to £ only for display, using one shared formatter (`Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })`).
- **Dates are stored as ISO strings** (`'2027-03-31'`) and formatted only for display.
- IDs: generate with a small helper in `src/utils/`.
- Styles: `StyleSheet.create` at the bottom of the file. Take colours from `useTheme()` / `ThemedText` / `ThemedView` and spacing from `Spacing`, and don't hard-code hex colours or pixel gaps in screens.
- Screens add `BottomTabInset` to their bottom padding so content isn't hidden behind the tab bar.
- Keep screens thin: calculations go in `src/utils/`, storage access in `src/storage/`.
- User-facing text is in UK English ("colour", "organise").
- Comments explain *why*, not *what*. Keep them short.

## Commands

```bash
npx expo start          # start dev server; scan QR code with Expo Go
npx expo start --tunnel # same, if phone and PC can't see each other on the network
npx tsc --noEmit        # type-check
npm run lint            # lint (expo lint)
npx expo install <pkg>  # add a library at the SDK-compatible version
```

Before committing: run `npx tsc --noEmit` and make sure the app still opens in Expo Go.

Known pre-existing template type errors (not from our code): `app-tabs.web.tsx` TabButton `ref` typing, plus the `*.css` module declarations, which `expo start` generates in `expo-env.d.ts`.

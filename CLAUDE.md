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

The default currency is GBP (£), and the user can pick another one in Settings (see `src/constants/currencies.ts`). The locale is `en-GB`. Dates are shown like "March 2027" or "11 Nov 2026".

## Status

- [x] Project setup, bottom tab bar with 4 placeholder tabs (Home, Goals, Budget, Settings)
- [x] Data model + local storage (Zustand + AsyncStorage) + goal helper functions
- [x] Onboarding (first launch only): name → currency → monthly income after tax
- [x] Settings: edit name, currency, monthly income; delete all data
- [ ] Goals: create / edit / delete, log savings
- [ ] Home: summary + charts
- [ ] Budget: suggestions + tips
- [ ] Reminders (local notifications)

Update this list as features land.

## Tech stack

- **Expo SDK 58** (React Native 0.88, React 19.3). The app must keep running in **Expo Go**, so only use libraries that Expo Go supports. Install them with `npx expo install <pkg>` (not plain `npm install`) so versions match the SDK.
- **TypeScript**, strict mode.
- **Expo Router** for navigation, with file-based routes in `src/app/`. The root is a `Stack` that uses **protected routes** (`Stack.Protected guard={...}`): the user sees `onboarding` until `onboardingComplete` is true, and after that only the `(tabs)` group. When the flag changes, the router redirects by itself, so you never call `router.replace` for this. The tab bar uses `NativeTabs` from `expo-router/native-tabs` on iOS/Android, and `expo-router/ui` tabs on web.
- Styling: React Native `StyleSheet` plus the theme tokens in `src/constants/theme.ts`. Light and dark mode are both supported.
- React Compiler and typed routes are enabled (`app.json` → `experiments`).
- **State + storage:** Zustand (`zustand`) with its `persist` middleware, which saves to `@react-native-async-storage/async-storage`. See "Data layer" below.
- Planned, not installed yet (choose and confirm when the feature is built): charts, and `expo-notifications` for local reminders.

## Data layer

- **Types** are in `src/types/models.ts`: `UserProfile`, `SavingsGoal`, `Contribution`, and `AppData` (everything that gets saved, including `onboardingComplete`).
- **Store:** `src/storage/app-store.ts` is a single Zustand store holding `AppData` plus actions (`addGoal`, `addContribution`, `updateProfile`, `deleteGoal`, `resetAllData`, …). Every change is saved automatically to AsyncStorage under the key `savings-app-data`.
- **Screens use the hooks in `src/hooks/use-app-data.ts`**, such as `useGoals()`, `useGoal(id)`, `useGoalProgress(id)`, `useCurrency()` and `useAppActions()`. Screens don't import `useAppStore` or AsyncStorage directly.
- **Calculations** live in `src/utils/goals.ts` (`totalSaved`, `amountRemaining`, `percentComplete`, `monthlyAmountNeeded`). They're pure functions, and the hooks call them.
- **Saved-so-far is never stored.** It's always calculated from contributions, which avoids the two disagreeing.
- `deleteGoal` also deletes that goal's contributions.
- **Startup:** `src/app/_layout.tsx` keeps the splash screen up until saved data has loaded (`isReady`). If loading fails, the app starts with empty data instead of hanging.
- **Changing the saved shape:** bump `STORAGE_VERSION` in `app-store.ts` and convert old data in `migrate`, otherwise existing users' data breaks. Adding a new field with a default only needs the default in `initialData`, because `merge` fills it in.
- **Zustand selector rule:** a selector must return existing state, e.g. `(s) => s.goals`. Never build a new array or object inside a selector (`(s) => s.goals.filter(...)`): that re-renders forever. Select the raw data, then compute outside the selector, or wrap the selector in `useShallow`.
- Amounts handed to the store must already be valid integer minor units. **Validate forms with `src/utils/validation.ts`.** Each validator returns `{ ok: true, value }` or `{ ok: false, error }`, and the screen shows `error` under the field. Money input rejects negatives and accepts a comma as the decimal point ('12,50'). `amountToInputText` turns a stored amount back into input text.
- `resetAllData` also resets `onboardingComplete`, so the welcome flow shows again.

Expo APIs changed a lot in recent SDKs. Before using an Expo API, check the SDK 58 docs (see AGENTS.md) or the type definitions in `node_modules`, and don't rely on memory.

## Folder structure

```
src/
  app/                  Screens. Each file is a route (Expo Router).
    _layout.tsx         Root: theme, splash, Stack with onboarding guard
    onboarding.tsx      First-launch welcome flow (3 steps)
    (tabs)/             Group for the tab screens ("(tabs)" isn't in the URL)
      _layout.tsx       Renders the tab bar
      index.tsx         Home tab
      goals.tsx         Goals tab
      budget.tsx        Budget tab
      settings.tsx      Settings tab
  components/           Reusable UI pieces
    ui/                 Generic building blocks: button.tsx, text-field.tsx
    profile/            currency-picker.tsx, after-tax-explainer.tsx
    app-tabs.tsx        Tab bar for iOS/Android (NativeTabs)
    app-tabs.web.tsx    Tab bar for web, kept in sync with app-tabs.tsx
    themed-text.tsx     Text that follows light/dark theme
    themed-view.tsx     View that follows light/dark theme
    placeholder-screen.tsx  Temporary "coming soon" screen
  constants/
    theme.ts            Colours, spacing, fonts
    currencies.ts       Currencies the user can choose
  hooks/
    use-app-data.ts     Hooks screens use to read/change app data
    use-theme.ts        Current theme colours
  storage/
    app-store.ts        Zustand store, saved to AsyncStorage
  types/
    models.ts           UserProfile, SavingsGoal, Contribution, AppData
  utils/                Pure functions (no React) — easy to test
    goals.ts            Saved / remaining / % / per-month calculations
    money.ts            formatMoney, parseMoneyInput
    dates.ts            ISO date helpers and formatting
    validation.ts       Form validators (name, income)
    id.ts               createId
assets/                 Images, icons, splash
```

Add `src/components/<feature>/` for components used by one feature only (e.g. `components/goals/goal-card.tsx`). Use the shared `Button` and `TextField` from `components/ui/` for forms, rather than making new ones.

Non-route files must **not** go in `src/app/`, because every file there becomes a screen. For a screen that needs sub-pages (e.g. goal details), turn it into a folder with its own `_layout.tsx` (a `Stack`): `src/app/(tabs)/goals/_layout.tsx`, `src/app/(tabs)/goals/index.tsx` and `src/app/(tabs)/goals/[id].tsx`. Screens that should cover the tab bar (e.g. a full-screen "add goal" form) go at the root, next to `onboarding.tsx`, inside the `isOnboarded` guard.

## Coding conventions

- **File names:** kebab-case (`goal-card.tsx`). **Components:** PascalCase, as named exports. The exceptions are route files in `src/app/` and the `app-tabs` files, which use `export default`.
- Platform-specific files use the suffixes `.web.tsx` / `.ios.tsx` / `.android.tsx`.
- Import with the `@/` alias (`@/components/...` → `src/...`) rather than long `../../` paths.
- Function components and hooks only, no classes. Type props with a `type XProps = {...}`.
- No `any`. Model data with explicit types in `src/types/`.
- **Money is stored as whole minor units (pence/cents, integers)**, e.g. £9.99 → `999`, to avoid floating-point rounding errors. Only display it through `formatMoney(amount, currency)` from `src/utils/money.ts`, using the user's currency from `useCurrency()`. Every supported currency has 2 decimal places, so don't add zero-decimal currencies like JPY without updating the money helpers.
- **Calendar dates are stored as `'YYYY-MM-DD'` strings** and **timestamps as full ISO strings**. Use the helpers in `src/utils/dates.ts`. Don't use `new Date('2027-03-31')`, because it reads the date as UTC and can show the wrong day.
- IDs: use `createId()` from `src/utils/id.ts`.
- Styles: `StyleSheet.create` at the bottom of the file. Take colours from `useTheme()` / `ThemedText` / `ThemedView` and spacing from `Spacing`, and don't hard-code hex colours or pixel gaps in screens. Theme colours: `text`, `textSecondary`, `background`, `backgroundElement`, `backgroundSelected`, `tint` (green accent) with `onTint` for text on top of it, `danger` and `border`. Any new colour needs both a light and a dark value.
- Forms: put `KeyboardAvoidingView` (`behavior="padding"` on iOS) around a `ScrollView` with `keyboardShouldPersistTaps="handled"`. Use `keyboardType="decimal-pad"` for money fields.
- Confirmation dialogs: `Alert.alert` buttons don't work on web, so use `window.confirm` when `Platform.OS === 'web'`.
- Accessibility: give interactive elements an `accessibilityRole` (and an `accessibilityState` where it applies). Keep tap targets at least 44pt tall.
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
```

Before committing: run `npx tsc --noEmit` and make sure the app still opens in Expo Go.

Known pre-existing template issues (not from our code): the type errors for `app-tabs.web.tsx` TabButton `ref` typing and for the `*.css` module declarations (`expo start` generates those declarations in `expo-env.d.ts`), plus one lint error in `src/hooks/use-color-scheme.web.ts`.

To see onboarding again while developing, use Settings → Delete all data.

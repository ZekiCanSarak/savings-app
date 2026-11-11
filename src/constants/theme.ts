/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    /** Brand accent: primary buttons, selected items. */
    tint: '#1F7A52',
    /** Text/icons drawn on top of `tint`. */
    onTint: '#ffffff',
    danger: '#C62828',
    border: '#D3D4DB',
    /** Chart marks (lines, bars). Validated against `backgroundElement` (chart cards). */
    chart: '#1F7A52',
    /** Unfilled part of a progress bar: a lighter step of the chart green. */
    chartTrack: '#D2E6DA',
    /** Hairline gridlines and chart baselines. */
    chartGrid: '#DADBE1',
    /**
     * 50/30/20 split. Order needs → wants → savings is validated as a set
     * (adjacent colour-blind separation passes in both modes). Don't reorder.
     */
    budgetNeeds: '#EB6834',
    budgetWants: '#2A78D6',
    budgetSavings: '#1F7A52',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    tint: '#3DD68C',
    onTint: '#00210F',
    danger: '#FF7A7A',
    border: '#3A3F45',
    chart: '#27AE6C',
    chartTrack: '#1F3A2C',
    chartGrid: '#33363B',
    budgetNeeds: '#D95926',
    budgetWants: '#3987E5',
    budgetSavings: '#27AE6C',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

/** Corner radii. Cards use `card`; inputs, buttons and small tiles use `control`. */
export const Radius = {
  small: 8,
  control: 14,
  card: 20,
  pill: 999,
} as const;

/** Left/right padding of every screen. */
export const ScreenPadding = 20;

/** Smallest comfortable tap target (Apple and Google both recommend about 44–48pt). */
export const MinTapSize = 44;

/** Content width for phone-sized layouts; wider screens centre the content. */
export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 640;

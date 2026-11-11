import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { CURRENCIES } from '@/constants/currencies';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CurrencyCode } from '@/types/models';

type CurrencyPickerProps = {
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
};

/** A list of currencies; tap one to select it. */
export function CurrencyPicker({ value, onChange }: CurrencyPickerProps) {
  const theme = useTheme();

  return (
    <View accessibilityRole="radiogroup" style={styles.list}>
      {CURRENCIES.map((currency) => {
        const selected = currency.code === value;
        return (
          <Pressable
            key={currency.code}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={`${currency.name}, ${currency.code}`}
            onPress={() => onChange(currency.code)}
            style={({ pressed }) => [
              styles.row,
              {
                backgroundColor: theme.background,
                borderColor: selected ? theme.tint : theme.border,
              },
              pressed && styles.pressed,
            ]}>
            <ThemedText style={styles.symbol}>{currency.symbol}</ThemedText>
            <ThemedText style={styles.name}>{currency.name}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {currency.code}
            </ThemedText>
            <View
              style={[
                styles.radio,
                { borderColor: selected ? theme.tint : theme.border },
              ]}>
              {selected ? <View style={[styles.radioDot, { backgroundColor: theme.tint }]} /> : null}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: Radius.control,
    borderCurve: 'continuous',
    borderWidth: 2,
  },
  symbol: {
    width: 36,
    fontWeight: 700,
  },
  name: {
    flex: 1,
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  pressed: {
    opacity: 0.75,
  },
});

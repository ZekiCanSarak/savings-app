import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Shown in red under the field, and turns the border red. */
  error?: string | null;
  /** Fixed text shown before the input, e.g. a currency symbol. */
  prefix?: string;
};

export function TextField({ label, error, prefix, ...inputProps }: TextFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.wrapper}>
      <ThemedText type="smallBold">{label}</ThemedText>
      <View
        style={[
          styles.inputRow,
          { backgroundColor: theme.backgroundElement, borderColor: error ? theme.danger : theme.border },
        ]}>
        {prefix ? (
          <ThemedText themeColor="textSecondary" style={styles.prefix}>
            {prefix}
          </ThemedText>
        ) : null}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text }]}
          {...inputProps}
        />
      </View>
      {error ? (
        <ThemedText type="small" themeColor="danger" accessibilityLiveRegion="polite">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.one,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    minHeight: 50,
  },
  prefix: {
    marginRight: Spacing.one,
  },
  input: {
    flex: 1,
    fontSize: 17,
    paddingVertical: Spacing.two,
  },
});

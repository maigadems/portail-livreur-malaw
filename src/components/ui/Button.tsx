import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle, StyleProp } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

/**
 * Bouton principal — même forme que le portail-client : pilule (radius 100),
 * hauteur 60, texte Epilogue bold. Variantes adaptées au thème sombre livreur.
 *   - primary : fond or (goldLight), texte vert foncé (CTA principal)
 *   - dark    : fond vert foncé, texte crème
 *   - outline : bordure claire, transparent
 */
type Variant = 'primary' | 'dark' | 'outline';

export default function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
}: {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const isDisabled = disabled || loading;
  const spinnerColor = variant === 'primary' ? '#13351F' : Colors.cream;
  return (
    <TouchableOpacity
      style={[styles.base, styles[variant], isDisabled && styles.disabled, style]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={isDisabled}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={[styles.label, styles[`${variant}Label`]]}>{label}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 60,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 24,
  },
  primary: { backgroundColor: Colors.goldLight },
  dark: { backgroundColor: Colors.darkGreen },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: Colors.medGreen },
  disabled: { opacity: 0.5 },
  label: { fontSize: 18, fontFamily: Fonts.epilogue.bold },
  primaryLabel: { color: '#13351F' },
  darkLabel: { color: Colors.cream },
  outlineLabel: { color: Colors.greenLight },
});

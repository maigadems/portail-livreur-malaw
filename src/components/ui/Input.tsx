import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { Colors, Fonts } from '../../constants/theme';

/**
 * Champ de saisie — même structure que le portail-client (label Manrope bold
 * au-dessus, conteneur arrondi radius 12, hauteur 56), en surface sombre.
 */
export function FieldLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export default function Input({
  label,
  right,
  containerStyle,
  ...props
}: TextInputProps & { label?: string; right?: React.ReactNode; containerStyle?: any }) {
  return (
    <View style={styles.group}>
      {label ? <FieldLabel>{label}</FieldLabel> : null}
      <View style={[styles.container, containerStyle]}>
        <TextInput
          style={styles.input}
          placeholderTextColor={Colors.dimText}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  label: {
    fontSize: 12,
    fontFamily: Fonts.manrope.bold,
    color: Colors.greenMid,
    letterSpacing: 0.3,
  },
  container: {
    height: 56,
    backgroundColor: Colors.darkCard,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: Fonts.manrope.regular,
    color: Colors.cream,
  },
});

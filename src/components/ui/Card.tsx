import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors } from '../../constants/theme';

/**
 * Carte de contenu — même arrondi que le portail-client (radius 24), surface
 * sombre du thème livreur avec une bordure subtile.
 */
export default function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.cardDark,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
  },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';
import MalawLogo from './MalawLogo';

interface TopAppBarProps {
  title?: string;
  showBack?: boolean;
  showLogo?: boolean;
  variant?: 'dark' | 'green' | 'cream';
  rightElement?: React.ReactNode;
}

export default function TopAppBar({
  title,
  showBack = false,
  showLogo = false,
  variant = 'dark',
  rightElement,
}: TopAppBarProps) {
  const navigation = useNavigation();

  const bgColor =
    variant === 'green'
      ? Colors.darkGreen
      : variant === 'cream'
      ? Colors.cream
      : Colors.nearBlack;

  const textColor = variant === 'cream' ? Colors.darkGreen : Colors.creamText;

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <View style={styles.hamburger}>
              <View style={[styles.hamburgerLine, { backgroundColor: textColor }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: textColor }]} />
              <View style={[styles.hamburgerLine, { backgroundColor: textColor, width: 12 }]} />
            </View>
          </TouchableOpacity>
        )}
        {showLogo || (!title && !showBack) ? (
          <MalawLogo size={40} />
        ) : title ? (
          <Text style={[styles.title, { color: Colors.gold }]}>{title}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {rightElement}
        <View style={styles.avatarBorder}>
          <View style={styles.avatarInner} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 80,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  backBtn: {
    width: 34,
    height: 28,
    borderRadius: 9999,
    justifyContent: 'center',
  },
  hamburger: {
    gap: 3,
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    borderRadius: 1,
  },
  logo: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Manrope_500Medium',
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkGreenTint,
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreen,
  },
});

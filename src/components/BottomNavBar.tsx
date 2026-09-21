import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors } from '../constants/theme';

type ActiveTab = 'accueil' | 'livraisons' | 'gains' | 'profil';

interface BottomNavBarProps {
  active: ActiveTab;
  homeScreen?: 'DashboardEnLigne' | 'DashboardHorsLigne';
}

function IconHome({ color }: { color: string }) {
  return (
    <Text style={{ fontSize: 22, color, lineHeight: 24, includeFontPadding: false }}>
      ⌂
    </Text>
  );
}

function IconRoute({ color }: { color: string }) {
  const s = 1.8;
  return (
    <View style={{ width: 24, height: 24 }}>
      {/* Origin circle */}
      <View style={{ position: 'absolute', top: 2, left: 3, width: 6, height: 6, borderRadius: 3, borderWidth: s, borderColor: color }} />
      {/* Destination circle */}
      <View style={{ position: 'absolute', bottom: 2, right: 3, width: 6, height: 6, borderRadius: 3, borderWidth: s, borderColor: color }} />
      {/* Vertical segment top */}
      <View style={{ position: 'absolute', top: 8, left: 5.5, width: s, height: 3, backgroundColor: color, borderRadius: 1 }} />
      {/* Horizontal segment */}
      <View style={{ position: 'absolute', top: 11, left: 5.5, right: 5.5, height: s, backgroundColor: color, borderRadius: 1 }} />
      {/* Vertical segment bottom */}
      <View style={{ position: 'absolute', bottom: 8, right: 5.5, width: s, height: 3, backgroundColor: color, borderRadius: 1 }} />
    </View>
  );
}

function IconWallet({ color }: { color: string }) {
  const s = 1.6;
  return (
    <View style={{ width: 24, height: 24 }}>
      {/* Card top strip (flap) */}
      <View style={{ position: 'absolute', top: 4, left: 4, right: 4, height: s, backgroundColor: color, borderRadius: 1, opacity: 0.5 }} />
      {/* Card body */}
      <View style={{ position: 'absolute', top: 6, left: 2, right: 2, bottom: 3, borderWidth: s, borderColor: color, borderRadius: 3 }}>
        {/* Inner stripe */}
        <View style={{ position: 'absolute', top: 3, left: 0, right: 0, height: 4, backgroundColor: color, opacity: 0.15 }} />
      </View>
      {/* Coin */}
      <View style={{ position: 'absolute', bottom: 6, right: 5, width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }} />
    </View>
  );
}

function IconUser({ color }: { color: string }) {
  const s = 1.6;
  return (
    <View style={{ width: 24, height: 24 }}>
      {/* Head */}
      <View style={{ position: 'absolute', top: 2, left: 8, width: 8, height: 8, borderRadius: 4, borderWidth: s, borderColor: color }} />
      {/* Body arc — top half of an oval */}
      <View style={{
        position: 'absolute', bottom: 1, left: 2, right: 2, height: 9,
        borderTopLeftRadius: 10, borderTopRightRadius: 10,
        borderWidth: s, borderColor: color, borderBottomWidth: 0,
      }} />
    </View>
  );
}

export default function BottomNavBar({ active, homeScreen = 'DashboardHorsLigne' }: BottomNavBarProps) {
  const navigation = useNavigation<any>();

  const tabs = [
    { key: 'accueil' as ActiveTab, label: 'Accueil', screen: homeScreen },
    { key: 'livraisons' as ActiveTab, label: 'Livraisons', screen: 'Historique' },
    { key: 'gains' as ActiveTab, label: 'Gains', screen: 'Wallet' },
    { key: 'profil' as ActiveTab, label: 'Profil', screen: 'Profil' },
  ];

  const renderIcon = (key: ActiveTab, color: string, isActive: boolean) => {
    switch (key) {
      case 'accueil':    return <IconHome color={color} />;
      case 'livraisons': return <IconRoute color={color} />;
      case 'gains':      return <IconWallet color={color} />;
      case 'profil':     return <IconUser color={color} />;
    }
  };

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? Colors.gold : 'rgba(245,240,226,0.35)';
        return (
          <TouchableOpacity
            key={tab.key}
            style={styles.tab}
            onPress={() => navigation.navigate(tab.screen)}
            activeOpacity={0.7}
          >
            {renderIcon(tab.key, color, isActive)}
            <Text style={[styles.label, { color, fontWeight: isActive ? '700' : '400' }]}>
              {tab.label}
            </Text>
            {isActive && <View style={styles.activeDot} />}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.nearBlack,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 14,
    paddingBottom: 28,
    paddingHorizontal: 24,
    justifyContent: 'space-around',
    alignItems: 'flex-start',
  },
  tab: {
    alignItems: 'center',
    gap: 4,
    minWidth: 60,
    position: 'relative',
  },
  label: {
    fontSize: 11,
    fontFamily: 'Manrope_500Medium',
  },
  activeDot: {
    position: 'absolute',
    bottom: -10,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
  },
});

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function ConfirmationLivraisonScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      {/* Faded map background */}
      <View style={styles.mapBg} pointerEvents="none">
        <Text style={styles.mapBgEmoji}>🗺️</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success section */}
        <View style={styles.successSection}>
          <View style={styles.successCircle}>
            <View style={styles.successCircleShadow} />
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Livraison effectuée!</Text>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          {/* Stats row */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DURÉE</Text>
              <Text style={styles.statValue}>22 min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>DISTANCE</Text>
              <Text style={styles.statValue}>4.8 km</Text>
            </View>
          </View>

          {/* Earnings display */}
          <View style={styles.earningsDisplay}>
            <Text style={styles.earningsLabel}>Gains de cette course</Text>
            <Text style={styles.earningsValue}>2 300 FCFA</Text>
          </View>

          {/* Daily total — cliquable → Wallet */}
          <TouchableOpacity style={styles.dailyTotal} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.8}>
            <Text style={styles.dailyTotalText}>Total aujourd'hui: 14 800 FCFA →</Text>
          </TouchableOpacity>
        </View>

        {/* Return button */}
        <View style={styles.actionArea}>
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => navigation.navigate('DashboardEnLigne')}
            activeOpacity={0.85}
          >
            <View style={styles.returnBtnShadow} />
            <Text style={styles.returnBtnText}>Retour au tableau de bord</Text>
            <Text style={{ color: Colors.white, fontSize: 16 }}>→</Text>
          </TouchableOpacity>
        </View>

        {/* Feedback section */}
        <View style={styles.feedbackSection}>
          <View style={styles.starsRow}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Text key={i} style={styles.star}>⭐</Text>
            ))}
          </View>
          <Text style={styles.feedbackText}>
            Merci pour votre excellent service, Abdoulaye.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  mapBg: {
    position: 'absolute',
    inset: 0,
    opacity: 0.05,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapBgEmoji: {
    fontSize: 200,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 48,
    gap: 32,
    alignItems: 'center',
  },
  successSection: {
    alignItems: 'center',
    gap: 16,
  },
  successCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  successCircleShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  successIcon: {
    fontSize: 48,
    color: Colors.cream,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  summaryCard: {
    width: width - 48,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    padding: 24,
    gap: 20,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGreen,
    paddingBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.darkGreen,
    opacity: 0.2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  earningsDisplay: {
    alignItems: 'center',
    gap: 8,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
  },
  dailyTotal: {
    borderRadius: 9999,
    backgroundColor: Colors.cream,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dailyTotalText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  actionArea: {
    width: width - 48,
  },
  returnBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  returnBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  returnBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  feedbackSection: {
    alignItems: 'center',
    gap: 8,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
  },
  star: {
    fontSize: 20,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.7,
  },
});

import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';

const { width } = Dimensions.get('window');

export default function DashboardHorsLigneScreen() {
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar - green */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <View style={styles.menuLines}>
            <View style={styles.menuLine} />
            <View style={styles.menuLine} />
            <View style={[styles.menuLine, { width: 12 }]} />
          </View>
          <MalawLogo size={40} />
        </View>
        <TouchableOpacity style={styles.avatarArea} onPress={() => navigation.navigate('Profil')} activeOpacity={0.8}>
          <View style={styles.avatarCircle}>
            <Text style={{ fontSize: 16 }}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Offline status section */}
        <View style={styles.offlineSection}>
          <View style={styles.offlineDecor} pointerEvents="none">
            <View style={styles.offlineDecorIcon} />
          </View>
          <View style={styles.offlineIconContainer}>
            <View style={styles.offlineIconBg}>
              <Text style={styles.offlineEmoji}>🔴</Text>
            </View>
          </View>
          <View style={styles.offlineTextBlock}>
            <Text style={styles.offlineTitle}>Vous êtes hors ligne</Text>
            <Text style={styles.offlineDesc}>
              Activez votre disponibilité pour{'\n'}commencer à recevoir des courses à{'\n'}Dakar.
            </Text>
          </View>
        </View>

        {/* Weekly summary */}
        <TouchableOpacity style={styles.weeklySummary} onPress={() => navigation.navigate('DetailsHebdos')} activeOpacity={0.85}>
          <View style={styles.weeklySummaryInner}>
            <View style={styles.weeklyLeft}>
              <Text style={styles.weeklyTotal}>47 300 FCFA</Text>
              <Text style={styles.weeklyLabel}>Cette semaine</Text>
              <View style={styles.weeklyBadge}>
                <Text style={styles.weeklyBadgeText}>+12%</Text>
              </View>
            </View>
            <View style={styles.weeklyRight}>
              <View style={styles.weeklyStatsIcon} />
            </View>
          </View>
          <View style={styles.weeklyFooter}>
            <Text style={styles.weeklyFooterIcon}>🏍️</Text>
            <Text style={styles.weeklyFooterText}>32 livraisons effectuées</Text>
          </View>
        </TouchableOpacity>

        {/* Activity peaks card */}
        <View style={styles.peaksCard}>
          <View style={styles.peaksHeader}>
            <Text style={styles.peaksEmoji}>🔥</Text>
            <Text style={styles.peaksTitle}>Pics d'activité aujourd'hui</Text>
          </View>
          <View style={styles.peaksSlots}>
            {/* Peak 1 */}
            <View style={styles.peakSlot}>
              <Text style={styles.peakTime}>12h - 14h</Text>
              <Text style={styles.peakEarnings}>+3 800 FCFA</Text>
            </View>
            {/* Peak 2 */}
            <View style={[styles.peakSlot, styles.peakSlotActive]}>
              <Text style={styles.peakTime}>18h - 21h</Text>
              <View style={styles.peakSlotRight}>
                <Text style={styles.peakEarnings}>+5 200 FCFA</Text>
                <View style={styles.peakArrow}>
                  <Text style={{ color: 'rgb(67,44,0)', fontSize: 14 }}>→</Text>
                </View>
              </View>
            </View>
          </View>
          <Text style={styles.peaksFooter}>Gagnez jusqu'à 2x plus durant ces créneaux</Text>
        </View>

        {/* Go online button */}
        <TouchableOpacity
          style={styles.goOnlineBtn}
          onPress={() => navigation.replace('DashboardEnLigne')}
          activeOpacity={0.85}
        >
          <View style={styles.goOnlineBtnShadow} />
          <Text style={styles.goOnlineText}>Me mettre en ligne</Text>
          <Text style={{ color: Colors.cream, fontSize: 16 }}>→</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar active="accueil" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  topBar: {
    height: 80,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  menuLines: {
    gap: 3,
  },
  menuLine: {
    width: 18,
    height: 2,
    backgroundColor: Colors.gold,
    borderRadius: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  avatarArea: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    backgroundColor: Colors.cream,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 40,
    gap: 20,
  },
  offlineSection: {
    alignItems: 'center',
    gap: 16,
    position: 'relative',
  },
  offlineDecor: {
    position: 'absolute',
    width: 225,
    height: 225,
    opacity: 0.10,
    alignSelf: 'center',
  },
  offlineDecorIcon: {
    flex: 1,
    backgroundColor: Colors.darkGreen,
    borderRadius: 8,
  },
  offlineIconContainer: {
    alignItems: 'center',
  },
  offlineIconBg: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offlineEmoji: {
    fontSize: 40,
  },
  offlineTextBlock: {
    alignItems: 'center',
    gap: 8,
  },
  offlineTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  offlineDesc: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
    opacity: 0.8,
  },
  weeklySummary: {
    borderRadius: Radii.xl,
    backgroundColor: 'rgb(234,227,209)',
    padding: 24,
    gap: 12,
  },
  weeklySummaryInner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weeklyLeft: {
    gap: 4,
  },
  weeklyTotal: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  weeklyLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  weeklyBadge: {
    marginTop: 4,
    backgroundColor: Colors.darkGreen,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  weeklyBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  weeklyRight: {
    width: 80,
    height: 80,
    opacity: 0.05,
    backgroundColor: Colors.darkGreen,
    borderRadius: 8,
  },
  weeklyStatsIcon: {
    flex: 1,
  },
  weeklyFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(26,61,43,0.1)',
  },
  weeklyFooterIcon: {
    fontSize: 16,
  },
  weeklyFooterText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  peaksCard: {
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    padding: 24,
    gap: 16,
  },
  peaksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peaksEmoji: {
    fontSize: 24,
  },
  peaksTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  peaksSlots: {
    gap: 8,
  },
  peakSlot: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  peakSlotActive: {
    backgroundColor: Colors.goldLight,
  },
  peakTime: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  peakEarnings: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  peakSlotRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  peakArrow: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peaksFooter: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.7,
  },
  goOnlineBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  goOnlineBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  goOnlineText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
});

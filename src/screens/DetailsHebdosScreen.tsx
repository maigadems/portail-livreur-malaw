import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import { getEarnings, getMyDeliveries, Earnings } from '../api/couriers';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

type DayStat = { key: string; day: string; courses: number; earnings: number };

export default function DetailsHebdosScreen() {
  const navigation = useNavigation<any>();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [days, setDays] = useState<DayStat[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getEarnings().catch(() => null), getMyDeliveries().catch(() => [])])
      .then(([earn, deliveries]) => {
        if (!active) return;
        setEarnings(earn);
        // Début de la semaine (dimanche 00:00), comme le backend earnings.
        const startOfWeek = new Date();
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
        // Agrège les livraisons livrées de la semaine par jour.
        const map = new Map<string, DayStat>();
        deliveries
          .filter((d) => d.status === 'DELIVERED' && d.deliveredAt && new Date(d.deliveredAt) >= startOfWeek)
          .forEach((d) => {
            const date = new Date(d.deliveredAt!);
            const key = date.toDateString();
            const label = `${DAY_NAMES[date.getDay()]} ${date.getDate()}`;
            const cur = map.get(key) ?? { key, day: label, courses: 0, earnings: 0 };
            cur.courses += 1;
            cur.earnings += d.order.deliveryFee;
            map.set(key, cur);
          });
        setDays([...map.values()].sort((a, b) => Date.parse(b.key) - Date.parse(a.key)));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const weekTotal = earnings?.week.totalXof ?? 0;
  const weekCount = earnings?.week.count ?? 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <MalawLogo size={40} />
        </View>
        <LivreurAvatar size={40} />
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Week selector */}
        <View style={styles.weekSelector}>
          <Text style={styles.weekTitle}>Gains de la semaine</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.goldLight} style={{ marginVertical: 32 }} />
        ) : (
        <>
        {/* Summary card - forest green */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryCardDecor} />
          <View style={styles.summaryContent}>
            <View style={styles.summaryTop}>
              <Text style={styles.summaryLabel}>GAINS DE LA SEMAINE</Text>
              <Text style={styles.summaryValue}>{fmt(weekTotal)} FCFA</Text>
            </View>
            <View style={styles.summaryStats}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatLabel}>COURSES LIVRÉES</Text>
                <Text style={styles.summaryStatValue}>{weekCount}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Daily table */}
        <View style={styles.dailyTable}>
          <Text style={styles.dailyTableTitle}>Activité Quotidienne</Text>
          {days.length === 0 ? (
            <Text style={styles.emptyDay}>Aucune course livrée cette semaine.</Text>
          ) : (
            <View style={styles.dayRows}>
              {days.map((day) => (
                <View key={day.key} style={styles.dayRow}>
                  <View style={styles.dayRowLeft}>
                    <Text style={styles.dayName}>{day.day}</Text>
                  </View>
                  <View style={styles.dayRowRight}>
                    <View style={styles.dayCoursePill}>
                      <Text style={styles.dayCourses}>{day.courses} course{day.courses > 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={styles.dayEarnings}>{fmt(day.earnings)} FCFA</Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
        </>
        )}
      </ScrollView>

      <BottomNavBar active="gains" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepBlack,
  },
  topBar: {
    height: 80,
    backgroundColor: Colors.nearBlack,
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
  backBtn: {
    justifyContent: 'center',
    width: 34,
    height: 28,
  },
  backArrow: {
    fontSize: 22,
    color: Colors.cream,
    fontWeight: '600',
  },
  hamburgerLine: {
    width: 18,
    height: 2,
    backgroundColor: Colors.cream,
    borderRadius: 1,
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreenTint,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 32,
    gap: 20,
  },
  weekSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  calendarBtn: {
    width: 34,
    height: 36,
    borderRadius: 9999,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.darkGreen,
    padding: 24,
    gap: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  summaryCardDecor: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.greenMid,
    top: -48,
    right: -20,
    opacity: 0.25,
  },
  summaryContent: {
    gap: 16,
  },
  summaryTop: {
    gap: 4,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  summaryValue: {
    fontSize: 34,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  summaryStatItem: {
    gap: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  summaryStatDivider: {
    width: 1,
    height: 32,
    backgroundColor: Colors.white,
  },
  paymentPill: {
    borderRadius: Radii.md,
    backgroundColor: Colors.nearBlack,
    borderWidth: 1,
    borderColor: Colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentDot: {
    width: 16,
    height: 14,
    borderRadius: 9999,
    backgroundColor: Colors.success,
  },
  paymentPillText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  paymentArrow: {
    color: Colors.white,
    fontSize: 18,
  },
  bonusCard: {
    borderRadius: Radii.xl,
    backgroundColor: 'rgb(133,91,0)',
    borderWidth: 1,
    borderColor: Colors.goldLight,
    padding: 24,
    gap: 16,
  },
  bonusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bonusIconBg: {
    width: 36,
    height: 35,
    borderRadius: Radii.sm,
    backgroundColor: 'rgb(255,219,165)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bonusIcon: {
    fontSize: 18,
  },
  bonusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
  },
  bonusSlots: {
    flexDirection: 'row',
    gap: 12,
  },
  bonusSlot: {
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(0,0,0,0.5)',
    padding: 12,
    gap: 4,
  },
  bonusSlotLabel: {
    fontSize: 12,
    fontWeight: '400',
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
  },
  bonusSlotValue: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
  },
  dailyTable: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.cardDark,
    padding: 24,
    gap: 16,
  },
  dailyTableTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  emptyDay: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    paddingVertical: 16,
  },
  dayRows: {
    gap: 8,
  },
  dayRow: {
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dayRowLeft: {
    gap: 4,
  },
  dayName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  dayDist: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  dayRowRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  dayCoursePill: {
    borderRadius: 9999,
    backgroundColor: Colors.darkGreenTint,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayCourses: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  dayEarnings: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  seeAllBtn: {
    borderWidth: 1,
    borderColor: 'rgb(139,146,140)',
    borderRadius: Radii.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
});

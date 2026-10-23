import React, { useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import { Alert } from '../components/AppAlert';
import { getEarnings, getMyDeliveries, Earnings, CourierDelivery } from '../api/couriers';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
const CHART_HEIGHT = 120;

type DayStat = { key: string; day: string; date: number; courses: number; earnings: number };

/** Dimanche 00:00 de la semaine visée, comme le calcul des gains côté serveur. */
function startOfWeek(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay() - offset * 7);
  return d;
}

const fmtDayMonth = (d: Date) =>
  d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });

export default function DetailsHebdosScreen() {
  const navigation = useNavigation<any>();
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [loading, setLoading] = useState(true);
  // 0 = semaine en cours, 1 = semaine précédente, etc.
  const [weekOffset, setWeekOffset] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    Promise.all([getEarnings(), getMyDeliveries()])
      .then(([earn, list]) => {
        if (!active) return;
        setEarnings(earn);
        setDeliveries(list);
      })
      .catch((e: any) => {
        if (active) Alert.alert('Gains indisponibles', e?.message ?? 'Réessayez dans un instant.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  const delivered = useMemo(
    () => deliveries.filter((d) => d.status === 'DELIVERED' && d.deliveredAt),
    [deliveries],
  );

  const weekStart = useMemo(() => startOfWeek(weekOffset), [weekOffset]);
  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  // Sept cases pleines : un jour sans course reste visible, à zéro.
  const days = useMemo<DayStat[]>(() => {
    const slots: DayStat[] = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return {
        key: d.toDateString(),
        day: DAY_NAMES[d.getDay()],
        date: d.getDate(),
        courses: 0,
        earnings: 0,
      };
    });
    const byKey = new Map(slots.map((s) => [s.key, s]));
    delivered.forEach((d) => {
      const date = new Date(d.deliveredAt!);
      if (date < weekStart || date >= weekEnd) return;
      const slot = byKey.get(date.toDateString());
      if (!slot) return;
      slot.courses += 1;
      slot.earnings += d.order.deliveryFee;
    });
    return slots;
  }, [delivered, weekStart, weekEnd]);

  const computedTotal = days.reduce((acc, d) => acc + d.earnings, 0);
  const computedCount = days.reduce((acc, d) => acc + d.courses, 0);

  // Pour la semaine en cours, le serveur fait foi ; les semaines passées sont
  // reconstituées depuis l'historique de livraisons.
  const weekTotal = weekOffset === 0 ? (earnings?.week.totalXof ?? computedTotal) : computedTotal;
  const weekCount = weekOffset === 0 ? (earnings?.week.count ?? computedCount) : computedCount;

  const maxDay = Math.max(...days.map((d) => d.earnings), 0);

  // On ne remonte pas plus loin que l'historique réellement disponible.
  const oldestDelivery = useMemo(() => {
    const times = delivered.map((d) => Date.parse(d.deliveredAt!));
    return times.length ? Math.min(...times) : null;
  }, [delivered]);
  const canGoBack = oldestDelivery !== null && oldestDelivery < weekStart.getTime();
  const canGoForward = weekOffset > 0;

  const weekLabel = weekOffset === 0
    ? 'Cette semaine'
    : weekOffset === 1
      ? 'Semaine dernière'
      : `Il y a ${weekOffset} semaines`;

  const rangeLabel = `${fmtDayMonth(weekStart)} — ${fmtDayMonth(new Date(weekEnd.getTime() - 86400000))}`;

  return (
    <SafeAreaView style={styles.container}>
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
        {/* Navigation entre semaines */}
        <View style={styles.weekSelector}>
          <TouchableOpacity
            style={[styles.weekNavBtn, !canGoBack && styles.weekNavBtnDisabled]}
            onPress={() => setWeekOffset((o) => o + 1)}
            disabled={!canGoBack}
            activeOpacity={0.85}
          >
            <Text style={[styles.weekNavArrow, !canGoBack && styles.weekNavArrowDisabled]}>←</Text>
          </TouchableOpacity>
          <View style={styles.weekTitleBlock}>
            <Text style={styles.weekTitle}>{weekLabel}</Text>
            <Text style={styles.weekRange}>{rangeLabel}</Text>
          </View>
          <TouchableOpacity
            style={[styles.weekNavBtn, !canGoForward && styles.weekNavBtnDisabled]}
            onPress={() => setWeekOffset((o) => Math.max(0, o - 1))}
            disabled={!canGoForward}
            activeOpacity={0.85}
          >
            <Text style={[styles.weekNavArrow, !canGoForward && styles.weekNavArrowDisabled]}>→</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.goldLight} style={{ marginVertical: 32 }} />
        ) : (
        <>
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

        {/* Barres proportionnelles au meilleur jour de la semaine */}
        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Répartition par jour</Text>
          {maxDay === 0 ? (
            <Text style={styles.emptyDay}>Aucune course livrée sur cette semaine.</Text>
          ) : (
            <View style={styles.chart}>
              {days.map((d) => {
                const ratio = d.earnings / maxDay;
                return (
                  <View key={d.key} style={styles.chartColumn}>
                    <Text style={styles.chartValue}>
                      {d.earnings > 0 ? fmt(d.earnings) : ''}
                    </Text>
                    <View style={styles.chartBarTrack}>
                      <View
                        style={[
                          styles.chartBar,
                          {
                            height: Math.max(d.earnings > 0 ? 6 : 2, Math.round(CHART_HEIGHT * ratio)),
                            backgroundColor: d.earnings === maxDay ? Colors.goldLight : Colors.greenMid,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.chartDay}>{d.day}</Text>
                    <Text style={styles.chartDate}>{d.date}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        <View style={styles.dailyTable}>
          <Text style={styles.dailyTableTitle}>Activité quotidienne</Text>
          {computedCount === 0 ? (
            <Text style={styles.emptyDay}>Aucune course livrée sur cette semaine.</Text>
          ) : (
            <View style={styles.dayRows}>
              {days
                .filter((d) => d.courses > 0)
                .map((day) => (
                  <View key={day.key} style={styles.dayRow}>
                    <View style={styles.dayRowLeft}>
                      <Text style={styles.dayName}>{day.day} {day.date}</Text>
                    </View>
                    <View style={styles.dayRowRight}>
                      <View style={styles.dayCoursePill}>
                        <Text style={styles.dayCourses}>
                          {day.courses} course{day.courses > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <Text style={styles.dayEarnings}>{fmt(day.earnings)} FCFA</Text>
                    </View>
                  </View>
                ))}
            </View>
          )}
          <Text style={styles.tableNote}>
            Détail reconstitué à partir de vos dernières livraisons.
          </Text>
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
    gap: 12,
  },
  weekTitleBlock: { flex: 1, alignItems: 'center', gap: 2 },
  weekTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  weekRange: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  weekNavBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavBtnDisabled: { opacity: 0.3 },
  weekNavArrow: {
    fontSize: 18,
    color: Colors.gold,
    fontWeight: '700',
  },
  weekNavArrowDisabled: { color: Colors.dimText },
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
  chartCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.cardDark,
    padding: 24,
    gap: 16,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 6,
  },
  chartColumn: { flex: 1, alignItems: 'center', gap: 4 },
  chartValue: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    height: 12,
  },
  chartBarTrack: {
    height: CHART_HEIGHT,
    justifyContent: 'flex-end',
    width: '100%',
    alignItems: 'center',
  },
  chartBar: {
    width: '70%',
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
  },
  chartDay: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  chartDate: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.dimText,
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
  tableNote: {
    fontSize: 11,
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
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
});

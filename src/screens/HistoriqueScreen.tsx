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
import { getMyDeliveries, CourierDelivery } from '../api/couriers';
import { getActiveDeliveries, listAvailableDeliveries, ActiveDelivery, AvailableDelivery } from '../api/deliveries';
import { getIgnoredIds } from '../api/ignoredDeliveries';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const STATUS_LABEL: Record<string, string> = {
  DELIVERED: 'LIVRÉ',
  CANCELLED: 'ANNULÉ',
};
const ACTIVE = ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT'];

export default function HistoriqueScreen() {
  const navigation = useNavigation<any>();
  const [deliveries, setDeliveries] = useState<CourierDelivery[]>([]);
  const [active, setActive] = useState<ActiveDelivery[]>([]);
  const [suggested, setSuggested] = useState<AvailableDelivery | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let running = true;
    Promise.all([
      getMyDeliveries().catch(() => []),
      getActiveDeliveries().catch(() => []),
      listAvailableDeliveries().catch(() => []),
      getIgnoredIds().catch(() => []),
    ])
      .then(([list, act, avail, ignored]) => {
        if (!running) return;
        setDeliveries(list);
        setActive(act);
        // Aucune course en cours → on suggère la dernière course disponible
        // (non ignorée par ce livreur), pour qu'il en ait toujours une sous
        // la main dans "Mes livraisons".
        if (act.length === 0) {
          const candidates = avail
            .filter((d) => !ignored.includes(d.id))
            .sort((a, b) => (b.createdAt ? Date.parse(b.createdAt) : 0) - (a.createdAt ? Date.parse(a.createdAt) : 0));
          setSuggested(candidates[0] ?? null);
        } else {
          setSuggested(null);
        }
      })
      .catch(() => {})
      .finally(() => { if (running) setLoading(false); });
    return () => { running = false; };
  }, []));

  const isToday = (iso: string | null) => {
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  };
  const todayDelivered = deliveries.filter((d) => d.status === 'DELIVERED' && isToday(d.deliveredAt));
  const todayEarnings = todayDelivered.reduce((sum, d) => sum + d.order.deliveryFee, 0);
  // "Récentes" = livraisons terminées (livrées/annulées), les courses en
  // cours sont dans leur propre section.
  const finished = deliveries.filter((d) => !ACTIVE.includes(d.status)).slice(0, 10);

  const openActive = (d: ActiveDelivery) => {
    navigation.navigate(
      d.status === 'IN_TRANSIT' ? 'EnRouteClient' : 'EnRoutePickup',
      { deliveryId: d.id, orderId: d.order.id },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar - green */}
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
        {/* Header section */}
        <View style={styles.headerSection}>
          <Text style={styles.pageTitle}>Mes livraisons</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={Colors.goldLight} style={{ paddingVertical: 40 }} />
        ) : (
          <>
            {/* Section EN COURS — une carte par course active, ancien→récent */}
            {active.length > 0 ? (
              <View style={styles.todaySection}>
                <View style={styles.todaySectionHeader}>
                  <Text style={styles.todaySectionTitle}>EN COURS ({active.length})</Text>
                </View>
                {active.map((d) => (
                  <View key={d.id} style={styles.activeCard}>
                    <View style={styles.activeCardDecor} />
                    <View style={styles.activeCardContent}>
                      <View style={styles.activeCardBadgeRow}>
                        <View style={styles.activeBadge}>
                          <View style={styles.activeBadgeDot} />
                          <Text style={styles.activeBadgeText}>
                            {d.status === 'IN_TRANSIT' ? 'EN LIVRAISON' : 'À RÉCUPÉRER'}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.routeBlock}>
                        <View style={styles.routeConnector}>
                          <View style={styles.routeDotFilled} />
                          <View style={styles.routeLineV} />
                          <View style={styles.routeDotOutline} />
                        </View>
                        <View style={styles.routeStops}>
                          <View style={styles.routeStopItem}>
                            <Text style={styles.routeStopLabel}>PICKUP</Text>
                            <Text style={styles.routeStopName} numberOfLines={1}>{d.order.restaurant?.name ?? '—'}</Text>
                          </View>
                          <View style={styles.routeStopItem}>
                            <Text style={styles.routeStopLabel}>{d.order.customer?.name ?? 'LIVRAISON'}</Text>
                            <Text style={styles.routeStopName} numberOfLines={1}>{d.order.deliveryAddress?.line ?? '—'}</Text>
                          </View>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.reprendreBtn} onPress={() => openActive(d)}>
                        <Text style={styles.reprendreBtnText}>Reprendre</Text>
                        <Text style={{ color: 'rgb(67,44,0)', fontSize: 16 }}>→</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            ) : null}

            {/* Aucune course en cours → suggestion : la dernière course
                disponible à proximité (non ignorée). */}
            {active.length === 0 && suggested ? (
              <View style={styles.todaySection}>
                <View style={styles.todaySectionHeader}>
                  <Text style={styles.todaySectionTitle}>COURSE DISPONIBLE</Text>
                </View>
                <TouchableOpacity
                  style={styles.suggestCard}
                  onPress={() => navigation.navigate('CoursesDisponibles')}
                  activeOpacity={0.85}
                >
                  <View style={styles.routeBlock}>
                    <View style={styles.routeConnector}>
                      <View style={styles.routeDotFilled} />
                      <View style={styles.routeLineV} />
                      <View style={styles.routeDotOutline} />
                    </View>
                    <View style={styles.routeStops}>
                      <View style={styles.routeStopItem}>
                        <Text style={styles.routeStopLabel}>PICKUP</Text>
                        <Text style={styles.routeStopName} numberOfLines={1}>{suggested.order.restaurant.name}</Text>
                      </View>
                      <View style={styles.routeStopItem}>
                        <Text style={styles.routeStopLabel}>{suggested.order.customer?.firstName ?? 'CLIENT'}</Text>
                        <Text style={styles.routeStopName} numberOfLines={1}>{suggested.order.deliveryAddress.line}</Text>
                      </View>
                    </View>
                    <View style={styles.suggestFee}>
                      <Text style={styles.suggestFeeValue}>{fmt(suggested.order.deliveryFee)}</Text>
                      <Text style={styles.suggestFeeUnit}>FCFA</Text>
                    </View>
                  </View>
                  <View style={styles.reprendreBtn}>
                    <Text style={styles.reprendreBtnText}>Voir la course</Text>
                    <Text style={{ color: 'rgb(67,44,0)', fontSize: 16 }}>→</Text>
                  </View>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* Section RÉCENTES — livraisons terminées, cliquables (détail). */}
            <View style={styles.todaySection}>
              <View style={styles.todaySectionHeader}>
                <Text style={styles.todaySectionTitle}>RÉCENTES</Text>
              </View>

              <View style={styles.deliveryList}>
                {finished.length === 0 ? (
                  <Text style={styles.emptyText}>Aucune livraison terminée pour le moment.</Text>
                ) : finished.map((d) => {
                  const isCancelled = d.status === 'CANCELLED';
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.deliveryItem, { borderColor: isCancelled ? Colors.errorBg : Colors.goldLight }]}
                      onPress={() => navigation.navigate('DetailLivraison', { deliveryId: d.id })}
                      activeOpacity={0.8}
                    >
                      <View style={styles.deliveryItemLeft}>
                        <View style={styles.deliveryBadgeRow}>
                          <View style={[styles.deliveryStatusBadge, { backgroundColor: isCancelled ? Colors.errorBg : Colors.darkGreenTint }]}>
                            <Text style={styles.deliveryStatusText}>{STATUS_LABEL[d.status] ?? d.status}</Text>
                          </View>
                          <Text style={styles.deliveryTime}>
                            {d.deliveredAt ? new Date(d.deliveredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : new Date(d.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                          </Text>
                        </View>
                        <Text style={styles.deliveryRoute} numberOfLines={1}>{d.order.restaurant.name}</Text>
                        <View style={styles.deliveryMeta}>
                          <Text style={styles.deliveryMetaText} numberOfLines={1}>{d.order.deliveryAddress.line}</Text>
                        </View>
                      </View>
                      <View style={styles.deliveryEarnings}>
                        <Text style={[styles.deliveryEarningsValue, { color: isCancelled ? Colors.muted : Colors.goldLight }]}>
                          {isCancelled ? '0' : fmt(d.order.deliveryFee)}
                        </Text>
                        <Text style={styles.deliveryEarningsCurrency}>FCFA</Text>
                        <Text style={styles.deliveryChevron}>›</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Summary footer — aujourd'hui */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>RÉSUMÉ DE LA JOURNÉE</Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatLabel}>COURSES</Text>
                  <Text style={styles.summaryStatValue}>{todayDelivered.length}</Text>
                </View>
                <View style={styles.summaryStat}>
                  <Text style={styles.summaryStatLabel}>GAINS</Text>
                  <Text style={styles.summaryStatValue}>{fmt(todayEarnings)}</Text>
                  <Text style={styles.summaryStatSubValue}>FCFA</Text>
                </View>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      <BottomNavBar active="livraisons" homeScreen="DashboardEnLigne" />
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
  backBtn: {
    width: 34,
    height: 28,
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 22,
    color: Colors.cream,
    fontWeight: '600',
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
  scrollArea: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 20,
  },
  headerSection: {
    gap: 16,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  filterTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    height: 40,
    borderRadius: 9999,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabActive: {
    backgroundColor: Colors.goldLight,
  },
  filterTabInactive: {
    backgroundColor: 'rgb(25,46,34)',
  },
  filterTabText: {
    fontSize: 14,
    fontFamily: 'Manrope_500Medium',
  },
  filterTabTextActive: {
    fontWeight: '700',
    color: 'rgb(67,44,0)',
  },
  filterTabTextInactive: {
    fontWeight: '500',
    color: Colors.muted,
  },
  activeCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    overflow: 'hidden',
    position: 'relative',
  },
  activeCardDecor: {
    position: 'absolute',
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.goldLight,
    top: -48,
    right: -20,
    opacity: 0.15,
  },
  activeCardContent: {
    padding: 24,
    gap: 16,
  },
  activeCardBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.goldLight,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  activeBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgb(67,44,0)',
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  activeCardTime: {
    alignItems: 'flex-end',
    gap: 2,
  },
  activeCardTimeLabel: {
    fontSize: 11,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  activeCardTimeValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeBlock: {
    flexDirection: 'row',
    gap: 16,
  },
  routeConnector: {
    alignItems: 'center',
    paddingTop: 8,
    gap: 4,
  },
  routeDotFilled: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.goldLight,
  },
  routeLineV: {
    width: 2,
    height: 36,
    backgroundColor: Colors.goldLight,
    opacity: 0.4,
  },
  routeDotOutline: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.goldLight,
  },
  routeStops: {
    flex: 1,
    gap: 12,
  },
  routeStopItem: {
    gap: 2,
  },
  routeStopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  routeStopName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  suggestCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.4)',
    padding: 20,
    gap: 16,
  },
  suggestFee: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  suggestFeeValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  suggestFeeUnit: {
    fontSize: 10,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  reprendreBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  reprendreBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  todaySection: {
    gap: 12,
  },
  todaySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  todaySectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  seeAllLink: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  deliveryList: {
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    paddingVertical: 24,
  },
  deliveryItem: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryItemLeft: {
    flex: 1,
    gap: 6,
  },
  deliveryBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryStatusBadge: {
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  deliveryStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  deliveryTime: {
    fontSize: 11,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  deliveryRoute: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  deliveryMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  deliveryMetaText: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  deliveryEarnings: {
    alignItems: 'flex-end',
    gap: 4,
  },
  deliveryEarningsValue: {
    fontSize: 18,
    fontWeight: '800',
    fontFamily: 'Manrope_500Medium',
  },
  deliveryEarningsCurrency: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  deliveryChevron: {
    fontSize: 20,
    color: Colors.muted,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: Radii.xl,
    backgroundColor: 'rgb(133,91,0)',
    padding: 24,
    gap: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  summaryStats: {
    flexDirection: 'row',
    gap: 24,
  },
  summaryStat: {
    gap: 4,
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  summaryStatValue: {
    fontSize: 24,
    fontWeight: '800',
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
  },
  summaryStatSubValue: {
    fontSize: 12,
    color: 'rgb(255,219,165)',
    fontFamily: 'Manrope_500Medium',
  },
});

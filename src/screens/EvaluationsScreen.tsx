import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import { Alert } from '../components/AppAlert';
import {
  listMyReviews, getReviewsSummary, CourierReview, ReviewsSummary,
} from '../api/reviews';

type RatingFilter = 'Tous' | '5 ⭐' | '4 ⭐' | '< 4 ⭐';

const FILTERS: RatingFilter[] = ['Tous', '5 ⭐', '4 ⭐', '< 4 ⭐'];
const PAGE_SIZE = 20;

/** Date d'un avis, au format court français. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function matchesFilter(review: CourierReview, filter: RatingFilter): boolean {
  if (filter === '5 ⭐') return review.rating === 5;
  if (filter === '4 ⭐') return review.rating === 4;
  if (filter === '< 4 ⭐') return review.rating < 4;
  return true;
}

export default function EvaluationsScreen() {
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<RatingFilter>('Tous');
  const [summary, setSummary] = useState<ReviewsSummary | null>(null);
  const [reviews, setReviews] = useState<CourierReview[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = async () => {
    const [sum, page] = await Promise.all([
      getReviewsSummary(),
      listMyReviews({ limit: PAGE_SIZE }),
    ]);
    setSummary(sum);
    setReviews(page.items);
    setCursor(page.nextCursor);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        await load();
      } catch (e: any) {
        if (active) Alert.alert('Avis indisponibles', e?.message ?? 'Réessayez plus tard.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const onRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      await load();
    } catch (e: any) {
      Alert.alert('Actualisation impossible', e?.message ?? 'Réessayez plus tard.');
    } finally {
      setRefreshing(false);
    }
  };

  const loadMore = async () => {
    if (!cursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const page = await listMyReviews({ limit: PAGE_SIZE, cursor });
      // Concaténation : la pagination par curseur ne revient jamais en arrière.
      setReviews((prev) => [...prev, ...page.items]);
      setCursor(page.nextCursor);
    } catch (e: any) {
      Alert.alert('Chargement impossible', e?.message ?? 'Réessayez plus tard.');
    } finally {
      setLoadingMore(false);
    }
  };

  const total = summary?.count ?? 0;
  const average = summary?.average ?? null;
  const breakdown = summary?.breakdown ?? {};
  const countFor = (n: number) => Number(breakdown[String(n)] ?? 0);
  const visible = reviews.filter((r) => matchesFilter(r, filter));

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator color={Colors.gold} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mes évaluations</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.goldLight} />
        }
      >
        {total === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>⭐</Text>
            <Text style={styles.emptyTitle}>Vous n'avez pas encore reçu d'avis</Text>
            <Text style={styles.emptyDesc}>
              Les clients peuvent vous noter après chaque livraison. Vos premières évaluations
              apparaîtront ici.
            </Text>
          </View>
        ) : (
          <>
            {/* Moyenne + répartition, calculées par le serveur sur tous les avis */}
            <View style={styles.summaryCard}>
              <View style={styles.avgBlock}>
                <Text style={styles.avgValue}>{average != null ? average.toFixed(1) : '—'}</Text>
                <View style={styles.avgStars}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <Text key={i} style={[styles.star, { opacity: (average ?? 0) >= i ? 1 : 0.3 }]}>⭐</Text>
                  ))}
                </View>
                <Text style={styles.avgCount}>{total} avis</Text>
              </View>

              <View style={styles.barsBlock}>
                {[5, 4, 3, 2, 1].map((n) => (
                  <View key={n} style={styles.barRow}>
                    <Text style={styles.barLabel}>{n}⭐</Text>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${(countFor(n) / total) * 100}%` as any }]} />
                    </View>
                    <Text style={styles.barCount}>{countFor(n)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {summary?.last30dAverage != null && (
              <View style={styles.recentCard}>
                <Text style={styles.recentLabel}>Moyenne des 30 derniers jours</Text>
                <Text style={styles.recentValue}>{summary.last30dAverage.toFixed(1)} ⭐</Text>
              </View>
            )}

            {/* Filtres */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={styles.filterRow}>
                {FILTERS.map((f) => (
                  <TouchableOpacity
                    key={f}
                    style={[styles.filterPill, filter === f && styles.filterPillActive]}
                    onPress={() => setFilter(f)}
                  >
                    <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Avis */}
            <View style={styles.reviewList}>
              {visible.length === 0 ? (
                <Text style={styles.noMatch}>Aucun avis ne correspond à ce filtre.</Text>
              ) : (
                visible.map((r) => (
                  <View key={r.id} style={styles.reviewCard}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewClient}>
                        <View style={styles.clientAvatar}>
                          <Text style={{ fontSize: 18 }}>👤</Text>
                        </View>
                        <View style={styles.clientInfo}>
                          <Text style={styles.clientName}>{r.authorFirstName ?? 'Client anonyme'}</Text>
                        </View>
                      </View>
                      <View style={styles.reviewMeta}>
                        <View style={styles.starsRow}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Text key={s} style={[styles.smallStar, s > r.rating && styles.smallStarEmpty]}>⭐</Text>
                          ))}
                        </View>
                        <Text style={styles.reviewDate}>{formatDate(r.createdAt)}</Text>
                      </View>
                    </View>
                    {!!r.comment?.trim() && (
                      <Text style={styles.reviewComment}>"{r.comment.trim()}"</Text>
                    )}
                  </View>
                ))
              )}
            </View>

            {cursor && (
              <TouchableOpacity
                style={[styles.moreBtn, loadingMore && styles.moreBtnDisabled]}
                onPress={loadMore}
                disabled={loadingMore}
                activeOpacity={0.85}
              >
                {loadingMore ? (
                  <ActivityIndicator color={Colors.goldLight} />
                ) : (
                  <Text style={styles.moreBtnText}>Afficher plus d'avis</Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      <BottomNavBar active="profil" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  centered: { alignItems: 'center', justifyContent: 'center' },
  topBar: {
    height: 72,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16,
  },
  summaryCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 20,
    flexDirection: 'row',
    gap: 20,
    alignItems: 'center',
  },
  avgBlock: {
    alignItems: 'center',
    gap: 4,
    minWidth: 80,
  },
  avgValue: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 52,
  },
  avgStars: {
    flexDirection: 'row',
    gap: 2,
  },
  star: { fontSize: 14 },
  avgCount: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  barsBlock: {
    flex: 1,
    gap: 8,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    width: 28,
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(65,72,67,0.4)',
    overflow: 'hidden',
  },
  barFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.goldLight,
  },
  barCount: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    width: 16,
    textAlign: 'center',
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    backgroundColor: 'rgba(200,150,62,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(200,150,62,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  recentLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.85,
  },
  recentValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterPill: {
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
  },
  filterPillActive: {
    backgroundColor: Colors.goldLight,
    borderColor: Colors.goldLight,
  },
  filterText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  filterTextActive: {
    fontWeight: '700',
    color: 'rgb(67,44,0)',
  },
  reviewList: { gap: 10 },
  noMatch: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    paddingVertical: 24,
  },
  reviewCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 12,
  },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  reviewClient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  clientAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: { gap: 2 },
  clientName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  reviewMeta: { alignItems: 'flex-end', gap: 3 },
  starsRow: { flexDirection: 'row', gap: 1 },
  smallStar: { fontSize: 12 },
  smallStarEmpty: { opacity: 0.2 },
  reviewDate: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
  },
  reviewComment: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  moreBtn: {
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreBtnDisabled: { opacity: 0.6 },
  moreBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  emptyCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 32,
    alignItems: 'center',
    gap: 10,
    marginTop: 24,
  },
  emptyIcon: { fontSize: 40 },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl,
  AppState, AppStateStatus,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { me } from '../api/auth';
import { listAvailableDeliveries, assignDelivery, AvailableDelivery, MAX_ACTIVE_DELIVERIES } from '../api/deliveries';
import { getIgnoredIds } from '../api/ignoredDeliveries';
import { subscribeCourierFeed } from '../api/realtime';
import { ApiError } from '../api/client';
import { useCourse } from '../context/CourseContext';
import { Alert } from '../components/AppAlert';

const fmt = (n: number) => n.toLocaleString('fr-FR');

/** Cadence du repli par sondage, tant que le canal temps réel n'est pas confirmé. */
const POLL_MS = 30_000;

/**
 * Toutes les courses disponibles (GET /deliveries/available), pas seulement
 * la première comme sur le dashboard. Accepter assigne la course au livreur
 * (POST /deliveries/:id/assign) puis démarre le flux de pickup.
 */
export default function CoursesDisponiblesScreen() {
  const navigation = useNavigation<any>();
  const { atCapacity, refresh: refreshService, selectCourse } = useCourse();
  const [deliveries, setDeliveries] = useState<AvailableDelivery[]>([]);
  const [courierId, setCourierId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  // Canal temps réel confirmé par le serveur ? Tant que non, on sonde.
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    try {
      const [user, items] = await Promise.all([me(), listAvailableDeliveries()]);
      setCourierId(user?.id ?? '');
      // Exclut les courses que ce livreur a ignorées (choix local persistant).
      const ignored = await getIgnoredIds();
      const visible = items.filter((d) => !ignored.includes(d.id));
      // Les plus récentes en premier. Le backend renvoie createdAt ; certaines
      // réponses peuvent être re-triées par distance côté serveur, on force
      // donc l'ordre chronologique ici pour cette page "Voir tout".
      const sorted = [...visible].sort((a, b) => {
        const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });
      setDeliveries(sorted);
    } catch {
      // hors-ligne / session : liste vide
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  /**
   * Canal temps réel : une course qui apparaît ou disparaît doit se refléter
   * ici sans que le livreur ait à tirer la liste vers le bas. On recharge
   * depuis l'API plutôt que de patcher la liste avec la charge utile de
   * l'événement : le serveur reste la seule source de vérité.
   */
  useEffect(() => {
    const unsubscribe = subscribeCourierFeed({
      onDeliveryAvailable: () => { void load(); },
      onDeliveryTaken: () => { void load(); },
      onStatusChange: setLive,
    });
    return unsubscribe;
  }, [load]);

  // Repli par sondage : le socket meurt en arrière-plan et certains réseaux
  // le bloquent. Dès que le canal est confirmé, on cesse de doubler les
  // requêtes.
  useEffect(() => {
    if (live) return;
    const timer = setInterval(() => { void load(); }, POLL_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  // Retour au premier plan : la liste peut avoir plusieurs minutes de retard.
  useEffect(() => {
    const onChange = (state: AppStateStatus) => {
      if (state === 'active') void load();
    };
    const sub = AppState.addEventListener('change', onChange);
    return () => sub.remove();
  }, [load]);

  const onRefresh = () => { setRefreshing(true); void load(); };

  const accept = async (d: AvailableDelivery) => {
    if (!courierId || acceptingId || atCapacity) return;
    setAcceptingId(d.id);
    try {
      await assignDelivery(d.id, courierId);
      selectCourse(d.id);
      await refreshService();
      navigation.navigate('EnRoutePickup', { deliveryId: d.id, orderId: d.order.id });
    } catch (e: any) {
      // 409 : un autre livreur a été plus rapide. Dans tous les cas on
      // recharge, pour ne pas laisser une carte obsolète à l'écran.
      const taken = e instanceof ApiError && e.status === 409;
      Alert.alert(
        taken ? 'Course prise' : 'Course indisponible',
        e?.message ?? "Cette course n'est plus disponible.",
      );
      void load();
    } finally {
      setAcceptingId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Courses disponibles</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.greenMid} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.goldLight} />}
        >
          <Text style={styles.count}>{deliveries.length} course{deliveries.length > 1 ? 's' : ''} à proximité</Text>

          {/* État du canal, sans emphase : une liste figée sans avertissement
              fait croire qu'il n'y a plus de courses. */}
          <View style={styles.feedRow}>
            <View style={[styles.feedDot, !live && styles.feedDotOff]} />
            <Text style={styles.feedText}>
              {live ? 'Temps réel' : 'Actualisation toutes les 30 s'}
            </Text>
          </View>

          {atCapacity ? (
            <View style={styles.capacityCard}>
              <Text style={styles.capacityText}>
                Vous gérez déjà {MAX_ACTIVE_DELIVERIES} courses. Terminez-en une pour en accepter d'autres.
              </Text>
            </View>
          ) : null}

          {deliveries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>Aucune course disponible pour le moment.</Text>
            </View>
          ) : (
            deliveries.map((d) => (
              <View key={d.id} style={styles.courseCard}>
                <View style={styles.routeRow}>
                  <View style={styles.routeInfo}>
                    <View style={styles.routeDot} />
                    <View style={styles.routeLine} />
                    <View style={styles.routeDestDot} />
                  </View>
                  <View style={styles.routeText}>
                    <View style={styles.routeItem}>
                      <Text style={styles.routeItemLabel} numberOfLines={1}>{d.order.restaurant.name}</Text>
                      <Text style={styles.routeItemSub} numberOfLines={1}>{d.order.restaurant.address}</Text>
                    </View>
                    <View style={styles.routeItem}>
                      <Text style={styles.routeItemLabel}>{d.order.customer?.firstName ?? 'Client'}</Text>
                      <Text style={styles.routeItemSub} numberOfLines={1}>{d.order.deliveryAddress.line}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.courseStats}>
                  <View>
                    <Text style={styles.courseStatLabel}>Distance</Text>
                    <Text style={styles.courseStatValue}>{d.distanceKm != null ? `${d.distanceKm} km` : '—'}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.courseStatLabel}>Frais de livraison</Text>
                    <Text style={styles.courseStatValueGold}>{fmt(d.order.deliveryFee)} FCFA</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.acceptBtn, acceptingId === d.id && { opacity: 0.7 }]}
                  onPress={() => accept(d)}
                  disabled={acceptingId != null || atCapacity}
                >
                  {acceptingId === d.id ? (
                    <ActivityIndicator color="rgb(19,55,37)" />
                  ) : (
                    <Text style={styles.acceptText}>Accepter cette course</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  topBar: {
    height: 72,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: { width: 34, height: 34, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.cream, fontWeight: '600' },
  topBarTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: { padding: 20, gap: 14 },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  feedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -6,
  },
  feedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  feedDotOff: {
    backgroundColor: Colors.dimText,
  },
  feedText: {
    fontSize: 11,
    color: Colors.dimText,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.3,
  },
  capacityCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    padding: 16,
  },
  capacityText: {
    fontSize: 14,
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  courseCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 18,
    gap: 16,
  },
  routeRow: { flexDirection: 'row', gap: 14 },
  routeInfo: { alignItems: 'center', paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.goldLight },
  routeLine: { width: 2, flex: 1, minHeight: 28, backgroundColor: 'rgba(244,189,97,0.35)', marginVertical: 2 },
  routeDestDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: Colors.goldLight },
  routeText: { flex: 1, gap: 14 },
  routeItem: { gap: 2 },
  routeItemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeItemSub: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  courseStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
    paddingTop: 14,
  },
  courseStatLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  courseStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  courseStatValueGold: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  acceptBtn: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '800',
    color: 'rgb(19,55,37)',
    fontFamily: 'Manrope_500Medium',
  },
});

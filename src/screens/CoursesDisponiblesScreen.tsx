import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { me } from '../api/auth';
import { listAvailableDeliveries, assignDelivery, AvailableDelivery } from '../api/deliveries';
import { getIgnoredIds } from '../api/ignoredDeliveries';
import { Alert } from '../components/AppAlert';

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Toutes les courses disponibles (GET /deliveries/available), pas seulement
 * la première comme sur le dashboard. Accepter assigne la course au livreur
 * (POST /deliveries/:id/assign) puis démarre le flux de pickup.
 */
export default function CoursesDisponiblesScreen() {
  const navigation = useNavigation<any>();
  const [deliveries, setDeliveries] = useState<AvailableDelivery[]>([]);
  const [courierId, setCourierId] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

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

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onRefresh = () => { setRefreshing(true); load(); };

  const accept = async (d: AvailableDelivery) => {
    if (!courierId || acceptingId) return;
    setAcceptingId(d.id);
    try {
      await assignDelivery(d.id, courierId);
      navigation.navigate('EnRoutePickup', { deliveryId: d.id, orderId: d.order.id });
    } catch (e: any) {
      Alert.alert('Course indisponible', e?.message ?? "Cette course n'est plus disponible.");
      load();
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
                  disabled={acceptingId != null}
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

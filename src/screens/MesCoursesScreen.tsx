import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';

import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import { useCourse } from '../context/CourseContext';
import { ActiveDelivery } from '../api/deliveries';

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Courses en cours, quand le livreur en porte plusieurs.
 *
 * Il peut accepter jusqu'à trois courses, mais aucun écran ne permettait de
 * passer de l'une à l'autre : le tableau de bord renvoyait vers l'historique
 * dès qu'il y en avait plus d'une. C'est le sélecteur qui manquait.
 */

/** Où reprendre une course, selon l'étape déjà franchie. */
function resumeTarget(status: string): { screen: string; label: string } {
  switch (status) {
    case 'PICKED_UP':
    case 'IN_TRANSIT':
      return { screen: 'EnRouteClient', label: 'Aller chez le client' };
    default:
      return { screen: 'EnRoutePickup', label: 'Aller au restaurant' };
  }
}

/** Étape lisible, affichée sur la pastille de chaque course. */
function stepLabel(status: string): string {
  switch (status) {
    case 'PICKED_UP':
      return 'Colis récupéré';
    case 'IN_TRANSIT':
      return 'En route vers le client';
    default:
      return 'À récupérer';
  }
}

export default function MesCoursesScreen() {
  const navigation = useNavigation<any>();
  const { activeDeliveries, currentId, loading, refresh, selectCourse } = useCourse();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const open = (d: ActiveDelivery) => {
    selectCourse(d.id);
    const { screen } = resumeTarget(d.status);
    navigation.navigate(screen, { deliveryId: d.id, orderId: d.order.id });
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Mes courses</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.greenMid} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.goldLight}
            />
          }
        >
          <Text style={styles.count}>
            {activeDeliveries.length === 0
              ? 'Aucune course en cours'
              : `${activeDeliveries.length} course${activeDeliveries.length > 1 ? 's' : ''} en cours`}
          </Text>

          {activeDeliveries.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🛵</Text>
              <Text style={styles.emptyText}>
                Vos courses acceptées apparaîtront ici. Vous pouvez en porter trois au maximum.
              </Text>
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('CoursesDisponibles')}
              >
                <Text style={styles.emptyBtnText}>Voir les courses disponibles</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activeDeliveries.map((d, index) => {
              const isCurrent = d.id === currentId;
              const target = resumeTarget(d.status);
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.card, isCurrent && styles.cardCurrent]}
                  onPress={() => open(d)}
                  activeOpacity={0.85}
                >
                  <View style={styles.cardHead}>
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>Course {index + 1}</Text>
                    </View>
                    <Text style={styles.step}>{stepLabel(d.status)}</Text>
                  </View>

                  <View style={styles.routeRow}>
                    <View style={styles.routeInfo}>
                      <View style={styles.routeDot} />
                      <View style={styles.routeLine} />
                      <View style={styles.routeDestDot} />
                    </View>
                    <View style={styles.routeText}>
                      <View style={styles.routeItem}>
                        <Text style={styles.routeLabel} numberOfLines={1}>
                          {d.order.restaurant.name}
                        </Text>
                        <Text style={styles.routeSub} numberOfLines={1}>
                          {d.order.restaurant.address}
                        </Text>
                      </View>
                      <View style={styles.routeItem}>
                        <Text style={styles.routeLabel} numberOfLines={1}>
                          {d.order.customer?.name ?? 'Client'}
                        </Text>
                        <Text style={styles.routeSub} numberOfLines={1}>
                          {d.order.deliveryAddress.line}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.cardFoot}>
                    <Text style={styles.fee}>{fmt(d.order.deliveryFee)} FCFA</Text>
                    <Text style={styles.resume}>{target.label} →</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      <BottomNavBar active="livraisons" />
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
  scroll: { padding: 20, gap: 14, paddingBottom: 110 },
  count: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  empty: { paddingVertical: 50, alignItems: 'center', gap: 14 },
  emptyIcon: { fontSize: 44 },
  emptyText: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  emptyBtn: {
    marginTop: 6,
    height: 50,
    paddingHorizontal: 22,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: 'rgb(19,55,37)',
    fontFamily: 'Manrope_500Medium',
  },
  card: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 18,
    gap: 14,
  },
  cardCurrent: { borderColor: Colors.goldLight, backgroundColor: 'rgba(244,189,97,0.06)' },
  cardHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    backgroundColor: 'rgba(169,208,182,0.12)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  step: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeRow: { flexDirection: 'row', gap: 14 },
  routeInfo: { alignItems: 'center', paddingTop: 4 },
  routeDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.goldLight },
  routeLine: {
    width: 2,
    flex: 1,
    minHeight: 26,
    backgroundColor: 'rgba(244,189,97,0.35)',
    marginVertical: 2,
  },
  routeDestDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.goldLight,
  },
  routeText: { flex: 1, gap: 12 },
  routeItem: { gap: 2 },
  routeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeSub: { fontSize: 12, color: Colors.muted, fontFamily: 'Manrope_500Medium' },
  cardFoot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
    paddingTop: 12,
  },
  fee: {
    fontSize: 16,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  resume: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
});

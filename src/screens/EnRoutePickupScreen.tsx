import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii } from '../constants/theme';
import LivreurAvatar from '../components/LivreurAvatar';
import StaticMap from '../components/StaticMap';
import { getOrder } from '../api/orders';
import { getRoute, GeoRoute } from '../api/location';
import { getCurrentPosition } from '../services/locationTracking';

const { width, height } = Dimensions.get('window');

type OrderDetail = {
  restaurant: { name: string; address: string; latitude?: number; longitude?: number };
  items: { name: string; quantity: number }[];
  notes: string | null;
};

export default function EnRoutePickupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId, orderId } = route.params ?? {};
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trip, setTrip] = useState<GeoRoute | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!orderId) { setLoading(false); return; }
    getOrder(orderId)
      .then((o: any) => { if (active) setOrder(o); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]));

  // Position du livreur, pour cadrer la carte et estimer le trajet.
  useFocusEffect(useCallback(() => {
    let active = true;
    getCurrentPosition().then((p) => { if (active && p) setMyPos(p); });
    return () => { active = false; };
  }, []));

  // Distance et durée réelles jusqu'au restaurant.
  useEffect(() => {
    const dest = order?.restaurant;
    if (!myPos || dest?.latitude == null || dest?.longitude == null) return;
    let active = true;
    getRoute(myPos, { latitude: dest.latitude, longitude: dest.longitude })
      .then((r) => { if (active) setTrip(r); })
      .catch(() => {});
    return () => { active = false; };
  }, [myPos, order?.restaurant?.latitude, order?.restaurant?.longitude]);

  const itemsSummary = order?.items?.map(i => `${i.name} x${i.quantity}`).join(', ') ?? '';

  return (
    <SafeAreaView style={styles.container}>
      {/* TopAppBar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashboardEnLigne'))}
            style={styles.backBtn}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.stepLabel}>EN ROUTE</Text>
        </View>
        <LivreurAvatar size={40} />
      </View>

      {/* Header info */}
      <View style={styles.headerInfo}>
        <View style={styles.headerInfoContent}>
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName}>{order?.restaurant?.name ?? '…'}</Text>
          </View>
          <View style={styles.stepBadge}>
            <Text style={styles.stepBadgeText}>ÉTAPE 1/2 ·{'\n'}RÉCUPÉRATION</Text>
          </View>
        </View>
      </View>

      {/* Carte : position du livreur → restaurant */}
      <View style={styles.mapArea}>
        <StaticMap
          latitude={myPos?.latitude ?? order?.restaurant?.latitude}
          longitude={myPos?.longitude ?? order?.restaurant?.longitude}
          toLatitude={myPos ? order?.restaurant?.latitude : undefined}
          toLongitude={myPos ? order?.restaurant?.longitude : undefined}
          label={order?.restaurant?.address ?? 'Navigation en cours'}
        />
        {trip && (
          <View style={styles.tripBadge}>
            <Text style={styles.tripBadgeText}>
              {trip.distanceKm} km · {trip.durationMin} min
              {trip.estimated ? ' (estimé)' : ''}
            </Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.greenLight} style={{ marginVertical: 24 }} />
      ) : (
      <>
      {/* Info card */}
      <View style={styles.infoCard}>
        {/* Restaurant header */}
        <View style={styles.infoCardHeader}>
          <View style={styles.restaurantLogo}>
            <View style={styles.restaurantLogoBg}>
              <Text style={styles.restaurantLogoEmoji}>🍽️</Text>
            </View>
            <View style={styles.restaurantLogoInfo}>
              <Text style={styles.restaurantLogoName}>{order?.restaurant?.name ?? '—'}</Text>
              <Text style={styles.restaurantLogoSub}>{order?.restaurant?.address ?? ''}</Text>
            </View>
          </View>
          <Text style={styles.itemCount}>{order?.items?.length ?? 0} Items</Text>
        </View>

        {/* Order details */}
        <View style={styles.orderDetails}>
          <View style={styles.orderItem}>
            <View style={styles.orderItemIcon}>
              <Text>🍛</Text>
            </View>
            <Text style={styles.orderItemText}>{itemsSummary}</Text>
          </View>
          {order?.notes ? (
            <View style={styles.orderNote}>
              <Text style={styles.orderNoteIcon}>⚠️</Text>
              <Text style={styles.orderNoteText}>{order.notes}</Text>
            </View>
          ) : null}
        </View>
      </View>

      {/* Secondary actions */}
      <View style={styles.secondaryActions}>
        <TouchableOpacity style={styles.contactBtn} onPress={() => navigation.navigate('Aide')}>
          <Text style={styles.contactBtnText}>📞 Contacter</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('ProblemePickup')}>
          <Text style={styles.reportBtnText}>⚠️ Signaler</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom action */}
      <LinearGradient
        colors={['transparent', Colors.nearBlack]}
        style={styles.bottomArea}
      >
        <TouchableOpacity
          style={styles.arrivedBtn}
          onPress={() => navigation.replace('PickupConfirme', { deliveryId, orderId })}
          activeOpacity={0.85}
        >
          <View style={styles.arrivedBtnShadow} />
          <Text style={styles.arrivedBtnText}>JE SUIS ARRIVÉ AU{'\n'}RESTAURANT</Text>
          <View style={styles.arrivedBtnIcon}>
            <Text style={{ color: 'rgb(67,44,0)', fontSize: 18 }}>→</Text>
          </View>
        </TouchableOpacity>
      </LinearGradient>
      </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nearBlack,
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
    borderRadius: 9999,
    justifyContent: 'center',
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
  stepLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  avatarBorder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreenTint,
  },
  headerInfo: {
    backgroundColor: Colors.darkSurface,
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerInfoContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  restaurantInfo: {},
  restaurantName: {
    fontSize: 30,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 36,
  },
  stepBadge: {
    backgroundColor: Colors.goldLight,
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
    lineHeight: 16,
  },
  tripBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    borderRadius: 9999,
    backgroundColor: 'rgba(0,18,7,0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tripBadgeText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  mapArea: {
    flex: 1,
    overflow: 'hidden',
    minHeight: 120,
    backgroundColor: 'rgba(0,18,7,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapPlaceholder: {
    alignItems: 'center',
    gap: 8,
  },
  mapEmoji: {
    fontSize: 48,
    opacity: 0.3,
  },
  mapLabel: {
    fontSize: 14,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  mapSublabel: {
    fontSize: 12,
    color: Colors.muted,
    opacity: 0.4,
  },
  infoCard: {
    marginHorizontal: 24,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    padding: 20,
    gap: 16,
    shadowColor: Colors.white,
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  restaurantLogo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  restaurantLogoBg: {
    width: 56,
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.nearBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantLogoEmoji: {
    fontSize: 28,
  },
  restaurantLogoInfo: {
    gap: 4,
  },
  restaurantLogoName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  restaurantLogoSub: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  itemCount: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  orderDetails: {
    borderRadius: Radii.md,
    backgroundColor: Colors.nearBlack,
    padding: 16,
    gap: 12,
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  orderItemIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  orderItemText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 26,
  },
  orderNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  orderNoteIcon: {
    fontSize: 18,
  },
  orderNoteText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 16,
    marginHorizontal: 24,
    marginTop: 16,
  },
  contactBtn: {
    flex: 1,
    height: 64,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.greenLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contactBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  reportBtn: {
    flex: 1,
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(255,218,214)',
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
  },
  arrivedBtn: {
    height: 80,
    borderRadius: Radii.xl,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    overflow: 'hidden',
  },
  arrivedBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.08,
  },
  arrivedBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 28,
  },
  arrivedBtnIcon: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

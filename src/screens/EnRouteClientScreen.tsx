import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Radii } from '../constants/theme';
import LivreurAvatar from '../components/LivreurAvatar';
import StaticMap from '../components/StaticMap';
import { getOrder } from '../api/orders';
import { getRoute, GeoRoute } from '../api/location';
import { getCurrentPosition, watchPositionLocally } from '../services/locationTracking';
import { Alert } from '../components/AppAlert';

type OrderDetail = {
  customer: { name: string | null; phone: string } | null;
  deliveryAddress: { line: string; latitude?: number; longitude?: number };
  items: unknown[];
};

/** Recalcul de l'itinéraire au plus une fois toutes les 15 s : le GPS peut
 *  remonter une position toutes les quelques secondes, mais Mapbox facture à
 *  la requête et un tracé ne visiblement change pas plus vite que ça. */
const ROUTE_REFRESH_MS = 15_000;
/** Le client est considéré atteint sous ce seuil — le bouton "Arrivé" reste
 *  disponible avant, c'est une aide visuelle, pas un verrou. */
const ARRIVED_THRESHOLD_KM = 0.05;

export default function EnRouteClientScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId, orderId } = route.params ?? {};
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [myPos, setMyPos] = useState<{ latitude: number; longitude: number } | null>(null);
  const [trip, setTrip] = useState<GeoRoute | null>(null);
  const lastRouteAt = useRef(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!orderId) { setLoading(false); return; }
    getOrder(orderId)
      .then((o: any) => { if (active) setOrder(o); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]));

  // Position du livreur, suivie en continu tant que cet écran est affiché :
  // c'est ce qui fait "bouger" la carte et avancer le tracé au fil du trajet.
  // Un premier relevé ponctuel évite d'attendre le premier watch pour cadrer
  // la carte à l'ouverture de l'écran.
  useFocusEffect(useCallback(() => {
    let active = true;
    getCurrentPosition().then((p) => { if (active && p) setMyPos(p); });
    const stop = watchPositionLocally((p) => { if (active) setMyPos(p); });
    return () => { active = false; stop(); };
  }, []));

  // Distance et durée réelles jusqu'au client (Mapbox Directions), recalculées
  // à mesure que le livreur avance — sans dépasser ROUTE_REFRESH_MS.
  useEffect(() => {
    const dest = order?.deliveryAddress;
    if (!myPos || dest?.latitude == null || dest?.longitude == null) return;
    const now = Date.now();
    if (now - lastRouteAt.current < ROUTE_REFRESH_MS) return;
    lastRouteAt.current = now;
    let active = true;
    getRoute(myPos, { latitude: dest.latitude, longitude: dest.longitude })
      .then((r) => { if (active) setTrip(r); })
      .catch(() => {});
    return () => { active = false; };
  }, [myPos, order?.deliveryAddress?.latitude, order?.deliveryAddress?.longitude]);

  const arrived = trip != null && !trip.estimated && trip.distanceKm <= ARRIVED_THRESHOLD_KM;

  const callClient = () => {
    const phone = order?.customer?.phone;
    if (!phone) {
      Alert.alert('Appel impossible', "Le numéro du client n'est pas disponible.");
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Appel impossible', "Le numéro du client n'est pas disponible.");
    });
  };

  return (
    <View style={styles.container}>
      {/* Carte plein écran : fond de tout l'écran, le reste flotte par-dessus. */}
      <View style={styles.mapFull}>
        <StaticMap
          latitude={myPos?.latitude ?? order?.deliveryAddress?.latitude}
          longitude={myPos?.longitude ?? order?.deliveryAddress?.longitude}
          toLatitude={myPos ? order?.deliveryAddress?.latitude : undefined}
          toLongitude={myPos ? order?.deliveryAddress?.longitude : undefined}
          polyline={trip?.geometry}
          label="Navigation vers le client"
        />
      </View>

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        {/* TopAppBar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashboardEnLigne'))} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>

          <View style={styles.topBarCenter}>
            <Text style={styles.topBarAddress} numberOfLines={1}>{order?.deliveryAddress?.line ?? '…'}</Text>
            <View style={styles.stepIndicator}>
              <View style={styles.stepIndicatorDot} />
              <Text style={styles.stepIndicatorText}>ÉTAPE 2/2 · LIVRAISON</Text>
            </View>
          </View>

          <LivreurAvatar size={40} />
        </View>

        {trip && (
          <View style={styles.tripBadge} pointerEvents="none">
            <Text style={styles.tripBadgeText}>
              {trip.distanceKm} km · {trip.durationMin} min
              {trip.estimated ? ' (estimé)' : ''}
            </Text>
          </View>
        )}

        <View style={styles.spacer} />

        {loading ? (
          <ActivityIndicator color={Colors.greenLight} style={{ marginVertical: 24 }} />
        ) : (
        <>
        {/* Panneau client, flottant en bas de la carte */}
        <View style={styles.contentArea}>
          <View style={styles.clientCard}>
            <View style={styles.clientInfoRow}>
              <View style={styles.clientInfoLeft}>
                <View style={styles.clientAvatar}>
                  <Text style={{ fontSize: 24 }}>👤</Text>
                </View>
                <View style={styles.clientTextInfo}>
                  <Text style={styles.clientName}>{order?.customer?.name ?? 'Client'}</Text>
                  <Text style={styles.clientAddress} numberOfLines={1}>{order?.deliveryAddress?.line ?? ''}</Text>
                </View>
              </View>
              <View style={styles.orderTag}>
                <Text style={styles.orderTagText}>{order?.items?.length ?? 0} items</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.callBtn}
              onPress={callClient}
              activeOpacity={0.8}
            >
              <View style={styles.callBtnIconWrap}>
                <Text style={styles.callBtnIcon}>📞</Text>
              </View>
              <Text style={styles.callBtnText}>Appeler le client</Text>
            </TouchableOpacity>
          </View>

          {/* Bento detail grid — valeurs réelles de Mapbox Directions, mises
              à jour au fil du trajet. Tirets tant qu'aucun trajet n'a encore
              été calculé (position ou destination pas encore connues). */}
          <View style={styles.bentoGrid}>
            <View style={[styles.bentoCard, styles.bentoCardLeft]}>
              <Text style={styles.bentoCardLabel}>DISTANCE RESTANTE</Text>
              <Text style={styles.bentoCardValue}>{trip ? `${trip.distanceKm} km` : '—'}</Text>
            </View>
            <View style={styles.bentoCard}>
              <Text style={styles.bentoCardLabel}>TEMPS ESTIMÉ</Text>
              <Text style={styles.bentoCardValue}>{trip ? `${trip.durationMin} min` : '—'}</Text>
            </View>
          </View>
        </View>

        {/* Bottom action */}
        <LinearGradient
          colors={['transparent', Colors.nearBlack]}
          style={styles.bottomArea}
        >
          <TouchableOpacity
            style={[styles.arrivedBtn, arrived && styles.arrivedBtnHighlight]}
            onPress={() => navigation.replace('AttenteClient', { deliveryId, orderId })}
            activeOpacity={0.85}
          >
            <Text style={styles.arrivedBtnText}>JE SUIS ARRIVÉ</Text>
            <Text style={{ color: Colors.cream, fontSize: 20 }}>📍</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deliveredBtn}
            onPress={() => navigation.replace('CodeConfirmationLivraison', { orderId })}
            activeOpacity={0.85}
          >
            <Text style={styles.deliveredBtnText}>Marquer comme livré</Text>
            <Text style={{ color: 'rgb(67,44,0)', fontSize: 18 }}>✓</Text>
          </TouchableOpacity>
        </LinearGradient>
        </>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.nearBlack,
  },
  /** Carte : fond plein écran, sous tout le reste. */
  mapFull: {
    ...StyleSheet.absoluteFillObject,
  },
  /** Chrome (top bar, panneau client, actions) : flotte par-dessus la carte.
      `box-none` laisse les gestes de la carte (pan/zoom natif à venir) passer
      à travers les zones vides, sans bloquer le tactile hors des contrôles. */
  overlay: {
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  topBar: {
    height: 80,
    backgroundColor: 'rgba(0,18,7,0.72)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
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
    borderRadius: 1,
  },
  topBarCenter: {
    flex: 1,
    marginHorizontal: 12,
    gap: 4,
  },
  topBarAddress: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: Colors.successDark,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  stepIndicatorDot: {
    width: 7,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.successDark,
  },
  stepIndicatorText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
  },
  avatarBorder: {
    width: 37,
    height: 40,
    borderRadius: 9999,
    borderWidth: 2,
    borderColor: Colors.gold,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 30,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.darkGreenTint,
  },
  tripBadge: {
    alignSelf: 'center',
    marginTop: 12,
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
  contentArea: {
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    backgroundColor: Colors.nearBlack,
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 16,
    gap: 16,
    // Détache visuellement le panneau de la carte qui défile derrière.
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  clientCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.darkGreen,
    borderWidth: 1,
    borderColor: Colors.goldLight,
    padding: 20,
    gap: 16,
  },
  clientInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clientInfoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clientAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientTextInfo: {
    gap: 4,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  clientAddress: {
    fontSize: 13,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  orderTag: {
    borderRadius: Radii.sm,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  orderTagText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  addressBlock: {
    borderRadius: Radii.md,
    backgroundColor: 'rgb(36,57,44)',
    padding: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addressIcon: {
    fontSize: 16,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  callBtn: {
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    borderWidth: 1,
    borderColor: Colors.greenMid,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  callBtnIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(169,208,182,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnIcon: {
    fontSize: 18,
  },
  callBtnText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  callBtnSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  bentoGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  bentoCard: {
    flex: 1,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkSurface,
    padding: 16,
    gap: 8,
  },
  bentoCardLeft: {
    borderWidth: 1,
    borderColor: Colors.greenMid,
  },
  bentoCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  bentoCardValue: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    paddingTop: 16,
    gap: 12,
  },
  arrivedBtn: {
    height: 72,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    borderWidth: 2,
    borderColor: Colors.greenMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  /** Le trajet mesuré place le livreur tout près du client : on met le
      bouton en avant plutôt que d'attendre qu'il le cherche dans la liste. */
  arrivedBtnHighlight: {
    borderColor: Colors.goldLight,
    backgroundColor: Colors.successDark,
  },
  arrivedBtnText: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  deliveredBtn: {
    height: 60,
    borderRadius: Radii.xl,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  deliveredBtnText: {
    fontSize: 17,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
});

import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, ActivityIndicator, Vibration,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import StaticMap from '../components/StaticMap';
import { me } from '../api/auth';
import { getDelivery, assignDelivery, DeliveryDetail, MAX_ACTIVE_DELIVERIES } from '../api/deliveries';
import { ignoreDelivery } from '../api/ignoredDeliveries';
import { subscribeCourierFeed } from '../api/realtime';
import { getSettings } from '../api/settings';
import { ApiError } from '../api/client';
import { useCourse } from '../context/CourseContext';
import { Alert } from '../components/AppAlert';

const fmt = (n: number) => n.toLocaleString('fr-FR');

/**
 * Durée d'affichage de l'alerte. Elle n'existe que côté app : le serveur
 * n'expire pas une course proposée, on referme simplement l'écran pour ne pas
 * laisser une carte périmée devant le livreur.
 */
const ALERT_SECONDS = 30;

type AlerteParams = {
  deliveryId: string;
  orderId: string;
  earnings: number;
  distanceKm?: number;
};

/**
 * Le détail d'une course (GET /deliveries/:id) embarque les modèles complets
 * du restaurant et de l'adresse, donc leurs coordonnées, même si le type
 * partagé ne les déclare pas. On les lit ici pour cadrer la carte, en les
 * traitant comme facultatives : sans elles, on garde le visuel de repli.
 */
type DeliveryWithCoords = DeliveryDetail & {
  order: {
    restaurant: { latitude?: number | null; longitude?: number | null };
    deliveryAddress: { latitude?: number | null; longitude?: number | null };
  };
};

export default function AlerteCourseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const params = (route.params ?? null) as AlerteParams | null;
  const deliveryId = params?.deliveryId ?? '';
  const orderId = params?.orderId ?? '';

  const { atCapacity, refresh, selectCourse } = useCourse();
  const [detail, setDetail] = useState<DeliveryWithCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'accept' | 'refuse' | null>(null);
  const [countdown, setCountdown] = useState(ALERT_SECONDS);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  // Une fois qu'on a quitté l'écran (acceptation, refus, course prise), le
  // compte à rebours ne doit plus déclencher un second retour.
  const done = useRef(false);

  const leave = useCallback(() => {
    if (done.current) return;
    done.current = true;
    if (navigation.canGoBack()) navigation.goBack();
    else navigation.replace('DashboardEnLigne');
  }, [navigation]);

  // Écran ouvert sans identifiants (ancien appelant) : rien à proposer.
  useEffect(() => {
    if (!deliveryId || !orderId) leave();
  }, [deliveryId, orderId, leave]);

  // Chargement du détail : c'est lui qui fait foi pour les adresses et le
  // montant, l'événement temps réel ne portant qu'un résumé.
  useEffect(() => {
    if (!deliveryId) return;
    let alive = true;
    (async () => {
      try {
        const d = (await getDelivery(deliveryId)) as DeliveryWithCoords;
        if (alive) setDetail(d);
      } catch (e: any) {
        if (alive) setLoadError(e?.message ?? 'Impossible de charger cette course.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [deliveryId]);

  // Vibration à l'ouverture, selon les préférences du compte. Si elles sont
  // injoignables, on vibre quand même : rater une course coûte plus cher
  // qu'une vibration de trop.
  useEffect(() => {
    let alive = true;
    (async () => {
      let wanted = true;
      try {
        const s = await getSettings();
        wanted = Boolean(s.vibrationEnabled || s.soundEnabled);
      } catch {
        // préférences indisponibles : on garde le comportement par défaut
      }
      if (alive && wanted) Vibration.vibrate([0, 400, 200, 400]);
    })();
    return () => { alive = false; };
  }, []);

  // Compte à rebours réel : à zéro, retour au tableau de bord sans rien
  // signaler au serveur (il n'y a pas d'expiration côté serveur).
  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (countdown === 0 && !busy) leave();
  }, [countdown, busy, leave]);

  // Si un autre livreur prend la course pendant que l'alerte est affichée,
  // on le dit tout de suite plutôt que de laisser le bouton Accepter
  // échouer en 409.
  useEffect(() => {
    if (!deliveryId) return;
    const unsubscribe = subscribeCourierFeed({
      onDeliveryTaken: (evt) => {
        if (evt?.deliveryId !== deliveryId || done.current) return;
        Alert.alert('Course prise', 'Cette course vient d\'être prise par un autre livreur.', [
          { text: 'Compris', onPress: leave },
        ]);
      },
    });
    return unsubscribe;
  }, [deliveryId, leave]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulseAnim]);

  const handleAccept = async () => {
    if (busy || atCapacity || !deliveryId) return;
    setBusy('accept');
    try {
      const user = await me();
      await assignDelivery(deliveryId, user.id);
      selectCourse(deliveryId);
      await refresh();
      done.current = true;
      navigation.replace('EnRoutePickup', { deliveryId, orderId });
    } catch (e: any) {
      // 409 : un autre livreur a été plus rapide. Le message du serveur le
      // dit clairement ; on l'affiche puis on referme l'alerte.
      const taken = e instanceof ApiError && e.status === 409;
      Alert.alert(
        taken ? 'Course prise' : 'Acceptation impossible',
        e?.message ?? "Cette course n'est plus disponible.",
        [{ text: 'Compris', onPress: taken ? leave : undefined }],
      );
    } finally {
      setBusy(null);
    }
  };

  const handleRefuse = async () => {
    if (busy || !deliveryId) return;
    setBusy('refuse');
    // Refus purement local : la course reste disponible pour les autres,
    // elle est seulement masquée de la liste de CE livreur.
    await ignoreDelivery(deliveryId).catch(() => {});
    setBusy(null);
    leave();
  };

  const restaurant = detail?.order.restaurant;
  const address = detail?.order.deliveryAddress;
  const fee = detail?.order.deliveryFee ?? params?.earnings ?? null;
  const distanceKm = params?.distanceKm;
  const hasCoords =
    restaurant?.latitude != null && restaurant?.longitude != null
    && address?.latitude != null && address?.longitude != null;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MalawLogo size={40} />
        </View>
        <LivreurAvatar size={40} />
      </View>

      <View style={styles.mapBg}>
        {/* Carte réelle entre le restaurant et le client dès que les
            coordonnées sont connues ; sinon le visuel de repli du composant. */}
        <StaticMap
          latitude={hasCoords ? restaurant!.latitude : null}
          longitude={hasCoords ? restaurant!.longitude : null}
          toLatitude={hasCoords ? address!.latitude : null}
          toLongitude={hasCoords ? address!.longitude : null}
          label="Dakar, Sénégal"
          style={styles.map}
        />

        {/* Dark overlay */}
        <View style={styles.mapOverlay} pointerEvents="none" />

        {/* Alert card */}
        <View style={styles.alertCard}>
          {/* Countdown top right */}
          <View style={styles.countdownContainer}>
            <View style={styles.countdownCircle}>
              <Text style={styles.countdownText}>{countdown}s</Text>
            </View>
          </View>

          {/* Flashing badge */}
          <Animated.View style={[styles.flashingBadge, { transform: [{ scale: pulseAnim }] }]}>
            <View style={styles.badgeDot} />
            <Text style={styles.badgeText}>NOUVELLE COURSE DISPONIBLE</Text>
          </Animated.View>

          {/* Frais de livraison — 100 % reversés au livreur */}
          <View style={styles.earningsBlock}>
            <Text style={styles.earningsLabel}>Frais de livraison</Text>
            <View style={styles.earningsRow}>
              {fee != null ? (
                <>
                  <Text style={styles.earningsValue}>{fmt(fee)}</Text>
                  <Text style={styles.earningsCurrency}> FCFA</Text>
                </>
              ) : (
                <Text style={styles.earningsValue}>—</Text>
              )}
            </View>
          </View>

          {/* Distance : seulement si le serveur l'a calculée (position du
              livreur connue). Aucun temps estimé : le serveur n'en fournit pas. */}
          {distanceKm != null ? (
            <View style={styles.tripBento}>
              <View style={styles.tripBentoCard}>
                <Text style={styles.tripBentoLabel}>DISTANCE</Text>
                <Text style={styles.tripBentoValue}>{distanceKm} km</Text>
              </View>
            </View>
          ) : null}

          {/* Route path */}
          {loading ? (
            <ActivityIndicator color={Colors.darkGreen} style={{ marginVertical: 8 }} />
          ) : loadError ? (
            <Text style={styles.loadError}>{loadError}</Text>
          ) : (
            <View style={styles.routePath}>
              <View style={styles.routePathLine} />
              <View style={styles.routeStop}>
                <View style={styles.routeStopDot} />
                <View style={styles.routeStopInfo}>
                  <Text style={styles.routeStopLabel}>RETRAIT</Text>
                  <Text style={styles.routeStopName} numberOfLines={1}>{restaurant?.name ?? '—'}</Text>
                  {restaurant?.address ? (
                    <Text style={styles.routeStopSub} numberOfLines={1}>{restaurant.address}</Text>
                  ) : null}
                </View>
              </View>
              <View style={styles.routeStop}>
                <View style={[styles.routeStopDot, styles.routeStopDotDest]} />
                <View style={styles.routeStopInfo}>
                  <Text style={styles.routeStopLabel}>LIVRAISON</Text>
                  <Text style={styles.routeStopName} numberOfLines={2}>{address?.line ?? '—'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Actions */}
          <View style={styles.actionButtons}>
            {atCapacity ? (
              // Lecture seule : le serveur refuserait de toute façon une
              // quatrième course. On le dit au lieu de laisser échouer.
              <View style={styles.capacityBox}>
                <Text style={styles.capacityText}>
                  Vous portez déjà {MAX_ACTIVE_DELIVERIES} courses. Terminez-en une pour en accepter d'autres.
                </Text>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.acceptBtn, (busy != null || loading) && { opacity: 0.7 }]}
                onPress={handleAccept}
                disabled={busy != null || loading}
                activeOpacity={0.85}
              >
                {busy === 'accept' ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={styles.acceptBtnText}>✓  Accepter la course</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.refuseBtn, busy != null && { opacity: 0.7 }]}
              onPress={atCapacity ? leave : handleRefuse}
              disabled={busy != null}
              activeOpacity={0.85}
            >
              {busy === 'refuse' ? (
                <ActivityIndicator color={Colors.error} />
              ) : (
                <Text style={styles.refuseBtnText}>{atCapacity ? 'Fermer' : '✕  Refuser'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <BottomNavBar active="accueil" homeScreen="DashboardEnLigne" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepBlack,
  },
  header: {
    height: 80,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  mapBg: {
    flex: 1,
    position: 'relative',
  },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  mapOverlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.nearBlack,
    opacity: 0.55,
  },
  alertCard: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    borderRadius: 28,
    backgroundColor: Colors.cream,
    padding: 24,
    gap: 16,
  },
  countdownContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
  },
  countdownCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: 'rgba(192,57,43,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.cream,
  },
  countdownText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
  },
  flashingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.successDark,
    borderRadius: 9999,
    paddingHorizontal: 16,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  badgeDot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: Colors.white,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  earningsBlock: {
    gap: 4,
  },
  earningsLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  earningsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  earningsValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  earningsCurrency: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 4,
  },
  tripBento: {
    flexDirection: 'row',
    gap: 12,
  },
  tripBentoCard: {
    flex: 1,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    padding: 12,
    gap: 4,
  },
  tripBentoLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  tripBentoValue: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  loadError: {
    fontSize: 13,
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  routePath: {
    gap: 12,
    position: 'relative',
    paddingLeft: 16,
  },
  routePathLine: {
    position: 'absolute',
    left: 5,
    top: 18,
    bottom: 18,
    width: 2,
    backgroundColor: Colors.darkGreen,
    opacity: 0.2,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  routeStopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.darkGreen,
  },
  routeStopDotDest: {
    borderWidth: 2,
    borderColor: Colors.darkGreen,
    backgroundColor: 'transparent',
  },
  routeStopInfo: {
    flex: 1,
    gap: 2,
  },
  routeStopLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  routeStopName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  routeStopSub: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  actionButtons: {
    gap: 12,
  },
  capacityBox: {
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(26,61,43,0.08)',
    padding: 14,
  },
  capacityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  acceptBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.successDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  refuseBtn: {
    height: 64,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: Colors.error,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refuseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
  },
});

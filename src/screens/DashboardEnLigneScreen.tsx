import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, Radii } from '../constants/theme';
import BottomNavBar from '../components/BottomNavBar';
import MalawLogo from '../components/MalawLogo';
import LivreurAvatar from '../components/LivreurAvatar';
import { me } from '../api/auth';
import { listAvailableDeliveries, setAvailability, getActiveDeliveries, assignDelivery, AvailableDelivery, ActiveDelivery, MAX_ACTIVE_DELIVERIES } from '../api/deliveries';
import { getEarnings, getProfile, Earnings, CourierProfile } from '../api/couriers';
import { getIgnoredIds, ignoreDelivery, pruneIgnored } from '../api/ignoredDeliveries';
import { Alert } from '../components/AppAlert';
import {
  getCurrentPosition,
  hasLocationPermission,
  requestLocationPermission,
  startTracking,
  stopTracking,
} from '../services/locationTracking';

const { width } = Dimensions.get('window');
const fmt = (n: number) => n.toLocaleString('fr-FR');

export default function DashboardEnLigneScreen() {
  const navigation = useNavigation<any>();
  const [status, setStatus] = useState<'online' | 'offline'>('online');
  const [courierName, setCourierName] = useState('');
  const [courierId, setCourierId] = useState('');
  const [deliveries, setDeliveries] = useState<AvailableDelivery[]>([]);
  const [activeDeliveries, setActiveDeliveries] = useState<ActiveDelivery[]>([]);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [profile, setProfile] = useState<CourierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [user, active, items, earn, prof] = await Promise.all([
        me(),
        getActiveDeliveries().catch(() => []),
        listAvailableDeliveries().catch(() => []),
        getEarnings().catch(() => null),
        getProfile().catch(() => null),
      ]);
      setCourierName(user?.name ?? user?.phone ?? '');
      setCourierId(user?.id ?? '');
      // Les courses en cours (0 à 3) sont affichées en bannière "Reprendre" —
      // le livreur consulte librement le dashboard tout en ayant des
      // livraisons actives.
      setActiveDeliveries(active);
      // Masque les courses que CE livreur a ignorées (choix local persistant)
      // et purge de la liste ignorée celles qui ne sont plus disponibles.
      const ignored = await getIgnoredIds();
      await pruneIgnored(items.map((d) => d.id));
      setDeliveries(items.filter((d) => !ignored.includes(d.id)));
      setEarnings(earn);
      setProfile(prof);
      // Statut réel depuis le serveur (source de vérité) : à chaque retour
      // sur le dashboard, ACTIF/INACTIF reflète la vraie disponibilité.
      if (prof) setStatus(prof.courierAvailable ? 'online' : 'offline');
    } catch (e: any) {
      // Hors-ligne ou session expirée : le dashboard reste utilisable,
      // affiche juste une liste vide.
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  /**
   * Pilote le suivi de position.
   *  - hors ligne          → aucun suivi
   *  - en ligne, sans course → un point toutes les 5 min (dispatch par zone)
   *  - course(s) en cours    → un point toutes les 60 s, poussé au client
   * Le service ne redémarre rien si le mode n'a pas changé.
   */
  useEffect(() => {
    if (status !== 'online') {
      stopTracking();
      return;
    }
    let cancelled = false;
    (async () => {
      if (!(await hasLocationPermission())) return;
      if (cancelled) return;
      if (activeDeliveries.length > 0) {
        startTracking('delivering', activeDeliveries.map((d) => d.id));
      } else {
        startTracking('online');
      }
    })();
    return () => { cancelled = true; };
  }, [status, activeDeliveries]);

  // Le suivi ne doit pas survivre à la fermeture de l'app.
  useEffect(() => stopTracking, []);

  const toggleStatus = async (next: 'online' | 'offline') => {
    // INACTIF n'est confirmé qu'APRÈS validation de la pause : on ne change ni
    // l'état local ni le serveur ici, on ouvre juste l'écran Pause. ACTIF reste
    // donc en évidence tant que la pause n'est pas validée. Si l'utilisateur
    // revient sans valider, rien n'a changé.
    if (next === 'offline') {
      // Impossible de se mettre en pause avec une course en cours : il faut
      // d'abord la terminer ou l'annuler.
      if (activeDeliveries.length > 0) {
        Alert.alert(
          'Course en cours',
          'Vous avez une course en cours. Terminez-la ou annulez-la avant de vous mettre hors ligne.',
          [{ text: 'Compris' }],
        );
        return;
      }
      navigation.navigate('Pause');
      return;
    }
    // ACTIF : remise en ligne immédiate.
    setStatus('online');
    try {
      // La position accompagne le passage en ligne : le serveur sait
      // immédiatement dans quelle zone se trouve le livreur, sans attendre
      // le premier ping périodique.
      const granted = await ensureLocationPermission();
      const pos = granted ? await getCurrentPosition() : null;
      await setAvailability(true, pos ?? undefined);
    } catch {
      Alert.alert('Disponibilité', "Impossible de mettre à jour votre statut pour le moment.");
    }
  };

  /**
   * Demande la permission de localisation en expliquant d'abord pourquoi.
   * Une invite système sans contexte se solde souvent par un refus définitif.
   */
  const ensureLocationPermission = async (): Promise<boolean> => {
    if (await hasLocationPermission()) return true;
    return new Promise((resolve) => {
      Alert.alert(
        'Activer la localisation',
        "Malaw utilise votre position pendant que vous êtes en ligne pour vous proposer les courses proches et permettre au client de suivre sa livraison. Le suivi s'arrête dès que vous passez hors ligne.",
        [
          { text: 'Plus tard', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Continuer', onPress: async () => resolve(await requestLocationPermission()) },
        ],
      );
    });
  };

  const atCapacity = activeDeliveries.length >= MAX_ACTIVE_DELIVERIES;
  const nearest = deliveries[0];

  const ignoreNearest = async () => {
    if (!nearest) return;
    // Masque cette course localement pour ce livreur, puis passe à la suivante.
    setDeliveries((prev) => prev.filter((d) => d.id !== nearest.id));
    await ignoreDelivery(nearest.id).catch(() => {});
  };

  const openDelivery = (d: ActiveDelivery) => {
    navigation.navigate(
      d.status === 'IN_TRANSIT' ? 'EnRouteClient' : 'EnRoutePickup',
      { deliveryId: d.id, orderId: d.order.id },
    );
  };

  const resumeDeliveries = () => {
    if (activeDeliveries.length === 0) return;
    // Une seule course en cours → on l'ouvre directement. Plusieurs → on
    // renvoie vers "Mes livraisons" (liste des courses en cours).
    if (activeDeliveries.length === 1) {
      openDelivery(activeDeliveries[0]);
    } else {
      navigation.navigate('Historique');
    }
  };

  const acceptDelivery = async (delivery: AvailableDelivery) => {
    if (!courierId || accepting) return;
    setAccepting(true);
    try {
      await assignDelivery(delivery.id, courierId);
      navigation.navigate('EnRoutePickup', { deliveryId: delivery.id, orderId: delivery.order.id });
    } catch (e: any) {
      // Course déjà prise par un autre livreur, ou erreur réseau — on
      // rafraîchit la liste plutôt que de laisser une carte obsolète.
      Alert.alert('Course indisponible', e?.message ?? "Cette course n'est plus disponible.");
      load();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header - green rounded bottom */}
      <View style={styles.header}>
        {/* Top row */}
        <View style={styles.headerTopRow}>
          {/* Logo */}
          <View style={styles.logoArea}>
            <MalawLogo size={44} />
          </View>

          {/* User info */}
          <TouchableOpacity style={styles.userInfo} onPress={() => navigation.navigate('Profil')} activeOpacity={0.8}>
            <LivreurAvatar size={56} uri={profile?.avatarUrl} />
            <View style={styles.userTextBlock}>
              <Text style={styles.userName}>{courierName || '…'}</Text>
              <View style={styles.statusRow}>
                <View style={styles.onlineIndicator} />
                <Text style={styles.onlineBadgeText}>EN LIGNE</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* Toggle ACTIF / INACTIF — l'un des deux est toujours sélectionné. */}
        <View style={styles.toggleContainer}>
          <View style={styles.toggleTrack}>
            <TouchableOpacity
              style={[styles.toggleBtn, status === 'online' && styles.toggleBtnActive]}
              onPress={() => toggleStatus('online')}
            >
              <View style={[styles.toggleDot, { backgroundColor: Colors.success }]} />
              <Text style={[styles.toggleText, status === 'online' && styles.toggleTextActive]}>
                ACTIF
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.toggleBtn, status === 'offline' && styles.toggleBtnOffline]}
              onPress={() => toggleStatus('offline')}
            >
              <View style={[styles.toggleDot, { backgroundColor: Colors.error }]} />
              <Text style={[styles.toggleText, status === 'offline' && { color: Colors.greenMid }]}>
                INACTIF
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Bloc "Courses en cours" — imposant, en haut. Gros bouton Reprendre :
            ouvre directement s'il n'y a qu'une course, sinon la liste. */}
        {activeDeliveries.length > 0 ? (
          <View style={styles.activeBlock}>
            <View style={styles.activeBlockHeader}>
              <View style={styles.activeBlockPulse} />
              <Text style={styles.activeBlockTitle}>Courses en cours</Text>
              <View style={styles.activeBlockCount}>
                <Text style={styles.activeBlockCountText}>{activeDeliveries.length}/{MAX_ACTIVE_DELIVERIES}</Text>
              </View>
            </View>
            <Text style={styles.activeBlockSub} numberOfLines={1}>
              {activeDeliveries.length === 1
                ? (activeDeliveries[0].order?.restaurant?.name ?? 'Livraison à terminer')
                : `${activeDeliveries.length} livraisons à terminer`}
            </Text>
            <TouchableOpacity style={styles.resumeBtn} onPress={resumeDeliveries} activeOpacity={0.9}>
              <Text style={styles.resumeBtnText}>Reprendre</Text>
              <Text style={styles.resumeBtnArrow}>→</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Courses disponibles — masquées quand la limite de 3 est atteinte. */}
        {atCapacity ? (
          <View style={styles.capacityCard}>
            <Text style={styles.capacityIcon}>✅</Text>
            <Text style={styles.capacityText}>
              Vous gérez déjà {MAX_ACTIVE_DELIVERIES} courses. Terminez-en une pour en accepter d'autres.
            </Text>
          </View>
        ) : (
        <View style={styles.coursesSection}>
          <View style={styles.coursesSectionHeader}>
            <Text style={styles.coursesSectionTitle}>Courses à proximité ({deliveries.length})</Text>
            {deliveries.length > 0 ? (
              <TouchableOpacity onPress={() => navigation.navigate('CoursesDisponibles')}>
                <Text style={styles.seeAllLink}>Voir tout →</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator color={Colors.greenMid} style={{ marginVertical: 24 }} />
          ) : !nearest ? (
            <View style={styles.emptyCourses}>
              <Text style={styles.emptyCoursesText}>Aucune course disponible pour le moment.</Text>
            </View>
          ) : (
            /* Course card — première course disponible renvoyée par l'API,
               triée par distance quand la position du livreur est connue. */
            <View style={styles.courseCard}>
              {/* Route info */}
              <View style={styles.routeInfo}>
                <View style={styles.routeDot} />
                <View style={styles.routeLine} />
                <View style={styles.routeDestDot} />
              </View>
              <View style={styles.routeText}>
                <View style={styles.routeItem}>
                  <Text style={styles.routeItemLabel}>{nearest.order.restaurant.name}</Text>
                  <Text style={styles.routeItemSub}>{nearest.order.restaurant.address}</Text>
                </View>
                <View style={styles.routeItem}>
                  <Text style={styles.routeItemLabel}>{nearest.order.customer?.firstName ?? 'Client'}</Text>
                  <Text style={styles.routeItemSub}>{nearest.order.deliveryAddress.line}</Text>
                </View>
              </View>

              {/* Stats row */}
              <View style={styles.courseStats}>
                <View style={styles.courseStat}>
                  <Text style={styles.courseStatLabel}>Distance</Text>
                  <Text style={styles.courseStatValue}>
                    {nearest.distanceKm != null ? `${nearest.distanceKm} km` : '—'}
                  </Text>
                </View>
                <View style={styles.courseStatRight}>
                  <Text style={styles.courseStatLabel}>Frais de livraison</Text>
                  <Text style={styles.courseStatValueGold}>{nearest.order.deliveryFee.toLocaleString()} FCFA</Text>
                </View>
              </View>

              {/* Action buttons */}
              <View style={styles.courseActions}>
                <TouchableOpacity
                  style={styles.refuseBtn}
                  onPress={ignoreNearest}
                  disabled={accepting}
                >
                  <View style={styles.refuseDot} />
                  <Text style={styles.refuseText}>Ignorer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.acceptBtn, accepting && { opacity: 0.7 }]}
                  onPress={() => acceptDelivery(nearest)}
                  disabled={accepting}
                >
                  {accepting ? (
                    <ActivityIndicator color="rgb(19,55,37)" />
                  ) : (
                    <>
                      <View style={styles.acceptDot} />
                      <Text style={styles.acceptText}>Accepter</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
        )}

        {/* Bento grid — statistiques (gains + fiabilité) */}
        <View style={styles.bentoGrid}>
          {/* Earnings card */}
          <TouchableOpacity style={styles.earningsCard} onPress={() => navigation.navigate('Wallet')} activeOpacity={0.85}>
            <View style={styles.earningsCardShadow} />
            <View style={styles.earningsHeader}>
              <Text style={styles.earningsLabel}>Gains du jour</Text>
              <Text style={styles.eyeIcon}>👁</Text>
            </View>
            <View style={styles.earningsAmount}>
              <Text style={styles.earningsValue}>{fmt(earnings?.today.totalXof ?? 0)}</Text>
              <Text style={styles.earningsCurrency}>FCFA</Text>
            </View>
            <Text style={styles.earningsChange}>
              {(earnings?.today.count ?? 0)} course{(earnings?.today.count ?? 0) > 1 ? 's' : ''} aujourd'hui
            </Text>
          </TouchableOpacity>

          {/* Reliability card */}
          <TouchableOpacity style={styles.reliabilityCard} onPress={() => navigation.navigate('Evaluations')} activeOpacity={0.85}>
            <View style={styles.reliabilityLeft}>
              <Text style={styles.reliabilityLabel}>FIABILITÉ</Text>
              <Text style={styles.reliabilityValue}>
                {profile?.rating != null ? `⭐ ${profile.rating}` : 'Nouveau'}
              </Text>
              <Text style={styles.reliabilitySubtext}>
                {profile ? `${profile.stats.totalDeliveries} livrée${profile.stats.totalDeliveries > 1 ? 's' : ''}` : ''}
              </Text>
            </View>
            <View style={styles.reliabilityRight}>
              {/* Circular progress — taux de complétion réel */}
              <View style={styles.circleProgress}>
                <View style={styles.circleOuter} />
                <View style={styles.circleInner} />
                <Text style={styles.circleScore}>
                  {profile?.stats.completionRate != null ? profile.stats.completionRate : '—'}
                </Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

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
    backgroundColor: Colors.darkGreen,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 24,
    gap: 20,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoArea: {
    width: 62,
    height: 44,
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 18,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatarBorder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: Colors.goldLight,
    backgroundColor: 'rgb(15,36,24)',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.darkGreenTint,
  },
  userTextBlock: {
    gap: 4,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  toggleContainer: {
    alignItems: 'center',
  },
  toggleTrack: {
    width: 280,
    height: 56,
    borderRadius: 9999,
    backgroundColor: Colors.nearBlack,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
  },
  toggleBtn: {
    flex: 1,
    height: 44,
    borderRadius: 9999,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  toggleDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  toggleBtnActive: {
    backgroundColor: Colors.greenMid,
  },
  toggleBtnOffline: {
    backgroundColor: 'transparent',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  toggleTextActive: {
    color: 'rgb(19,55,37)',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 24,
  },
  bentoGrid: {
    gap: 16,
  },
  earningsCard: {
    borderRadius: Radii.xxl,
    backgroundColor: Colors.cream,
    padding: 24,
    gap: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  earningsCardShadow: {
    position: 'absolute',
    inset: 0,
    borderRadius: Radii.xxl,
    backgroundColor: Colors.white,
    opacity: 0.5,
  },
  earningsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.7,
  },
  eyeIcon: {
    fontSize: 16,
    opacity: 0.5,
  },
  earningsAmount: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  earningsValue: {
    fontSize: 40,
    fontWeight: '800',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  earningsCurrency: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    marginBottom: 4,
    opacity: 0.7,
  },
  earningsChange: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  earningsProgressTrack: {
    height: 12,
    borderRadius: 9999,
    backgroundColor: 'rgba(26,61,43,0.15)',
    overflow: 'hidden',
  },
  earningsProgressFill: {
    height: 12,
    borderRadius: 9999,
    backgroundColor: Colors.darkGreen,
  },
  reliabilityCard: {
    borderRadius: Radii.xxl,
    backgroundColor: 'rgb(25,46,34)',
    borderWidth: 1,
    borderColor: 'rgb(65,72,67)',
    padding: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reliabilityLeft: {
    gap: 4,
  },
  reliabilityLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  reliabilityValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  reliabilitySubtext: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  reliabilityRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleProgress: {
    width: 96,
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  circleOuter: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: 'rgb(10,32,20)',
  },
  circleInner: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: Colors.greenMid,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
    transform: [{ rotate: '-45deg' }],
  },
  circleScore: {
    fontSize: 24,
    fontWeight: '900',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  activeBlock: {
    backgroundColor: Colors.darkGreen,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.4)',
  },
  activeBlockHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  activeBlockPulse: {
    width: 12, height: 12, borderRadius: 6,
    backgroundColor: Colors.goldLight,
  },
  activeBlockTitle: {
    flex: 1,
    fontSize: 18,
    color: Colors.cream,
    fontFamily: Fonts.epilogue.bold,
  },
  activeBlockCount: {
    backgroundColor: 'rgba(244,189,97,0.2)',
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  activeBlockCountText: {
    fontSize: 13,
    color: Colors.goldLight,
    fontFamily: Fonts.manrope.bold,
  },
  activeBlockSub: {
    fontSize: 14,
    color: Colors.greenMid,
    fontFamily: Fonts.manrope.medium,
  },
  resumeBtn: {
    height: 56,
    borderRadius: 100,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 4,
  },
  resumeBtnText: {
    fontSize: 17,
    color: '#13351F',
    fontFamily: Fonts.epilogue.bold,
  },
  resumeBtnArrow: { fontSize: 18, color: '#13351F' },
  capacityCard: {
    backgroundColor: Colors.cardDark,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    padding: 20,
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  capacityIcon: { fontSize: 28 },
  capacityText: {
    fontSize: 14,
    color: Colors.greenMid,
    fontFamily: Fonts.manrope.medium,
    textAlign: 'center',
    lineHeight: 20,
  },
  coursesSection: {
    gap: 16,
  },
  coursesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alerteBtn: {
    borderRadius: 9999,
    backgroundColor: 'rgba(244,189,97,0.15)',
    borderWidth: 1,
    borderColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  alerteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  coursesSectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  seeAllLink: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  emptyCourses: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.nearBlack,
    borderWidth: 1,
    borderColor: 'rgb(65,72,67)',
    padding: 24,
    alignItems: 'center',
  },
  emptyCoursesText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  menuDots: {
    flexDirection: 'row',
    gap: 3,
  },
  menuDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.muted,
  },
  courseCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.nearBlack,
    borderWidth: 1,
    borderColor: Colors.goldLight,
    padding: 24,
    gap: 16,
    position: 'relative',
  },
  premiumBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: Colors.goldLight,
    borderRadius: 9999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeInfo: {
    position: 'absolute',
    left: 24,
    top: 64,
    gap: 4,
    alignItems: 'center',
  },
  routeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.goldLight,
  },
  routeLine: {
    width: 2,
    height: 40,
    backgroundColor: Colors.goldLight,
    opacity: 0.4,
  },
  routeDestDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.goldLight,
  },
  routeText: {
    paddingLeft: 32,
    gap: 20,
    marginTop: 16,
  },
  routeItem: {
    gap: 2,
  },
  routeItemLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeItemSub: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  courseStats: {
    borderTopWidth: 1,
    borderTopColor: 'rgb(65,72,67)',
    paddingTop: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  courseStat: {
    gap: 4,
  },
  courseStatRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  courseStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  courseStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  courseStatValueGold: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  courseActions: {
    flexDirection: 'row',
    gap: 16,
  },
  refuseBtn: {
    flex: 1,
    height: 64,
    borderRadius: Radii.sm,
    borderWidth: 2,
    borderColor: 'rgb(255,180,171)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  refuseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgb(255,180,171)',
  },
  refuseText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgb(255,180,171)',
    fontFamily: 'Manrope_500Medium',
  },
  acceptBtn: {
    flex: 1,
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.greenMid,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  acceptDot: {
    width: 15,
    height: 15,
    borderRadius: 8,
    backgroundColor: 'rgba(19,55,37,0.4)',
  },
  acceptText: {
    fontSize: 16,
    fontWeight: '900',
    color: 'rgb(19,55,37)',
    fontFamily: 'Manrope_500Medium',
  },
});

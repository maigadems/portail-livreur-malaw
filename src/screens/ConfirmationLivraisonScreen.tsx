import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { DeliveryDetail, getDelivery } from '../api/deliveries';
import { Earnings, getEarnings, getProfile } from '../api/couriers';
import { useCourse } from '../context/CourseContext';

const { width } = Dimensions.get('window');

const fmtXof = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

/** Durée réelle de la course, uniquement si le serveur a horodaté la remise. */
function formatDuration(createdAt?: string, deliveredAt?: string | null): string | null {
  if (!createdAt || !deliveredAt) return null;
  const ms = new Date(deliveredAt).getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} h` : `${h} h ${String(m).padStart(2, '0')}`;
}

export default function ConfirmationLivraisonScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId } = route.params ?? {};
  const { activeDeliveries, refresh } = useCourse();

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      // La course vient d'être remise : le contexte doit cesser de la compter,
      // sinon elle occupe encore un créneau et bloque la mise hors ligne.
      await refresh();
      try {
        const [d, e, p] = await Promise.all([
          deliveryId ? getDelivery(deliveryId) : Promise.resolve(null),
          // Un total du jour indisponible ne doit pas masquer la livraison
          // elle-même : on le laisse simplement de côté.
          getEarnings().catch(() => null),
          getProfile().catch(() => null),
        ]);
        if (!active) return;
        setDelivery(d);
        setEarnings(e);
        const name = p?.name?.trim();
        setFirstName(name ? name.split(/\s+/)[0] : null);
      } catch (e: any) {
        if (active) setError(e?.message ?? 'Impossible de charger le détail de la course.');
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [deliveryId, refresh]);

  // Une course restée en cours après celle-ci : l'app le taisait, le livreur
  // rentrait chez lui avec un repas à livrer.
  const remaining = activeDeliveries.filter((d) => d.id !== deliveryId);
  const duration = formatDuration(delivery?.createdAt, delivery?.deliveredAt);
  const fee = delivery?.order?.deliveryFee;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Success section */}
        <View style={styles.successSection}>
          <View style={styles.successCircle}>
            <View style={styles.successCircleShadow} />
            <Text style={styles.successIcon}>✓</Text>
          </View>
          <Text style={styles.successTitle}>Livraison effectuée !</Text>
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          {loading ? (
            <ActivityIndicator color={Colors.darkGreen} style={{ marginVertical: 16 }} />
          ) : (
            <>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              {/* Une seule donnée temporelle est connue du serveur : la
                  distance parcourue n'existe nulle part, on ne l'affiche pas. */}
              {duration ? (
                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statLabel}>DURÉE DE LA COURSE</Text>
                    <Text style={styles.statValue}>{duration}</Text>
                  </View>
                </View>
              ) : null}

              {typeof fee === 'number' ? (
                <View style={styles.earningsDisplay}>
                  <Text style={styles.earningsLabel}>Gains de cette course</Text>
                  <Text style={styles.earningsValue}>{fmtXof(fee)}</Text>
                </View>
              ) : null}

              {earnings ? (
                <TouchableOpacity
                  style={styles.dailyTotal}
                  onPress={() => navigation.navigate('Wallet')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.dailyTotalText}>
                    Total aujourd'hui : {fmtXof(earnings.today.totalXof)} →
                  </Text>
                </TouchableOpacity>
              ) : null}

              {deliveryId ? (
                <TouchableOpacity
                  style={styles.receiptBtn}
                  onPress={() => navigation.navigate('RecuCourse', { deliveryId })}
                  activeOpacity={0.8}
                >
                  <Text style={styles.receiptBtnText}>Voir le reçu de cette course</Text>
                </TouchableOpacity>
              ) : null}
            </>
          )}
        </View>

        {/* Suite du service */}
        <View style={styles.actionArea}>
          {remaining.length > 0 ? (
            <>
              <View style={styles.remainingBanner}>
                <Text style={styles.remainingText}>
                  Il vous reste {remaining.length} course{remaining.length > 1 ? 's' : ''} à livrer.
                </Text>
              </View>
              <TouchableOpacity
                style={styles.returnBtn}
                onPress={() => navigation.replace('MesCourses')}
                activeOpacity={0.85}
              >
                <View style={styles.returnBtnShadow} />
                <Text style={styles.returnBtnText}>Passer à la course suivante</Text>
                <Text style={{ color: Colors.white, fontSize: 16 }}>→</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.replace('DashboardEnLigne')}
              >
                <Text style={styles.secondaryBtnText}>Retour au tableau de bord</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.returnBtn}
              onPress={() => navigation.replace('DashboardEnLigne')}
              activeOpacity={0.85}
            >
              <View style={styles.returnBtnShadow} />
              <Text style={styles.returnBtnText}>Retour au tableau de bord</Text>
              <Text style={{ color: Colors.white, fontSize: 16 }}>→</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.feedbackSection}>
          <Text style={styles.feedbackText}>
            Merci{firstName ? `, ${firstName}` : ''}. Si le client vous laisse une note,
            elle apparaîtra dans vos évaluations.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 68,
    paddingBottom: 48,
    gap: 32,
    alignItems: 'center',
  },
  successSection: {
    alignItems: 'center',
    gap: 16,
  },
  successCircle: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  successCircleShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  successIcon: {
    fontSize: 48,
    color: Colors.cream,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  summaryCard: {
    width: width - 48,
    borderRadius: Radii.lg,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.darkGreen,
    padding: 24,
    gap: 20,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.error,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.darkGreen,
    paddingBottom: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  earningsDisplay: {
    alignItems: 'center',
    gap: 8,
  },
  earningsLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.6,
  },
  earningsValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
  },
  dailyTotal: {
    borderRadius: 9999,
    backgroundColor: Colors.cream,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  dailyTotalText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
  },
  receiptBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  receiptBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.gold,
    fontFamily: 'Manrope_500Medium',
    textDecorationLine: 'underline',
  },
  actionArea: {
    width: width - 48,
    gap: 10,
  },
  remainingBanner: {
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(200,150,62,0.12)',
    borderWidth: 1,
    borderColor: Colors.gold,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  remainingText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  returnBtn: {
    height: 64,
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkGreen,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  returnBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.06,
  },
  returnBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
  },
  secondaryBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.8,
  },
  feedbackSection: {
    alignItems: 'center',
    gap: 8,
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.darkGreen,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.7,
  },
});

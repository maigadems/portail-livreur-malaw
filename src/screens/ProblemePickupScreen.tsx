import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { Alert } from '../components/AppAlert';
import {
  ABANDON_REASONS, AbandonReason, DeliveryDetail, abandonDelivery, getDelivery,
} from '../api/deliveries';
import { DisputeCategory, createDispute } from '../api/disputes';
import { useCourse } from '../context/CourseContext';

const DETAILS_MAX = 500;

/**
 * Chaque problème porte le motif d'abandon du serveur et la catégorie de
 * litige correspondante : le bouton ne se contente plus de ramener le livreur
 * au tableau de bord, il relâche vraiment la course.
 */
const PROBLEMES: {
  icon: string;
  label: string;
  desc: string;
  abandon: AbandonReason;
  dispute: DisputeCategory;
}[] = [
  {
    icon: '🚪',
    label: 'Restaurant fermé',
    desc: "Le restaurant est fermé à l'arrivée",
    abandon: 'RESTAURANT_CLOSED',
    dispute: 'OTHER',
  },
  {
    icon: '⏰',
    label: "Commande pas prête",
    desc: 'Attente prolongée sans commande prête',
    abandon: 'ORDER_NOT_READY',
    dispute: 'ORDER_LATE',
  },
  {
    icon: '📦',
    label: 'Commande incomplète ou erronée',
    desc: 'Articles manquants ou différents de la commande',
    abandon: 'RESTAURANT_ISSUE',
    dispute: 'ORDER_INCOMPLETE',
  },
  {
    icon: '💰',
    label: 'Désaccord sur le paiement',
    desc: 'Le restaurant réclame un paiement supplémentaire',
    abandon: 'RESTAURANT_ISSUE',
    dispute: 'PAYMENT_ISSUE',
  },
  {
    icon: '☎️',
    label: 'Restaurant injoignable',
    desc: 'Personne ne répond sur place ni au téléphone',
    abandon: 'RESTAURANT_ISSUE',
    dispute: 'OTHER',
  },
];

const isBlaming = (reason: AbandonReason) =>
  ABANDON_REASONS.find((r) => r.value === reason)?.blaming ?? true;

export default function ProblemePickupScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId, orderId } = route.params ?? {};
  const { refresh } = useCourse();

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [waitedConfirm, setWaitedConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    if (!deliveryId) {
      setLoading(false);
      setLoadError("Aucune course n'a été transmise à cet écran.");
      return;
    }
    getDelivery(deliveryId)
      .then((d) => { if (active) setDelivery(d); })
      .catch((e: any) => {
        if (active) setLoadError(e?.message ?? 'Impossible de charger la course.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deliveryId]);

  const problem = selected !== null ? PROBLEMES[selected] : null;
  const ready = problem !== null && waitedConfirm && !submitting;

  const submit = useCallback(async () => {
    if (!problem || !waitedConfirm || submitting) return;
    if (!deliveryId) {
      Alert.alert(
        'Course non identifiée',
        "Cet écran n'a pas reçu la course à libérer. Revenez à la course puis réessayez.",
      );
      return;
    }
    setSubmitting(true);

    const restaurantName = delivery?.order?.restaurant?.name ?? 'le restaurant';
    const details = [
      `${problem.label} — ${restaurantName}.`,
      problem.desc + '.',
      "Le livreur déclare avoir attendu au moins 5 minutes et tenté de contacter le restaurant.",
    ].join(' ').slice(0, DETAILS_MAX);

    // Le litige d'abord : après l'abandon, le livreur n'est plus rattaché à
    // la commande et le serveur refuse son signalement.
    const targetOrderId = orderId ?? delivery?.order?.id;
    let disputeError: string | null = null;
    if (targetOrderId) {
      try {
        await createDispute(targetOrderId, {
          category: problem.dispute,
          subject: `${problem.label} — ${restaurantName}`.slice(0, 160),
          description: details,
        });
      } catch (e: any) {
        disputeError = e?.message ?? 'Le signalement au support a échoué.';
      }
    }

    try {
      await abandonDelivery(deliveryId, { reason: problem.abandon, details });
      await refresh();
      Alert.alert(
        'Course libérée',
        disputeError
          ? `La course a été rendue au dispatch. En revanche, le signalement au support n'a pas pu être ouvert : ${disputeError}`
          : 'La course a été rendue au dispatch et le support a reçu votre signalement.',
        [{ text: 'OK', onPress: () => navigation.replace('DashboardEnLigne') }],
      );
    } catch (e: any) {
      Alert.alert(
        'Course non libérée',
        e?.message ?? "Le serveur a refusé l'abandon de la course. Réessayez dans un instant.",
      );
    } finally {
      setSubmitting(false);
    }
  }, [problem, waitedConfirm, submitting, deliveryId, orderId, delivery, refresh, navigation]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Problème au restaurant</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Contexte réel de la course */}
        <View style={styles.contextCard}>
          <View style={styles.contextIcon}>
            {loading ? (
              <ActivityIndicator color={Colors.greenMid} />
            ) : (
              <Text style={{ fontSize: 24 }}>🍽️</Text>
            )}
          </View>
          <View style={styles.contextText}>
            <Text style={styles.contextName}>
              {loading ? 'Chargement…' : (delivery?.order?.restaurant?.name ?? 'Restaurant')}
            </Text>
            {delivery?.order?.restaurant?.address ? (
              <Text style={styles.contextAddress}>{delivery.order.restaurant.address}</Text>
            ) : null}
            {delivery?.order?.items?.length ? (
              <Text style={styles.contextId}>
                {delivery.order.items.length} article{delivery.order.items.length > 1 ? 's' : ''} à récupérer
              </Text>
            ) : null}
          </View>
        </View>

        {loadError ? <Text style={styles.loadError}>{loadError}</Text> : null}

        <Text style={styles.selectTitle}>Quel est le problème ?</Text>

        <View style={styles.problemsList}>
          {PROBLEMES.map((p, i) => (
            <TouchableOpacity
              key={p.label}
              style={[styles.problemItem, selected === i && styles.problemItemSelected]}
              onPress={() => setSelected(i)}
              activeOpacity={0.75}
            >
              <View style={styles.problemLeft}>
                <View style={styles.problemIconBg}>
                  <Text style={styles.problemIconText}>{p.icon}</Text>
                </View>
                <View style={styles.problemTextBlock}>
                  <Text style={styles.problemLabel}>{p.label}</Text>
                  <Text style={styles.problemDesc}>{p.desc}</Text>
                </View>
              </View>
              <View style={[styles.radio, selected === i && styles.radioSelected]}>
                {selected === i && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Déclaration transmise telle quelle au support */}
        {problem && (
          <TouchableOpacity
            style={[styles.waitedItem, waitedConfirm && styles.waitedItemChecked]}
            onPress={() => setWaitedConfirm(v => !v)}
          >
            <View style={[styles.waitedCheckbox, waitedConfirm && styles.waitedCheckboxChecked]}>
              {waitedConfirm && <Text style={styles.waitedCheck}>✓</Text>}
            </View>
            <Text style={styles.waitedText}>
              J'ai attendu au moins 5 minutes et tenté de contacter le restaurant
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.supportTip}>
          <Text style={styles.supportTipIcon}>💡</Text>
          <Text style={styles.supportTipText}>
            {problem && isBlaming(problem.abandon)
              ? "Ce motif est retenu dans votre taux de fiabilité."
              : "La course repartira au dispatch et un litige sera ouvert pour le support. Un problème venant du restaurant n'est pas retenu contre vous."}
          </Text>
        </View>
      </ScrollView>

      {/* Bottom */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.callSupportBtn}
          onPress={() => navigation.navigate('Aide')}
        >
          <Text style={styles.callSupportText}>📞  Appeler le support maintenant</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.reportBtn, !ready && styles.reportBtnDisabled]}
          onPress={submit}
          disabled={!ready}
          activeOpacity={ready ? 0.85 : 1}
        >
          <View style={styles.reportBtnShadow} />
          {submitting ? (
            <ActivityIndicator color={Colors.errorLight} />
          ) : (
            <Text style={[styles.reportBtnText, !ready && { opacity: 0.4 }]}>
              Signaler et libérer la course
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  topBar: {
    height: 72,
    backgroundColor: Colors.darkCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(65,72,67,0.3)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: Colors.greenLight, fontWeight: '600' },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 20,
  },
  contextCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    padding: 16,
  },
  contextIcon: {
    width: 48,
    height: 48,
    borderRadius: Radii.sm,
    backgroundColor: Colors.nearBlack,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextText: { gap: 3, flex: 1 },
  contextName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  contextAddress: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  contextId: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  loadError: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  selectTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  problemsList: { gap: 8 },
  problemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
  },
  problemItemSelected: {
    borderColor: Colors.goldLight,
    backgroundColor: 'rgba(244,189,97,0.06)',
  },
  problemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  problemIconBg: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.cardDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemIconText: { fontSize: 22 },
  problemTextBlock: { flex: 1, gap: 3 },
  problemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  problemDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.goldLight },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.goldLight,
  },
  waitedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.3)',
    padding: 14,
  },
  waitedItemChecked: {
    borderColor: Colors.greenMid,
    backgroundColor: 'rgba(26,61,43,0.4)',
  },
  waitedCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  waitedCheckboxChecked: {
    backgroundColor: Colors.successDark,
    borderColor: Colors.successDark,
  },
  waitedCheck: { fontSize: 12, color: Colors.white, fontWeight: '900' },
  waitedText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  supportTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(169,208,182,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    padding: 14,
  },
  supportTipIcon: { fontSize: 16 },
  supportTipText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    lineHeight: 20,
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
  },
  callSupportBtn: {
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 2,
    borderColor: Colors.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  callSupportText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  reportBtn: {
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  reportBtnDisabled: {
    backgroundColor: 'rgba(147,0,10,0.3)',
  },
  reportBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.05,
  },
  reportBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
});

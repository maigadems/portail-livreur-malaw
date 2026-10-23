import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { Alert } from '../components/AppAlert';
import { getOrder } from '../api/orders';
import { ABANDON_REASONS, abandonDelivery } from '../api/deliveries';
import { createDispute } from '../api/disputes';
import { uploadImage } from '../api/uploads';
import { captureDocument } from '../utils/pickDocument';
import { useCourse } from '../context/CourseContext';

const WAIT_SECONDS = 300; // 5 min
const MAX_CALLS = 3;
const DETAILS_MAX = 500;

type OrderLite = {
  customer?: { name: string | null; phone: string } | null;
  deliveryAddress?: { line: string } | null;
};

/** Le motif est déclaré non retenu côté serveur : on le dit au livreur. */
const REASON = ABANDON_REASONS.find((r) => r.value === 'CUSTOMER_UNREACHABLE')!;

export default function ClientIntrouvableScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId, orderId } = route.params ?? {};
  const { refresh } = useCourse();

  const [order, setOrder] = useState<OrderLite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [elapsed, setElapsed] = useState(0);
  const [callAttempts, setCallAttempts] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [releasing, setReleasing] = useState(false);

  useEffect(() => {
    let active = true;
    if (!orderId) {
      setLoading(false);
      setError("Aucune commande n'a été transmise à cet écran.");
      return;
    }
    getOrder(orderId)
      .then((o: any) => { if (active) setOrder(o); })
      .catch((e: any) => {
        if (active) setError(e?.message ?? 'Impossible de charger les informations du client.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const waitPct = Math.min((elapsed / WAIT_SECONDS) * 100, 100);
  const remainSec = Math.max(WAIT_SECONDS - elapsed, 0);
  const canRelease = elapsed >= WAIT_SECONDS || callAttempts >= MAX_CALLS;

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  const callClient = useCallback(async () => {
    const phone = order?.customer?.phone;
    if (!phone) {
      Alert.alert('Appel impossible', "Le numéro du client n'est pas disponible.");
      return;
    }
    try {
      await Linking.openURL(`tel:${phone}`);
      // Le compteur ne progresse qu'après un appel réellement lancé : c'est
      // lui qui débloque la libération de la course.
      setCallAttempts(a => Math.min(a + 1, MAX_CALLS));
    } catch {
      Alert.alert('Appel impossible', "Impossible d'ouvrir le téléphone depuis l'application.");
    }
  }, [order?.customer?.phone]);

  const takePhoto = useCallback(async () => {
    if (uploading) return;
    setUploading(true);
    try {
      const dataUrl = await captureDocument();
      if (!dataUrl) return;
      const { url } = await uploadImage(dataUrl, 'kyc');
      setPhotoUrl(url);
    } catch (e: any) {
      Alert.alert('Photo non enregistrée', e?.message ?? "Le dépôt de la photo a échoué.");
    } finally {
      setUploading(false);
    }
  }, [uploading]);

  const release = useCallback(async () => {
    if (releasing || !canRelease) return;
    if (!deliveryId) {
      Alert.alert(
        'Course non identifiée',
        "Cet écran n'a pas reçu la course à libérer. Revenez à la course puis réessayez.",
      );
      return;
    }
    setReleasing(true);

    const waited = Math.floor(elapsed / 60);
    const details = [
      `Client injoignable à l'adresse : ${order?.deliveryAddress?.line ?? 'adresse non chargée'}.`,
      `${callAttempts} tentative${callAttempts > 1 ? 's' : ''} d'appel, ${waited} min d'attente sur place.`,
      photoUrl ? `Photo de preuve : ${photoUrl}` : 'Aucune photo de preuve.',
    ].join(' ').slice(0, DETAILS_MAX);

    // Le litige d'abord : une fois la course relâchée, le livreur n'y est
    // plus rattaché et le serveur refuserait le signalement.
    let disputeError: string | null = null;
    if (orderId) {
      try {
        await createDispute(orderId, {
          category: 'ORDER_NOT_RECEIVED',
          subject: `Client injoignable — ${order?.customer?.name ?? 'client'}`.slice(0, 160),
          description: details,
        });
      } catch (e: any) {
        disputeError = e?.message ?? 'Le signalement au support a échoué.';
      }
    }

    try {
      await abandonDelivery(deliveryId, { reason: 'CUSTOMER_UNREACHABLE', details });
      await refresh();
      Alert.alert(
        'Course libérée',
        disputeError
          ? `La course a été rendue au dispatch. En revanche, le signalement au support n'a pas pu être ouvert : ${disputeError}`
          : "La course a été rendue au dispatch et le support a reçu votre signalement. Ce motif n'est pas retenu contre vous.",
        [{ text: 'OK', onPress: () => navigation.replace('DashboardEnLigne') }],
      );
    } catch (e: any) {
      Alert.alert(
        'Course non libérée',
        e?.message ?? "Le serveur a refusé l'abandon de la course. Réessayez dans un instant.",
      );
    } finally {
      setReleasing(false);
    }
  }, [
    releasing, canRelease, deliveryId, orderId, elapsed, callAttempts,
    photoUrl, order, refresh, navigation,
  ]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Client introuvable</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Warning icon */}
        <View style={styles.warningCircle}>
          <View style={styles.warningInner}>
            <Text style={styles.warningEmoji}>⏳</Text>
          </View>
        </View>

        {/* Status */}
        <View style={styles.statusBlock}>
          <Text style={styles.statusTitle}>En attente du client</Text>
          {loading ? (
            <ActivityIndicator color={Colors.greenMid} />
          ) : (
            <Text style={styles.statusDesc}>
              {order?.customer?.name ?? 'Client'}
              {order?.deliveryAddress?.line ? ` · ${order.deliveryAddress.line}` : ''}{'\n'}
              Tentatives d'appel : {callAttempts}/{MAX_CALLS}
            </Text>
          )}
          {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>

        {/* Wait timer */}
        <View style={styles.timerCard}>
          <View style={styles.timerHeader}>
            <Text style={styles.timerLabel}>TEMPS D'ATTENTE ÉCOULÉ</Text>
            <Text style={[styles.timerValue, elapsed >= WAIT_SECONDS && styles.timerValueDone]}>
              {formatTime(elapsed)}
            </Text>
          </View>
          <View style={styles.timerTrack}>
            <View style={[styles.timerFill, { width: `${waitPct}%` as any }]} />
          </View>
          {canRelease ? (
            <Text style={styles.timerDone}>
              ✓ Vous pouvez libérer la course maintenant
            </Text>
          ) : (
            <Text style={styles.timerHint}>
              Libération possible dans {formatTime(remainSec)}, ou après {MAX_CALLS} appels
            </Text>
          )}
        </View>

        {/* Action buttons */}
        <View style={styles.actionsBlock}>
          <Text style={styles.actionsTitle}>QUE FAIRE ?</Text>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={callClient}
            disabled={loading}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={{ fontSize: 22 }}>📞</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Appeler le client</Text>
              <Text style={styles.actionDesc}>
                {order?.customer?.phone ?? 'Numéro indisponible'} · {callAttempts}/{MAX_CALLS} appels
              </Text>
            </View>
            {callAttempts < MAX_CALLS ? (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>Appeler</Text>
              </View>
            ) : (
              <View style={[styles.actionBadge, { backgroundColor: 'rgba(169,208,182,0.2)' }]}>
                <Text style={[styles.actionBadgeText, { color: Colors.greenMid }]}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionItem, !!photoUrl && styles.actionItemDone]}
            onPress={takePhoto}
            disabled={uploading}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={{ fontSize: 22 }}>📸</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Prendre une photo de preuve</Text>
              <Text style={styles.actionDesc}>
                {photoUrl
                  ? 'Photo transmise au support avec votre signalement'
                  : "Photo de l'adresse ou de la tentative de livraison"}
              </Text>
            </View>
            {uploading ? (
              <ActivityIndicator color={Colors.goldLight} />
            ) : !photoUrl ? (
              <View style={styles.actionBadge}>
                <Text style={styles.actionBadgeText}>Photo</Text>
              </View>
            ) : (
              <View style={[styles.actionBadge, { backgroundColor: 'rgba(34,197,94,0.15)' }]}>
                <Text style={[styles.actionBadgeText, { color: Colors.success }]}>✓</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionItem}
            onPress={() => navigation.navigate('Aide')}
            activeOpacity={0.8}
          >
            <View style={styles.actionIcon}>
              <Text style={{ fontSize: 22 }}>💬</Text>
            </View>
            <View style={styles.actionText}>
              <Text style={styles.actionLabel}>Contacter le support</Text>
              <Text style={styles.actionDesc}>Assistance et numéros utiles</Text>
            </View>
            <Text style={{ color: Colors.muted, fontSize: 18 }}>›</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.cancelBtn, (!canRelease || releasing) && styles.cancelBtnDisabled]}
          onPress={release}
          disabled={!canRelease || releasing}
          activeOpacity={canRelease ? 0.85 : 1}
        >
          {releasing ? (
            <ActivityIndicator color={Colors.errorLight} />
          ) : (
            <Text style={[styles.cancelBtnText, !canRelease && { opacity: 0.35 }]}>
              {canRelease
                ? 'Signaler et libérer la course →'
                : `Libération dans ${formatTime(remainSec)}`}
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.bottomNote}>
          {REASON.blaming
            ? 'Ce motif est retenu dans votre taux de fiabilité.'
            : "« Client injoignable » n'est pas retenu contre vous. La course repart au dispatch et le support reçoit votre signalement."}
        </Text>
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
  backArrow: { fontSize: 18, color: Colors.gold, fontWeight: '700' },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
    gap: 20,
  },
  warningCircle: {
    alignSelf: 'center',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(244,189,97,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(244,189,97,0.2)',
  },
  warningInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(244,189,97,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningEmoji: { fontSize: 36 },
  statusBlock: { alignItems: 'center', gap: 6 },
  statusTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  timerCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 10,
  },
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timerLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  timerValue: {
    fontSize: 28,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  timerValueDone: { color: Colors.successDark },
  timerTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(65,72,67,0.5)',
    overflow: 'hidden',
  },
  timerFill: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.goldLight,
  },
  timerHint: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  timerDone: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  actionsBlock: { gap: 10 },
  actionsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 14,
  },
  actionItemDone: {
    borderColor: 'rgba(34,197,94,0.2)',
    backgroundColor: 'rgba(26,61,43,0.4)',
  },
  actionIcon: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.darkCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { flex: 1, gap: 3 },
  actionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  actionDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  actionBadge: {
    borderRadius: 9999,
    backgroundColor: Colors.goldLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  actionBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    width: '100%',
    height: 60,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnDisabled: {
    backgroundColor: 'rgba(147,0,10,0.25)',
  },
  cancelBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  bottomNote: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.7,
    lineHeight: 18,
  },
});

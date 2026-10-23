import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import MalawLogo from '../components/MalawLogo';
import { Colors, Radii } from '../constants/theme';
import { DeliveryDetail, getDelivery } from '../api/deliveries';
import { Alert } from '../components/AppAlert';

const fmtXof = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`;

const fmtDateTime = (iso?: string | null): string | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/** Le statut serveur, tel quel : un reçu ne doit jamais dire « livré » à tort. */
const STATUS_LABELS: Record<string, string> = {
  DELIVERED: '✓ LIVRÉ',
  IN_TRANSIT: 'EN COURS',
  PICKED_UP: 'EN COURS',
  ASSIGNED: 'EN COURS',
  CANCELLED: 'ANNULÉE',
};

export default function RecuCourseScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId } = route.params ?? {};

  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (!deliveryId) {
      setLoading(false);
      setError("Aucune course n'a été transmise à cet écran.");
      return;
    }
    getDelivery(deliveryId)
      .then((d) => { if (active) setDelivery(d); })
      .catch((e: any) => {
        if (active) setError(e?.message ?? 'Impossible de charger ce reçu.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deliveryId]);

  const order = delivery?.order;
  const deliveredAt = fmtDateTime(delivery?.deliveredAt);
  const acceptedAt = fmtDateTime(delivery?.createdAt);
  const statusLabel = delivery ? (STATUS_LABELS[delivery.status] ?? delivery.status) : null;
  const isDelivered = delivery?.status === 'DELIVERED';

  const share = async () => {
    if (!delivery || !order) return;
    // Reçu textuel : seules les valeurs renvoyées par le serveur y figurent.
    const lines = [
      'Reçu de course Malaw',
      `Référence : ${delivery.id}`,
      `Restaurant : ${order.restaurant.name} — ${order.restaurant.address}`,
      `Livraison : ${order.deliveryAddress.line}`,
      deliveredAt ? `Livrée le ${deliveredAt}` : `Course acceptée le ${acceptedAt ?? '—'}`,
      `Frais de livraison : ${fmtXof(order.deliveryFee)}`,
    ];
    try {
      await Share.share({ message: lines.join('\n') });
    } catch (e: any) {
      Alert.alert('Partage impossible', e?.message ?? 'Le partage a échoué.');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reçu de course</Text>
        <TouchableOpacity
          style={[styles.shareBtn, !delivery && styles.shareBtnDisabled]}
          onPress={share}
          disabled={!delivery}
        >
          <Text style={styles.shareIcon}>⬆️</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.greenMid} style={{ marginTop: 48 }} />
      ) : error || !order || !delivery ? (
        <View style={styles.errorBlock}>
          <Text style={styles.errorText}>{error ?? 'Reçu indisponible.'}</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.errorBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header receipt */}
          <View style={styles.receiptHeader}>
            <View style={styles.receiptBrand}>
              <MalawLogo size={48} />
              <Text style={styles.receiptSub}>Reçu de livraison</Text>
            </View>
            <View style={[styles.receiptStatusBadge, !isDelivered && styles.receiptStatusBadgePending]}>
              <Text style={styles.receiptStatusText}>{statusLabel}</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountBlock}>
            <Text style={styles.amountLabel}>FRAIS DE LIVRAISON</Text>
            <Text style={styles.amountValue}>{fmtXof(order.deliveryFee)}</Text>
            {deliveredAt ? <Text style={styles.amountDate}>{deliveredAt}</Text> : null}
          </View>

          {/* Route */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>TRAJET</Text>
            <View style={styles.routeBlock}>
              <View style={styles.routeStop}>
                <View style={[styles.routeStopDot, { backgroundColor: Colors.goldLight }]} />
                <View style={styles.routeStopInfo}>
                  <Text style={styles.routeStopLabel}>DÉPART · RESTAURANT</Text>
                  <Text style={styles.routeStopName}>{order.restaurant.name}</Text>
                  <Text style={styles.routeStopAddress}>{order.restaurant.address}</Text>
                </View>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routeStop}>
                <View style={[styles.routeStopDot, styles.routeStopDotDest]} />
                <View style={styles.routeStopInfo}>
                  <Text style={styles.routeStopLabel}>ARRIVÉE · CLIENT</Text>
                  <Text style={styles.routeStopName}>
                    {order.customer?.name ?? 'Client'}
                  </Text>
                  <Text style={styles.routeStopAddress}>{order.deliveryAddress.line}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Articles : les seuls détails que le serveur connaît réellement.
              Ni distance ni durée de préparation ne sont enregistrées. */}
          {order.items?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>ARTICLES LIVRÉS</Text>
              <View style={styles.detailsCard}>
                {order.items.map((item, i) => (
                  <View key={item.id} style={[styles.detailRow, i > 0 && styles.detailRowBorder]}>
                    <Text style={styles.detailLabel}>{item.quantity} × {item.name}</Text>
                    <Text style={styles.detailValue}>{fmtXof(item.unitPrice * item.quantity)}</Text>
                  </View>
                ))}
                <View style={[styles.detailRow, styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Total de la commande</Text>
                  <Text style={styles.detailValue}>{fmtXof(order.total)}</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* Dates */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>HORODATAGE</Text>
            <View style={styles.detailsCard}>
              {acceptedAt ? (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Course acceptée</Text>
                  <Text style={styles.detailValueSmall}>{acceptedAt}</Text>
                </View>
              ) : null}
              {deliveredAt ? (
                <View style={[styles.detailRow, !!acceptedAt && styles.detailRowBorder]}>
                  <Text style={styles.detailLabel}>Livraison confirmée</Text>
                  <Text style={styles.detailValueSmall}>{deliveredAt}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Signaler un problème — le partage occupait cette place et menait
              en réalité à l'ouverture d'un litige. */}
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() => navigation.navigate('Litige', {
              orderId: order.id,
              restaurantName: order.restaurant.name,
            })}
          >
            <Text style={styles.reportBtnText}>Signaler un problème sur cette course</Text>
          </TouchableOpacity>

          {/* Reference */}
          <View style={styles.refBlock}>
            <Text style={styles.refLabel}>Référence course</Text>
            <Text style={styles.refValue} selectable>{delivery.id}</Text>
            <Text style={styles.refNote}>Conservez cette référence pour tout litige</Text>
          </View>
        </ScrollView>
      )}
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
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(169,208,182,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtnDisabled: { opacity: 0.3 },
  shareIcon: { fontSize: 16 },
  errorBlock: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    paddingHorizontal: 32,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  errorBtn: {
    borderRadius: Radii.md,
    backgroundColor: 'rgba(169,208,182,0.12)',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  errorBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
    gap: 24,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptBrand: { gap: 2 },
  receiptSub: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  receiptStatusBadge: {
    borderRadius: 9999,
    backgroundColor: Colors.successDark,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  receiptStatusBadgePending: { backgroundColor: Colors.gold },
  receiptStatusText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  amountBlock: {
    alignItems: 'center',
    gap: 6,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    paddingVertical: 28,
    paddingHorizontal: 24,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: 42,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  amountDate: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  routeBlock: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 16,
    gap: 8,
  },
  routeStop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  routeStopDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 3,
  },
  routeStopDotDest: {
    borderWidth: 2,
    borderColor: Colors.greenMid,
    backgroundColor: 'transparent',
  },
  routeStopInfo: { gap: 2, flex: 1 },
  routeStopLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  routeStopName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  routeStopAddress: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  routeLine: {
    width: 2,
    height: 16,
    backgroundColor: Colors.goldLight,
    marginLeft: 5,
    opacity: 0.3,
  },
  detailsCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    overflow: 'hidden',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: 14,
  },
  detailRowBorder: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
  },
  detailLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  detailValueSmall: {
    flex: 1,
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'right',
  },
  reportBtn: {
    height: 52,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  refBlock: {
    alignItems: 'center',
    gap: 4,
    opacity: 0.6,
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  refNote: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
});

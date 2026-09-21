import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Fonts, Radii } from '../constants/theme';
import { getDelivery, DeliveryDetail } from '../api/deliveries';
import { Alert } from '../components/AppAlert';

const fmt = (n: number) => n.toLocaleString('fr-FR');
const STATUS = {
  DELIVERED: { label: 'Livré', color: Colors.successDark },
  CANCELLED: { label: 'Annulé', color: Colors.error },
} as const;

/**
 * Détail d'une livraison terminée. Le profil client reste disponible pour
 * appel (bouton téléphone) même après la livraison.
 */
export default function DetailLivraisonScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { deliveryId } = route.params ?? {};
  const [delivery, setDelivery] = useState<DeliveryDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!deliveryId) { setLoading(false); return; }
    getDelivery(deliveryId)
      .then((d) => { if (active) setDelivery(d); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [deliveryId]));

  const callClient = () => {
    const phone = delivery?.order.customer?.phone;
    if (!phone) {
      Alert.alert('Appel impossible', "Le numéro du client n'est pas disponible.");
      return;
    }
    Linking.openURL(`tel:${phone}`).catch(() =>
      Alert.alert('Appel impossible', "Impossible de lancer l'appel."),
    );
  };

  const status = delivery ? (STATUS as any)[delivery.status] : null;
  const customerName = delivery?.order.customer?.name ?? 'Client';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Historique'))} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Détail livraison</Text>
        <View style={{ width: 34 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.goldLight} style={{ marginTop: 40 }} />
      ) : !delivery ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>Livraison introuvable.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Statut + date */}
          <View style={styles.statusRow}>
            {status ? (
              <View style={[styles.statusBadge, { backgroundColor: status.color + '22', borderColor: status.color }]}>
                <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
              </View>
            ) : null}
            <Text style={styles.dateText}>
              {delivery.deliveredAt
                ? new Date(delivery.deliveredAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', hour: '2-digit', minute: '2-digit' })
                : new Date(delivery.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
            </Text>
          </View>

          {/* Profil client — appelable */}
          <View style={styles.clientCard}>
            <View style={styles.clientAvatar}>
              <Text style={styles.clientAvatarText}>{customerName.charAt(0).toUpperCase()}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.clientLabel}>CLIENT</Text>
              <Text style={styles.clientName}>{customerName}</Text>
              {delivery.order.customer?.phone ? (
                <Text style={styles.clientPhone}>{delivery.order.customer.phone}</Text>
              ) : null}
            </View>
            <TouchableOpacity style={styles.callBtn} onPress={callClient}>
              <Text style={styles.callBtnIcon}>📞</Text>
            </TouchableOpacity>
          </View>

          {/* Trajet */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Trajet</Text>
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>RESTAURANT</Text>
              <Text style={styles.routeValue}>{delivery.order.restaurant.name}</Text>
              <Text style={styles.routeSub}>{delivery.order.restaurant.address}</Text>
            </View>
            <View style={styles.routeDivider} />
            <View style={styles.routeItem}>
              <Text style={styles.routeLabel}>LIVRAISON</Text>
              <Text style={styles.routeValue}>{delivery.order.deliveryAddress.line}</Text>
            </View>
          </View>

          {/* Articles */}
          {delivery.order.items?.length ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Commande</Text>
              {delivery.order.items.map((it) => (
                <View key={it.id} style={styles.itemRow}>
                  <Text style={styles.itemName}>{it.quantity}× {it.name}</Text>
                  <Text style={styles.itemPrice}>{fmt(it.unitPrice * it.quantity)} FCFA</Text>
                </View>
              ))}
              {delivery.order.notes ? (
                <Text style={styles.notes}>Note : {delivery.order.notes}</Text>
              ) : null}
            </View>
          ) : null}

          {/* Gain */}
          <View style={styles.earningCard}>
            <Text style={styles.earningLabel}>VOTRE GAIN</Text>
            <Text style={styles.earningValue}>
              {delivery.status === 'CANCELLED' ? '0' : fmt(delivery.order.deliveryFee)} FCFA
            </Text>
          </View>

          {/* Signalement rattaché à CETTE course — le service client la
              retrouve directement dans sa file. */}
          <TouchableOpacity
            style={styles.reportBtn}
            onPress={() =>
              navigation.navigate('Litige', {
                orderId: delivery.order.id,
                restaurantName: delivery.order.restaurant.name,
              })
            }
            activeOpacity={0.85}
          >
            <Text style={styles.reportBtnText}>⚠️  Signaler un problème sur cette course</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.deepBlack },
  topBar: {
    height: 72, backgroundColor: Colors.darkGreen,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  backBtn: { width: 34, height: 34, justifyContent: 'center' },
  backArrow: { fontSize: 22, color: Colors.cream, fontFamily: Fonts.manrope.bold },
  topBarTitle: { fontSize: 18, color: Colors.cream, fontFamily: Fonts.epilogue.bold },
  empty: { paddingVertical: 60, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.muted, fontFamily: Fonts.manrope.medium },
  scrollContent: { padding: 20, gap: 16 },
  reportBtn: {
    height: 54, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(248,113,113,0.5)',
    alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  reportBtnText: { fontSize: 14, color: '#F87171', fontFamily: Fonts.manrope.bold },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusBadge: { borderRadius: 9999, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  statusText: { fontSize: 13, fontFamily: Fonts.manrope.bold },
  dateText: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.manrope.medium },
  clientCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: Colors.cardDark, borderRadius: 20, padding: 16,
    borderWidth: 1, borderColor: 'rgba(65,72,67,0.4)',
  },
  clientAvatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: Colors.goldLight,
  },
  clientAvatarText: { fontSize: 22, color: Colors.goldLight, fontFamily: Fonts.epilogue.bold },
  clientLabel: { fontSize: 11, color: Colors.greenMid, fontFamily: Fonts.manrope.bold, letterSpacing: 0.5 },
  clientName: { fontSize: 17, color: Colors.cream, fontFamily: Fonts.epilogue.bold },
  clientPhone: { fontSize: 13, color: Colors.greenMid, fontFamily: Fonts.manrope.medium },
  callBtn: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: Colors.goldLight,
    alignItems: 'center', justifyContent: 'center',
  },
  callBtnIcon: { fontSize: 20 },
  card: {
    backgroundColor: Colors.cardDark, borderRadius: 20, padding: 20, gap: 12,
    borderWidth: 1, borderColor: 'rgba(65,72,67,0.4)',
  },
  cardTitle: { fontSize: 16, color: Colors.cream, fontFamily: Fonts.epilogue.bold },
  routeItem: { gap: 2 },
  routeLabel: { fontSize: 11, color: Colors.greenMid, fontFamily: Fonts.manrope.bold, letterSpacing: 0.5 },
  routeValue: { fontSize: 15, color: Colors.greenLight, fontFamily: Fonts.manrope.semiBold },
  routeSub: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.manrope.regular },
  routeDivider: { height: 1, backgroundColor: 'rgba(65,72,67,0.4)' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemName: { fontSize: 14, color: Colors.greenLight, fontFamily: Fonts.manrope.medium },
  itemPrice: { fontSize: 14, color: Colors.cream, fontFamily: Fonts.manrope.semiBold },
  notes: { fontSize: 13, color: Colors.muted, fontFamily: Fonts.manrope.regular, marginTop: 4 },
  earningCard: {
    backgroundColor: 'rgba(244,189,97,0.1)', borderRadius: 20, padding: 20,
    borderWidth: 1, borderColor: 'rgba(244,189,97,0.3)',
    alignItems: 'center', gap: 4,
  },
  earningLabel: { fontSize: 12, color: Colors.goldLight, fontFamily: Fonts.manrope.bold, letterSpacing: 1 },
  earningValue: { fontSize: 26, color: Colors.goldLight, fontFamily: Fonts.epilogue.bold },
});

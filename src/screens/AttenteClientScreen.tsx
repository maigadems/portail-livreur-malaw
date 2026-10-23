import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Linking, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { getOrder } from '../api/orders';
import { Alert } from '../components/AppAlert';

export default function AttenteClientScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  // `deliveryId` circule jusqu'ici : sans lui, l'écran « client introuvable »
  // ne peut pas libérer la course.
  const { deliveryId, orderId } = route.params ?? {};
  const [order, setOrder] = useState<{ customer?: { name: string | null; phone: string } | null; deliveryAddress?: { line: string } } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    if (!orderId) {
      setLoading(false);
      setError("Aucune commande n'a été transmise à cet écran.");
      return;
    }
    setError(null);
    getOrder(orderId)
      .then((o: any) => { if (active) setOrder(o); })
      .catch((e: any) => {
        // Le chargement échouait en silence : le livreur voyait « Client »
        // sans numéro et croyait à une commande sans téléphone.
        if (active) setError(e?.message ?? 'Impossible de charger les informations du client.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [orderId]));

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
    <SafeAreaView style={styles.container}>
      {/* TopBar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('DashboardEnLigne'))} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Livraison</Text>
        <View style={styles.stepPill}>
          <Text style={styles.stepPillText}>2/2</Text>
        </View>
      </View>

      {/* Main content */}
      <View style={styles.content}>
        {/* Illustration */}
        <View style={styles.illustrationWrap}>
          <View style={styles.illustrationCircle}>
            <Text style={styles.illustrationEmoji}>🚪</Text>
          </View>
          <View style={styles.pulseRing1} />
          <View style={styles.pulseRing2} />
        </View>

        {/* Status text */}
        <View style={styles.textBlock}>
          <Text style={styles.statusTitle}>Vous êtes arrivé !</Text>
          <Text style={styles.statusDesc}>
            Attendez que le client vienne récupérer sa commande.
            Il va vous remettre un code à 4 chiffres.
          </Text>
        </View>

        {/* Client card */}
        <View style={styles.clientCard}>
          <View style={styles.clientAvatar}>
            {loading ? (
              <ActivityIndicator color={Colors.cream} />
            ) : (
              <Text style={{ fontSize: 28 }}>👤</Text>
            )}
          </View>
          <View style={styles.clientInfo}>
            <Text style={styles.clientName}>
              {loading ? 'Chargement…' : (order?.customer?.name ?? 'Client')}
            </Text>
            <Text style={styles.clientAddress}>{order?.deliveryAddress?.line ?? ''}</Text>
          </View>
          <TouchableOpacity
            style={[styles.callBtn, (loading || !order?.customer?.phone) && styles.callBtnDisabled]}
            onPress={callClient}
            disabled={loading}
          >
            <Text style={styles.callBtnIcon}>📞</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorBannerText}>{error}</Text>
          </View>
        ) : null}

        {/* Instructions steps */}
        <View style={styles.stepsCard}>
          <View style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNum}>1</Text>
            </View>
            <Text style={styles.stepLabel}>Attendez le client à l'adresse indiquée</Text>
          </View>
          <View style={styles.stepDivider} />
          <View style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <Text style={styles.stepLabel}>Demandez-lui son code de confirmation</Text>
          </View>
          <View style={styles.stepDivider} />
          <View style={styles.stepRow}>
            <View style={styles.stepNumBadge}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <Text style={styles.stepLabel}>Saisissez le code pour valider la livraison</Text>
          </View>
        </View>
      </View>

      {/* Bottom CTA */}
      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={styles.codeBtn}
          onPress={() => navigation.replace('CodeConfirmationLivraison', { deliveryId, orderId })}
          activeOpacity={0.85}
        >
          <Text style={styles.codeBtnText}>Saisir le code du client</Text>
          <Text style={{ color: 'rgb(67,44,0)', fontSize: 20 }}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.problemBtn}
          onPress={() => navigation.navigate('ClientIntrouvable', { deliveryId, orderId })}
        >
          <Text style={styles.problemBtnText}>Le client est introuvable</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  topBar: {
    height: 72,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    backgroundColor: Colors.darkCard,
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
  stepPill: {
    backgroundColor: Colors.goldLight,
    borderRadius: 9999,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  stepPillText: {
    fontSize: 13,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  illustrationWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 140,
  },
  illustrationCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 3,
  },
  illustrationEmoji: { fontSize: 44 },
  pulseRing1: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.greenMid,
    opacity: 0.3,
    zIndex: 2,
  },
  pulseRing2: {
    position: 'absolute',
    width: 148,
    height: 148,
    borderRadius: 74,
    borderWidth: 2,
    borderColor: Colors.greenMid,
    opacity: 0.15,
    zIndex: 1,
  },
  textBlock: { alignItems: 'center', gap: 10 },
  statusTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  statusDesc: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    borderWidth: 1,
    borderColor: Colors.goldLight,
    padding: 18,
  },
  clientAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  clientInfo: { flex: 1, gap: 3 },
  clientName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  clientAddress: {
    fontSize: 12,
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(169,208,182,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callBtnDisabled: { opacity: 0.35 },
  callBtnIcon: { fontSize: 20 },
  errorBanner: {
    borderRadius: Radii.md,
    backgroundColor: 'rgba(192,57,43,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,180,171,0.3)',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  errorBannerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 20,
  },
  stepsCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkCard,
    padding: 20,
    gap: 0,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 4,
  },
  stepDivider: {
    height: 1,
    backgroundColor: 'rgba(65,72,67,0.4)',
    marginVertical: 10,
  },
  stepNumBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.darkGreen,
    borderWidth: 1,
    borderColor: Colors.greenMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 13,
    fontWeight: '800',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  stepLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.3)',
  },
  codeBtn: {
    height: 72,
    borderRadius: Radii.xl,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  codeBtnText: {
    fontSize: 18,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  problemBtn: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  problemBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
});

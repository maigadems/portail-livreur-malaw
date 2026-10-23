import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { Alert } from '../components/AppAlert';
import {
  getWallet, listPayouts, requestPayout, cancelPayout,
  Wallet, Payout, PayoutMethod,
  PAYOUT_METHOD_LABELS, PAYOUT_STATUS_LABELS, isCancellable,
} from '../api/wallet';

const fmt = (n: number) => n.toLocaleString('fr-FR');

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });

const METHOD_ICONS: Record<PayoutMethod, string> = {
  WAVE: '📱',
  ORANGE_MONEY: '🟠',
  BANK_TRANSFER: '🏦',
};

/** Le libellé du champ dépend du moyen : un IBAN n'est pas un numéro de téléphone. */
const DESTINATION_HINTS: Record<PayoutMethod, { label: string; placeholder: string }> = {
  WAVE: { label: 'NUMÉRO WAVE', placeholder: '77 000 00 00' },
  ORANGE_MONEY: { label: 'NUMÉRO ORANGE MONEY', placeholder: '77 000 00 00' },
  BANK_TRANSFER: { label: 'NUMÉRO DE COMPTE', placeholder: 'SN00 0000 0000' },
};

const groupDigits = (val: string) => val.replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

export default function RetraitScreen() {
  const navigation = useNavigation<any>();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<PayoutMethod>('WAVE');
  const [destination, setDestination] = useState('');
  // Une fois la demande acceptée par le serveur, on affiche SA réponse :
  // aucun identifiant ni statut n'est fabriqué côté application.
  const [created, setCreated] = useState<Payout | null>(null);

  const load = useCallback(async (isActive: () => boolean) => {
    const [w, p] = await Promise.all([
      getWallet(),
      listPayouts({ limit: 20 }).catch(() => ({ items: [] as Payout[], nextCursor: null })),
    ]);
    if (!isActive()) return;
    setWallet(w);
    setPayouts(p.items);
    // Le moyen déjà enregistré évite de ressaisir le numéro à chaque retrait.
    if (w.payoutMethod) setMethod(w.payoutMethod);
    if (w.payoutNumber) setDestination(w.payoutNumber);
  }, []);

  useFocusEffect(useCallback(() => {
    let active = true;
    const isActive = () => active;
    load(isActive)
      .catch((e: any) => {
        if (active) Alert.alert('Portefeuille indisponible', e?.message ?? 'Réessayez dans un instant.');
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [load]));

  const balance = wallet?.balanceXof ?? 0;
  const minimum = wallet?.minWithdrawalXof ?? 0;
  const availableMethods = (wallet ? Object.keys(wallet.fees) : []) as PayoutMethod[];
  const fee = wallet?.fees?.[method] ?? 0;

  const numAmount = parseInt(amount.replace(/\s/g, ''), 10) || 0;
  const net = Math.max(0, numAmount - fee);
  const destinationDigits = destination.replace(/\D/g, '');
  const destinationOk =
    method === 'BANK_TRANSFER' ? destination.trim().length >= 6 : destinationDigits.length >= 9;
  const amountOk = numAmount >= minimum && numAmount <= balance && numAmount > fee;
  const valid = !!wallet && amountOk && destinationOk && !submitting;

  const presets = [5000, 10000, 20000].filter((p) => p >= minimum && p <= balance);

  const submit = async () => {
    if (!valid || submitting) return;
    setSubmitting(true);
    try {
      const payout = await requestPayout({
        amountXof: numAmount,
        method,
        destination: method === 'BANK_TRANSFER' ? destination.trim() : destinationDigits,
      });
      setCreated(payout);
    } catch (e: any) {
      Alert.alert('Demande refusée', e?.message ?? 'La demande n\'a pas pu être enregistrée.');
    } finally {
      setSubmitting(false);
    }
  };

  const askCancel = (payout: Payout) => {
    Alert.alert(
      'Annuler la demande ?',
      `Les ${fmt(payout.amountXof)} FCFA immobilisés reviendront sur votre solde disponible.`,
      [
        { text: 'Garder', style: 'cancel' },
        { text: 'Annuler la demande', style: 'destructive', onPress: () => doCancel(payout.id) },
      ],
    );
  };

  const doCancel = async (id: string) => {
    if (cancellingId) return;
    setCancellingId(id);
    try {
      await cancelPayout(id);
      await load(() => true);
    } catch (e: any) {
      Alert.alert('Annulation impossible', e?.message ?? 'Réessayez dans un instant.');
    } finally {
      setCancellingId(null);
    }
  };

  if (created) {
    return (
      <SafeAreaView style={[styles.container, styles.successScreen]}>
        <View style={styles.successCircle}>
          <Text style={{ fontSize: 48 }}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Demande enregistrée</Text>
        <Text style={styles.successDesc}>
          Votre demande de {fmt(created.amountXof)} FCFA vers {PAYOUT_METHOD_LABELS[created.method]}
          {' '}({created.destination}) a bien été reçue. Elle doit être examinée par l'équipe Malaw
          avant le virement. Vous serez notifié dès qu'elle sera traitée.
        </Text>
        <View style={styles.refCard}>
          <Text style={styles.refLabel}>IDENTIFIANT DE LA DEMANDE</Text>
          <Text style={styles.refValue}>{created.id}</Text>
          <Text style={styles.refStatus}>{PAYOUT_STATUS_LABELS[created.status]}</Text>
          {created.feeXof > 0 && (
            <Text style={styles.refNet}>
              Frais {fmt(created.feeXof)} FCFA · vous recevrez {fmt(created.netXof)} FCFA
            </Text>
          )}
        </View>
        <TouchableOpacity style={styles.returnBtn} onPress={() => navigation.navigate('Wallet')}>
          <Text style={styles.returnBtnText}>Retour au Wallet</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const pendingPayouts = payouts.filter((p) => isCancellable(p.status));

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Demande de retrait</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator color={Colors.goldLight} style={{ marginTop: 48 }} />
      ) : (
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.soldeCard}>
          <Text style={styles.soldeLabel}>Solde disponible</Text>
          <Text style={styles.soldeValue}>{fmt(balance)} FCFA</Text>
          {!!wallet?.pendingXof && (
            <View style={styles.soldePayout}>
              <Text style={styles.soldePayoutText}>
                {fmt(wallet.pendingXof)} FCFA déjà immobilisés par {wallet.pendingPayoutCount} demande
                {wallet.pendingPayoutCount > 1 ? 's' : ''} en cours
              </Text>
            </View>
          )}
        </View>

        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>MONTANT À RETIRER</Text>
          <View style={styles.amountInputWrapper}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={(v) => setAmount(groupDigits(v))}
              placeholder="0"
              placeholderTextColor="rgba(169,208,182,0.3)"
              keyboardType="numeric"
              maxLength={9}
            />
            <Text style={styles.amountUnit}>FCFA</Text>
          </View>
          {numAmount > 0 && numAmount < minimum && (
            <Text style={styles.amountError}>Minimum {fmt(minimum)} FCFA</Text>
          )}
          {numAmount > balance && <Text style={styles.amountError}>Solde insuffisant</Text>}
          {numAmount >= minimum && numAmount <= balance && numAmount <= fee && (
            <Text style={styles.amountError}>
              Le montant doit dépasser les frais de {fmt(fee)} FCFA
            </Text>
          )}

          {(presets.length > 0 || balance >= minimum) && (
            <View style={styles.presets}>
              {presets.map((p) => {
                const label = groupDigits(String(p));
                return (
                  <TouchableOpacity
                    key={p}
                    style={[styles.preset, numAmount === p && styles.presetActive]}
                    onPress={() => setAmount(label)}
                  >
                    <Text style={[styles.presetText, numAmount === p && styles.presetTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {balance >= minimum && (
                <TouchableOpacity
                  style={[styles.preset, numAmount === balance && styles.presetActive]}
                  onPress={() => setAmount(groupDigits(String(balance)))}
                >
                  <Text style={[styles.presetText, numAmount === balance && styles.presetTextActive]}>
                    Tout
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.methodSection}>
          <Text style={styles.sectionLabel}>MOYEN DE VERSEMENT</Text>
          <View style={styles.methodList}>
            {availableMethods.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.methodItem, method === m && styles.methodItemSelected]}
                onPress={() => setMethod(m)}
              >
                <Text style={styles.methodIcon}>{METHOD_ICONS[m]}</Text>
                <View style={styles.methodText}>
                  <Text style={styles.methodLabel}>{PAYOUT_METHOD_LABELS[m]}</Text>
                  <Text style={styles.methodSub}>
                    {wallet!.fees[m] > 0 ? `Frais ${fmt(wallet!.fees[m])} FCFA` : 'Sans frais'}
                  </Text>
                </View>
                <View style={[styles.radio, method === m && styles.radioSelected]}>
                  {method === m && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Sans destination, aucun virement n'est possible : le champ est obligatoire. */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>{DESTINATION_HINTS[method].label}</Text>
          <TextInput
            style={styles.destinationInput}
            value={destination}
            onChangeText={setDestination}
            placeholder={DESTINATION_HINTS[method].placeholder}
            placeholderTextColor="rgba(169,208,182,0.3)"
            keyboardType={method === 'BANK_TRANSFER' ? 'default' : 'phone-pad'}
            autoCapitalize="characters"
            maxLength={34}
          />
          {destination.length > 0 && !destinationOk && (
            <Text style={styles.amountError}>Destination incomplète</Text>
          )}
        </View>

        {amountOk && destinationOk && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>RÉSUMÉ DE LA DEMANDE</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Montant demandé</Text>
              <Text style={styles.summaryRowValue}>{fmt(numAmount)} FCFA</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Frais de traitement</Text>
              <Text style={styles.summaryRowValue}>{fee === 0 ? 'Gratuit' : `${fmt(fee)} FCFA`}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabelBold}>Vous recevrez</Text>
              <Text style={styles.summaryRowValueBold}>{fmt(net)} FCFA</Text>
            </View>
          </View>
        )}

        {pendingPayouts.length > 0 && (
          <View style={styles.pendingSection}>
            <Text style={styles.sectionLabel}>DEMANDES EN ATTENTE</Text>
            {pendingPayouts.map((p) => (
              <View key={p.id} style={styles.pendingItem}>
                <View style={styles.pendingInfo}>
                  <Text style={styles.pendingAmount}>{fmt(p.amountXof)} FCFA</Text>
                  <Text style={styles.pendingMeta}>
                    {PAYOUT_METHOD_LABELS[p.method]} · {p.destination}
                  </Text>
                  <Text style={styles.pendingMeta}>
                    {PAYOUT_STATUS_LABELS[p.status]} · demandé le {fmtDate(p.createdAt)}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => askCancel(p)}
                  disabled={cancellingId !== null}
                  activeOpacity={0.85}
                >
                  {cancellingId === p.id ? (
                    <ActivityIndicator color={Colors.errorLight} size="small" />
                  ) : (
                    <Text style={styles.cancelBtnText}>Annuler</Text>
                  )}
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      )}

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.ctaBtn, !valid && styles.ctaBtnDisabled]}
          onPress={submit}
          disabled={!valid}
          activeOpacity={valid ? 0.85 : 1}
        >
          <View style={styles.ctaBtnShadow} />
          {submitting ? (
            <ActivityIndicator color="rgb(67,44,0)" />
          ) : (
            <Text style={[styles.ctaBtnText, !valid && { opacity: 0.4 }]}>
              Envoyer la demande
            </Text>
          )}
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Le montant est immobilisé dès l'envoi, puis versé après vérification par l'équipe Malaw.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.nearBlack },
  successScreen: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    paddingHorizontal: 32,
  },
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    gap: 20,
  },
  soldeCard: {
    borderRadius: Radii.xl,
    backgroundColor: Colors.darkGreen,
    padding: 20,
    gap: 4,
    alignItems: 'center',
  },
  soldeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  soldeValue: {
    fontSize: 34,
    fontWeight: '900',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  soldePayout: {
    marginTop: 8,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 9999,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  soldePayoutText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  amountSection: { gap: 12 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  amountInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.2)',
    paddingHorizontal: 20,
    height: 80,
    gap: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 36,
    fontWeight: '900',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  amountUnit: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  destinationInput: {
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.2)',
    paddingHorizontal: 20,
    height: 60,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  amountError: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  presets: {
    flexDirection: 'row',
    gap: 10,
    flexWrap: 'wrap',
  },
  preset: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.25)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: Colors.darkCard,
  },
  presetActive: {
    borderColor: Colors.goldLight,
    backgroundColor: 'rgba(244,189,97,0.12)',
  },
  presetText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  presetTextActive: {
    color: Colors.goldLight,
    fontWeight: '800',
  },
  methodSection: { gap: 10 },
  methodList: { gap: 8 },
  methodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    padding: 14,
  },
  methodItemSelected: {
    borderColor: Colors.goldLight,
    backgroundColor: 'rgba(244,189,97,0.06)',
  },
  methodIcon: { fontSize: 24 },
  methodText: { flex: 1, gap: 2 },
  methodLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  methodSub: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  radioSelected: { borderColor: Colors.goldLight },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.goldLight,
  },
  summaryCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    padding: 16,
    gap: 10,
  },
  summaryTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  summaryRowValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  summaryDivider: { height: 1, backgroundColor: 'rgba(65,72,67,0.4)' },
  summaryRowLabelBold: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  summaryRowValueBold: {
    fontSize: 20,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  pendingSection: { gap: 10 },
  pendingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    borderWidth: 1,
    borderColor: 'rgba(244,189,97,0.2)',
    padding: 14,
  },
  pendingInfo: { flex: 1, gap: 2 },
  pendingAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  pendingMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
  },
  cancelBtn: {
    borderRadius: 9999,
    borderWidth: 1,
    borderColor: Colors.errorLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    minWidth: 82,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  bottomArea: {
    paddingHorizontal: 24,
    paddingBottom: 28,
    paddingTop: 12,
    gap: 10,
  },
  ctaBtn: {
    height: 64,
    borderRadius: Radii.md,
    backgroundColor: Colors.goldLight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    overflow: 'hidden',
  },
  ctaBtnDisabled: { backgroundColor: 'rgba(244,189,97,0.25)' },
  ctaBtnShadow: {
    position: 'absolute',
    inset: 0,
    backgroundColor: Colors.white,
    opacity: 0.08,
  },
  ctaBtnText: {
    fontSize: 17,
    fontWeight: '800',
    color: 'rgb(67,44,0)',
    fontFamily: 'Manrope_500Medium',
  },
  disclaimer: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    opacity: 0.6,
  },
  successCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.successDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  successDesc: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 24,
  },
  refCard: {
    borderRadius: Radii.md,
    backgroundColor: Colors.cardDark,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    width: '100%',
  },
  refLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
  },
  refValue: {
    fontSize: 15,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  refStatus: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  refNet: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  returnBtn: {
    width: '100%',
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  returnBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
});

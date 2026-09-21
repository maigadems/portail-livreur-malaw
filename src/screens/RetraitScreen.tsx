import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  TextInput, ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';
import { getEarnings } from '../api/couriers';
import { availableBalance, addWithdrawal } from '../api/withdrawals';

const METHODS = [
  { id: 'wave', icon: '📱', label: 'Wave', sub: 'Retrait sur votre compte Wave', frais: '0 FCFA', delay: 'Instantané' },
  { id: 'orange', icon: '🟠', label: 'Orange Money', sub: 'Retrait sur Orange Money', frais: '200 FCFA', delay: '< 5 min' },
];

export default function RetraitScreen() {
  const navigation = useNavigation<any>();
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('wave');
  const [confirmed, setConfirmed] = useState(false);
  const [solde, setSolde] = useState(0);

  useFocusEffect(useCallback(() => {
    let active = true;
    getEarnings()
      .then((e) => availableBalance(e?.allTime.totalXof ?? 0))
      .then((bal) => { if (active) setSolde(bal); })
      .catch(() => {});
    return () => { active = false; };
  }, []));

  const numAmount = parseInt(amount.replace(/\s/g, '')) || 0;
  const frais = selectedMethod === 'wave' ? 0 : 200;
  const net = numAmount - frais;
  const valid = numAmount >= 1000 && numAmount <= solde && amount !== '';

  const formatAmount = (val: string) => {
    const digits = val.replace(/\D/g, '');
    return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  // Presets adaptés au solde réel (+ "Tout").
  const PRESETS = [5000, 10000, 20000].filter((p) => p <= solde);

  const confirmWithdrawal = async () => {
    if (!valid) return;
    // TEMPORAIRE : pas d'API de paiement — le retrait est enregistré
    // localement et soustrait du solde (voir api/withdrawals).
    await addWithdrawal({ amount: numAmount, method: selectedMethod }).catch(() => {});
    setConfirmed(true);
  };

  if (confirmed) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', gap: 24, paddingHorizontal: 32 }]}>
        <View style={styles.successCircle}>
          <Text style={{ fontSize: 48 }}>✓</Text>
        </View>
        <Text style={styles.successTitle}>Retrait en cours</Text>
        <Text style={styles.successDesc}>
          {numAmount.toLocaleString('fr-FR')} FCFA seront crédités sur votre {selectedMethod === 'orange' ? 'Orange Money' : 'Wave'} dans quelques instants.
        </Text>
        <View style={styles.refCard}>
          <Text style={styles.refLabel}>Référence</Text>
          <Text style={styles.refValue}>RET-{Date.now().toString().slice(-6)}</Text>
        </View>
        <TouchableOpacity
          style={styles.returnBtn}
          onPress={() => navigation.navigate('Wallet')}
        >
          <Text style={styles.returnBtnText}>Retour au Wallet</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Demande de retrait</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Balance available */}
        <View style={styles.soldeCard}>
          <Text style={styles.soldeLabel}>Solde disponible</Text>
          <Text style={styles.soldeValue}>{solde.toLocaleString('fr-FR')} FCFA</Text>
        </View>

        {/* Amount input */}
        <View style={styles.amountSection}>
          <Text style={styles.sectionLabel}>MONTANT À RETIRER</Text>
          <View style={styles.amountInputWrapper}>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={v => setAmount(formatAmount(v))}
              placeholder="0"
              placeholderTextColor="rgba(169,208,182,0.3)"
              keyboardType="numeric"
              maxLength={9}
            />
            <Text style={styles.amountUnit}>FCFA</Text>
          </View>
          {numAmount > 0 && numAmount < 1000 && (
            <Text style={styles.amountError}>Minimum 1 000 FCFA</Text>
          )}
          {numAmount > solde && (
            <Text style={styles.amountError}>Solde insuffisant</Text>
          )}

          {/* Presets adaptés au solde réel */}
          <View style={styles.presets}>
            {PRESETS.map(p => {
              const label = formatAmount(String(p));
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, amount === label && styles.presetActive]}
                  onPress={() => setAmount(label)}
                >
                  <Text style={[styles.presetText, amount === label && styles.presetTextActive]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
            {solde >= 1000 ? (
              <TouchableOpacity
                style={[styles.preset, numAmount === solde && styles.presetActive]}
                onPress={() => setAmount(formatAmount(String(solde)))}
              >
                <Text style={[styles.presetText, numAmount === solde && styles.presetTextActive]}>Tout</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Method */}
        <View style={styles.methodSection}>
          <Text style={styles.sectionLabel}>MÉTHODE DE RETRAIT</Text>
          <View style={styles.methodList}>
            {METHODS.map(m => (
              <TouchableOpacity
                key={m.id}
                style={[styles.methodItem, selectedMethod === m.id && styles.methodItemSelected]}
                onPress={() => setSelectedMethod(m.id)}
              >
                <Text style={styles.methodIcon}>{m.icon}</Text>
                <View style={styles.methodText}>
                  <Text style={styles.methodLabel}>{m.label}</Text>
                  <Text style={styles.methodSub}>{m.sub}</Text>
                </View>
                <View style={styles.methodRight}>
                  <Text style={styles.methodFrais}>{m.frais}</Text>
                  <Text style={styles.methodDelay}>{m.delay}</Text>
                </View>
                <View style={[styles.radio, selectedMethod === m.id && styles.radioSelected]}>
                  {selectedMethod === m.id && <View style={styles.radioDot} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        {valid && (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>RÉSUMÉ DU RETRAIT</Text>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Montant demandé</Text>
              <Text style={styles.summaryRowValue}>{numAmount.toLocaleString('fr-FR')} FCFA</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabel}>Frais de traitement</Text>
              <Text style={styles.summaryRowValue}>{frais === 0 ? 'Gratuit' : `${frais} FCFA`}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryRow}>
              <Text style={styles.summaryRowLabelBold}>Vous recevrez</Text>
              <Text style={styles.summaryRowValueBold}>{net.toLocaleString('fr-FR')} FCFA</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomArea}>
        <TouchableOpacity
          style={[styles.ctaBtn, !valid && styles.ctaBtnDisabled]}
          onPress={confirmWithdrawal}
          activeOpacity={valid ? 0.85 : 1}
        >
          <View style={styles.ctaBtnShadow} />
          <Text style={[styles.ctaBtnText, !valid && { opacity: 0.4 }]}>
            Confirmer le retrait
          </Text>
          {valid && <Text style={{ color: 'rgb(67,44,0)', fontSize: 16 }}>→</Text>}
        </TouchableOpacity>
        <Text style={styles.disclaimer}>
          Les retraits sont traités immédiatement via Wave. Délai max 5 min.
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
  methodRight: { alignItems: 'flex-end', gap: 2 },
  methodFrais: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
  },
  methodDelay: {
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
  // Success state styles
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
    fontSize: 20,
    fontWeight: '800',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
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

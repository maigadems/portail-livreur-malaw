import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

const PROBLEMES = [
  { icon: '🚫', label: 'Restaurant fermé', desc: 'Le restaurant est fermé à l\'arrivée', urgent: true },
  { icon: '⏳', label: 'Commande non prête', desc: 'Attente de plus de 15 min', urgent: false },
  { icon: '📦', label: 'Commande incorrecte', desc: 'Articles manquants ou erronés', urgent: true },
  { icon: '💰', label: 'Désaccord sur le prix', desc: 'Le restaurant demande un paiement supplémentaire', urgent: true },
  { icon: '☎️', label: 'Restaurant injoignable', desc: 'Aucune réponse du restaurant', urgent: false },
];

export default function ProblemePickupScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<number | null>(null);
  const [waitedConfirm, setWaitedConfirm] = useState(false);

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
        {/* Context */}
        <View style={styles.contextCard}>
          <View style={styles.contextIcon}>
            <Text style={{ fontSize: 24 }}>🍽️</Text>
          </View>
          <View style={styles.contextText}>
            <Text style={styles.contextName}>Maquis Teranga · Médina</Text>
            <Text style={styles.contextId}>Commande #MAL-2847</Text>
          </View>
        </View>

        <Text style={styles.selectTitle}>Quel est le problème ?</Text>

        <View style={styles.problemsList}>
          {PROBLEMES.map((p, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.problemItem, selected === i && styles.problemItemSelected]}
              onPress={() => setSelected(i)}
              activeOpacity={0.75}
            >
              <View style={styles.problemLeft}>
                <View style={[styles.problemIconBg, p.urgent && styles.problemIconBgUrgent]}>
                  <Text style={styles.problemIconText}>{p.icon}</Text>
                </View>
                <View style={styles.problemTextBlock}>
                  <View style={styles.problemLabelRow}>
                    <Text style={styles.problemLabel}>{p.label}</Text>
                    {p.urgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>URGENT</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.problemDesc}>{p.desc}</Text>
                </View>
              </View>
              <View style={[styles.radio, selected === i && styles.radioSelected]}>
                {selected === i && <View style={styles.radioDot} />}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Waited confirmation */}
        {selected !== null && (
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

        {/* Support tip */}
        <View style={styles.supportTip}>
          <Text style={styles.supportTipIcon}>💡</Text>
          <Text style={styles.supportTipText}>
            Notre équipe prend une décision sous 2 minutes. Votre score ne sera pas affecté.
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
          style={[styles.reportBtn, (!selected || !waitedConfirm) && styles.reportBtnDisabled]}
          onPress={() => {
            if (selected !== null && waitedConfirm) navigation.navigate('DashboardEnLigne');
          }}
          activeOpacity={selected !== null && waitedConfirm ? 0.85 : 1}
        >
          <View style={styles.reportBtnShadow} />
          <Text style={[styles.reportBtnText, (!selected || !waitedConfirm) && { opacity: 0.4 }]}>
            Signaler et annuler la course
          </Text>
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
  contextText: { gap: 3 },
  contextName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
  contextId: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.goldLight,
    fontFamily: 'Manrope_500Medium',
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
  problemIconBgUrgent: {
    backgroundColor: 'rgba(192,57,43,0.15)',
  },
  problemIconText: { fontSize: 22 },
  problemTextBlock: { flex: 1, gap: 3 },
  problemLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  problemLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
  },
  urgentBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(192,57,43,0.2)',
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  urgentBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 0.5,
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

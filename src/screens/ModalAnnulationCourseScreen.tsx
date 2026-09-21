import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Radii } from '../constants/theme';

const RAISONS = [
  { label: 'Client introuvable après attente', penalite: false },
  { label: 'Restaurant fermé ou commande annulée', penalite: false },
  { label: 'Problème de véhicule', penalite: false },
  { label: 'Urgence personnelle', penalite: false },
  { label: 'Course trop loin (changé d\'avis)', penalite: true },
  { label: 'Autre raison', penalite: true },
];

export default function ModalAnnulationCourseScreen() {
  const navigation = useNavigation<any>();
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const hasPenalite = selected !== null && RAISONS[selected].penalite;

  if (confirmed) {
    return (
      <SafeAreaView style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.confirmedIcon}>
            <Text style={{ fontSize: 40 }}>✕</Text>
          </View>
          <Text style={styles.confirmedTitle}>Course annulée</Text>
          <Text style={styles.confirmedDesc}>
            {hasPenalite
              ? 'Cette annulation a été enregistrée et peut affecter votre score de fiabilité.'
              : 'Course annulée sans pénalité. Merci de votre signalement.'}
          </Text>
          <TouchableOpacity
            style={styles.returnBtn}
            onPress={() => navigation.replace('DashboardEnLigne')}
          >
            <Text style={styles.returnBtnText}>Retour au tableau de bord</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.overlay}>
      <TouchableOpacity style={styles.dismissArea} onPress={() => navigation.goBack()} activeOpacity={1} />
      <View style={styles.sheet}>
        <View style={styles.handle} />

        <Text style={styles.title}>Annuler cette course ?</Text>

        {/* Score impact warning */}
        <View style={styles.scoreWarning}>
          <Text style={styles.scoreIcon}>📊</Text>
          <View style={styles.scoreText}>
            <Text style={styles.scoreTitle}>Impact sur votre score</Text>
            <Text style={styles.scoreDesc}>
              Certaines raisons d'annulation n'affectent pas votre score de fiabilité.
            </Text>
          </View>
        </View>

        <Text style={styles.raisonsTitle}>POURQUOI ANNULEZ-VOUS ?</Text>

        <View style={styles.raisonsList}>
          {RAISONS.map((r, i) => (
            <TouchableOpacity
              key={i}
              style={[styles.raisonItem, selected === i && styles.raisonItemSelected]}
              onPress={() => setSelected(i)}
              activeOpacity={0.8}
            >
              <View style={styles.raisonLeft}>
                <View style={[styles.radio, selected === i && styles.radioSelected]}>
                  {selected === i && <View style={styles.radioDot} />}
                </View>
                <Text style={[styles.raisonLabel, selected === i && styles.raisonLabelSelected]}>
                  {r.label}
                </Text>
              </View>
              {r.penalite ? (
                <View style={styles.penaliteBadge}>
                  <Text style={styles.penaliteBadgeText}>⚠️ Score</Text>
                </View>
              ) : (
                <View style={styles.okBadge}>
                  <Text style={styles.okBadgeText}>✓ OK</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Penalite alert */}
        {hasPenalite && (
          <View style={styles.penaliteAlert}>
            <Text style={styles.penaliteAlertText}>
              ⚠️ Cette raison affectera votre score de fiabilité (-2 points)
            </Text>
          </View>
        )}

        <View style={styles.buttons}>
          <TouchableOpacity
            style={[styles.cancelCourseBtn, selected === null && styles.cancelCourseBtnDisabled]}
            onPress={() => selected !== null && setConfirmed(true)}
            activeOpacity={selected !== null ? 0.85 : 1}
          >
            <Text style={[styles.cancelCourseBtnText, selected === null && { opacity: 0.4 }]}>
              Confirmer l'annulation
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.keepBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.keepBtnText}>Garder la course</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  dismissArea: { flex: 1 },
  sheet: {
    backgroundColor: Colors.cardDark,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 36,
    paddingTop: 16,
    gap: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(65,72,67,0.4)',
  },
  handle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(169,208,182,0.2)',
    alignSelf: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  scoreWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(169,208,182,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.15)',
    padding: 12,
  },
  scoreIcon: { fontSize: 18 },
  scoreText: { flex: 1, gap: 2 },
  scoreTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  scoreDesc: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
    opacity: 0.75,
    lineHeight: 18,
  },
  raisonsTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    letterSpacing: 1,
  },
  raisonsList: { gap: 6 },
  raisonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: Radii.sm,
    backgroundColor: Colors.darkCard,
    borderWidth: 1,
    borderColor: 'rgba(65,72,67,0.4)',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  raisonItemSelected: {
    borderColor: Colors.goldLight,
    backgroundColor: 'rgba(244,189,97,0.06)',
  },
  raisonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  radio: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: 'rgba(169,208,182,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.goldLight },
  radioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.goldLight,
  },
  raisonLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    flex: 1,
  },
  raisonLabelSelected: {
    color: Colors.greenLight,
  },
  penaliteBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(192,57,43,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  penaliteBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  okBadge: {
    borderRadius: 9999,
    backgroundColor: 'rgba(34,197,94,0.1)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  okBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.successDark,
    fontFamily: 'Manrope_500Medium',
  },
  penaliteAlert: {
    borderRadius: Radii.sm,
    backgroundColor: 'rgba(192,57,43,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(192,57,43,0.2)',
    padding: 10,
  },
  penaliteAlertText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  buttons: { gap: 8 },
  cancelCourseBtn: {
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.errorBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelCourseBtnDisabled: { backgroundColor: 'rgba(147,0,10,0.3)' },
  cancelCourseBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.errorLight,
    fontFamily: 'Manrope_500Medium',
  },
  keepBtn: {
    height: 52,
    borderRadius: Radii.md,
    backgroundColor: 'rgba(169,208,182,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(169,208,182,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keepBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.greenMid,
    fontFamily: 'Manrope_500Medium',
  },
  // Confirmed state
  confirmedIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(192,57,43,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginTop: 16,
  },
  confirmedTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.greenLight,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
  },
  confirmedDesc: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.muted,
    fontFamily: 'Manrope_500Medium',
    textAlign: 'center',
    lineHeight: 22,
  },
  returnBtn: {
    height: 56,
    borderRadius: Radii.md,
    backgroundColor: Colors.darkGreen,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  returnBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.cream,
    fontFamily: 'Manrope_500Medium',
  },
});
